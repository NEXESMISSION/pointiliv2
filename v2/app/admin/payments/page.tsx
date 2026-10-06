import type { ReactNode } from "react";
import { Download } from "lucide-react";
import { AdminExpenseAdd, AdminExpenseDelete } from "@/components/AdminExpenses";
import { AdminPayActions } from "@/components/AdminPayActions";
import { Card, Cell, CFile, Empty, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { BankMark, CardMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { pretty } from "@/lib/phone";
import { call } from "@/lib/supabase";
import { fill, monthsSaid, t } from "@/lib/t";

export const metadata = { title: "الخلاص", robots: { index: false } };

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
type Spent = { id: number; on: string; amount: number; what: string; kind: string };
type Books = {
  month: number;
  year: number;
  all: number;
  extra_months: number;
  paying: number;
  rows: Line[];
  waiting: Waiting[];
  today: string;
  spent_month: number;
  spent_year: number;
  spent_all: number;
  expenses: Spent[];
};

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

/** What is left of what came in once what went out is taken off: +155, −40. Sealed left to right, so the sign stays in front. */
function Left({ n }: { n: number }) {
  // dinars and millimes: no 192.64999 from a subtraction
  const v = Math.round(n * 1000) / 1000;
  return <Num>{`${v > 0 ? "+" : v < 0 ? "−" : ""}${dt(Math.abs(v))}`}</Num>;
}
const leftTone = (n: number) => (n > 0 ? "mint" : n < 0 ? "coral" : "ink");

/**
 * The founder's books, both sides. What came in: this month, this year and
 * since the start, the shops paid right now and the months added with no
 * money. What went out, under each of them: the business's own expenses —
 * and what is left. The payments owners said are on their way (his two
 * buttons); then the two lists side by side on a wide screen: every time a
 * shop's access was turned on or stopped, with what came in, and every
 * expense, added from the line above its list. «نزّل Excel» saves either
 * list as a spreadsheet.
 */
export default async function AdminPayments() {
  const b = (await call<Books>("admin_ledger")) ?? { month: 0, year: 0, all: 0, extra_months: 0, paying: 0, rows: [], waiting: [], today: "", spent_month: 0, spent_year: 0, spent_all: 0, expenses: [] };
  const expenses = b.expenses ?? [];

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
          <Stat label={t.aExpMonth} value={dt(b.spent_month ?? 0)} sub={t.payCurrency} tone="coral" />
          <Stat label={t.aExpYear} value={dt(b.spent_year ?? 0)} sub={t.payCurrency} />
          <Stat label={t.aExpAll} value={dt(b.spent_all ?? 0)} sub={t.payCurrency} />
          <Stat label={t.aNetMonth} value={<Left n={b.month - (b.spent_month ?? 0)} />} sub={t.aNetSub} tone={leftTone(b.month - (b.spent_month ?? 0))} />
          <Stat label={t.aNetYear} value={<Left n={b.year - (b.spent_year ?? 0)} />} sub={t.aNetSub} tone={leftTone(b.year - (b.spent_year ?? 0))} />
        </Stats>
      </div>

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

      {/* in and out, side by side on a wide screen; on a narrow one the expenses come first (their line to add one is the thing to reach) */}
      <div className="mt-5 grid items-start gap-5 xl:grid-cols-[1.35fr_1fr]">
        <Card className="order-2 xl:order-1" title={t.aLedgerBook} pad={false}>
          {b.rows.length === 0 ? (
            <Empty>{t.aLedgerEmpty}</Empty>
          ) : (
            <Table head={["المحل", "شنوّة", "كيفاش", "نهار", "قدّاش"]} words={[1, 2]}>
              {b.rows.map((l) => (
                <Row key={l.id} href={`/admin/shops/${l.shop.id}`}>
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
                    {l.amount === null ? (
                      <span className="font-normal text-faint">—</span>
                    ) : (
                      <>
                        {dt(l.amount)} <span className="font-normal text-muted">{t.payCurrency}</span>
                      </>
                    )}
                  </Cell>
                </Row>
              ))}
            </Table>
          )}
        </Card>

        <Card
          className="order-1 xl:order-2"
          title={t.aExpTitle}
          hint={t.aExpHint}
          pad={false}
          actions={
            expenses.length > 0 ? (
              <CFile href="/admin/payments/csv?book=expenses">
                <Download className="size-4" /> {t.aLedgerExport}
              </CFile>
            ) : undefined
          }
        >
          <AdminExpenseAdd today={b.today} />
          {expenses.length === 0 ? (
            <Empty>{t.aExpEmpty}</Empty>
          ) : (
            <Table head={["على شنوّة", "نهار", "قدّاش", ""]}>
              {expenses.map((e) => (
                <Row key={e.id}>
                  <Cell strong>
                    <span className="block max-w-[16rem] truncate">{e.what}</span>
                    <span className="mt-0.5 block">
                      <Pill>{t.aExpKinds[e.kind] ?? e.kind}</Pill>
                    </span>
                  </Cell>
                  <Cell n muted>
                    {day(e.on)}
                  </Cell>
                  <Cell n strong>
                    {dt(e.amount)} <span className="font-normal text-muted">{t.payCurrency}</span>
                  </Cell>
                  <Cell className="text-end">
                    <AdminExpenseDelete id={e.id} />
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
