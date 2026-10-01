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
    db: { schema: "v2" },
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
  return createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY!, { auth: { persistSession: false, autoRefreshToken: false }, db: { schema: "v2" } });
}

/** One call, one answer: the function's JSON, or null when the network or the database said no. */
export async function call<T>(fn: string, args?: Record<string, unknown>): Promise<T | null> {
  const { data, error } = await (await db()).rpc(fn, args);
  if (error) {
    console.error(`[v2.${fn}]`, error.message);
    return null;
  }
  return data as T;
}
