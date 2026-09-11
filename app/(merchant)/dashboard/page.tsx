import Link from "next/link";
import { ChevronRight, CreditCard, Gift, QrCode, RefreshCw, Ticket, Users } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { ActivityRow } from "@/components/merchant/ActivityRow";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { buttonClass } from "@/components/ui/button-styles";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { StatCard } from "@/components/ui/Stat";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { requireMerchant, rpc } from "@/lib/session";
import { formatNumber, greeting } from "@/lib/format";
import { PLAN_LABEL } from "@/lib/constants";
import type { ActivityItem } from "@/lib/types";

export const metadata = { title: "Dashboard" };

type Dashboard = {
  customers: number;
  stamps_this_month: number;
  stamps_today: number;
  rewards_redeemed: number;
  returning_rate: number;
  pending_redemptions: number;
  recent: ActivityItem[];
};

export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ ready?: string }> }) {
  const ctx = await requireMerchant();
  const [d, { ready }] = await Promise.all([rpc<Dashboard>("merchant_dashboard"), searchParams]);
  const firstName = ctx.user.full_name?.split(" ")[0];
  const canOpenQr = !!ctx.card && ctx.business.status === "active" && ctx.subscription?.open;

  return (
    <div className="space-y-6">
      <header className="pt-3 lg:pt-0">
        <h1 className="text-2xl font-bold tracking-tight text-ink">
          {greeting()}
          {firstName ? `, ${firstName}` : ""} 👋
        </h1>
        <div className="mt-3 flex items-center gap-3">
          <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} size={44} rounded="rounded-full" />
          <div className="min-w-0 flex-1">
            <p className="truncate text-lg font-bold text-ink">{ctx.business.name}</p>
            {ctx.subscription && (
              <p className="flex items-center gap-2 text-sm text-muted">
                {PLAN_LABEL[ctx.subscription.plan ?? ""] ?? "No plan"} <SubscriptionBadge status={ctx.subscription.status} plan={ctx.subscription.plan} />
              </p>
            )}
          </div>
        </div>
      </header>

      {ready && ctx.card && (
        <Alert tone="success" title="Your loyalty card is ready!">
          Open your QR and let your first customer scan it.
        </Alert>
      )}

      {!ctx.card ? (
        <Card className="p-5">
          <div className="flex items-start gap-4">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
              <CreditCard className="size-6" />
            </span>
            <div>
              <p className="text-lg font-bold text-ink">Create your loyalty card</p>
              <p className="mt-1 text-sm text-muted">Choose how many stamps and the reward. It takes one minute — then your QR is ready.</p>
            </div>
          </div>
          <LinkButton href="/loyalty?welcome=1" block className="mt-4">
            Create loyalty card
          </LinkButton>
        </Card>
      ) : (
        <Link
          href="/qr"
          aria-disabled={!canOpenQr}
          className={`${buttonClass("primary", "xl", true)} h-18 text-xl ${canOpenQr ? "" : "pointer-events-none opacity-50"}`}
        >
          <QrCode className="size-7" /> Open QR
        </Link>
      )}

      {d.pending_redemptions > 0 && (
        <Link href="/redeem" className="flex items-center gap-3 rounded-3xl bg-warning-50 p-4 text-warning-700">
          <Ticket className="size-6 shrink-0" />
          <span className="flex-1 font-semibold">
            {d.pending_redemptions} reward request{d.pending_redemptions > 1 ? "s" : ""} waiting at the counter
          </span>
          <ChevronRight className="size-5" />
        </Link>
      )}

      <section className="grid grid-cols-2 gap-3 lg:grid-cols-4">
        <StatCard tint="green" icon={<Users className="size-5" />} value={formatNumber(d.customers)} label="Customers" />
        <StatCard tint="brand" icon={<QrCode className="size-5" />} value={formatNumber(d.stamps_this_month)} label="Stamps this month" sub={`${formatNumber(d.stamps_today)} today`} />
        <StatCard tint="amber" icon={<Gift className="size-5" />} value={formatNumber(d.rewards_redeemed)} label="Rewards redeemed" />
        <StatCard tint="rose" icon={<RefreshCw className="size-5" />} value={`${d.returning_rate}%`} label="Returning customers" />
      </section>

      <section className="grid gap-3 sm:grid-cols-2 lg:hidden">
        <LinkButton href="/redeem" variant="outline" block icon={<Ticket className="size-5" />}>
          Redeem a reward
        </LinkButton>
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/activity" className="text-sm font-semibold text-brand-600">
              See all
            </Link>
          }
        >
          Recent activity
        </SectionTitle>
        {d.recent.length === 0 ? (
          <EmptyState icon={<Users className="size-8" />} title="No customers yet." action={ctx.card ? <LinkButton href="/qr" block>Open QR</LinkButton> : undefined}>
            Open your QR and let your first customer scan it.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line/80 overflow-hidden">
            {d.recent.map((a) => (
              <ActivityRow key={a.id} item={a} relative />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
