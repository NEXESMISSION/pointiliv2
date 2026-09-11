"use client";

import { useActionState, useEffect, useRef } from "react";
import { changePassword } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { ToastOnResult } from "@/components/ui/Toast";

export function ChangePasswordForm() {
  const [state, action] = useActionState<FormState, FormData>(changePassword, null);
  const form = useRef<HTMLFormElement>(null);
  const f = state?.fields ?? {};
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state?.ok, state?.at]);

  return (
    <form ref={form} action={action} className="space-y-5" noValidate>
      <ToastOnResult result={state} />
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label="Current password" htmlFor="current" error={f.current}>
        <PasswordInput name="current" invalid={!!f.current} />
      </Field>
      <Field label="New password" htmlFor="password" error={f.password} hint="At least 8 characters.">
        <PasswordInput autoComplete="new-password" invalid={!!f.password} />
      </Field>
      <Field label="Confirm new password" htmlFor="confirm" error={f.confirm}>
        <PasswordInput name="confirm" autoComplete="new-password" invalid={!!f.confirm} />
      </Field>
      <SubmitButton pendingText="Saving…">Change password</SubmitButton>
    </form>
  );
}
