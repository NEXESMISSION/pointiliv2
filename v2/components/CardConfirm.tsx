"use client";

import { useEffect, useState } from "react";
import { Clock, Gift, Palette, ScanLine, Sparkles, Ticket, UserPlus, Users } from "lucide-react";
import { cardChange } from "@/app/actions";
import { Btn } from "@/components/ui";
import { customersN, fill, t, waitingN } from "@/lib/t";
import { waitSays } from "@/lib/when";

type CardRule = { goal: number; gift: string; gap: number; color: string };
type Change = { way: number; eased: number; win_now: number; waiting: number };

const waitName = (gap: number) => (gap <= 0 ? t.waitNone : gap === 60 ? t.waitHour : gap === 1440 ? t.waitDay : waitSays(gap));

/** One line of the sheet: an icon, a line, and a quieter line under it. */
function Line({ icon: Icon, children, sub }: { icon: typeof Gift; children: React.ReactNode; sub?: React.ReactNode }) {
  return (
    <li className="flex items-start gap-3 py-2.5 text-start">
      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
        <Icon className="size-[1.125rem]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[0.9688rem] font-bold leading-snug">{children}</span>
        {sub && <span className="mt-0.5 block text-[0.8438rem] leading-snug text-muted">{sub}</span>}
      </span>
    </li>
  );
}

/**
 * The card about to be saved, said plainly before it is: a new card, how it
 * works; a change, what changes and what it does to the customers — the new
 * ones, the ones on their way (the owner chooses: they finish the card they
 * started, or they move to the new one now with their tampons), the ones with
 * a gift waiting. Its first button sends the form (`move` rides along).
 */
