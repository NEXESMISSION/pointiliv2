import Link from "next/link";
import { ChevronLeft, ChevronRight, ExternalLink, Flame, MousePointerClick, TriangleAlert } from "lucide-react";
import { HeatMap, type HeatTap } from "@/components/HeatMap";
import { Bars, Bidi, Card, Cell, Empty, Lat, Num, Page, Pill, Row, Segments, Stat, Stats, Table, When } from "@/components/console";
import { call } from "@/lib/supabase";

export const metadata = { title: "الترافيك" };

type Step = { step: string; visits: number };
type PageRow = { route: string; screen: string | null; views: number; visits: number; ms: number; exits: number; taps: number; rage: number };
type Traffic = {
  visitors: number;
  visits: number;
  views: number;
  avg_ms: number;
  bounce: number;
  taps: number;
  rage: number;
  from_ads: number;
  accounts: number;
  shops: number;
  signed: number;
  video_s: number;
  signals: { name: string; detail: string | null; n: number; visits: number }[];
  days: { day: string; visits: number }[];
  sources: { source: string; campaign: string | null; visits: number; visitors: number; pages: number; ms: number; signed: number }[];
  devices: { device: string; os: string; browser: string; visits: number }[];
  places: { country: string; city: string; visits: number }[];
  pages: PageRow[];
  funnel: { owner: Step[]; customer: Step[] };
  recent: { id: string; started_at: string; source: string; campaign: string | null; device: string | null; os: string | null; browser: string | null; country: string | null; city: string | null; landing: string | null; signed: boolean; pages: number; ms: number; taps: number; rage: number; trail: string[] | null }[];
};
type Tap = { at: string; x: number; y: number; target: string | null; kind: string | null; rage: boolean; dead: boolean; external: boolean };
type VisitDetail = {
  visit: { id: string; started_at: string; last_at: string; landing: string | null; referrer: string | null; source: string | null; medium: string | null; campaign: string | null; content: string | null; term: string | null; fbclid: boolean; device: string | null; os: string | null; browser: string | null; screen: string | null; lang: string | null; country: string | null; city: string | null; user_id: string | null; is_admin: boolean; is_bot: boolean };
  visits_before: number;
  views: { route: string; screen: string | null; path: string; entered_at: string; left_at: string | null; ms: number; vw: number | null; vh: number | null; taps: Tap[] }[];
  signals: { at: string; name: string; detail: string | null; route: string | null; screen: string | null }[];
};
type Heat = { views: number; ms: number; taps: HeatTap[]; top: { target: string; kind: string; n: number; rage: number; dead: boolean }[] };

