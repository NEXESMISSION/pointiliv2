import Link from "next/link";
import { Ago } from "@/components/Ago";
import { OnlineCount, OnlineNow, Presence, Reach } from "@/components/Presence";
import { ShopMark } from "@/components/ShopMark";
import { Card, Cell, Empty, Find, Num, Page, Pill, Row, Segments, Stat, Stats, Table } from "@/components/console";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { fill, t } from "@/lib/t";

export const metadata = { title: "المحلات" };

type ShopRow = {
  id: string;
  name: string;
  kind: string;
  color: string;
  logo: string | null;
  goal: number | null;
  paused: boolean;
  created_at: string;
  paid: boolean;
  shut: boolean;
  trial_hours: number;
  test?: boolean;
  owner: { id: string; name: string; phone: string | null };
  customers: number;
  stamps: number;
  today: number;
  last_at: string | null;
  // the owner's own interest (admin_shops)
  seen_at: string | null;
  online: boolean;
  visits: number;
  days: number;
  ms: number;
  pay: boolean;
  app: boolean;
  push: boolean;
  tried: boolean;
  real: number;
  early: number;
  real_stamps: number;
};
type Level = "paid" | "hot" | "warm" | "cold" | "nocard";

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", timeZone: TZ }).format(new Date(iso));
/** 45ث · 12د · 1س 5د */
function dur(ms: number): string {
  const s = Math.round((ms || 0) / 1000);
  if (s < 60) return `${s}ث`;
  const m = Math.round(s / 60);
  return m < 60 ? `${m}د` : `${Math.floor(m / 60)}س ${m % 60}د`;
}

/**
 * How interested an owner is, out of what they did — never out of a number
 * that only looks alive. A tampon given in the first hour is the owner trying
 * it with someone at their side (it says so, and counts for little); a
 * tampon an hour later or more is a shop in use. Coming back on another day,
 * putting Pointili on the phone, opening the payment page, the time spent:
 * each adds its share, and each one shows, so the founder sees why.
 *
 *   🔥 hot   8 and more — call today
 *   warm    3 to 7     — a call could tip it
 *   ❄ cold   0 to 2     — one look, then gone
 */
function interest(s: ShopRow): { level: Level; score: number; why: string[] } {
  const why: string[] = [];
  let score = 0;
  const min = Math.round(s.ms / 60_000);
  if (s.real) {
    score += 4 * Math.min(3, s.real);
    why.push(s.real === 1 ? "حريف حقيقي" : `${s.real} حرفاء حقيقيين`);
  }
  if (s.days > 1) {
    score += 3 + Math.min(3, s.days - 2);
    why.push(`رجع: ${s.days} أيّام`);
  }
  if (s.app) {
    score += 2;
    why.push("حطّ الأبليكاسيون");
  }
  if (s.pay) {
    score += 2;
    why.push("حلّ الخلاص");
  }
  if (s.push) {
    score += 1;
    why.push("قبل النوتيفيكاسيون");
  }
  if (s.logo) {
    score += 1;
    why.push("حطّ لوغو");
  }
  score += min >= 40 ? 3 : min >= 20 ? 2 : min >= 10 ? 1 : 0;
  if (s.visits >= 3) score += 1;
  if (s.early) {
    score += 1;
    why.push(s.early === 1 ? "جرّب مع حد كي حلّ" : `جرّب مع ${s.early} كي حلّ`);
  }
  const level: Level = s.paid ? "paid" : !s.goal ? "nocard" : score >= 8 ? "hot" : score >= 3 ? "warm" : "cold";
  if ((level === "cold" || level === "nocard") && s.visits <= 1) why.unshift("جا مرّة وحدة");
  return { level, score, why };
}

const LEVELS: Record<Level, { label: string; tone: "mint" | "coral" | "brand" | "grey" }> = {
  paid: { label: "✓ خلّص", tone: "mint" },
  hot: { label: "🔥 سخون", tone: "coral" },
  warm: { label: "دافي", tone: "brand" },
  cold: { label: "❄ بارد", tone: "grey" },
  nocard: { label: "ما كمّلش", tone: "grey" },
};

