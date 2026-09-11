"use client";

import { updateName } from "@/app/actions/auth";
import type { FormState } from "@/app/actions/types";
import { SubmitButton } from "@/components/ui/Button";
import { Input } from "@/components/ui/Field";
import { ToastOnResult } from "@/components/ui/Toast";
import { useFormAction } from "@/lib/use-form-action";

export function NameForm({ defaultValue }: { defaultValue: string }) {
  const { state, onSubmit, pending } = useFormAction<FormState>(updateName, null);
  return (
    <form onSubmit={onSubmit} className="flex gap-2">
      <ToastOnResult result={state} />
      <label htmlFor="full_name" className="sr-only">
        Your name (optional)
      </label>
      <Input id="full_name" name="full_name" defaultValue={defaultValue} placeholder="Your name (optional)" maxLength={80} autoComplete="name" className="h-12" />
      <SubmitButton block={false} size="md" variant="secondary" className="h-12 shrink-0" pending={pending}>
        Save
      </SubmitButton>
    </form>
  );
}
