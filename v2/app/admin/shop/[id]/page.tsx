import type { ReactNode } from "react";
import Link from "next/link";
import { notFound } from "next/navigation";
import { AlertTriangle, ArrowRight, Check, Gift, History, MessageCircle, Moon, Phone, Smartphone, Stamp, X } from "lucide-react";
import { Face, ShopNote, ShopReading, ShopStage } from "@/components/AdminBoard";
import { AdminShopMore } from "@/components/AdminShopMore";
import { PILL, readShop, STAGE_LOOK, stageOf, standing, type AccessShop } from "@/lib/board";
import { digits, spaced } from "@/lib/phone";
import { FAILS, screenName } from "@/lib/screens";
import { call } from "@/lib/supabase";
import { agoSaid, counted, daysN, hoursN, monthsSaid, stampsN, t } from "@/lib/t";

export const metadata = { title: "المحل" };

type Study = {
  shop: {
    id: string; name: string; kind: string; color: string; logo: string | null; goal: number | null; gift: string | null; stamp_gap: number; stamp_logo: boolean;
    paused: boolean; created_at: string; items_on: boolean; store_on: boolean; wheel_on: boolean; wheel_allowed: boolean;
    paid_until: string | null; paid: boolean; trial_end: string; started: boolean; shut: boolean; offer_at: string | null;
  };
  owner: { id: string; name: string | null; phone: string | null; created_at: string };
  origin: { at: string; source: string | null; medium: string | null; campaign: string | null; content: string | null; landing: string | null; referrer: string | null; device: string | null; os: string | null; browser: string | null; city: string | null; fbclid: boolean } | null;
  numbers: { customers: number; real: number; stamps: number; week: number; returning: number; given: number; waiting: number; visits: number; days: number; ms: number };
  days: { day: string; stamps: number; visits: number; ms: number }[];
  hours: number[];
  screens: { route: string; screen: string | null; ms: number; n: number }[];
  counter: { used: number; held: number; back: number; refused: number; why: Record<string, number> };
  seen_at: string | null;
  last_at: string | null;
  /** among all the real shops: how many it does better than, by customers and by tampons */
  rank: { shops: number; customers: number; stamps: number } | null;
  steps: Record<string, string | null>;
  did: Record<string, { n: number; last: string }>;
  errors: { at: string; detail: string | null }[];
  visits: { id: string; at: string; end: string; device: string | null; os: string | null; browser: string | null; city: string | null; source: string | null; app: boolean; ms: number; stamps: number; screens: { route: string; screen: string | null; ms: number }[] }[];
  customers: { name: string | null; tail: string; stamps: number; on: number; goal: number | null; gifts: number; days: number; first: string | null; last: string | null; late: boolean }[];
  items: { name: string; gone: boolean; n: number }[];
  plan: { kind: string; months: number | null; until: string | null; amount: number | null; method: string | null; at: string }[];
  devices: { since: string; last_at: string | null; device: string | null; os: string | null; browser: string | null; city: string | null; app: boolean | null; here: boolean | null }[];
  /** the founder's own: his line, where he is with the shop and since when, the stages it went through (newest first) */
  note: string;
  stage: string;
  stage_at: string | null;
  follow: { stage: string; at: string }[];
  /** the board's two signs: the pay page opened last, a call or a WhatsApp to pay tapped last */
  pay_seen: string | null;
  wa_at: string | null;
};

const TZ = "Africa/Tunis";
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "short", day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
const dayOf = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(`${iso}T12:00:00`));
const dateOf = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
const hourOf = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso)));
/** «5 دقايق», «زوز سوايع» — a length of time in the app */
const howLong = (ms: number) => {
  const m = Math.round(ms / 60_000);
  if (m < 1) return `${Math.max(1, Math.round(ms / 1000))} ثانية`;
  return m < 60 ? counted(m, "دقيقة", "زوز دقايق", "دقايق", "دقيقة") : hoursN(Math.round(m / 60));
};
/** «بعد 3 سوايع»: how long after the account was made */
const afterSaid = (ms: number) => {
  const m = Math.max(0, Math.round(ms / 60_000));
  if (m < 60) return `بعد ${counted(Math.max(1, m), "دقيقة", "زوز دقايق", "دقايق", "دقيقة")}`;
  const h = Math.round(m / 60);
  return h < 24 ? `بعد ${hoursN(h)}` : `بعد ${daysN(Math.round(h / 24))}`;
};
const gapSaid = (min: number) => (min === 0 ? "بلا وقت بين تامبون وتامبون" : min === 1440 ? "تامبون واحد في النهار" : min < 60 ? `كل ${counted(min, "دقيقة", "زوز دقايق", "دقايق", "دقيقة")}` : `كل ${hoursN(Math.round(min / 60))}`);
const timesN = (n: number) => counted(n, "مرّة", "مرّتين", "مرّات", "مرّة");
const customersN = (n: number) => counted(n, "حريف واحد", "زوز حرفاء", "حرفاء", "حريف");
/** where a visit came from, in the founder's words */
const SOURCES: Record<string, string> = { direct: "مباشرة", facebook: "فيسبوك", fb: "فيسبوك", ig: "إنستغرام", instagram: "إنستغرام", google: "Google", whatsapp: "واتساب", tiktok: "تيك توك" };
const sourceSaid = (s: string) => SOURCES[s.toLowerCase()] ?? s;

