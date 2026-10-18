import type { ReactNode } from "react";
import { PlanImage } from "@/components/PlanImage";
import { BadgeCheck, CalendarPlus, Download, Hourglass } from "lucide-react";
import { AdminBookAdd, AdminBookDelete } from "@/components/AdminBooks";
import { AdminPayActions } from "@/components/AdminPayActions";
import { box, Card, Cell, CFile, Empty, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { BankMark, CardMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { pretty } from "@/lib/phone";
import { call } from "@/lib/supabase";
import { fill, monthsSaid, t } from "@/lib/t";

export const metadata = { title: "الفلوس", robots: { index: false } };

type Who = { name: string | null; phone: string | null };
type Line = {
  id: number;
  at: string;
  kind: "paid" | "until" | "end" | "trial";
  months: number | null;
  until: string | null;
  amount: number | null;
  method: string | null;
  note: string | null;
  shop: { id: string; name: string };
  owner: Who;
};
type Waiting = { id: string; method: string; months: number; amount: number; at: string; shop: { id: string; name: string }; owner: Who };
/** a line the founder wrote himself, either side */
type Hand = { id: number; side: "in" | "out"; on: string; amount: number; what: string; kind: string };
type Books = {
  today: string;
  month: number;
  year: number;
  all: number;
  out_month: number;
  out_year: number;
  out_all: number;
  extra_months: number;
  paying: number;
  rows: Line[];
  lines: Hand[];
  waiting: Waiting[];
};
/** the income book: a shop's line, or a line by hand, in one order */
type Income = { key: string; at: string; plan?: Line; hand?: Hand };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
// 1 440, not 1440: a sum read at a glance (47,35 when there are millimes)
const dt = (n: number) => new Intl.NumberFormat("fr-TN", { maximumFractionDigits: 3 }).format(n);
const WAYS: Record<string, { label: string; mark: ReactNode }> = {
  cash: { label: t.aPlanCash, mark: <CashMark className="size-6" /> },
  d17: { label: t.payD17, mark: <D17Mark className="size-6" /> },
  virement: { label: t.payVirement, mark: <BankMark className="size-6" /> },
  versement: { label: t.payVersement, mark: <CashMark className="size-6" /> },
  mandat: { label: t.payMandat, mark: <PostMark className="size-6" /> },
  card: { label: t.payCard, mark: <CardMark className="size-6" /> },
  contact: { label: t.aPayContact, mark: <span className="grid size-6 place-items-center rounded-[0.5rem] bg-[#25D366] text-[0.8125rem] text-white">☎</span> },
};

function Way({ method }: { method: string | null }) {
  const w = method ? WAYS[method] : null;
  if (!w) return <span className="text-faint">—</span>;
  return (
    <span className="inline-flex items-center gap-2">
      {w.mark} {w.label}
    </span>
  );
}

function Owner({ who }: { who: Who }) {
  return (
    <span className="block text-[0.75rem] font-normal text-muted">
      {who.name || "—"}
      {who.phone && (
        <>
          {" · "}
          <Num>{pretty(who.phone)}</Num>
        </>
      )}
    </span>
  );
}

/** A sum with its unit: «120 د», «47,35 د». */
const Sum = ({ n }: { n: number }) => (
  <>
    {dt(n)} <span className="font-normal text-muted">{t.payCurrency}</span>
  </>
);

/** What is left of what came in once what went out is taken off: +155, −40. Sealed left to right, so the sign stays in front. */
function Left({ n }: { n: number }) {
  // dinars and millimes: no 192.64999 from a subtraction
  const v = Math.round(n * 1000) / 1000;
  return <Num>{`${v > 0 ? "+" : v < 0 ? "−" : ""}${dt(Math.abs(v))}`}</Num>;
}
/** One stretch of time: what is left, large (green above nothing, coral under), what came in and went out under it. */
function Period({ title, inn, out }: { title: string; inn: number; out: number }) {
  const left = inn - out;
  return (
    <div className={`${box} p-5`}>
      <p className="text-[0.875rem] font-bold text-ink">{title}</p>
      <p className={`mt-3 text-[2rem] font-bold leading-none ${left > 0 ? "text-mint" : left < 0 ? "text-coral" : "text-ink"}`}>
        <Left n={left} /> <span className="text-[1rem] font-semibold text-muted">{t.payCurrency}</span>
      </p>
      <p className="mt-1.5 text-[0.75rem] text-muted">الباقي: اللي دخل ناقص اللي خرج</p>
      <div className="mt-4 grid grid-cols-2 gap-3 border-t border-line/80 pt-3">
        <div>
          <span className="block text-[0.75rem] font-semibold text-muted">دخل</span>
          <b className="text-[1rem] text-ink">
            <Sum n={inn} />
          </b>
        </div>
        <div>
          <span className="block text-[0.75rem] font-semibold text-muted">خرج</span>
          <b className="text-[1rem] text-ink">
            <Sum n={out} />
          </b>
        </div>
      </div>
    </div>
  );
}

/**
 * The founder's accounting room. What came in: this month, this year and
 * since the start (the shops' subscriptions, and the lines he wrote himself),
 * the shops paid right now and the months added with no money. What went
 * out, under each of them, and what is left. One line to write a line of
 * either side by hand. The payments owners said are on their way (his two
 * buttons). Then the two books side by side on a wide screen: what came in
 * — every time a shop's access was turned on or stopped, and his own lines,
 * in one order — and what went out. «نزّل Excel» saves either as a
 * spreadsheet.
 */
export default async function AdminPayments() {
  const b = (await call<Books>("admin_ledger")) ?? { today: "", month: 0, year: 0, all: 0, out_month: 0, out_year: 0, out_all: 0, extra_months: 0, paying: 0, rows: [], lines: [], waiting: [] };
  const hand = b.lines ?? [];
  const spent = hand.filter((l) => l.side === "out");
  const income: Income[] = [...b.rows.map((l) => ({ key: `p${l.id}`, at: l.at, plan: l })), ...hand.filter((l) => l.side === "in").map((l) => ({ key: `h${l.id}`, at: l.on, hand: l }))].sort((x, y) =>
    y.at.localeCompare(x.at),
  );

  return (
    <Page
      title="الفلوس"
      hint="كل فلس دخل وكل فلس خرج، والباقي"
      actions={
        <CFile href="/admin/payments/csv">
          <Download className="size-4" /> نزّل Excel
        </CFile>
      }
    >
      {/* three stretches of time, each read the same way: what is left large, what came in and went out under it */}
      <div className="grid gap-4 lg:grid-cols-3">
        <Period title="الشهر هذا" inn={b.month} out={b.out_month} />
        <Period title="العام هذا" inn={b.year} out={b.out_year} />
        <Period title="من الأوّل" inn={b.all} out={b.out_all} />
      </div>
      <div className="mt-4">
        <Stats cols={3}>
          <Stat icon={BadgeCheck} label="محلات خلّصت" value={b.paying} sub="الأبونمان متاعهم يخدم توّا" tone="mint" />
          <Stat icon={Hourglass} label="قالو خلّصنا" value={b.waiting.length} sub={b.waiting.length ? "ثبّت كي توصلك الفلوس" : "حتى حد يستنّى"} tone={b.waiting.length ? "brand" : "ink"} />
          <Stat icon={CalendarPlus} label="شهور زيادة" value={b.extra_months} sub="تعطاو بلا فلوس" />
        </Stats>
      </div>

      <Card className="mt-5" title="زيد سطر" hint="فلوس دخلت ولا خرجت، تكتبها بيدك">
        <AdminBookAdd today={b.today} />
      </Card>

      {b.waiting.length > 0 && (
        <Card className="mt-5" title="قالو خلّصنا" hint="ثبّت كي توصلك الفلوس، والأبونمان يخدم وحدو" pad={false}>
          <Table head={["المحل", "كيفاش خلّص", "شهور", "وقتاش", ""]} words={[1]}>
            {b.waiting.map((w) => (
              <Row key={w.id}>
                <Cell strong>
                  {w.shop.name}
                  <Owner who={w.owner} />
                </Cell>
                <Cell>
                  <Way method={w.method} />
                </Cell>
                <Cell n>{w.months}</Cell>
                <Cell n muted>
                  {when(w.at)}
                </Cell>
                <Cell className="text-end">
                  <AdminPayActions id={w.id} />
                </Cell>
              </Row>
            ))}
          </Table>
        </Card>
      )}

      {/* in and out, side by side on a wide screen */}
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card title="اللي دخل" hint="كل أبونمان خدّمتو، وكل سطر كتبتو" pad={false}>
          {income.length === 0 ? (
            <Empty>مازال حتى فلس ما تسجّل</Empty>
          ) : (
            <Table head={["المحل ولا الحاجة", "شنوّة", "كيفاش خلّص", "نهار", "قدّاش", ""]} words={[1, 2]}>
              {income.map(({ key, plan: l, hand: h }) =>
                l ? (
                  <Row key={key} href={`/admin/shops/${l.shop.id}`}>
                    <Cell strong>
                      {l.shop.name}
                      <Owner who={l.owner} />
                    </Cell>
                    <Cell>
                      <span className="flex flex-wrap items-center gap-1.5 font-semibold text-ink">
                        {l.kind === "end" ? t.aPlanLogEnd : l.kind === "until" ? fill(t.aPlanLogUntil, { date: day(l.until ?? l.at) }) : fill(t.aPlanLogPaid, { d: monthsSaid(l.months ?? 0) })}
                        {l.amount === 0 && <Pill>{t.aPlanExtra}</Pill>}
                      </span>
                      {l.kind === "paid" && l.until && <span className="block text-[0.75rem] text-muted">{fill(t.aPlanPaidUntil, { date: day(l.until) })}</span>}
                      {l.note && <span className="block max-w-[18rem] truncate text-[0.75rem] text-muted">«{l.note}»</span>}
                    </Cell>
                    <Cell>
                      <Way method={l.method} />
                    </Cell>
                    <Cell n muted>
                      {day(l.at)}
                    </Cell>
                    <Cell n strong>
                      {l.amount === null ? <span className="font-normal text-faint">—</span> : <Sum n={l.amount} />}
                    </Cell>
                    <Cell>
                      {/* the subscription's picture, to send the owner */}
                      {(l.kind === "paid" || l.kind === "until") && (
                        <PlanImage plan={{ id: l.id, at: l.at, kind: l.kind, months: l.months, until: l.until, amount: l.amount, method: l.method, shop: l.shop.name, owner: l.owner.name }} />
                      )}
                    </Cell>
                  </Row>
                ) : h ? (
                  // a line by hand: what it was, and its kind
                  <Row key={key}>
                    <Cell strong>
                      <span className="block max-w-[16rem] truncate">{h.what}</span>
                    </Cell>
                    <Cell>
                      <Pill tone="mint">{t.aBookKinds[h.kind] ?? h.kind}</Pill>
                    </Cell>
                    <Cell>
                      <span className="text-faint">—</span>
                    </Cell>
                    <Cell n muted>
                      {day(h.on)}
                    </Cell>
                    <Cell n strong>
                      <Sum n={h.amount} />
                    </Cell>
                    <Cell className="text-end">
                      <AdminBookDelete id={h.id} />
                    </Cell>
                  </Row>
                ) : null,
              )}
            </Table>
          )}
        </Card>

        <Card
          title="اللي خرج"
          hint="المصاريف، كل فلس"
          pad={false}
          actions={
            spent.length > 0 ? (
              <CFile href="/admin/payments/csv?book=out">
                <Download className="size-4" /> Excel
              </CFile>
            ) : undefined
          }
        >
          {spent.length === 0 ? (
            <Empty>مازال حتى مصروف ما تسجّل</Empty>
          ) : (
            <Table head={["على شنوّة", "نهار", "قدّاش", ""]}>
              {spent.map((e) => (
                <Row key={e.id}>
                  <Cell strong>
                    <span className="block max-w-[16rem] truncate">{e.what}</span>
                    <span className="mt-0.5 block">
                      <Pill>{t.aBookKinds[e.kind] ?? e.kind}</Pill>
                    </span>
                  </Cell>
                  <Cell n muted>
                    {day(e.on)}
                  </Cell>
                  <Cell n strong>
                    <Sum n={e.amount} />
                  </Cell>
                  <Cell className="text-end">
                    <AdminBookDelete id={e.id} />
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>
      </div>
    </Page>
  );
}
