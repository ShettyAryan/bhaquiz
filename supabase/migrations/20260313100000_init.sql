-- Live conference quiz schema
-- Run this in the Supabase SQL editor, or via the Supabase CLI:
--   supabase db push

create table if not exists public.sessions (
  id uuid primary key default gen_random_uuid(),
  session_number int not null,
  title text not null,
  created_at timestamptz default now(),
  constraint sessions_number_unique unique (session_number),
  constraint sessions_number_range check (session_number >= 1 and session_number <= 10)
);

create table if not exists public.questions (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) not null,
  question_text text not null,
  options jsonb not null,
  correct_option text not null,
  is_open boolean default false,
  opened_at timestamptz,
  closed_at timestamptz,
  created_at timestamptz default now(),
  constraint questions_options_is_array check (jsonb_typeof(options) = 'array'),
  constraint questions_options_length check (
    jsonb_array_length(options) >= 2 and jsonb_array_length(options) <= 4
  )
);

create table if not exists public.answers (
  id uuid primary key default gen_random_uuid(),
  question_id uuid references public.questions(id) not null,
  participant_name text not null,
  phone text,
  device_token text not null,
  chosen_option text not null,
  is_correct boolean not null,
  submitted_at timestamptz default now(),
  unique (question_id, device_token),
  constraint answers_phone_format check (phone is null or phone ~ '^[6-9][0-9]{9}$')
);

create table if not exists public.winners (
  id uuid primary key default gen_random_uuid(),
  session_id uuid references public.sessions(id) not null,
  answer_id uuid references public.answers(id) not null,
  picked_at timestamptz default now()
);

-- Public-safe projections so Realtime never broadcasts correct_option or PII.
create table if not exists public.live_question_state (
  session_id uuid primary key references public.sessions(id) on delete cascade,
  question_id uuid references public.questions(id) on delete cascade,
  question_text text not null,
  options jsonb not null,
  is_open boolean not null default false,
  opened_at timestamptz,
  closed_at timestamptz,
  updated_at timestamptz default now()
);

create table if not exists public.answer_counts (
  question_id uuid primary key references public.questions(id) on delete cascade,
  total int not null default 0
);

-- Fast lookups for the write-heavy and live-count paths
create index if not exists answers_question_id_idx on public.answers (question_id);
create index if not exists answers_question_correct_idx
  on public.answers (question_id)
  where is_correct = true;
create index if not exists questions_session_open_idx
  on public.questions (session_id, is_open);
create index if not exists winners_session_id_idx on public.winners (session_id);

-- ---------------------------------------------------------------------------
-- Answer insert trigger: never trust client-provided correctness, and reject
-- answers after a question has closed. Runs as security definer so it can
-- read questions.correct_option even when the caller cannot.
-- ---------------------------------------------------------------------------
create or replace function public.enforce_answer_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
begin
  select is_open, correct_option
    into q
    from public.questions
   where id = new.question_id;

  if not found then
    raise exception 'Question not found';
  end if;

  if coalesce(q.is_open, false) = false then
    raise exception 'Question is closed';
  end if;

  new.participant_name := trim(new.participant_name);
  if new.participant_name = '' then
    raise exception 'Name is required';
  end if;

  new.phone := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  if length(new.phone) = 12 and left(new.phone, 2) = '91' then
    new.phone := right(new.phone, 10);
  end if;
  if length(new.phone) = 11 and left(new.phone, 1) = '0' then
    new.phone := right(new.phone, 10);
  end if;
  if new.phone = '' or new.phone !~ '^[6-9][0-9]{9}$' then
    raise exception 'A valid 10-digit mobile number is required';
  end if;

  new.is_correct := (new.chosen_option = q.correct_option);
  new.submitted_at := now();
  return new;
end;
$$;

drop trigger if exists answers_enforce_rules on public.answers;
create trigger answers_enforce_rules
  before insert on public.answers
  for each row
  execute function public.enforce_answer_rules();

