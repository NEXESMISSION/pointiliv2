import { daysN, fill, t } from "@/lib/t";

/**
 * The card's clock (supabase/schema.sql, «the card's clock»): a shop may have its cards go back to zero
 * after so many days with no tampon. These say when, the way people say it — in Tunis days, not hours:
 * «اليوم», «غدوة», «بعد 5 أيّام».
 */
const DAY = 86_400_000;
const tunisDay = (ms: number) => Date.parse(new Date(ms).toLocaleDateString("sv-SE", { timeZone: "Africa/Tunis" }));

export function resetWhen(due: string, now: number): string {
  const at = Date.parse(due);
  const days = Math.round((tunisDay(at) - tunisDay(now)) / DAY);
  if (at <= now || days <= 0) return t.resetToday;
  if (days === 1) return t.resetTomorrow;
  return fill(t.resetIn, { days: daysN(days) });
}

/** The clock runs on this card: there are tampons on it and a day it goes back to zero, still to come. */
export const resetRuns = (c: { reset_due?: string | null }, now: number): c is { reset_due: string } => !!c.reset_due && Date.parse(c.reset_due) > now;

/** Within the last few days of the clock: the card says it before anything else. */
export const resetSoon = (c: { reset_due?: string | null }, now: number) => resetRuns(c, now) && Date.parse(c.reset_due!) - now <= 3 * DAY;

/** The clock took this card back to zero lately (two weeks): its customer — and the owner — are told once more. */
export const resetLately = (c: { stamps: number; reset_due?: string | null; reset_at?: string | null }, now: number) =>
  (!!c.reset_due && Date.parse(c.reset_due) <= now) || (c.stamps === 0 && !!c.reset_at && now - Date.parse(c.reset_at) < 14 * DAY);
