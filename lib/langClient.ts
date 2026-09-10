"use client";

import { DEFAULT_LANG, LANG_COOKIE, LIVE_LANGS, type Lang } from "./dict";

/**
 * The reader's language, from the browser — for the one component that cannot
 * be handed it: an error boundary is mounted by React after a render below it
 * has already failed, so there is no server parent left to pass a prop.
 *
 * THE TRAP (v1): this defaulted the OTHER way from the server, so a customer
 * with no cookie got a Tunisian app and a French error screen. The default is
 * the shared DEFAULT_LANG and nothing else; the Accept-Language rule cannot be
 * applied here (no headers in the browser), so a first-visit error screen
 * falls back to French, which is the accepted cost.
 */
export function langFromCookie(): Lang {
  /* Guarded for the server pass: a boundary still renders there, and
     `document` would throw and replace a handled error with an unhandled one. */
  if (typeof document === "undefined") return DEFAULT_LANG;
  const hit = document.cookie.split("; ").find((c) => c.startsWith(`${LANG_COOKIE}=`));
  const v = hit?.slice(LANG_COOKIE.length + 1) as Lang | undefined;
  return v && LIVE_LANGS.includes(v) ? v : DEFAULT_LANG;
}
