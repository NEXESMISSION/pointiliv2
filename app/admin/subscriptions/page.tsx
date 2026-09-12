import Link from "next/link";
import { CreditCard } from "lucide-react";
import { PaymentActions } from "@/components/admin/AdminActions";
import { BusinessStatusBadge, type AdminSubscriptionRow } from "@/components/admin/shared";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatTND, timeAgo } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.subscriptions.title };
}

const KEYS = ["all", "active", "expiring_soon", "expired", "cancelled"] as const;

export default async function SubscriptionsPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter = (KEYS as readonly string[]).includes(sp.filter ?? "") ? sp.filter! : "all";
  const items = await rpc<AdminSubscriptionRow[]>("admin_subscriptions", { p_filter: filter });
  const { t, locale, count, fill } = await getI18n();
  const w = t.admin.subscriptions;
  const plans = t.data.plans as Record<string, string>;
  const planName = (plan: string | null | undefined, fallback: string) => (plan && plans[plan]) || fallback;
  const filterLabel: Record<string, string> = { all: t.admin.all, ...w.filters };

  return (
    <div className="animate-fade space-y-4">
      <TopBar back="/admin" title={w.title} subtitle={count(w.count, items.length)} large />
      <Segmented
        active={filter}
        items={KEYS.map((key) => ({ key, label: filterLabel[key]!, href: key === "all" ? "/admin/subscriptions" : `/admin/subscriptions?filter=${key}` }))}
      />

      {items.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-8" />} title={w.emptyTitle}>
          {w.emptyBody}
        </EmptyState>
      ) : (
        <div className="space-y-2.5">
          {items.map((row) => {
            const s = row.subscription;
            const stripe = s.status === "expiring_soon" ? "bg-warning-500" : s.status === "expired" || s.status === "none" ? "bg-danger-500" : null;
            return (
              <Card key={row.business_id} className="relative overflow-hidden">
                {stripe && <span className={`absolute inset-y-0 start-0 w-1.5 ${stripe}`} aria-hidden />}
                <div className="flex flex-col gap-3 px-4 py-3.5 ps-5 lg:flex-row lg:items-center">
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <Link href={`/admin/businesses/${row.business_id}`} className="min-w-0 truncate text-[15px] font-semibold text-ink hover:text-brand-700">
                        {row.business_name}
                      </Link>
                      <SubscriptionBadge status={s.status} plan={s.plan} />
                      <BusinessStatusBadge status={row.business_status} />
                    </div>
                    <p className="mt-0.5 truncate text-sm text-muted">
                      {row.owner_phone ? <span dir="ltr">{formatPhone(row.owner_phone)}</span> : "—"} · {planName(s.plan, t.data.plans.none)}
                    </p>
                  </div>

                  <div className="text-sm lg:w-44 lg:text-end">
                    {s.expires_at ? (
                      <>
                        <p className="font-medium text-ink">
                          {fill(s.open ? w.expiresOn : w.expiredOn, { date: formatDate(s.expires_at, locale) })}
                        </p>
                        <p className={`text-xs ${s.status === "expiring_soon" ? "font-semibold text-warning-700" : s.open ? "text-muted" : "text-danger-600"}`}>
                          {s.open ? count(t.formats.daysLeft, s.days_left) : timeAgo(s.expires_at, locale)}
                        </p>
                      </>
                    ) : (
                      <p className="text-muted">{w.noPlanYet}</p>
                    )}
                  </div>

                  {row.pending_payment && (
                    <div className="flex flex-col gap-2 rounded-2xl bg-warning-50 p-3 sm:flex-row sm:items-center lg:w-auto">
                      <div className="min-w-0 flex-1 text-sm">
                        <p className="font-semibold text-warning-700">
                          {fill(w.pending, {
                            amount: formatTND(row.pending_payment.amount, locale),
                            plan: planName(row.pending_payment.plan, row.pending_payment.plan),
                          })}
                        </p>
                        <p className="font-mono text-xs text-body">
                          <span dir="ltr">{row.pending_payment.payment_reference}</span>
                        </p>
                      </div>
                      <PaymentActions
                        id={row.pending_payment.id}
                        businessName={row.business_name}
                        planLabel={planName(row.pending_payment.plan, row.pending_payment.plan)}
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
