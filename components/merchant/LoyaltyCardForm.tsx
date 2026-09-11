"use client";

import { useActionState, useEffect, useRef, useState, type ReactNode } from "react";
import { Check, Minus, Plus } from "lucide-react";
import { saveLoyaltyCard } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { CardIcon } from "@/components/CardIcon";
import { CardFace } from "@/components/CardFace";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ToastOnResult } from "@/components/ui/Toast";
import { CARD_COLORS, CARD_ICONS, cardColor, COOLDOWN_OPTIONS, type CardColor } from "@/lib/constants";
import type { CardImpact } from "@/lib/types";

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
type Business = { name: string; logo_url: string | null; cover_url: string | null; category: string; address: string | null };

const REWARD_IDEAS: Record<string, string[]> = {
  cafe: ["Free Coffee", "Free Cappuccino", "Free Croissant"],
  restaurant: ["Free Dessert", "Free Drink", "10% off your meal"],
  fast_food: ["Free Sandwich", "Free Fries", "Free Drink"],
  pizzeria: ["Free Pizza", "Free Drink", "Free Dessert"],
  bakery: ["Free Croissant", "Free Cake Slice", "Free Baguette"],
  ice_cream: ["Free Ice Cream", "Free Juice", "Free Topping"],
  salon: ["Free Haircut", "Free Beard Trim", "50% off a cut"],
  beauty: ["Free Manicure", "Free Facial", "20% off a treatment"],
  retail: ["10% Discount", "Free Gift", "15 TND off"],
  other: ["Free Gift", "10% Discount"],
};
const STAMP_PICKS = [6, 8, 10, 12];

const plural = (n: number, word: string) => `${n} ${word}${n === 1 ? "" : "s"}`;

