import "server-only";
import { createClient } from "@supabase/supabase-js";

/**
 * Service-role client — BYPASSES RLS. Only for: creating auth users, the
 * anonymous QR claim, password resets, logo uploads, and admin actions AFTER a
 * server-side admin check. `server-only` makes importing it from the browser a
 * build error.
 */
export function createAdminClient() {
  return createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.SUPABASE_SERVICE_ROLE_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
}
