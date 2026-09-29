"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Banknote, CalendarPlus, Check, CirclePlay, Copy, KeyRound, Trash2, X } from "lucide-react";
import {
  cancelSubscription,
  confirmPayment,
  extendSubscription,
  rejectPayment,
  resetUserPassword,
  runCleanup,
  setBusinessStatus,
  setSubscription,
} from "@/app/actions/admin";
import { useT } from "@/components/i18n/Provider";
import { Button } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PAYMENT_METHODS, PLANS } from "@/lib/constants";
import { formatTND } from "@/lib/format";

type Result = { ok: boolean; message: string; at: number; secret?: string };

function useAction() {
  const toast = useToast();
  const router = useRouter();
  const { t } = useT();
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<Result>): Promise<Result | null> {
    setLoading(true);
    try {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
      return r;
    } catch {
      toast(t.errors.network, "error");
      return null;
    } finally {
      setLoading(false);
    }
  }

  return { loading, run };
}

/* ── Business status ───────────────────────────────────────────────────────── */

export function BusinessStatusButton({ id, name, status }: { id: string; name: string; status: "active" | "suspended" }) {
  const [open, setOpen] = useState(false);
  const { loading, run } = useAction();
  const { t, fill } = useT();
  const w = t.admin.actions;
  const suspend = status === "active";

  return (
    <>
      <Button variant={suspend ? "danger" : "success"} size="md" block icon={suspend ? <Ban className="size-5" /> : <CirclePlay className="size-5" />} onClick={() => setOpen(true)}>
        {suspend ? w.suspendBusiness : w.activateBusiness}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={fill(suspend ? w.suspendTitle : w.activateTitle, { name })}
        confirmLabel={suspend ? w.suspendConfirm : w.activateConfirm}
        tone={suspend ? "danger" : "primary"}
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => setBusinessStatus(id, suspend ? "suspended" : "active"));
          if (r?.ok) setOpen(false);
        }}
      >
        {suspend ? w.suspendBody : w.activateBody}
      </ConfirmDialog>
    </>
  );
}

/* ── The founder sets a shop's subscription by hand ─────────────────────────── */

type AnyPlan = "trial" | "six_month" | "yearly";
const PLAN_ORDER: AnyPlan[] = ["trial", "six_month", "yearly"];

/** "YYYY-MM-DD", in Tunis, for today plus a plan's length. */
function defaultEnd(plan: AnyPlan): string {
  const d = new Date();
  if (plan === "trial") d.setDate(d.getDate() + 30);
  else d.setMonth(d.getMonth() + (plan === "yearly" ? 12 : 6));
  return new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(d);
}

/**
 * Everything about a shop's plan in one sheet: which plan, until which day,
 * what it paid and how. The founder says it; the database records it (a paid
 * amount becomes a payment) and the shop's QR follows.
 */
