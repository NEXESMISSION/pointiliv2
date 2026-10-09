import Link from "next/link";
import { Ago } from "@/components/Ago";
import { CrmSheet, type CrmOf } from "@/components/Crm";
import { Presence, Reach } from "@/components/Presence";
import { ShopMark } from "@/components/ShopMark";
import { Card, Cell, Empty, Find, Num, Page, Pill, Row, Segments, Stat, Stats, Table } from "@/components/console";
import { PAID, STAGE_ORDER, STAGES, daySaid, daysFromToday, said, stageOf, tunisToday, type Stage } from "@/lib/crm";
import { call } from "@/lib/supabase";
import { pretty } from "@/lib/phone";
import { t } from "@/lib/t";

export const metadata = { title: "المتابعة" };

type Last = { kind: string; outcome: string | null; text: string; at: string };
type CrmRow = {
  id: string;
  name: string;
  kind: string;
  color: string;
  logo: string | null;
  goal: number | null;
  created_at: string;
  owner: { id: string; name: string; phone: string | null };
  paid: boolean;
  shut: boolean;
  trial_hours: number;
  test?: boolean;
  stamps: number;
  last_stamp_at: string | null;
  stage: Stage;
  next_at: string | null;
  note: string;
  tries: number;
  talks: number;
  talked_at: string | null;
  last: Last | null;
};

const HOUR = 3600_000;
/**
 * The ones to work today: a day that came (or passed), a new shop nobody
 * called yet (two hours in, so a sign-up still setting up is left alone), a
 * try to repeat (a day on). Not the ones who pay, nor the ones who said no.
 */
const dueToday = (r: CrmRow, today: string) => {
  if (r.paid || r.stage === "refused") return false;
  if (r.next_at) return r.next_at <= today;
  if (r.stage === "new") return Date.now() - Date.parse(r.created_at) > 2 * HOUR;
  if (r.stage === "tried") return !r.last || Date.now() - Date.parse(r.last.at) > 20 * HOUR;
  return false;
};
type Filter = { id: string; label: string; keep: (r: CrmRow, today: string) => boolean };
const FILTERS: Filter[] = [
  { id: "all", label: "الكل", keep: () => true },
  { id: "today", label: "نعيّطلهم اليوم", keep: dueToday },
  ...STAGES.map((s) => ({ id: s.id, label: s.label, keep: (r: CrmRow) => !r.paid && r.stage === s.id })),
  { id: "paid", label: PAID.label, keep: (r: CrmRow) => r.paid },
];
/** the order of work: today's first (the oldest day first), then by stage, then the newest shop */
const order = (today: string) => (a: CrmRow, b: CrmRow) => {
  const da = dueToday(a, today) ? 0 : 1;
  const db = dueToday(b, today) ? 0 : 1;
  if (da !== db) return da - db;
  if (da === 0) {
    const na = a.next_at ?? "9999";
    const nb = b.next_at ?? "9999";
    if (na !== nb) return na < nb ? -1 : 1;
  }
  const sa = STAGE_ORDER[a.paid ? "paid" : a.stage];
  const sb = STAGE_ORDER[b.paid ? "paid" : b.stage];
  if (sa !== sb) return sa - sb;
  return a.created_at < b.created_at ? 1 : -1;
};

/** the trial's end or the year, in a word */
function PlanPill({ r }: { r: CrmRow }) {
  if (r.paid) return <Pill tone="mint">{PAID.label}</Pill>;
  if (r.shut) return <Pill tone="coral">{t.aTrialOver}</Pill>;
  const d = Math.ceil(r.trial_hours / 24);
  return <Pill>{r.trial_hours < 24 ? `تجربة · ${r.trial_hours} س` : `تجربة · ${d}ي`}</Pill>;
}

/**
 * The follow-up: every shop with where it stands by the founder's own word,
 * the last word with its owner, and the day to come back — the ones to work
 * today on top. A row opens the shop's sheet: a stage, a day, a note, a word
 * written down in two taps. Numbers live on the shops' page; here is what
 * was said.
 */
