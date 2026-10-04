import { AdminPayActions } from "@/components/AdminPayActions";
import { Card, Cell, Empty, Lat, Num, Page, Pill, Row, Stat, Stats, Table } from "@/components/console";
import { BankMark, CardMark, CashMark, D17Mark, PostMark } from "@/components/PayLogos";
import { pretty } from "@/lib/phone";
import { call } from "@/lib/supabase";
import { fill, t } from "@/lib/t";

export const metadata = { title: "الخلاص", robots: { index: false } };

type Payment = {
  id: string;
  method: "card" | "d17" | "virement" | "versement" | "mandat" | "contact";
  amount: number;
  months: number;
  status: "pending" | "paid" | "refused";
  at: string;
  decided_at: string | null;
  shop: { id: string; name: string; paid_until: string | null };
  owner: { name: string | null; phone: string | null; tester: boolean };
};

const when = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(iso));
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));
const METHOD = {
  card: { label: t.payCard, mark: <CardMark className="size-7" /> },
  d17: { label: t.payD17, mark: <D17Mark className="size-7" /> },
  virement: { label: t.payVirement, mark: <BankMark className="size-7" /> },
  versement: { label: t.payVersement, mark: <CashMark className="size-7" /> },
  mandat: { label: t.payMandat, mark: <PostMark className="size-7" /> },
  contact: { label: t.aPayContact, mark: <span className="grid size-7 place-items-center rounded-[0.5rem] bg-[#25D366] text-[0.875rem] text-white">☎</span> },
};

/**
 * The owners who said they paid, the newest first: the shop, the way, the
 * months (15 when it came within the offer's 48 hours) — and, for those
 * waiting, the founder's two buttons. «وصلت» starts the shop's year.
 */
export default async function AdminPayments() {
  const rows = (await call<Payment[]>("admin_payments")) ?? [];
  const real = rows.filter((r) => !r.owner.tester);
  const waiting = real.filter((r) => r.status === "pending");
  const paid = real.filter((r) => r.status === "paid");

  return (
    <Page title={t.aPayments} hint={t.aPaymentsHint}>
      <Stats cols={3}>
        <Stat label={t.aPayPending} value={waiting.length} tone={waiting.length ? "coral" : "ink"} />
        <Stat label={t.aPayPaid} value={paid.length} tone="mint" />
        <Stat label={t.aPayIncome} value={paid.reduce((s, r) => s + r.amount, 0)} sub={t.payCurrency} />
      </Stats>

      <Card className="mt-5" pad={false}>
        {rows.length === 0 ? (
          <Empty>{t.aPayEmpty}</Empty>
        ) : (
          <Table head={["المحل", "كيفاش", "شهور", "وقتاش", ""]}>
            {rows.map((r) => (
              <Row key={r.id}>
                <Cell strong>
                  <span className="flex items-center gap-2">
                    {r.shop.name}
                    {r.owner.tester && <Pill tone="ink">{t.aTester}</Pill>}
                  </span>
                  <span className="block text-[0.75rem] font-normal text-muted">
                    {r.owner.name || "—"}
                    {r.owner.phone && (
                      <>
                        {" · "}
                        <Num>{pretty(r.owner.phone)}</Num>
                      </>
                    )}
                  </span>
                </Cell>
                <Cell>
                  <span className="flex items-center justify-end gap-2">
                    {METHOD[r.method].label} {METHOD[r.method].mark}
                  </span>
                </Cell>
                <Cell n>{r.months}</Cell>
                <Cell n muted>
                  {when(r.at)}
                </Cell>
                <Cell className="text-end">
                  {r.status === "pending" ? (
                    <AdminPayActions id={r.id} />
                  ) : r.status === "paid" ? (
                    <span className="inline-flex flex-col items-end gap-0.5">
                      <Pill tone="mint">{t.aPayPaid}</Pill>
                      {r.shop.paid_until && (
                        <span className="text-[0.75rem] text-muted">{fill(t.payPaidUntil, { date: day(r.shop.paid_until) })}</span>
                      )}
                    </span>
                  ) : (
                    <Pill tone="coral">{t.aPayRefused}</Pill>
                  )}
                </Cell>
              </Row>
            ))}
          </Table>
        )}
      </Card>
      <p className="mt-3 text-[0.8125rem] text-muted">
        <Lat>Dodo Payments · D17 · Virement · Versement · Mandat</Lat>
      </p>
    </Page>
  );
}
