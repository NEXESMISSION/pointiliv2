/**
 * The founder's money, as the console's «الفلوس» page reads it (19 Nov 2026: «the money has its own page … super
 * clear, very modern», and «stuff I pay monthly, the fixed costs, with a countdown»).
 */

/** The dinars a dollar costs him: the rate he buys at (the founder, 19 Nov 2026). */
export const USD_TND = 3.6;

/** One line of money, either side: a shop's subscription (kind «shop») or a line of the books. `day`: YYYY-MM-DD in Tunis. */
export type MoneyLine = {
  key: string;
  day: string;
  side: "in" | "out";
  amount: number;
  label: string;
  detail: string;
  kind: string;
  /** a line written by hand (the books), which can be taken back */
  hand: number | null;
  /** the fixed cost it paid, if any */
  fixed: number | null;
};

/** A fixed cost: dinars (and dollars when priced in them), every how many months, the next day it is due. */
export type FixedCost = { id: number; what: string; kind: string; amount: number; usd: number | null; every: number; next_on: string; last_on: string | null; paid: number };

/** What a fixed cost comes to in dinars today: its dollars at the rate, else its dinars. */
export const fixedDinars = (f: Pick<FixedCost, "amount" | "usd">) => (f.usd ? Math.round(f.usd * USD_TND * 1000) / 1000 : f.amount);

/** Days from one YYYY-MM-DD to another (negative: already past). */
export function daysBetween(from: string, to: string): number {
  const [a, b] = [from, to].map((d) => {
    const [y, m, day] = d.split("-").map(Number);
    return Date.UTC(y!, (m ?? 1) - 1, day ?? 1);
  });
  return Math.round((b! - a!) / 86_400_000);
}

/** The first day of the month `n` months before the one of `day` (YYYY-MM-01). */
export function monthStart(day: string, back = 0): string {
  const [y, m] = day.split("-").map(Number);
  const d = new Date(Date.UTC(y!, (m ?? 1) - 1 - back, 1));
  return d.toISOString().slice(0, 10);
}

/** The last day of the month of `day`. */
export function monthEnd(day: string): string {
  const [y, m] = day.split("-").map(Number);
  return new Date(Date.UTC(y!, m ?? 1, 0)).toISOString().slice(0, 10);
}
