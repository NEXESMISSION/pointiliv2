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
import { useT } from "@/components/i18n/Provider";
import { useFormAction } from "@/lib/use-form-action";

export function BusinessRegisterForm({ signedIn, defaultName, defaultEmail }: { signedIn: boolean; defaultName: string; defaultEmail: string }) {
  const { t } = useT();
  // No form reset: a problem with one field never wipes the others (or the password).
  const { state, onSubmit, pending } = useFormAction<FormState>(registerBusiness, null);
  const f = state?.fields ?? {};

  return (
    <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
      {state?.error && (
        <Alert
          action={
            // The action marks the one error whose way out is to sign in first.
            state.data === "login" ? (
              <Link href="/login?next=/register" className="font-semibold underline">
                {t.auth.login.submit}
              </Link>
            ) : undefined
          }
        >
          {state.error}
        </Alert>
      )}

      <Field label={t.auth.business.name} htmlFor="business_name" error={f.business_name}>
        <Input
          id="business_name"
          name="business_name"
          placeholder={t.auth.business.namePlaceholder}
          required
          maxLength={60}
          autoComplete="organization"
          aria-invalid={!!f.business_name || undefined}
          autoFocus
        />
      </Field>

      <Field label={t.auth.business.category} htmlFor="category">
        <Select id="category" name="category" defaultValue="cafe">
          {Object.keys(CATEGORIES).map((k) => (
            <option key={k} value={k}>
              {t.data.categories[k as keyof typeof CATEGORIES]}
            </option>
          ))}
        </Select>
      </Field>

      <Field label={t.auth.business.ownerName} htmlFor="full_name" error={f.full_name}>
        <Input
          id="full_name"
          name="full_name"
          placeholder={t.auth.business.ownerPlaceholder}
          defaultValue={defaultName}
          required
          maxLength={80}
          autoComplete="name"
          aria-invalid={!!f.full_name || undefined}
        />
      </Field>

      {!signedIn && (
        <Field label={t.auth.business.phone} htmlFor="phone" error={f.phone} hint={t.auth.business.phoneHint}>
          <PhoneInput invalid={!!f.phone} />
        </Field>
      )}

      <Field label={t.auth.business.email} htmlFor="email" error={f.email}>
        <Input
          id="email"
          name="email"
          type="email"
          inputMode="email"
          placeholder={t.auth.business.emailPlaceholder}
          defaultValue={defaultEmail}
          autoComplete="email"
          aria-invalid={!!f.email || undefined}
          dir="ltr"
        />
      </Field>

      {!signedIn && (
        <Field label={t.common.password} htmlFor="password" error={f.password} hint={t.auth.passwordHint}>
          <PasswordInput autoComplete="new-password" invalid={!!f.password} />
        </Field>
      )}

      <SubmitButton pending={pending} pendingText={t.auth.business.submitting}>
        {t.auth.business.submit}
      </SubmitButton>

      {!signedIn && (
        <p className="text-center text-sm text-muted">
          {t.auth.haveAccount}{" "}
          <Link href="/login" className="font-semibold text-brand-600 hover:underline">
            {t.auth.login.submit}
          </Link>
        </p>
      )}
    </form>
  );
}
