"use client";

import Link from "next/link";
import { Clock } from "lucide-react";
import { stampSignIn } from "@/app/actions/scan";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { Logo } from "@/components/Logo";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";
import { useFormAction } from "@/lib/use-form-action";

/**
 * The counter screen for someone who is not signed in: number, password, done.
 * Whether the account already exists is the server's problem, not the customer's.
 */
export function StampSignIn({ token, businessName }: { token: string; businessName: string | null }) {
  const { t } = useT();
  const w = t.scan.signIn;
  const { state, onSubmit, pending } = useFormAction<FormState>(stampSignIn, null);
  const f = state?.fields ?? {};

  return (
    <div className="flex flex-1 flex-col">
      <Logo size={28} className="mx-auto" />

      <div className="mt-8 text-center">
        <h1 className="text-[26px] font-extrabold tracking-tight text-ink">{w.title}</h1>
        {businessName && <p className="mt-1 text-lg font-semibold text-brand-600">{businessName}</p>}
        <p className="mt-2 text-[15px] text-muted">{w.body}</p>
      </div>

      <form onSubmit={onSubmit} className="mt-7 space-y-4" noValidate>
        <input type="hidden" name="token" value={token} />
        {state?.error && <Alert>{state.error}</Alert>}

        <Field label={t.common.phoneNumber} htmlFor="phone" error={f.phone}>
          <PhoneInput invalid={!!f.phone} autoFocus />
        </Field>
        <Field label={t.common.password} htmlFor="password" error={f.password} hint={t.auth.passwordHint}>
          <PasswordInput autoComplete="current-password" invalid={!!f.password} minLength={8} />
        </Field>

        <SubmitButton pending={pending} pendingText={w.submitting}>
          {w.submit}
        </SubmitButton>
      </form>

      <p className="mt-4 text-center text-sm text-muted">{w.firstTime}</p>

      <div className="mt-auto space-y-3 pt-8 text-center">
        <p className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-sm font-medium text-success-600">
          <Clock className="size-4" /> {t.scan.needsAccount.held}
        </p>
        <p className="text-sm">
          <Link href={`/customer/forgot-password?next=${encodeURIComponent(`/scan/${token}`)}`} className="font-semibold text-brand-600 hover:underline">
            {w.forgot}
          </Link>
        </p>
      </div>
    </div>
  );
}