/** the steps from the sign-up to paying, in their order */
const STEPS: [string, string][] = [
  ["account", "عمل الكونت"],
  ["shop", "حلّ المحل"],
  ["counter", "حلّ الكود (الكونتور)"],
  ["first", "أوّل حريف"],
  ["first_real", "أوّل حريف بعد الساعة الأولى"],
  ["fifth", "5 حرفاء"],
  ["gift", "أوّل كادو تعطى"],
  ["app", "حطّ الأبليكاسيون"],
  ["offer", "شاف السوم"],
  ["pay", "حلّ صفحة الخلاص"],
  ["asked", "حاول يكلّمنا باش يخلّص"],
  ["paid", "خلّص"],
];
/** what the owner did in the app, by the signal that says it */
const DID: [string, string][] = [
  ["collect", "زاد تامبون بكود الحريف"],
  ["customer_open", "حلّ حريف"],
  ["recent_open", "حلّ آخر الحركات"],
  ["gift_code", "سكاني كود كادو"],
  ["my_code", "حلّ الكود متاعو"],
  ["pwa_installed", "حطّ الأبليكاسيون"],
  ["pwa_open", "حلّ الأبليكاسيون من التليفون"],
  ["logo", "حطّ اللوغو"],
  ["tryit", "جرّب الديمو"],
  ["clip", "تفرّج في الفيديوات القصار"],
  ["video", "تفرّج في فيديو"],
  ["help_open", "حلّ المساعدة"],
  ["offer", "شاف العرض"],
  ["push", "سألناه على الإشعارات"],
  ["pay", "نزل على طريقة خلاص"],
  ["trial_call", "نزل على «كلّمنا»"],
  ["news", "شاف خبر"],
  ["form_error", "غلطات في الفورمات"],
];

/** A part of the page: its title, a few words, what is in it. */
function Part({ title, hint, className = "", children }: { title: string; hint?: ReactNode; className?: string; children: ReactNode }) {
  return (
    <section className={`rounded-[1.125rem] bg-surface p-4 shadow-card ring-1 ring-line/70 lg:p-5 ${className}`}>
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-0.5">
        <h2 className="text-[1rem] font-bold text-ink">{title}</h2>
        {hint && <p className="text-[0.75rem] text-muted">{hint}</p>}
      </div>
      <div className="mt-3">{children}</div>
    </section>
  );
}

/** One number with its name, and a word under it. */
function Kpi({ n, label, sub, tone = "ink" }: { n: ReactNode; label: string; sub?: ReactNode; tone?: "ink" | "mint" | "coral" | "brand" | "faint" }) {
  const color = { ink: "text-ink", mint: "text-mint", coral: "text-coral", brand: "text-brand", faint: "text-faint" }[tone];
  return (
    <div className="rounded-[1rem] bg-surface px-4 py-3 shadow-card ring-1 ring-line/70">
      <span className="block text-[0.75rem] font-semibold text-muted">{label}</span>
      <b className={`${typeof n === "number" ? "num " : ""}mt-1 block text-[1.625rem] leading-tight ${color}`}>{n}</b>
      {sub && <span className="mt-0.5 block truncate text-[0.75rem] text-muted">{sub}</span>}
    </div>
  );
}