export function ManageSubscription({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<AnyPlan>("yearly");
  const [until, setUntil] = useState(() => defaultEnd("yearly"));
  const [price, setPrice] = useState<string>(String(PLANS.yearly.price));
  const [method, setMethod] = useState<string>("cash");
  const { loading, run } = useAction();
  const { t, fill } = useT();
  const w = t.admin.actions;
  const plans = t.data.plans as Record<string, string>;
  const methods = t.data.payments as Record<string, string>;
  const paid = plan !== "trial" && Number(price) > 0;
  const today = new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date());

  const pick = (p: AnyPlan) => {
    setPlan(p);
    setUntil(defaultEnd(p));
    setPrice(p === "trial" ? "0" : String(PLANS[p].price));
  };

  return (
    <>
      <Button variant="primary" size="md" block icon={<Banknote className="size-5" />} onClick={() => setOpen(true)}>
        {w.manageSub}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={fill(w.manageSubTitle, { name: businessName })}
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setOpen(false)} className="sm:w-auto">
              {t.common.cancel}
            </Button>
            <Button
              variant="primary"
              size="md"
              loading={loading}
              className="sm:w-auto"
              onClick={async () => {
                // the chosen day counts to its end, Tunis time
                const r = await run(() => setSubscription(businessId, plan, `${until}T23:59:00+01:00`, plan === "trial" ? 0 : Number(price) || 0, method));
                if (r?.ok) setOpen(false);
              }}
            >
              {t.common.save}
            </Button>
          </>
        }
      >
        <div className="space-y-3.5">
          <div className="grid grid-cols-3 gap-2" role="radiogroup" aria-label={w.planAria}>
            {PLAN_ORDER.map((id) => (
              <button
                key={id}
                type="button"
                role="radio"
                aria-checked={plan === id}
                onClick={() => pick(id)}
                className={`h-11 rounded-xl border-2 text-sm font-semibold transition ${plan === id ? "border-brand-600 bg-brand-50 text-brand-700" : "border-line bg-surface text-body hover:bg-canvas"}`}
              >
                {plans[id] ?? id}
              </button>
            ))}
          </div>
          <div className="grid grid-cols-2 gap-2.5">
            <Field label={w.until} htmlFor="sub-until">
              <Input id="sub-until" type="date" dir="ltr" value={until} min={today} onChange={(e) => setUntil(e.target.value)} />
            </Field>
            <Field label={w.pricePaid} htmlFor="sub-price">
              <Input id="sub-price" type="number" inputMode="decimal" min={0} step="1" dir="ltr" value={plan === "trial" ? "0" : price} disabled={plan === "trial"} onChange={(e) => setPrice(e.target.value)} />
            </Field>
          </div>
          {paid && (
            <Field label={w.paymentMethod} htmlFor="sub-method">
              <Select id="sub-method" value={method} onChange={(e) => setMethod(e.target.value)}>
                {Object.keys(PAYMENT_METHODS).map((k) => (
                  <option key={k} value={k}>
                    {methods[k] ?? k}
                  </option>
                ))}
              </Select>
            </Field>
          )}
          <p className="text-xs leading-snug text-muted">{w.manageSubHint}</p>
        </div>
      </Modal>
    </>
  );
}

/** One tap: thirty more days on whatever the shop has now. */
export function ExtendSubscriptionButton({ businessId }: { businessId: string }) {
  const { loading, run } = useAction();
  const { t } = useT();
  return (
    <Button variant="outline" size="md" block loading={loading} icon={<CalendarPlus className="size-5" />} onClick={() => run(() => extendSubscription(businessId, 30))}>
      {t.admin.actions.extend30}
    </Button>
  );
}

/* ── Cancel a subscription ─────────────────────────────────────────────────── */

export function CancelSubscriptionButton({ id, businessName, planLabel }: { id: string; businessName: string; planLabel: string }) {
  const [open, setOpen] = useState(false);
  const { loading, run } = useAction();
  const { t, fill } = useT();
  const w = t.admin.actions;
  return (
    <>
      <Button variant="danger" size="sm" className="h-11" onClick={() => setOpen(true)}>
        {w.cancelSubscription}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={w.cancelSubTitle}
        confirmLabel={w.cancelSubConfirm}
        tone="danger"
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => cancelSubscription(id));
          if (r?.ok) setOpen(false);
        }}
      >
        {fill(w.cancelSubBody, { plan: planLabel, name: businessName })}
      </ConfirmDialog>
    </>
  );
}

/* ── Confirm / reject a pending payment ────────────────────────────────────── */

