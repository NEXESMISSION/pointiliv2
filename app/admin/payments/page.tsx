import Link from "next/link";
import { Receipt, Wallet } from "lucide-react";
import { PaymentActions } from "@/components/admin/AdminActions";
import { PaymentBadge, type AdminPayments } from "@/components/admin/shared";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PAYMENT_METHODS, PLAN_LABEL } from "@/lib/constants";
import { formatDateTime, formatNumber, formatTND } from "@/lib/format";
import { rpc } from "@/lib/session";

export const metadata = { title: "Payments" };

const STATUSES = [
  { key: "pending", label: "Pending" },
  { key: "paid", label: "Paid" },
  { key: "failed", label: "Failed" },
  { key: "cancelled", label: "Cancelled" },
  { key: "all", label: "All" },
];

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = STATUSES.some((s) => s.key === sp.status) ? sp.status! : "pending";
  const { total_paid, items } = await rpc<AdminPayments>("admin_payments", { p_status: status === "all" ? null : status });

  return (
    <div className="animate-fade space-y-4">
      <TopBar back="/admin" title="Payments" subtitle={`${formatNumber(items.length)} ${status === "all" ? (items.length === 1 ? "payment" : "payments") : STATUSES.find((s) => s.key === status)!.label.toLowerCase()}`} large />

      <div className="flex items-center gap-3 rounded-3xl bg-success-50 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-success-600">
          <Wallet className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight text-ink tabular">{formatTND(total_paid)}</p>
          <p className="text-xs font-medium text-muted">Total paid, all time</p>
        </div>
      </div>

      <Segmented active={status} items={STATUSES.map((s) => ({ key: s.key, label: s.label, href: `/admin/payments?status=${s.key}` }))} />

      {items.length === 0 ? (
        <EmptyState icon={<Receipt className="size-8" />} title={status === "pending" ? "All caught up" : "No payments"}>
          {status === "pending" ? "There are no payments waiting for confirmation." : "No payment matches this filter."}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line/80 overflow-hidden">
          {items.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="font-mono text-sm font-semibold text-ink">{p.payment_reference}</span>
                  <PaymentBadge status={p.status} />
                </div>
                <Link href={`/admin/businesses/${p.business_id}`} className="mt-0.5 block truncate text-[15px] font-medium text-body hover:text-brand-700">
                  {p.business_name}
                </Link>
                <p className="text-sm text-muted">
                  {PLAN_LABEL[p.plan] ?? p.plan} · {PAYMENT_METHODS[p.method as keyof typeof PAYMENT_METHODS] ?? p.method} · {formatDateTime(p.created_at)}
                </p>
                {p.notes && <p className="mt-0.5 text-xs text-faint">{p.notes}</p>}
              </div>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <p className="text-lg font-bold text-ink tabular lg:w-28 lg:text-right">{formatTND(p.amount)}</p>
                {p.status === "pending" && <PaymentActions id={p.id} businessName={p.business_name} plan={p.plan} amount={p.amount} />}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