export default async function AdminCrm({ searchParams }: { searchParams: Promise<{ q?: string; tests?: string; f?: string; open?: string; n?: string }> }) {
  const sp = await searchParams;
  const q = sp.q ?? "";
  const onTests = sp.tests === "1";
  const filter = FILTERS.find((x) => x.id === sp.f) ?? FILTERS[0]!;
  const today = tunisToday();
  const [rows, other] = await Promise.all([
    call<CrmRow[]>("admin_crm", { p_q: q || null, p_tests: onTests }).then((r) => r ?? []),
    call<CrmRow[]>("admin_crm", { p_q: null, p_tests: !onTests }).then((r) => r ?? []),
  ]);
  const open = sp.open && /^[0-9a-f-]{36}$/i.test(sp.open) ? rows.find((r) => r.id === sp.open) : undefined;
  const of = open ? await call<CrmOf>("admin_crm_of", { p_shop: open.id }) : null;
  const count = (id: string) => rows.filter((r) => FILTERS.find((f) => f.id === id)!.keep(r, today)).length;
  const matching = rows.filter((r) => filter.keep(r, today)).sort(order(today));
  // a screenful, and the rest a tap away: see the shops list for why
  const PAGE = 30;
  const want = Math.max(PAGE, Math.min(500, Number(sp.n) || PAGE));
  const shown = matching.slice(0, want);
  const left = matching.length - shown.length;

  const href = (o: { f?: string; open?: string | null }) => {
    const p = new URLSearchParams();
    if (onTests) p.set("tests", "1");
    if (q) p.set("q", q);
    const f = o.f ?? filter.id;
    if (f !== "all") p.set("f", f);
    const op = o.open === undefined ? sp.open : o.open;
    if (op) p.set("open", op);
    const s = p.toString();
    return `/admin/crm${s ? `?${s}` : ""}`;
  };
  const kept = { ...(onTests ? { tests: "1" } : {}), ...(filter.id !== "all" ? { f: filter.id } : {}) };
  const tiles: { id: string; label: string; sub: string; tone: "ink" | "brand" | "coral" | "mint" }[] = [
    { id: "today", label: "نعيّطلهم اليوم", sub: "جاء نهارهم، ولا مازال حد ما كلّمهم", tone: "coral" },
    { id: "new", label: "ما كلّمناهمش", sub: "حتى تليفون", tone: "ink" },
    { id: "interested", label: "مهتمّين", sub: "يحبّو يجرّبو", tone: "brand" },
    { id: "promised", label: "باش يخلّصو", sub: "قالوها", tone: "mint" },
    { id: "paid", label: "خلّصو", sub: `من ${rows.length}`, tone: "mint" },
    { id: "refused", label: "ما يحبّوش", sub: "خلاص", tone: "ink" },
  ];

  return (
    <Page
      title="المتابعة"
      hint={onTests ? t.aTestsHint : "كل محل: كلّمناه ولا لا، شنوّة قال، ووقتاش نعاودو"}
      actions={
        <>
          <Segments
            now={onTests ? "tests" : "real"}
            items={[
              { id: "real", label: `${t.aReal} · ${onTests ? other.length : rows.length}`, href: "/admin/crm" },
              { id: "tests", label: `${t.aTests} · ${onTests ? rows.length : other.length}`, href: "/admin/crm?tests=1" },
            ]}
          />
          <Find action="/admin/crm" value={q} placeholder={t.aSearch} hidden={kept} />
        </>
      }
    >
      {/* the lists at a glance, each a tile */}
      <Stats cols={6}>
        {tiles.map((x) => (
          <Link key={x.id} href={href({ f: filter.id === x.id ? "all" : x.id, open: null })} className={`block rounded-[1rem] transition-shadow hover:ring-2 hover:ring-brand/40 ${filter.id === x.id ? "ring-2 ring-brand" : ""}`}>
            <Stat label={x.label} value={count(x.id)} sub={x.sub} tone={x.tone} />
          </Link>
        ))}
      </Stats>

      {/* every stage, a list of its own */}
      <div className="mt-4 flex flex-wrap items-center gap-1.5">
        {FILTERS.map((x) => {
          const on = filter.id === x.id;
          return (
            <Link
              key={x.id}
              href={href({ f: x.id, open: null })}
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
      <p className="mt-2 text-[0.75rem] text-faint">انزل على محل باش تسجّل تليفون ولا واتساب ولا زيارة، تبدّل وين وصل، تحط نهار نعاودو فيه، وتكتب نوت. «ما جاوبش» و«كلّمناه» يتحطّو وحدهم من اللي تسجّل.</p>

      <Card className="mt-3" pad={false} title={filter.id === "all" ? undefined : `${filter.label} · ${shown.length}`}>
        {shown.length === 0 ? (
          <Empty>{filter.id === "today" ? "حتى حد اليوم — كل شي في وقتو" : t.aNothing}</Empty>
        ) : (
          <Table head={["المحل", t.aOwner, "وين وصل", "آخر كلمة", "نعاودو", "تامبون", "نوت"]} words={[1, 2, 3, 4, 6]}>
            {shown.map((r) => {
              const due = dueToday(r, today);
              const late = !!r.next_at && daysFromToday(r.next_at) < 0;
              return (
                <Row key={r.id} href={href({ open: r.id })}>
                  <Cell>
                    <span className="flex min-w-0 items-center gap-2.5">
                      <span className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.625rem]" style={{ background: r.color }}>
                        <ShopMark shop={r} size={22} />
                      </span>
                      <span className="min-w-0">
                        <span className="flex items-center gap-1.5">
                          <b className="truncate font-semibold text-ink">
                            <bdi>{r.name}</bdi>
                          </b>
                          {!r.goal && <Pill>{t.aNoCard}</Pill>}
                          <PlanPill r={r} />
                        </span>
                        <span className="block truncate text-[0.75rem] text-muted">{t.kinds[r.kind as keyof typeof t.kinds] ?? r.kind}</span>
                        <Presence user={r.owner.id} />
                      </span>
                    </span>
                  </Cell>
                  <Cell muted className="whitespace-nowrap">
                    <span className="flex items-center gap-3">
                      <span className="min-w-0">
                        <bdi className="block truncate">{r.owner.name || t.aOwner}</bdi>
                        {r.owner.phone && (
                          <span className="block text-[0.75rem]">
                            <Num>{pretty(r.owner.phone)}</Num>
                          </span>
                        )}
                      </span>
                      <Reach phone={r.owner.phone} />
                    </span>
                  </Cell>
                  <Cell>
                    {r.paid ? <Pill tone={PAID.tone}>{PAID.label}</Pill> : <Pill tone={stageOf(r.stage).tone}>{stageOf(r.stage).label}</Pill>}
                    {due && !r.paid && <span className="mt-1 block text-[0.6875rem] font-bold text-coral">اليوم</span>}
                  </Cell>
                  <Cell muted>
                    {r.last ? (
                      <span className="block min-w-[8rem] max-w-[16rem]">
                        <span className="block font-semibold text-ink">{said(r.last.kind, r.last.outcome)}</span>
                        {r.last.text && <span className="block truncate text-[0.75rem]">{r.last.text}</span>}
                        <span className="block text-[0.75rem]">
                          <Ago at={r.last.at} />
                          {r.tries > 1 && ` · ${r.tries} محاولات`}
                        </span>
                      </span>
                    ) : (
                      <span className="text-[0.8125rem]">حتى كلمة</span>
                    )}
                  </Cell>
                  <Cell muted className="whitespace-nowrap">
                    {r.next_at ? <span className={`font-semibold ${late ? "text-coral" : daysFromToday(r.next_at) === 0 ? "text-brand" : "text-ink"}`}>{daySaid(r.next_at)}</span> : "—"}
                  </Cell>
                  <Cell n>
                    <span className={`block ${r.stamps ? "font-semibold text-ink" : "text-muted"}`}>{r.stamps}</span>
                    {r.last_stamp_at && (
                      <span className="block text-[0.6875rem] text-muted">
                        <Ago at={r.last_stamp_at} />
                      </span>
                    )}
                  </Cell>
                  <Cell muted>{r.note ? <span className="block max-w-[14rem] truncate text-[0.8125rem]">{r.note}</span> : "—"}</Cell>
                </Row>
              );
            })}
          </Table>
        )}
        {left > 0 && (
          <Link
            href={`${href({})}${href({}).includes("?") ? "&" : "?"}n=${want + PAGE}`}
            className="flex items-center justify-center gap-2 border-t border-line py-3 text-[0.875rem] font-bold text-brand hover:bg-canvas"
          >
            ورّي {Math.min(PAGE, left)} أخرى
            <span className="font-medium text-muted">باقي {left}</span>
          </Link>
        )}
      </Card>

      {open && of && <CrmSheet key={open.id} shop={open} data={of} closeHref={href({ open: null })} />}
    </Page>
  );
}
