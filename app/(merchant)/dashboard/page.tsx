import Link from "next/link";
import { ChevronRight, CreditCard, Gift, QrCode, RefreshCw, ScanLine, Ticket, Users } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { ActivityRow } from "@/components/merchant/ActivityRow";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
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
      <header className="flex flex-col items-center pt-3 text-center lg:pt-0">
        <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} size={52} rounded="rounded-2xl" />
        <h1 className="mt-3 max-w-full truncate text-xl font-semibold tracking-tight text-ink">{ctx.business.name}</h1>
        <p className="mt-1 flex items-center gap-2 text-[13px] text-muted">
          {greeting()}
          {firstName ? `, ${firstName}` : ""}
          {ctx.subscription && (
            <>
              <span aria-hidden className="text-faint">·</span>
              {PLAN_LABEL[ctx.subscription.plan ?? ""] ?? "No plan"} <SubscriptionBadge status={ctx.subscription.status} plan={ctx.subscription.plan} />
            </>
          )}
        </p>
      </header>

      {ready && ctx.card && (
        <Alert tone="success" title="Your loyalty card is ready!">
          Open your QR and let your first customer scan it.
        </Alert>
      )}

      {!ctx.card ? (
        <Card className="p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
            <CreditCard className="size-6" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">Create your loyalty card</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Choose how many stamps and the reward. It takes one minute — then your QR is ready.</p>
          <LinkButton href="/loyalty?welcome=1" block className="mt-5">
            Create loyalty card
          </LinkButton>
        </Card>
      ) : (
        <div className="grid grid-cols-[minmax(0,1fr)_auto] gap-2.5">
          <Link
            href="/qr"
            aria-disabled={!canOpenQr}
            className={`flex h-[4.5rem] items-center gap-3.5 rounded-2xl px-4 text-white shadow-brand transition-opacity active:opacity-90 ${canOpenQr ? "" : "pointer-events-none opacity-50"}`}
            style={{ background: "linear-gradient(150deg, #7547EE 0%, #5029C5 100%)" }}
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-white/15">
              <QrCode className="size-[22px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-base font-semibold leading-tight">Open QR</span>
              <span className="block truncate text-[13px] text-white/70">Customers scan it for a stamp</span>
            </span>
            <ChevronRight className="size-5 shrink-0 text-white/60" />
          </Link>
          <Link href="/redeem?scan=1" aria-label="Scan a reward" className="flex h-[4.5rem] w-[4.5rem] flex-col items-center justify-center gap-1 rounded-2xl border border-line bg-white text-ink shadow-card transition-colors hover:bg-canvas">
            <ScanLine className="size-[22px]" />
            <span className="text-[11px] font-medium text-muted">Reward</span>
          </Link>
        </div>
      )}

      {d.pending_redemptions > 0 && (
        <Link href="/redeem" className="flex items-center gap-3 rounded-2xl border border-warning-500/25 bg-warning-50 px-4 py-3.5 text-warning-700">
          <Ticket className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">
            {d.pending_redemptions} reward request{d.pending_redemptions > 1 ? "s" : ""} waiting at the counter
          </span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      <section>
        <SectionTitle>This month</SectionTitle>
        <div className="grid grid-cols-2 gap-2.5 lg:grid-cols-4">
          <StatCard tint="green" icon={<Users />} value={formatNumber(d.customers)} label="Customers" />
          <StatCard tint="brand" icon={<QrCode />} value={formatNumber(d.stamps_this_month)} label="Stamps" sub={`${formatNumber(d.stamps_today)} today`} />
          <StatCard tint="amber" icon={<Gift />} value={formatNumber(d.rewards_redeemed)} label="Rewards redeemed" />
          <StatCard tint="rose" icon={<RefreshCw />} value={`${d.returning_rate}%`} label="Returning" />
        </div>
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/activity" className="text-[13px] font-semibold text-brand-600">
              See all
            </Link>
          }
        >
          Recent activity
        </SectionTitle>
        {d.recent.length === 0 ? (
          <EmptyState icon={<Users />} title="No customers yet" action={ctx.card ? <LinkButton href="/qr" block>Open QR</LinkButton> : undefined}>
            Open your QR and let your first customer scan it.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {d.recent.map((a) => (
              <ActivityRow key={a.id} item={a} relative />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
