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
import { Button } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { ConfirmDialog, Modal } from "@/components/ui/Modal";
import { useToast } from "@/components/ui/Toast";
import { PAYMENT_METHODS, PLAN_LABEL, PLANS, type PaidPlan } from "@/lib/constants";
import { formatTND } from "@/lib/format";

type Result = { ok: boolean; message: string; at: number; secret?: string };

function useAction() {
  const toast = useToast();
  const router = useRouter();
  const [loading, setLoading] = useState(false);

  async function run(fn: () => Promise<Result>): Promise<Result | null> {
    setLoading(true);
    try {
      const r = await fn();
      toast(r.message, r.ok ? "success" : "error");
      if (r.ok) router.refresh();
      return r;
    } catch {
      toast("Something went wrong. Please try again.", "error");
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
  const suspend = status === "active";

  return (
    <>
      <Button variant={suspend ? "danger" : "success"} size="md" block icon={suspend ? <Ban className="size-5" /> : <CirclePlay className="size-5" />} onClick={() => setOpen(true)}>
        {suspend ? "Suspend business" : "Activate business"}
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title={suspend ? `Suspend ${name}?` : `Activate ${name}?`}
        confirmLabel={suspend ? "Suspend" : "Activate"}
        tone={suspend ? "danger" : "primary"}
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => setBusinessStatus(id, suspend ? "suspended" : "active"));
          if (r?.ok) setOpen(false);
        }}
      >
        {suspend
          ? "Their QR code stops working and the owner sees a suspension notice. Customers keep their stamps."
          : "Their QR code works again (as long as they have an active plan)."}
      </ConfirmDialog>
    </>
  );
}

/* ── Record a payment & activate a plan ────────────────────────────────────── */

export function GrantPlanButton({ businessId, businessName }: { businessId: string; businessName: string }) {
  const [open, setOpen] = useState(false);
  const [plan, setPlan] = useState<PaidPlan>("yearly");
  const [method, setMethod] = useState<string>("cash");
  const { loading, run } = useAction();

  return (
    <>
      <Button variant="primary" size="md" block icon={<Banknote className="size-5" />} onClick={() => setOpen(true)}>
        Record payment &amp; activate plan
      </Button>
      <Modal
        open={open}
        onClose={() => setOpen(false)}
        title="Record payment"
        footer={
          <>
            <Button variant="outline" size="md" onClick={() => setOpen(false)} className="sm:w-auto">
              Cancel
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
              Activate {PLANS[plan].name}
            </Button>
          </>
        }
      >
        <div className="space-y-4">
          <p className="text-sm text-muted">
            Record a payment received from <span className="font-semibold text-ink">{businessName}</span>. The plan starts now, or extends their current one.
          </p>
          <div className="grid grid-cols-2 gap-2" role="radiogroup" aria-label="Plan">
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
                  className={`min-h-20 rounded-2xl border-2 p-3 text-left transition ${active ? "border-brand-600 bg-brand-50" : "border-line bg-white hover:bg-canvas"}`}
                >
                  <span className="block text-sm font-semibold text-ink">{p.name}</span>
                  <span className="block text-xl font-bold text-ink tabular">{formatTND(p.price)}</span>
                  <span className="block text-xs text-muted">{p.perMonth}</span>
                </button>
              );
            })}
          </div>
          <Field label="Payment method" htmlFor="grant-method">
            <Select id="grant-method" value={method} onChange={(e) => setMethod(e.target.value)}>
              {Object.entries(PAYMENT_METHODS).map(([k, v]) => (
                <option key={k} value={k}>
                  {v}
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

export function CancelSubscriptionButton({ id, businessName, plan }: { id: string; businessName: string; plan: string }) {
  const [open, setOpen] = useState(false);
  const { loading, run } = useAction();
  return (
    <>
      <Button variant="danger" size="sm" className="h-11" onClick={() => setOpen(true)}>
        Cancel
      </Button>
      <ConfirmDialog
        open={open}
        onClose={() => setOpen(false)}
        title="Cancel subscription?"
        confirmLabel="Cancel subscription"
        tone="danger"
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => cancelSubscription(id));
          if (r?.ok) setOpen(false);
        }}
      >
        The {PLAN_LABEL[plan] ?? plan} plan of {businessName} ends immediately. Their QR stops working unless another plan is active.
      </ConfirmDialog>
    </>
  );
}

