"use client";

import { useRef, useState } from "react";
import { ChevronDown } from "lucide-react";
import { saveLoyaltyCard } from "@/app/actions/merchant";
import type { FormState } from "@/app/actions/types";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { Alert } from "@/components/ui/Alert";
import { Card } from "@/components/ui/Card";
import { Field, Input, Textarea } from "@/components/ui/Field";
import { SubmitButton } from "@/components/ui/Button";
import { ConfirmDialog } from "@/components/ui/Modal";
import { ToastOnResult } from "@/components/ui/Toast";
import { useT } from "@/components/i18n/Provider";
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
  valid_days: number;
};
type Business = { name: string; logo_url: string | null; cover_url: string | null; category: string };

const STAMP_PICKS = [6, 8, 10, 12];
/** The three answers that cover almost every shop. */
const WAIT_PICKS = [0, 60, 1440];

/**
 * Three questions: how many stamps, what they get, how often. A line under
 * the reward and an exact number live under "More options"; the card's
 * lifetime is kept as it is (the value survives, the control is gone), so a
 * new owner can finish their card in ten seconds.
 */
export function LoyaltyCardForm({ initial, business, design, isNew, disabled, impact }: { initial: Initial; business: Business; design: CardDesign; isNew: boolean; disabled?: boolean; impact: CardImpact | null }) {
  const { state, submit, pending } = useFormAction<FormState>(saveLoyaltyCard, null);
  const { t, count, fill } = useT();
  const w = t.merchant.loyalty;
  const allIdeas = t.merchant.ideas as unknown as Record<string, Record<string, string>>;
  const ideas = Object.values(allIdeas[business.category] ?? allIdeas.other!);
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
  const tally = (f: (r: CardImpact["progress"][number]) => boolean) => rows.filter(f).reduce((a, r) => a + r.n, 0);
  const raised = !isNew && current !== null && stamps > current;
  const lowered = !isNew && current !== null && stamps < current;
  const keepGoal = raised ? tally((r) => r.target < stamps) : 0;
  const unlockNow = lowered ? tally((r) => r.balance >= stamps && r.balance < r.target) : 0;
  const renamed = !isNew && !!initial.reward_name && reward.trim() !== initial.reward_name && (impact?.customers ?? 0) > 0;
  const needsConfirm = keepGoal > 0 || unlockNow > 0 || renamed;

  const picks = [...new Set([...STAMP_PICKS, stamps])].sort((a, b) => a - b);
  const cooldownLabel = (minutes: number) => {
    const c = t.data.cooldown;
    if (minutes === 0) return c.none;
    if (minutes === 5) return c.m5;
    if (minutes === 60) return c.h1;
    if (minutes === 240) return c.h4;
    if (minutes === 720) return c.h12;
    if (minutes === 1440) return c.daily;
    return fill(c.custom, { n: minutes });
  };

  const impactMessages = (
    <>
      {raised && keepGoal > 0 && (
        <li>
          <b>{count(t.common.customersCount, keepGoal)}</b> {fill(w.keepGoalRest, { n: stamps })}
        </li>
      )}
      {lowered && (
        <li>
          {unlockNow > 0 ? (
            <>
              <b>{count(t.common.customersCount, unlockNow)}</b> {fill(w.unlockNowRest, { reward: reward || w.theReward })}
            </>
          ) : (
            <>{w.fewerAll}</>
          )}
        </li>
      )}
      {renamed && (
        <li>
          {fill(w.renamed, { next: reward.trim(), prev: initial.reward_name })}
          {impact && impact.pending_redemptions > 0 ? fill(w.renamedPending, { requests: count(w.requestsCount, impact.pending_redemptions) }) : ""}
        </li>
      )}
    </>
  );

  return (
    <>
      <div className="grid min-w-0 grid-cols-1 gap-1.5 lg:grid-cols-[minmax(0,1fr)_22rem] lg:items-start">
        <aside className="order-first min-w-0 lg:sticky lg:top-8 lg:order-last">
          {/* the compact card: the full one eats half a phone screen on its own */}
          <LoyaltyCardVisual size="tile" design={design} business={business} subtitle={initial.description} filled={Math.max(1, Math.round(stamps * 0.4))} total={stamps} rewardName={reward} />
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
          <ToastOnResult result={state?.ok ? { ...state, message: w.saved } : null} />
          <input type="hidden" name="name" value={initial.name} />
          <input type="hidden" name="description" value={initial.description} />
          <input type="hidden" name="color" value={initial.color} />
          <input type="hidden" name="icon" value={initial.icon} />
          <input type="hidden" name="stamps_required" value={stamps} />
          {/* fieldsets default to min-width: min-content, which pushes content past a phone screen */}
          <fieldset disabled={disabled} className="min-w-0 space-y-1.5">
            {state?.error && <Alert>{state.error}</Alert>}

            {/* the three questions on one sheet: three cards do not fit a phone */}
            <Card className="divide-y divide-line">
              <div className="p-2 text-center">
                <p className="text-sm font-semibold text-ink">{w.stampsQuestion}</p>
                <div className="mt-1.5 grid grid-cols-4 gap-2">
                  {picks.map((n) => (
                    <button
                      key={n}
                      type="button"
                      onClick={() => setStamps(n)}
                      aria-pressed={stamps === n}
                      className={`h-10 rounded-xl text-base font-semibold tabular transition-colors ${stamps === n ? "bg-brand-600 text-white shadow-brand" : "border border-line bg-white text-body hover:bg-canvas"}`}
                    >
                      {n}
                    </button>
                  ))}
                </div>
                <p className="mt-0.5 text-xs leading-snug text-muted">{w.stampsHint}</p>

                {(raised || lowered) && (keepGoal > 0 || lowered) && (
                  <Alert tone={lowered ? "success" : "info"} className="mt-3 text-start" title={lowered ? w.goodNews : w.fair}>
                    <ul className="list-none space-y-1">{impactMessages}</ul>
                  </Alert>
                )}
              </div>

              <div className="p-2 text-center">
                <p className="text-sm font-semibold text-ink">{w.rewardQuestion}</p>
                <Input className="mt-1 text-center" id="reward_name" name="reward_name" value={reward} onChange={(e) => setReward(e.target.value)} placeholder={w.rewardPlaceholder} required maxLength={60} aria-label={t.common.reward} />
                <div className="mt-1 flex flex-wrap justify-center gap-1.5">
                  {ideas.map((idea) => (
                    <button
                      key={idea}
                      type="button"
                      onClick={() => setReward(idea)}
                      className={`h-8 rounded-full px-2.5 text-xs font-medium transition-colors ${reward === idea ? "bg-brand-50 text-brand-700 ring-1 ring-brand-300" : "border border-line bg-white text-body hover:bg-canvas"}`}
                    >
                      {idea}
                    </button>
                  ))}
                </div>
                {renamed && (
                  <Alert tone="warning" className="mt-3 text-start">
                    <ul className="list-none">{impactMessages}</ul>
                  </Alert>
                )}
              </div>

              <div className="p-2 text-center">
                <p className="text-sm font-semibold text-ink">{w.waitQuestion}</p>
                <div className="mt-1.5 grid grid-cols-3 gap-2">
                  {WAIT_PICKS.map((v) => (
                    <button
                      key={v}
                      type="button"
                      onClick={() => setCooldown(String(v))}
                      aria-pressed={cooldown === String(v)}
                      className={`h-10 rounded-xl px-1 text-sm font-semibold transition-colors ${cooldown === String(v) ? "bg-brand-600 text-white shadow-brand" : "border border-line bg-white text-body hover:bg-canvas"}`}
                    >
                      {v === 0 ? w.waitEveryTime : v === 60 ? w.waitHour : w.waitDay}
                    </button>
                  ))}
                </div>
                {!WAIT_PICKS.includes(Number(cooldown)) && <p className="mt-1.5 text-xs font-medium text-brand-600">{cooldownLabel(Number(cooldown))}</p>}
                <input type="hidden" name="cooldown_minutes" value={cooldown} />
                <input type="hidden" name="valid_days" value={initial.valid_days} />
              </div>
            </Card>

            {!disabled && (
              <SubmitButton size="md" pending={pending} pendingText={t.common.saving}>
                {isNew ? t.merchant.home.createCta : t.common.save}
              </SubmitButton>
            )}

            <details className="group overflow-hidden rounded-2xl border border-line bg-white shadow-card">
              <summary className="flex h-10 cursor-pointer list-none items-center justify-between gap-3 px-4 text-sm font-medium text-ink [&::-webkit-details-marker]:hidden">
                {t.common.moreOptions}
                <ChevronDown className="size-4 shrink-0 text-muted transition-transform group-open:rotate-180" aria-hidden />
              </summary>
              <div className="space-y-3 border-t border-line p-3.5">
                <Field label={w.rewardLine} htmlFor="reward_description">
                  <Textarea id="reward_description" name="reward_description" value={rewardDesc} onChange={(e) => setRewardDesc(e.target.value)} placeholder={w.rewardLinePlaceholder} maxLength={200} rows={2} />
                </Field>
                <Field label={w.otherNumber} htmlFor="stamps_exact">
                  <Input id="stamps_exact" type="number" min={2} max={30} value={stamps} onChange={(e) => setStamps(Math.min(30, Math.max(2, Number(e.target.value) || 2)))} className="tabular" />
                </Field>
              </div>
            </details>
          </fieldset>
        </form>
      </div>

      <ConfirmDialog
        open={ask}
        onClose={() => setAsk(false)}
        title={w.confirmTitle}
        confirmLabel={t.common.save}
        onConfirm={() => {
          confirmed.current = true;
          setAsk(false);
          form.current?.requestSubmit();
        }}
      >
        <ul className="list-disc space-y-2 ps-5">{impactMessages}</ul>
      </ConfirmDialog>
    </>
  );
}
