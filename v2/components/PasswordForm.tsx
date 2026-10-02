"use client";

import { useActionState } from "react";
import { changePassword } from "@/app/actions";
import { Field } from "@/components/ui";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

/** A new password, in one line: the field and the button. */
export function PasswordForm() {
  const [state, action, pending] = useActionState<FormState, FormData>(changePassword, null);
  const done = !!state && !state.error;
  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1">
        <Field label={t.newPassword} name="password" type="password" autoComplete="new-password" placeholder={t.passwordPh} minLength={8} required error={state?.error} />
      </div>
      <button type="submit" disabled={pending} className="press mb-px h-[3.5rem] shrink-0 rounded-[1.125rem] bg-brand-soft px-5 text-[1rem] font-semibold text-brand disabled:opacity-50">
        {done ? t.saved : t.change}
      </button>
    </form>
  );
}
