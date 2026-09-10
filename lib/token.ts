/**
 * WHAT A TOKEN LOOKS LIKE, and what a scanned string is allowed to mean.
 *
 * A QR is text a stranger controls. The in-page scanner on the "rescan" state
 * never follows what it reads: it parses for exactly one shape — /s/<token> —
 * and the caller builds the destination on THIS origin from the return value.
 * The worst a hostile QR can do is send somebody to a page of ours that says
 * "rescanne l'écran".
 *
 * THE TRAP: tokenFrom() ignores the host on purpose. Checking it buys nothing
 * (the destination is built here either way) and would break a shop whose QR
 * was minted against an older host.
 */

/** 12 chars from the lowercase base32 alphabet — 60 bits, the QR token. */
export const TOKEN_RE = /^[a-z2-7]{12}$/;

/** 6 decimal digits — the code de rattrapage a customer types later. */
export const CODE_RE = /^[0-9]{6}$/;

/** The alphabet the generator uses (v1 0032 mapping, lowercased). 32 symbols
 *  so `byte % 32` is unbiased. */
export const TOKEN_ALPHABET = "abcdefghijklmnopqrstuvwxyz234567";

/** Exactly /s/<token>, once, and nothing else on the path. */
const SCAN_PATH_RE = /^\/s\/([a-z2-7]{12})$/;

/**
 * The token inside a scanned string, or null.
 *
 * Accepts a full URL (takes its path and nothing else from it) or a bare path.
 * Lowercases first because iOS capitalises anything it types and proxy.ts
 * lowercases paths with a 308 — the token itself has no case.
 */
export function tokenFrom(text: string): string | null {
  const raw = String(text ?? "").trim();
  if (!raw) return null;

  let path = raw;
  try {
    /* A URL: its path only. Anything that is not a URL throws and falls through
       to the bare-path case. */
    path = new URL(raw).pathname;
  } catch {
    /* not a URL */
  }

  const m = SCAN_PATH_RE.exec(path.toLowerCase());
  return m ? m[1] : null;
}

/**
 * Slugs a shop may not take, because a real route lives there.
 *
 * Shared with create_shop() in the database — the SQL list is copied from
 * here by hand, so keep both in step. /s and /r are the two a QR can land on
 * and are the two that matter most.
 */
export const RESERVED_SLUGS: readonly string[] = [
  "s", "r", "moi", "app", "owner", "admin", "api", "auth",
  "login", "signup", "logout", "static", "_next",
  "favicon.ico", "icon.png", "apple-icon.png", "robots.txt", "sitemap.xml",
  "manifest.webmanifest", "sw.js", "hors-ligne.html",
];

/** Same shape the database CHECKs: 3–40 chars, no leading/trailing hyphen. */
export const SLUG_RE = /^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$/;

export function isReservedSlug(slug: string): boolean {
  return RESERVED_SLUGS.includes(slug);
}
