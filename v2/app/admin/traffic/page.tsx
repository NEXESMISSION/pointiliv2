import Link from "next/link";
import type { ReactNode } from "react";
import { ChevronLeft, ChevronRight, ExternalLink, Flame, ListFilter, MousePointerClick, TriangleAlert, X } from "lucide-react";
import { HeatMap, type HeatTap } from "@/components/HeatMap";
import { Bidi, Card, Cell, Empty, Lat, Num, Page, Pill, Row, Segments, Stat, Stats, Table, When } from "@/components/console";
import { OnlineNow, Presence, Reach } from "@/components/Presence";
import { TrafficFilters, type Menu } from "@/components/TrafficFilters";
import { pretty } from "@/lib/phone";
import { getSettings } from "@/lib/settings";
import { call } from "@/lib/supabase";

export const metadata = { title: "الترافيك" };

type Step = { step: string; visits: number };
type PageRow = { route: string; screen: string | null; views: number; visits: number; ms: number; exits: number; taps: number; rage: number };
type Who = "anon" | "acct" | "owner" | "client";
type Before = { visitors: number; visits: number; avg_ms: number; bounce: number; from_ads: number; as_app: number; accounts: number; shops: number };
type VisitRow = {
  id: string;
  started_at: string;
  source: string;
  campaign: string | null;
  device: string | null;
  os: string | null;
  browser: string | null;
  country: string | null;
  city: string | null;
  landing: string | null;
  signed: boolean;
  user_id: string | null;
  who: Who;
  back: boolean;
  signup: boolean;
  opened: boolean;
  person: string | null;
  shop_id: string | null;
  shop: string | null;
  pages: number;
  ms: number;
  taps: number;
  rage: number;
  trail: string[] | null;
};
type Traffic = {
  from: string;
  to: string;
  visitors: number;
  visits: number;
  views: number;
  avg_ms: number;
  bounce: number;
  taps: number;
  rage: number;
  from_ads: number;
  as_app: number;
  as_inapp: number;
  as_web: number;
  app_people: number;
  accounts: number;
  shops: number;
  signed: number;
  video_s: number;
  before: Before;
  signals: { name: string; detail: string | null; n: number; visits: number }[];
  days: { day: string; visits: number; accounts: number }[];
  hours: { h: number; visits: number; accounts: number }[];
  sources: { source: string; campaign: string | null; visits: number; visitors: number; pages: number; ms: number; signed: number; accounts: number; shops: number }[];
  devices: { device: string; os: string; browser: string; visits: number }[];
  places: { country: string; city: string; visits: number }[];
  pages: PageRow[];
  funnel: { owner: Step[]; customer: Step[] };
  recent: VisitRow[];
  options: Partial<Record<Key, { v: string; n: number }[]>>;
};
type Tap = { at: string; x: number; y: number; target: string | null; kind: string | null; rage: boolean; dead: boolean; external: boolean };
type VisitDetail = {
  visit: { id: string; started_at: string; last_at: string; landing: string | null; referrer: string | null; source: string | null; medium: string | null; campaign: string | null; content: string | null; term: string | null; fbclid: boolean; device: string | null; os: string | null; browser: string | null; screen: string | null; lang: string | null; country: string | null; city: string | null; user_id: string | null; is_admin: boolean; is_bot: boolean };
  visits_before: number;
  visits_after: number;
  who: { id: string; name: string | null; phone: string | null; shop: { id: string; name: string } | null } | null;
  views: { route: string; screen: string | null; path: string; entered_at: string; left_at: string | null; ms: number; vw: number | null; vh: number | null; taps: Tap[] }[];
  signals: { at: string; name: string; detail: string | null; route: string | null; screen: string | null }[];
};
type Heat = { views: number; ms: number; taps: HeatTap[]; top: { target: string; kind: string; n: number; rage: number; dead: boolean }[] };
/** A link to this page as it is, with a few things changed (null: taken off). */
type Href = (o?: Record<string, string | null | undefined>) => string;

