"use client";

import { updateBusiness } from "@/app/actions/merchant";
import { useFormAction } from "@/lib/use-form-action";
import type { FormState } from "@/app/actions/types";
import { SubmitButton } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ToastOnResult } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
import { CATEGORIES } from "@/lib/constants";
import type { SessionContext } from "@/lib/types";

export function BusinessForm({ business, disabled }: { business: NonNullable<SessionContext["business"]>; disabled?: boolean }) {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction<FormState>(updateBusiness, null);
  const w = t.ops.settings;
  return (
    <form onSubmit={onSubmit}>
      <ToastOnResult result={state} />
      <fieldset disabled={disabled} className="min-w-0 space-y-3">
        <Field label={w.businessName} htmlFor="name">
          <Input id="name" name="name" defaultValue={business.name} required maxLength={60} />
        </Field>
        <Field label={w.category} htmlFor="category">
          <Select id="category" name="category" defaultValue={business.category}>
            {(Object.keys(CATEGORIES) as (keyof typeof CATEGORIES)[]).map((k) => (
              <option key={k} value={k}>
                {t.data.categories[k]}
              </option>
            ))}
          </Select>
        </Field>
        <Field label={w.businessPhone} htmlFor="bphone">
          <Input id="bphone" name="phone" type="tel" dir="ltr" defaultValue={business.phone ?? ""} placeholder="+216 71 000 000" maxLength={30} />
        </Field>
        <Field label={w.address} htmlFor="address">
          <Input id="address" name="address" defaultValue={business.address ?? ""} placeholder={w.addressPlaceholder} maxLength={160} autoComplete="street-address" />
        </Field>
        {!disabled && (
          <SubmitButton size="md" pending={pending} pendingText={t.common.saving}>
            {w.saveBusiness}
          </SubmitButton>
        )}
      </fieldset>
    </form>
  );
}
