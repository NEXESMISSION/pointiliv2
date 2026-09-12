import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { MerchantNav, MerchantSideNav } from "@/components/merchant/MerchantNav";
import { BusinessAvatar } from "@/components/CardIcon";
import { Logo } from "@/components/Logo";
import { requireMerchant } from "@/lib/session";
import { formatLongDate } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";

export const metadata = { robots: { index: false, follow: false } };

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const [ctx, { t, locale, count, fill }] = await Promise.all([requireMerchant(), getI18n()]);
  const sub = ctx.subscription;
  const suspended = ctx.business.status === "suspended";

  return (
    <div className="min-h-dvh bg-canvas print:min-h-0 print:bg-white">
      <MerchantSideNav
        header={
          <div className="space-y-5">
            <Logo size={22} className="px-1" />
            <div className="flex items-center gap-2.5 rounded-xl border border-line p-2">
              <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} size={34} rounded="rounded-lg" />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{ctx.business.name}</p>
                <p className="truncate text-xs text-muted">{ctx.member_role === "owner" ? t.nav.merchant.owner : t.nav.merchant.staff}</p>
              </div>
            </div>
          </div>
        }
        footer={
          <form action={logout}>
            <button type="submit" className="flex h-9 w-full items-center rounded-lg px-2.5 text-sm font-medium text-muted hover:bg-canvas hover:text-danger-600">
              {t.common.logout}
            </button>
          </form>
        }
      />
      <div className="lg:ps-60 print:!ps-0">
        {suspended ? (
          <Banner tone="danger">{t.merchant.banner.suspended}</Banner>
        ) : sub && !sub.open ? (
          <Banner tone="danger" href="/billing" cta={t.merchant.banner.renew}>
            {t.merchant.banner.expired}
          </Banner>
        ) : sub?.status === "expiring_soon" ? (
          <Banner tone="warning" href="/billing" cta={sub.plan === "trial" ? t.merchant.banner.choosePlan : t.merchant.banner.renew}>
            {fill(sub.plan === "trial" ? t.merchant.banner.trialEnds : t.merchant.banner.planEnds, {
              date: formatLongDate(sub.expires_at, locale),
              left: count(t.formats.daysLeft, sub.days_left),
            })}
          </Banner>
        ) : null}
        <main className="mx-auto w-full max-w-4xl px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] bottom-nav-space lg:px-8 lg:pb-12 lg:pt-8 print:!p-0">{children}</main>
      </div>
      <MerchantNav />
    </div>
  );
}

function Banner({ tone, children, href, cta }: { tone: "danger" | "warning"; children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 print:hidden pt-[calc(0.625rem+env(safe-area-inset-top))] text-sm font-medium lg:px-8 lg:pt-2.5 ${tone === "danger" ? "bg-danger-600 text-white" : "bg-warning-50 text-warning-700"}`} role="status">
      <p className="flex-1">{children}</p>
      {href && cta && (
        <Link href={href} className={`shrink-0 rounded-xl px-3 py-1.5 font-semibold ${tone === "danger" ? "bg-white text-danger-600" : "bg-warning-500 text-white"}`}>
          {cta}
        </Link>
      )}
    </div>
  );
}
