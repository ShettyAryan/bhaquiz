-- Store the full mobile privately; public/admin UIs only show the last 4 digits.
alter table public.answers
  add column if not exists phone text;

alter table public.answers
  drop constraint if exists answers_phone_format;

alter table public.answers
  add constraint answers_phone_format
  check (phone is null or phone ~ '^[6-9][0-9]{9}$');

grant insert (
  question_id,
  participant_name,
  device_token,
  chosen_option,
  is_correct,
  phone
) on public.answers to anon, authenticated;

create or replace function public.enforce_answer_rules()
returns trigger
language plpgsql
security definer
set search_path = public
as $$
declare
  q record;
  digits text;
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

  digits := regexp_replace(coalesce(new.phone, ''), '\D', '', 'g');
  if length(digits) = 12 and left(digits, 2) = '91' then
    digits := right(digits, 10);
  end if;
  if length(digits) = 11 and left(digits, 1) = '0' then
    digits := right(digits, 10);
  end if;
  if digits = '' or digits !~ '^[6-9][0-9]{9}$' then
    raise exception 'A valid 10-digit mobile number is required';
  end if;
  new.phone := digits;

  new.is_correct := (new.chosen_option = q.correct_option);
  new.submitted_at := now();
  return new;
end;
$$;
