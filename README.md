# DesignOps

Internal design portfolio and manpower visibility tool. It maps projects, timelines, team structure, squads, designers, project ownership, business stakeholders, and cross-squad designer assignments.

See [`/docs/PRD.MD`](docs/PRD.MD) for the current product requirements, [`/docs/DECISIONS.md`](docs/DECISIONS.md) for why the architecture looks the way it does, and [`/docs/CHANGELOG.md`](docs/CHANGELOG.md) for what has changed.

## Setup

The app needs a Supabase project. Once, per project:

1. **Create the schema.** In the Supabase SQL Editor, run [`supabase/schema.sql`](supabase/schema.sql), then [`supabase/seed.sql`](supabase/seed.sql) for the demo data.

2. **Close sign-up.** Authentication → Sign In / Providers → turn off "Allow new users to sign up", then invite users from Authentication → Users. This matters: Row Level Security grants full access to any authenticated user, so who is allowed to become authenticated is the access list.

3. **Allow the recovery redirect.** Authentication → URL Configuration → add every origin the app runs on to Redirect URLs (`http://localhost:3000/**`, plus staging and production). Password reset emails point back at `/reset-password` on whichever origin the request came from; an origin that isn't listed silently lands on the project's Site URL instead.

4. **Point the app at it.** Copy `.env.example` to `.env.local` and fill in the project URL and anon key from Project Settings → API Keys.

### Updating an existing project

Files in [`supabase/migrations/`](supabase/migrations) bring a database created from an older `schema.sql` up to date. Run any you haven't, in order, in the SQL Editor. They are already folded into `schema.sql`, so a fresh install needs only step 1.

Then:

```bash
npm install
npm run dev
```

## Architecture

```text
UI (client components)
→ repositories (synchronous)
→ dataStore (in-memory cache of every table)
↕ Supabase — PostgreSQL + Auth + Realtime
```

Data is shared: everyone signed in sees the same portfolio, and edits propagate without a reload. The repository layer is synchronous by design so that pages can read during render; `src/lib/store/dataStore.ts` explains what that costs and how it is paid for.