create or replace function public.sync_live_question_state()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.live_question_state (
    session_id,
    question_id,
    question_text,
    options,
    is_open,
    opened_at,
    closed_at,
    updated_at
  )
  values (
    new.session_id,
    new.id,
    new.question_text,
    new.options,
    coalesce(new.is_open, false),
    new.opened_at,
    new.closed_at,
    now()
  )
  on conflict (session_id) do update
    set question_id = excluded.question_id,
        question_text = excluded.question_text,
        options = excluded.options,
        is_open = excluded.is_open,
        opened_at = excluded.opened_at,
        closed_at = excluded.closed_at,
        updated_at = now()
    where public.live_question_state.question_id = excluded.question_id
       or excluded.is_open = true;

  return new;
end;
$$;

drop trigger if exists questions_sync_live_state on public.questions;
create trigger questions_sync_live_state
  after insert or update on public.questions
  for each row
  execute function public.sync_live_question_state();

create or replace function public.bump_answer_count()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
begin
  insert into public.answer_counts (question_id, total)
  values (new.question_id, 1)
  on conflict (question_id) do update
    set total = public.answer_counts.total + 1;
  return new;
end;
$$;

drop trigger if exists answers_bump_count on public.answers;
create trigger answers_bump_count
  after insert on public.answers
  for each row
  execute function public.bump_answer_count();

-- ---------------------------------------------------------------------------
-- Row Level Security
-- ---------------------------------------------------------------------------
alter table public.sessions enable row level security;
alter table public.questions enable row level security;
alter table public.answers enable row level security;
alter table public.winners enable row level security;
alter table public.live_question_state enable row level security;
alter table public.answer_counts enable row level security;

drop policy if exists sessions_public_read on public.sessions;
create policy sessions_public_read
  on public.sessions
  for select
  to anon, authenticated
  using (true);

drop policy if exists live_question_state_public_read on public.live_question_state;
create policy live_question_state_public_read
  on public.live_question_state
  for select
  to anon, authenticated
  using (true);

drop policy if exists answer_counts_public_read on public.answer_counts;
create policy answer_counts_public_read
  on public.answer_counts
  for select
  to anon, authenticated
  using (true);

drop policy if exists answers_public_insert on public.answers;
create policy answers_public_insert
  on public.answers
  for insert
  to anon, authenticated
  with check (true);

drop policy if exists winners_public_select on public.winners;
create policy winners_public_select
  on public.winners
  for select
  to anon, authenticated
  using (true);

-- questions, answers, and winners writes stay service-role / admin-API only.
-- questions.correct_option is never granted to anon.
revoke all on public.sessions from anon, authenticated;
revoke all on public.questions from anon, authenticated;
revoke all on public.answers from anon, authenticated;
revoke all on public.winners from anon, authenticated;
revoke all on public.live_question_state from anon, authenticated;
revoke all on public.answer_counts from anon, authenticated;

grant select on public.sessions to anon, authenticated;
grant select on public.live_question_state to anon, authenticated;
grant select on public.answer_counts to anon, authenticated;
grant select on public.winners to anon, authenticated;
grant insert (
  question_id,
  participant_name,
  phone,
  device_token,
  chosen_option,
  is_correct
) on public.answers to anon, authenticated;

alter table public.live_question_state replica identity full;
alter table public.answer_counts replica identity full;
alter table public.winners replica identity full;

do $$
begin
  begin
    alter publication supabase_realtime add table public.live_question_state;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.answer_counts;
  exception when duplicate_object then null;
  end;
  begin
    alter publication supabase_realtime add table public.winners;
  exception when duplicate_object then null;
  end;
end;
$$;

-- Seed the 10 conference sessions. Safe to re-run.
insert into public.sessions (session_number, title)
values
  (1, 'Session 1'),
  (2, 'Session 2'),
  (3, 'Session 3'),
  (4, 'Session 4'),
  (5, 'Session 5'),
  (6, 'Session 6'),
  (7, 'Session 7'),
  (8, 'Session 8'),
  (9, 'Session 9'),
  (10, 'Session 10')
on conflict (session_number) do nothing;