export function LoyaltyCardForm({ initial, business, isNew, disabled, impact, branding }: { initial: Initial; business: Business; isNew: boolean; disabled?: boolean; impact: CardImpact | null; branding: ReactNode }) {
  const [state, action] = useActionState<FormState, FormData>(saveLoyaltyCard, null);
  const ideas = REWARD_IDEAS[business.category] ?? REWARD_IDEAS.other!;
  const [stamps, setStamps] = useState(initial.stamps_required);
  const [color, setColor] = useState(initial.color);
  const [icon, setIcon] = useState(initial.icon);
  const [reward, setReward] = useState(initial.reward_name || ideas[0]!);
  const [rewardDesc, setRewardDesc] = useState(initial.reward_description);
  const [ask, setAsk] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);
  const c = cardColor(color);

  useEffect(() => {
    confirmed.current = false;
  }, [state?.at]);

  // ── what saving would do to customers already collecting ──────────────
  const current = impact?.stamps_required ?? null;
  const rows = impact?.progress ?? [];
  const count = (f: (r: CardImpact["progress"][number]) => boolean) => rows.filter(f).reduce((a, r) => a + r.n, 0);
  const raised = !isNew && current !== null && stamps > current;
  const lowered = !isNew && current !== null && stamps < current;
  const keepGoal = raised ? count((r) => r.target < stamps) : 0;
  const unlockNow = lowered ? count((r) => r.balance >= stamps && r.balance < r.target) : 0;
  const renamed = !isNew && !!initial.reward_name && reward.trim() !== initial.reward_name && (impact?.customers ?? 0) > 0;
  const needsConfirm = keepGoal > 0 || unlockNow > 0 || renamed;

  const cooldownOptions = COOLDOWN_OPTIONS.some((o) => o.value === initial.cooldown_minutes)
    ? COOLDOWN_OPTIONS
    : [...COOLDOWN_OPTIONS, { value: initial.cooldown_minutes, label: initial.cooldown_minutes === 0 ? "No limit (demo)" : `${initial.cooldown_minutes} minutes` }];

  const impactMessages = (
    <>
      {raised && keepGoal > 0 && (
        <li>
          <b>{plural(keepGoal, "customer")}</b> already collecting keep their current goal. {stamps} stamps applies to their next card and to new customers.
        </li>
      )}
      {lowered && (
        <li>
          {unlockNow > 0 ? (
            <>
              <b>{plural(unlockNow, "customer")}</b> unlock {reward || "the reward"} right away.
            </>
          ) : (
            <>Everyone needs fewer stamps, starting now.</>
          )}
        </li>
      )}
      {renamed && (
        <li>
          Customers will see “{reward.trim()}” instead of “{initial.reward_name}”.
          {impact && impact.pending_redemptions > 0 ? ` ${plural(impact.pending_redemptions, "request")} already made keep “${initial.reward_name}”.` : ""}
        </li>
      )}
    </>
  );

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <aside className="order-first min-w-0 lg:sticky lg:top-8 lg:order-last">
          <p className="mb-2 text-sm font-medium text-muted">What your customers see</p>
          <CardFace business={business} style={{ color, icon }} filled={Math.max(1, Math.round(stamps * 0.4))} total={stamps} reward={{ name: reward, description: rewardDesc }} />
        </aside>

        <div className="min-w-0 space-y-5">
          {branding}

          <form
            ref={form}
            action={action}
            onSubmit={(e) => {
              if (needsConfirm && !confirmed.current) {
                e.preventDefault();
                setAsk(true);
              }
            }}
          >
            <ToastOnResult result={state?.ok ? state : null} />
            {/* fieldsets default to min-width: min-content, which pushes content past a phone screen */}
            <fieldset disabled={disabled} className="min-w-0 space-y-5">
              {state?.error && <Alert>{state.error}</Alert>}

              <Card className="space-y-5 p-5">
                <p className="font-semibold text-ink">Reward</p>

                <Field label="Stamps to earn it" htmlFor="stamps_required" hint="Most shops pick 8 or 10 — about one reward a month for a regular.">
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
                  <div className="flex flex-wrap gap-2 pt-1">
                    {STAMP_PICKS.map((n) => (
                      <button
                        key={n}
                        type="button"
                        onClick={() => setStamps(n)}
                        className={`h-9 rounded-full px-4 text-sm font-semibold transition ${stamps === n ? "bg-brand-600 text-white" : "border border-line bg-white text-body hover:bg-canvas"}`}
                      >
                        {n}
                      </button>
                    ))}
                  </div>
                </Field>

                {(raised || lowered) && (keepGoal > 0 || lowered) && (
                  <Alert tone={lowered ? "success" : "info"} title={lowered ? "Good news for your customers" : "Fair for your regulars"}>
                    <ul className="list-none space-y-1">{impactMessages}</ul>
                  </Alert>
                )}

                <Field label="Reward" htmlFor="reward_name">
                  <Input id="reward_name" name="reward_name" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Free Coffee" required maxLength={60} />
                  <div className="flex flex-wrap gap-2 pt-1">
                    {ideas.map((idea) => (
                      <button
                        key={idea}
                        type="button"
                        onClick={() => setReward(idea)}
                        className={`h-9 rounded-full px-3.5 text-sm font-medium transition ${reward === idea ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "border border-line bg-white text-body hover:bg-canvas"}`}
                      >
                        {idea}
                      </button>
                    ))}
                  </div>
                </Field>

                {renamed && (
                  <Alert tone="warning">
                    <ul className="list-none">{impactMessages}</ul>
                  </Alert>
                )}

                <Field label="Reward description" htmlFor="reward_description">
                  <Textarea id="reward_description" name="reward_description" value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} placeholder="Get one regular coffee for free." maxLength={200} rows={2} />
                </Field>
              </Card>

              <Card className="space-y-5 p-5">
                <p className="font-semibold text-ink">Look</p>
                <Field label="Card name" htmlFor="name">
                  <Input id="name" name="name" defaultValue={initial.name} required maxLength={60} />
                </Field>
                <Field label="Short description (optional)" htmlFor="description">
                  <Input id="description" name="description" defaultValue={initial.description} placeholder="Coffee & more" maxLength={200} />
                </Field>

                <div>
                  <p className="mb-2 text-sm font-medium text-body">Colour</p>
                  <div className="flex flex-wrap gap-3" role="radiogroup" aria-label="Card colour">
                    {(Object.keys(CARD_COLORS) as CardColor[]).map((k) => (
                      <label key={k} className="cursor-pointer" title={CARD_COLORS[k].label}>
                        <input type="radio" name="color" value={k} checked={color === k} onChange={() => setColor(k)} className="peer sr-only" />
                        <span
                          className="grid size-11 place-items-center rounded-full ring-offset-2 transition peer-checked:ring-2 peer-focus-visible:ring-2"
                          style={{ background: CARD_COLORS[k].accent, ["--tw-ring-color" as string]: CARD_COLORS[k].accent }}
                        >
                          {color === k && <Check className="size-5 text-white" strokeWidth={3} />}
                        </span>
                        <span className="sr-only">{CARD_COLORS[k].label}</span>
                      </label>
                    ))}
                  </div>
                </div>

                <div>
                  <p className="mb-2 text-sm font-medium text-body">Stamp icon</p>
                  <div className="grid grid-cols-6 gap-2" role="radiogroup" aria-label="Card icon">
                    {CARD_ICONS.map((name) => (
                      <label key={name} className="cursor-pointer">
                        <input type="radio" name="icon" value={name} checked={icon === name} onChange={() => setIcon(name)} className="peer sr-only" />
                        <span
                          className="grid aspect-square place-items-center rounded-2xl border border-line bg-white text-body transition peer-checked:border-transparent peer-checked:text-white peer-focus-visible:ring-2 peer-focus-visible:ring-brand-500"
                          style={icon === name ? { background: c.accent } : undefined}
                        >
                          <CardIcon name={name} className="size-5" />
                        </span>
                        <span className="sr-only">{name}</span>
                      </label>
                    ))}
                  </div>
                </div>
              </Card>

              <Card className="space-y-4 p-5">
                <p className="font-semibold text-ink">Rules</p>
                <Field label="One stamp per customer every" htmlFor="cooldown_minutes" hint="Stops someone collecting several stamps in one visit.">
                  <Select id="cooldown_minutes" name="cooldown_minutes" defaultValue={String(initial.cooldown_minutes)}>
                    {cooldownOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <details className="rounded-2xl bg-canvas p-3 text-sm text-body">
                  <summary className="cursor-pointer font-semibold text-ink">What happens when I change the card?</summary>
                  <ul className="mt-2 list-disc space-y-1.5 pl-5">
                    <li>
                      <b>More stamps:</b> customers already collecting keep the goal they started with. The new number applies to their next card and to new customers.
                    </li>
                    <li>
                      <b>Fewer stamps:</b> everyone benefits right away.
                    </li>
                    <li>
                      <b>New reward name:</b> shown to everyone at once. Rewards a customer already asked to use keep the old name.
                    </li>
                    <li>
                      <b>Colour, icon, logo, cover:</b> just the look — nobody loses a stamp.
                    </li>
                    <li>
                      <b>Card complete:</b> customers can keep collecting. Extra stamps carry over to the next card after you confirm the reward.
                    </li>
                  </ul>
                </details>
              </Card>

              {!disabled && <SubmitButton pendingText="Saving…">{isNew ? "Create loyalty card" : "Save changes"}</SubmitButton>}
            </fieldset>
          </form>
        </div>
      </div>

      <ConfirmDialog
        open={ask}
        onClose={() => setAsk(false)}
        title="Save these changes?"
        confirmLabel="Save changes"
        onConfirm={() => {
          confirmed.current = true;
          setAsk(false);
          form.current?.requestSubmit();
        }}
      >
        <ul className="list-disc space-y-2 pl-5">{impactMessages}</ul>
      </ConfirmDialog>
    </>
  );
}
