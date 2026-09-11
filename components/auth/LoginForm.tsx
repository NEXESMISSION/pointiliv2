"use client";

import Link from "next/link";
import { useActionState } from "react";
import { login } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Field } from "@/components/ui/Field";
import { PhoneInput } from "@/components/ui/PhoneInput";
import { PasswordInput } from "@/components/ui/PasswordInput";
import { SubmitButton, LinkButton } from "@/components/ui/Button";

export function LoginForm({ portal, next }: { portal: "customer" | "business"; next?: string }) {
  const [state, action] = useActionState<FormState, FormData>(login, null);
  const f = state?.fields ?? {};
  const registerHref = portal === "business" ? "/register" : `/customer/register${next ? `?next=${encodeURIComponent(next)}` : ""}`;

  return (
    <form action={action} className="space-y-5" noValidate>
      <input type="hidden" name="portal" value={portal} />
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && <Alert>{state.error}</Alert>}

      <Field label="Phone number" htmlFor="phone" error={f.phone}>
        <PhoneInput key={state?.at} defaultValue={state?.values?.phone ?? ""} invalid={!!f.phone} autoFocus />
      </Field>

      <Field
        label="Password"
        htmlFor="password"
        error={f.password}
        action={
          <Link href="/customer/forgot-password" className="text-sm font-semibold text-brand-600 hover:underline">
            Forgot password?
          </Link>
        }
      >
        <PasswordInput invalid={!!f.password} />
      </Field>

      <SubmitButton pendingText="Logging in…">Log in</SubmitButton>

      <div className="flex items-center gap-3 text-xs text-faint">
        <span className="h-px flex-1 bg-line" /> or <span className="h-px flex-1 bg-line" />
      </div>

      <LinkButton href={registerHref} variant="outline" block>
        {portal === "business" ? "Create your business" : "Create an account"}
      </LinkButton>

      <p className="pt-2 text-center text-sm text-muted">
        {portal === "business" ? (
          <>
            Collecting stamps?{" "}
            <Link href="/customer/login" className="font-semibold text-brand-600 hover:underline">
              Customer login
            </Link>
          </>
        ) : (
          <>
            Own a business?{" "}
            <Link href="/login" className="font-semibold text-brand-600 hover:underline">
              Business login
            </Link>
          </>
        )}
      </p>
    </form>
  );
}
