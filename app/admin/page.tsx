import Link from "next/link";
import { BadgeCheck, ChevronRight, CreditCard, Stamp, Store, Users, Wallet } from "lucide-react";
import { ActivityIcon, activityLabel, type AdminOverview } from "@/components/admin/shared";
import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/Stat";
import { formatNumber, formatTND, timeAgo } from "@/lib/format";
import { rpc } from "@/lib/session";

export const metadata = { title: "Dashboard" };

export default async function AdminDashboard() {
  const o = await rpc<AdminOverview>("admin_overview");

  return (
    <div className="animate-fade space-y-6">
      <TopBar title="Pointidi Admin" subtitle="Everything happening on the platform" large />

      <div className="grid grid-cols-2 gap-3 lg:grid-cols-3">
        <StatCard label="Businesses" value={formatNumber(o.businesses)} icon={<Store className="size-5" />} tint="brand" sub={o.suspended_businesses ? `${o.suspended_businesses} suspended` : undefined} />
        <StatCard label="Active businesses" value={formatNumber(o.active_businesses)} icon={<BadgeCheck className="size-5" />} tint="green" />
        <StatCard label="Customers" value={formatNumber(o.customers)} icon={<Users className="size-5" />} tint="rose" sub={`+${formatNumber(o.new_customers_month)} this month`} />
        <StatCard label="Stamps today" value={formatNumber(o.stamps_today)} icon={<Stamp className="size-5" />} tint="amber" sub={`${formatNumber(o.stamps_total)} all time`} />
        <StatCard label="Active subscriptions" value={formatNumber(o.active_subscriptions)} icon={<CreditCard className="size-5" />} tint="white" sub={`+${formatNumber(o.trials)} trials`} />
        <StatCard label="Revenue" value={formatTND(o.revenue)} icon={<Wallet className="size-5" />} tint="white" sub={`this month: ${formatTND(o.revenue_month)}`} />
      </div>

      {(o.pending_payments > 0 || o.expiring_soon > 0) && (
        <div className="grid gap-3 lg:grid-cols-2">
          {o.pending_payments > 0 && (
            <Link href="/admin/payments?status=pending" className="block rounded-2xl transition active:scale-[0.99]">
              <Alert tone="warning" title={`${o.pending_payments} payment${o.pending_payments === 1 ? "" : "s"} waiting for confirmation`} className="items-center">
                <span className="flex items-center gap-1 font-medium">
                  Review payments <ChevronRight className="size-4" />
                </span>
              </Alert>
            </Link>
          )}
          {o.expiring_soon > 0 && (
            <Link href="/admin/subscriptions?filter=expiring_soon" className="block rounded-2xl transition active:scale-[0.99]">
              <Alert tone="info" title={`${o.expiring_soon} subscription${o.expiring_soon === 1 ? "" : "s"} expiring within 7 days`} className="items-center">
                <span className="flex items-center gap-1 font-medium">
                  See renewals <ChevronRight className="size-4" />
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
              See all
            </Link>
          }
        >
          Recent activity
        </SectionTitle>
        {o.recent.length === 0 ? (
          <EmptyState title="No activity yet">Stamps, new businesses and payments will show up here.</EmptyState>
        ) : (
          <Card className="divide-y divide-line/80 overflow-hidden">
            {o.recent.map((a) => {
              const inner = (
                <>
                  <ActivityIcon type={a.type} />
                  <span className="min-w-0 flex-1">
                    <span className="block truncate text-[15px] font-medium text-ink">{activityLabel(a.type)}</span>
                    <span className="block truncate text-sm text-muted">
                      {a.business_name ?? "Pointidi"}
                      {a.customer_code != null && ` · #${a.customer_code}`}
                    </span>
                  </span>
                  <span className="shrink-0 text-xs text-faint">{timeAgo(a.at)}</span>
                </>
              );
              const cls = "flex min-h-16 items-center gap-3 px-4 py-3";
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
