"use client";

import { useState, useTransition } from "react";
import { Pencil, Plus } from "lucide-react";
import { savePlan, setPlanActive } from "@/app/actions/abonili";
import type { FormState } from "@/app/actions/types";
import { Alert } from "@/components/ui/Alert";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { Field, Input } from "@/components/ui/Field";
import { Button, SubmitButton } from "@/components/ui/Button";
import { ToastOnResult } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
import { useFormAction } from "@/lib/use-form-action";
import { formatTND } from "@/lib/format";
import type { MembershipPlan } from "@/lib/types";

/**
 * The formules, and the form that writes them, in one place: the owner edits
 * by tapping a row, which fills the form below rather than opening a screen he
 * has to come back from.
 *
 * THE RULE THE DATABASE ENFORCES: a formule limits time, or visits, or both —
 * never neither. Both boxes may be left empty individually, so the hint says
 * so once instead of marking either one required.
 */
export function PlansManager({ plans }: { plans: MembershipPlan[] }) {
  const { t, locale, fill } = useT();
  const w = t.merchant.abonili;
  const { state, onSubmit, pending } = useFormAction<FormState>(savePlan, null);
  const [editing, setEditing] = useState<MembershipPlan | null>(null);
  const [toggling, startToggle] = useTransition();
  const [toggled, setToggled] = useState<{ ok: boolean; message: string; at: number } | null>(null);

  /* A successful save drops the form back to "new". Adjusted during render
     rather than in an effect: the row is already correct on the first paint,
     with no flash of the old plan still sitting in the boxes. */
  const [savedAt, setSavedAt] = useState<number | undefined>(undefined);
  if (state?.ok && state.at !== savedAt) {
    setSavedAt(state.at);
    setEditing(null);
  }

  const limit = (p: MembershipPlan) =>
    [p.duration_days ? fill(w.perMonth, { days: p.duration_days }) : null, p.sessions ? fill(w.perSessions, { n: p.sessions }) : null]
      .filter(Boolean)
      .join(" · ");

  return (
    <>
      <ToastOnResult result={state?.ok ? { ok: true, message: state.message, at: state.at } : toggled} />

      {plans.length > 0 && (
        <Card className="mb-4 divide-y divide-line/80 overflow-hidden">
          {plans.map((p) => (
            <div key={p.id} className="flex items-center gap-3 px-3.5 py-2.5">
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className="truncate text-[15px] font-semibold text-ink">{p.name}</span>
                  {!p.active && <Badge tone="neutral">{w.paused}</Badge>}
                </span>
                <span className="block truncate text-[13px] text-muted">
                  {limit(p)}
                  {p.price > 0 ? ` · ${formatTND(p.price, locale)}` : ""}
                  {p.members > 0 ? ` · ${fill(w.planMembers, { n: p.members })}` : ""}
                </span>
              </span>
              <button
                type="button"
                onClick={() =>
                  startToggle(async () => setToggled(await setPlanActive({ id: p.id, name: p.name, price: p.price, duration_days: p.duration_days, sessions: p.sessions }, !p.active)))
                }
                disabled={toggling}
                className="shrink-0 rounded-lg px-2 py-1 text-xs font-semibold text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                {p.active ? w.pause : w.activate}
              </button>
              <button
                type="button"
                onClick={() => setEditing(p)}
                aria-label={w.savePlan}
                className="grid size-8 shrink-0 place-items-center rounded-lg text-muted transition-colors hover:bg-canvas hover:text-ink"
              >
                <Pencil className="size-4" />
              </button>
            </div>
          ))}
        </Card>
      )}

      <Card className="p-4">
        <h2 className="mb-3 flex items-center gap-2 text-[15px] font-semibold text-ink">
          <Plus className="size-4 text-brand-600" />
          {editing ? editing.name : w.addPlan}
        </h2>
        {/* The key remounts the form, which is what empties it. It changes when
            a plan is picked for editing AND after every successful save —
            without the second half, the next "new formule" silently inherits
            the last one's days and price. */}
        <form key={editing?.id ?? `new-${savedAt ?? 0}`} onSubmit={onSubmit} className="space-y-3.5" noValidate>
          {editing && <input type="hidden" name="id" value={editing.id} />}
          {state?.error && <Alert>{state.error}</Alert>}

          <Field label={w.planName} htmlFor="name">
            <Input id="name" name="name" defaultValue={editing?.name ?? ""} placeholder={w.planNamePlaceholder} required maxLength={60} />
          </Field>

          <div className="grid grid-cols-3 gap-2">
            <Field label={w.planPrice} htmlFor="price">
              <Input id="price" name="price" type="number" inputMode="decimal" min={0} step="1" defaultValue={editing?.price ?? ""} dir="ltr" />
            </Field>
            <Field label={w.planDays} htmlFor="duration_days">
              <Input id="duration_days" name="duration_days" type="number" inputMode="numeric" min={1} max={1095} defaultValue={editing?.duration_days ?? ""} dir="ltr" />
            </Field>
            <Field label={w.planSessions} htmlFor="sessions">
              <Input id="sessions" name="sessions" type="number" inputMode="numeric" min={1} max={500} defaultValue={editing?.sessions ?? ""} dir="ltr" />
            </Field>
          </div>
          <p className="text-xs text-muted">{w.planLimitHint}</p>

          <div className="flex gap-2">
            {editing && (
              <Button type="button" variant="outline" onClick={() => setEditing(null)}>
                {t.common.cancel}
              </Button>
            )}
            <SubmitButton pending={pending}>{w.savePlan}</SubmitButton>
          </div>
        </form>
      </Card>
    </>
  );
}
