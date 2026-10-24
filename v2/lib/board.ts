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
  /** the founder's own line about the shop, his follow-up of it (STAGES) and since when */
  note: string;
  stage: string;
  stage_at: string | null;
};

/**
 * The founder's follow-up of a shop, picked next to his note (24 Oct 2026:
 * «not called, messaged, called, did not answer, waiting for payment… whatever
 * helps organise it»): in the order a sale goes, in five groups, each with
 * its colour. The keys are crm.stage's (schema.sql keeps the same list).
 */
export type StageTone = "grey" | "blue" | "orange" | "purple" | "amber" | "green" | "red";
export const STAGES: { key: string; label: string; group: string; tone: StageTone }[] = [
  { key: "new", label: "ما كلّمتوش", group: "مازال", tone: "grey" },
  { key: "messaged", label: "بعثتلو ميساج", group: "التواصل", tone: "blue" },
  { key: "called", label: "كلّمتو", group: "التواصل", tone: "blue" },
  { key: "no_answer", label: "ما جاوبش", group: "التواصل", tone: "orange" },
  { key: "callback", label: "نعاود نكلّمو", group: "التواصل", tone: "orange" },
  { key: "wrong_number", label: "نومرو غالط", group: "التواصل", tone: "red" },
  { key: "interested", label: "مهتم", group: "يخمّم", tone: "purple" },
  { key: "trying", label: "قاعد يجرّب", group: "يخمّم", tone: "purple" },
  { key: "help", label: "يحب معاونة", group: "يخمّم", tone: "purple" },
  { key: "visit", label: "نمشيلو للمحل", group: "يخمّم", tone: "purple" },
  { key: "waiting_pay", label: "نستنّى في الخلاص", group: "الخلاص", tone: "amber" },
  { key: "promised", label: "وعد يخلّص", group: "الخلاص", tone: "amber" },
  { key: "paid", label: "خلّص", group: "الخلاص", tone: "green" },
  { key: "refused", label: "موش مهتم", group: "وفات", tone: "red" },
  { key: "lost", label: "بطّل / سكّر", group: "وفات", tone: "red" },
];
export const STAGE_KEYS = STAGES.map((x) => x.key);
export const stageOf = (key: string | null | undefined) => STAGES.find((x) => x.key === key) ?? STAGES[0];
/** each colour: the pill's ground and words, its ring, and a dot */
export const STAGE_LOOK: Record<StageTone, { box: string; ring: string; dot: string }> = {
  grey: { box: "bg-canvas text-muted", ring: "ring-line", dot: "bg-faint" },
  blue: { box: "bg-[#E8F1FF] text-[#1D5FD1]", ring: "ring-[#C9DDFB]", dot: "bg-[#2F7BF5]" },
  orange: { box: "bg-[#FFF1E6] text-[#B8480E]", ring: "ring-[#FBD6BC]", dot: "bg-[#F07A2B]" },
  purple: { box: "bg-brand-soft text-brand", ring: "ring-[#DCD3FF]", dot: "bg-brand" },
  amber: { box: "bg-[#FFF7D6] text-[#86620A]", ring: "ring-[#F3E2A0]", dot: "bg-[#E2A50B]" },
  green: { box: "bg-mint-soft text-mint", ring: "ring-[#BFEBD9]", dot: "bg-mint" },
  red: { box: "bg-coral-soft text-coral", ring: "ring-[#FFD1C4]", dot: "bg-coral" },
};
/** the stages in their groups, in their order: for the lists */
export const STAGE_GROUPS = [...new Set(STAGES.map((x) => x.group))].map((g) => ({ group: g, stages: STAGES.filter((x) => x.group === g) }));

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

/** Does the shop answer what was typed: its name, its owner, the number, a word of the note, its follow-up, its kind. */
export function hit(s: BoardShop, q: string): boolean {
  const words = plain(q).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = plain(`${s.name} ${s.owner.name ?? ""} ${digits(s.owner.phone ?? "")} ${s.note} ${stageOf(s.stage).label}`);
  return words.every((w) => hay.includes(w) || kindMatches(s.kind, w));
}
