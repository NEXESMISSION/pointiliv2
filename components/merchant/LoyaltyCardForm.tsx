"use client";

import { useActionState, useState } from "react";
import { Check, Gift, Minus, Plus } from "lucide-react";
import { saveLoyaltyCard } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { BusinessAvatar, CardIcon } from "@/components/CardIcon";
import { StampGrid } from "@/components/LoyaltyCard";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { ToastOnResult } from "@/components/ui/Toast";
import { CARD_COLORS, CARD_ICONS, cardColor, COOLDOWN_OPTIONS, type CardColor } from "@/lib/constants";

type Initial = {
  name: string;
  description: string;
  stamps_required: number;
  reward_name: string;
  reward_description: string;
  color: string;
  icon: string;
  cooldown_minutes: number;
};

export function LoyaltyCardForm({ initial, businessName, logo, isNew, disabled }: { initial: Initial; businessName: string; logo: string | null; isNew: boolean; disabled?: boolean }) {
  const [state, action] = useActionState<FormState, FormData>(saveLoyaltyCard, null);
  const [stamps, setStamps] = useState(initial.stamps_required);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const [reward, setReward] = useState(initial.reward_name);
  const c = cardColor(color);
  const cooldownOptions = COOLDOWN_OPTIONS.some((o) => o.value === initial.cooldown_minutes)
    ? COOLDOWN_OPTIONS
    : [...COOLDOWN_OPTIONS, { value: initial.cooldown_minutes, label: `${initial.cooldown_minutes} minutes` }];

  return (
    <form action={action} className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_20rem] lg:items-start">
      <ToastOnResult result={state?.ok ? state : null} />
      {/* fieldsets default to min-width: min-content, which pushed the card past the screen edge */}
      <fieldset disabled={disabled} className="min-w-0 space-y-5">
        {state?.error && <Alert>{state.error}</Alert>}
        <Card className="space-y-5 p-5">
          <Field label="Card name" htmlFor="name">
            <Input id="name" name="name" defaultValue={initial.name} required maxLength={60} />
          </Field>

          <Field label="Stamps required" htmlFor="stamps_required" hint="How many visits before the reward. 8–10 works well.">
            <div className="flex h-13 items-center rounded-2xl border border-line bg-white">
              <input id="stamps_required" name="stamps_required" value={stamps} readOnly className="h-full min-w-0 flex-1 bg-transparent px-4 text-lg font-semibold text-ink tabular focus:outline-none" aria-live="polite" />
              <button type="button" onClick={() => setStamps((s) => Math.max(2, s - 1))} className="grid size-12 place-items-center text-body hover:text-brand-600 disabled:opacity-40" disabled={stamps <= 2} aria-label="Fewer stamps">
                <Minus className="size-5" />
              </button>
              <span className="h-6 w-px bg-line" />
              <button type="button" onClick={() => setStamps((s) => Math.min(30, s + 1))} className="grid size-12 place-items-center text-body hover:text-brand-600 disabled:opacity-40" disabled={stamps >= 30} aria-label="More stamps">
                <Plus className="size-5" />
              </button>
            </div>
          </Field>

          <Field label="Reward" htmlFor="reward_name">
            <Input id="reward_name" name="reward_name" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Free Coffee" required maxLength={60} />
          </Field>

          <Field label="Reward description" htmlFor="reward_description">
            <Textarea id="reward_description" name="reward_description" defaultValue={initial.reward_description} placeholder="Get one regular coffee for free." maxLength={200} rows={2} />
          </Field>

          <Field label="Card description (optional)" htmlFor="description">
            <Input id="description" name="description" defaultValue={initial.description} placeholder="Coffee & more" maxLength={200} />
          </Field>
        </Card>

        <Card className="space-y-5 p-5">
          <div>
            <p className="mb-2 text-sm font-medium text-body">Card style</p>
            <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Card colour">
              {(Object.keys(CARD_COLORS) as CardColor[]).map((k) => (
                <label key={k} className="cursor-pointer" title={CARD_COLORS[k].label}>
                  <input type="radio" name="color" value={k} checked={color === k} onChange={() => setColor(k)} className="peer sr-only" />
                  <span className="grid size-11 place-items-center rounded-full ring-offset-2 transition peer-checked:ring-2 peer-focus-visible:ring-2" style={{ background: CARD_COLORS[k].accent, ["--tw-ring-color" as string]: CARD_COLORS[k].accent }}>
                    {color === k && <Check className="size-5 text-white" strokeWidth={3} />}
                  </span>
                  <span className="sr-only">{CARD_COLORS[k].label}</span>
                </label>
              ))}
            </div>
          </div>

          <div>
            <p className="mb-2 text-sm font-medium text-body">Icon</p>
            <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Card icon">
              {CARD_ICONS.map((name) => (
                <label key={name} className="cursor-pointer">
                  <input type="radio" name="icon" value={name} checked={icon === name} onChange={() => setIcon(name)} className="peer sr-only" />
                  <span className="grid aspect-square place-items-center rounded-2xl border border-line bg-white text-body transition peer-checked:border-transparent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500" style={icon === name ? { background: c.accent } : undefined}>
                    <CardIcon name={name} className="size-5" />
                  </span>
                  <span className="sr-only">{name}</span>
                </label>
              ))}
            </div>
          </div>

          <Field label="One stamp per customer every" htmlFor="cooldown_minutes" hint="Stops a customer collecting several stamps in one visit.">
            <Select id="cooldown_minutes" name="cooldown_minutes" defaultValue={String(initial.cooldown_minutes)}>
              {cooldownOptions.map((o) => (
                <option key={o.value} value={o.value}>
                  {o.label}
                </option>
              ))}
            </Select>
          </Field>
        </Card>

        <SubmitButton pendingText="Saving…">{isNew ? "Create loyalty card" : "Save"}</SubmitButton>
      </fieldset>

      <div className="order-first min-w-0 lg:sticky lg:top-8 lg:order-last">
        <p className="mb-2 text-sm font-medium text-muted">Preview</p>
        <div className="rounded-3xl p-4 shadow-card" style={{ background: c.bg, boxShadow: `inset 0 0 0 1px ${c.soft}` }}>
          <div className="flex items-center gap-3">
            <BusinessAvatar logo={logo} icon={icon} color={color} size={48} />
            <div className="min-w-0">
              <p className="truncate font-bold text-ink">{businessName}</p>
              <p className="text-sm text-body tabular">
                <span className="font-bold" style={{ color: c.accent }}>
                  {Math.round(stamps * 0.4)}
                </span>{" "}
                / {stamps} stamps
              </p>
            </div>
          </div>
          <div className="mt-4">
            <StampGrid filled={Math.round(stamps * 0.4)} total={stamps} color={color} icon={icon} />
          </div>
          <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/80 p-3">
            <Gift className="size-5 shrink-0" style={{ color: c.accent }} />
            <p className="min-w-0 truncate text-sm font-semibold text-ink">{reward || "Your reward"}</p>
          </div>
        </div>
      </div>
    </form>
  );
}
