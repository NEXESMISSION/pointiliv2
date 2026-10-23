import { digits } from "@/lib/phone";
import { daysN, hoursN, kindMatches, plain } from "@/lib/t";

/*
 * The console's shops, as the board reads them (admin_board), and what reads
 * them — where a shop stands, whether it answers a search, when it last
 * moved. Kept out of the client components so a server page (a shop's whole
 * page) can call them too.
 */

/** one shop on the board (admin_board) */
export type BoardShop = {
  id: string;
  name: string;
  kind: string;
  color: string;
  logo: string | null;
  /** the card is made */
  card: boolean;
  created_at: string;
  paused: boolean;
  owner: { name: string | null; phone: string | null };
  paid_until: string | null;
  paid: boolean;
  trial_end: string;
  /** the trial's clock started (the first customer came) */
  started: boolean;
  /** the trial is over and nothing is paid: the counter is stopped */
  shut: boolean;
  /** tampons to customers (never the owner's own, a test's or a robot's): all, today, the last 7 days (the first hour after the opening left out) */
  stamps: number;
  today: number;
  week: number;
  customers: number;
  /** customers who got a tampon more than an hour after the opening: the shop in use, not the owner trying it */
  real: number;
  last_at: string | null;
  /** customers who came back on another day; gifts handed over */
  returning: number;
  gifts: number;
  /** the last 14 days, day by day, oldest first (the first hour left out); null: not one tampon in them */
  spark: number[] | null;
  /** the owner: last seen, on how many days, on the site right now, how long in all (ms) */
  seen_at: string | null;
  days: number;
  online: boolean;
  ms: number;
  /** the owner opened the pay page, last; tapped a call or a WhatsApp to pay, last; put Pointili on the phone; let it notify */
  pay_seen: string | null;
  wa_at: string | null;
  app: boolean;
  push: boolean;
  /** the founder's own line about the shop */
  note: string;
};

/** what the access controls need of a shop (the board's line, or the study page) */
export type AccessShop = Pick<BoardShop, "id" | "name" | "owner" | "paid" | "paid_until" | "shut" | "started" | "trial_end">;

const HOUR = 3_600_000;
const DAY = 24 * HOUR;
const TZ = "Africa/Tunis";
const monthYear = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));

/** The last time anything moved at this shop: the owner in the app, or a customer's tampon. */
export const lastMove = (s: BoardShop) => [s.seen_at, s.last_at].filter((x): x is string => !!x).sort().pop() ?? null;

export type Tone = "mint" | "brand" | "coral" | "grey";
export const PILL: Record<Tone, string> = {
  mint: "bg-mint-soft text-mint",
  brand: "bg-brand-soft text-brand",
  coral: "bg-coral-soft text-coral",
  grey: "bg-canvas text-muted ring-1 ring-inset ring-line",
};

/** Where the shop stands, in three words: paid, its trial and what is left of it, over, or not started. */
export function standing(s: Pick<BoardShop, "paused" | "paid" | "paid_until" | "card" | "shut" | "started" | "trial_end">, now: number): { say: string; tone: Tone } {
  if (s.paused) return { say: "موقوف", tone: "grey" };
  if (s.paid && s.paid_until) return { say: `خالص حتى ${monthYear(s.paid_until)}`, tone: "mint" };
  if (!s.card) return { say: "بلا كارط", tone: "grey" };
  if (s.shut) return { say: "التجربة وفات", tone: "coral" };
  if (!s.started) return { say: "يستنّى أوّل حريف", tone: "grey" };
  const left = Date.parse(s.trial_end) - now;
  return { say: `تجربة · باقي ${left >= DAY ? daysN(Math.floor(left / DAY)) : hoursN(Math.max(1, Math.ceil(left / HOUR)))}`, tone: "brand" };
}

/** Does the shop answer what was typed: its name, its owner, the number, a word of the note, its kind. */
export function hit(s: BoardShop, q: string): boolean {
  const words = plain(q).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = plain(`${s.name} ${s.owner.name ?? ""} ${digits(s.owner.phone ?? "")} ${s.note}`);
  return words.every((w) => hay.includes(w) || kindMatches(s.kind, w));
}
