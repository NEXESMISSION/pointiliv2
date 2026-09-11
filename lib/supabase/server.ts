import "server-only";
import { createServerClient } from "@supabase/ssr";
import { cookies, headers } from "next/headers";
import { clientIp } from "@/lib/url";

/**
 * Cookie-bound Supabase client acting AS the signed-in user. Every RPC it calls
 * identifies the caller with auth.uid() from the verified JWT, so nothing the
 * browser sends can change who the database thinks it is talking to.
 */
export async function createClient() {
  const cookieStore = await cookies();
  const ip = clientIp(await headers());

  return createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    // Auth rate limits key on the end user's IP, not the server's.
    global: { headers: ip ? { "Sb-Forwarded-For": ip } : {} },
    cookies: {
      getAll() {
        return cookieStore.getAll();
      },
      setAll(cookiesToSet) {
        try {
          for (const { name, value, options } of cookiesToSet) cookieStore.set(name, value, options);
        } catch {
          // Server Components cannot write cookies; proxy.ts keeps sessions fresh.
        }
      },
    },
  });
}

/** True when the request carries a Supabase session cookie at all (no network). */
export async function hasSessionCookie() {
  const cookieStore = await cookies();
  return cookieStore.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token") && c.value);
}
