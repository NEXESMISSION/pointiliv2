import { Receipt } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Badge, SubscriptionBadge } from "@/components/ui/Badge";
import { Card, SectionTitle } from "@/components/ui/Card";
import { Alert } from "@/components/ui/Alert";
import { PlanPicker, CancelPlanRequestButton } from "@/components/merchant/PlanPicker";
import { requireMerchant, rpc } from "@/lib/session";
import { PAYMENT_METHODS, PLAN_LABEL } from "@/lib/constants";
import { formatDate, formatLongDate, formatTND } from "@/lib/format";
import type { SubscriptionState } from "@/lib/types";

export const metadata = { title: "Billing" };

type Payment = { id: string; plan: string; amount: number; currency: string; method: keyof typeof PAYMENT_METHODS; status: string; payment_reference: string; created_at: string; confirmed_at: string | null };
type Billing = { subscription: SubscriptionState; payments: Payment[]; subscriptions: { id: string; plan: string; price: number; starts_at: string; expires_at: string; status: string }[] };

const STATUS_TONE: Record<string, "success" | "warning" | "danger" | "neutral"> = { paid: "success", pending: "warning", failed: "danger", cancelled: "neutral" };

export default async function BillingPage() {
  const ctx = await requireMerchant("/billing");
  const b = await rpc<Billing>("merchant_billing");
  const s = b.subscription;
  const pending = b.payments.find((p) => p.status === "pending");
  const isOwner = ctx.member_role === "owner";
  const support = [process.env.NEXT_PUBLIC_SUPPORT_PHONE, process.env.NEXT_PUBLIC_SUPPORT_EMAIL].filter(Boolean).join(" · ");

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Billing" large back="/dashboard" />

      <Card className="p-5">
        <p className="text-sm font-medium text-muted">Your Pointili plan</p>
        <div className="mt-2 flex items-start justify-between gap-3">
          <div>
            <p className="text-2xl font-semibold tracking-tight text-ink">{PLAN_LABEL[s.plan ?? ""] ?? "No plan"}</p>
            <p className="text-sm text-muted">
              {s.plan === "trial" ? "Free" : s.plan === "yearly" ? "120 TND / year" : s.plan === "six_month" ? "80 TND / 6 months" : "—"}
            </p>
          </div>
          <SubscriptionBadge status={s.status} plan={s.plan} />
        </div>
        <div className="mt-4 grid grid-cols-2 gap-3 rounded-2xl bg-canvas p-3 text-sm">
          <div>
            <p className="text-muted">Status</p>
            <p className="font-semibold text-ink">{s.open ? "Active" : s.status === "cancelled" ? "Cancelled" : "Expired"}</p>
          </div>
          <div>
            <p className="text-muted">{s.open ? "Expires" : "Ended"}</p>
            <p className="font-semibold text-ink">{formatLongDate(s.expires_at)}</p>
          </div>
        </div>
        {s.open && <p className="mt-3 text-sm text-muted">{s.days_left} days left. Renewing adds time after your current period — you never lose days.</p>}
      </Card>

      {pending && (
        <Alert tone="warning" title="Payment pending" className="mt-5" action={isOwner ? <CancelPlanRequestButton id={pending.id} /> : undefined}>
          <p>
            {PLAN_LABEL[pending.plan]} · <b>{formatTND(pending.amount)}</b> by {PAYMENT_METHODS[pending.method] ?? pending.method}
          </p>
          <p className="mt-1">
            Reference: <span className="rounded-lg bg-white px-2 py-0.5 font-mono font-bold tracking-wider text-ink">{pending.payment_reference}</span>
          </p>
          <p className="mt-1">Quote this reference when you pay. Your plan activates as soon as Pointili confirms the payment.{support ? ` Contact: ${support}` : ""}</p>
        </Alert>
      )}

      {isOwner ? (
        <section className="mt-6">
          <SectionTitle>{s.open && s.plan !== "trial" ? "Renew your plan" : "Choose your plan"}</SectionTitle>
          <PlanPicker />
        </section>
      ) : (
        <Alert tone="info" className="mt-5">Only the business owner can manage billing.</Alert>
      )}

      <section className="mt-8">
        <SectionTitle>Payment history</SectionTitle>
        {b.payments.length === 0 ? (
          <Card className="flex items-center gap-3 p-4 text-sm text-muted">
            <Receipt className="size-5" /> No payments yet.
          </Card>
        ) : (
          <Card className="divide-y divide-line/80">
            {b.payments.map((p) => (
              <div key={p.id} className="flex items-center gap-3 px-4 py-3">
                <div className="min-w-0 flex-1">
                  <p className="font-semibold text-ink">
                    {PLAN_LABEL[p.plan]} · {formatTND(p.amount)}
                  </p>
                  <p className="truncate text-sm text-muted">
                    {formatDate(p.created_at)} · <span className="font-mono">{p.payment_reference}</span>
                  </p>
                </div>
                <Badge tone={STATUS_TONE[p.status] ?? "neutral"}>{p.status[0]!.toUpperCase() + p.status.slice(1)}</Badge>
              </div>
            ))}
          </Card>
        )}
      </section>
    </div>
  );
}
