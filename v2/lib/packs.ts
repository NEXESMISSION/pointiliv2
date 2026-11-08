/**
 * The packs (supabase/packs-2026-11-09.sql): Pointili and Pointili Pro, and the shops already open,
 * «old», kept exactly as they are. The model (the founder, 8–9 Nov 2026): every visit is a tampon; the
 * owner picks ONE reward for it — the gift, the roulette, or the store (Pro) — and adds extras: the golden
 * ticket (Pro), the link, «what it sells», staff phones (Pro). The types the database answers with and
 * the words. Its own file while the packs are worked on apart from the site as it runs.
 */
import type { Pack } from "@/lib/plans";

/** what the owner's screens know of the shop's systems (my_systems): null when it could not be read */
export type ShopSystems = {
  ok: boolean;
  links: boolean;
  draw: boolean;
  draw_open: string | null;
  wins?: number;
  pack?: Pack;
  store_allowed?: boolean;
  store_on?: boolean;
  wheel_on?: boolean;
  wheel_allowed?: boolean;
  export?: boolean;
  staff_max?: number;
  staff?: number;
} | null;

/** a shop that is on a pack (not one already open the day the packs came): the new screens are for it */
export const onPack = (s: ShopSystems): s is NonNullable<ShopSystems> & { pack: "base" | "pro" } => s?.pack === "base" || s?.pack === "pro";
export const isPro = (s: ShopSystems) => s?.pack === "pro";

/** the reward the shop gives now */
export type Reward = "gift" | "wheel" | "store";
export const rewardOf = (s: { store_on?: boolean | null; wheel_on?: boolean | null }): Reward => (s.store_on ? "store" : s.wheel_on ? "wheel" : "gift");

/** what switching the reward would do to the customers (store_preview) */
export type StorePreview =
  | { ok: true; to: "store"; allowed: boolean; customers: number; points: number; gifts_waiting: number; items: number }
  | { ok: true; to: "card"; goal: number | null; gift: string | null; customers: number; over: number; gifts: number; orders_waiting: number };

/** the owner's staff phones (my_staff) */
/** what a staff phone did (staff_log): tampons given by number, gifts and prizes handed over, tampons taken back */
export type StaffDid = { stamps: number; gifts: number; back: number };
export type MyStaff = {
  ok: boolean;
  max: number;
  /** invites sent and not used yet, still open */
  invites?: number;
  staff: { id: number; name: string | null; phone: string | null; since: string; today?: StaffDid; week?: StaffDid; last?: string | null }[];
};

/** the shop a staff phone works at (my_staff_shop) */
export type StaffShop = {
  id: string;
  name: string;
  kind: string;
  color: string;
  paused: boolean;
  signal: string;
  logo: string | null;
  stamp_logo: boolean;
  goal: number | null;
  gift: string | null;
  items_on: boolean;
  wheel_on: boolean;
  wheel_allowed: boolean;
  store_on: boolean;
  draw: boolean;
  owner: string | null;
} | null;

export const PACK_NAME: Record<Pack, string> = { old: "Pointili", base: "Pointili", pro: "Pointili Pro" };

/** نقطة وحدة, زوز نقاط, 5 نقاط, 12 نقطة — the store's points, the Tunisian way */
export function pointsN(n: number): string {
  if (n === 1) return "نقطة وحدة";
  if (n === 2) return "زوز نقاط";
  const r = n % 100;
  return r >= 3 && r <= 10 ? `${n} نقاط` : `${n} نقطة`;
}

