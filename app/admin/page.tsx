import Link from "next/link";
import { BadgeCheck, ChevronRight, CreditCard, Stamp, Store, Users, Wallet } from "lucide-react";
import { ActivityIcon, activityLabel, type AdminOverview } from "@/components/admin/shared";
import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/Stat";
import { formatNumber, formatTND, timeAgo } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.admin.dashboard };
}

export default async function AdminDashboard() {
  const o = await rpc<AdminOverview>("admin_overview");
  const { t, locale, count, fill } = await getI18n();
  const d = t.admin.dashboard;
  // two alerts sit side by side so the screen never grows a second banner row
  const bothAlerts = o.pending_payments > 0 && o.expiring_soon > 0;

  return (
    <div className="animate-fade space-y-3">
      <TopBar title={d.title} subtitle={d.subtitle} large />

      <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-3">
        <StatCard
          label={d.businesses}
          value={formatNumber(o.businesses, locale)}
          icon={<Store className="size-5" />}
          tint="brand"
          sub={o.suspended_businesses ? count(d.suspendedSub, o.suspended_businesses) : undefined}
        />
        <StatCard label={d.activeBusinesses} value={formatNumber(o.active_businesses, locale)} icon={<BadgeCheck className="size-5" />} tint="green" />
        <StatCard
          label={d.customers}
          value={formatNumber(o.customers, locale)}
          icon={<Users className="size-5" />}
          tint="rose"
          sub={fill(d.newThisMonth, { n: formatNumber(o.new_customers_month, locale) })}
        />
        <StatCard
          label={d.stampsToday}
          value={formatNumber(o.stamps_today, locale)}
          icon={<Stamp className="size-5" />}
          tint="amber"
          sub={fill(d.stampsAllTime, { n: formatNumber(o.stamps_total, locale) })}
        />
        <StatCard
          label={d.activeSubscriptions}
          value={formatNumber(o.active_subscriptions, locale)}
          icon={<CreditCard className="size-5" />}
          tint="white"
          sub={fill(d.trialsSub, { n: formatNumber(o.trials, locale) })}
        />
        <StatCard
          label={d.revenue}
          value={formatTND(o.revenue, locale)}
          icon={<Wallet className="size-5" />}
          tint="white"
          sub={fill(d.revenueThisMonth, { amount: formatTND(o.revenue_month, locale) })}
        />
      </div>

      {(o.pending_payments > 0 || o.expiring_soon > 0) && (
        <div className={`grid gap-2.5 ${bothAlerts ? "grid-cols-2" : ""}`}>
          {o.pending_payments > 0 && (
            <Link href="/admin/payments?status=pending" className="block rounded-2xl transition active:scale-[0.99]">
              <Alert tone="warning" title={count(d.paymentsWaiting, o.pending_payments)} className="items-center">
                <span className="flex items-center gap-1 font-medium">
                  {d.reviewPayments} <ChevronRight className="rtl:-scale-x-100 size-4" />
                </span>
              </Alert>
            </Link>
          )}
          {o.expiring_soon > 0 && (
            <Link href="/admin/subscriptions?filter=expiring_soon" className="block rounded-2xl transition active:scale-[0.99]">
              <Alert tone="info" title={count(d.expiringSoon, o.expiring_soon)} className="items-center">
                <span className="flex items-center gap-1 font-medium">
                  {d.seeRenewals} <ChevronRight className="rtl:-scale-x-100 size-4" />
                </span>
              </Alert>
            </Link>
          )}
        </div>
      )}

      <section>
        <SectionTitle
          action={
            <Link href="/admin/activity" className="-my-2 flex h-11 items-center px-2 text-sm font-semibold text-brand-700">
              {t.common.seeAll}
            </Link>
          }
        >
          {d.recentActivity}
        </SectionTitle>
        {o.recent.length === 0 ? (
          <EmptyState title={d.emptyTitle}>{d.emptyBody}</EmptyState>
        ) : (
          <Card className="divide-y divide-line/80 overflow-hidden">
            {/* only what fits on the screen — the rest is one tap away */}
            {o.recent.slice(0, bothAlerts ? 2 : 3).map((a) => {
              const inner = (
                <>
                  <ActivityIcon type={a.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{activityLabel(t.admin.activity.types, a.type)}</span>
                    <span className="block truncate text-sm text-muted">
                      {a.business_name ?? "Pointili"}
                      {a.customer_code != null && (
                        <>
                          {" · "}
                          <span dir="ltr">#{a.customer_code}</span>
                        </>
                      )}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">{timeAgo(a.at, locale)}</span>
                </>
              );
              const cls = "flex items-center gap-2.5 px-3.5 py-2";
              return a.business_id ? (
                <Link key={a.id} href={`/admin/businesses/${a.business_id}`} className={`${cls} transition hover:bg-canvas/70`}>
                  {inner}
                </Link>
              ) : (
                <div key={a.id} className={cls}>
                  {inner}
                </div>
              );
            })}
          </Card>
        )}
      </section>
    </div>
  );
}
