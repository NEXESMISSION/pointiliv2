import type { Metadata } from "next";
import { MessageCircle } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { requireMerchant } from "@/lib/session";
import { PLANS } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";
import { supportWhatsApp } from "@/lib/whatsapp";
import { formatLongDate, formatTND } from "@/lib/format";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.billing.title };
}

/**
 * The plan the shop is on, and one way to reach us. Renewing, changing plan,
 * paying: all of it happens in a conversation, so the screen is a button to
 * start one — not a picker, a payment form and a ledger.
 */
export default async function BillingPage() {
  const { t, locale, count, fill } = await getI18n();
  const ctx = await requireMerchant("/billing");
  const s = ctx.subscription;
  const w = t.ops.billing;
  const plan = (s?.plan ?? "none") as keyof typeof t.data.plans;
  const number = supportWhatsApp();
  const message = fill(w.whatsappMessage, { shop: ctx.business.name });

  return (
    <div className="mx-auto w-full max-w-md">
      <TopBar title={w.title} large back="/dashboard" />

      <Card className="p-5 text-center">
        <p className="text-sm font-medium text-muted">{w.yourPlan}</p>
        <p className="mt-1 flex items-center justify-center gap-2 text-2xl font-semibold tracking-tight text-ink">
          {t.data.plans[plan] ?? t.data.plans.none}
          <SubscriptionBadge status={s?.status} plan={s?.plan} />
        </p>
        {(s?.plan === "yearly" || s?.plan === "six_month") && (
          <p className="mt-0.5 text-sm text-muted">
            {formatTND(PLANS[s.plan].price, locale)} {t.data.planPeriod[s.plan]}
          </p>
        )}
        {s && (
          <div className="mt-4 grid grid-cols-2 gap-2.5 rounded-2xl bg-canvas p-3 text-sm">
            <div>
              <p className="text-muted">{w.status}</p>
              <p className="font-semibold text-ink">{s.open ? t.data.subscription.active : s.status === "cancelled" ? t.data.subscription.cancelled : t.data.subscription.expired}</p>
            </div>
            <div>
              <p className="text-muted">{s.open ? w.expiresOn : w.endedOn}</p>
              <p className="font-semibold text-ink">{formatLongDate(s.expires_at, locale)}</p>
            </div>
          </div>
        )}
        {s?.open && <p className="mt-3 text-sm text-muted">{count(t.formats.daysLeft, s.days_left)}</p>}
      </Card>

      {number && (
        <>
          <a
            href={`https://wa.me/${number}?text=${encodeURIComponent(message)}`}
            target="_blank"
            rel="noopener noreferrer"
            className="mt-4 flex h-14 w-full items-center justify-center gap-2.5 rounded-2xl bg-[#25D366] text-[17px] font-semibold text-white shadow-[0_10px_24px_-10px_rgb(37_211_102/0.7)] transition active:scale-[0.99]"
          >
            <MessageCircle className="size-5" /> {w.whatsapp}
          </a>
          <p className="mt-3 text-center text-sm text-muted">{w.whatsappHint}</p>
        </>
      )}
    </div>
  );
}
