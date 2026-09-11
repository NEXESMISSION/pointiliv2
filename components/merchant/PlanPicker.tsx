"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { useFormAction } from "@/lib/use-form-action";
import { Check } from "lucide-react";
import { cancelPlanRequest, requestPlan } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { SubmitButton } from "@/components/ui/Button";
import { Field, Select } from "@/components/ui/Field";
import { ToastOnResult } from "@/components/ui/Toast";
import { PAYMENT_METHODS, PLANS, type PaidPlan } from "@/lib/constants";

export function PlanPicker() {
  const { state, onSubmit, pending } = useFormAction<FormState>(requestPlan, null);
  const [plan, setPlan] = useState<PaidPlan>("yearly");
  return (
    <form onSubmit={onSubmit} className="space-y-4">
      <ToastOnResult result={state} />
      <div className="grid gap-3 sm:grid-cols-2" role="radiogroup" aria-label="Plan">
        {(Object.keys(PLANS) as PaidPlan[]).map((k) => {
          const p = PLANS[k];
          const on = plan === k;
          return (
            <label key={k} className={`relative block cursor-pointer rounded-2xl bg-white p-5 shadow-card transition-colors ${on ? "border-2 border-brand-600" : "border-2 border-line hover:border-brand-200"}`}>
              <input type="radio" name="plan" value={k} checked={on} onChange={() => setPlan(k)} className="sr-only" />
              <div className="flex items-center justify-between gap-3">
                <p className="flex items-center gap-2 text-[15px] font-semibold text-ink">
                  {p.name}
                  {k === "yearly" && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">Best value</span>}
                </p>
                <span className={`grid size-5 place-items-center rounded-full border-2 ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line"}`}>{on && <Check className="size-3" strokeWidth={3.5} />}</span>
              </div>
              <p className="mt-3 text-3xl font-bold tracking-tight text-ink tabular">
                {p.price} <span className="text-sm font-medium tracking-normal text-muted">TND / {p.period}</span>
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
      <SubmitButton pending={pending} pendingText="Sending…">
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