const TZ = "Africa/Tunis";
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { timeZone: TZ, ...o });
const hm = (iso: string) => fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const hms = (iso: string) => fmt({ hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const dayHm = (iso: string) => fmt({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const weekday = (d: string) => fmt({ weekday: "short", day: "numeric" }).format(new Date(`${d}T12:00:00`));
const dayName = (d: string) => fmt({ day: "numeric", month: "short" }).format(new Date(`${d}T12:00:00`));
const two = (n: number) => String(n).padStart(2, "0");
/** when the beacon began telling the installed app from a browser (visits.standalone): 8 Oct 2026, 00:40 in Tunis */
const APP_SINCE = Date.parse("2026-10-07T23:40:00Z");
/** 45ث · 2د 10ث · 1س 5د */
function dur(ms: number): string {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}ث`;
  const m = Math.floor(s / 60);
  if (m < 60) return s % 60 ? `${m}د ${s % 60}ث` : `${m}د`;
  return `${Math.floor(m / 60)}س ${m % 60}د`;
}
const pct = (a: number, b: number) => (b ? `${Math.round((a * 100) / b)}%` : "—");
/** A length of time holds Arabic letters, so it reads right to left like the rest. */
const D = ({ ms }: { ms: number }) => <bdi className="tabular-nums">{dur(ms)}</bdi>;
/** A share inside Arabic words: kept «25%», not turned round into «%25». */
const Pct = ({ a, b }: { a: number; b: number }) => <Num>{pct(a, b)}</Num>;

/** Every page and every step inside one, by the name the founder knows it by. */
const ROUTES: Record<string, string> = {
  "/": "الصفحة الأولى",
  "/shop/new": "تسجيل محل",
  "/shop/setup": "المحل (الاسم والنوع)",
  "/shop/card": "الكارط",
  "/shop/qr": "الكود",
  "/shop": "دار المحل",
  "/shop/customers": "الحرفاء",
  "/s/[token]": "سكان",
  "/join": "تسجيل حريف",
  "/login": "الدخول",
  "/forgot": "نسيت كلمة السر",
  "/me": "الكونت",
  "/me/cards": "كارطاتي",
  "/c/[id]": "كارط حريف",
  "/scan": "السكانر",
};
const SCREENS: Record<string, string> = {
  welcome: "الصفحة الأولى",
  wallet: "كارطات الحريف",
  hello: "مرحبا",
  goal: "قدّاش من تامبون",
  wait: "كل قدّاش",
  gift: "الكادو",
  color: "اللون",
  ready: "حاضرة",
  bravo: "برافو",
  tip: "النصيحة",
  code: "الكود",
  checking: "يثبّت",
  stamped: "خذا تامبون",
  held: "بلا كونت (محجوز)",
};
const FAILS: Record<string, string> = { used: "كود مستعمل", expired: "كود فات وقتو", too_soon: "بكري برشا", done: "كمّل الكارط", own_shop: "محلّو هو", paused: "محل موقوف", network: "مشكل إنترنت", invalid: "كود غالط" };
function screenName(route: string, screen: string | null): string {
  if (route === "/" && screen) return SCREENS[screen] ?? screen;
  const base = ROUTES[route] ?? route;
  if (!screen) return base;
  if (screen.startsWith("failed:")) return `${base} · ${FAILS[screen.slice(7)] ?? screen.slice(7)}`;
  if (screen.startsWith("edit-")) return `تبديل الكارط · ${SCREENS[screen.slice(5)] ?? screen.slice(5)}`;
  return `${base} · ${SCREENS[screen] ?? screen}`;
}
/** "/shop/card:goal" → its route and its step (a step may hold a colon itself: failed:used). */
function split(key: string): [string, string | null] {
  const i = key.indexOf(":");
  return i < 0 ? [key, null] : [key.slice(0, i), key.slice(i + 1) || null];
}
const keyOf = (route: string, screen: string | null) => (screen ? `${route}:${screen}` : route);
/** The picture of a screen in public/heat: "/shop/card:goal" → shop-card-goal.webp */
const slug = (route: string, screen: string | null) =>
  keyOf(route, screen)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-|-$/g, "") || "home";

const SOURCES: Record<string, string> = { facebook: "فيسبوك", fb: "فيسبوك", instagram: "إنستغرام", ig: "إنستغرام", google: "Google", tiktok: "تيك توك", whatsapp: "واتساب", x: "X", direct: "مباشر" };
const sourceName = (s: string | null) => SOURCES[(s ?? "direct").toLowerCase()] ?? s ?? "مباشر";
const DEVICES: Record<string, string> = { phone: "تليفون", tablet: "تابلات", computer: "PC" };
const SIGNALS: Record<string, string> = {
  video: "▶ شاف فيديو",
  video_close: "▶ سكّر الفيديو",
  help_open: "؟ حلّ «عندك سؤال؟»",
  form_error: "⚠ فورم ما تعدّاش",
  gift_won: "🎁 ربح كادو",
  pwa_shown: "📲 شاف «حطّ Pointili في تليفونك»",
  pwa_click: "📲 نزل على «حطّ Pointili في تليفونك»",
  pwa_accepted: "📲 قال إيه للتنزيل",
  pwa_dismissed: "📲 قال لا للتنزيل",
  pwa_installed: "📲 Pointili تحطّت في التليفون",
  pwa_open: "📲 حلّ Pointili من الأبليكاسيون",
  pwa_out_shown: "↗ شاف «حلّ Pointili في Chrome» (في متصفّح فيسبوك)",
  pwa_out_tap: "↗ نزل على «حلّ Pointili في Chrome»",
  pwa_later: "📲 قال «موش توّا» للتنزيل",
  pwa_ios_shown: "📲 آيفون: شاف «حطّ Pointili في تليفونك»",
  pwa_ios_open: "📲 آيفون: حلّ الشرح",
  pwa_ios_done: "📲 آيفون: كمّل الشرح للآخر",
  news: "📣 شاف خبر",
  news_close: "📣 سكّر خبر",
  news_click: "📣 نزل على زرّ الخبر",
  offer: "🏷 العرض متاع 15 شهر",
  pay: "💳 اختار كيفاش يخلّص",
  plan_on: "✅ شاف إنّو الأبونمان تفعّل",
  collect: "📷 عطى تامبون بالكود متاع الحريف",
  collect_gift: "🎁 عطى كادو بالكود متاع الحريف",
  collect_unknown: "📷 كود حريف موش موجود",
  logo: "🖼 حطّ لوغو",
  logo_tip: "🖼 شاف النصيحة متاع اللوغو",
};
const signalName = (n: string) => SIGNALS[n] ?? n;

/**
 * «تليفون · Safari · Tunis» — a line joined out of Arabic and Latin pieces.
 * Unsealed, the two Latin words swap on screen; each one isolated, the line
 * reads in the order it was written.
 */
function Parts({ of }: { of: (string | null | undefined)[] }) {
  const xs = of.filter(Boolean) as string[];
  return (
    <>
      {xs.map((x, i) => (
        <span key={i}>
          {i > 0 && " · "}
          {/^[؀-ۿ]/.test(x) ? x : <Lat>{x}</Lat>}
        </span>
      ))}
    </>
  );
}

const TABS = [
  { id: "overview", label: "الخلاصة" },
  { id: "pages", label: "الصفحات" },
  { id: "sources", label: "منين جاو" },
  { id: "visits", label: "الزيارات" },
  { id: "heat", label: "الخريطة" },
];
const RANGES = [
  { d: 1, label: "24 ساعة" },
  { d: 7, label: "7 أيام" },
  { d: 30, label: "30 يوم" },
  { d: 90, label: "90 يوم" },
];
const OWNER_STEPS: Record<string, string> = { "/": "الصفحة الأولى", "/shop/new": "تسجيل محل", "/shop/setup": "المحل", "/shop/card": "الكارط", "/shop/qr": "وصل للكود" };
const CUSTOMER_STEPS: Record<string, string> = { "/s/[token]": "سكانا كود", "s:held": "ما عندوش كونت", "/join": "حلّ التسجيل", "s:stamped": "خذا تامبون" };
/** Each funnel step as the page filter that finds its visits. */
const STEP_PAGES: Record<string, string> = { "/": "/:welcome", "s:held": "/s/[token]:held", "s:stamped": "/s/[token]:stamped" };

/* ── the filters ────────────────────────────────────────────────────── */

const KEYS = ["src", "camp", "who", "seen", "dev", "os", "br", "city", "page", "did", "hour", "same"] as const;
type Key = (typeof KEYS)[number];
type Filters = Partial<Record<Key, string>>;
type Params = { tab?: string; d?: string; all?: string; v?: string; h?: string; from?: string; to?: string; n?: string } & Filters;
const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const NAMES: Record<Key, string> = { src: "منين", camp: "الإعلان", who: "شكون", seen: "أوّل مرّة؟", dev: "التليفون", os: "السيستام", br: "البراوزر", city: "البلاد", page: "عدّى على", did: "عمل", hour: "الساعة", same: "تليفون واحد" };
const WHO: Record<string, string> = { anon: "بلا كونت", acct: "عندو كونت", owner: "صاحب محل", client: "حريف" };
const SEEN: Record<string, string> = { new: "أوّل مرّة", back: "رجع" };
const DID: Record<string, string> = { signup: "✅ حلّ كونت", shop: "🏪 حلّ محل", rage: "🔥 ضرب نرفزة" };
/** The questions asked every day, one tap each. */
const QUICK: { k: Key; v: string; label: string }[] = [
  { k: "src", v: "meta", label: "من فيسبوك وإنستا" },
  { k: "did", v: "signup", label: "حلّو كونت" },
  { k: "who", v: "owner", label: "أصحاب المحلات" },
  { k: "who", v: "client", label: "الحرفاء" },
  { k: "who", v: "anon", label: "ما سجّلوش" },
  { k: "seen", v: "back", label: "رجعو" },
];

/** What a filter's value is called on the page. */
function valueName(k: Key, v: string): string {
  switch (k) {
    case "src":
      return v === "meta" ? "فيسبوك وإنستا (والإعلانات)" : sourceName(v);
    case "who":
      return WHO[v] ?? v;
    case "seen":
      return SEEN[v] ?? v;
    case "dev":
      return DEVICES[v] ?? v;
    case "page": {
      const [r, s] = split(v);
      return s ? screenName(r, s) : (ROUTES[r] ?? r);
    }
    case "did":
      return DID[v] ?? signalName(v);
    case "hour":
      return `${two(Number(v))}:00 – ${two((Number(v) + 1) % 24)}:00`;
    case "same":
      return "زيارات تليفون واحد";
    default:
      return v === "?" ? "ما نعرفوش" : v;
  }
}

/** The filters out of the address, each one checked; anything else is left out. */
function filtersOf(sp: Params): Filters {
  const f: Filters = {};
  for (const k of KEYS) {
    const v = sp[k]?.trim();
    if (!v || v.length > 160) continue;
    if (k === "hour" && !(/^\d{1,2}$/.test(v) && Number(v) < 24)) continue;
    if (k === "same" && !UUID.test(v)) continue;
    if (k === "who" && !Object.hasOwn(WHO, v)) continue;
    if (k === "seen" && !Object.hasOwn(SEEN, v)) continue;
    f[k] = v;
  }
  return f;
}

/** A day written as one (2026-10-07) that is one, or nothing. */
function dayOf(s: string | undefined): string | null {
  if (!s || !/^\d{4}-\d{2}-\d{2}$/.test(s)) return null;
  const d = new Date(`${s}T12:00:00Z`);
  return !Number.isNaN(d.getTime()) && d.toISOString().slice(0, 10) === s ? s : null;
}

/** The filter bar's menus: each one's choices with how many visits they keep; the chosen one stays even when it keeps none. */
function menusOf(o: Traffic["options"] | undefined, f: Filters): Menu[] {
  const order: Key[] = ["src", "camp", "who", "seen", "dev", "os", "br", "city", "page", "did"];
  return order.flatMap((k) => {
    let items = (o?.[k] ?? []).map((x) => ({ v: x.v, n: x.n as number | null, label: valueName(k, x.v) }));
    if (k === "src") items = [...items.filter((x) => x.v === "meta"), ...items.filter((x) => x.v !== "meta")];
    // a page with steps in it: «الكارط · كل الخطوات», above each step's own line
    if (k === "page") items = items.map((x) => (!x.v.includes(":") && items.some((y) => y.v.startsWith(`${x.v}:`)) ? { ...x, label: `${x.label} · كل الخطوات` } : x));
    const value = f[k] ?? null;
    if (value && !items.some((x) => x.v === value)) items.unshift({ v: value, n: null, label: valueName(k, value) });
    return items.length ? [{ key: k, name: NAMES[k], value, items }] : [];
  });
}

/** A filter on, or one to put on: on ones are filled and carry their ×. */
function Chip({ href, on, children }: { href: string; on?: boolean; children: ReactNode }) {
  return (
    <Link
      href={href}
      scroll={false}
      className={`inline-flex h-8 max-w-full items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors ${on ? "bg-ink text-white hover:bg-ink/85" : "border border-dashed border-line text-muted hover:border-brand hover:text-brand"}`}
    >
      <span className="min-w-0 truncate">{children}</span>
      {on && <X className="size-3.5 shrink-0 opacity-70" />}
    </Link>
  );
}

/**
 * The founder's traffic, on a desk: who came and from which ad, how far they
 * got, where they stopped, where their fingers landed — and any one visit,
 * second by second. Five tabs, because five questions; one row of filters
 * over all five, so any question can be asked of one part of the traffic
 * (the ad's visits, the owners, the iPhones, the ones who came back), and
 * almost everything on the page is itself a filter: a day, an hour, a source,
 * a phone, a funnel's step.
 */
export default async function TrafficPage({ searchParams }: { searchParams: Promise<Params> }) {
  const sp = await searchParams;
  const tab = TABS.some((x) => x.id === sp.tab) ? sp.tab! : "overview";
  const days = RANGES.some((r) => String(r.d) === sp.d) ? Number(sp.d) : 7;
  const all = sp.all === "1";
  const visitId = sp.v && UUID.test(sp.v) ? sp.v : null;
  const f = filtersOf(sp);
  const from = dayOf(sp.from);
  const to = from ? (dayOf(sp.to) ?? from) : null;
  const limit = Math.min(500, Math.max(100, Math.round(Number(sp.n) / 100) * 100 || 100));
  const heatParam = tab === "heat" ? (sp.h ?? null) : null;

  const href: Href = (o = {}) => {
    const next: Record<string, string | null | undefined> = { tab, d: from ? null : String(days), from, to: from && to !== from ? to : null, all: all ? "1" : null, ...f, h: heatParam, ...o };
    const q = new URLSearchParams();
    for (const [k, v] of Object.entries(next)) if (v && !(k === "d" && v === "7") && !(k === "tab" && v === "overview")) q.set(k, v);
    const s = q.toString();
    return `/admin/traffic${s ? `?${s}` : ""}`;
  };
  const query = Object.fromEntries(new URLSearchParams(href().split("?")[1] ?? ""));
  const pf = { ...f, ...(from ? { from, to: to ?? from } : {}) };

  // the heat map's page is either named in the address, and then it can be
  // asked for alongside everything else, or taken from the busiest page — and
  // only that second case has to wait for the list to come back
  const askHeat = (at: [string, string | null]) => call<Heat>("admin_heat", { p_route: at[0], p_screen: at[1] ?? "", p_days: days, p_all: all, p_f: pf });
  const named = tab === "heat" && sp.h ? split(sp.h) : null;

  const [data, { clarity }, visit, heatNamed] = await Promise.all([
    call<Traffic>("admin_traffic", { p_days: days, p_all: all, p_f: pf, p_limit: limit }),
    getSettings(),
    tab === "visits" && visitId ? call<VisitDetail>("admin_visit", { p_id: visitId }) : Promise.resolve(null),
    named ? askHeat(named) : Promise.resolve(null),
  ]);
  const pages = data?.pages ?? [];
  const heatKey = tab === "heat" ? (sp.h ?? (pages[0] ? keyOf(pages[0].route, pages[0].screen) : "/:welcome")) : null;
  const heatAt = heatKey ? split(heatKey) : null;
  const heat = named ? heatNamed : heatAt ? await askHeat(heatAt) : null;

  const on = Object.entries(f) as [Key, string][];
  const visitsN = (n: number) => (n > 100 ? String(n) : null);

  return (
    <Page
      title="الترافيك"
      hint="منين جاو، وشنوّة عملو قبل ما يسجّلو"
      actions={
        <>
          <Segments now={from ? "" : String(days)} items={RANGES.map((r) => ({ id: String(r.d), label: r.label, href: href({ d: String(r.d), from: null, to: null }) }))} />
          <Link
            href={href({ all: all ? null : "1" })}
            title="زياراتك إنت والروبوات"
            className={`inline-flex h-9 items-center gap-2 rounded-[0.625rem] border px-3 text-[0.8438rem] font-semibold ${all ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted hover:border-brand hover:text-brand"}`}
          >
            <span className={`grid size-4 place-items-center rounded-[0.25rem] text-[0.625rem] ${all ? "bg-white text-ink" : "ring-1 ring-faint"}`}>{all ? "✓" : ""}</span>
            مع زياراتي
          </Link>
          {/* every visit as a video, in Microsoft Clarity (set in the console's settings) */}
          {clarity && (
            <a
              href={`https://clarity.microsoft.com/projects/view/${clarity}/impressions`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] bg-brand px-3.5 text-[0.8438rem] font-bold text-white hover:opacity-90"
            >
              ▶ فيديوهات الزيارات
            </a>
          )}
        </>
      }
    >
      <nav className="mb-3 flex flex-wrap gap-1.5">
        {TABS.map((x) => (
          <Link
            key={x.id}
            href={href({ tab: x.id, h: null })}
            className={`inline-flex h-9 items-center rounded-[0.625rem] px-3.5 text-[0.875rem] font-semibold transition-colors ${tab === x.id ? "bg-brand text-white" : "border border-line bg-surface text-body hover:border-brand hover:text-brand"}`}
          >
            {x.label}
          </Link>
        ))}
      </nav>

      <TrafficFilters menus={menusOf(data?.options, f)} query={query} from={from} to={to} />

      {/* the filters that are on (× takes one off), then the everyday questions */}
      <div className="mb-4 flex flex-wrap items-center gap-1.5">
        {from && (
          <Chip href={href({ from: null, to: null })} on>
            <When>{to && to !== from ? `${dayName(from)} – ${dayName(to)}` : dayName(from)}</When>
          </Chip>
        )}
        {on.map(([k, v]) => (
          <Chip key={k} href={href({ [k]: null })} on>
            {NAMES[k]}: <Bidi>{valueName(k, v)}</Bidi>
          </Chip>
        ))}
        {(on.length > 0 || from) && (
          <Link href={href({ ...Object.fromEntries(KEYS.map((k) => [k, null])), from: null, to: null })} scroll={false} className="px-1.5 text-[0.8125rem] font-semibold text-coral hover:underline">
            نحّي الكل
          </Link>
        )}
        {QUICK.filter((x) => f[x.k] !== x.v).map((x) => (
          <Chip key={`${x.k}:${x.v}`} href={href({ [x.k]: x.v })}>
            {x.label}
          </Chip>
        ))}
      </div>

      {!data ? (
        <p className="rounded-[1rem] bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">ما نجمناش نجيبو الترافيك. عاود بعد شويّة.</p>
      ) : tab === "overview" ? (
        <Overview data={data} f={f} href={href} live={!from} />
      ) : tab === "pages" ? (
        <Pages pages={pages} heatHref={(k) => href({ tab: "heat", h: k })} visitsHref={(k) => href({ tab: "visits", page: k, h: null })} />
      ) : tab === "sources" ? (
        <Sources data={data} f={f} href={href} />
      ) : tab === "visits" ? (
        visitId ? (
          visit ? (
            <Visit
              data={visit}
              back={href({ tab: "visits", n: visitsN(limit) })}
              samePhone={href({ ...Object.fromEntries(KEYS.map((k) => [k, null])), from: null, to: null, d: "90", tab: "visits", same: visitId })}
            />
          ) : (
            <Empty>الزيارة هاذي ما عادش موجودة.</Empty>
          )
        ) : (
          <Visits
            rows={data.recent}
            total={data.visits}
            open={(id) => href({ tab: "visits", v: id, n: visitsN(limit) })}
            more={data.recent.length < data.visits && limit < 500 ? href({ tab: "visits", n: String(limit + 100) }) : null}
          />
        )
      ) : (
        <HeatTab pages={pages} heatKey={heatKey!} heat={heat} pick={(k) => href({ tab: "heat", h: k })} />
      )}
    </Page>
  );
}

/* ── الخلاصة ────────────────────────────────────────────────────────── */

/** The change since the stretch before (the same length, the same filters): ▲ 23% or ▼ 12%, green the good way. Nothing when there was nothing before. */
function Delta({ now, before, good = "up", was }: { now: number; before: number; good?: "up" | "down"; was?: string }) {
  if (!before) return null;
  const ch = Math.round(((now - before) * 100) / before);
  if (!ch) return <span className="font-bold text-faint">= </span>;
  const better = ch > 0 === (good === "up");
  return (
    <span className={`font-bold ${better ? "text-mint" : "text-coral"}`} title={`قبل: ${was ?? before}`}>
      {ch > 0 ? "▲" : "▼"}
      <Num>{`${Math.abs(ch)}%`}</Num>{" "}
    </span>
  );
}

function Overview({ data, f, href, live }: { data: Traffic; f: Filters; href: Href; live: boolean }) {
  const b = data.before;
  const stops = [...data.pages].filter((p) => p.exits > 0).sort((a, b) => b.exits - a.exits).slice(0, 7);
  // one signal, all its details together (the install button's place, for one)
  const sig = (name: string) => data.signals.filter((x) => x.name === name).reduce((n, x) => n + x.n, 0);
  const hour = f.hour != null ? Number(f.hour) : null;
  // the installed app is only known since APP_SINCE: a stretch before that would count every visit as «not the app»
  const beforeFrom = Date.parse(data.from) - (Date.parse(data.to) - Date.parse(data.from));
  const appBefore = beforeFrom >= APP_SINCE ? b.as_app : 0;

  return (
    <div className="space-y-4">
      {live && <OnlineNow />}

      <div>
        <Stats cols={6}>
          <Stat label="زوّار" value={data.visitors} sub={<><Delta now={data.visitors} before={b.visitors} />{data.visits} زيارة</>} />
          <Stat label="وقت الزيارة" value={<D ms={data.avg_ms} />} sub={<><Delta now={data.avg_ms} before={b.avg_ms} was={dur(b.avg_ms)} />{data.visits ? (data.views / data.visits).toFixed(1) : 0} صفحة</>} />
          <Stat
            label="خرجو طول"
            value={pct(Math.round(data.bounce * 1000), 1000)}
            sub={
              <>
                {b.visits > 0 && (
                  <span className={`font-bold ${data.bounce > b.bounce ? "text-coral" : data.bounce < b.bounce ? "text-mint" : "text-faint"}`}>
                    قبل <Num>{pct(Math.round(b.bounce * 1000), 1000)}</Num>{" "}
                  </span>
                )}
                من أوّل صفحة
              </>
            }
          />
          <Stat label="من فيسبوك" value={data.from_ads} sub={<><Delta now={data.from_ads} before={b.from_ads} />وإنستا · <Pct a={data.from_ads} b={data.visits} /></>} tone="brand" />
          <Stat label="كونتات جدد" value={data.accounts} sub={<><Delta now={data.accounts} before={b.accounts} />{data.shops} محل جديد</>} tone="mint" />
          <Stat label="ضربات نرفزة" value={data.rage} sub={`3 ضربات في بلاصة وحدة · من ${data.taps} ضربة`} tone={data.rage ? "coral" : "ink"} />
        </Stats>
        {b.visits > 0 && <p className="mt-1.5 text-[0.75rem] text-faint">▲▼ مقارنة بنفس المدّة اللي قبلها، بنفس الفلتر</p>}
      </div>

      <div className={`grid gap-4 ${data.days.length > 1 ? "2xl:grid-cols-[1.4fr_1fr]" : ""}`}>
        {data.days.length > 1 && <Days days={data.days} pick={(d) => href({ from: d, to: null, d: null })} />}
        <Hours hours={data.hours} now={hour} pick={(h) => href({ hour: h == null ? null : String(h) })} />
      </div>

      <div className="grid gap-4 2xl:grid-cols-2">
        <Card title="الموالي: قدّاش وصلو" hint="من أوّل صفحة للكود">
          <Funnel steps={data.funnel.owner} names={OWNER_STEPS} link={(s) => href({ tab: "visits", page: STEP_PAGES[s] ?? s })} />
        </Card>
        <Card title="الحرفاء: قدّاش وصلو" hint="من السكان للتامبون">
          <Funnel steps={data.funnel.customer} names={CUSTOMER_STEPS} link={(s) => href({ tab: "visits", page: STEP_PAGES[s] ?? s })} />
        </Card>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.4fr_1fr]">
        <Card title="وين يحبسو" hint="آخر صفحة قبل ما يخرجو" pad={false}>
          {stops.length === 0 ? (
            <Empty>مازال حتّى شي.</Empty>
          ) : (
            <Table head={["الصفحة", "مرّات", "الوقت", "خرجو"]}>
              {stops.map((p) => (
                <Row key={keyOf(p.route, p.screen)} href={href({ tab: "heat", h: keyOf(p.route, p.screen) })}>
                  <Cell strong>
                    <Bidi className="block truncate">{screenName(p.route, p.screen)}</Bidi>
                    {p.rage > 0 && (
                      <span className="block text-[0.75rem] font-normal text-coral">
                        <Num>{p.rage}</Num> ضربة نرفزة
                      </span>
                    )}
                  </Cell>
                  <Cell n>{p.views}</Cell>
                  <Cell n muted>
                    <D ms={p.ms} />
                  </Cell>
                  <Cell n>
                    <span className="rounded-full bg-coral-soft px-2 py-0.5 font-bold text-coral">
                      <Pct a={p.exits} b={p.views} />
                    </span>
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>

        <Card title="شنوّة عملو" hint={data.video_s ? `الفيديو: ${dur(data.video_s * 1000)} في المعدّل` : "انزل على حاجة"}>
          <LinkBars
            rows={data.signals.slice(0, 10).map((s, i) => ({
              key: String(i),
              label: signalName(s.name),
              sub: s.detail ? <Bidi>{s.detail}</Bidi> : null,
              // the visits that did it (what the list behind the link shows), not how many times
              n: s.visits,
              href: href({ did: f.did === s.name ? null : s.name }),
              on: f.did === s.name,
            }))}
          />
        </Card>
      </div>

      {/* the plain question: is Pointili being opened as an app, or as a page in somebody's browser */}
      <Card title="منين يخدمو بيها؟" hint="أبليكاسيون ولّا براوزر">
        <Stats cols={3}>
          <Stat
            label="من الأبليكاسيون"
            value={data.as_app}
            sub={<><Delta now={data.as_app} before={appBefore} /><Pct a={data.as_app} b={data.visits} /> · {data.app_people} واحد</>}
            tone="mint"
          />
          <Stat label="من براوزر عادي" value={data.as_web} sub={<><Pct a={data.as_web} b={data.visits} /> · Chrome، Safari…</>} />
          <Stat
            label="من داخل فيسبوك"
            value={data.as_inapp}
            sub={<><Pct a={data.as_inapp} b={data.visits} /> · ما ينجموش يصوبو</>}
            tone={data.as_inapp ? "coral" : "ink"}
          />
        </Stats>
      </Card>

      {/* Pointili on the phone (Android): the button seen, tapped, the app installed, the visits opened from it */}
      <Card title="📲 Pointili في التليفونات" hint="أندرويد وآيفون">
        <Stats cols={4}>
          <Stat label="شافو الزرّ" value={sig("pwa_shown")} />
          <Stat label="نزلو عليه" value={sig("pwa_click")} sub={<Pct a={sig("pwa_click")} b={sig("pwa_shown")} />} />
          <Stat label="حطّوها في التليفون" value={Math.max(sig("pwa_installed"), sig("pwa_accepted"))} tone="mint" />
          <Stat label="زيارات من الأبليكاسيون" value={sig("pwa_open")} tone="brand" />
          <Stat label="شافو «حلّ في Chrome»" value={sig("pwa_out_shown")} />
          <Stat label="خرجو لـ Chrome / Safari" value={sig("pwa_out_tap")} sub={<Pct a={sig("pwa_out_tap")} b={sig("pwa_out_shown")} />} />
          <Stat label="آيفون: شافو الشرح" value={sig("pwa_ios_shown")} />
          <Stat label="آيفون: كمّلوه للآخر" value={sig("pwa_ios_done")} sub={<Pct a={sig("pwa_ios_done")} b={sig("pwa_ios_shown")} />} tone="mint" />
        </Stats>
      </Card>
    </div>
  );
}

/** One bar: the visits, and at its foot, in green, the ones that made an account. */
function Bar({ n, of, part, strong, dim }: { n: number; of: number; part: number; strong?: boolean; dim?: boolean }) {
  return (
    <span
      className={`relative block w-full max-w-10 overflow-hidden rounded-t-[0.25rem] transition-colors ${strong ? "bg-brand" : dim ? "bg-brand/15" : "bg-brand/30 group-hover:bg-brand/55"}`}
      style={{ height: `${Math.max(3, (n / of) * 100)}%` }}
    >
      {part > 0 && n > 0 && <span className="absolute inset-x-0 bottom-0 border-t-2 border-surface bg-mint" style={{ height: `${Math.min(100, (part / n) * 100)}%` }} />}
    </span>
  );
}

function Legend() {
  return (
    <p className="mt-2.5 flex flex-wrap items-center gap-x-3 gap-y-1 text-[0.6875rem] font-medium text-muted">
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-[0.1875rem] bg-brand/40" /> زيارات
      </span>
      <span className="inline-flex items-center gap-1.5">
        <span className="size-2.5 rounded-[0.1875rem] bg-mint" /> منها حلّو كونت
      </span>
    </p>
  );
}

/** The visits, day by day; a day is a link to that day alone. */
function Days({ days, pick }: { days: Traffic["days"]; pick: (day: string) => string }) {
  const max = Math.max(1, ...days.map((d) => d.visits));
  const many = days.length > 31;
  return (
    <Card title="الزيارات كل نهار" hint="انزل على نهار">
      <div className={`flex h-[9rem] items-end ${many ? "gap-px" : "gap-1"}`} dir="ltr">
        {days.map((d, i) => {
          const last = i === days.length - 1;
          return (
            <Link key={d.day} href={pick(d.day)} scroll={false} title={`${weekday(d.day)} · ${d.visits} زيارة · ${d.accounts} كونت`} className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1">
              {!many && (last || d.visits === max) && d.visits > 0 && (
                <span className="text-[0.6875rem] font-bold text-muted">
                  <Num>{d.visits}</Num>
                </span>
              )}
              <Bar n={d.visits} of={max} part={d.accounts} strong={last} />
            </Link>
          );
        })}
      </div>
      <div className="mt-1.5 flex justify-between text-[0.6875rem] text-faint" dir="ltr">
        <bdi>{weekday(days[0]!.day)}</bdi>
        <bdi>{weekday(days[days.length - 1]!.day)}</bdi>
      </div>
      <Legend />
    </Card>
  );
}

/** The visits by the hour of the day they began (Tunis); an hour is a filter, tapped again it comes off. */
function Hours({ hours, now, pick }: { hours: Traffic["hours"]; now: number | null; pick: (h: number | null) => string }) {
  const max = Math.max(1, ...hours.map((h) => h.visits));
  const top = hours.reduce((a, h) => (h.visits > a.visits ? h : a), hours[0] ?? { h: 0, visits: 0, accounts: 0 });
  return (
    <Card title="وقتاش يجيو" hint={top.visits ? `أكثر ساعة: ${two(top.h)}:00` : "بتوقيت تونس"}>
      <div className="flex h-[9rem] items-end gap-px sm:gap-0.5" dir="ltr">
        {hours.map((h) => (
          <Link
            key={h.h}
            href={pick(now === h.h ? null : h.h)}
            scroll={false}
            title={`${two(h.h)}:00 · ${h.visits} زيارة · ${h.accounts} كونت`}
            aria-label={`${two(h.h)}:00 · ${h.visits}`}
            className="group flex h-full min-w-0 flex-1 flex-col items-center justify-end"
          >
            <Bar n={h.visits} of={max} part={h.accounts} strong={now === h.h} dim={now != null && now !== h.h} />
          </Link>
        ))}
      </div>
      <div className="mt-1.5 grid grid-cols-4 text-[0.6875rem] text-faint" dir="ltr">
        {[0, 6, 12, 18].map((x) => (
          <span key={x}>{two(x)}:00</span>
        ))}
      </div>
      <Legend />
    </Card>
  );
}

function Funnel({ steps, names, link }: { steps: Step[]; names: Record<string, string>; link: (step: string) => string }) {
  const first = steps[0]?.visits ?? 0;
  return (
    <ol className="space-y-2">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1]!.visits : s.visits;
        const lost = prev - s.visits;
        return (
          <li key={s.step}>
            {i > 0 && lost > 0 && (
              <p className="mb-1 text-[0.6875rem] font-semibold text-coral">
                ↓ <Num>{lost}</Num> وقفو هوني (<Pct a={lost} b={prev} />)
              </p>
            )}
            <Link href={link(s.step)} className="group flex items-center gap-2.5">
              <span className="w-[8rem] shrink-0 truncate text-[0.8125rem] font-semibold text-ink group-hover:text-brand group-hover:underline">{names[s.step] ?? s.step}</span>
              <span className="relative h-7 min-w-0 flex-1 overflow-hidden rounded-[0.5rem] bg-canvas">
                <span className="absolute inset-y-0 start-0 rounded-[0.5rem] bg-brand/80" style={{ width: `${first ? Math.max(2, (s.visits / first) * 100) : 0}%` }} />
              </span>
              <span className="w-8 shrink-0 text-center text-[0.875rem] font-bold text-ink">
                <Num>{s.visits}</Num>
              </span>
              <span className="w-10 shrink-0 text-end text-[0.75rem] font-semibold text-muted">{i ? <Num>{pct(s.visits, first)}</Num> : ""}</span>
            </Link>
          </li>
        );
      })}
    </ol>
  );
}

/** A ranked list where each line is a filter: the bar shows the share, the line puts it on (or, lit, takes it off). */
function LinkBars({ rows }: { rows: { key: string; label: ReactNode; sub?: ReactNode; n: number; href: string; on?: boolean }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <Empty>ما فمّا شي</Empty>;
  return (
    <ul className="-mx-2 space-y-0.5">
      {rows.map((r) => (
        <li key={r.key}>
          <Link href={r.href} scroll={false} className={`block rounded-[0.625rem] px-2 py-1.5 transition-colors ${r.on ? "bg-brand-soft" : "hover:bg-canvas"}`}>
            <span className="flex items-baseline justify-between gap-3">
              <span className={`min-w-0 truncate text-[0.875rem] font-medium ${r.on ? "text-brand" : "text-ink"}`}>{r.label}</span>
              <span className="shrink-0 text-[0.8125rem] font-bold text-body">
                <Num>{r.n}</Num>
              </span>
            </span>
            <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-line/60">
              <span className="block h-full rounded-full bg-brand/70" style={{ width: `${(r.n / max) * 100}%` }} />
            </span>
            {r.sub != null && r.sub !== "" && <span className="mt-1 block truncate text-[0.75rem] text-faint">{r.sub}</span>}
          </Link>
        </li>
      ))}
    </ul>
  );
}

/* ── الصفحات ────────────────────────────────────────────────────────── */

function Pages({ pages, heatHref, visitsHref }: { pages: PageRow[]; heatHref: (key: string) => string; visitsHref: (key: string) => string }) {
  if (!pages.length) return <Empty>حتّى زيارة بالفلتر هذا.</Empty>;
  return (
    <Card pad={false} title="الصفحات" hint="انزل على صفحة">
      <Table head={["الصفحة", "مرّات", "زيارات", "الوقت", "خروج", "ضربات", "نرفزة", ""]}>
        {pages.map((p) => (
          <Row key={keyOf(p.route, p.screen)} href={heatHref(keyOf(p.route, p.screen))}>
            <Cell strong>
              <Bidi className="block truncate">{screenName(p.route, p.screen)}</Bidi>
              <span className="block truncate text-[0.75rem] font-normal text-faint">
                <Lat>{p.route}</Lat>
              </span>
            </Cell>
            <Cell n strong>
              {p.views}
            </Cell>
            <Cell n>{p.visits}</Cell>
            <Cell n muted>
              <D ms={p.ms} />
            </Cell>
            <Cell n>
              <Pct a={p.exits} b={p.views} />
            </Cell>
            <Cell n muted>
              {p.taps}
            </Cell>
            <Cell n>{p.rage > 0 ? <span className="font-bold text-coral">{p.rage}</span> : "—"}</Cell>
            <Cell n>
              <Link
                href={visitsHref(keyOf(p.route, p.screen))}
                title="الزيارات اللي عدّات عليها"
                aria-label="الزيارات اللي عدّات عليها"
                className="relative z-[2] inline-grid size-8 place-items-center rounded-full text-muted hover:bg-brand-soft hover:text-brand"
              >
                <ListFilter className="size-4" />
              </Link>
            </Cell>
          </Row>
        ))}
      </Table>
    </Card>
  );
}

/* ── منين جاو ───────────────────────────────────────────────────────── */

function Sources({ data, f, href }: { data: Traffic; f: Filters; href: Href }) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[1.6fr_1fr]">
      <Card title="منين جاو" hint="والإعلان" pad={false}>
        {data.sources.length === 0 ? (
          <Empty>حتّى زيارة بالفلتر هذا.</Empty>
        ) : (
          <Table head={["المصدر", "زيارات", "زوّار", "صفحات", "الوقت", "كونتات", "محلات", "سجّلو"]}>
            {data.sources.map((s, i) => (
              <Row key={i} href={href({ tab: "overview", src: s.source, camp: s.campaign })}>
                <Cell strong>
                  <span className="truncate">{sourceName(s.source)}</span>
                  {s.campaign && (
                    <span className="block truncate text-[0.75rem] font-semibold text-brand">
                      <Lat>{s.campaign}</Lat>
                    </span>
                  )}
                </Cell>
                <Cell n strong>
                  {s.visits}
                </Cell>
                <Cell n>{s.visitors}</Cell>
                <Cell n muted>
                  {s.pages}
                </Cell>
                <Cell n muted>
                  <D ms={s.ms} />
                </Cell>
                <Cell n>{s.accounts > 0 ? <span className="font-bold text-mint">{s.accounts}</span> : "—"}</Cell>
                <Cell n>{s.shops > 0 ? <span className="font-bold text-mint">{s.shops}</span> : "—"}</Cell>
                <Cell n muted>
                  <Pct a={s.accounts} b={s.visitors} />
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      <div className="space-y-4">
        <Card title="التليفونات" hint="والبراوزر">
          <LinkBars
            rows={data.devices.map((d, i) => {
              const on = f.dev === d.device && f.os === d.os && f.br === d.browser;
              return {
                key: String(i),
                label: DEVICES[d.device] ?? d.device,
                sub: [d.os, d.browser].filter((x) => x && x !== "?").join(" · "),
                n: d.visits,
                href: on ? href({ dev: null, os: null, br: null }) : href({ dev: d.device, os: d.os, br: d.browser }),
                on,
              };
            })}
          />
        </Card>
        <Card title="البلاد">
          <LinkBars
            rows={data.places.map((p, i) => {
              const place = p.city || p.country;
              return { key: String(i), label: p.city || (p.country === "?" ? "ما نعرفوش" : p.country), sub: p.city ? p.country : undefined, n: p.visits, href: href({ city: f.city === place ? null : place }), on: f.city === place };
            })}
          />
        </Card>
      </div>
    </div>
  );
}

/* ── الزيارات ───────────────────────────────────────────────────────── */

function Trail({ trail }: { trail: string[] | null }) {
  const steps = (trail ?? []).map((k) => split(k));
  if (!steps.length) return null;
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {steps.map(([r, s], i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronLeft className="size-3 text-faint" />}
          <Bidi className="rounded-full bg-canvas px-2 py-0.5 text-[0.6875rem] font-semibold text-body">{screenName(r, s)}</Bidi>
        </span>
      ))}
    </span>
  );
}

/** Whose visit: the shop (or the person) and whether they are on the site now; first time or back; what it made. */
function WhoCell({ v }: { v: VisitRow }) {
  const name = v.shop ?? v.person;
  return (
    <span className="block min-w-[8.5rem] max-w-[14rem]">
      {v.user_id ? (
        <>
          <Bidi className="block truncate font-semibold text-ink">{name ?? "بلا اسم"}</Bidi>
          {v.shop && v.person && <Bidi className="block truncate text-[0.75rem] text-muted">{v.person}</Bidi>}
          <Presence user={v.user_id} className="max-w-full" />
        </>
      ) : (
        <span className="block text-muted">بلا كونت</span>
      )}
      {(v.back || v.signup || v.opened || v.who === "owner" || v.who === "client") && (
        <span className="mt-1 flex flex-wrap gap-1">
          {v.back && <Pill>رجع</Pill>}
          {v.signup && <Pill tone="mint">حلّ كونت</Pill>}
          {v.opened && <Pill tone="mint">حلّ محل</Pill>}
          {v.who === "owner" && !v.opened && <Pill tone="brand">صاحب محل</Pill>}
          {v.who === "client" && <Pill tone="brand">حريف</Pill>}
        </span>
      )}
    </span>
  );
}

function Visits({ rows, total, open, more }: { rows: VisitRow[]; total: number; open: (id: string) => string; more: string | null }) {
  if (!rows.length) return <Empty>حتّى زيارة بالفلتر هذا.</Empty>;
  return (
    <Card title={`${total} زيارة`} hint={rows.length < total ? `تبان ${rows.length} الأخرانين` : "الأخرانين أوّلا"} pad={false}>
      <Table head={["الزيارة", "شكون", "منين", "صفحات", "الوقت", "ضربات"]} words={[1]}>
        {rows.map((v) => (
          <Row key={v.id} href={open(v.id)}>
            <Cell strong>
              <span className="flex items-center gap-2">
                <When className="shrink-0 text-[0.75rem] font-semibold text-muted">{dayHm(v.started_at)}</When>
                <span className="truncate text-[0.8125rem] text-muted">
                  <Parts of={[DEVICES[v.device ?? ""] ?? v.device, v.browser, v.city || v.country]} />
                </span>
              </span>
              <Trail trail={v.trail} />
            </Cell>
            <Cell>
              <WhoCell v={v} />
            </Cell>
            <Cell n>
              <Pill tone="brand">{sourceName(v.source)}</Pill>
              {v.campaign && (
                <span className="mt-0.5 block max-w-[11rem] truncate text-[0.6875rem] text-muted">
                  <Lat>{v.campaign}</Lat>
                </span>
              )}
            </Cell>
            <Cell n>{v.pages}</Cell>
            <Cell n muted>
              <D ms={v.ms} />
            </Cell>
            <Cell n muted>
              {v.taps}
              {v.rage > 0 && <span className="font-bold text-coral"> · {v.rage}</span>}
            </Cell>
          </Row>
        ))}
      </Table>
      {more && (
        <div className="border-t border-line p-3 text-center">
          <Link href={more} scroll={false} className="inline-flex h-9 items-center rounded-[0.625rem] border border-line bg-surface px-4 text-[0.8438rem] font-semibold text-body hover:border-brand hover:text-brand">
            زيد 100 زيارة
          </Link>
        </div>
      )}
    </Card>
  );
}

function Visit({ data, back, samePhone }: { data: VisitDetail; back: string; samePhone: string }) {
  const v = data.visit;
  const who = data.who;
  const first = data.views[0] ? Date.parse(data.views[0].entered_at) : Date.parse(v.started_at);
  const end = Math.max(Date.parse(v.last_at), ...data.views.map((w) => Date.parse(w.left_at ?? w.entered_at)));
  const facts: [string, ReactNode][] = [
    ["بدات", <When key="a">{dayHm(v.started_at)}</When>],
    ["دامت", <D key="b" ms={end - first} />],
    ["منين", <Parts key="src" of={[sourceName(v.source), v.campaign, v.content, v.term, v.fbclid ? "fbclid" : null]} />],
    // the page alone: what the ad's link carried after it (utm_*, fbclid) is already in «منين»
    [
      "أوّل صفحة",
      v.landing ? (
        <span key="c" title={v.landing}>
          <Lat>{v.landing.split("?")[0]}</Lat>
        </span>
      ) : (
        "—"
      ),
    ],
    ["جا من", v.referrer ? <Lat key="d">{hostOf(v.referrer)}</Lat> : "—"],
    ["التليفون", <Parts key="dev" of={[DEVICES[v.device ?? ""] ?? v.device, v.os, v.browser]} />],
    ["الإيكران", v.screen ? <Lat key="e">{v.screen}</Lat> : "—"],
    ["البلاد", v.city || v.country ? <Parts key="place" of={[v.city, v.country]} /> : "—"],
    ["قبل", data.visits_before ? `جا ${data.visits_before} مرّات قبل` : "أوّل مرّة"],
    ["بعد", data.visits_after ? `رجع ${data.visits_after} مرّات بعد` : "ما رجعش"],
  ];
  const at = (iso: string) => Date.parse(iso);

  return (
    <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
      <div className="min-w-0 space-y-4">
        <div className="flex flex-wrap gap-2">
          <Link href={back} className="inline-flex h-9 items-center gap-1 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.8438rem] font-semibold text-body hover:border-brand hover:text-brand">
            <ChevronRight className="size-4" /> الزيارات
          </Link>
          {data.visits_before + data.visits_after > 0 && (
            <Link href={samePhone} className="inline-flex h-9 items-center gap-1.5 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.8438rem] font-semibold text-body hover:border-brand hover:text-brand">
              <ListFilter className="size-4" /> الزيارات الكل متاع التليفون هذا
            </Link>
          )}
        </div>

        {who && (
          <Card title="شكون">
            <div className="flex items-center justify-between gap-3">
              <div className="min-w-0">
                <Link href={who.shop ? `/admin/shops/${who.shop.id}` : `/admin/people/${who.id}`} className="block truncate text-[0.9375rem] font-bold text-ink hover:text-brand">
                  <Bidi>{who.shop?.name ?? who.name ?? "بلا اسم"}</Bidi>
                </Link>
                {who.shop && who.name && <Bidi className="block truncate text-[0.8125rem] text-muted">{who.name}</Bidi>}
                {who.phone && <Num className="block text-[0.8125rem] text-muted">{pretty(who.phone)}</Num>}
                <Presence user={who.id} className="mt-0.5" />
              </div>
              <Reach phone={who.phone} size="md" />
            </div>
          </Card>
        )}

        <Card title="الزيارة">
          <dl className="space-y-1.5 text-[0.8125rem]">
            {facts.map(([k, val]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words text-end font-semibold text-body">{val}</dd>
              </div>
            ))}
          </dl>
        </Card>
      </div>

      <Card title="خطوة بخطوة" hint={`${data.views.length} صفحة`} className="min-w-0">
        <ol className="relative space-y-3 border-s-2 border-line ps-4">
          {data.views.map((w, i) => {
            const until = data.views[i + 1] ? at(data.views[i + 1]!.entered_at) : Infinity;
            const from = i === 0 ? -Infinity : at(w.entered_at);
            const sigs = data.signals.filter((s) => at(s.at) >= from && at(s.at) < until);
            const last = i === data.views.length - 1;
            return (
              <li key={i} className="relative">
                <span className="absolute -start-[1.4rem] top-2 size-2.5 rounded-full bg-brand ring-4 ring-surface" aria-hidden />
                <p className="flex items-baseline gap-2">
                  <When className="shrink-0 text-[0.6875rem] text-muted">{hms(w.entered_at)}</When>
                  <b className="min-w-0 flex-1 truncate text-[0.875rem] text-ink">
                    <Bidi>{screenName(w.route, w.screen)}</Bidi>
                  </b>
                  <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[0.6875rem] font-bold">
                    <Num>
                      <D ms={w.ms} />
                    </Num>
                  </span>
                </p>
                {(w.taps.length > 0 || sigs.length > 0) && (
                  <ul className="mt-1 space-y-0.5 text-[0.75rem]">
                    {[
                      ...w.taps.map((tp) => ({ t: at(tp.at), node: <TapLine tap={tp} after={at(tp.at) - at(w.entered_at)} /> })),
                      ...sigs.map((s) => ({
                        t: at(s.at),
                        node: (
                          <span className={`flex gap-1.5 ${s.name === "form_error" ? "text-coral" : "text-brand-deep"}`}>
                            <When className="w-9 shrink-0 text-muted">+{Math.max(0, Math.round((at(s.at) - at(w.entered_at)) / 1000))}ث</When>
                            <b className="shrink-0 font-semibold">{signalName(s.name)}</b>
                            {s.detail && <span className="min-w-0 truncate">{s.detail}</span>}
                          </span>
                        ),
                      })),
                    ]
                      .sort((a, b) => a.t - b.t)
                      .map((x, j) => (
                        <li key={j}>{x.node}</li>
                      ))}
                  </ul>
                )}
                {last && (
                  <p className="mt-1.5 text-[0.75rem] font-bold text-muted">
                    {w.left_at ? (
                      <>
                        خرج <When>{hm(w.left_at)}</When>
                      </>
                    ) : (
                      "مازال هوني"
                    )}
                  </p>
                )}
              </li>
            );
          })}
        </ol>
      </Card>
    </div>
  );
}

/** One tap in a visit: how many seconds after the screen opened, and what it hit. */
function TapLine({ tap, after }: { tap: Tap; after: number }) {
  return (
    <span className={`flex items-center gap-1.5 ${tap.rage ? "text-coral" : tap.dead ? "text-muted" : "text-body"}`}>
      <When className="w-9 shrink-0 text-muted">+{Math.max(0, Math.round(after / 1000))}ث</When>
      {tap.rage ? <Flame className="size-3 shrink-0" /> : tap.dead ? <TriangleAlert className="size-3 shrink-0" /> : <MousePointerClick className="size-3 shrink-0 text-faint" />}
      <span className="min-w-0 truncate">{tap.target ?? (tap.dead ? "ضربة في الفارغ" : tap.kind === "backdrop" ? "سكّر النافذة" : "—")}</span>
      {tap.external && <ExternalLink className="size-3 shrink-0 text-brand" />}
    </span>
  );
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return url.slice(0, 60);
  }
}

/* ── الخريطة ────────────────────────────────────────────────────────── */

function HeatTab({ pages, heatKey, heat, pick }: { pages: PageRow[]; heatKey: string; heat: Heat | null; pick: (key: string) => string }) {
  const [route, screen] = split(heatKey);
  const name = screenName(route, screen);
  const keys = pages.map((p) => keyOf(p.route, p.screen));
  if (!keys.includes(heatKey)) keys.unshift(heatKey);
  return (
    <div className="grid gap-4 xl:grid-cols-[1fr_22rem]">
      <div className="min-w-0 space-y-4">
        <Card title="الصفحة" pad>
          <div className="flex flex-wrap gap-1.5">
            {keys.map((k) => {
              const [r, s] = split(k);
              return (
                <Link key={k} href={pick(k)} className={`inline-flex h-8 items-center rounded-[0.5rem] px-2.5 text-[0.75rem] font-bold transition-colors ${k === heatKey ? "bg-ink text-white" : "border border-line bg-surface text-body hover:border-brand hover:text-brand"}`}>
                  <Bidi>{screenName(r, s)}</Bidi>
                </Link>
              );
            })}
          </div>
        </Card>
        <Card title="شنوّة ضربو" hint="الأكثر أوّلا" pad={false}>
          {!heat || heat.top.length === 0 ? (
            <Empty>حتّى ضربة على الصفحة هاذي.</Empty>
          ) : (
            <Table head={["وين ضربو", "مرّات", "نرفزة"]}>
              {heat.top.map((x, i) => (
                <Row key={i}>
                  <Cell strong={!x.dead} muted={x.dead}>
                    <span className="block truncate">{x.target === "—" ? (x.dead ? "ضربة في الفارغ" : x.kind === "backdrop" ? "سكّر النافذة" : "—") : x.target}</span>
                  </Cell>
                  <Cell n strong>
                    {x.n}
                  </Cell>
                  <Cell n>
                    {x.rage > 0 ? (
                      <span className="inline-flex items-center gap-1 font-bold text-coral">
                        <Flame className="size-3.5" />
                        {x.rage}
                      </span>
                    ) : (
                      "—"
                    )}
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      </div>

      <Card title={name} hint={`${heat?.views ?? 0} مرّة`} pad>
        <HeatMap key={heatKey} taps={heat?.taps ?? []} shot={slug(route, screen)} label={name} caption={`${dur(heat?.ms ?? 0)} في المعدّل · ${heat?.taps.length ?? 0} ضربة`} />
      </Card>
    </div>
  );
}
