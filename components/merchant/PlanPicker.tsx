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
import { useT } from "@/components/i18n/Provider";
import { formatNumber, formatTND } from "@/lib/format";
import { PAYMENT_METHODS, PLANS, type PaidPlan } from "@/lib/constants";

/** What one month works out to, so the two prices can be compared. */
const MONTHS: Record<PaidPlan, number> = { six_month: 6, yearly: 12 };

export function PlanPicker() {
  const { t, locale, fill } = useT();
  const { state, onSubmit, pending } = useFormAction<FormState>(requestPlan, null);
  const [plan, setPlan] = useState<PaidPlan>("yearly");
  const w = t.ops.billing;
  return (
    <form onSubmit={onSubmit} className="space-y-2.5">
      <ToastOnResult result={state} />
      <div className="grid grid-cols-2 gap-2.5" role="radiogroup" aria-label={w.planAria}>
        {(Object.keys(PLANS) as PaidPlan[]).map((k) => {
          const p = PLANS[k];
          const on = plan === k;
          return (
            <label key={k} className={`relative block cursor-pointer rounded-2xl bg-white p-2.5 text-center shadow-card transition-colors ${on ? "border-2 border-brand-600" : "border-2 border-line hover:border-brand-200"}`}>
              <input type="radio" name="plan" value={k} checked={on} onChange={() => setPlan(k)} className="sr-only" />
              <span className={`absolute end-2 top-2 grid size-5 place-items-center rounded-full border-2 ${on ? "border-brand-600 bg-brand-600 text-white" : "border-line"}`}>{on && <Check className="size-3" strokeWidth={3.5} />}</span>
              <p className="flex flex-wrap items-center justify-center gap-1.5 text-[15px] font-semibold text-ink">
                {t.data.plans[k]}
                {k === "yearly" && <span className="rounded-full bg-brand-50 px-2 py-0.5 text-xs font-semibold text-brand-700">{w.bestValue}</span>}
              </p>
              <p className="mt-1 text-xl font-bold tracking-tight text-ink tabular">
                {formatNumber(p.price, locale)} <span className="text-xs font-medium tracking-normal text-muted">{t.formats.currency} {t.data.planPeriod[k]}</span>
              </p>
              <p className="text-[13px] text-muted">≈ {fill(t.formats.perMonth, { price: formatNumber(Math.round((p.price / MONTHS[k]) * 10) / 10, locale) })}</p>
            </label>
          );
        })}
      </div>
      <Field label={w.howWillYouPay} htmlFor="method">
        <Select id="method" name="method" defaultValue="bank_transfer">
          {(Object.keys(PAYMENT_METHODS) as (keyof typeof PAYMENT_METHODS)[]).map((k) => (
            <option key={k} value={k}>
              {t.data.payments[k]}
            </option>
          ))}
        </Select>
      </Field>
      <SubmitButton pending={pending} pendingText={t.common.sending}>
        {fill(w.requestPlan, { plan: t.data.plans[plan], price: formatTND(PLANS[plan].price, locale) })}
      </SubmitButton>
    </form>
  );
}

export function CancelPlanRequestButton({ id }: { id: string }) {
  const { t } = useT();
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
      {t.ops.billing.cancelRequest}
    </button>
  );
}
