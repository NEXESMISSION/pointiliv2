"use client";

import Link from "next/link";
import { registerCustomer } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { useFormAction } from "@/lib/use-form-action";

export function RegisterForm({ next }: { next?: string }) {
  // No form reset on errors: what was typed (both passwords too) stays put.
  const { state, onSubmit, pending } = useFormAction<FormState>(registerCustomer, null);
  const f = state?.fields ?? {};
  return (
    <form onSubmit={onSubmit} className="space-y-5" noValidate>
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert>{state.error}</Alert>}

      <Field label="Phone number" htmlFor="phone" error={f.phone}>
        <PhoneInput invalid={!!f.phone} autoFocus />
      </Field>
      <Field label="Password" htmlFor="password" error={f.password} hint="At least 8 characters.">
        <PasswordInput autoComplete="new-password" invalid={!!f.password} minLength={8} />
      </Field>
      <Field label="Confirm password" htmlFor="confirm" error={f.confirm}>
        <PasswordInput name="confirm" autoComplete="new-password" invalid={!!f.confirm} />
      </Field>

      <SubmitButton pending={pending} pendingText="Creating your account…">
        Create account
      </SubmitButton>

      <p className="text-center text-sm text-muted">
        Already have an account?{" "}
        <Link href={`/customer/login${next ? `?next=${encodeURIComponent(next)}` : ""}`} className="font-semibold text-brand-600 hover:underline">
          Log in
        </Link>
      </p>
    </form>
  );
}
