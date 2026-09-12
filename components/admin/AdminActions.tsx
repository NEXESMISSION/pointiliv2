"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { Ban, Banknote, Check, CirclePlay, Copy, KeyRound, Trash2, X } from "lucide-react";
import {
  cancelSubscription,
  confirmPayment,
  grantPlan,
  rejectPayment,
  resetUserPassword,
  runCleanup,
  setBusinessStatus,
} from "@/app/actions/admin";
import { useT } from "@/components/i18n/Provider";
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PAYMENT_METHODS, PLANS, type PaidPlan } from "@/lib/constants";
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

/* ── Record a payment & activate a plan ────────────────────────────────────── */

const MONTHS: Record<PaidPlan, number> = { six_month: 6, yearly: 12 };

export function GrantPlanButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PaidPlan>("yearly");
  const [method, setMethod] = useState<string>("cash");
  const { loading, run } = useAction();
  const { t, locale, fill } = useT();
  const w = t.admin.actions;
  const plans = t.data.plans as Record<string, string>;
  const methods = t.data.payments as Record<string, string>;

  return (
    <>
      <Button variant="primary" size="md" block icon={<Banknote className="size-5" />} onClick={() => setOpen(true)}>
        {w.recordPayment}
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title={w.recordPaymentTitle}
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
                const r = await run(() => grantPlan(businessId, plan, method));
                if (r?.ok) setOpen(false);
              }}
            >
              {fill(w.activatePlan, { plan: plans[plan] ?? plan })}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            {w.recordPaymentBefore}
            <span className="font-semibold text-ink">{businessName}</span>
            {w.recordPaymentAfter}
          </p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label={w.planAria}>
            {(Object.keys(PLANS) as PaidPlan[]).map((id) => {
              const p = PLANS[id];
              const active = plan === id;
              return (
                <button
                  key={id}
                  type="button"
                  role="radio"
                  aria-checked={active}
                  onClick={() => setPlan(id)}
                  className={`min-h-20 rounded-2xl border-2 p-3 text-start transition ${active ? "border-brand-600 bg-brand-50" : "border-line bg-white hover:bg-canvas"}`}
                >
                  <span className="block text-sm font-semibold text-ink">{plans[id] ?? id}</span>
                  <span className="block text-xl font-bold text-ink tabular">{formatTND(p.price, locale)}</span>
                  <span className="block text-xs text-muted">{fill(t.formats.perMonth, { price: Math.round((p.price / MONTHS[id]) * 10) / 10 })}</span>
                </button>
              );
            })}
          </div>
          <Field label={w.paymentMethod} htmlFor="grant-method">
            <Select id="grant-method" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.keys(PAYMENT_METHODS).map((k) => (
                <option key={k} value={k}>
                  {methods[k] ?? k}
                </option>
              ))}
            </Select>
          </Field>
        </div>
      </Modal>
    </>
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
