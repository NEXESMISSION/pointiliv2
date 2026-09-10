import "server-only";
import { createHmac, timingSafeEqual } from "node:crypto";

/**
 * The one signing story for the client cookie: HMAC-SHA256 over a base64url
 * body, compared in constant time. Ported from v1 lib/auth/crypto.ts with the
 * payload generalised from a phone number to {sub, v} — a device-born uuid and
 * the token_version that lets "Déconnecter partout" kill every older cookie.
 *
 * THE TRAP: the signed string carries a "v2c." domain separator. Without it a
 * token minted by any other HMAC user of the same secret shape would verify
 * here; with it, only a string this module signed for this purpose does.
 */

export type ClientPayload = {
  /** The client uuid — minted by proxy.ts, never by a POST. */
  sub: string;
  /** clients.token_version at signing time; every RPC compares it. */
  v: number;
  iat: number;
  exp: number;
};

/** Everything signed here is prefixed with this before the HMAC runs. */
const DOMAIN = "v2c.";

function b64url(input: Buffer | string) {
  return Buffer.from(input)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");
}

function unb64url(input: string) {
  return Buffer.from(input.replace(/-/g, "+").replace(/_/g, "/"), "base64");
}

function secret() {
  const s = process.env.CLIENT_SESSION_SECRET;
  /* 32, not 16: this cookie IS the customer's card. The spec says >= 32. */
  if (!s || s.length < 32) {
    throw new Error(
      "CLIENT_SESSION_SECRET is missing or shorter than 32 chars — set it in .env.local",
    );
  }
  return s;
}

function sign(body: string) {
  return b64url(createHmac("sha256", secret()).update(DOMAIN + body).digest());
}

/**
 * A signed, tamper-evident client token: `<base64url body>.<base64url mac>`.
 *
 * 400 days by default — Chrome's ceiling for a cookie, and the whole point of
 * a device identity is to outlive any session. proxy.ts re-signs it after 133
 * days so a regular never falls off the end.
 */
export function signSession(payload: { sub: string; v: number }, days = 400): string {
  const now = Math.floor(Date.now() / 1000);
  const full: ClientPayload = { sub: payload.sub, v: payload.v, iat: now, exp: now + days * 86400 };
  const body = b64url(JSON.stringify(full));
  return `${body}.${sign(body)}`;
}

/** The payload if the token is authentic and unexpired, else null. */
export function verifySession(token: string | undefined): ClientPayload | null {
  if (!token) return null;
  const [body, mac] = token.split(".");
  if (!body || !mac) return null;

  // constant-time compare — never leak signature validity via timing
  const expected = sign(body);
  const a = Buffer.from(mac);
  const b = Buffer.from(expected);
  if (a.length !== b.length || !timingSafeEqual(a, b)) return null;

  try {
    const payload = JSON.parse(unb64url(body).toString()) as Partial<ClientPayload>;
    if (typeof payload.sub !== "string" || typeof payload.v !== "number") return null;
    if (typeof payload.exp !== "number" || payload.exp < Math.floor(Date.now() / 1000)) return null;
    return payload as ClientPayload;
  } catch {
    return null;
  }
}

/** Seconds since the token was issued, or null if it cannot be read. Used by
 *  proxy.ts to decide whether to roll the cookie; it does NOT verify. */
export function sessionAge(token: string): number | null {
  try {
    const body = token.split(".")[0];
    const { iat } = JSON.parse(unb64url(body).toString()) as { iat?: number };
    return typeof iat === "number" ? Math.floor(Date.now() / 1000) - iat : null;
  } catch {
    return null;
  }
}
