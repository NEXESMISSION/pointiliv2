"use client";

import { saveReward } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { useFormAction } from "@/lib/use-form-action";

export function RewardForm({ initial }: { initial: { id?: string; name: string; description: string; stamps_required: number; active: boolean; is_primary: boolean } }) {
  const { state, onSubmit, pending } = useFormAction<FormState>(saveReward, null);
  return (
    <form onSubmit={onSubmit} className="space-y-5">
      {initial.id && <input type="hidden" name="id" value={initial.id} />}
      {state?.error && <Alert>{state.error}</Alert>}
      {initial.is_primary && <Alert tone="info">This is your card&apos;s main reward. Changing its stamps also changes the number of stamps on your card.</Alert>}
      <Card className="space-y-5 p-5">
        <Field label="Reward name" htmlFor="name">
          <Input id="name" name="name" defaultValue={initial.name} placeholder="Free Cake" required maxLength={60} autoFocus={!initial.id} />
        </Field>
        <Field label="Required stamps" htmlFor="stamps_required" hint={initial.is_primary ? "Between 2 and 30." : "Between 1 and 100."}>
          <Input id="stamps_required" name="stamps_required" type="number" inputMode="numeric" min={initial.is_primary ? 2 : 1} max={initial.is_primary ? 30 : 100} defaultValue={initial.stamps_required} required />
        </Field>
        <Field label="Description" htmlFor="description">
          <Textarea id="description" name="description" defaultValue={initial.description} placeholder="One slice of any cake." maxLength={200} rows={3} />
        </Field>
        {!initial.is_primary && (
          <label className="flex min-h-12 cursor-pointer items-center justify-between gap-3">
            <span className="text-[15px] font-medium text-ink">Active</span>
            <input type="hidden" name="active" value="false" />
            <input type="checkbox" name="active" value="true" defaultChecked={initial.active} className="size-6 accent-brand-600" />
          </label>
        )}
      </Card>
      <SubmitButton pending={pending} pendingText="Saving…">
        Save reward
      </SubmitButton>
    </form>
  );
}
