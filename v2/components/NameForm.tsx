"use client";

import { useActionState } from "react";
import { setName } from "@/app/actions";
import { Field } from "@/components/ui";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

export function NameForm({ name }: { name: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(setName, null);
  return (
    <form action={action} className="flex items-end gap-2">
      <div className="flex-1">
        <Field label={t.name} name="name" defaultValue={name} maxLength={60} error={state?.error} />
      </div>
      <button type="submit" disabled={pending} className="press mb-px h-[3.5rem] shrink-0 rounded-[1.125rem] bg-brand-soft px-5 text-[1rem] font-semibold text-brand disabled:opacity-50">
        {state && !state.error ? t.saved : t.save}
      </button>
    </form>
  );
}
