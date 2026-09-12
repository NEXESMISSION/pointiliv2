/**
 * Pointili speaks two languages: French (default, no URL prefix) and Tunisian
 * Derja in Arabic script, right-to-left, under /tn. Public pages exist at both
 * addresses so each language can be indexed; the app screens follow the
 * language cookie.
 */
export const LOCALES = ["fr", "tn"] as const;
export type Locale = (typeof LOCALES)[number];

export const DEFAULT_LOCALE: Locale = "fr";
export const LOCALE_COOKIE = "pl_lang";
export const LOCALE_HEADER = "x-pl-lang";
export const LOCALE_MAX_AGE = 31_536_000;

/** URL prefix per language ("" for the default). */
export const PREFIX: Record<Locale, string> = { fr: "", tn: "/tn" };
export const HTML_LANG: Record<Locale, string> = { fr: "fr", tn: "ar-TN" };
export const DIR: Record<Locale, "ltr" | "rtl"> = { fr: "ltr", tn: "rtl" };
/** Latin digits in both languages — that is how Tunisians write numbers. */
export const INTL: Record<Locale, string> = { fr: "fr-TN", tn: "ar-TN-u-nu-latn" };
export const LOCALE_NAME: Record<Locale, string> = { fr: "Français", tn: "تونسي" };
export const LOCALE_SHORT: Record<Locale, string> = { fr: "FR", tn: "TN" };
/** The og:locale value for each language. */
export const OG_LOCALE: Record<Locale, string> = { fr: "fr_TN", tn: "ar_TN" };

export function isLocale(v: unknown): v is Locale {
  return typeof v === "string" && (LOCALES as readonly string[]).includes(v);
}

/** Pages that exist in both languages at their own address. */
export const MARKETING_PATHS = ["/", "/how-it-works", "/pricing"] as const;

export function isMarketingPath(path: string): boolean {
  return (MARKETING_PATHS as readonly string[]).includes(path);
}

/** "/pricing" → "/tn/pricing" for Tunisian, unchanged for French. */
export function localePath(path: string, locale: Locale): string {
  if (locale === DEFAULT_LOCALE || !isMarketingPath(path)) return path;
  return path === "/" ? PREFIX[locale] : `${PREFIX[locale]}${path}`;
}

/** Strips a language prefix: "/tn/pricing" → { locale: "tn", path: "/pricing" }. */
export function splitLocalePath(pathname: string): { locale: Locale | null; path: string } {
  for (const locale of LOCALES) {
    const prefix = PREFIX[locale];
    if (!prefix) continue;
    if (pathname === prefix) return { locale, path: "/" };
    if (pathname.startsWith(`${prefix}/`)) return { locale, path: pathname.slice(prefix.length) };
  }
  return { locale: null, path: pathname };
}

/** What the browser asks for, when we have nothing else to go on. */
export function localeFromAcceptLanguage(header: string | null): Locale {
  if (!header) return DEFAULT_LOCALE;
  for (const part of header.split(",")) {
    const tag = part.split(";")[0]!.trim().toLowerCase();
    if (tag.startsWith("ar")) return "tn";
    if (tag.startsWith("fr")) return "fr";
  }
  return DEFAULT_LOCALE;
}
