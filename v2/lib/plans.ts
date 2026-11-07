/**
 * Pointili's prices (the founder, 7 Nov 2026): a month 35 د, six months 120,
 * a year 180. Paid within the trial's first 3 days, the six months and the
 * year come with 2 months more (8 months for 120, 14 for 180) — the month
 * does not: three months for 35 would cost less than the year.
 *
 * A shop that paid before 7 Nov 2026 keeps what it signed up for: the year at
 * 120 (shops.old_price, set once in the database — v2/supabase/schema.sql).
 *
 * The database knows the same numbers (pay_request): change them together.
 */
export type Plan = {
  id: "month" | "half" | "year";
  /** the months paid for */
  months: number;
  /** in dinars */
  price: number;
  /** months more when paid within the trial's first 3 days */
  gift: number;
};

export const GIFT_MONTHS = 2;
/** the offer runs this many days from the trial's start (its first customer) */
export const OFFER_DAYS = 3;
/** a subscription this close to its end: the owner's home says so, and the pay page takes the next one */
export const RENEW_DAYS = 5;

export const PLANS: Plan[] = [
  { id: "month", months: 1, price: 35, gift: 0 },
  { id: "half", months: 6, price: 120, gift: GIFT_MONTHS },
  { id: "year", months: 12, price: 180, gift: GIFT_MONTHS },
];

/** the price of the shops that paid before 7 Nov 2026 */
export const OLD_PLANS: Plan[] = [{ id: "year", months: 12, price: 120, gift: 0 }];

export const plansFor = (old?: boolean | null): Plan[] => (old ? OLD_PLANS : PLANS);

/** the plan an owner sees chosen first: the year (the best value, and what most owners take) */
export const planFirst = (old?: boolean | null): Plan => plansFor(old).find((p) => p.id === "year") ?? plansFor(old)[0];

/** what a month comes to on this plan (the year: 15 د; with the gift, the months it gives count too) */
export const perMonth = (p: Plan, gift = false) => Math.round(p.price / (p.months + (gift ? p.gift : 0)));

/** what it saves against paying the month every month, for the months it gives */
export const saves = (p: Plan, gift = false) => Math.max(0, PLANS[0].price * (p.months + (gift ? p.gift : 0)) - p.price);

export const MONTH = PLANS[0];
export const HALF = PLANS[1];
export const YEAR = PLANS[2];

/** Paid once, and it ran out: not a trial any more — the home, the counter and «المحل» say «الأبونمان وفى». */
export const lapsed = (pay: { paid: boolean; paid_until: string | null } | null | undefined) => !!pay && !pay.paid && !!pay.paid_until;
