import Link from "next/link";
import { ChevronRight, CreditCard, Gift, QrCode, Ticket, Users } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { ActivityRow } from "@/components/merchant/ActivityRow";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { Card, SectionTitle } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { requireMerchant, rpc } from "@/lib/session";
import { formatNumber } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

export const metadata = { title: "Home" };

type Dashboard = {
  customers: number;
  stamps_this_month: number;
  stamps_today: number;
  rewards_redeemed: number;
  returning_rate: number;
  pending_redemptions: number;
  recent: ActivityItem[];
};

/** The counter screen: show the QR, give a reward, three numbers. Nothing else. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ ready?: string }> }) {
  const ctx = await requireMerchant();
  const [d, { ready }] = await Promise.all([rpc<Dashboard>("merchant_dashboard"), searchParams]);
  const canOpenQr = !!ctx.card && ctx.business.status === "active" && ctx.subscription?.open;
  const needsAttention = !!ctx.subscription && ctx.subscription.status !== "active";

  const stats = [
    { label: "Customers", value: formatNumber(d.customers), href: "/customers" },
    { label: "Stamps today", value: formatNumber(d.stamps_today), href: "/activity?range=today" },
    { label: "Rewards given", value: formatNumber(d.rewards_redeemed), href: "/activity?range=month" },
  ];

  return (
    <div className="space-y-5">
      <header className="flex flex-col items-center pt-3 text-center lg:pt-0">
        <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} size={44} rounded="rounded-xl" />
        <h1 className="mt-2 max-w-full truncate text-lg font-semibold tracking-tight text-ink">{ctx.business.name}</h1>
        {needsAttention && (
          <p className="mt-1.5">
            <SubscriptionBadge status={ctx.subscription?.status} plan={ctx.subscription?.plan} />
          </p>
        )}
      </header>

      {ready && ctx.card && (
        <Alert tone="success" title="Your card is ready!">
          Show your QR and let your first customer scan it.
        </Alert>
      )}

      {!ctx.card ? (
        <Card className="p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
            <CreditCard className="size-6" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">Create your card</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">Two questions: how many stamps, and what they get.</p>
          <LinkButton href="/loyalty?welcome=1" block className="mt-5">
            Create my card
          </LinkButton>
        </Card>
      ) : (
        <div className="space-y-2.5">
          <Link
            href="/qr"
            aria-disabled={!canOpenQr}
            className={`flex h-28 flex-col items-center justify-center gap-1 rounded-2xl text-white shadow-brand transition-opacity active:opacity-90 ${canOpenQr ? "" : "pointer-events-none opacity-50"}`}
            style={{ background: "linear-gradient(150deg, #7547EE 0%, #5029C5 100%)" }}
          >
            <QrCode className="size-8" />
            <span className="text-xl font-semibold leading-tight">Show QR</span>
            <span className="text-[13px] text-white/70">Customers scan it for a stamp</span>
          </Link>
          <LinkButton href="/redeem?scan=1" variant="outline" size="lg" block icon={<Gift className="size-5" />}>
            Give a reward
          </LinkButton>
        </div>
      )}

      {d.pending_redemptions > 0 && (
        <Link href="/redeem" className="flex items-center gap-3 rounded-2xl border border-warning-500/25 bg-warning-50 px-4 py-3.5 text-warning-700">
          <Ticket className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">
            {d.pending_redemptions} customer{d.pending_redemptions > 1 ? "s" : ""} waiting for a reward
          </span>
          <ChevronRight className="size-4" />
        </Link>
      )}

      <section className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="min-w-0 rounded-2xl border border-line bg-white p-3.5 text-center shadow-card transition-colors hover:bg-canvas/60">
            <span className="block text-2xl font-semibold leading-none tracking-tight text-ink tabular">{s.value}</span>
            <span className="mt-1.5 block text-[12px] leading-tight text-muted">{s.label}</span>
          </Link>
        ))}
      </section>

      <section>
        <SectionTitle
          action={
            <Link href="/activity" className="text-[13px] font-semibold text-brand-600">
              See all
            </Link>
          }
        >
          Latest
        </SectionTitle>
        {d.recent.length === 0 ? (
          <EmptyState icon={<Users />} title="No customers yet" action={ctx.card ? <LinkButton href="/qr" block>Show QR</LinkButton> : undefined}>
            Show your QR and let your first customer scan it.
          </EmptyState>
        ) : (
          <Card className="divide-y divide-line overflow-hidden">
            {d.recent.slice(0, 5).map((a) => (
              <ActivityRow key={a.id} item={a} relative />
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
