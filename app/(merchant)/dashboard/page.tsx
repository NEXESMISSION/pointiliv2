import Link from "next/link";
import { ChevronRight, CreditCard, Gift, QrCode, Ticket } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { HowItWorks } from "@/components/merchant/HowItWorks";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { requireMerchant, rpc } from "@/lib/session";
import { formatNumber } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { ActivityItem } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.home };
}

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
  const [ctx, { t, locale, count }] = await Promise.all([requireMerchant(), getI18n()]);
  const [d, { ready }] = await Promise.all([rpc<Dashboard>("merchant_dashboard"), searchParams]);
  const canOpenQr = !!ctx.card && ctx.business.status === "active" && ctx.subscription?.open;
  const needsAttention = !!ctx.subscription && ctx.subscription.status !== "active";

  const stats = [
    { label: t.merchant.home.statCustomers, value: formatNumber(d.customers, locale), href: "/customers" },
    { label: t.merchant.home.statStampsToday, value: formatNumber(d.stamps_today, locale), href: "/customers" },
    { label: t.merchant.home.statRewards, value: formatNumber(d.rewards_redeemed, locale), href: "/customers" },
  ];

  return (
    <div className="space-y-4">
      <header className="flex flex-col items-center pt-1 text-center lg:pt-0">
        <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} size={44} rounded="rounded-xl" />
        <h1 className="mt-2 max-w-full truncate text-lg font-semibold tracking-tight text-ink">{ctx.business.name}</h1>
        {needsAttention && (
          <p className="mt-1.5">
            <SubscriptionBadge status={ctx.subscription?.status} plan={ctx.subscription?.plan} />
          </p>
        )}
      </header>

      {ready && ctx.card && (
        <Alert tone="success" title={t.merchant.home.cardReady}>
          {t.merchant.home.showQrFirst}
        </Alert>
      )}

      {!ctx.card ? (
        <Card className="p-5 text-center">
          <span className="mx-auto grid size-12 place-items-center rounded-full bg-brand-50 text-brand-600">
            <CreditCard className="size-6" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">{t.merchant.home.createTitle}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{t.merchant.home.createHint}</p>
          <LinkButton href="/loyalty?welcome=1" block className="mt-5">
            {t.merchant.home.createCta}
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
            <span className="text-xl font-semibold leading-tight">{t.nav.merchant.showQr}</span>
            <span className="text-[13px] text-white/70">{t.merchant.home.qrHint}</span>
          </Link>
          {/* A button whose name is a verb still has to say WHEN to press it. */}
          <Link
            href="/redeem?scan=1"
            className="flex items-center gap-3 rounded-2xl border border-line bg-white px-4 py-3 shadow-card transition-colors hover:bg-canvas/60"
          >
            <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-canvas text-body">
              <Gift className="size-5" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">{t.merchant.home.giveReward}</span>
              <span className="block truncate text-[13px] text-muted">{t.merchant.home.giveRewardHint}</span>
            </span>
            <ChevronRight className="rtl:-scale-x-100 size-4 shrink-0 text-faint" />
          </Link>
        </div>
      )}

      {d.pending_redemptions > 0 && (
        <Link href="/redeem" className="flex items-center gap-3 rounded-2xl border border-warning-500/25 bg-warning-50 px-4 py-3.5 text-warning-700">
          <Ticket className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">{count(t.merchant.home.waiting, d.pending_redemptions)}</span>
          <ChevronRight className="rtl:-scale-x-100 size-4" />
        </Link>
      )}

      {ctx.card && (
        <HowItWorks
          open={d.customers === 0}
          title={t.merchant.home.howTitle}
          steps={[
            { t: t.merchant.home.how1, h: t.merchant.home.how1Hint },
            { t: t.merchant.home.how2, h: t.merchant.home.how2Hint },
            { t: t.merchant.home.how3, h: t.merchant.home.how3Hint },
          ]}
        />
      )}

      <section className="grid grid-cols-3 gap-2.5">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="min-w-0 rounded-2xl border border-line bg-white p-3.5 text-center shadow-card transition-colors hover:bg-canvas/60">
            <span className="block text-2xl font-semibold leading-none tracking-tight text-ink tabular">{s.value}</span>
            <span className="mt-1.5 block text-[12px] leading-tight text-muted">{s.label}</span>
          </Link>
        ))}
      </section>

    </div>
  );
}
