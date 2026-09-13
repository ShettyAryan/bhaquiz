# Bunts Quiz

Live conference quiz for a 10-session event. After each session, the projector shows one multiple-choice question and a QR code. Attendees answer on their phones. The organizer can watch submissions live and run a lucky draw among people who got it right.

No app install. No pre-registration. People type their name when they answer.

## Pages

- `/admin` — password-protected organizer console
- `/screen/[sessionId]` — projector display (question, QR, live count, winner reveal)
- `/join/[sessionId]` — mobile answer page
- `/` — session-code fallback if a phone cannot scan the QR

## Setup

### 1. Create a Supabase project

1. Create a project at [supabase.com](https://supabase.com).
2. Open **Project Settings → API** and copy:
   - Project URL
   - `anon` public key
   - `service_role` secret key (server only — never expose this in the browser)

### 2. Run the database migration

In the Supabase dashboard, open **SQL Editor**, paste the contents of:

`supabase/migrations/20260313100000_init.sql`

and run it.

That script creates the tables, indexes, Row Level Security policies, Realtime publication, and the 10 sessions.

If you use the [Supabase CLI](https://supabase.com/docs/guides/cli) instead:

```bash
supabase link --project-ref <your-project-ref>
supabase db push
```

### 3. Environment variables

```bash
cp .env.example .env.local
```

Fill in:

| Variable | Where it is used |
| --- | --- |
| `NEXT_PUBLIC_SUPABASE_URL` | Browser + server Supabase client |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Browser Realtime subscriptions only |
| `SUPABASE_SERVICE_ROLE_KEY` | Server-only admin/answer APIs |
| `ADMIN_PASSWORD` | Shared password for `/admin` |

### 4. Install and run locally

```bash
npm install
npm run dev
```

Open [http://localhost:3000](http://localhost:3000).

1. Go to `/admin` and sign in with `ADMIN_PASSWORD`.
2. If sessions are missing, click **Create 10 sessions**.
3. Add a question to a session, then **Open question**.
4. Open **Open projector screen** on the venue display.
5. Scan the QR (or enter the session code on the home page) and submit an answer.
6. **Close question**, then **Pick random winner**.

## How the lucky draw works

Winner selection is **not** done in the browser. `/api/admin/winners` loads the correct answers on the server, picks one with `crypto.randomInt`, writes a `winners` row, and returns the name. The admin UI then shuffles through the real correct-answer names before revealing that server-picked winner. Re-rolling inserts another `winners` row and keeps history.

## Security notes

- The correct option is computed and stored on the server. Participants never receive `correct_option`.
- Join/screen Realtime subscriptions use `live_question_state` and `answer_counts`, not the raw `questions` / `answers` tables.
- Admin login sets an httpOnly cookie derived from `ADMIN_PASSWORD`. There are no user accounts.
- The unique `(question_id, device_token)` constraint blocks a second answer from the same phone.

## Deploy to Vercel

1. Push this folder to GitHub (or deploy from the Vercel CLI).
2. Import the repo in Vercel. Framework preset: **Next.js**.
3. Add the same four environment variables in the Vercel project settings.
4. Deploy.

After deploy, update any printed/join URLs — the projector QR is generated from the current site origin, so it automatically uses your Vercel domain.

If the SQL migration has not been run on that Supabase project yet, do that before going live.

## Conference-day checklist

- [ ] Migration applied and 10 sessions visible in `/admin`
- [ ] Question written, options set, correct answer marked
- [ ] Projector opened to `/screen/[sessionId]` (fullscreen the browser)
- [ ] A phone can scan the QR and submit
- [ ] Close the question before picking a winner
- [ ] Export CSVs after the event if you need records

## Project layout

```
src/app/admin/          Organizer UI
src/app/join/           Participant UI
src/app/screen/         Projector UI
src/app/api/            Server routes (answers, draw, CSV, auth)
src/lib/supabase/       Browser anon client + service-role client
supabase/migrations/    Database schema
```
