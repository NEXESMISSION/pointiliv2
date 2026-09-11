import Link from "next/link";
import { logout } from "@/app/actions/auth";
import { MerchantNav, MerchantSideNav } from "@/components/merchant/MerchantNav";
import { BusinessAvatar } from "@/components/CardIcon";
import { Logo } from "@/components/Logo";
import { requireMerchant } from "@/lib/session";
import { formatLongDate } from "@/lib/format";

export default async function MerchantLayout({ children }: { children: React.ReactNode }) {
  const ctx = await requireMerchant();
  const sub = ctx.subscription;
  const suspended = ctx.business.status === "suspended";

  return (
    <div className="min-h-dvh bg-canvas">
      <MerchantSideNav
        header={
          <div className="space-y-5">
            <Logo size={28} />
            <div className="flex items-center gap-3 rounded-2xl bg-canvas p-2.5">
              <BusinessAvatar logo={ctx.business.logo_url} icon={ctx.card?.icon} color={ctx.card?.color} size={40} />
              <div className="min-w-0">
                <p className="truncate text-sm font-semibold text-ink">{ctx.business.name}</p>
                <p className="truncate text-xs text-muted">{ctx.member_role === "owner" ? "Owner" : "Staff"}</p>
              </div>
            </div>
          </div>
        }
        footer={
          <form action={logout}>
            <button type="submit" className="flex h-11 w-full items-center rounded-2xl px-3 text-[15px] font-medium text-danger-600 hover:bg-danger-50">
              Log out
            </button>
          </form>
        }
      />
      <div className="lg:pl-64">
        {suspended ? (
          <Banner tone="danger">Your business is suspended. Please contact Pointidi support.</Banner>
        ) : sub && !sub.open ? (
          <Banner tone="danger" href="/billing" cta="Renew">
            Your Pointidi subscription has expired. Your QR is paused; customers keep their stamps.
          </Banner>
        ) : sub?.status === "expiring_soon" ? (
          <Banner tone="warning" href="/billing" cta={sub.plan === "trial" ? "Choose a plan" : "Renew"}>
            {sub.plan === "trial" ? "Your free trial" : "Your plan"} ends {formatLongDate(sub.expires_at)} ({sub.days_left} day{sub.days_left === 1 ? "" : "s"} left).
          </Banner>
        ) : null}
        <main className="mx-auto w-full max-w-5xl px-4 pt-[calc(0.75rem+env(safe-area-inset-top))] bottom-nav-space lg:px-8 lg:pb-12 lg:pt-8">{children}</main>
      </div>
      <MerchantNav />
    </div>
  );
}

function Banner({ tone, children, href, cta }: { tone: "danger" | "warning"; children: React.ReactNode; href?: string; cta?: string }) {
  return (
    <div className={`flex items-center gap-3 px-4 py-2.5 pt-[calc(0.625rem+env(safe-area-inset-top))] text-sm font-medium lg:px-8 lg:pt-2.5 ${tone === "danger" ? "bg-danger-600 text-white" : "bg-warning-50 text-warning-700"}`} role="status">
      <p className="flex-1">{children}</p>
      {href && cta && (
        <Link href={href} className={`shrink-0 rounded-xl px-3 py-1.5 font-semibold ${tone === "danger" ? "bg-white text-danger-600" : "bg-warning-500 text-white"}`}>
          {cta}
        </Link>
      )}
    </div>
  );
}
