"use client";

import { Check } from "lucide-react";
import { finishWelcome } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { useT } from "@/components/i18n/Provider";
import { Alert } from "@/components/ui/Alert";
import { SubmitButton } from "@/components/ui/Button";
import { Field, Input } from "@/components/ui/Field";
import { useFormAction } from "@/lib/use-form-action";
import { ImageUploader } from "./ImageUploader";

/** Shop → card → ready: where the owner is in his first sign-in, always in view. */
export function WelcomeSteps({ step }: { step: 1 | 2 | 3 }) {
  const { t } = useT();
  const w = t.merchant.welcome.steps;
  const labels = [w.shop, w.card, w.ready];
  return (
    <ol className="mx-auto flex w-full max-w-xs items-center justify-center gap-1.5" aria-label={labels.join(" → ")}>
      {labels.map((label, i) => {
        const n = i + 1;
        const done = n < step;
        const now = n === step;
        return (
          <li key={label} className="flex min-w-0 items-center gap-1.5" aria-current={now ? "step" : undefined}>
            {i > 0 && <span className={`h-px w-4 shrink-0 ${done || now ? "bg-brand-400" : "bg-line"}`} aria-hidden />}
            <span
              className={`grid size-6 shrink-0 place-items-center rounded-full text-xs font-bold ${done ? "bg-brand-600 text-white" : now ? "bg-brand-600 text-white ring-4 ring-brand-500/15" : "bg-line text-muted"}`}
            >
              {done ? <Check className="size-3.5" strokeWidth={3} /> : n}
            </span>
            <span className={`truncate text-xs font-semibold ${now ? "text-ink" : "text-muted"}`}>{label}</span>
          </li>
        );
      })}
    </ol>
  );
}

/** Step one: only what the founder could not know. The logo saves on its own. */
export function WelcomeForm({ address, instagram, logo, icon, color }: { address: string | null; instagram: string | null; logo: string | null; icon?: string | null; color?: string | null }) {
  const { t } = useT();
  const w = t.merchant.welcome;
  const { state, onSubmit, pending } = useFormAction<FormState>(finishWelcome, null);
  const optional = <span className="font-normal text-faint">· {w.optional}</span>;
  return (
    <form onSubmit={onSubmit} className="space-y-3.5" noValidate>
      {state?.error && <Alert>{state.error}</Alert>}
      <div>
        <p className="mb-2 text-sm font-medium text-body">
          {w.logo} {optional}
        </p>
        <ImageUploader kind="logo" url={logo} icon={icon} color={color} />
      </div>
      <Field label={<>{w.address} {optional}</>} htmlFor="address">
        <Input id="address" name="address" defaultValue={state?.values?.address ?? address ?? ""} placeholder={w.addressPlaceholder} maxLength={160} autoComplete="street-address" />
      </Field>
      <Field label={<>{w.instagram} {optional}</>} htmlFor="instagram" error={state?.fields?.instagram}>
        <Input
          id="instagram"
          name="instagram"
          dir="ltr"
          defaultValue={state?.values?.instagram ?? instagram ?? ""}
          placeholder="@cafe.yasmine"
          maxLength={60}
          autoCapitalize="none"
          spellCheck={false}
        />
      </Field>
      <SubmitButton pending={pending} pendingText={t.common.saving}>
        {w.next}
      </SubmitButton>
    </form>
  );
}
