"use client";

import Link from "next/link";
import { login } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton, LinkButton } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";
import { useFormAction } from "@/lib/use-form-action";

/**
 * `contactHref` (shop login only): where an owner without an account reaches
 * Pointili. Shops are never opened from this screen — Pointili opens them.
 */
export function LoginForm({ portal, next, contactHref }: { portal: "customer" | "business"; next?: string; contactHref?: string | null }) {
  const { t } = useT();
  // Submitting without a form reset: a wrong password keeps the number and the password on screen.
  const { state, onSubmit, pending } = useFormAction<FormState>(login, null);
  const f = state?.fields ?? {};
  const registerHref = `/customer/register${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
      <input type="hidden" name="portal" value={portal} />
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert>{state.error}</Alert>}

      <Field label={t.common.phoneNumber} htmlFor="phone" error={f.phone}>
        <PhoneInput invalid={!!f.phone} autoFocus />
      </Field>

      <Field
        label={t.common.password}
        htmlFor="password"
        error={f.password}
        action={
          <Link href="/customer/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline">
            {t.auth.login.forgot}
          </Link>
        }
      >
        <PasswordInput invalid={!!f.password} />
      </Field>

      <SubmitButton pending={pending} pendingText={t.auth.login.submitting}>
        {t.auth.login.submit}
      </SubmitButton>

      {portal === "business" ? (
        <div className="space-y-2.5 rounded-2xl bg-canvas p-3.5 text-center">
          <p className="text-sm text-muted">{t.auth.login.ownersByPointili}</p>
          {contactHref && (
            <LinkButton href={contactHref} target="_blank" rel="noopener noreferrer" variant="outline" block>
              {t.auth.login.contactPointili}
            </LinkButton>
          )}
        </div>
      ) : (
        <>
          <div className="flex items-center gap-3 text-xs text-faint">
            <span className="h-px flex-1 bg-line" /> {t.auth.or} <span className="h-px flex-1 bg-line" />
          </div>

          <LinkButton href={registerHref} variant="outline" block>
            {t.auth.login.createAccount}
          </LinkButton>
        </>
      )}
    </form>
  );
}
