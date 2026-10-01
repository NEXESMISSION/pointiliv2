import { INTL, type Locale } from "@/lib/i18n/config";
import { fmt } from "@/lib/i18n/dict";
import type { Messages } from "@/lib/i18n/messages";

/** The rates an owner picks from: how many dinars paid make one point. */
export const RATE_PICKS = [0.5, 1, 2, 5] as const;

/** The most gifts a catalog holds. */
export const MAX_GIFTS = 12;

/** «كل دينار = نقطة», «كل 500 مليم = نقطة», «كل 2 د = نقطة». */
export function rateRule(rate: number, w: Messages["points"]): string {
  const r = Number(rate) || 1;
  if (r === 1) return w.everyDinar;
  if (r < 1) return fmt(w.everyMillimes, { m: Math.round(r * 1000) });
  return fmt(w.everyDinars, { n: r });
}

/** What was paid, the Tunisian way: 35, 12,5, 1.250. */
export function formatAmount(n: number | string | null | undefined, locale: Locale): string {
  return new Intl.NumberFormat(INTL[locale], { maximumFractionDigits: 3 }).format(Number(n ?? 0));
}

/** The points an amount makes: what the database will count (floor). */
export function pointsFor(amount: number, rate: number): number {
  if (!(amount > 0) || !(rate > 0)) return 0;
  return Math.floor(Math.round((amount / rate) * 1000) / 1000);
}