/** One fact for judging the shop: good (a tick), bad (a cross), or a word of warning. */
function Fact({ good, warn, label, value }: { good?: boolean; warn?: boolean; label: string; value?: ReactNode }) {
  const tone = warn ? "bg-[#FFF4D6] text-[#8A6508]" : good ? "bg-mint-soft text-mint" : "bg-coral-soft text-coral";
  return (
    <li className="flex items-start gap-2.5 py-2">
      <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${tone}`}>{warn ? <AlertTriangle className="size-3" strokeWidth={3} /> : good ? <Check className="size-3" strokeWidth={3} /> : <X className="size-3" strokeWidth={3} />}</span>
      <span className="min-w-0 flex-1 text-[0.875rem] leading-snug text-ink">{label}</span>
      {value && <span className="shrink-0 text-[0.8125rem] font-semibold text-muted">{value}</span>}
    </li>
  );
}

/**
 * One shop, studied (the founder, 23 Oct 2026: «a detailed page with all the
 * data to study the client», then «more useful to understand how to judge,
 * more visual, more organised — it is used on the PC: see the maximum»).
 * On a computer, a board of parts side by side: who and where from, what to
 * judge him by, the numbers, the last 30 days (his customers' tampons above,
 * his own time in the app below), the steps from the sign-up to paying, the
 * hours his counter works, the counter's codes, his customers, the screens he
 * spends his time on, his visits screen by screen, what he did, his card,
 * what is done to the shop, and the phones signed in. On a phone the same
 * parts, one under the other. One call to the database (admin_study).
 */
export default async function StudyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const st = await call<Study | null>("admin_study", { p_id: id });
  if (!st) notFound();
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const now = Date.now();
  const { shop, owner, numbers: n } = st;
  const ago = (iso: string) => agoSaid(now - Date.parse(iso));
  const d = digits(owner.phone ?? "");
  const phone = /^\d{8}$/.test(d) ? d : null;
  const pill = standing({ ...shop, card: shop.goal !== null }, now);
  // the same reading as the board's line, from this page's numbers (its last 14 days for the board's spark)
  const reading = readShop(
    {
      ...shop,
      card: shop.goal !== null,
      stamps: n.stamps,
      today: st.days.at(-1)?.stamps ?? 0,
      week: n.week,
      customers: n.customers,
      real: n.real,
      returning: n.returning,
      last_at: st.last_at,
      spark: st.days.slice(-14).map((x) => x.stamps),
      seen_at: st.seen_at,
      pay_seen: st.pay_seen,
      wa_at: st.wa_at,
      stage: st.stage,
      stage_at: st.stage_at,
    },
    now,
  );
  const access: AccessShop = { id: shop.id, name: shop.name, owner: { name: owner.name, phone: owner.phone }, paid: shop.paid, paid_until: shop.paid_until, shut: shop.shut, started: shop.started, trial_end: shop.trial_end };
  const night = (() => {
    const h = hourOf(shop.created_at);
    return h >= 19 || h < 8;
  })();
  const o = st.origin;
  const from = o ? (o.campaign ? `إشهار · ${o.campaign}${o.content ? ` · ${o.content}` : ""}` : o.source && o.source !== "direct" ? sourceSaid(o.source) : o.fbclid ? "فيسبوك" : "دخل مباشرة") : null;
  const born = Date.parse(owner.created_at);
  const did = DID.filter(([k]) => st.did[k]);
  const lastMove = [st.seen_at, st.last_at].filter((x): x is string => !!x).sort().pop() ?? null;
  const backPct = n.customers ? Math.round((n.returning / n.customers) * 100) : 0;
  const errors = st.did.form_error?.n ?? 0;
  // better than how many of the real shops, in hundreds
  const better = (k: "customers" | "stamps") => (st.rank && st.rank.shops > 1 ? Math.round((st.rank[k] / st.rank.shops) * 100) : null);
  const betterCustomers = better("customers");
  const betterStamps = better("stamps");

  // the 30 days: his customers' tampons above the line, his own minutes in the app under it
  const maxStamps = Math.max(1, ...st.days.map((x) => x.stamps));
  const maxMs = Math.max(1, ...st.days.map((x) => x.ms));
  const monthStamps = st.days.reduce((a, x) => a + x.stamps, 0);
  const monthDays = st.days.filter((x) => x.visits > 0).length;
  const hourMax = Math.max(1, ...st.hours);
  const allHours = st.hours.reduce((a, b) => a + b, 0);
  const dayShare = allHours ? Math.round((st.hours.slice(8, 22).reduce((a, b) => a + b, 0) / allHours) * 100) : 0;
  const screenMax = Math.max(1, ...st.screens.map((x) => x.ms));

  return (
    <div className="space-y-4">
      <Link href="/admin" className="inline-flex items-center gap-1 text-[0.875rem] font-semibold text-muted hover:text-ink">
        <ArrowRight className="size-4" /> المحلات
      </Link>

      <div className="grid grid-cols-1 gap-4 lg:grid-cols-12">
        {/* ── who, where it stands, where the owner came from ── */}
        <section className="rounded-[1.125rem] bg-surface p-4 shadow-card ring-1 ring-line/70 lg:col-span-8 lg:p-5">
          <div className="flex items-start gap-3">
            <Face s={shop} />
            <div className="min-w-0 flex-1">
              <div className="flex flex-wrap items-center gap-x-2 gap-y-1">
                <h1 className="min-w-0 text-[1.375rem] font-bold leading-snug text-ink">
                  <bdi>{shop.name}</bdi>
                </h1>
                <span className={`shrink-0 rounded-full px-2.5 py-0.5 text-[0.8125rem] font-semibold ${PILL[pill.tone]}`}>{pill.say}</span>
              </div>
              <p className="mt-0.5 text-[0.9375rem] text-body">
                <bdi>{owner.name || "بلا اسم"}</bdi> · {t.kinds[shop.kind] ?? shop.kind}
              </p>
              {/* what the numbers say about him, and what to do now (the board's line says the same) */}
              <ShopReading r={reading} className="mt-3" />
            </div>
            {phone && (
              <div className="hidden shrink-0 gap-2 sm:flex">
                <a href={`tel:+216${phone}`} aria-label={`عيّط ${spaced(phone)}`} className="press flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-brand-soft px-3.5 text-[0.9375rem] font-bold text-brand">
                  <Phone className="size-4" />
                  <bdi dir="ltr" className="num">
                    {spaced(phone)}
                  </bdi>
                </a>
                <a href={`https://wa.me/216${phone}`} target="_blank" rel="noreferrer" className="press flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-[#25D366]/15 px-3.5 text-[0.9375rem] font-bold text-[#128C4B]">
                  <MessageCircle className="size-4" /> واتساب
                </a>
              </div>
            )}
          </div>
          <dl className="mt-4 grid gap-x-6 gap-y-2 text-[0.8438rem] sm:grid-cols-2">
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 font-semibold text-muted">تحلّ</dt>
              <dd className="min-w-0 text-ink">
                {when(shop.created_at)} · {ago(shop.created_at)}
                {night && (
                  <span className="ms-1.5 inline-flex items-center gap-0.5 text-muted">
                    <Moon className="size-3.5" /> في الليل
                  </span>
                )}
              </dd>
            </div>
            <div className="flex gap-2">
              <dt className="w-16 shrink-0 font-semibold text-muted">آخر حركة</dt>
              <dd className="text-ink">{lastMove ? ago(lastMove) : "—"}</dd>
            </div>
            {from && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold text-muted">جا من</dt>
                <dd className="min-w-0 text-ink">
                  <bdi>{from}</bdi>
                </dd>
              </div>
            )}
            {o && (o.os || o.browser) && (
              <div className="flex gap-2">
                <dt className="w-16 shrink-0 font-semibold text-muted">تليفونو</dt>
                <dd className="min-w-0 text-ink">
                  <bdi>{[o.os, o.browser, o.city].filter(Boolean).join(" · ")}</bdi>
                </dd>
              </div>
            )}
          </dl>
          {phone && (
            <div className="mt-3 grid grid-cols-2 gap-2 sm:hidden">
              <a href={`tel:+216${phone}`} aria-label={`عيّط ${spaced(phone)}`} className="press flex h-11 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand-soft text-[0.9375rem] font-bold text-brand">
                <Phone className="size-4" />
                <bdi dir="ltr" className="num">
                  {spaced(phone)}
                </bdi>
              </a>
              <a href={`https://wa.me/216${phone}`} target="_blank" rel="noreferrer" className="press flex h-11 items-center justify-center gap-1.5 rounded-[0.75rem] bg-[#25D366]/15 text-[0.9375rem] font-bold text-[#128C4B]">
                <MessageCircle className="size-4" /> واتساب
              </a>
            </div>
          )}
          {/* the founder's own: where he is with the shop, his line about it, and the stages it went through, oldest first */}
          <div className="mt-3 flex flex-wrap items-start gap-2">
            <ShopStage id={shop.id} stage={st.stage} at={st.stage_at} now={now} refresh />
            <ShopNote id={shop.id} note={st.note} className="min-w-[8.5rem] flex-1" />
          </div>
          {st.follow.length > 0 && (
            <div className="mt-2 flex items-start gap-1.5 text-[0.75rem] text-muted">
              <History className="mt-px size-3.5 shrink-0 text-faint" aria-hidden />
              <ol aria-label="المراحل اللي فات بيها" className="flex flex-wrap items-center gap-x-1.5 gap-y-1">
                {[...st.follow].reverse().map((f, i) => {
                  const x = stageOf(f.stage);
                  return (
                    <li key={`${f.at}-${i}`} title={when(f.at)} className="inline-flex items-center gap-1">
                      {i > 0 && <span className="text-faint">←</span>}
                      <span className={`size-1.5 rounded-full ${STAGE_LOOK[x.tone].dot}`} />
                      <span className="font-semibold text-body">{x.label}</span>
                      <span>· {ago(f.at)}</span>
                    </li>
                  );
                })}
              </ol>
            </div>
          )}
        </section>

        {/* ── what to judge him by: facts, each good or not ── */}
        <Part title="باش تحكم عليه" hint="الحاجات اللي تقول يخدم بيها بالحق ولا لا" className="lg:col-span-4 lg:row-span-2">
          <ul className="divide-y divide-line/70">
            {betterCustomers !== null && n.customers > 0 && <Fact good={betterCustomers >= 50} label="بالحرفاء، مقارنة بالمحلات الكل" value={`أحسن من ${betterCustomers}%`} />}
            {n.real ? (
              <Fact good label="يخدم بيها مع حرفاء حقيقيين" value={customersN(n.real)} />
            ) : n.customers ? (
              <Fact label="كان تجارب في الساعة الأولى، حتى حريف حقيقي" value={customersN(n.customers)} />
            ) : (
              <Fact label="حتى حريف مازال" />
            )}
            {n.customers > 0 && <Fact good={n.returning > 0} label={n.returning ? "الحرفاء يرجعولو نهار آخر" : "حتى حريف ما رجعلو"} value={n.returning ? `${n.returning} · ${backPct}%` : null} />}
            <Fact good={n.week > 0} label={n.week ? "خدم بيها هالجمعة" : "حتى تامبون هالجمعة"} value={n.week ? stampsN(n.week) : null} />
            <Fact good={n.days >= 2} label={n.days >= 2 ? "يرجع للأبليكاسيون" : "ما رجعش للأبليكاسيون من نهار حلّ"} value={n.days >= 2 ? `في ${daysN(n.days)}` : null} />
            <Fact good={!!st.steps.app} label={st.steps.app ? "حطّ Pointili في التليفون" : "ما حطّش الأبليكاسيون"} />
            {allHours > 0 && <Fact good={dayShare >= 70} label="التامبونات في وقت الخدمة (8 الصباح – 10 الليل)" value={`${dayShare}%`} />}
            <Fact good={!!shop.logo} label={shop.logo ? "حطّ اللوغو متاعو" : "بلا لوغو"} />
            <Fact good={!!st.steps.pay} label={st.steps.pay ? "حلّ صفحة الخلاص" : "ما حلّش صفحة الخلاص"} value={st.steps.pay ? ago(st.steps.pay) : null} />
            <Fact good={!!st.steps.asked} label={st.steps.asked ? "حاول يكلّمنا باش يخلّص" : "ما حاولش يكلّمنا"} value={st.steps.asked ? ago(st.steps.asked) : null} />
            {errors > 0 && <Fact warn label="تعثّر في الفورمات" value={timesN(errors)} />}
            <Fact good={shop.paid} warn={!shop.paid && !shop.shut} label={shop.paid && shop.paid_until ? `خالص حتى ${dateOf(shop.paid_until)}` : shop.shut ? `التجربة وفات ${dateOf(shop.trial_end)}` : shop.started ? `التجربة توفى ${dateOf(shop.trial_end)}` : "التجربة تبدا مع أوّل حريف"} />
          </ul>
        </Part>

        {/* ── the numbers ── */}
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-4 lg:col-span-8">
          <Kpi n={n.real} label="حرفاء حقيقيين" sub={[n.customers > n.real ? `+${n.customers - n.real} تجربة` : null, betterCustomers !== null && n.customers ? `أحسن من ${betterCustomers}% من المحلات` : null].filter(Boolean).join(" · ") || "مازال"} tone={n.real ? "ink" : "faint"} />
          <Kpi n={n.stamps} label="تامبونات" sub={[`${n.week} هالجمعة`, betterStamps !== null && n.stamps ? `أحسن من ${betterStamps}%` : null].filter(Boolean).join(" · ")} tone={n.stamps ? "ink" : "faint"} />
          <Kpi n={n.returning} label="رجعو نهار آخر" sub={n.customers ? `${backPct}% من الحرفاء` : "—"} tone={n.returning ? "mint" : "faint"} />
          <Kpi n={n.given} label="كادوات تعطاو" sub={n.waiting ? `${n.waiting} يستنّاو` : "حتى كادو يستنّى"} tone={n.given ? "ink" : "faint"} />
          <Kpi n={n.days} label="نهارات جا" sub={timesN(n.visits)} tone={n.days >= 2 ? "ink" : "faint"} />
          <Kpi n={n.ms ? howLong(n.ms) : "—"} label="في الأبليكاسيون" sub={n.visits ? `${howLong(n.ms / n.visits)} المرّة` : "—"} />
          <Kpi n={st.last_at ? ago(st.last_at) : "—"} label="آخر تامبون" tone={st.last_at ? "ink" : "faint"} />
          <Kpi n={st.seen_at ? ago(st.seen_at) : "—"} label="آخر مرّة دخل" tone={st.seen_at ? "ink" : "faint"} />
        </div>

        {/* ── the last 30 days ── */}
        <Part title="آخر 30 يوم" hint={`${stampsN(monthStamps)} · جا في ${daysN(monthDays)}`} className="lg:col-span-8">
          <div dir="ltr" className="relative">
            <div role="img" aria-label={`${stampsN(monthStamps)} في 30 يوم`} className="flex h-32 items-end gap-[3px] border-b border-line">
              {st.days.map((x, i) => (
                <span key={x.day} title={`${dayOf(x.day)}: ${stampsN(x.stamps)}`} className={`flex-1 rounded-t-[3px] ${x.stamps ? (i === st.days.length - 1 ? "bg-brand" : "bg-brand/50") : ""}`} style={{ height: x.stamps ? `${Math.max(6, (x.stamps / maxStamps) * 100)}%` : 0 }} />
              ))}
            </div>
            <div aria-hidden className="flex h-14 items-start gap-[3px]">
              {st.days.map((x) => (
                <span key={x.day} title={`${dayOf(x.day)}: ${x.ms ? howLong(x.ms) : "ما دخلش"}`} className={`flex-1 rounded-b-[3px] ${x.ms ? "bg-mint/60" : ""}`} style={{ height: x.ms ? `${Math.max(8, (x.ms / maxMs) * 100)}%` : 0 }} />
              ))}
            </div>
            <div aria-hidden className="relative mt-1 h-4 text-[0.625rem] text-faint">
              {st.days.map((x, i) =>
                i % 5 === 4 ? (
                  <span key={x.day} dir="rtl" className="absolute top-0 whitespace-nowrap" style={i === st.days.length - 1 ? { right: 0 } : { left: `${((i + 0.5) / st.days.length) * 100}%`, transform: "translateX(-50%)" }}>
                    {i === st.days.length - 1 ? "اليوم" : dayOf(x.day)}
                  </span>
                ) : null,
              )}
            </div>
          </div>
          <p className="mt-2 flex flex-wrap gap-x-4 gap-y-1 text-[0.75rem] text-muted">
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-brand/50" /> فوق: تامبونات الحرفاء
            </span>
            <span className="inline-flex items-center gap-1.5">
              <span className="size-2.5 rounded-sm bg-mint/60" /> لوطا: الوقت متاعو في الأبليكاسيون
            </span>
          </p>
        </Part>

        {/* ── the steps, from the account to paying ── */}
        <Part title="الطريق متاعو" hint="كل خطوة، بعد قدّاش من التسجيل" className="lg:col-span-4 lg:row-span-2">
          <ol>
            {STEPS.map(([k, label], i) => {
              const at = st.steps[k];
              return (
                <li key={k} className="relative flex gap-3 pb-2.5 last:pb-0">
                  {i < STEPS.length - 1 && <span className={`absolute start-[0.4375rem] top-4 h-full w-px ${at && st.steps[STEPS[i + 1][0]] ? "bg-brand/40" : "bg-line"}`} aria-hidden />}
                  <span className={`relative mt-1 size-[0.875rem] shrink-0 rounded-full ${at ? "bg-brand" : "border-2 border-line bg-surface"}`} aria-hidden />
                  <span className="flex min-w-0 flex-1 flex-wrap items-baseline justify-between gap-x-2">
                    <span className={`text-[0.875rem] font-semibold ${at ? "text-ink" : "text-faint"}`}>{label}</span>
                    <span className="text-[0.75rem] text-muted" title={at ? when(at) : undefined}>
                      {at ? (k === "account" ? when(at) : afterSaid(Date.parse(at) - born)) : "مازال"}
                    </span>
                  </span>
                </li>
              );
            })}
          </ol>
        </Part>

        {/* ── the hours his counter works, and the counter's codes ── */}
        <div className="grid gap-4 md:grid-cols-2 lg:col-span-8">
          <Part title="وقتاش يعطي التامبونات" hint={allHours ? "حسب الساعة، الكل" : "حتى تامبون"}>
            <div dir="ltr" role="img" aria-label="التامبونات حسب الساعة" className="flex h-20 items-end gap-[2px] border-b border-line">
              {st.hours.map((c, h) => (
                <span key={h} title={`${h}:00 · ${stampsN(c)}`} className={`flex-1 rounded-t-[2px] ${c ? (h >= 8 && h < 22 ? "bg-brand/55" : "bg-coral/60") : ""}`} style={{ height: c ? `${Math.max(8, (c / hourMax) * 100)}%` : 0 }} />
              ))}
            </div>
            <div dir="ltr" aria-hidden className="num mt-1 flex justify-between text-[0.625rem] text-faint">
              <span>0h</span>
              <span>6h</span>
              <span>12h</span>
              <span>18h</span>
              <span>23h</span>
            </div>
            <p className="mt-2 text-[0.75rem] text-muted">
              <span className="me-1 inline-block size-2.5 rounded-sm bg-coral/60 align-middle" /> في الليل (قبل 8 الصباح ولا بعد 10 الليل)
            </p>
          </Part>
          <Part title="الكونتور" hint="الكودات اللي سكانيوهم الحرفاء">
            <div className="grid grid-cols-2 gap-2">
              {[
                { n: st.counter.used, label: "تسكانا", tone: "text-ink" },
                { n: st.counter.held, label: "سكانا بلا كونت", tone: "text-ink" },
                { n: st.counter.back, label: "عطاه بيدو", tone: "text-ink" },
                { n: st.counter.refused, label: "ترفض", tone: st.counter.refused ? "text-coral" : "text-ink" },
              ].map((x) => (
                <div key={x.label} className="rounded-[0.75rem] bg-canvas/70 px-3 py-2">
                  <b className={`num block text-[1.25rem] leading-tight ${x.tone}`}>{x.n}</b>
                  <span className="text-[0.75rem] font-semibold text-muted">{x.label}</span>
                </div>
              ))}
            </div>
            {Object.keys(st.counter.why).length > 0 && (
              <p className="mt-2 flex flex-wrap gap-1.5">
                {Object.entries(st.counter.why).map(([w, c]) => (
                  <span key={w} className="rounded-full bg-coral-soft px-2 py-0.5 text-[0.75rem] font-semibold text-coral">
                    {FAILS[w] ?? w} · <span className="num">{c}</span>
                  </span>
                ))}
              </p>
            )}
          </Part>
        </div>

        {/* ── his customers ── */}
        <Part title="الحرفاء" hint={st.customers.length ? `${customersN(st.customers.length)} · آخر من جا الفوق` : "مازال حتى حريف"} className="lg:col-span-7">
          {st.customers.length > 0 && (
            <div data-list className="-mx-1 overflow-x-auto">
              <table className="w-full min-w-[30rem] text-[0.8125rem]">
                <thead>
                  <tr className="border-b border-line text-[0.75rem] text-muted">
                    <th className="px-1 py-1.5 text-start font-semibold">الحريف</th>
                    <th className="px-1 py-1.5 text-start font-semibold">التامبونات</th>
                    <th className="px-1 py-1.5 text-start font-semibold">الكارط</th>
                    <th className="px-1 py-1.5 text-start font-semibold">جا</th>
                    <th className="px-1 py-1.5 text-start font-semibold">آخر مرّة</th>
                  </tr>
                </thead>
                <tbody>
                  {st.customers.map((c, i) => (
                    <tr key={i} className="border-b border-line/60 last:border-b-0">
                      <td className="px-1 py-1.5">
                        <span className="font-semibold text-ink">
                          <bdi>{c.name ?? "بلا اسم"}</bdi>
                        </span>{" "}
                        <span className="num text-[0.75rem] text-faint" dir="ltr">
                          ··{c.tail}
                        </span>
                        {!c.late && <span className="ms-1.5 rounded-full bg-canvas px-1.5 text-[0.6875rem] font-semibold text-muted ring-1 ring-line">تجربة</span>}
                      </td>
                      <td className="num px-1 py-1.5 text-ink">
                        {c.stamps}
                        {c.gifts > 0 && (
                          <span className="ms-1.5 inline-flex items-center gap-0.5 text-coral">
                            <Gift className="size-3" /> {c.gifts}
                          </span>
                        )}
                      </td>
                      <td className="px-1 py-1.5">
                        {c.goal ? (
                          <span className="flex items-center gap-1.5">
                            <span className="h-1.5 w-14 overflow-hidden rounded-full bg-line">
                              <span className="block h-full rounded-full bg-brand" style={{ width: `${Math.min(100, (c.on / c.goal) * 100)}%` }} />
                            </span>
                            <span className="num text-[0.75rem] text-muted" dir="ltr">
                              {c.on}/{c.goal}
                            </span>
                          </span>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-1 py-1.5 text-body">{daysN(c.days)}</td>
                      <td className="px-1 py-1.5 text-muted">{c.last ? ago(c.last) : "—"}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Part>

        {/* ── the screens he spends his time on ── */}
        <Part title="وين يقعد في الأبليكاسيون" hint={st.screens.length ? "الصفحات حسب الوقت" : "حتى صفحة"} className="lg:col-span-5">
          <ul className="space-y-1.5">
            {st.screens.map((x, i) => (
              <li key={i} className="text-[0.8125rem]">
                <span className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-ink">
                    <bdi>{screenName(x.route, x.screen)}</bdi>
                  </span>
                  <span className="shrink-0 text-[0.75rem] text-muted">
                    {howLong(x.ms)} · {timesN(x.n)}
                  </span>
                </span>
                <span className="mt-0.5 block h-1.5 overflow-hidden rounded-full bg-canvas">
                  <span className="block h-full rounded-full bg-brand/55" style={{ width: `${Math.max(2, (x.ms / screenMax) * 100)}%` }} />
                </span>
              </li>
            ))}
          </ul>
        </Part>

        {/* ── his visits, screen by screen ── */}
        <Part title="كل مرّة دخل" hint={st.visits.length ? `آخر ${st.visits.length} · الصفحات بالترتيب` : "ما دخلش"} className="lg:col-span-12">
          <div data-list className="-mx-1 overflow-x-auto">
            <table className="w-full min-w-[44rem] text-[0.8125rem]">
              <thead>
                <tr className="border-b border-line text-[0.75rem] text-muted">
                  <th className="px-1 py-1.5 text-start font-semibold">وقتاش</th>
                  <th className="px-1 py-1.5 text-start font-semibold">قدّاش</th>
                  <th className="px-1 py-1.5 text-start font-semibold">منين</th>
                  <th className="px-1 py-1.5 text-start font-semibold">تامبونات</th>
                  <th className="px-1 py-1.5 text-start font-semibold">شنوّة حلّ</th>
                </tr>
              </thead>
              <tbody>
                {st.visits.map((v) => {
                  // the screens in their order, the same one twice in a row said once
                  const path = v.screens.filter((x, i, a) => i === 0 || screenName(x.route, x.screen) !== screenName(a[i - 1].route, a[i - 1].screen));
                  return (
                    <tr key={v.id} className="border-b border-line/60 align-top last:border-b-0">
                      <td className="whitespace-nowrap px-1 py-2 font-semibold text-ink">{when(v.at)}</td>
                      <td className="whitespace-nowrap px-1 py-2 text-body">{howLong(v.ms)}</td>
                      <td className="whitespace-nowrap px-1 py-2 text-muted">
                        {v.app ? (
                          <span className="inline-flex items-center gap-1 text-brand">
                            <Smartphone className="size-3.5" /> الأبليكاسيون
                          </span>
                        ) : v.source ? (
                          <bdi>{sourceSaid(v.source)}</bdi>
                        ) : (
                          "—"
                        )}
                      </td>
                      <td className="px-1 py-2">{v.stamps > 0 ? <span className="rounded-full bg-brand-soft px-2 py-0.5 text-[0.75rem] font-bold text-brand">+{v.stamps}</span> : <span className="text-faint">—</span>}</td>
                      <td className="px-1 py-2">
                        <span className="flex flex-wrap gap-1">
                          {path.slice(0, 9).map((x, i) => (
                            <span key={i} className="rounded-full bg-canvas px-2 py-0.5 text-[0.75rem] text-body ring-1 ring-line/70" title={x.ms >= 1000 ? howLong(x.ms) : undefined}>
                              <bdi>{screenName(x.route, x.screen)}</bdi>
                            </span>
                          ))}
                          {path.length > 9 && <span className="px-1 text-[0.75rem] text-faint">+{path.length - 9}</span>}
                        </span>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Part>

        {/* ── what he did in the app, and where a form stopped him ── */}
        <Part title="شنوّة عمل في الأبليكاسيون" hint={did.length ? null : "حتى حاجة مسجّلة"} className="lg:col-span-4">
          {did.length > 0 && (
            <ul className="divide-y divide-line/70">
              {did.map(([k, label]) => (
                <li key={k} className="flex items-center gap-2 py-1.5 text-[0.8125rem]">
                  <span className={`min-w-0 flex-1 ${k === "form_error" ? "text-coral" : "text-ink"}`}>{label}</span>
                  <b className="num shrink-0 text-ink">{st.did[k].n}</b>
                  <span className="w-20 shrink-0 text-end text-[0.75rem] text-muted">{ago(st.did[k].last)}</span>
                </li>
              ))}
            </ul>
          )}
          {st.errors.length > 0 && (
            <div className="mt-3 rounded-[0.875rem] bg-coral-soft/60 p-3">
              <p className="text-[0.8125rem] font-bold text-coral">وين تعثّر</p>
              <ul className="mt-1.5 space-y-1">
                {st.errors.map((e, i) => (
                  <li key={i} className="text-[0.75rem] text-body">
                    <span className="text-muted">{when(e.at)}</span> · <bdi>{e.detail ?? "—"}</bdi>
                  </li>
                ))}
              </ul>
            </div>
          )}
        </Part>

        {/* ── his card ── */}
        <Part title="الكارط" className="lg:col-span-4">
          {shop.goal ? (
            <ul className="space-y-1.5 text-[0.8438rem] text-ink">
              <li className="flex items-center gap-2">
                <Stamp className="size-4 shrink-0 text-brand" /> {stampsN(shop.goal)} ←
                <Gift className="size-4 shrink-0 text-coral" /> <bdi>{shop.gift ?? "—"}</bdi>
              </li>
              <li className="text-muted">{gapSaid(shop.stamp_gap)}</li>
              {shop.stamp_logo && <li className="text-muted">اللوغو متاعو على التامبونات</li>}
              {shop.wheel_on && <li className="text-muted">الروليت خدّامة: الحريف كي يكمّل يدوّر</li>}
              {shop.store_on && <li className="text-muted">الماغازة خدّامة</li>}
              {shop.items_on && <li className="text-muted">«شنوّة يبيع» خدّام</li>}
            </ul>
          ) : (
            <p className="text-[0.875rem] text-muted">مازال ما عملش الكارط</p>
          )}
          {st.items.length > 0 && (
            <ul className="mt-3 flex flex-wrap gap-1.5">
              {st.items.map((x, i) => (
                <li key={i} className={`rounded-full px-2.5 py-0.5 text-[0.75rem] font-semibold ring-1 ring-line ${x.gone ? "text-faint line-through" : "text-body"}`}>
                  <bdi>{x.name}</bdi> · <span className="num">{x.n}</span>
                </li>
              ))}
            </ul>
          )}
        </Part>

        {/* ── what the founder does to it: the access (and its whole story), the switches, the account ── */}
        <Part title="الأبونمان والخيارات" hint={st.plan.length ? `${st.plan.length} حركات في الأبونمان` : null} className="lg:col-span-4 lg:row-span-2">
          <AdminShopMore shop={access} now={now} bare />
          {st.plan.length > 4 && (
            <ul className="mt-3 space-y-1 text-[0.75rem] text-muted">
              {st.plan.slice(4).map((l, i) => (
                <li key={i}>
                  {when(l.at)} · {l.kind === "paid" && l.months ? `خدّمنا ${monthsSaid(l.months)}` : l.kind === "trial" ? "زدنا في التجربة" : l.kind === "end" ? "وقّفناه" : "خدّمنا"}
                  {l.amount ? ` · ${l.amount} ${t.payCurrency}` : ""}
                </li>
              ))}
            </ul>
          )}
        </Part>

        {/* ── the phones signed in to the owner's account right now ── */}
        <Part title="التليفونات اللي داخل منهم" hint={st.devices.length ? null : "حتى واحد توّا"} className="lg:col-span-8">
          {st.devices.length > 0 && (
            <ul className="grid gap-x-6 sm:grid-cols-2">
              {st.devices.map((x, i) => (
                <li key={i} className="flex items-center gap-2 border-b border-line/60 py-2 text-[0.8125rem]">
                  <Smartphone className={`size-4 shrink-0 ${x.here ? "text-mint" : "text-muted"}`} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-ink">
                      <bdi>{[x.os, x.browser, x.city].filter(Boolean).join(" · ") || "—"}</bdi>
                      {x.app && <span className="ms-1.5 text-[0.75rem] text-brand">الأبليكاسيون</span>}
                    </span>
                    <span className="block text-[0.75rem] text-muted">داخل {ago(x.since)}</span>
                  </span>
                  <span className={`shrink-0 text-[0.75rem] ${x.here ? "font-semibold text-mint" : "text-muted"}`}>{x.here ? "توّا" : x.last_at ? ago(x.last_at) : "—"}</span>
                </li>
              ))}
            </ul>
          )}
        </Part>
      </div>
    </div>
  );
}
