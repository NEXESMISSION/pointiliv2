"use client";

import { useRouter } from "next/navigation";
import { useActionState, useState, useTransition } from "react";
import { Check } from "lucide-react";
import { cancelPlanRequest, requestPlan } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { SubmitButton } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { ToastOnResult } from "@/components/ui/Toast";
import { PAYMENT_METHODS, PLANS, type PaidPlan } from "@/lib/constants";

export function PlanPicker() {
  const [state, action] = useActionState<FormState, FormData>(requestPlan, null);
  const [plan, setPlan] = useState<PaidPlan>("yearly");
  return (
    <form action={action} className="space-y-4">
      <ToastOnResult result={state} />
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
        {(Object.keys(PLANS) as PaidPlan[]).map((k) => {
          const p = PLANS[k];
          const on = plan === k;
          return (
            <label key={k} className={`relative block cursor-pointer rounded-3xl border-2 bg-white p-5 transition ${on ? "border-brand-600 shadow-brand/30 shadow-lg" : "border-line"}`}>
              <input type="radio" name="plan" value={k} checked={on} onChange={() => setPlan(k)} className="sr-only" />
              {k === "yearly" && <span className="absolute -top-3 left-5 rounded-full bg-success-500 px-3 py-1 text-xs font-bold text-white">Best value</span>}
              <div className="flex items-start justify-between">
                <p className="text-lg font-bold text-ink">{p.name}</p>
                <span className={`grid size-6 place-items-center rounded-full border-2 ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line"}`}>{on && <Check className="size-4" strokeWidth={3} />}</span>
              </div>
              <p className="mt-2 text-3xl font-extrabold text-ink tabular">
                {p.price} <span className="text-base font-semibold text-muted">TND / {p.period}</span>
              </p>
              <p className="text-sm text-muted">≈ {p.perMonth}</p>
            </label>
          );
        })}
      </div>
      <Field label="How will you pay?" htmlFor="method">
        <Select id="method" name="method" defaultValue="bank_transfer">
          {Object.entries(PAYMENT_METHODS).map(([k, label]) => (
            <option key={k} value={k}>
              {label}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton pendingText="Sending…">
        Request {PLANS[plan].name} · {PLANS[plan].price} TND
      </SubmitButton>
    </form>
  );
}

export function CancelPlanRequestButton({ id }: { id: string }) {
  const [pending, start] = useTransition();
  const router = useRouter();
  return (
    <button
      type="button"
      disabled={pending}
      onClick={() =>
        start(async () => {
          await cancelPlanRequest(id);
          router.refresh();
        })
      }
      className="text-sm font-semibold underline disabled:opacity-50"
    >
      Cancel request
    </button>
  );
}
