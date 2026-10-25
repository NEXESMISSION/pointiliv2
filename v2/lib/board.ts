import { digits } from "@/lib/phone";
import { agoSaid, customersN, daysN, hoursN, kindMatches, plain, stampsN } from "@/lib/t";

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
  /** the card is made, and how many tampons its gift takes */
  card: boolean;
  goal: number | null;
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

/*
 * What the numbers say about a shop, read for the founder (25 Oct 2026: «I have problems analysing
 * people: on the box, something super smart and useful, so that when I look I have an idea of the
 * client and of what you think of him»). Three lines: what is going on, the facts that say so, and
 * what to do now — his own follow-up (the stage he picked) taken into account. The rules come from
 * the shops as they stood that day: most opened at night and never gave a tampon; some tried alone
 * in the first hour and stopped; a few used it for real. Of those, the ones a call turns into a
 * payment had their trial end while they were using it, or opened the pay page, or tried to call.
 */
export type ReadTone = "hot" | "good" | "warn" | "risk" | "cold";
export type ReadMark = "flame" | "wallet" | "up" | "check" | "alert" | "down" | "sleep" | "pause";
export type Reading = { tone: ReadTone; mark: ReadMark; head: string; why: string[]; next: string };
export type ReadInput = Pick<
  BoardShop,
  | "created_at" | "paused" | "card" | "goal" | "paid" | "paid_until" | "trial_end" | "started" | "shut" | "stamps" | "today" | "week"
  | "customers" | "real" | "last_at" | "returning" | "spark" | "seen_at" | "pay_seen" | "wa_at" | "stage" | "stage_at"
>;

const tunisDay = (t: number) => new Intl.DateTimeFormat("en-CA", { timeZone: TZ }).format(new Date(t));
const dayMonth = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
/** how many days until a date, as the calendar in Tunis counts them (0: today, 1: tomorrow) */
const daysTo = (iso: string, now: number) => Math.round((Date.parse(`${tunisDay(Date.parse(iso))}T00:00:00Z`) - Date.parse(`${tunisDay(now)}T00:00:00Z`)) / DAY);
/** today, tomorrow, or the date itself (never «in two days» beside a pill that floors the hours to «one day left») */
const onDay = (d: number, iso: string) => (d <= 0 ? "اليوم" : d === 1 ? "غدوة" : `نهار ${dayMonth(iso)}`);

