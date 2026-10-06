import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { AdminBookAdd, AdminBookDelete } from "@/components/AdminBooks";
import { AdminPayActions } from "@/components/AdminPayActions";
import { Card, Cell, CFile, Empty, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { BankMark, CardMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { pretty } from "@/lib/phone";
import { call } from "@/lib/supabase";
import { fill, monthsSaid, t } from "@/lib/t";

export const metadata = { title: "الحسابات", robots: { index: false } };

type Who = { name: string | null; phone: string | null };
type Line = {
  id: number;
  at: string;
  kind: "paid" | "until" | "end";
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
const leftTone = (n: number) => (n > 0 ? "mint" : n < 0 ? "coral" : "ink");

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
      title={t.aPayments}
      hint={t.aLedgerHint}
      actions={
        <CFile href="/admin/payments/csv">
          <Download className="size-4" /> {t.aLedgerExport}
        </CFile>
      }
    >
      <Stats cols={5}>
        <Stat label={t.aLedgerMonth} value={dt(b.month)} sub={t.payCurrency} tone="mint" />
        <Stat label={t.aLedgerYear} value={dt(b.year)} sub={t.payCurrency} />
        <Stat label={t.aLedgerAll} value={dt(b.all)} sub={t.payCurrency} />
        <Stat label={t.aLedgerPaying} value={b.paying} sub={t.aLedgerPayingSub} tone="brand" />
        <Stat label={t.aLedgerExtra} value={b.extra_months} sub={t.aLedgerExtraSub} />
      </Stats>
      {/* the other side, under the same columns: out this month, this year, since the start — then what is left */}
      <div className="mt-3">
        <Stats cols={5}>
          <Stat label={t.aOutMonth} value={dt(b.out_month)} sub={t.payCurrency} tone="coral" />
          <Stat label={t.aOutYear} value={dt(b.out_year)} sub={t.payCurrency} />
          <Stat label={t.aOutAll} value={dt(b.out_all)} sub={t.payCurrency} />
          <Stat label={t.aNetMonth} value={<Left n={b.month - b.out_month} />} sub={t.aNetSub} tone={leftTone(b.month - b.out_month)} />
          <Stat label={t.aNetYear} value={<Left n={b.year - b.out_year} />} sub={t.aNetSub} tone={leftTone(b.year - b.out_year)} />
        </Stats>
      </div>

      <Card className="mt-5" title={t.aBookTitle} hint={t.aBookHint}>
        <AdminBookAdd today={b.today} />
      </Card>

      {b.waiting.length > 0 && (
        <Card className="mt-5" title={t.aLedgerWaiting} hint={t.aPaymentsHint} pad={false}>
          <Table head={["المحل", "كيفاش", "شهور", "وقتاش", ""]} words={[1]}>
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
        <Card title={t.aLedgerBook} pad={false}>
          {income.length === 0 ? (
            <Empty>{t.aLedgerEmpty}</Empty>
          ) : (
            <Table head={["المحل", "شنوّة", "كيفاش", "نهار", "قدّاش", ""]} words={[1, 2]}>
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
                    <Cell>{""}</Cell>
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
          title={t.aBookOutTitle}
          hint={t.aBookOutHint}
          pad={false}
          actions={
            spent.length > 0 ? (
              <CFile href="/admin/payments/csv?book=out">
                <Download className="size-4" /> {t.aLedgerExport}
              </CFile>
            ) : undefined
          }
        >
          {spent.length === 0 ? (
            <Empty>{t.aBookOutEmpty}</Empty>
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
