// The one Supabase client for the whole app (docs/PRD.MD §34).
//
// Browser-only on purpose: every page in this app is a client component, there
// are no server actions and no server-side data fetching, so the cookie
// plumbing of @supabase/ssr would buy nothing. supabase-js persists the session
// itself, and Row Level Security (supabase/schema.sql) — not any redirect — is
// what actually keeps the data private.

import { createClient } from "@supabase/supabase-js";

const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;

if (!url || !anonKey) {
  // Fail loudly at import time rather than as a confusing "Failed to fetch"
  // on every query. See .env.example for where these come from.
  throw new Error(
    "Missing NEXT_PUBLIC_SUPABASE_URL or NEXT_PUBLIC_SUPABASE_ANON_KEY — copy .env.example to .env.local and fill them in.",
  );
}

export const supabase = createClient(url, anonKey);
