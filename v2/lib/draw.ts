/**
 * The golden ticket («التذكرة الذهبية», supabase/systems-2026-11-08.sql): a draw the owner makes —
 * one gift or several, and the moment it is drawn. Until then every customer sees the countdown on
 * their card; at the moment the draw picks the winners, a ticket one chance. The types the database
 * answers with, the words, and the times said the Tunisian way. Its own file (not lib/t.ts) while the
 * systems are worked on apart from the site as it runs.
 */

export type DrawGift = { name: string; n: number };
export type DrawRule = "stamps" | "cards";

/** the owner's draw page (my_draw) */
export type OwnerDraw = {
  ok: boolean;
  error?: string;
  allowed: boolean;
  card: boolean;
  open: { id: string; title: string | null; rule: DrawRule; starts_at: string; draw_at: string; gifts: DrawGift[]; people: number; tickets: number } | null;
  last: { id: string; title: string | null; rule: DrawRule; draw_at: string; drawn_at: string; people: number; tickets: number; gifts: DrawGift[] } | null;
  wins: { id: number; draw: string; gift: string; tickets: number; given_at: string | null; card: string | null; name: string | null; phone: string | null; at: string }[];
  past: { id: string; title: string | null; status: "drawn" | "cancelled"; draw_at: string; people: number | null; winners: number }[];
};

/** one card's golden ticket (card_draw): null for a shop that never made a draw */
export type CardDraw = {
  ok: boolean;
  open: { id: string; title: string | null; rule: DrawRule; starts_at: string; draw_at: string; gifts: DrawGift[]; people: number; mine: number } | null;
  last: { id: string; title: string | null; draw_at: string; drawn_at: string; people: number; gifts: DrawGift[]; winners: number; mine: number; won: { id: number; gift: string; given: boolean }[] } | null;
  waiting: { id: number; gift: string; at: string }[];
} | null;

/** the wallet's cards with a golden ticket on them (my_draws) */
export type WalletDraw = { card: string; draw_at: string | null; won: number };

/** what the systems of a shop are (my_systems): null when it could not be read — then the screens stay as they were */
export type Systems = { ok: boolean; links: boolean; draw: boolean; draw_open: string | null; wins?: number } | null;

/** the systems as they ran before they were separated: what a screen falls back on when the answer is missing */
export const linksOn = (s: Systems) => s?.links !== false;
export const drawOn = (s: Systems) => s?.draw === true;
/** the counter asks about golden prizes: the golden ticket on, or prizes still waiting from before it went off */
export const drawCounter = (s: Systems) => drawOn(s) || (s?.wins ?? 0) > 0;

const counted = (n: number, one: string, two: string, few: string, many: string) => {
  if (n === 1) return one;
  if (n === 2) return two;
  const r = n % 100;
  return r >= 3 && r <= 10 ? `${n} ${few}` : `${n} ${many}`;
};
export const ticketsN = (n: number) => counted(n, "تذكرة وحدة", "زوز تذاكر", "تذاكر", "تذكرة");
export const peopleN = (n: number) => counted(n, "حريف واحد", "زوز حرفاء", "حرفاء", "حريف");
export const winnersN = (n: number) => counted(n, "رابح واحد", "زوز رابحين", "رابحين", "رابح");

/** «قهوة · كيك ×3»: every gift of a draw, by name and how many winners each */
export const giftsLine = (gifts: DrawGift[]) => gifts.map((g) => (g.n > 1 ? `${g.name} ×${g.n}` : g.name)).join(" · ");
export const winnersOf = (gifts: DrawGift[]) => gifts.reduce((n, g) => n + g.n, 0);

const TZ = "Africa/Tunis";
/** «الإثنين 10 نوفمبر» */
export const daySaid = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "long", day: "numeric", month: "long", timeZone: TZ }).format(new Date(iso));
/** «08:00» */
export const hourSaid = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", hour12: false, timeZone: TZ }).format(new Date(iso));
/** «الإثنين 10 نوفمبر على 08:00» */
export const whenSaid = (iso: string) => `${daySaid(iso)} على ${hourSaid(iso)}`;

