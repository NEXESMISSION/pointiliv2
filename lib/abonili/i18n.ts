/**
 * Abonili's own i18n object: its dictionary plus the language helpers. Safe on
 * the server and in the browser. The LANGUAGE comes from the same cookie as
 * Pointili (one person, one language); the WORDS come only from ./copy.
 */
import { DIR, INTL, type Locale } from "@/lib/i18n/config";
import { fmt, plural, type Plural } from "@/lib/i18n/dict";
import { AB, type AbCopy } from "./copy";

export type AbI18n = {
  a: AbCopy;
  locale: Locale;
  dir: "ltr" | "rtl";
  intl: string;
  fill: (template: string, vars?: Record<string, string | number>) => string;
  count: (entry: Plural | string, n: number, vars?: Record<string, string | number>) => string;
  /** a database error code, as a sentence */
  err: (code: string | null | undefined) => string;
};

const CACHE = new Map<Locale, AbI18n>();

export function abI18n(locale: Locale): AbI18n {
  let v = CACHE.get(locale);
  if (!v) {
    const a = AB[locale] as AbCopy;
    const errors = a.errors as Record<string, string>;
    v = {
      a,
      locale,
      dir: DIR[locale],
      intl: INTL[locale],
      fill: fmt,
      count: (entry, n, vars) => plural(entry, n, locale, vars),
      err: (code) => (code && errors[code]) || errors.network!,
    };
    CACHE.set(locale, v);
  }
  return v;
}
