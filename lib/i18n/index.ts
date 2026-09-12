import { DIR, INTL, localePath, type Locale } from "./config";
import { fmt, plural as pluralOf, type Plural } from "./dict";
import { messagesFor, type Messages } from "./messages";

export type { Locale } from "./config";
export type { Messages } from "./messages";

export type I18n = {
  locale: Locale;
  dir: "ltr" | "rtl";
  /** BCP-47 tag for Intl (dates, numbers). */
  intl: string;
  /** The translated strings, e.g. t.common.save */
  t: Messages;
  /** fill("Bonjour {name}", { name }) */
  fill: (template: string, vars?: Record<string, string | number>) => string;
  /** count(t.common.stampsCount, 3) → "3 tampons" */
  count: (entry: Plural | string, n: number, vars?: Record<string, string | number>) => string;
  /** A database error code turned into a sentence. */
  msg: (code: string | null | undefined, fallback?: string) => string;
  /** Public-page link in the current language: path("/pricing") → "/tn/pricing" */
  path: (path: string) => string;
};

const CACHE = new Map<Locale, I18n>();

export function makeI18n(locale: Locale): I18n {
  let i18n = CACHE.get(locale);
  if (!i18n) {
    const t = messagesFor(locale);
    i18n = {
      locale,
      dir: DIR[locale],
      intl: INTL[locale],
      t,
      fill: fmt,
      count: (entry, n, vars) => pluralOf(entry, n, locale, vars),
      msg: (code, fallback) => {
        const table = t.errors as Record<string, string>;
        return (code && table[code]) || fallback || table.network!;
      },
      path: (path) => localePath(path, locale),
    };
    CACHE.set(locale, i18n);
  }
  return i18n;
}
