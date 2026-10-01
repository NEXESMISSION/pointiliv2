import Link from "next/link";
import { ChevronRight, CreditCard, Plus, QrCode, Settings, Ticket } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { HowItWorks } from "@/components/merchant/HowItWorks";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { requireMerchant, rpc } from "@/lib/session";
import { formatNumber, formatTime, greeting } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import type { ActivityItem } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.home };
}

type Dashboard = {
  system: "stamps" | "points";
  points_today: number;
  visitors_today: number;
  rewards_today: number;
  customers: number;
  stamps_this_month: number;
  stamps_today: number;
  rewards_redeemed: number;
  returning_rate: number;
  pending_redemptions: number;
  recent: ActivityItem[];
};

/** The counter screen: show the code, give a gift, today's numbers, who just came. */
export default async function DashboardPage({ searchParams }: { searchParams: Promise<{ ready?: string }> }) {
  const [ctx, { t, locale, count, fill }] = await Promise.all([requireMerchant(), getI18n()]);
  const [d, { ready }] = await Promise.all([rpc<Dashboard>("merchant_dashboard"), searchParams]);
  const canOpenQr = !!ctx.card && ctx.business.status === "active" && ctx.subscription?.open;
  const needsAttention = !!ctx.subscription && ctx.subscription.status !== "active";
  const h = t.merchant.home;
  const p = t.points;
  const points = d.system === "points";
  const firstName = ctx.user.full_name?.split(" ")[0];

  // a points shop counts today in points, customers and gifts (board 2, P5)
  const today: { icon: Icon3DName; value: string; label: string }[] = points
    ? [
        { icon: "coin", value: formatNumber(d.points_today, locale), label: count(p.pointsNoun, d.points_today) },
        { icon: "people", value: formatNumber(d.visitors_today, locale), label: count(p.visitorsNoun, d.visitors_today) },
        { icon: "party", value: formatNumber(d.rewards_today, locale), label: count(p.giftsNoun, d.rewards_today) },
      ]
    : [
        { icon: "fire", value: formatNumber(d.stamps_today, locale), label: h.statStampsToday },
        { icon: "party", value: formatNumber(d.rewards_redeemed, locale), label: h.statRewards },
        { icon: "sparkles", value: `${Math.round(d.returning_rate)}%`, label: h.statReturning },
      ];

  return (
    <div className="space-y-4">
      <header className="flex items-center justify-between">
        <span className="rounded-full shadow-[0_0_0_3px_var(--color-surface),var(--shadow-card)]">
          <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} size={42} rounded="rounded-full" />
        </span>
        <Link href="/more" className="press grid size-[42px] place-items-center rounded-full bg-surface text-ink shadow-card" aria-label={t.nav.merchant.more}>
          <Settings className="size-5" />
        </Link>
      </header>

      <div>
        <p className="flex items-center gap-1.5 text-sm text-muted">
          {greeting(locale)}
          {firstName ? ` ${firstName}` : ""} <Icon3D name="wave" size={20} />
        </p>
        <h1 className="mt-0.5 truncate text-[30px] font-bold leading-tight text-ink">{ctx.business.name}</h1>
        {needsAttention && (
          <p className="mt-1.5">
            <SubscriptionBadge status={ctx.subscription?.status} plan={ctx.subscription?.plan} />
          </p>
        )}
      </div>

      {ready && ctx.card && (
        <Alert tone="success" title={h.cardReady}>
          {h.showQrFirst}
        </Alert>
      )}

      {!ctx.card ? (
        <Card className="p-5 text-center">
          <span className="mx-auto grid size-14 place-items-center rounded-[18px] bg-brand-100 text-brand-600">
            <CreditCard className="size-6" />
          </span>
          <p className="mt-4 text-base font-semibold text-ink">{h.createTitle}</p>
          <p className="mx-auto mt-1 max-w-xs text-sm text-muted">{h.createHint}</p>
          <LinkButton href="/loyalty?welcome=1" block className="mt-5">
            {h.createCta}
          </LinkButton>
        </Card>
      ) : (
        <>
          <Link
            href={points ? "/points" : "/qr"}
            aria-disabled={!canOpenQr}
            className={`pass-shine press flex items-center gap-4 rounded-[26px] p-5 text-white ${
              points
                ? "bg-[linear-gradient(145deg,var(--color-sea-300)_0%,var(--color-sea-500)_48%,var(--color-sea-700)_100%)] shadow-[0_18px_40px_-16px_var(--color-sea-500)]"
                : "bg-[linear-gradient(145deg,var(--color-brand-400)_0%,var(--color-brand-600)_48%,var(--color-brand-800)_100%)] shadow-pass"
            } ${canOpenQr ? "" : "pointer-events-none opacity-50"}`}
          >
            <span className="grid size-[62px] shrink-0 place-items-center rounded-[20px] bg-white/20">
              {points ? <Plus className="size-8" strokeWidth={2.4} /> : <QrCode className="size-8" />}
            </span>
            <span className="min-w-0">
              <span className="block text-[22px] font-bold leading-tight">{points ? p.add : t.nav.merchant.showQr}</span>
              <span className="block truncate text-[13.5px] text-white/80">{points ? p.addHint : h.qrHint}</span>
            </span>
          </Link>

          <div className="grid grid-cols-2 gap-3">
            <Link href="/redeem?scan=1" className="press rounded-[22px] bg-surface p-3.5 shadow-card">
              <Icon3D name="gift" size={34} />
              <span className="mt-1.5 block text-base font-bold text-ink">{h.giveReward}</span>
              <span className="block truncate text-[12.5px] text-muted">{h.giveRewardHint}</span>
            </Link>
            <Link href="/customers" className="press rounded-[22px] bg-surface p-3.5 shadow-card">
              <Icon3D name="people" size={34} />
              <span className="mt-1.5 block text-base font-bold text-ink">{h.statCustomers}</span>
              <span className="num block text-[12.5px] text-muted">{formatNumber(d.customers, locale)}</span>
            </Link>
          </div>
        </>
      )}

      {d.pending_redemptions > 0 && (
        <Link href="/redeem" className="press flex items-center gap-3 rounded-[20px] bg-coral-50 px-4 py-3.5 text-coral-700">
          <Ticket className="size-5 shrink-0" />
          <span className="flex-1 text-sm font-semibold">{count(h.waiting, d.pending_redemptions)}</span>
          <ChevronRight className="rtl:-scale-x-100 size-4" />
        </Link>
      )}

      {ctx.card && d.customers === 0 && (
        <HowItWorks
          open
          title={h.howTitle}
          steps={
            points
              ? [
                  { t: p.how1, h: p.how1Hint },
                  { t: p.how2, h: p.how2Hint },
                  { t: p.how3, h: p.how3Hint },
                ]
              : [
                  { t: h.how1, h: h.how1Hint },
                  { t: h.how2, h: h.how2Hint },
                  { t: h.how3, h: h.how3Hint },
                ]
          }
        />
      )}

      {ctx.card && (
        <section>
          <h2 className="mb-3 px-0.5 text-lg font-bold text-ink">{h.today}</h2>
          <div className="grid grid-cols-3 gap-2.5">
            {today.map((s) => (
              <div key={s.label} className="min-w-0 rounded-[22px] bg-surface px-2 py-3.5 text-center shadow-card">
                <Icon3D name={s.icon} size={30} className="mx-auto" />
                <span className="num mt-1 block text-[22px] font-bold leading-tight text-ink">{s.value}</span>
                <span className="block truncate text-[12px] text-muted">{s.label}</span>
              </div>
            ))}
          </div>
        </section>
      )}

      {d.recent.length > 0 && (
        <section>
          <h2 className="mb-3 px-0.5 text-lg font-bold text-ink">{h.now}</h2>
          <Card className="divide-y divide-line overflow-hidden">
            {d.recent.slice(0, 2).map((a) => (
              <Link key={a.id} href={a.customer_id ? `/customers/${a.customer_id}` : "/customers"} className="flex items-center gap-3 px-4 py-3 hover:bg-surface-2/70">
                <span
                  className={`num grid size-9 shrink-0 place-items-center rounded-full text-[12px] font-bold ${
                    a.type === "stamp" ? "bg-brand-100 text-brand-700" : a.type === "points" ? "bg-sea-50 text-sea-700" : "bg-coral-50 text-coral-600"
                  }`}
                >
                  {a.type === "stamp" ? "+1" : a.type === "points" ? `+${a.data.points ?? ""}` : "🎁"}
                </span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[15px] font-medium text-ink">
                    {fill(t.merchant.people.anon, { code: String(a.customer_code ?? "") })}{" "}
                    {a.type === "stamp" ? h.feedStamp : a.type === "points" ? count(p.feedPoints, a.data.points ?? 0) : fill(h.feedReward, { reward: a.data.reward_name ?? "" })}
                  </span>
                  <span className="block text-[12.5px] text-muted">{formatTime(a.at, locale)}</span>
                </span>
              </Link>
            ))}
          </Card>
        </section>
      )}
    </div>
  );
}
