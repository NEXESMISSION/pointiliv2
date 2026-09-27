/**
 * Numbers and dates the way the desk reads them: Tunis time, Latin digits,
 * dinars without trailing millimes. Pure functions — server or browser.
 */
import type { Locale } from "@/lib/i18n/config";

const TZ = "Africa/Tunis";

/** "2026-10-27" is a calendar day, not an instant: read it at noon UTC so no
    timezone can push it onto the day before. */
const asDay = (d: string) => new Date(d.length === 10 ? `${d}T12:00:00Z` : d);

const cache = new Map<string, Intl.DateTimeFormat | Intl.NumberFormat>();
function dtf(intl: string, opts: Intl.DateTimeFormatOptions): Intl.DateTimeFormat {
  const key = `d|${intl}|${JSON.stringify(opts)}`;
  let f = cache.get(key) as Intl.DateTimeFormat | undefined;
  if (!f) cache.set(key, (f = new Intl.DateTimeFormat(intl, { timeZone: TZ, ...opts })));
  return f;
}

/** 27 oct. / 27 أكتوبر */
export function day(d: string | null | undefined, intl: string): string {
  return d ? dtf(intl, { day: "numeric", month: "short" }).format(asDay(d)) : "—";
}

/** 27 oct. 2026 */
export function dayYear(d: string | null | undefined, intl: string): string {
  return d ? dtf(intl, { day: "numeric", month: "short", year: "numeric" }).format(asDay(d)) : "—";
}

/** samedi 27 septembre */
export function longDay(d: string, intl: string): string {
  return dtf(intl, { weekday: "long", day: "numeric", month: "long" }).format(asDay(d));
}

/** septembre 2026 */
export function monthName(d: string, intl: string): string {
  return dtf(intl, { month: "long", year: "numeric" }).format(asDay(d));
}

/** 18:32 */
export function time(ts: string | null | undefined, intl: string): string {
  return ts ? dtf(intl, { hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts)) : "—";
}

/** 27 sept., 18:32 */
export function dayTime(ts: string, intl: string): string {
  return dtf(intl, { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hour12: false }).format(new Date(ts));
}

/** 60 DT / 60 د.ت — millimes only when there are some */
export function money(n: number | null | undefined, intl: string, locale: Locale): string {
  const key = `n|${intl}`;
  let f = cache.get(key) as Intl.NumberFormat | undefined;
  if (!f) cache.set(key, (f = new Intl.NumberFormat(intl, { maximumFractionDigits: 3 })));
  return `${f.format(Number(n ?? 0))} ${locale === "fr" ? "DT" : "د.ت"}`;
}

/** "+21628131507" → "28 131 507" */
export function phoneLocal(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/^\+216/, "");
  return d.length === 8 ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : e164;
}

/** wa.me wants digits only, country code first */
export function waLink(e164: string | null | undefined, text: string): string {
  const to = e164 ? e164.replace(/\D/g, "") : "";
  return `https://wa.me/${to}?text=${encodeURIComponent(text)}`;
}

/** Today in Tunis (UTC+1 all year, no summer time) as YYYY-MM-DD. */
export function tunisToday(): string {
  return new Date(Date.now() + 3_600_000).toISOString().slice(0, 10);
}

/** The public address of a member's card. */
export function cardPath(token: string): string {
  return `/abonili/c/${token}`;
}