/** what is left until a moment: days, hours, minutes, seconds (all 0 once it is past) */
export function leftOf(iso: string, now: number) {
  const ms = Math.max(0, Date.parse(iso) - now);
  const s = Math.floor(ms / 1000);
  return { ms, d: Math.floor(s / 86400), h: Math.floor((s % 86400) / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}

/** «بعد يومين», «بعد 5 سوايع», «بعد 20 دقيقة», «توّا» — the countdown in one breath (the wallet's line) */
export function soonSaid(iso: string, now: number): string {
  const { ms, d, h, m } = leftOf(iso, now);
  if (ms <= 0) return "توّا";
  if (d > 0) return `بعد ${counted(d, "نهار", "يومين", "أيّام", "يوم")}`;
  if (h > 0) return `بعد ${counted(h, "ساعة", "زوز سوايع", "سوايع", "ساعة")}`;
  return `بعد ${counted(Math.max(1, m), "دقيقة", "زوز دقايق", "دقايق", "دقيقة")}`;
}

/** the owner's date and hour, typed in Tunis (UTC+1 all year: no summer time since 2009), as a moment */
export function tunisMoment(date: string, time: string): string | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(date) || !/^\d{2}:\d{2}$/.test(time)) return null;
  const at = new Date(`${date}T${time}:00+01:00`);
  return Number.isNaN(at.getTime()) ? null : at.toISOString();
}

/** today in Tunis plus some days, as the date box wants it («2026-11-15») */
export function tunisDate(plusDays: number, now = Date.now()): string {
  return new Date(now + 3600_000 + plusDays * 86_400_000).toISOString().slice(0, 10);
}