export function PaymentActions({
  id,
  businessName,
  planLabel,
  amount,
  confirmOnly = false,
}: {
  id: string;
  businessName: string;
  planLabel: string;
  amount: number;
  confirmOnly?: boolean;
}) {
  const [dialog, setDialog] = useState<"confirm" | "reject" | null>(null);
  const { loading, run } = useAction();
  const { t, locale, fill } = useT();
  const w = t.admin.actions;

  return (
    <div className="flex gap-2">
      <Button variant="success" size="sm" className="h-11 flex-1 sm:flex-none" icon={<Check className="size-4" />} onClick={() => setDialog("confirm")}>
        {t.common.confirm}
      </Button>
      {!confirmOnly && (
        <Button variant="danger" size="sm" className="h-11 flex-1 sm:flex-none" icon={<X className="size-4" />} onClick={() => setDialog("reject")}>
          {w.reject}
        </Button>
      )}
      <ConfirmDialog
        open={dialog === "confirm"}
        onClose={() => setDialog(null)}
        title={w.confirmPaymentTitle}
        confirmLabel={w.confirmPaymentLabel}
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => confirmPayment(id));
          if (r?.ok) setDialog(null);
        }}
      >
        {w.confirmPaymentBefore}
        <span className="font-semibold text-ink">{formatTND(amount, locale)}</span>
        {w.confirmPaymentMiddle}
        <span className="font-semibold text-ink">{businessName}</span>
        {fill(w.confirmPaymentAfter, { plan: planLabel })}
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title={w.rejectPaymentTitle}
        confirmLabel={w.rejectPaymentLabel}
        tone="danger"
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => rejectPayment(id));
          if (r?.ok) setDialog(null);
        }}
      >
        {fill(w.rejectPaymentBody, { amount: formatTND(amount, locale), name: businessName })}
      </ConfirmDialog>
    </div>
  );
}

/* ── Temporary password for a customer ─────────────────────────────────────── */

export function ResetPasswordButton({ userId, label }: { userId: string; label: string }) {
  const [confirming, setConfirming] = useState(false);
  const [secret, setSecret] = useState<string | null>(null);
  const [copied, setCopied] = useState(false);
  const { loading, run } = useAction();
  const { t } = useT();
  const w = t.admin.actions;
  const toast = useToast();

  return (
    <>
      <Button variant="outline" size="sm" className="h-11" icon={<KeyRound className="size-4" />} onClick={() => setConfirming(true)}>
        {w.resetPassword}
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title={w.resetTitle}
        confirmLabel={w.resetConfirm}
        tone="danger"
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => resetUserPassword(userId));
          if (r?.ok && r.secret) {
            setConfirming(false);
            setCopied(false);
            setSecret(r.secret);
          }
        }}
      >
        {w.resetBefore}
        <span className="font-semibold text-ink">{label}</span>
        {w.resetAfter}
      </ConfirmDialog>
      <Modal
        open={secret !== null}
        onClose={() => setSecret(null)}
        title={w.tempPasswordTitle}
        footer={
          <Button variant="primary" size="md" onClick={() => setSecret(null)} className="sm:w-auto">
            {t.common.done}
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-canvas p-2 ps-4">
            <code dir="ltr" className="min-w-0 flex-1 select-all break-all font-mono text-xl font-semibold tracking-wider text-ink">
              {secret}
            </code>
            <Button
              variant="outline"
              size="sm"
              className="h-11"
              icon={copied ? <Check className="size-4" /> : <Copy className="size-4" />}
              onClick={async () => {
                try {
                  await navigator.clipboard.writeText(secret ?? "");
                  setCopied(true);
                } catch {
                  toast(w.copyFailed, "error");
                }
              }}
            >
              {copied ? w.copied : w.copy}
            </Button>
          </div>
          <p className="text-sm text-muted">{w.tempPasswordHint}</p>
          <p className="text-xs font-medium text-warning-700">{w.tempPasswordOnce}</p>
        </div>
      </Modal>
    </>
  );
}

/* ── Maintenance ───────────────────────────────────────────────────────────── */

export function CleanupButton() {
  const { loading, run } = useAction();
  const { t } = useT();
  return (
    <Button variant="outline" size="md" loading={loading} icon={<Trash2 className="size-5" />} onClick={() => run(runCleanup)}>
      {t.admin.actions.runCleanup}
    </Button>
  );
}