/** The lists the founder asks for, one tap each. */
const FILTERS: { id: string; label: string; keep: (s: ShopRow, l: Level) => boolean }[] = [
  { id: "all", label: "الكل", keep: () => true },
  { id: "online", label: "متّصلين توّا", keep: (s) => s.online },
  { id: "stamps", label: "عطاو تامبون", keep: (s) => s.stamps > 0 },
  { id: "real", label: "عندهم حرفاء حقيقيين", keep: (s) => s.real > 0 },
  { id: "back", label: "رجعو نهار آخر", keep: (s) => s.days > 1 },
  { id: "pay", label: "حلّو الخلاص", keep: (s) => s.pay },
  { id: "hot", label: "🔥 سخون", keep: (_, l) => l === "hot" },
  { id: "warm", label: "دافي", keep: (_, l) => l === "warm" },
  { id: "cold", label: "❄ بارد", keep: (_, l) => l === "cold" },
  { id: "nocard", label: "ما كمّلوش الكارط", keep: (_, l) => l === "nocard" },
  { id: "paid", label: "✓ خلّصو", keep: (_, l) => l === "paid" },
];
const SORTS: { id: string; label: string; by: (a: Scored, b: Scored) => number }[] = [
  { id: "new", label: "الجدد", by: (a, b) => Date.parse(b.s.created_at) - Date.parse(a.s.created_at) },
  { id: "seen", label: "آخر ما جا", by: (a, b) => (b.s.seen_at ? Date.parse(b.s.seen_at) : 0) - (a.s.seen_at ? Date.parse(a.s.seen_at) : 0) },
  { id: "time", label: "قعد أكثر", by: (a, b) => b.s.ms - a.s.ms },
  { id: "score", label: "الاهتمام", by: (a, b) => b.i.score - a.i.score || b.s.ms - a.s.ms },
  { id: "customers", label: "الحرفاء", by: (a, b) => b.s.real - a.s.real || b.s.customers - a.s.customers || b.s.stamps - a.s.stamps },
];
type Scored = { s: ShopRow; i: ReturnType<typeof interest> };

/** The shop's year at a glance: paid, in its trial (and how long is left), or stopped at the trial's end. */
function PlanPill({ paid, shut, hours, test }: { paid: boolean; shut: boolean; hours: number; test?: boolean }) {
  if (test) return null;
  if (paid) return <Pill tone="mint">{t.aPlanPaid}</Pill>;
  if (shut) return <Pill tone="coral">{t.aTrialOver}</Pill>;
  return <Pill tone="brand">{hours >= 24 ? fill(t.aTrialDays, { n: Math.floor(hours / 24) }) : fill(t.aTrialHours, { n: hours })}</Pill>;
}

/**
 * Every shop, one row each, with the numbers that say whether it is alive —
 * and how interested its owner is, so a shop that only looks busy (ten
 * tampons to a cousin in the first ten minutes) is never taken for one that
 * uses it. Lists for the questions asked every day (on the site now, gave a
 * tampon, came back, hot), and an order for each (time spent, interest…).
 */
