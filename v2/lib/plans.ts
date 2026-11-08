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

/**
 * Pointili Pro (9 Nov 2026, the packs: supabase/packs-2026-11-09.sql): everything in Pointili, and the
 * golden ticket, the store, the customers' file and 3 staff phones — a month 55, six months 200, a year
 * 300, the offer's two months as on Pointili. PLANS above are Pointili's own. A shop already open («old»)
 * keeps its own prices: these are for the shops on a pack.
 */
export const PRO_PLANS: Plan[] = [
  { id: "month", months: 1, price: 55, gift: 0 },
  { id: "half", months: 6, price: 200, gift: GIFT_MONTHS },
  { id: "year", months: 12, price: 300, gift: GIFT_MONTHS },
];

/**
 * Pro said on the public prices page (/prix) — only once the founder sets PRO_PUBLIC=1 on Vercel: until
 * then the page is the one every owner already knows. The shops on a pack see Pro where they pay either way.
 */
export const PRO_PUBLIC = process.env.PRO_PUBLIC === "1";

export type Pack = "old" | "base" | "pro";
/** a pack's own price list (an old shop: its own, as plansFor says) */
export const plansOfPack = (pack: Pack, old?: boolean | null): Plan[] => (pack === "pro" ? PRO_PLANS : plansFor(old));

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

/**
 * How a payment taken by hand came (plan_log.method, the founder's form): one of the usual ways — or a
 * few words the founder typed himself (8 Nov 2026: «add an option to type the payment method manually»),
 * kept as he wrote them, 40 characters at most.
 */
export const PAY_WAYS = [
  { id: "cash", label: "كاش" },
  { id: "d17", label: "D17" },
  { id: "virement", label: "Virement" },
  { id: "versement", label: "Versement" },
  { id: "mandat", label: "Mandat" },
] as const;
export const PAY_WAY_MAX = 40;

/** What to show for a way written down: its name for a usual one, else the words themselves. */
export const payWayLabel = (m: string | null | undefined): string | null => (m ? (PAY_WAYS.find((w) => w.id === m)?.label ?? m) : null);

/**
 * A way as the founder gave it (a chip's id or typed words) → what is written down: a usual way typed by
 * hand («d17», «كاش», «Virement») becomes that way; anything else is kept trimmed, control characters out;
 * nothing (or too long) → null.
 */
export function payWayOf(raw: string | null | undefined): string | null {
  const v =(raw ?? "").replace(/[\u0000-\u001F\u007F]/g, " ").replace(/\s+/g, " ").trim();
  if (!v || v.length > PAY_WAY_MAX) return null;
  const low = v.toLowerCase();
  return PAY_WAYS.find((w) => w.id === low || w.label.toLowerCase() === low)?.id ?? v;
}
