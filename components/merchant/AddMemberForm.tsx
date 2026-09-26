"use client";

import { addMember } from "@/app/actions/abonili";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { SubmitButton } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";
import { useFormAction } from "@/lib/use-form-action";
import { formatTND } from "@/lib/format";
import type { MembershipPlan } from "@/lib/types";

/**
 * Selling an abonnement, in three boxes. The phone comes first because it is
 * the member's identity here — the account is optional and may never exist.
 * No form reset on an error: a taken minute at the counter is a taken minute.
 */
export function AddMemberForm({ plans }: { plans: MembershipPlan[] }) {
  const { t, locale, fill } = useT();
  const w = t.merchant.abonili;
  const { state, onSubmit, pending } = useFormAction<FormState>(addMember, null);

  const label = (p: MembershipPlan) => {
    const limit = [
      p.duration_days ? fill(w.perMonth, { days: p.duration_days }) : null,
      p.sessions ? fill(w.perSessions, { n: p.sessions }) : null,
    ]
      .filter(Boolean)
      .join(" · ");
    return `${p.name} — ${limit}${p.price > 0 ? ` · ${formatTND(p.price, locale)}` : ""}`;
  };

  return (
    <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}

      <Field label={w.phone} htmlFor="phone">
        <PhoneInput autoFocus />
      </Field>

      <Field label={w.name} htmlFor="full_name">
        <Input id="full_name" name="full_name" placeholder={w.namePlaceholder} maxLength={80} autoComplete="name" />
      </Field>

      <Field label={w.plan} htmlFor="plan_id">
        <Select id="plan_id" name="plan_id" defaultValue={plans[0]?.id}>
          {plans.map((p) => (
            <option key={p.id} value={p.id}>
              {label(p)}
            </option>
          ))}
        </Select>
      </Field>

      <SubmitButton pending={pending} pendingText={w.saving}>
        {w.save}
      </SubmitButton>
    </form>
  );
}
