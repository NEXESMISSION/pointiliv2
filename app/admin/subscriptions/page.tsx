import Link from "next/link";
import { CreditCard } from "lucide-react";
import { PaymentActions } from "@/components/admin/AdminActions";
import { BusinessStatusBadge, type AdminSubscriptionRow } from "@/components/admin/shared";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PLAN_LABEL } from "@/lib/constants";
import { formatDate, formatNumber, formatTND, timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export const metadata = { title: "Subscriptions" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "expiring_soon", label: "Expiring soon" },
  { key: "expired", label: "Expired" },
  { key: "cancelled", label: "Cancelled" },
];

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "all";
  const items = await rpc<AdminSubscriptionRow[]>("admin_subscriptions", { p_filter: filter });

  return (
    <div className="animate-fade space-y-4">
      <TopBar back="/admin" title="Subscriptions" subtitle={`${formatNumber(items.length)} business${items.length === 1 ? "" : "es"}`} large />
      <Segmented active={filter} items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: f.key === "all" ? "/admin/subscriptions" : `/admin/subscriptions?filter=${f.key}` }))} />

      {items.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-8" />} title="Nothing here">
          No subscription matches this filter.
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {items.map((row) => {
            const s = row.subscription;
            const stripe = s.status === "expiring_soon" ? "bg-warning-500" : s.status === "expired" || s.status === "none" ? "bg-danger-500" : null;
            return (
              <Card key={row.business_id} className="relative overflow-hidden">
                {stripe && <span className={`absolute inset-y-0 left-0 w-1.5 ${stripe}`} aria-hidden />}
                <div className="flex flex-col gap-3 px-4 py-3.5 pl-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/businesses/${row.business_id}`} className="min-w-0 truncate text-[15px] font-semibold text-ink hover:text-brand-700">
                        {row.business_name}
                      </Link>
                      <SubscriptionBadge status={s.status} plan={s.plan} />
                      <BusinessStatusBadge status={row.business_status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {row.owner_phone ? formatPhone(row.owner_phone) : "—"} · {PLAN_LABEL[s.plan ?? ""] ?? "No plan"}
                    </p>
                  </div>

                  <div className="text-sm lg:w-44 lg:text-right">
                    {s.expires_at ? (
                      <>
                        <p className="font-medium text-ink">
                          {s.open ? "Expires" : "Expired"} {formatDate(s.expires_at)}
                        </p>
                        <p className={`text-xs ${s.status === "expiring_soon" ? "font-semibold text-warning-700" : s.open ? "text-muted" : "text-danger-600"}`}>
                          {s.open ? `${s.days_left} day${s.days_left === 1 ? "" : "s"} left` : timeAgo(s.expires_at)}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted">No plan yet</p>
                    )}
                  </div>

                  {row.pending_payment && (
                    <div className="flex flex-col gap-2 rounded-2xl bg-warning-50 p-3 sm:flex-row sm:items-center lg:w-auto">
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold text-warning-700">
                          Pending · {formatTND(row.pending_payment.amount)} · {PLAN_LABEL[row.pending_payment.plan] ?? row.pending_payment.plan}
                        </p>
                        <p className="font-mono text-xs text-body">{row.pending_payment.payment_reference}</p>
                      </div>
                      <PaymentActions
                        id={row.pending_payment.id}
                        businessName={row.business_name}
                        plan={row.pending_payment.plan}
                        amount={row.pending_payment.amount}
                        confirmOnly
                      />
                    </div>
                  )}
                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
