"use client";

import type { CardPreview } from "@/app/actions/merchant";
import { useT } from "@/components/i18n/Provider";
import { Button } from "@/components/ui/Button";
import { Icon3D, type Icon3DName } from "@/components/ui/Icon3D";
import { Modal } from "@/components/ui/Modal";

type Line = { icon: Icon3DName; tone: string; title: string; hint: string };

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

  const lines: Line[] = [];
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
    <Modal
      open={!!preview}
      onClose={onClose}
      title={
        good ? (
          <span className="flex items-center gap-2">
            <Icon3D name="party" size={30} /> {w.goodNews}
          </span>
        ) : (
          w.beforeSave
        )
      }
      footer={
        <>
          <Button variant="ghost" size="lg" onClick={onClose} className="sm:w-auto">
            {t.common.back}
          </Button>
          <Button size="lg" loading={saving} onClick={onSave} className="sm:w-auto">
            {good ? w.saveDelight : t.common.save}
          </Button>
        </>
      }
    >
      {to !== from && <p className="-mt-2 mb-3 text-sm text-muted">{count(w.goalChange, to, { from })}</p>}
      <div className="divide-y divide-line overflow-hidden rounded-[20px] bg-surface ring-1 ring-line">
        {lines.map((l, i) => (
          <div key={i} className="flex items-center gap-3 px-3.5 py-3">
            <span className={`grid size-10 shrink-0 place-items-center rounded-[12px] ${l.tone}`}>
              <Icon3D name={l.icon} size={24} />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[14.5px] font-semibold leading-snug text-ink">{l.title}</span>
              <span className="mt-0.5 block text-[12.5px] leading-snug text-muted">{l.hint}</span>
            </span>
          </div>
        ))}
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
      </div>
    </Modal>
  );
}
