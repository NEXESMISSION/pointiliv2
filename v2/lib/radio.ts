import type { SupabaseClient } from "@supabase/supabase-js";

/**
 * One Realtime client for a page — a radio, not a session: it signs nobody in
 * and keeps nothing, so it can never be mistaken for the signed-in client in
 * lib/supabase. The live card, the wallet and the counter listen on it.
 *
 * Its library (62 kB over the wire) comes once the page is up, never in the
 * page's first load: the front door and the wallet share a route, and the
 * stranger arriving from an ad was downloading it for a wallet he does not
 * have (26 Oct 2026). Listening starts a moment later; nothing is missed —
 * the page also looks again whenever it comes back to the screen.
 */
let radio: Promise<SupabaseClient | null> | null = null;
export function tuneIn(): Promise<SupabaseClient | null> {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return Promise.resolve(null);
  radio ??= import("@supabase/supabase-js")
    .then(({ createClient }) => createClient(url, key, { auth: { persistSession: false, autoRefreshToken: false, detectSessionInUrl: false, storageKey: "pointili-radio" } }))
    .catch(() => {
      // no network for the library: the next page tries again
      radio = null;
      return null;
    });
  return radio;
}
