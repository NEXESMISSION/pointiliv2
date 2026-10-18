import { createClient, type SupabaseClient } from "@supabase/supabase-js";

/**
 * One Realtime client for a page — a radio, not a session: it signs nobody in
 * and keeps nothing, so it can never be mistaken for the signed-in client in
 * lib/supabase. The counter has had its own copy of this since it was built;
 * this is the shared one, for anything else that listens.
 */
let radio: SupabaseClient | null = null;
export function tuneIn(): SupabaseClient | null {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return null;
  radio ??= createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "pointili-radio" } });
  return radio;
}
