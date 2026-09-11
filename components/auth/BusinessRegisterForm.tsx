"use client";

import Link from "next/link";
import { useActionState } from "react";
import { registerBusiness } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field, Input, Select } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { CATEGORIES } from "@/lib/constants";

export function BusinessRegisterForm({ signedIn, defaultName, defaultEmail }: { signedIn: boolean; defaultName: string; defaultEmail: string }) {
  const [state, action] = useActionState<FormState, FormData>(registerBusiness, null);
  const f = state?.fields ?? {};
  const v = state?.values ?? {};

  return (
    <form action={action} className="space-y-5" noValidate key={state?.at}>
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
        <Input id="business_name" name="business_name" placeholder="Café Bonheur" defaultValue={v.business_name ?? ""} required maxLength={60} autoComplete="organization" aria-invalid={!!f.business_name || undefined} autoFocus />
      </Field>

      <Field label="Category" htmlFor="category">
        <Select id="category" name="category" defaultValue={v.category ?? "cafe"}>
          {Object.entries(CATEGORIES).map(([k, c]) => (
            <option key={k} value={k}>
              {c.label}
            </option>
          ))}
        </Select>
      </Field>

      <Field label="Your name" htmlFor="full_name" error={f.full_name}>
        <Input id="full_name" name="full_name" placeholder="Sarah Ben Ali" defaultValue={v.full_name ?? defaultName} required maxLength={80} autoComplete="name" aria-invalid={!!f.full_name || undefined} />
      </Field>

      {!signedIn && (
        <Field label="Phone" htmlFor="phone" error={f.phone} hint="You'll log in with this number.">
          <PhoneInput defaultValue={v.phone ?? ""} invalid={!!f.phone} />
        </Field>
      )}

      <Field label="Email (optional)" htmlFor="email" error={f.email}>
        <Input id="email" name="email" type="email" inputMode="email" placeholder="you@business.tn" defaultValue={v.email ?? defaultEmail} autoComplete="email" aria-invalid={!!f.email || undefined} />
      </Field>

      {!signedIn && (
        <Field label="Password" htmlFor="password" error={f.password} hint="At least 8 characters.">
          <PasswordInput autoComplete="new-password" invalid={!!f.password} />
        </Field>
      )}

      <SubmitButton pendingText="Creating your business…">Create business</SubmitButton>

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
