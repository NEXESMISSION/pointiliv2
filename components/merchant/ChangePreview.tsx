"use client";

import type { CardPreview } from "@/app/actions/merchant";
import { useT } from "@/components/i18n/Provider";
import { PreviewSheet, type PreviewLine } from "@/components/merchant/PreviewSheet";

/** A save that touches nobody goes straight through; anything else is shown first (board 8, rule 4). */
export function worthASheet(p: CardPreview): boolean {
  const from = p.goal_from ?? 0;
  const to = p.goal_to ?? 0;
  const running = p.running ?? 0;
  return (
    (to > from && (p.keep_goal ?? 0) > 0) ||
    (to < from && ((p.unlock_now ?? 0) > 0 || (p.on_the_way ?? 0) > 0)) ||
    (!!p.reward_changed && running > 0) ||
    (p.level_now ?? 0) > 0 ||
    (p.level_next_card ?? 0) > 0 ||
    (!!p.valid_shorter && running > 0)
  );
}

/**
 * «قبل ما تسجّل»: what the change does to the customers, in numbers the
 * database counted. A running card keeps what it was promised; a change in
 * the customer's favour reaches everyone at once, and the sheet says so.
 */
export function ChangePreview({ preview, reward, forAll, onForAll, onClose, onSave, saving }: { preview: CardPreview | null; reward: string; forAll: boolean; onForAll: (on: boolean) => void; onClose: () => void; onSave: () => void; saving: boolean }) {
  const { t, count, fill } = useT();
  const w = t.merchant.loyalty;
  const p = preview ?? { ok: false };
  const from = p.goal_from ?? 0;
  const to = p.goal_to ?? 0;
  const running = p.running ?? 0;
  const renamed = !!p.reward_changed && running > 0;

  const lines: PreviewLine[] = [];
  if (to > from && (p.keep_goal ?? 0) > 0) {
    lines.push({ icon: "people", tone: "bg-brand-100", title: count(w.pvKeep, p.keep_goal ?? 0), hint: count(w.pvKeepHint, p.keep_goal ?? 0, { from }) });
    lines.push({ icon: "sparkles", tone: "bg-success-50", title: w.pvNew, hint: fill(w.pvNewHint, { to }) });
  }
  if (to < from && (p.unlock_now ?? 0) > 0) lines.push({ icon: "gift", tone: "bg-coral-50", title: count(w.pvUnlock, p.unlock_now ?? 0, { to }), hint: count(w.pvUnlockHint, p.unlock_now ?? 0) });
  if (to < from && (p.on_the_way ?? 0) > 0) lines.push({ icon: "people", tone: "bg-brand-100", title: count(w.pvOnTheWay, p.on_the_way ?? 0), hint: count(w.pvOnTheWayHint, p.on_the_way ?? 0) });
  if (renamed && !forAll) lines.push({ icon: "gift", tone: "bg-coral-50", title: count(w.pvReward, running, { from: p.reward_from ?? "" }), hint: count(w.pvRewardHint, running, { to: reward }) });
  if ((p.level_now ?? 0) > 0) lines.push({ icon: "trophy", tone: "bg-coral-50", title: count(w.pvLevelNow, p.level_now ?? 0), hint: count(w.pvLevelNowHint, p.level_now ?? 0) });
  if ((p.level_next_card ?? 0) > 0) lines.push({ icon: "hourglass", tone: "bg-surface-2", title: count(w.pvLevelNext, p.level_next_card ?? 0), hint: count(w.pvLevelNextHint, p.level_next_card ?? 0) });
  if (p.valid_shorter && running > 0) lines.push({ icon: "hourglass", tone: "bg-surface-2", title: w.pvShorter, hint: w.pvShorterHint });
  if ((p.ready ?? 0) > 0 && to !== from) lines.push({ icon: "gift", tone: "bg-coral-50", title: count(w.pvReady, p.ready ?? 0), hint: count(w.pvReadyHint, p.ready ?? 0) });

  // only good news: a lower goal, nothing held back for later
  const good = to < from && !renamed && !(p.valid_shorter && running > 0) && !(p.level_next_card ?? 0);

  return (
    <PreviewSheet open={!!preview} good={good} subtitle={to !== from ? count(w.goalChange, to, { from }) : null} lines={lines} onClose={onClose} onSave={onSave} saving={saving}>
      {renamed && (
        <button type="button" role="switch" aria-checked={forAll} onClick={() => onForAll(!forAll)} className="flex w-full items-center gap-3 px-3.5 py-3 text-start">
          <span className="min-w-0 flex-1">
            <span className="block text-[14.5px] font-semibold leading-snug text-ink">{fill(w.pvForAll, { to: reward })}</span>
            <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{w.pvForAllHint}</span>
          </span>
          <span className={`relative h-7 w-12 shrink-0 rounded-full transition-colors ${forAll ? "bg-brand-600" : "bg-line"}`} aria-hidden>
            <span className={`absolute top-0.5 size-6 rounded-full bg-surface shadow-card transition-all ${forAll ? "end-0.5" : "start-0.5"}`} />
          </span>
        </button>
      )}
    </PreviewSheet>
  );
}
