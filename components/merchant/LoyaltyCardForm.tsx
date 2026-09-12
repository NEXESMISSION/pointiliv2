"use client";

import Link from "next/link";
import { useRef, useState } from "react";
import { ChevronDown, Palette } from "lucide-react";
import { saveLoyaltyCard } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Field, Input, Select, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ToastOnResult } from "@/components/ui/Toast";
import { COOLDOWN_OPTIONS } from "@/lib/constants";
import { useFormAction } from "@/lib/use-form-action";
import type { CardDesign } from "@/lib/card-design";
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
type Business = { name: string; logo_url: string | null; cover_url: string | null; category: string };

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

/**
 * Two questions: how many stamps, and what they get. The reward wording, the
 * wait between stamps and the fine print live under "More options", so a new
 * owner can finish their card in ten seconds.
 */
export function LoyaltyCardForm({ initial, business, design, isNew, disabled, impact }: { initial: Initial; business: Business; design: CardDesign; isNew: boolean; disabled?: boolean; impact: CardImpact | null }) {
  const { state, submit, pending } = useFormAction<FormState>(saveLoyaltyCard, null);
  const ideas = REWARD_IDEAS[business.category] ?? REWARD_IDEAS.other!;
  const [stamps, setStamps] = useState(initial.stamps_required);
  const [reward, setReward] = useState(initial.reward_name || ideas[0]!);
  const [rewardDesc, setRewardDesc] = useState(initial.reward_description);
  const [cooldown, setCooldown] = useState(String(initial.cooldown_minutes));
  const [ask, setAsk] = useState(false);
  const form = useRef<HTMLFormElement>(null);
  const confirmed = useRef(false);

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

  const picks = [...new Set([...STAMP_PICKS, stamps])].sort((a, b) => a - b);
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
      {lowered && <li>{unlockNow > 0 ? <><b>{plural(unlockNow, "customer")}</b> unlock {reward || "the reward"} right away.</> : <>Everyone needs fewer stamps, starting now.</>}</li>}
      {renamed && (
        <li>
          Customers will see &ldquo;{reward.trim()}&rdquo; instead of &ldquo;{initial.reward_name}&rdquo;.
          {impact && impact.pending_redemptions > 0 ? ` ${plural(impact.pending_redemptions, "request")} already made keep the old name.` : ""}
        </li>
      )}
    </>
  );

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <aside className="order-first min-w-0 lg:sticky lg:top-8 lg:order-last">
          <LoyaltyCardVisual design={design} business={business} subtitle={initial.description} filled={Math.max(1, Math.round(stamps * 0.4))} total={stamps} rewardName={reward} />
          {!isNew && (
            <Link href="/loyalty/design" className="mt-3 flex items-center justify-center gap-1.5 py-1 text-[13px] font-semibold text-brand-600">
              <Palette className="size-4" /> Change how it looks
            </Link>
          )}
        </aside>

        <form
          ref={form}
          className="min-w-0"
          onSubmit={(e) => {
            e.preventDefault();
            if (needsConfirm && !confirmed.current) {
              setAsk(true);
              return;
            }
            confirmed.current = false;
            submit(new FormData(e.currentTarget));
          }}
        >
          <ToastOnResult result={state?.ok ? state : null} />
          <input type="hidden" name="name" value={initial.name} />
          <input type="hidden" name="description" value={initial.description} />
          <input type="hidden" name="color" value={initial.color} />
          <input type="hidden" name="icon" value={initial.icon} />
          <input type="hidden" name="stamps_required" value={stamps} />
          {/* fieldsets default to min-width: min-content, which pushes content past a phone screen */}
          <fieldset disabled={disabled} className="min-w-0 space-y-4">
            {state?.error && <Alert>{state.error}</Alert>}

            <Card className="p-5">
              <p className="text-[15px] font-semibold text-ink">How many stamps?</p>
              <div className="mt-3 grid grid-cols-4 gap-2">
                {picks.map((n) => (
                  <button
                    key={n}
                    type="button"
                    onClick={() => setStamps(n)}
                    aria-pressed={stamps === n}
                    className={`h-12 rounded-xl text-lg font-semibold tabular transition-colors ${stamps === n ? "bg-brand-600 text-white shadow-brand" : "border border-line bg-white text-body hover:bg-canvas"}`}
                  >
                    {n}
                  </button>
                ))}
              </div>
              <p className="mt-2.5 text-[13px] text-muted">Most shops pick 10 — about one reward a month for a regular.</p>

              {(raised || lowered) && (keepGoal > 0 || lowered) && (
                <Alert tone={lowered ? "success" : "info"} className="mt-4" title={lowered ? "Good news for your customers" : "Fair for your regulars"}>
                  <ul className="list-none space-y-1">{impactMessages}</ul>
                </Alert>
              )}
            </Card>

            <Card className="p-5">
              <p className="text-[15px] font-semibold text-ink">What do they get?</p>
              <Input className="mt-3" id="reward_name" name="reward_name" value={reward} onChange={(e) => setReward(e.target.value)} placeholder="Free Coffee" required maxLength={60} aria-label="Reward" />
              <div className="mt-2.5 flex flex-wrap gap-2">
                {ideas.map((idea) => (
                  <button
                    key={idea}
                    type="button"
                    onClick={() => setReward(idea)}
                    className={`h-8 rounded-full px-3 text-[13px] font-medium transition-colors ${reward === idea ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "border border-line bg-white text-body hover:bg-canvas"}`}
                  >
                    {idea}
                  </button>
                ))}
              </div>
              {renamed && (
                <Alert tone="warning" className="mt-4">
                  <ul className="list-none">{impactMessages}</ul>
                </Alert>
              )}
            </Card>

            {!disabled && (
              <SubmitButton pending={pending} pendingText="Saving…">
                {isNew ? "Create my card" : "Save"}
              </SubmitButton>
            )}

            <details className="group overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-3 px-5 text-[15px] font-medium text-ink [&::-webkit-details-marker]:hidden">
                More options
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-4 border-t border-line p-5">
                <Field label="A line about the reward" htmlFor="reward_description">
                  <Textarea id="reward_description" name="reward_description" value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} placeholder="Get one regular coffee for free." maxLength={200} rows={2} />
                </Field>
                <Field label="One stamp per customer every" htmlFor="cooldown_minutes" hint="Stops someone collecting several stamps in one visit.">
                  <Select id="cooldown_minutes" name="cooldown_minutes" value={cooldown} onChange={(e) => setCooldown(e.target.value)}>
                    {cooldownOptions.map((o) => (
                      <option key={o.value} value={o.value}>
                        {o.label}
                      </option>
                    ))}
                  </Select>
                </Field>
                <Field label="Another number of stamps" htmlFor="stamps_exact">
                  <Input id="stamps_exact" type="number" min={2} max={30} value={stamps} onChange={(e) => setStamps(Math.min(30, Math.max(2, Number(e.target.value) || 2)))} className="tabular" />
                </Field>
                <p className="text-[13px] leading-relaxed text-muted">
                  Changing the card is always fair: asking for more stamps only applies to new cards, asking for fewer helps everyone right away, and nobody ever loses a stamp.
                </p>
              </div>
            </details>
          </fieldset>
        </form>
      </div>

      <ConfirmDialog
        open={ask}
        onClose={() => setAsk(false)}
        title="Save these changes?"
        confirmLabel="Save"
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