export function CardConfirm({ editing, before, after, pending, onBack }: { editing: boolean; before: CardRule | null; after: CardRule; pending: boolean; onBack: () => void }) {
  const ruleChanged = !!before && (before.goal !== after.goal || before.gift.trim() !== after.gift.trim());
  const [change, setChange] = useState<Change | null>(null);
  const [move, setMove] = useState(false);
  useEffect(() => {
    if (!editing || !ruleChanged) return;
    let alive = true;
    void cardChange(after.goal, after.gift.trim()).then((r) => {
      if (alive && r.ok) setChange({ way: r.way ?? 0, eased: r.eased ?? 0, win_now: r.win_now ?? 0, waiting: r.waiting ?? 0 });
    });
    return () => {
      alive = false;
    };
  }, [editing, ruleChanged, after.goal, after.gift]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onBack();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onBack]);

  const title = editing ? t.cardPopEditTitle : t.cardPopNewTitle;
  // the customers on their way whose card would change (the easier ones get it anyway)
  const way = change ? change.way - change.eased : 0;

  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={title} onClick={onBack}>
      <div
        className="safe-b flex max-h-[min(92dvh,46rem)] w-full max-w-md flex-col rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-4 text-ink"
        style={{ animation: "card-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes card-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
        <span className="mx-auto mb-2 block h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden />
        <h2 className="shrink-0 text-center text-[1.375rem] font-bold">{title}</h2>

        {/* room inside for the cards' shadows: the scroll box never cuts them into a pale band */}
        <div data-list className="-mx-2 mt-2 min-h-0 overflow-y-auto overscroll-contain px-2 pb-3">
          {!editing ? (
            <ul className="divide-y divide-line">
              <Line icon={ScanLine} sub={waitSays(after.gap)}>
                {t.cardPopNew1}
              </Line>
              <Line icon={Gift} sub={t.cardPopNew2Sub}>
                {fill(t.cardPopNew2, { n: after.goal, gift: after.gift.trim() })}
              </Line>
              <Line icon={Sparkles} sub={t.cardPopNew3Sub}>
                {t.cardPopNew3}
              </Line>
            </ul>
          ) : (
            <>
              {/* what changes: old ← new */}
              <ul className="rounded-[1.25rem] bg-surface px-3 shadow-card">
                {before && before.goal !== after.goal && (
                  <Line icon={Ticket}>
                    {t.cardPopGoal}: <span className="num">{before.goal}</span> ← <span className="num">{after.goal}</span>
                  </Line>
                )}
                {before && before.gift.trim() !== after.gift.trim() && (
                  <Line icon={Gift}>
                    {t.cardPopGift}: {before.gift} ← {after.gift.trim()}
                  </Line>
                )}
                {before && before.gap !== after.gap && (
                  <Line icon={Clock} sub={fill(t.cardPopWaitAll, { wait: waitSays(after.gap) })}>
                    {t.cardPopWait}: {waitName(before.gap)} ← {waitName(after.gap)}
                  </Line>
                )}
                {before && before.color.toUpperCase() !== after.color.toUpperCase() && (
                  <Line icon={Palette}>
                    {t.cardPopColor}: <span className="inline-block size-4 rounded-full align-[-2px]" style={{ background: before.color }} /> ←{" "}
                    <span className="inline-block size-4 rounded-full align-[-2px]" style={{ background: after.color }} />
                  </Line>
                )}
              </ul>

              {ruleChanged && (
                <ul className="mt-3 divide-y divide-line">
                  <Line icon={UserPlus}>{t.cardPopNewOnes}</Line>
                  {change === null ? (
                    <li className="py-3 text-center text-[0.9375rem] text-muted">{t.checking}</li>
                  ) : (
                    <>
                      {change.eased > 0 && <Line icon={Sparkles}>{fill(t.cardPopEased, { who: customersN(change.eased) })}</Line>}
                      {change.waiting > 0 && <Line icon={Gift}>{fill(t.cardPopWaiting, { waiting: waitingN(change.waiting) })}</Line>}
                      {way > 0 && (
                        <li className="py-2.5 text-start">
                          <span className="flex items-center gap-3">
                            <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                              <Users className="size-[1.125rem]" />
                            </span>
                            <span className="text-[0.9688rem] font-bold">{fill(t.cardPopWay, { who: customersN(way) })}</span>
                          </span>
                          <span className="mt-2 grid gap-2" role="radiogroup">
                            {[false, true].map((m) => (
                              <button
                                key={String(m)}
                                type="button"
                                role="radio"
                                aria-checked={move === m}
                                onClick={() => setMove(m)}
                                className={`press flex items-start gap-3 rounded-[1.125rem] p-3 text-start ${move === m ? "bg-surface shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" : "bg-surface shadow-card"}`}
                              >
                                <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${move === m ? "bg-brand" : "shadow-[inset_0_0_0_2px_var(--color-line)]"}`}>
                                  {move === m && <span className="size-2 rounded-full bg-white" />}
                                </span>
                                <span className="min-w-0">
                                  <span className="block text-[0.9688rem] font-bold">{m ? t.cardPopMove : t.cardPopKeep}</span>
                                  <span className="mt-0.5 block text-[0.8438rem] leading-snug text-muted">
                                    {m ? t.cardPopMoveSub : t.cardPopKeepSub}
                                    {m && change.win_now > 0 ? ` ${fill(t.cardPopWinNow, { who: customersN(change.win_now) })}` : ""}
                                  </span>
                                </span>
                              </button>
                            ))}
                          </span>
                        </li>
                      )}
                    </>
                  )}
                </ul>
              )}
            </>
          )}
        </div>

        <input type="hidden" name="move" value={move ? "1" : ""} />
        <div className="mt-3 shrink-0 space-y-1.5">
          <Btn key="confirm" type="submit" disabled={pending || (editing && ruleChanged && change === null)}>
            {pending ? t.checking : editing ? t.cardPopSave : t.cardPopNewGo}
          </Btn>
          <Btn type="button" kind="ghost" onClick={onBack} disabled={pending}>
            {t.cardPopBack}
          </Btn>
        </div>
      </div>
    </div>
  );
}
