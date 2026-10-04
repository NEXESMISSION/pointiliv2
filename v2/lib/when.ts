import { fill, hoursN, t } from "@/lib/t";

const TZ = "Africa/Tunis";
const day = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ, year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
const hm = (d: Date) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(d);
const dm = (d: Date) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "numeric", timeZone: TZ }).format(d);

/**
 * When the next tampon comes, said the Tunisian way, from the shop's own wait
 * (an hour, the next day, hours): «على 15:30», «غدوة», «غدوة على 09:00»,
 * «نهار 12/10». Tunisia keeps one time all year, so a day is 24 hours.
 */
export function nextTampon(iso: string, now: Date = new Date()): string {
  const at = new Date(iso);
  const time = hm(at);
  const midnight = time === "00:00";
  if (day(at) === day(now)) return fill(t.soonAt, { time });
  if (day(at) === day(new Date(now.getTime() + 86_400_000))) return midnight ? t.soonTomorrow : fill(t.soonTomorrowAt, { time });
  return midnight ? fill(t.soonDay, { date: dm(at) }) : fill(t.soonDayAt, { date: dm(at), time });
}

/** What the shop's wait means for a customer, in a line. */
export function waitSays(gap: number): string {
  if (gap <= 0) return t.waitNoneSays;
  if (gap === 60) return t.waitHourSays;
  if (gap === 1440) return t.waitDaySays;
  return fill(t.waitHoursSays, { n: hoursN(Math.round(gap / 60)) });
}
