"use client";

import { useEffect, useRef } from "react";
import { changePassword } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { ToastOnResult } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
import { useFormAction } from "@/lib/use-form-action";

export function ChangePasswordForm() {
  const { t } = useT();
  const { state, onSubmit, pending } = useFormAction<FormState>(changePassword, null);
  const form = useRef<HTMLFormElement>(null);
  const f = state?.fields ?? {};
  // Fields stay filled when something is wrong; they clear only after a successful change.
  useEffect(() => {
    if (state?.ok) form.current?.reset();
  }, [state?.ok, state?.at]);

  return (
    <form ref={form} onSubmit={onSubmit} className="space-y-3.5" noValidate>
      <ToastOnResult result={state} />
      {state?.error && <Alert>{state.error}</Alert>}
      <Field label={t.auth.changePassword.current} htmlFor="current" error={f.current}>
        <PasswordInput name="current" invalid={!!f.current} />
      </Field>
      <Field label={t.auth.newPassword} htmlFor="password" error={f.password} hint={t.auth.passwordHint}>
        <PasswordInput autoComplete="new-password" invalid={!!f.password} />
      </Field>
      <Field label={t.auth.changePassword.confirm} htmlFor="confirm" error={f.confirm}>
        <PasswordInput name="confirm" autoComplete="new-password" invalid={!!f.confirm} />
      </Field>
      <SubmitButton pending={pending} pendingText={t.common.saving}>
        {t.auth.changePassword.submit}
      </SubmitButton>
    </form>
  );
}