/* ── Confirm / reject a pending payment ────────────────────────────────────── */

export function PaymentActions({ id, businessName, plan, amount, confirmOnly = false }: { id: string; businessName: string; plan: string; amount: number; confirmOnly?: boolean }) {
  const [dialog, setDialog] = useState<"confirm" | "reject" | null>(null);
  const { loading, run } = useAction();
  const planName = PLAN_LABEL[plan] ?? plan;

  return (
    <div className="flex gap-2">
      <Button variant="success" size="sm" className="h-11 flex-1 sm:flex-none" icon={<Check className="size-4" />} onClick={() => setDialog("confirm")}>
        Confirm
      </Button>
      {!confirmOnly && (
        <Button variant="danger" size="sm" className="h-11 flex-1 sm:flex-none" icon={<X className="size-4" />} onClick={() => setDialog("reject")}>
          Reject
        </Button>
      )}
      <ConfirmDialog
        open={dialog === "confirm"}
        onClose={() => setDialog(null)}
        title="Confirm payment"
        confirmLabel="Confirm payment"
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => confirmPayment(id));
          if (r?.ok) setDialog(null);
        }}
      >
        Confirm payment of <span className="font-semibold text-ink">{formatTND(amount)}</span> from{" "}
        <span className="font-semibold text-ink">{businessName}</span>? This activates the {planName} plan.
      </ConfirmDialog>
      <ConfirmDialog
        open={dialog === "reject"}
        onClose={() => setDialog(null)}
        title="Reject payment"
        confirmLabel="Mark as failed"
        tone="danger"
        loading={loading}
        onConfirm={async () => {
          const r = await run(() => rejectPayment(id));
          if (r?.ok) setDialog(null);
        }}
      >
        Mark the {formatTND(amount)} payment from {businessName} as failed? No plan is activated.
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
  const toast = useToast();

  return (
    <>
      <Button variant="outline" size="sm" className="h-11" icon={<KeyRound className="size-4" />} onClick={() => setConfirming(true)}>
        Reset password
      </Button>
      <ConfirmDialog
        open={confirming}
        onClose={() => setConfirming(false)}
        title="Reset password?"
        confirmLabel="Create temporary password"
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
        A new temporary password is created for <span className="font-semibold text-ink">{label}</span>. Their current password stops working right away.
      </ConfirmDialog>
      <Modal
        open={secret !== null}
        onClose={() => setSecret(null)}
        title="Temporary password"
        footer={
          <Button variant="primary" size="md" onClick={() => setSecret(null)} className="sm:w-auto">
            Done
          </Button>
        }
      >
        <div className="space-y-3">
          <div className="flex items-center gap-2 rounded-2xl bg-canvas p-2 pl-4">
            <code className="min-w-0 flex-1 select-all break-all font-mono text-xl font-semibold tracking-wider text-ink">{secret}</code>
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
                  toast("Could not copy. Select the text instead.", "error");
                }
              }}
            >
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>
          <p className="text-sm text-muted">Give it to the customer in person. They can change it from their profile.</p>
          <p className="text-xs font-medium text-warning-700">This password is shown only once.</p>
        </div>
      </Modal>
    </>
  );
}

/* ── Maintenance ───────────────────────────────────────────────────────────── */

export function CleanupButton() {
  const { loading, run } = useAction();
  return (
    <Button variant="outline" size="md" loading={loading} icon={<Trash2 className="size-5" />} onClick={() => run(runCleanup)}>
      Run cleanup
    </Button>
  );
}
