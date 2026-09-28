import Link from "next/link";
import { CreditCard, Receipt } from "lucide-react";
import { BusinessStatusBadge, type AdminSubscriptionRow } from "@/components/admin/shared";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, timeAgo } from "@/lib/format";
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
    <div className="animate-fade space-y-2.5">
      {/* one place for money: the plans here, what was paid one tap away */}
      <TopBar
        back="/admin"
        title={w.title}
        subtitle={count(w.count, items.length)}
        large
        action={
          <Link href="/admin/payments" className="flex h-9 items-center gap-1.5 rounded-full bg-white px-3 text-[13px] font-semibold text-ink ring-1 ring-inset ring-line hover:bg-canvas">
            <Receipt className="size-4 text-muted" />
            {t.nav.admin.payments}
          </Link>
        }
      />
      <Segmented
        active={filter}
        items={KEYS.map((key) => ({ key, label: filterLabel[key]!, href: key === "all" ? "/admin/subscriptions" : `/admin/subscriptions?filter=${key}` }))}
      />

      {items.length === 0 ? (
        <EmptyState icon={<CreditCard className="size-8" />} title={w.emptyTitle}>
          {w.emptyBody}
        </EmptyState>
      ) : (
        /* the list is the only thing that scrolls, and only inside its own frame */
        <div className="max-h-[calc(100dvh-17rem)] space-y-2 overflow-y-auto overscroll-contain lg:max-h-none">
          {items.map((row) => {
            const s = row.subscription;
            const stripe = s.status === "expiring_soon" ? "bg-warning-500" : s.status === "expired" || s.status === "none" ? "bg-danger-500" : null;
            return (
              <Card key={row.business_id} className="relative overflow-hidden">
                {stripe && <span className={`absolute inset-y-0 start-0 w-1.5 ${stripe}`} aria-hidden />}
                <div className="flex flex-col gap-2 px-3.5 py-2.5 ps-4.5 lg:flex-row lg:items-center">
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

                </div>
              </Card>
            );
          })}
        </div>
      )}
    </div>
  );
}