export const D = {
  name: "التذكرة الذهبية",
  ownerHint: "اعمل سحب: الحرفاء يشوفو العدّاد على الكارط متاعهم، وفي الوقت اللي تختارو السيستام يختار الرابحين بالحظ.",
  newTitle: "سحب جديد",
  titleLabel: "إسم السحب (كان تحب)",
  titlePh: "مثلا: سحب آخر الشهر",
  giftsLabel: "شنوّة يربحو؟",
  giftPh: "إسم الكادو",
  giftAdd: "زيد كادو",
  giftHow: "قدّاش من واحد",
  whenLabel: "وقتاش السحب؟",
  dateLabel: "النهار",
  timeLabel: "الساعة",
  ruleLabel: "شكون يدخل في السحب؟",
  ruleStamps: "كل تامبون = تذكرة",
  ruleStampsSub: "من توّا حتى للسحب: اللي يجي أكثر عندو حظ أكثر",
  ruleCards: "كل الحرفاء، تذكرة وحدة لكل واحد",
  ruleCardsSub: "كل حريف عندو كارط عندك يدخل، مرّة وحدة",
  start: "ابدا السحب",
  starting: "…",
  live: "السحب جاري",
  liveAt: "السحب {when}",
  liveIn: "مازال",
  livePeople: "داخلين",
  liveTickets: "تذاكر",
  share: "قول للحرفاء في الواتساب",
  shareMsg: "🎟️ التذكرة الذهبية في {shop}!\nالسحب {when}.\nالكادوات: {gifts}\n{how}",
  shareHowStamps: "كل تامبون تاخذو من توّا = تذكرة في السحب. اللي يجي أكثر عندو حظ أكثر 🍀",
  shareHowCards: "كل حريف عندو كارط عندنا داخل في السحب 🍀",
  cancel: "بطّل السحب",
  cancelAsk: "تبطّل السحب؟ حتى حد ما يربح، والحرفاء ما عادش يشوفوه.",
  yes: "إيه",
  no: "لا",
  drawing: "السحب صاير توّا…",
  results: "الرابحين",
  resultsOf: "سحب {when}",
  resultsPool: "{people} دخلو، {tickets} في الكل",
  nobody: "حتى حد ما دخل في السحب هذا.",
  winnersShare: "قول شكون ربح في الواتساب",
  winnersMsg: "🎉 رابحين {title} في {shop}:\n{lines}\n\nمبروك للرابحين! السحب الجاي قريب، كل تامبون = تذكرة 🍀",
  winnersLine: "🏆 {gift}: {name}",
  someone: "حريف",
  homeRowWaiting: "{n} يستنّاو الكادو متاعهم",
  give: "سلّم",
  giveAsk: "سلّمت {gift} لـ{name}؟",
  given: "تسلّم",
  toGive: "يستنّاو",
  past: "السحبات اللي فاتو",
  pastCancelled: "تبطّل",
  pastWinners: "{n}",
  errBadTime: "اختار وقت بعد 10 دقايق على الأقل، وفي أقل من 90 يوم.",
  errBadGifts: "اكتب كادو واحد على الأقل (10 على الأكثر)، وقدّاش من واحد (50 على الأكثر).",
  errOneOpen: "عندك سحب جاري: بطّلو قبل ولا استنّى يكمل.",
  errPaused: "المحل موقوف: ما تنجمش تعمل سحب توّا.",
  errNoCard: "اعمل الكارط متاعك قبل.",
  errNotAllowed: "التذكرة الذهبية مش مفتوحة للمحل هذا.",
  errTooMany: "برشا محاولات، عاود بعد شويّة.",
  err: "ما تعدّاتش، عاود.",
  homeRow: "التذكرة الذهبية",
  homeRowOpen: "السحب {when}",
  homeRowNone: "اعمل سحب للحرفاء متاعك",
  // right after a tampon
  afterStamp: "+1 تذكرة في السحب",
  afterStampIn: "إنت داخل في السحب",
  afterStampSub: "عندك {n} · السحب {when}",
  afterStampWhen: "السحب {when}",
  // the counter: a winner's code read
  popWon: "{name} ربح في التذكرة الذهبية",
  popGive: "سلّمو الكادو توّا",
  popLater: "موش توّا",
  popGiven: "تسلّم الكادو متاع التذكرة الذهبية لـ{name}",
  // the customer's card
  cardTitle: "التذكرة الذهبية",
  cardDrawAt: "السحب {when}",
  cardMine: "عندك {n} في السحب",
  cardNone: "خوذ تامبون باش تدخل في السحب",
  cardIn: "إنت داخل في السحب ✓",
  cardGifts: "الكادوات",
  cardPeople: "{n} داخلين",
  cardDrawing: "السحب صاير توّا…",
  units: { d: "نهار", h: "ساعة", m: "دقيقة", s: "ثانية" },
  wonTitle: "مبروك! ربحت",
  wonShow: "ورّي الشاشة هذي في المحل باش تاخذ الكادو",
  wonNo: "رقم",
  wonGiven: "خذيتو ✓",
  lostTitle: "المرّة هذي ما ربحتش",
  lostBody: "{winners} من {people}. المرّة الجاية إن شاء الله 🍀",
  lostWasIn: "كان عندك {n}",
  lastDone: "صار السحب: {winners} من {people}.",
  revealWait: "السيستام يختار…",
  revealOk: "باهي",
  walletOpen: "🎟️ سحب {when}",
  walletWon: "🏆 ربحت في السحب",
  // the founder's console
  aDraw: "التذكرة الذهبية",
  aDrawOn: "مولى المحل ينجم يعمل سحب للحرفاء.",
  aDrawOnLive: "سحب جاري: {when}.",
  aDrawOff: "مطفية: مولى المحل ما يشوفهاش.",
  aDrawAskOff: "تنحّي التذكرة الذهبية؟ السحب اللي مازال ما صارش يتبطّل.",
  aDrawAskOn: "تخدّم التذكرة الذهبية للمحل هذا؟",
  aLinks: "تامبون برابط",
  aLinksOn: "مولى المحل يبعث تامبونات برابط (للبيع أونلاين).",
  aLinksOff: "مطفي: الزرّ ما يبانش لمولى المحل.",
  aLinksAskOff: "تنحّي التامبون برابط؟ الروابط اللي تبعثو قبل يقعدو يخدمو.",
};
