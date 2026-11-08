import "server-only";
import { createServerClient } from "@supabase/ssr";
import { createClient } from "@supabase/supabase-js";
import { cookies } from "next/headers";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL!;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!;

/** The database as the signed-in person: every function knows who is calling (auth.uid()). */
export async function db() {
  const jar = await cookies();
  return createServerClient(URL, ANON, {
    cookies: {
      getAll: () => jar.getAll(),
      setAll(list) {
        try {
          for (const { name, value, options } of list) jar.set(name, value, options);
        } catch {
          // a page cannot write cookies; proxy.ts keeps the session fresh
        }
      },
    },
  });
}

/** The service role: making accounts, and holding a code for a phone with no account yet. Server only. */
export function service() {
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false } });
}

/**
 * The owner's counter functions a staff phone may also run (supabase/packs-2026-11-09.sql, staff_act): the
 * code, the counter's heartbeat, a customer read, the tampon given, a gift or prize handed over, the wheel
 * spun, an order given, a tampon taken back. Nothing else.
 */
const STAFF_FNS = new Set(["new_code", "counter", "customer_at", "give_stamp", "give", "give_all", "held_back", "my_items", "draw_wins_at", "draw_give", "spin_at_counter", "store_give", "unstamp", "my_wheel", "restore_reset"]);

/**
 * A counter function answered «no shop»: the caller owns none — and may be a staff phone of a shop (Pro).
 * Asked again through staff_act, which runs the same function for the shop it works at; anyone who is not
 * staff anywhere gets the first answer back, unchanged. An owner never gets «no shop», so never comes here.
 */
export async function asStaff(sb: Awaited<ReturnType<typeof db>>, fn: string, args: Record<string, unknown> | undefined, first: unknown): Promise<unknown> {
  if (!STAFF_FNS.has(fn) || (first as { error?: string } | null)?.error !== "no_shop") return first;
  const { data, error } = await sb.rpc("staff_act", { p_fn: fn, p_args: args ?? {} });
  if (error || (data as { error?: string } | null)?.error === "not_staff") return first;
  return data;
}

/** One call, one answer: the function's JSON, or null when the network or the database said no. */
export async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const sb = await db();
  const { data, error } = await sb.rpc(fn, args);
  if (error) {
    console.error(`[${fn}]`, error.message);
    return null;
  }
  return (await asStaff(sb, fn, args, data)) as T;
}
