import type { Metadata } from "next";
import { Receipt } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Badge, SubscriptionBadge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { PlanPicker, CancelPlanRequestButton } from "@/components/merchant/PlanPicker";
import { requireMerchant, rpc } from "@/lib/session";
import { PAYMENT_METHODS, PLANS } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";
import { formatDate, formatLongDate, formatTND } from "@/lib/format";
import type { SubscriptionState } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.billing.title };
}

type Payment = { id: string; plan: string; amount: number; currency: string; method: keyof typeof PAYMENT_METHODS; status: string; payment_reference: string; created_at: string; confirmed_at: string | null };
type Billing = { subscription: SubscriptionState; payments: Payment[]; subscriptions: { id: string; plan: string; price: number; starts_at: string; expires_at: string; status: string }[] };

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = { paid: "success", pending: "warning", failed: "danger", cancelled: "neutral" };

export default async function BillingPage() {
  const { t, locale, count, fill } = await getI18n();
  const ctx = await requireMerchant("/billing");
  const b = await rpc<Billing>("merchant_billing");
  const s = b.subscription;
  const pending = b.payments.find((p) => p.status === "pending");
  const isOwner = ctx.member_role === "owner";
  const support = [process.env.NEXT_PUBLIC_SUPPORT_PHONE, process.env.NEXT_PUBLIC_SUPPORT_EMAIL].filter(Boolean).join(" · ");
  const w = t.ops.billing;
  const planName = (plan: string | null | undefined) => t.data.plans[(plan ?? "none") as keyof typeof t.data.plans] ?? t.data.plans.none;
  const methodName = (m: string) => t.data.payments[m as keyof typeof t.data.payments] ?? m;

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title={w.title} large back="/dashboard" />

      <Card className="p-3 text-center">
        <p className="text-sm font-medium text-muted">{w.yourPlan}</p>
        <p className="flex items-center justify-center gap-2 text-xl font-semibold tracking-tight text-ink">
          {planName(s.plan)}
          <SubscriptionBadge status={s.status} plan={s.plan} />
        </p>
        <p className="text-sm text-muted">
          {s.plan === "trial"
            ? t.common.free
            : s.plan === "yearly"
              ? `${formatTND(PLANS.yearly.price, locale)} ${t.data.planPeriod.yearly}`
              : s.plan === "six_month"
                ? `${formatTND(PLANS.six_month.price, locale)} ${t.data.planPeriod.six_month}`
                : "—"}
        </p>
        <div className="mt-2 grid grid-cols-2 gap-2.5 rounded-2xl bg-canvas p-2 text-sm">
          <div>
            <p className="text-muted">{w.status}</p>
            <p className="font-semibold text-ink">{s.open ? t.data.subscription.active : s.status === "cancelled" ? t.data.subscription.cancelled : t.data.subscription.expired}</p>
          </div>
          <div>
            <p className="text-muted">{s.open ? w.expiresOn : w.endedOn}</p>
            <p className="font-semibold text-ink">{formatLongDate(s.expires_at, locale)}</p>
          </div>
        </div>
        {s.open && (
          <p className="mt-2 text-sm text-muted">
            {count(t.formats.daysLeft, s.days_left)}. {w.renewNote}
          </p>
        )}
      </Card>

      {/* the plan stays in view; a pending request, the picker and the receipts
          share one scroller, so no state pushes the screen out of shape */}
      <div className="mt-2 max-h-[50dvh] space-y-2 overflow-y-auto">
        {pending && (
          <Alert tone="warning" title={w.pendingTitle} action={isOwner ? <CancelPlanRequestButton id={pending.id} /> : undefined}>
            <p>
              {planName(pending.plan)} · <b>{formatTND(pending.amount, locale)}</b> {fill(w.byMethod, { method: methodName(pending.method) })}
            </p>
            <p className="mt-1">
              {w.reference} <span dir="ltr" className="inline-block rounded-lg bg-white px-2 py-0.5 font-mono font-bold tracking-wider text-ink">{pending.payment_reference}</span>
            </p>
            <p className="mt-1">
              {w.quoteReference}
              {support ? fill(w.contact, { support }) : ""}
            </p>
          </Alert>
        )}

        {isOwner ? (
          <section>
            <SectionTitle className="mb-1">{s.open && s.plan !== "trial" ? w.renewPlan : w.choosePlan}</SectionTitle>
            <PlanPicker />
          </section>
        ) : (
          <Alert tone="info">{w.ownerOnly}</Alert>
        )}

        <section>
          <SectionTitle className="mb-1">{w.paymentHistory}</SectionTitle>
          {b.payments.length === 0 ? (
            <Card className="flex items-center justify-center gap-2.5 p-3 text-sm text-muted">
              <Receipt className="size-4" /> {w.noPayments}
            </Card>
          ) : (
            // however many receipts pile up, the picker above stays reachable
            <Card className="max-h-28 divide-y divide-line/80 overflow-y-auto">
              {b.payments.map((p) => (
                <div key={p.id} className="flex items-center gap-3 px-3.5 py-2">
                  <div className="min-w-0 flex-1">
                    <p className="text-[15px] font-semibold text-ink">
                      {planName(p.plan)} · {formatTND(p.amount, locale)}
                    </p>
                    <p className="truncate text-[13px] text-muted">
                      {formatDate(p.created_at, locale)} · <span dir="ltr" className="inline-block font-mono">{p.payment_reference}</span>
                    </p>
                  </div>
                  <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{t.data.paymentStatus[p.status as keyof typeof t.data.paymentStatus] ?? p.status}</Badge>
                </div>
              ))}
            </Card>
          )}
        </section>
      </div>
    </div>
  );
}
