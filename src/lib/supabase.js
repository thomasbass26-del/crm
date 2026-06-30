// Supabase client for Triskope CRM — LIVE project (ddsqyvcaissqavivyhlv).
//
// Uses Vite env vars so the anon key isn't hardcoded in source. Your existing
// live app already sets these in .env and in the Vercel dashboard:
//   VITE_SUPABASE_URL=https://ddsqyvcaissqavivyhlv.supabase.co
//   VITE_SUPABASE_ANON_KEY=<your anon public key>
//
// The anon key is public by design; RLS enforces all access. Never put the
// service_role key here.
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;

if (!SUPABASE_URL || !SUPABASE_ANON_KEY) {
  console.error("Missing VITE_SUPABASE_URL or VITE_SUPABASE_ANON_KEY — check .env");
}

export const supabase = createClient(SUPABASE_URL, SUPABASE_ANON_KEY, {
  auth: {
    persistSession: true,
    autoRefreshToken: true,
    detectSessionInUrl: true,
  },
});
