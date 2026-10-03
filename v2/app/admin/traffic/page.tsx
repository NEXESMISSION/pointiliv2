import Link from "next/link";
import { redirect } from "next/navigation";
import { ChevronLeft, ChevronRight, ExternalLink, Flame, MousePointerClick, TriangleAlert } from "lucide-react";
import { HeatMap, type HeatTap } from "@/components/HeatMap";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const metadata = { title: "الترافيك", robots: { index: false } };

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
/** A share inside Arabic words: kept «25%», not turned round into «%25». */
const Pct = ({ a, b }: { a: number; b: number }) => <span className="num">{pct(a, b)}</span>;

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
const SIGNALS: Record<string, string> = { video: "▶ شاف فيديو", video_close: "▶ سكّر الفيديو", help_open: "؟ حلّ «عندك سؤال؟»", form_error: "⚠ فورم ما تعدّاش", gift_won: "🎁 ربح كادو" };
const signalName = (n: string) => SIGNALS[n] ?? n;

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
 * The founder's traffic: who came (and from which ad), how far they got,
 * where they stopped, how long they stayed on every screen, where their
 * fingers landed — and any one visit, step by step. One screen: the numbers
 * scroll inside their own box.
 */
export default async function TrafficPage({ searchParams }: { searchParams: Promise<{ tab?: string; d?: string; all?: string; v?: string; h?: string }> }) {
  const [me, sp] = await Promise.all([getMe(), searchParams]);
  if (!me) redirect("/login?next=/admin/traffic");
  if (!me.admin) redirect("/");
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
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col overflow-hidden px-[clamp(1rem,5vw,1.5rem)] md:max-w-2xl">
      <header className="flex shrink-0 items-center gap-2.5 pt-2">
        <Link href="/admin" className="press grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card" aria-label="back">
          <ChevronRight className="size-5" />
        </Link>
        <h1 className="min-w-0 flex-1 truncate text-[1.5rem] font-bold">الترافيك</h1>
        <Link href={href({ all: all ? null : "1" })} className={`press flex h-9 shrink-0 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-bold ${all ? "bg-ink text-white" : "bg-surface text-muted shadow-card"}`} title="زياراتك انت والروبوات">
          <span className={`grid size-4 place-items-center rounded-[0.3rem] text-[0.6875rem] ${all ? "bg-white text-ink" : "ring-1 ring-faint"}`}>{all ? "✓" : ""}</span>
          مع زياراتي
        </Link>
      </header>

      <div className="mt-2 flex shrink-0 gap-1 rounded-[1rem] bg-ink/[0.06] p-1">
        {RANGES.map((r) => (
          <Link key={r.d} href={href({ d: String(r.d) })} className={`flex h-8 flex-1 items-center justify-center rounded-[0.75rem] text-[0.8125rem] font-semibold ${days === r.d ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
            {r.label}
          </Link>
        ))}
      </div>

      <nav className="mt-2 grid shrink-0 grid-cols-5 gap-1">
        {TABS.map((x) => (
          <Link key={x.id} href={href({ tab: x.id, h: null })} className={`flex h-9 items-center justify-center truncate rounded-[0.75rem] px-1 text-[0.8125rem] font-bold ${tab === x.id ? "bg-brand text-white shadow-[0_8px_18px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-body shadow-card"}`}>
            {x.label}
          </Link>
        ))}
      </nav>

      <section className="-mx-1 mt-1.5 min-h-0 flex-1 overflow-y-auto overscroll-contain px-1 pb-4">
        {!data ? (
          <p className="mt-6 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">ما نجمناش نجيبو الترافيك. عاود بعد شويّة.</p>
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
              <p className="mt-6 text-center text-[0.9375rem] text-muted">الزيارة هاذي ما عادش موجودة.</p>
            )
          ) : (
            <Visits rows={data.recent} open={(id) => href({ tab: "visits", v: id })} />
          )
        ) : (
          <HeatTab pages={pages} heatKey={heatKey!} heat={heat} pick={(k) => href({ tab: "heat", h: k })} />
        )}
      </section>
    </main>
  );
}

function Card({ title, hint, children, className = "" }: { title?: string; hint?: string; children: React.ReactNode; className?: string }) {
  return (
    <section className={`mt-2.5 rounded-[1.25rem] bg-surface px-3.5 py-3 shadow-card ${className}`}>
      {title && (
        <h2 className="text-[0.9375rem] font-bold">
          {title}
          {hint && <span className="ms-1.5 text-[0.75rem] font-medium text-muted">{hint}</span>}
        </h2>
      )}
      {children}
    </section>
  );
}

function Overview({ data, days, heatHref }: { data: Traffic; days: number; heatHref: (key: string) => string }) {
  const tiles: { value: React.ReactNode; label: string; sub: React.ReactNode }[] = [
    { value: data.visitors, label: "زوّار", sub: `${data.visits} زيارة` },
    { value: dur(data.avg_ms), label: "وقت الزيارة", sub: `${data.visits ? (data.views / data.visits).toFixed(1) : 0} صفحة` },
    { value: pct(Math.round(data.bounce * 1000), 1000), label: "خرجو طول", sub: "من أوّل صفحة" },
    {
      value: data.from_ads,
      label: "من فيسبوك",
      sub: (
        <>
          وإنستا · <Pct a={data.from_ads} b={data.visits} />
        </>
      ),
    },
    { value: data.accounts, label: "كونتات جدد", sub: `${data.shops} محل جديد` },
    { value: data.rage, label: "ضربات بالغشّ", sub: `من ${data.taps} ضربة` },
  ];
  const max = Math.max(1, ...data.days.map((d) => d.visits));
  // where people stop: the screens most visits ended on
  const stops = [...data.pages].filter((p) => p.exits > 0).sort((a, b) => b.exits - a.exits).slice(0, 6);
  const happened = data.signals.slice(0, 10);
  return (
    <>
      <div className="mt-1 grid grid-cols-3 gap-2">
        {tiles.map((x) => (
          <div key={x.label} className="rounded-[1.125rem] bg-surface px-2.5 py-2.5 shadow-card">
            <span className="block truncate text-[1.25rem] font-bold leading-none tabular-nums">{x.value}</span>
            <span className="mt-1 block truncate text-[0.75rem] font-semibold">{x.label}</span>
            <span className="block truncate text-[0.6875rem] text-muted">{x.sub}</span>
          </div>
        ))}
      </div>

      {days > 1 && (
        <Card title="الزيارات كل نهار">
          <div className="mt-2 flex h-[5.5rem] items-end gap-[3px]" dir="ltr">
            {data.days.map((d, i) => (
              <div key={d.day} className="flex h-full min-w-0 flex-1 flex-col items-center justify-end gap-1" title={`${weekday(d.day)} · ${d.visits}`}>
                {(i === data.days.length - 1 || d.visits === max) && d.visits > 0 && <span className="num text-[0.625rem] font-semibold text-muted">{d.visits}</span>}
                <span className={`w-full max-w-6 rounded-t-[0.25rem] ${i === data.days.length - 1 ? "bg-brand" : "bg-brand/35"}`} style={{ height: `${Math.max(3, (d.visits / max) * 100)}%` }} />
              </div>
            ))}
          </div>
          <div className="mt-1 flex justify-between text-[0.625rem] text-faint" dir="ltr">
            <span>{weekday(data.days[0]!.day)}</span>
            <span>{weekday(data.days[data.days.length - 1]!.day)}</span>
          </div>
        </Card>
      )}

      <Card title="الموالي: قدّاش وصلو" hint="من أوّل صفحة للكود">
        <Funnel steps={data.funnel.owner} names={OWNER_STEPS} />
      </Card>
      <Card title="الحرفاء: قدّاش وصلو" hint="من السكان للتامبون">
        <Funnel steps={data.funnel.customer} names={CUSTOMER_STEPS} />
      </Card>

      <Card title="وين يحبسو" hint="آخر صفحة قبل ما يخرجو">
        {stops.length === 0 ? (
          <p className="mt-1.5 text-[0.875rem] text-muted">مازال حتّى شي.</p>
        ) : (
          <ul className="mt-1.5 divide-y divide-line">
            {stops.map((p) => (
              <li key={keyOf(p.route, p.screen)}>
                <Link href={heatHref(keyOf(p.route, p.screen))} className="flex items-center gap-2 py-2">
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[0.875rem] font-semibold">{screenName(p.route, p.screen)}</span>
                    <span className="block text-[0.75rem] text-muted tabular-nums">
                      {p.views} مرّة · {dur(p.ms)} في المعدّل{p.rage ? ` · ${p.rage} بالغشّ` : ""}
                    </span>
                  </span>
                  <span className="shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-[0.75rem] font-bold text-coral">
                    <Pct a={p.exits} b={p.views} /> خرجو
                  </span>
                  <ChevronLeft className="size-4 shrink-0 text-faint" />
                </Link>
              </li>
            ))}
          </ul>
        )}
      </Card>

      <Card title="شنوّة عملو" hint={data.video_s ? `الفيديو: ${dur(data.video_s * 1000)} في المعدّل` : undefined}>
        {happened.length === 0 ? (
          <p className="mt-1.5 text-[0.875rem] text-muted">مازال حتّى شي.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {happened.map((s, i) => (
              <li key={i} className="flex items-start gap-2 text-[0.8125rem]">
                <span className="num mt-px shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[0.75rem] font-bold">{s.n}</span>
                <span className="min-w-0 flex-1">
                  <b className="font-semibold">{signalName(s.name)}</b>
                  {s.detail && <span className="block truncate text-muted">{s.detail}</span>}
                </span>
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}

function Funnel({ steps, names }: { steps: Step[]; names: Record<string, string> }) {
  const first = steps[0]?.visits ?? 0;
  return (
    <ol className="mt-2 space-y-1.5">
      {steps.map((s, i) => {
        const prev = i ? steps[i - 1]!.visits : s.visits;
        const lost = prev - s.visits;
        return (
          <li key={s.step}>
            {i > 0 && lost > 0 && (
              <p className="-mt-0.5 mb-0.5 text-[0.6875rem] font-semibold text-coral tabular-nums">
                ↓ {lost} وقفو هوني (<Pct a={lost} b={prev} />)
              </p>
            )}
            <div className="flex items-center gap-2">
              <span className="w-[6.25rem] shrink-0 truncate text-[0.8125rem] font-semibold">{names[s.step] ?? s.step}</span>
              <span className="relative h-6 min-w-0 flex-1 overflow-hidden rounded-[0.5rem] bg-ink/[0.05]">
                <span className="absolute inset-y-0 start-0 rounded-[0.5rem] bg-brand/80" style={{ width: `${first ? Math.max(2, (s.visits / first) * 100) : 0}%` }} />
              </span>
              <span className="num w-7 shrink-0 text-center text-[0.875rem] font-bold">{s.visits}</span>
              <span className="num w-9 shrink-0 text-end text-[0.6875rem] font-semibold text-muted">{i ? pct(s.visits, first) : ""}</span>
            </div>
          </li>
        );
      })}
    </ol>
  );
}

function Pages({ pages, heatHref }: { pages: PageRow[]; heatHref: (key: string) => string }) {
  if (!pages.length) return <p className="mt-6 text-center text-[0.9375rem] text-muted">مازال حتّى زيارة.</p>;
  return (
    <ul className="mt-1 divide-y divide-line rounded-[1.25rem] bg-surface shadow-card">
      {pages.map((p) => (
        <li key={keyOf(p.route, p.screen)}>
          <Link href={heatHref(keyOf(p.route, p.screen))} className="flex items-center gap-2.5 px-3.5 py-2.5">
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[0.9062rem] font-semibold">{screenName(p.route, p.screen)}</span>
              <span className="block text-[0.75rem] text-muted tabular-nums">
                {p.views} مرّة · {p.visits} زيارة · {dur(p.ms)} · خروج <Pct a={p.exits} b={p.views} />
              </span>
            </span>
            <span className="flex shrink-0 flex-col items-end gap-0.5 text-[0.75rem]">
              <span className="num flex items-center gap-1 font-bold">
                <MousePointerClick className="size-3.5 text-muted" /> {p.taps}
              </span>
              {p.rage > 0 && (
                <span className="num flex items-center gap-1 font-bold text-coral">
                  <Flame className="size-3.5" /> {p.rage}
                </span>
              )}
            </span>
            <ChevronLeft className="size-4 shrink-0 text-faint" />
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Bars({ rows }: { rows: { key: string; label: string; sub?: string; n: number }[] }) {
  const max = Math.max(1, ...rows.map((r) => r.n));
  if (!rows.length) return <p className="mt-1.5 text-[0.875rem] text-muted">مازال حتّى شي.</p>;
  return (
    <ul className="mt-2 space-y-2">
      {rows.map((r) => (
        <li key={r.key}>
          <div className="flex items-baseline justify-between gap-2 text-[0.8125rem]">
            <span className="min-w-0 truncate font-semibold">
              {r.label}
              {r.sub && <span className="font-normal text-muted"> · {r.sub}</span>}
            </span>
            <span className="num shrink-0 font-bold">{r.n}</span>
          </div>
          <span className="mt-1 block h-1.5 overflow-hidden rounded-full bg-ink/[0.05]">
            <span className="block h-full rounded-full bg-brand/75" style={{ width: `${(r.n / max) * 100}%` }} />
          </span>
        </li>
      ))}
    </ul>
  );
}

function Sources({ data }: { data: Traffic }) {
  return (
    <>
      <Card title="منين جاو" hint="والإعلان (utm_campaign)">
        {data.sources.length === 0 ? (
          <p className="mt-1.5 text-[0.875rem] text-muted">مازال حتّى زيارة.</p>
        ) : (
          <ul className="mt-1.5 divide-y divide-line">
            {data.sources.map((s, i) => (
              <li key={i} className="py-2">
                <div className="flex items-baseline justify-between gap-2">
                  <span className="min-w-0 truncate text-[0.875rem] font-bold">
                    {sourceName(s.source)}
                    {s.campaign && <span className="ms-1.5 text-[0.75rem] font-semibold text-brand">{s.campaign}</span>}
                  </span>
                  <span className="num shrink-0 text-[0.875rem] font-bold">{s.visits}</span>
                </div>
                <p className="text-[0.75rem] text-muted tabular-nums">
                  {s.visitors} زائر · {s.pages} صفحة في الزيارة · {dur(s.ms)} · {s.signed} عندهم كونت
                </p>
              </li>
            ))}
          </ul>
        )}
      </Card>
      <Card title="التليفونات" hint="والبراوزر (فيسبوك = من داخل الإبليكاسيون)">
        <Bars rows={data.devices.map((d, i) => ({ key: String(i), label: DEVICES[d.device] ?? d.device, sub: [d.os, d.browser].filter((x) => x && x !== "?").join(" · "), n: d.visits }))} />
      </Card>
      <Card title="البلاد">
        <Bars rows={data.places.map((p, i) => ({ key: String(i), label: p.city || (p.country === "?" ? "ما نعرفوش" : p.country), sub: p.city ? p.country : undefined, n: p.visits }))} />
      </Card>
    </>
  );
}

function Trail({ trail }: { trail: string[] | null }) {
  const steps = (trail ?? []).map((k) => split(k));
  return (
    <span className="mt-1 flex flex-wrap items-center gap-1">
      {steps.map(([r, s], i) => (
        <span key={i} className="flex items-center gap-1">
          {i > 0 && <ChevronLeft className="size-3 text-faint" />}
          <span className="rounded-full bg-ink/[0.05] px-2 py-0.5 text-[0.6875rem] font-semibold text-body">{screenName(r, s)}</span>
        </span>
      ))}
    </span>
  );
}

function Visits({ rows, open }: { rows: Traffic["recent"]; open: (id: string) => string }) {
  if (!rows.length) return <p className="mt-6 text-center text-[0.9375rem] text-muted">مازال حتّى زيارة.</p>;
  return (
    <ul className="mt-1 divide-y divide-line rounded-[1.25rem] bg-surface shadow-card">
      {rows.map((v) => (
        <li key={v.id}>
          <Link href={open(v.id)} className="block px-3.5 py-2.5">
            <span className="flex items-center gap-2">
              <span className="shrink-0 text-[0.75rem] font-semibold text-muted tabular-nums">{dayHm(v.started_at)}</span>
              <span className="shrink-0 rounded-full bg-brand-soft px-2 py-0.5 text-[0.6875rem] font-bold text-brand">{sourceName(v.source)}</span>
              <span className="min-w-0 flex-1 truncate text-[0.75rem] text-muted">
                {[DEVICES[v.device ?? ""] ?? v.device, v.browser, v.city || v.country].filter(Boolean).join(" · ")}
              </span>
              {v.signed && <span className="shrink-0 rounded-full bg-mint-soft px-2 py-0.5 text-[0.6875rem] font-bold text-mint">كونت</span>}
            </span>
            <Trail trail={v.trail} />
            <span className="mt-1 block text-[0.6875rem] text-muted tabular-nums">
              {v.pages} صفحة · {dur(v.ms)} · {v.taps} ضربة{v.rage ? ` · ${v.rage} بالغشّ` : ""}
              {v.campaign ? ` · ${v.campaign}` : ""}
            </span>
          </Link>
        </li>
      ))}
    </ul>
  );
}

function Visit({ data, back }: { data: VisitDetail; back: string }) {
  const v = data.visit;
  const first = data.views[0] ? Date.parse(data.views[0].entered_at) : Date.parse(v.started_at);
  const end = Math.max(Date.parse(v.last_at), ...data.views.map((w) => Date.parse(w.left_at ?? w.entered_at)));
  const facts: [string, React.ReactNode][] = [
    ["بدات", dayHm(v.started_at)],
    ["دامت", dur(end - first)],
    ["منين", [sourceName(v.source), v.campaign, v.content, v.term].filter(Boolean).join(" · ") + (v.fbclid ? " · fbclid" : "")],
    ["أوّل صفحة", v.landing ?? "—"],
    ["جا من", v.referrer ? hostOf(v.referrer) : "—"],
    ["التليفون", [DEVICES[v.device ?? ""] ?? v.device, v.os, v.browser, v.screen].filter(Boolean).join(" · ")],
    ["البلاد", [v.city, v.country].filter(Boolean).join(" · ") || "—"],
    ["قبل", data.visits_before ? `جا ${data.visits_before} مرّات قبل` : "أوّل مرّة"],
  ];
  const at = (iso: string) => Date.parse(iso);
  return (
    <>
      <Link href={back} className="mt-1 inline-flex items-center gap-1 text-[0.875rem] font-bold text-brand">
        <ChevronRight className="size-4" /> الزيارات
      </Link>
      <Card>
        <dl className="grid grid-cols-[auto_1fr] gap-x-3 gap-y-1 text-[0.8125rem]">
          {facts.map(([k, val]) => (
            <div key={k} className="contents">
              <dt className="text-muted">{k}</dt>
              <dd className="min-w-0 break-words font-semibold" dir="auto">
                {val}
              </dd>
            </div>
          ))}
          {v.user_id && (
            <div className="contents">
              <dt className="text-muted">الكونت</dt>
              <dd>
                <Link href={`/admin/people/${v.user_id}`} className="font-bold text-brand">
                  شوف الشخص ←
                </Link>
              </dd>
            </div>
          )}
        </dl>
      </Card>

      <ol className="relative mt-3 space-y-2 border-s-2 border-line ps-4">
        {data.views.map((w, i) => {
          const until = data.views[i + 1] ? at(data.views[i + 1]!.entered_at) : Infinity;
          const from = i === 0 ? -Infinity : at(w.entered_at);
          const sigs = data.signals.filter((s) => at(s.at) >= from && at(s.at) < until);
          const last = i === data.views.length - 1;
          return (
            <li key={i} className="relative">
              <span className="absolute -start-[1.4rem] top-1.5 size-2.5 rounded-full bg-brand ring-4 ring-canvas" aria-hidden />
              <p className="flex items-baseline gap-2">
                <span className="num shrink-0 text-[0.6875rem] text-muted">{hms(w.entered_at)}</span>
                <b className="min-w-0 flex-1 truncate text-[0.875rem]">{screenName(w.route, w.screen)}</b>
                <span className="shrink-0 rounded-full bg-ink/[0.06] px-2 py-0.5 text-[0.6875rem] font-bold tabular-nums">{dur(w.ms)}</span>
              </p>
              {(w.taps.length > 0 || sigs.length > 0) && (
                <ul className="mt-1 space-y-0.5 text-[0.75rem]">
                  {[
                    ...w.taps.map((tp) => ({ t: at(tp.at), node: <TapLine tap={tp} after={at(tp.at) - at(w.entered_at)} /> })),
                    ...sigs.map((s) => ({
                      t: at(s.at),
                      node: (
                        <span className={`flex gap-1.5 ${s.name === "form_error" ? "text-coral" : "text-brand-deep"}`}>
                          <span className="w-9 shrink-0 text-muted tabular-nums">+{Math.max(0, Math.round((at(s.at) - at(w.entered_at)) / 1000))}ث</span>
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
              {last && <p className="mt-1.5 text-[0.75rem] font-bold text-muted">{w.left_at ? `خرج ${hm(w.left_at)}` : "مازال هوني"}</p>}
            </li>
          );
        })}
      </ol>
    </>
  );
}

/** One tap in a visit: how many seconds after the screen opened, and what it hit. */
function TapLine({ tap, after }: { tap: Tap; after: number }) {
  return (
    <span className={`flex items-center gap-1.5 ${tap.rage ? "text-coral" : tap.dead ? "text-muted" : "text-body"}`}>
      <span className="w-9 shrink-0 text-muted tabular-nums">+{Math.max(0, Math.round(after / 1000))}ث</span>
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

function HeatTab({ pages, heatKey, heat, pick }: { pages: PageRow[]; heatKey: string; heat: Heat | null; pick: (key: string) => string }) {
  const [route, screen] = split(heatKey);
  const name = screenName(route, screen);
  // every screen that had visits, the most seen first — and the one asked for even if nobody saw it yet
  const keys = pages.map((p) => keyOf(p.route, p.screen));
  if (!keys.includes(heatKey)) keys.unshift(heatKey);
  return (
    <>
      <div className="-mx-1 mt-1 flex gap-1.5 overflow-x-auto px-1 pb-1.5">
        {keys.map((k) => {
          const [r, s] = split(k);
          return (
            <Link key={k} href={pick(k)} className={`shrink-0 rounded-full px-3 py-1 text-[0.75rem] font-bold ${k === heatKey ? "bg-ink text-white" : "bg-surface text-body shadow-card"}`}>
              {screenName(r, s)}
            </Link>
          );
        })}
      </div>
      <HeatMap key={heatKey} taps={heat?.taps ?? []} shot={slug(route, screen)} label={name} caption={`${heat?.views ?? 0} مرّة · ${dur(heat?.ms ?? 0)} في المعدّل · ${heat?.taps.length ?? 0} ضربة`} />
      <Card title="شنوّة ضربو" hint="الأكثر أوّلا">
        {!heat || heat.top.length === 0 ? (
          <p className="mt-1.5 text-[0.875rem] text-muted">حتّى ضربة على الصفحة هاذي.</p>
        ) : (
          <ul className="mt-1.5 space-y-1.5">
            {heat.top.map((x, i) => (
              <li key={i} className="flex items-center gap-2 text-[0.8125rem]">
                <span className="num w-8 shrink-0 text-center font-bold">{x.n}</span>
                <span className={`min-w-0 flex-1 truncate font-semibold ${x.dead ? "text-muted" : ""}`}>
                  {x.target === "—" ? (x.dead ? "ضربة في الفارغ" : x.kind === "backdrop" ? "سكّر النافذة" : "—") : x.target}
                </span>
                {x.rage > 0 && (
                  <span className="num flex shrink-0 items-center gap-0.5 text-[0.75rem] font-bold text-coral">
                    <Flame className="size-3.5" /> {x.rage}
                  </span>
                )}
              </li>
            ))}
          </ul>
        )}
      </Card>
    </>
  );
}
