"use client";

import { useActionState } from "react";
import { updateBusiness } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { SubmitButton } from "@/components/ui/Button";
import { Field, Input, Select } from "@/components/ui/Field";
import { ToastOnResult } from "@/components/ui/Toast";
import { CATEGORIES } from "@/lib/constants";
import type { SessionContext } from "@/lib/types";

export function BusinessForm({ business, disabled }: { business: NonNullable<SessionContext["business"]>; disabled?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(updateBusiness, null);
  return (
    <form action={action}>
      <ToastOnResult result={state} />
      <fieldset disabled={disabled} className="min-w-0 space-y-4">
        <Field label="Business name" htmlFor="name">
          <Input id="name" name="name" defaultValue={business.name} required maxLength={60} />
        </Field>
        <Field label="Category" htmlFor="category">
          <Select id="category" name="category" defaultValue={business.category}>
            {Object.entries(CATEGORIES).map(([k, c]) => (
              <option key={k} value={k}>
                {c.label}
              </option>
            ))}
          </Select>
        </Field>
        <Field label="Business phone" htmlFor="bphone">
          <Input id="bphone" name="phone" type="tel" defaultValue={business.phone ?? ""} placeholder="+216 71 000 000" maxLength={30} />
        </Field>
        <Field label="Address" htmlFor="address">
          <Input id="address" name="address" defaultValue={business.address ?? ""} placeholder="Avenue Habib Bourguiba, Tunis" maxLength={160} autoComplete="street-address" />
        </Field>
        {!disabled && <SubmitButton pendingText="Saving…">Save business details</SubmitButton>}
      </fieldset>
    </form>
  );
}
