import "server-only";
import type { ClientPayload } from "./crypto";

/**
 * The customer's identity: an httpOnly cookie carrying a signed {sub, v}.
 * No row exists until redeem_token consumes a live token, and the cookie is
 * pre-issued by proxy.ts on document GETs — see the spec's clientIdentity.
 *
 * STUB — owned by identity-api. CLIENT_COOKIE and clientCookieOptions() are
 * real because proxy.ts and the route handlers need them to agree on one
 * cookie; every other function throws until identity-api lands.
 *
 * THE TRAP: a deletion must set `expires: new Date(0)`, not only maxAge 0 —
 * Next drops falsy cookie fields on a redirect and resurrects the cookie.
 */

export const CLIENT_COOKIE = "pointili_client";

/** 400 days is Chrome's ceiling; longer is silently truncated. */
export const CLIENT_COOKIE_DAYS = 400;

/**
 * The one set of attributes the cookie is ever written with. proxy.ts (pre-issue
 * and roll) and /api/recovery/use (new identity) must both use this so a cookie
 * written by one is the cookie the other expects to find.
 */
export function clientCookieOptions() {
  return {
    httpOnly: true,
    sameSite: "lax" as const,
    secure: process.env.NODE_ENV === "production",
    path: "/",
    maxAge: CLIENT_COOKIE_DAYS * 86400,
  };
}

/**
 * The verified client on this request, or null.
 *
 * CONTRACT: reads `x-pointili-client` (set by proxy.ts from the pre-issued or
 * existing cookie) first, then falls back to verifying the cookie itself, so
 * a Server Component on /s, /[slug], /moi and /r sees the identity the proxy
 * just minted even though no cookie has reached the browser yet. Never creates
 * a row. Returns {sub, v}.
 */
export async function currentClient(): Promise<Pick<ClientPayload, "sub" | "v"> | null> {
  throw new Error("identity-api: not implemented");
}

/**
 * CONTRACT: signSession({sub, v}) from lib/auth/crypto — kept here so callers
 * never import the crypto module directly and the payload shape has one owner.
 */
export function signClient(_sub: string, _v: number): string {
  throw new Error("identity-api: not implemented");
}

/** CONTRACT: verifySession(token) — the payload or null. Pure, no I/O. */
export function verifyClient(_token: string | undefined): ClientPayload | null {
  throw new Error("identity-api: not implemented");
}