export function readShop(s: ReadInput, now: number): Reading {
  const ago = (iso: string) => agoSaid(now - Date.parse(iso));
  const since = (iso: string | null) => (iso ? (now - Date.parse(iso)) / DAY : Infinity);
  const age = since(s.created_at);
  const active = (s.spark ?? []).filter((n) => n > 0).length;
  const sinceStamp = since(s.last_at);
  const sinceSeen = since(s.seen_at);
  const back = s.real ? Math.round((100 * s.returning) / s.real) : 0;
  const left = s.started && !s.shut ? daysTo(s.trial_end, now) : null;
  // the facts, a few words each; a reading keeps three
  const used = s.real ? `${customersN(s.real)} في ${daysN(Math.max(1, Math.round(age)))}` : null;
  const rhythm = active > 1 ? `خدم ${daysN(active)} من 14` : null;
  const lately = s.today ? `${stampsN(s.today)} اليوم` : s.week ? `${stampsN(s.week)} هالجمعة` : null;
  const lastStamp = s.last_at ? `آخر تامبون ${ago(s.last_at)}` : null;
  const seen = s.seen_at ? `آخر دخلة ${ago(s.seen_at)}` : "ما رجعش للأبليكاسيون";
  const opened = `تحلّ ${ago(s.created_at)}`;
  const price = s.pay_seen ? `حلّ صفحة الخلاص ${ago(s.pay_seen)}` : null;
  const called = s.wa_at ? `حاول يكلّمنا ${ago(s.wa_at)}` : null;
  const ends = left !== null ? `التجربة توفى ${onDay(left, s.trial_end)}` : null;
  // customers who never come back, once there were enough of them and time enough: the loyalty is not working
  const noReturn = s.real >= 8 && age >= 10 && back < 10;
  const returning = s.real >= 5 ? (s.returning ? `${s.returning} رجعولو (${back}%)` : "حتى حريف ما رجعلو") : null;
  // a lot of tampons for one or two «customers»: the owner trying with another phone, more likely than a customer
  const alone = s.real > 0 && s.real <= 2 && s.stamps / s.real >= 5 ? `${stampsN(s.stamps)} ل${customersN(s.real)}` : null;
  // used for real: many customers, or customers who come back, or a busy week
  const strong = s.real >= 10 || (s.real >= 5 && back >= 20) || s.week >= 15;
  const facts = (...x: (string | null)[]) => x.filter((f): f is string => !!f).slice(0, 3);

  const r = ((): Reading => {
    if (s.paused) return { tone: "cold", mark: "pause", head: "موقوف", why: facts(used, lastStamp), next: "رجّعو من «أكثر» كي يلزم" };

    if (s.paid) {
      const renew = s.paid_until && Date.parse(s.paid_until) - now < 30 * DAY ? `الأبونمان يوفى ${dayMonth(s.paid_until)}` : null;
      if (s.week > 0 || sinceStamp <= 3) {
        if (noReturn)
          return {
            tone: "good",
            mark: "check",
            head: "خالص ويخدم بيها، أما الحرفاء ما يرجعوش",
            why: facts(used, returning, renew ?? rhythm),
            next: s.goal ? `اقترح عليه كادو أقرب من ${stampsN(s.goal)}، باش الحريف يحسّ بلّي قريب` : "اسألو علاش الحرفاء ما يرجعوش: الكادو بعيد؟",
          };
        return { tone: "good", mark: "check", head: "خالص ويخدم بيها", why: facts(used, renew ?? rhythm, returning), next: renew ? "التجديد قريب: كلّمو قبل" : "حافظ عليه: اسألو كيفاش ماشية، واطلب منو يعرّفك بمحل آخر" };
      }
      if (s.real) return { tone: "risk", mark: "down", head: "خالص أما وقف يخدم", why: facts(lastStamp, used, renew), next: "كلّمو: شنوّة صار؟ لازمو يرجع يخدم قبل التجديد" };
      return { tone: "warn", mark: "alert", head: "خالص وما بداش مع الحرفاء", why: facts(seen, renew), next: "روحلو ولا كلّمو: عاونو يحطّ الكود على الكونتوار" };
    }

    // he tapped «كلّمنا» lately: a call he is waiting for — the strongest sign when he also uses it
    if (s.wa_at && since(s.wa_at) <= 7) {
      if (s.real) return { tone: "hot", mark: "wallet", head: `حاول يكلّمنا ${ago(s.wa_at)}`, why: facts(used, alone ?? price, s.shut ? "التجربة وفات" : (ends ?? lately)), next: "كلّمو توّا: يستنّى فيك، أغلب الظن باش يخلّص" };
      return { tone: "warn", mark: "alert", head: `حاول يكلّمنا ${ago(s.wa_at)}، وما بداش مع الحرفاء`, why: facts(opened, seen, price), next: "كلّمو: شنوّة يحب؟ عاونو يعطي أوّل تامبون" };
    }

    if (!s.card) {
      if (age < 2) return { tone: "warn", mark: "alert", head: "حلّ وما كمّلش الكارط", why: facts(opened, seen), next: "كلّمو اليوم: الكارط تكمل في دقيقة" };
      return { tone: "cold", mark: "sleep", head: "ما كمّلش الكارط", why: facts(opened, seen, called), next: "ميساج واحد، وإلا خلّيه آخر واحد" };
    }
    if (!s.customers) {
      if (age < 3) return { tone: "warn", mark: "alert", head: "عمل الكارط، حتى حريف مازال", why: facts(opened, seen, price), next: "كلّمو: ورّيه كيفاش يحطّ الكود ويعطي أوّل تامبون اليوم" };
      if (sinceSeen <= 3) return { tone: "warn", mark: "alert", head: "يدخل أما ما بداش مع الحرفاء", why: facts(opened, seen, price), next: "اسألو شنوّة حابسو، وعاونو يعطي أوّل تامبون" };
      return { tone: "cold", mark: "sleep", head: "حلّ وما رجعش", why: facts(opened, seen, called ?? price), next: "آخر محاولة: ميساج قصير، وإلا خلّيه" };
    }
    if (!s.real) {
      const tries = `${customersN(s.customers)} في الساعة الأولى`;
      if (sinceSeen <= 3) return { tone: "warn", mark: "alert", head: "جرّب وحدو، حتى حريف حقيقي", why: facts(tries, seen, price), next: "كلّمو: الخطوة الجاية أوّل حريف حقيقي، ورّيه كيفاش" };
      return { tone: "cold", mark: "sleep", head: "جرّب نهار حلّ ووقف", why: facts(tries, seen, called), next: "ميساج: يحب نعاونوه يبدا مع الحرفاء؟" };
    }
    if (alone) return { tone: "warn", mark: "alert", head: "تامبونات برشا لحريف واحد", why: facts(alone, seen, called ?? price), next: "تثبّت: حريف حقيقي ولا هو يجرّب بتليفون آخر؟" };

    if (s.shut) {
      const ended = `التجربة وفات ${ago(s.trial_end)}`;
      if (s.pay_seen && since(s.pay_seen) <= 14) return { tone: "hot", mark: "wallet", head: "التجربة وفات وحلّ صفحة الخلاص", why: facts(used, price, ended), next: "كلّمو اليوم وسكّر معاه: راهو يخمّم يخلّص" };
      if (s.real >= 3)
        return { tone: "hot", mark: "flame", head: sinceStamp <= 7 ? "التجربة وفات وهو يخدم" : "التجربة وفات وكان يخدم", why: facts(used, ended, lastStamp), next: "الكونتور واقف عندو: أحسن وقت تكلّمو باش يخلّص" };
      if (sinceStamp <= 7) return { tone: "warn", mark: "alert", head: "بدا شوية والتجربة وفات", why: facts(used, ended, called ?? price), next: "كلّمو: كان بدا، يحب يكمّل؟" };
      return { tone: "cold", mark: "sleep", head: "خدم شوية والتجربة وفات", why: facts(used, ended, called ?? price), next: "ميساج واحد: يحب يرجع يخدم؟" };
    }
    // the trial ends today or tomorrow: the day a call counts
    if (left !== null && left <= 1)
      return { tone: "hot", mark: "flame", head: `${s.real >= 3 ? "يخدم" : "بدا"} والتجربة توفى ${onDay(left, s.trial_end)}`, why: facts(used, lately, price), next: "كلّمو اليوم: ورّيه الأرقام متاعو واطلب الخلاص" };
    if (sinceStamp >= 3) {
      if (strong) return { tone: "hot", mark: "down", head: `خدم مع ${customersN(s.real)} ووقف ${ago(s.last_at!)}`, why: facts(rhythm, price, ends), next: "كلّمو اليوم: علاش وقف؟ هذا يستاهل" };
      return { tone: "warn", mark: "down", head: "بدا ووقف", why: facts(lastStamp, used, price ?? ends), next: "اسألو علاش وقف: الكود؟ الحرفاء؟ عاونو يرجع" };
    }
    const before = left !== null ? ` قبل ${dayMonth(s.trial_end)}` : "";
    if (strong) return { tone: "hot", mark: "flame", head: "يخدم بيها بالحق", why: facts(used, rhythm ?? lately, returning ?? price), next: `كلّمو${before}: هذا يخلّص كان تكلّمو` };
    return { tone: "good", mark: "up", head: "بدا يخدم", why: facts(used, lately, price ?? ends), next: `تابعو، وكلّمو${before}` };
  })();

  // what the founder already did about it: his stage turns the next step
  const when = s.stage_at ? ` ${ago(s.stage_at)}` : "";
  const warm = r.tone === "hot" || r.tone === "good";
  switch (s.paid ? "" : s.stage) {
    case "paid":
      return { ...r, tone: "risk", mark: "wallet", head: "قلت خلّص والأبونمان موش مشعول", next: "شعّل العام من «أكثر»" };
    case "refused":
    case "lost":
      return warm ? { ...r, next: "قال لا، أما يخدم بيها: جرّب مرّة أخرى" } : { ...r, tone: "cold", next: "قال لا: خلّيه" };
    case "wrong_number":
      return { ...r, next: "النومرو غالط: لوّج عليه في فيسبوك ولا روحلو" };
    case "no_answer":
      return { ...r, next: `ما جاوبش${when}: ابعثلو واتساب وعاود` };
    case "callback":
      return { ...r, next: `قلت تعاود تكلّمو${when}: اليوم؟` };
    case "promised":
      return { ...r, next: `وعد يخلّص${when}: ذكّرو وابعثلو نومرو D17` };
    case "waiting_pay":
      return { ...r, next: `تستنّى في الخلاص${when}: ذكّرو` };
    case "help":
      return { ...r, next: "يحب معاونة: كلّمو ولا روحلو" };
    case "visit":
      return { ...r, next: "قلت تمشيلو للمحل: حدّد معاه نهار وساعة" };
    case "new":
      return r.tone === "hot" ? { ...r, next: `${r.next} · ما كلّمتوش مازال` } : r;
    default:
      return r;
  }
}

/** Does the shop answer what was typed: its name, its owner, the number, a word of the note, its follow-up, its kind. */
export function hit(s: BoardShop, q: string): boolean {
  const words = plain(q).split(" ").filter(Boolean);
  if (!words.length) return true;
  const hay = plain(`${s.name} ${s.owner.name ?? ""} ${digits(s.owner.phone ?? "")} ${s.note} ${stageOf(s.stage).label}`);
  return words.every((w) => hay.includes(w) || kindMatches(s.kind, w));
}