const TZ = "Africa/Tunis";
const fmt = (o: Intl.DateTimeFormatOptions) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { timeZone: TZ, ...o });
const hm = (iso: string) => fmt({ hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const hms = (iso: string) => fmt({ hour: "2-digit", minute: "2-digit", second: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const dayHm = (iso: string) => fmt({ day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(new Date(iso));
const weekday = (d: string) => fmt({ weekday: "short", day: "numeric" }).format(new Date(`${d}T12:00:00`));
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

/**
 * The founder's traffic, on a desk: who came and from which ad, how far they
 * got, where they stopped, where their fingers landed — and any one visit,
 * second by second. Five tabs, because five questions; the screen is wide
 * enough that each one gets its own columns instead of a pile.
 */
export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ tab?: string; d?: string; all?: string; v?: string; h?: string }> }) {
  const sp = await searchParams;
  const tab = TABS.some((x) => x.id === sp.tab) ? sp.tab! : "overview";
  const days = RANGES.some((r) => String(r.d) === sp.d) ? Number(sp.d) : 7;
  const all = sp.all === "1";
  const visitId = sp.v && /^[0-9a-f-]{36}$/i.test(sp.v) ? sp.v : null;
  const href = (o: Partial<Record<"tab" | "d" | "all" | "v" | "h", string | null>>) => {
    const q = new URLSearchParams();
    const next = { tab, d: String(days), all: all ? "1" : null, v: null, h: tab === "heat" ? (sp.h ?? null) : null, ...o };
    for (const [k, v] of Object.entries(next)) if (v && !(k === "d" && v === "7") && !(k === "tab" && v === "overview")) q.set(k, v);
    const s = q.toString();
    return `/admin/traffic${s ? `?${s}` : ""}`;
  };

  const data = await call<Traffic>("admin_traffic", { p_days: days, p_all: all });
  const visit = tab === "visits" && visitId ? await call<VisitDetail>("admin_visit", { p_id: visitId }) : null;
  const pages = data?.pages ?? [];
  const heatKey = tab === "heat" ? (sp.h ?? (pages[0] ? keyOf(pages[0].route, pages[0].screen) : "/:welcome")) : null;
  const heatAt = heatKey ? split(heatKey) : null;
  const heat = heatAt ? await call<Heat>("admin_heat", { p_route: heatAt[0], p_screen: heatAt[1] ?? "", p_days: days, p_all: all }) : null;

  return (
    <Page
      title="الترافيك"
      hint="منين جاو، وشنوّة عملو قبل ما يسجّلو"
      actions={
        <>
          <Segments now={String(days)} items={RANGES.map((r) => ({ id: String(r.d), label: r.label, href: href({ d: String(r.d) }) }))} />
          <Link
            href={href({ all: all ? null : "1" })}
            title="زياراتك إنت والروبوات"
            className={`inline-flex h-9 items-center gap-2 rounded-[0.625rem] border px-3 text-[0.8438rem] font-semibold ${all ? "border-ink bg-ink text-white" : "border-line bg-surface text-muted hover:border-brand hover:text-brand"}`}
          >
            <span className={`grid size-4 place-items-center rounded-[0.25rem] text-[0.625rem] ${all ? "bg-white text-ink" : "ring-1 ring-faint"}`}>{all ? "✓" : ""}</span>
            مع زياراتي
          </Link>
        </>
      }
    >
      <nav className="mb-4 flex flex-wrap gap-1.5">
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

      {!data ? (
        <p className="rounded-[1rem] bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">ما نجمناش نجيبو الترافيك. عاود بعد شويّة.</p>
      ) : tab === "overview" ? (
        <Overview data={data} days={days} heatHref={(k) => href({ tab: "heat", h: k })} />
      ) : tab === "pages" ? (
        <Pages pages={pages} heatHref={(k) => href({ tab: "heat", h: k })} />
      ) : tab === "sources" ? (
        <Sources data={data} />
      ) : tab === "visits" ? (
        visitId ? (
          visit ? (
            <Visit data={visit} back={href({ tab: "visits", v: null })} />
          ) : (
            <Empty>الزيارة هاذي ما عادش موجودة.</Empty>
          )
        ) : (
          <Visits rows={data.recent} open={(id) => href({ tab: "visits", v: id })} />
        )
      ) : (
        <HeatTab pages={pages} heatKey={heatKey!} heat={heat} pick={(k) => href({ tab: "heat", h: k })} />
      )}
    </Page>
  );
}

/* ── الخلاصة ────────────────────────────────────────────────────────── */

function Overview({ data, days, heatHref }: { data: Traffic; days: number; heatHref: (key: string) => string }) {
  const max = Math.max(1, ...data.days.map((d) => d.visits));
  const stops = [...data.pages].filter((p) => p.exits > 0).sort((a, b) => b.exits - a.exits).slice(0, 7);
  // one signal, all its details together (the install button's place, for one)
  const sig = (name: string) => data.signals.filter((x) => x.name === name).reduce((n, x) => n + x.n, 0);

  return (
    <div className="space-y-4">
      <Stats cols={6}>
        <Stat label="زوّار" value={data.visitors} sub={`${data.visits} زيارة`} />
        <Stat label="وقت الزيارة" value={<D ms={data.avg_ms} />} sub={`${data.visits ? (data.views / data.visits).toFixed(1) : 0} صفحة`} />
        <Stat label="خرجو طول" value={pct(Math.round(data.bounce * 1000), 1000)} sub="من أوّل صفحة" />
        <Stat label="من فيسبوك" value={data.from_ads} sub={<>وإنستا · {pct(data.from_ads, data.visits)}</>} tone="brand" />
        <Stat label="كونتات جدد" value={data.accounts} sub={`${data.shops} محل جديد`} tone="mint" />
        <Stat label="ضربات بالغشّ" value={data.rage} sub={`من ${data.taps} ضربة`} tone={data.rage ? "coral" : "ink"} />
      </Stats>

      {days > 1 && (
        <Card title="الزيارات كل نهار">
          <div className="flex h-[9rem] items-end gap-1" dir="ltr">
            {data.days.map((d, i) => {
              const last = i === data.days.length - 1;
              return (
                <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${weekday(d.day)} · ${d.visits}`}>
                  {(last || d.visits === max) && d.visits > 0 && (
                    <span className="text-[0.6875rem] font-bold text-muted">
                      <Num>{d.visits}</Num>
                    </span>
                  )}
                  <span className={`w-full max-w-10 rounded-t-[0.25rem] ${last ? "bg-brand" : "bg-brand/30"}`} style={{ height: `${Math.max(3, (d.visits / max) * 100)}%` }} />
                </div>
              );
            })}
          </div>
          <div className="mt-1.5 flex justify-between text-[0.6875rem] text-faint" dir="ltr">
            <bdi>{weekday(data.days[0]!.day)}</bdi>
            <bdi>{weekday(data.days[data.days.length - 1]!.day)}</bdi>
          </div>
        </Card>
      )}

      <div className="grid gap-4 2xl:grid-cols-2">
        <Card title="الموالي: قدّاش وصلو" hint="من أوّل صفحة للكود">
          <Funnel steps={data.funnel.owner} names={OWNER_STEPS} />
        </Card>
        <Card title="الحرفاء: قدّاش وصلو" hint="من السكان للتامبون">
          <Funnel steps={data.funnel.customer} names={CUSTOMER_STEPS} />
        </Card>
      </div>

      <div className="grid gap-4 2xl:grid-cols-[1.4fr_1fr]">
        <Card title="وين يحبسو" hint="آخر صفحة قبل ما يخرجو" pad={false}>
          {stops.length === 0 ? (
            <Empty>مازال حتّى شي.</Empty>
          ) : (
            <Table head={["الصفحة", "مرّات", "الوقت", "خرجو"]}>
              {stops.map((p) => (
                <Row key={keyOf(p.route, p.screen)} href={heatHref(keyOf(p.route, p.screen))}>
                  <Cell strong>
                    <Bidi className="block truncate">{screenName(p.route, p.screen)}</Bidi>
                    {p.rage > 0 && (
                      <span className="block text-[0.75rem] font-normal text-coral">
                        <Num>{p.rage}</Num> ضربة بالغشّ
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

        <Card title="شنوّة عملو" hint={data.video_s ? `الفيديو: ${dur(data.video_s * 1000)} في المعدّل` : undefined}>
          <Bars rows={data.signals.slice(0, 10).map((s, i) => ({ key: String(i), label: signalName(s.name), sub: s.detail ? <Bidi>{s.detail}</Bidi> : null, n: s.n }))} />
        </Card>
      </div>

      {/* Pointili on the phone (Android): the button seen, tapped, the app installed, the visits opened from it */}
      <Card title="📲 Pointili في التليفونات" hint="الزرّ «حطّ Pointili في تليفونك»، على الأندرويد">
        <Stats>
          <Stat label="شافو الزرّ" value={sig("pwa_shown")} />
          <Stat label="نزلو عليه" value={sig("pwa_click")} sub={<Pct a={sig("pwa_click")} b={sig("pwa_shown")} />} />
          <Stat label="حطّوها في التليفون" value={Math.max(sig("pwa_installed"), sig("pwa_accepted"))} tone="mint" />
          <Stat label="زيارات من الأبليكاسيون" value={sig("pwa_open")} tone="brand" />
        </Stats>
      </Card>
    </div>
  );
}

function Funnel({ steps, names }: { steps: Step[]; names: Record<string, string> }) {
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
            <div className="flex items-center gap-2.5">
              <span className="w-[8rem] shrink-0 truncate text-[0.8125rem] font-semibold text-ink">{names[s.step] ?? s.step}</span>
              <span className="relative h-7 min-w-0 flex-1 overflow-hidden rounded-[0.5rem] bg-canvas">
                <span className="absolute inset-y-0 start-0 rounded-[0.5rem] bg-brand/80" style={{ width: `${first ? Math.max(2, (s.visits / first) * 100) : 0}%` }} />
              </span>
              <span className="w-8 shrink-0 text-center text-[0.875rem] font-bold text-ink">
                <Num>{s.visits}</Num>
              </span>
              <span className="w-10 shrink-0 text-end text-[0.75rem] font-semibold text-muted">{i ? <Num>{pct(s.visits, first)}</Num> : ""}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

/* ── الصفحات ────────────────────────────────────────────────────────── */

function Pages({ pages, heatHref }: { pages: PageRow[]; heatHref: (key: string) => string }) {
  if (!pages.length) return <Empty>مازال حتّى زيارة.</Empty>;
  return (
    <Card pad={false}>
      <Table head={["الصفحة", "مرّات", "زيارات", "الوقت", "خروج", "ضربات", "بالغشّ"]}>
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
          </Row>
        ))}
      </Table>
    </Card>
  );
}

/* ── منين جاو ───────────────────────────────────────────────────────── */

function Sources({ data }: { data: Traffic }) {
  return (
    <div className="grid gap-4 2xl:grid-cols-[1.5fr_1fr]">
      <Card title="منين جاو" hint="والإعلان (utm_campaign)" pad={false}>
        {data.sources.length === 0 ? (
          <Empty>مازال حتّى زيارة.</Empty>
        ) : (
          <Table head={["المصدر", "زيارات", "زوّار", "صفحات", "الوقت", "كونت"]}>
            {data.sources.map((s, i) => (
              <Row key={i}>
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
                <Cell n>{s.signed > 0 ? <span className="font-bold text-mint">{s.signed}</span> : "—"}</Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>

      <div className="space-y-4">
        <Card title="التليفونات" hint="والبراوزر">
          <Bars rows={data.devices.map((d, i) => ({ key: String(i), label: DEVICES[d.device] ?? d.device, sub: [d.os, d.browser].filter((x) => x && x !== "?").join(" · "), n: d.visits }))} />
        </Card>
        <Card title="البلاد">
          <Bars rows={data.places.map((p, i) => ({ key: String(i), label: p.city || (p.country === "?" ? "ما نعرفوش" : p.country), sub: p.city ? p.country : undefined, n: p.visits }))} />
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

function Visits({ rows, open }: { rows: Traffic["recent"]; open: (id: string) => string }) {
  if (!rows.length) return <Empty>مازال حتّى زيارة.</Empty>;
  return (
    <Card pad={false}>
      <Table head={["الزيارة", "منين", "صفحات", "الوقت", "ضربات", ""]}>
        {rows.map((v) => (
          <Row key={v.id} href={open(v.id)}>
            <Cell strong>
              <span className="flex items-center gap-2">
                <When className="text-[0.75rem] font-semibold text-muted">{dayHm(v.started_at)}</When>
                <span className="truncate text-[0.8125rem] text-muted"><Parts of={[DEVICES[v.device ?? ""] ?? v.device, v.browser, v.city || v.country]} /></span>
              </span>
              <Trail trail={v.trail} />
            </Cell>
            <Cell n>
              <Pill tone="brand">{sourceName(v.source)}</Pill>
              {v.campaign && (
                <span className="mt-0.5 block text-[0.6875rem] text-muted">
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
            <Cell n>{v.signed && <Pill tone="mint">كونت</Pill>}</Cell>
          </Row>
        ))}
      </Table>
    </Card>
  );
}

function Visit({ data, back }: { data: VisitDetail; back: string }) {
  const v = data.visit;
  const first = data.views[0] ? Date.parse(data.views[0].entered_at) : Date.parse(v.started_at);
  const end = Math.max(Date.parse(v.last_at), ...data.views.map((w) => Date.parse(w.left_at ?? w.entered_at)));
  const facts: [string, React.ReactNode][] = [
    ["بدات", <When key="a">{dayHm(v.started_at)}</When>],
    ["دامت", <D key="b" ms={end - first} />],
    ["منين", <Parts key="src" of={[sourceName(v.source), v.campaign, v.content, v.term, v.fbclid ? "fbclid" : null]} />],
    ["أوّل صفحة", v.landing ? <Lat key="c">{v.landing}</Lat> : "—"],
    ["جا من", v.referrer ? <Lat key="d">{hostOf(v.referrer)}</Lat> : "—"],
    ["التليفون", <Parts key="dev" of={[DEVICES[v.device ?? ""] ?? v.device, v.os, v.browser]} />],
    ["الإيكران", v.screen ? <Lat key="e">{v.screen}</Lat> : "—"],
    ["البلاد", v.city || v.country ? <Parts key="place" of={[v.city, v.country]} /> : "—"],
    ["قبل", data.visits_before ? `جا ${data.visits_before} مرّات قبل` : "أوّل مرّة"],
  ];
  const at = (iso: string) => Date.parse(iso);

  return (
    <div className="grid gap-4 xl:grid-cols-[20rem_1fr]">
      <div className="space-y-4">
        <Link href={back} className="inline-flex h-9 items-center gap-1 rounded-[0.625rem] border border-line bg-surface px-3 text-[0.8438rem] font-semibold text-body hover:border-brand hover:text-brand">
          <ChevronRight className="size-4" /> الزيارات
        </Link>
        <Card title="الزيارة">
          <dl className="space-y-1.5 text-[0.8125rem]">
            {facts.map(([k, val]) => (
              <div key={k} className="flex justify-between gap-3">
                <dt className="shrink-0 text-muted">{k}</dt>
                <dd className="min-w-0 break-words text-end font-semibold text-body">{val}</dd>
              </div>
            ))}
            {v.user_id && (
              <div className="flex justify-between gap-3 border-t border-line pt-2">
                <dt className="text-muted">الكونت</dt>
                <dd>
                  <Link href={`/admin/people/${v.user_id}`} className="font-bold text-brand hover:underline">
                    شوف الشخص ←
                  </Link>
                </dd>
              </div>
            )}
          </dl>
        </Card>
      </div>

      <Card title="خطوة بخطوة" hint={`${data.views.length} صفحة`}>
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
                  <b className="min-w-0 flex-1 truncate text-[0.875rem] text-ink"><Bidi>{screenName(w.route, w.screen)}</Bidi></b>
                  <span className="shrink-0 rounded-full bg-canvas px-2 py-0.5 text-[0.6875rem] font-bold">
                    <Num><D ms={w.ms} /></Num>
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
                {last && <p className="mt-1.5 text-[0.75rem] font-bold text-muted">{w.left_at ? <>خرج <When>{hm(w.left_at)}</When></> : "مازال هوني"}</p>}
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
            <Table head={["وين ضربو", "مرّات", "بالغشّ"]}>
              {heat.top.map((x, i) => (
                <Row key={i}>
                  <Cell strong={!x.dead} muted={x.dead}>
                    <span className="block truncate">{x.target === "—" ? (x.dead ? "ضربة في الفارغ" : x.kind === "backdrop" ? "سكّر النافذة" : "—") : x.target}</span>
                  </Cell>
                  <Cell n strong>
                    {x.n}
                  </Cell>
                  <Cell n>{x.rage > 0 ? <span className="inline-flex items-center gap-1 font-bold text-coral"><Flame className="size-3.5" />{x.rage}</span> : "—"}</Cell>
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
