import "server-only";
import { cookies, headers } from "next/headers";
import { DEFAULT_LANG, LANG_COOKIE, LIVE_LANGS, translator, type Lang } from "./dict";

export { LANG_COOKIE, dir, translator, type Lang, type T } from "./dict";

/**
 * Which language this person reads. A preference of the PERSON, not of the
 * shop and not of the URL: the QR on the counter means the same thing for
 * everybody who scans it.
 *
 *   1. the pointili_lang cookie, if that language is live
 *   2. FIRST VISIT: Accept-Language containing "ar" → Tunisian
 *   3. DEFAULT_LANG
 *
 * THE TRAP: rule 2 fires only when there is NO cookie. The customer arriving
 * from the camera app has no cookie, and the one screen that decides whether
 * they come back must not open in the wrong language — but once they have
 * pressed a toggle, the phone's locale must never overrule them again.
 */
export async function currentLang(): Promise<Lang> {
  const jar = await cookies();
  const saved = jar.get(LANG_COOKIE)?.value as Lang | undefined;
  if (saved && LIVE_LANGS.includes(saved)) return saved;

  const hinted = fromAcceptLanguage((await headers()).get("accept-language"));
  return hinted && LIVE_LANGS.includes(hinted) ? hinted : DEFAULT_LANG;
}

/**
 * "ar", "ar-TN", "ar-tn;q=0.9", "fr-FR,ar;q=0.8" → tn. Anything else → null,
 * so the caller falls through to DEFAULT_LANG rather than guessing French
 * from an English phone. Pure and exported so a test can table it.
 */
export function fromAcceptLanguage(header: string | null | undefined): Lang | null {
  if (!header) return null;
  const tags = header.split(",").map((s) => s.trim().split(";")[0].toLowerCase());
  return tags.some((t) => t === "ar" || t.startsWith("ar-")) ? "tn" : null;
}

/** The translator for this request, in one call. */
export async function t(): Promise<ReturnType<typeof translator>> {
  return translator(await currentLang());
}
