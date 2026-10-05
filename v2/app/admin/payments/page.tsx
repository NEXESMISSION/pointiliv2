import type { ReactNode } from "react";
import { Download } from "lucide-react";
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
type Books = { month: number; year: number; all: number; extra_months: number; paying: number; rows: Line[]; waiting: Waiting[] };

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: TZ }).format(new Date(iso));
const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));
// 1 440, not 1440: a sum read at a glance
const dt = (n: number) => new Intl.NumberFormat("fr-TN").format(n);
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

/**
 * The founder's books: what came in this month, this year and since the
 * start, the shops paid right now and the months added with no money; the
 * payments owners said are on their way (his two buttons); then every time a
 * shop's access was turned on or stopped, the newest first, with what came
 * in. «نزّل Excel» saves the same lines as a spreadsheet.
 */
export default async function AdminPayments() {
  const b = (await call<Books>("admin_ledger")) ?? { month: 0, year: 0, all: 0, extra_months: 0, paying: 0, rows: [], waiting: [] };

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

      <Card className="mt-5" title={t.aLedgerBook} pad={false}>
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
    </Page>
  );
}