export const P = {
  // the customer's card, after the shop changed its reward: what was won before still waits
  cardGiftWaits: "كادو يستنّاك: {gift} — ورّي الكود متاعك في الكاسة",
  cardOrderWaits: "عندك طلبية من الماغازة تستنّى — ورّي الكود متاعك في الكاسة",
  // the owner's «النظام متاعي»
  title: "النظام متاعي",
  hint: "كل زيارة = تامبون. اختار شنوّة يربح بيه الحريف، وزيد اللي تحب.",
  rewardTitle: "شنوّة يربح الحريف؟",
  rewardOne: "واحد برك في نفس الوقت",
  rewardNow: "توّا",
  gift: "كادو ثابت",
  giftSub: "يكمّل الكارط، ياخذ الكادو اللي اخترتو.",
  wheel: "الروليت",
  wheelSub: "يكمّل الكارط، يدوّر الروليت ويربح بالحظ.",
  store: "الماغازة",
  storeSub: "التامبونات يوليو نقاط، يشري بيهم من عندك.",
  extrasTitle: "زيد",
  draw: "التذكرة الذهبية",
  drawSub: "سحب: كل تامبون = تذكرة.",
  links: "تامبون برابط",
  linksSub: "للحرفاء اللي يشريو منك أونلاين.",
  items: "شنوّة يبيع",
  itemsSub: "كل تامبون يقول على شنوّة.",
  staff: "تليفونات الخدّامة",
  staffSub: "الخدّامة يعطيو التامبونات من تليفوناتهم.",
  file: "تحميل البيانات",
  fileSub: "ليستة الحرفاء في فيشي Excel.",
  open: "حلّ",
  pro: "Pro",
  proOnly: "في Pointili Pro",
  offHere: "مطفي عندك: كلّمنا باش نخدّموهولك",
  proCall: "نحب Pointili Pro",
  proLine: "التذكرة الذهبية، الماغازة، تليفونات الخدّامة وتحميل البيانات.",
  promise: "الحرفاء ما يخسرو شي: التامبونات اللي عندهم يقعدو، والكادوات اللي ربحوهم يقعدو.",
  // switching to or from the store: what it does, said before
  toStoreTitle: "تخدّم الماغازة؟",
  toStoreBody: "{customers} عندهم تامبونات: يوليو {points} يشريو بيهم من الماغازة.",
  toStoreWaiting: "والكادوات اللي ربحوهم قبل ({n}) يقعدو يستنّاو.",
  toStoreItems: "بعد، زيد الحاجات اللي تبيعها في الماغازة وقدّاش من نقطة كل وحدة.",
  toCardTitle: "ترجع للكارط؟",
  toCardBody: "النقاط يوليو تامبونات على كارط {goal}. {over} عندهم أكثر من كارط كاملة: يربحو {gifts} توّا.",
  toCardNone: "النقاط يوليو تامبونات على كارط {goal}. حتى حريف ما عندو كارط كاملة توّا.",
  toCardOrders: "الطلبات اللي تستنّى ({orders}) يقعدو: تسلّمهم في الكاسة كيف يجي الحريف، والكارط متاعو تقلّو.",
  confirm: "إيه، بدّل",
  cancel: "لا",
  switched: "تبدّل.",
  err: "ما تعدّاتش، عاود.",
  retry: "عاود",
  errNotAllowed: "الماغازة في Pointili Pro برك.",
  errNoCard: "اعمل الكارط متاعك قبل.",
  wheelGo: "حطّ كادوات الروليت",
  // the owner's staff phones
  staffTitle: "تليفونات الخدّامة",
  staffHint: "كل خدّام عندو تليفونو: يعطي التامبونات ويسلّم الكادوات، وما يشوفش الإعدادات ولا ليستة الحرفاء.",
  staffOf: "{n} من {max}",
  staffNone: "حتى خدّام مازال.",
  // what each phone did, under its name: the tampons by number and the gifts (a scan of the code is the customer's own doing)
  staffToday: "اليوم: {what}",
  staffWeek: "7 أيّام: {what}",
  staffByNumber: "{n} بالنومرو",
  staffBack: "رجّع {n}",
  staffNothing: "ما عطى شي بيدّو",
  staffDidHint: "تحت كل إسم: اللي عطاه بيدّو — التامبونات بالنومرو والكادوات. اللي يسكانيو الكود ما يتحسبوش هنا.",
  staffInvitesOne: "رابط واحد بعثتو مازال ما تستعملش",
  staffInvitesMany: "{n} روابط بعثتهم مازالو ما تستعملوش",
  staffInvitesCancel: "بطّلهم",
  staffInvitesGone: "الروابط تبطّلو: حتى واحد ما ينجم يدخل بيهم.",
  staffAdd: "زيد خدّام",
  staffLink: "ابعثلو الرابط هذا: يحلّو في تليفونو ويدخل بالنومرو متاعو. الرابط يخدم مرّة وحدة، 24 ساعة.",
  staffShare: "ابعثو في الواتساب",
  staffMsg: "سلام، هذا الرابط باش تولّي تعطي التامبونات في «{shop}» من تليفونك (Pointili): {url}",
  staffCopy: "انسخ",
  staffCopied: "تنسخ",
  staffRemove: "نحّي",
  staffRemoveAsk: "تنحّي {name}؟ التليفون متاعو ما عادش يعطي تامبونات.",
  staffFull: "وصلت للعدد الأقصى.",
  staffNotPro: "تليفونات الخدّامة في Pointili Pro برك.",
  // the staff phone
  staffHome: "الكونتور",
  staffAt: "تخدم في «{shop}»",
  staffAtShort: "تخدم في",
  staffGive: "عطي تامبون",
  staffLeave: "نخرج من المحل هذا",
  staffLeaveAsk: "تخرج؟ ما عادش تنجم تعطي تامبونات في «{shop}».",
  staffGone: "ما عادش تخدم في حتى محل. صاحب المحل ينجم يبعثلك رابط جديد.",
  joinTitle: "تولّي خدّام في «{shop}»",
  joinOk: "مرحبا! توّا تنجم تعطي التامبونات في «{shop}».",
  joinGuest: "باش تولّي خدّام، ادخل بالكونت متاعك — ولا اعمل كونت جديد بالنومرو متاعك. الرابط يرجعك هنا.",
  joinLogin: "عندي كونت: ندخل",
  joinSignup: "أوّل مرّة: نعمل كونت",
  joinErr: {
    invalid: "الرابط هذا غالط.",
    used: "الرابط هذا تستعمل. اطلب من صاحب المحل رابط جديد.",
    expired: "الرابط هذا فات وقتو. اطلب من صاحب المحل رابط جديد.",
    owner: "إنت صاحب محل: ما تنجمش تولّي خدّام في محل آخر بنفس الكونت.",
    elsewhere: "إنت خدّام في محل آخر. اخرج منو قبل.",
    full: "المحل وصل للعدد الأقصى متاع الخدّامة.",
  } as Record<string, string>,
  walletStaff: "إنت تخدم في «{shop}»",
  walletStaffGo: "حلّ الكونتور",
  // the console
  aPack: "الباقة",
  aPackOld: "قديم (كيف ما هو)",
  aPackLine: {
    old: "محل قديم: كل شي كيف ما خلّيتو، بالسوم متاعو.",
    base: "Pointili: الكارط (كادو ولا روليت) والرابط.",
    pro: "Pointili Pro: + التذكرة الذهبية، الماغازة، تحميل البيانات و3 تليفونات خدّامة.",
  } as Record<Pack, string>,
  aPackAsk: "تبدّل الباقة لـ{pack}؟",
  aPackChanges: {
    wheel_on: "الروليت تولّي مسموحة",
    links_on: "التامبون برابط يرجع",
    draw_on: "التذكرة الذهبية تتحلّ",
    draw_off: "التذكرة الذهبية تتنحّى",
    draw_cancelled: "السحب اللي يستنّى يتبطّل",
    store_on: "الماغازة تولّي اختيار لمولى المحل",
    store_off: "الماغازة ما عادش اختيار",
    export_on: "تحميل البيانات يتحلّ",
    export_off: "تحميل البيانات يتنحّى",
    staff_on: "3 تليفونات خدّامة",
    staff_off: "تليفونات الخدّامة تتنحّى",
    staff_signed_out: "الخدّامة يخرجو",
  } as Record<string, string>,
  aPackNothing: "ما يتبدّل حتى شي، كان الإسم.",
  aPackStoreOn: "المحل على الماغازة: رجّعو للكارط قبل.",
};
