import Link from "next/link";
import { Receipt, Wallet } from "lucide-react";
import { PaymentActions } from "@/components/admin/AdminActions";
import { PaymentBadge, type AdminPayments } from "@/components/admin/shared";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDateTime, formatNumber, formatTND } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.payments.title };
}

const KEYS = ["pending", "paid", "failed", "cancelled", "all"] as const;

export default async function PaymentsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const status = (KEYS as readonly string[]).includes(sp.status ?? "") ? sp.status! : "pending";
  const { total_paid, items } = await rpc<AdminPayments>("admin_payments", { p_status: status === "all" ? null : status });
  const { t, locale, count, fill } = await getI18n();
  const w = t.admin.payments;
  const plans = t.data.plans as Record<string, string>;
  const methods = t.data.payments as Record<string, string>;
  const planName = (plan: string) => plans[plan] ?? plan;
  const filterLabel: Record<string, string> = { ...t.data.paymentStatus, all: t.admin.all };
  const byStatus: Record<string, string> = {
    pending: w.countPending,
    paid: w.countPaid,
    failed: w.countFailed,
    cancelled: w.countCancelled,
  };
  const n = formatNumber(items.length, locale);
  const subtitle = status === "all" ? count(w.count, items.length) : fill(byStatus[status]!, { n });

  return (
    <div className="animate-fade space-y-4">
      <TopBar back="/admin" title={w.title} subtitle={subtitle} large />

      <div className="flex items-center gap-3 rounded-3xl bg-success-50 p-4">
        <span className="grid size-11 shrink-0 place-items-center rounded-2xl bg-white text-success-600">
          <Wallet className="size-5" />
        </span>
        <div className="min-w-0">
          <p className="text-2xl font-bold tracking-tight text-ink tabular">{formatTND(total_paid, locale)}</p>
          <p className="text-xs font-medium text-muted">{w.totalPaid}</p>
        </div>
      </div>

      <Segmented active={status} items={KEYS.map((key) => ({ key, label: filterLabel[key]!, href: `/admin/payments?status=${key}` }))} />

      {items.length === 0 ? (
        <EmptyState icon={<Receipt className="size-8" />} title={status === "pending" ? w.emptyPendingTitle : w.emptyTitle}>
          {status === "pending" ? w.emptyPendingBody : w.emptyBody}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line/80 overflow-hidden">
          {items.map((p) => (
            <div key={p.id} className="flex flex-col gap-3 px-4 py-3.5 lg:flex-row lg:items-center">
              <div className="min-w-0 flex-1">
                <div className="flex flex-wrap items-center gap-2">
                  <span dir="ltr" className="font-mono text-sm font-semibold text-ink">
                    {p.payment_reference}
                  </span>
                  <PaymentBadge status={p.status} />
                </div>
                <Link href={`/admin/businesses/${p.business_id}`} className="mt-0.5 block truncate text-[15px] font-medium text-body hover:text-brand-700">
                  {p.business_name}
                </Link>
                <p className="text-sm text-muted">
                  {planName(p.plan)} · {methods[p.method] ?? p.method} · {formatDateTime(p.created_at, locale)}
                </p>
                {p.notes && <p className="mt-0.5 text-xs text-faint">{p.notes}</p>}
              </div>
              <div className="flex items-center justify-between gap-3 lg:justify-end">
                <p className="text-lg font-bold text-ink tabular lg:w-28 lg:text-end">{formatTND(p.amount, locale)}</p>
                {p.status === "pending" && <PaymentActions id={p.id} businessName={p.business_name} planLabel={planName(p.plan)} amount={p.amount} />}
              </div>
            </div>
          ))}
        </Card>
      )}
    </div>
  );
}
