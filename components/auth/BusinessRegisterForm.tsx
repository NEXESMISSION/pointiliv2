"use client";

import Link from "next/link";
import { registerBusiness } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { CATEGORIES } from "@/lib/constants";
import { useFormAction } from "@/lib/use-form-action";

export function BusinessRegisterForm({ signedIn, defaultName, defaultEmail }: { signedIn: boolean; defaultName: string; defaultEmail: string }) {
  // No form reset: a problem with one field never wipes the others (or the password).
  const { state, onSubmit, pending } = useFormAction<FormState>(registerBusiness, null);
  const f = state?.fields ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {state?.error && (
        <Alert
          action={
            /log in/i.test(state.error) ? (
              <Link href="/login?next=/register" className="font-semibold underline">
                Log in
              </Link>
            ) : undefined
          }
        >
          {state.error}
        </Alert>
      )}

      <Field label="Business name" htmlFor="business_name" error={f.business_name}>
        <Input id="business_name" name="business_name" placeholder="Café Bonheur" required maxLength={60} autoComplete="organization" aria-invalid={!!f.business_name || undefined} autoFocus />
      </Field>

      <Field label="Category" htmlFor="category">
        <Select id="category" name="category" defaultValue="cafe">
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <option key={k} value={k}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Your name" htmlFor="full_name" error={f.full_name}>
        <Input id="full_name" name="full_name" placeholder="Sarah Ben Ali" defaultValue={defaultName} required maxLength={80} autoComplete="name" aria-invalid={!!f.full_name || undefined} />
      </Field>

      {!signedIn && (
        <Field label="Phone" htmlFor="phone" error={f.phone} hint="You'll log in with this number.">
          <PhoneInput invalid={!!f.phone} />
        </Field>
      )}

      <Field label="Email (optional)" htmlFor="email" error={f.email}>
        <Input id="email" name="email" type="email" inputMode="email" placeholder="you@business.tn" defaultValue={defaultEmail} autoComplete="email" aria-invalid={!!f.email || undefined} />
      </Field>

      {!signedIn && (
        <Field label="Password" htmlFor="password" error={f.password} hint="At least 8 characters.">
          <PasswordInput autoComplete="new-password" invalid={!!f.password} />
        </Field>
      )}

      <SubmitButton pending={pending} pendingText="Creating your business…">
        Create business
      </SubmitButton>

      {!signedIn && (
        <p className="text-center text-sm text-muted">
          Already have an account?{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            Log in
          </Link>
        </p>
      )}
    </form>
  );
}