export default async function AdminShops({ searchParams }: { searchParams: Promise<{ q?: string; tests?: string; f?: string; sort?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  // the real shops, or the test ones (the founder's own and the ones marked): never in one list
  const onTests = sp.tests === "1";
  const filter = FILTERS.find((x) => x.id === sp.f) ?? FILTERS[0]!;
  const sort = SORTS.find((x) => x.id === sp.sort) ?? SORTS[0]!;
  const [shops, other] = await Promise.all([
    call<ShopRow[]>("admin_shops", { p_q: q || null, p_tests: onTests }).then((r) => r ?? []),
    call<ShopRow[]>("admin_shops", { p_q: null, p_tests: !onTests }).then((r) => r ?? []),
  ]);
  const scored: Scored[] = shops.map((s) => ({ s, i: interest(s) }));
  const count = (id: string) => scored.filter((x) => FILTERS.find((f) => f.id === id)!.keep(x.s, x.i.level)).length;
  const rows = scored.filter((x) => filter.keep(x.s, x.i.level)).sort(sort.by);

  const href = (o: { f?: string; sort?: string }) => {
    const p = new URLSearchParams();
    if (onTests) p.set("tests", "1");
    if (q) p.set("q", q);
    const f = o.f ?? filter.id;
    const so = o.sort ?? sort.id;
    if (f !== "all") p.set("f", f);
    if (so !== "new") p.set("sort", so);
    const s = p.toString();
    return `/admin/shops${s ? `?${s}` : ""}`;
  };
  const kept = { ...(onTests ? { tests: "1" } : {}), ...(filter.id !== "all" ? { f: filter.id } : {}), ...(sort.id !== "new" ? { sort: sort.id } : {}) };

  return (
    <Page
      title={t.aShops}
      hint={onTests ? t.aTestsHint : "كل محل، والمولى متاعو قدّاش مهتم"}
      actions={
        <>
          <Segments
            now={onTests ? "tests" : "real"}
            items={[
              { id: "real", label: `${t.aReal} · ${onTests ? other.length : shops.length}`, href: "/admin/shops" },
              { id: "tests", label: `${t.aTests} · ${onTests ? shops.length : other.length}`, href: "/admin/shops?tests=1" },
            ]}
          />
          <Find action="/admin/shops" value={q} placeholder={t.aSearch} hidden={kept} />
        </>
      }
    >
      {/* who is on the site right now, live, with a call beside each */}
      {!onTests && <OnlineNow className="mb-4" />}

      {/* how interested they are, each tile a list of its own */}
      <Stats cols={6}>
        <Stat label="متّصلين توّا" value={<OnlineCount />} sub="يتبدّل وحدو" tone="mint" />
        {(["hot", "warm", "cold", "nocard", "paid"] as const).map((l) => {
          const n = scored.filter((x) => x.i.level === l).length;
          const sub = { hot: "عيّطلهم اليوم", warm: "تليفون ينجم يقلبها", cold: "شافو وخرجو", nocard: "ما ينجمو ياخذو حتى تامبون", paid: `من ${shops.length}` }[l];
          const id: string = l;
          return (
            <Link key={l} href={href({ f: filter.id === id ? "all" : id })} className={`block rounded-[1rem] transition-shadow hover:ring-2 hover:ring-brand/40 ${filter.id === id ? "ring-2 ring-brand" : ""}`}>
              <Stat label={LEVELS[l].label} value={n} sub={sub} tone={l === "hot" ? "coral" : l === "warm" ? "brand" : l === "paid" ? "mint" : "ink"} />
            </Link>
          );
        })}
      </Stats>

      {/* the lists, then the order */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.filter((x) => !["hot", "warm", "cold", "nocard", "paid"].includes(x.id)).map((x) => {
          const on = filter.id === x.id;
          return (
            <Link
              key={x.id}
              href={href({ f: x.id })}
              className={`inline-flex h-8 items-center gap-1.5 rounded-full px-3 text-[0.8125rem] font-semibold transition-colors ${on ? "bg-ink text-white" : "border border-line bg-surface text-body hover:border-brand hover:text-brand"}`}
            >
              {x.label}
              <span className={`text-[0.75rem] ${on ? "text-white/70" : "text-faint"}`}>
                <Num>{count(x.id)}</Num>
              </span>
            </Link>
          );
        })}
      </div>
      <div className="mt-2 flex flex-wrap items-center gap-2">
        <span className="text-[0.8125rem] font-semibold text-muted">رتّب:</span>
        <Segments now={sort.id} items={SORTS.map((x) => ({ id: x.id, label: x.label, href: href({ sort: x.id }) }))} />
      </div>
      <p className="mt-2 text-[0.75rem] text-faint">«حريف حقيقي»: خذا تامبون بعد ساعة ولا أكثر من ما تحلّ المحل. «كي حلّ»: في الساعة الأولى، عادة واحد قدّامو يجرّب.</p>

      <Card className="mt-3" pad={false} title={filter.id === "all" ? undefined : `${filter.label} · ${rows.length}`}>
        {rows.length === 0 ? (
          <Empty>{t.aNothing}</Empty>
        ) : (
          <Table head={["المحل", t.aOwner, "الاهتمام", "قعد", t.aCustomers, "تامبون", "آخر مرّة جا", t.aCreated]} words={[1, 2]}>
            {rows.map(({ s, i }) => (
              <Row key={s.id} href={`/admin/shops/${s.id}`}>
                <Cell>
                  <span className="flex min-w-0 items-center gap-2.5">
                    <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.625rem]" style={{ background: s.color }}>
                      <ShopMark shop={s} size={22} />
                    </span>
                    <span className="min-w-0">
                      <span className="flex items-center gap-1.5">
                        <b className="truncate font-semibold text-ink">
                          <bdi>{s.name}</bdi>
                        </b>
                        {s.paused && <Pill tone="coral">{t.aPaused}</Pill>}
                        {!s.goal && <Pill>{t.aNoCard}</Pill>}
                        <PlanPill paid={s.paid} shut={s.shut} hours={s.trial_hours} test={s.test} />
                      </span>
                      <span className="block truncate text-[0.75rem] text-muted">{t.kinds[s.kind as keyof typeof t.kinds] ?? s.kind}</span>
                      <Presence user={s.owner.id} />
                    </span>
                  </span>
                </Cell>
                <Cell muted className="whitespace-nowrap">
                  <span className="flex items-center gap-3">
                    <span className="min-w-0">
                      <bdi className="block truncate">{s.owner.name || t.aOwner}</bdi>
                      {s.owner.phone && (
                        <span className="block text-[0.75rem]">
                          <Num>{pretty(s.owner.phone)}</Num>
                        </span>
                      )}
                    </span>
                    {/* a call and a WhatsApp, over the row's own link */}
                    <Reach phone={s.owner.phone} />
                  </span>
                </Cell>
                <Cell>
                  <span className="block min-w-[9rem] max-w-[15rem]" title={`${i.score} نقطة`}>
                    <Pill tone={LEVELS[i.level].tone}>{LEVELS[i.level].label}</Pill>
                    {i.why.length > 0 && <span className="mt-1 block text-[0.75rem] leading-snug text-muted">{i.why.slice(0, 3).join(" · ")}</span>}
                  </span>
                </Cell>
                <Cell n>
                  <bdi className="block font-semibold text-ink">{dur(s.ms)}</bdi>
                  <span className="block text-[0.6875rem] text-muted">
                    {s.days > 1 ? `${s.days} أيّام · ` : ""}
                    {s.visits === 1 ? "مرّة وحدة" : `${s.visits} مرّات`}
                  </span>
                </Cell>
                <Cell n>
                  <span className={`block ${s.real ? "font-bold text-mint" : "text-muted"}`}>{s.real}</span>
                  {s.early > 0 && <span className="block text-[0.6875rem] text-muted">+{s.early} كي حلّ</span>}
                </Cell>
                <Cell n>
                  <span className="block font-semibold text-ink">{s.stamps}</span>
                  {s.today > 0 ? (
                    <span className="block text-[0.6875rem] font-semibold text-mint">{s.today} اليوم</span>
                  ) : s.last_at ? (
                    <span className="block text-[0.6875rem] text-muted">
                      <Ago at={s.last_at} />
                    </span>
                  ) : null}
                </Cell>
                <Cell n muted>
                  {s.online ? <span className="font-bold text-mint">توّا</span> : s.seen_at ? <Ago at={s.seen_at} /> : "—"}
                </Cell>
                <Cell n muted>
                  <Ago at={s.created_at} className="block" />
                  <span className="block text-[0.6875rem]">{day(s.created_at)}</span>
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
    </Page>
  );
}
