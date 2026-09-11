import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";

/** Fixed-window rate limit stored in Postgres (serverless instances share nothing else). Fails open on transport errors. */
export async function allow(key: string, max: number, windowSeconds: number): Promise<boolean> {
  const { data, error } = await createAdminClient().rpc("rate_limit_hit", { p_key: key, p_max: max, p_window_seconds: windowSeconds });
  if (error) {
    console.error("[rate-limit]", error.message);
    return true;
  }
  return data === true;
}
