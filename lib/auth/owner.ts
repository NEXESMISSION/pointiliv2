import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";

/**
 * Who the signed-in OWNER is (Supabase Auth), and which shop they own. Ported
 * from v1 lib/auth/owner.ts verbatim except ownerCafe → ownerShop.
 *
 * THE TRAP: authUser() verifies the token's SIGNATURE locally (getClaims), so
 * the till does not pay a network round trip per screen — and revocation is
 * therefore up to an hour late. requireSuperAdmin() pays for a live getUser()
 * because the console can take a shop offline.
 */

export type OwnerSession = {
  id: string;
  email: string | null;
  role: "owner" | "super_admin";
};

/** True once Supabase env vars are present. */
export function supabaseConfigured(): boolean {
  return Boolean(
    process.env.NEXT_PUBLIC_SUPABASE_URL &&
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY,
  );
}

/**
 * The verified Supabase user — the single network-free hop, once per request.
 *
 * getClaims() verifies the token's signature locally with WebCrypto against the
 * project's JWKS, fetching the key set once and caching it. A tampered or
 * unsigned cookie fails verification. If the project ever moves to a symmetric
 * secret, this call falls back to asking the server, so it stays correct.
 *
 * What it costs: revocation stops being instant — a session signed out
 * elsewhere keeps working until its access token expires (<= 1 h). For a till
 * that is the right trade; the console pays for a live check below.
 */
const authUser = cache(async function authUser() {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const { data, error } = await supabase.auth.getClaims();
  const claims = data?.claims;
  if (error || !claims?.sub) return null;
  return { id: String(claims.sub), email: (claims.email as string | undefined) ?? null };
});

/** The same question, asked of the auth SERVER — the console gate only. */
const liveUser = cache(async function liveUser() {
  if (!supabaseConfigured()) return null;
  const supabase = await createClient();
  const {
    data: { user },
  } = await supabase.auth.getUser();
  return user ?? null;
});

/*
  A NOTE ON MEASURING THIS. A 307 to /owner/login is faster to serve than the
  till. If this ever answers null by mistake, every owner page redirects and
  the timings IMPROVE while the product is broken. Measure the RENDERED page —
  assert something only the real till has — never time-to-first-byte alone.
*/

/**
 * The signed-in owner, or null. VERIFIED, never merely read. cache() dedupes
 * the profiles SELECT across the layout, the page and ownerHome() within one
 * request; a new request revalidates from scratch.
 */
export const currentOwner = cache(async function currentOwner(): Promise<OwnerSession | null> {
  const user = await authUser();
  if (!user) return null;

  const supabase = await createClient();
  const { data: profile } = await supabase
    .from("profiles")
    .select("role")
    .eq("id", user.id)
    .single();

  return {
    id: user.id,
    email: user.email ?? null,
    role: (profile?.role as OwnerSession["role"]) ?? "owner",
  };
});

/**
 * Is there an owner session cookie on this device? PRESENCE ONLY — this proves
 * nothing and must never gate access. It exists so a page can decide, without
 * a network hop, whether a visitor is probably a shop owner.
 *
 * Supabase names its cookies `sb-<project-ref>-auth-token`, optionally chunked
 * with `.0` / `.1`, so match the prefix — and exclude the PKCE `-code-verifier`
 * an abandoned signup leaves behind, and any EMPTY value (the deleted-then-
 * resurrected cookie, see proxy.ts).
 */
export async function hasOwnerCookie(): Promise<boolean> {
  const jar = await cookies();
  return jar.getAll().some(
    (c) =>
      c.name.startsWith("sb-") &&
      c.name.includes("auth-token") &&
      !c.name.endsWith("-code-verifier") &&
      c.value.length > 0,
  );
}

export async function requireOwner(): Promise<OwnerSession> {
  const owner = await currentOwner();
  if (!owner) throw new Error("UNAUTHORISED");
  return owner;
}

export type OwnerAccess = OwnerSession & { dev?: true };

/**
 * The shop the signed-in owner manages.
 *
 * Every owner screen and action resolves the shop through here, so a request
 * can only ever touch the caller's OWN shop — there is no shop id in any URL or
 * form to tamper with. Throws on a database error (see lib/data.ts); null means
 * "signed in, no shop yet" and nothing else.
 */
export const ownerShop = cache(async function ownerShop() {
  const { ownedShop, anyShop } = await import("@/lib/data");
  /* authUser(), not ownerAccess(): the shop is keyed on the user id alone, and
     waiting for the role query first put a whole round trip in front of it. */
  const user = await authUser();
  if (user) return ownedShop(user.id);
  if (!supabaseConfigured() && process.env.NODE_ENV !== "production") return anyShop();
  return null;
});

/**
 * DEV-ONLY BYPASS. Guarded by BOTH conditions: dead in any production build,
 * and dead the moment real auth is configured.
 */
export const ownerAccess = cache(async function ownerAccess(): Promise<OwnerAccess | null> {
  const owner = await currentOwner();
  if (owner) return owner;

  if (!supabaseConfigured() && process.env.NODE_ENV !== "production") {
    return { id: "dev-owner", email: "dev@local", role: "owner", dev: true };
  }
  return null;
});

/**
 * Where a signed-in account belongs the moment it arrives.
 *
 * A PLATFORM OPERATOR is not a shop: a super-admin with no shop of their own
 * goes to the console, not to "créez votre commerce".
 */
export async function ownerHome(): Promise<string> {
  const owner = await ownerAccess();
  if (!owner) return "/owner/login";
  if (await ownerShop()) return "/owner";
  return owner.role === "super_admin" ? "/admin" : "/owner/nouveau";
}

/**
 * The console gate. Being a signed-in super-admin IS the gate — profiles.role
 * is not writable by anyone (0002 revokes every table), so it cannot be
 * self-issued — and it pays for a LIVE check because this surface can take a
 * shop offline.
 */
export async function requireSuperAdmin(): Promise<OwnerSession> {
  const owner = await requireOwner();
  if (owner.role !== "super_admin") throw new Error("FORBIDDEN");
  const live = await liveUser();
  if (!live || live.id !== owner.id) throw new Error("UNAUTHORISED");
  return owner;
}
