"use client";

import { useEffect, useState } from "react";
import { Gift, ScanLine, Sparkles } from "lucide-react";
import { Btn, Icon3D } from "@/components/ui";
import { customersN, fill, t } from "@/lib/t";
import { waitSays } from "@/lib/when";

/**
 * What a change of card does to the customers in the middle of theirs. `ask`:
 * how many the owner chooses for (they finish the card they started, or they
 * switch to the new one now, their tampons kept); `winKeep` / `winMove`: how
 * many win the gift at once, whichever is chosen / if they switch.
 */
export type CardImpact = { ask: number; winKeep: number; winMove: number };

/** One line of the first card's sheet: an icon, a line, and a quieter line under it. */
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

/** «حريف واحد يربح الكادو توّا»: what a choice costs the shop right now. */
function Wins({ n }: { n: number }) {
  if (n <= 0) return null;
  return (
    <span className="mt-1.5 flex items-center gap-1.5 text-[0.8438rem] font-bold leading-snug text-coral">
      <Gift className="size-4 shrink-0" /> {fill((n === 1 ? t.cardPopOne : t.cardPopMany).win, { who: customersN(n) })}
    </span>
  );
}

/**
 * The sheet before a card is saved. A first card: how it works, in three
 * lines. A change: nothing but the one thing the owner has to decide or know —
 * customers in the middle of their card (they finish it, or they switch to the
 * new one now), or customers the new card rewards at once. A change that
 * touches nobody never opens it (see CardWizard). Its first button sends the
 * form (`move` rides along).
 */
export function CardConfirm({ editing, after, impact, pending, onBack }: { editing: boolean; after: { goal: number; gift: string; gap: number }; impact: CardImpact | null; pending: boolean; onBack: () => void }) {
  const [move, setMove] = useState(false);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && !pending && onBack();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onBack, pending]);

  const ask = impact?.ask ?? 0;
  const winKeep = impact?.winKeep ?? 0;
  const words = ask === 1 ? t.cardPopOne : t.cardPopMany;
  const winWords = winKeep === 1 ? t.cardPopOne : t.cardPopMany;
  const title = !editing ? t.cardPopNewTitle : ask > 0 ? fill(t.cardPopWayTitle, { who: customersN(ask) }) : fill(winWords.win, { who: customersN(winKeep) });

  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={title} onClick={() => !pending && onBack()}>
      <div
        className="safe-b flex max-h-[min(92dvh,46rem)] w-full max-w-md flex-col overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-4 text-ink"
        style={{ animation: "card-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes card-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
        <span className="mx-auto mb-2 block h-1.5 w-10 shrink-0 rounded-full bg-line" aria-hidden />

        {!editing ? (
          <>
            <h2 className="shrink-0 text-center text-[1.375rem] font-bold">{title}</h2>
            <div data-list className="mt-2 min-h-0 overflow-y-auto overscroll-contain">
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
            </div>
          </>
        ) : ask > 0 ? (
          <>
            <h2 className="shrink-0 text-balance text-center text-[1.375rem] font-bold leading-tight">{title}</h2>
            <p className="mt-1 shrink-0 text-center text-[1rem] text-muted">{words.ask}</p>
            {/* never a scroll box of their own (it would cut the cards' shadows into a pale band): on a screen too short, the whole sheet scrolls */}
            <div className="mt-3 grid shrink-0 gap-2 pb-3" role="radiogroup" aria-label={words.ask}>
              {[false, true].map((m) => (
                <button
                  key={String(m)}
                  type="button"
                  role="radio"
                  aria-checked={move === m}
                  onClick={() => setMove(m)}
                  className={`press flex items-start gap-3 rounded-[1.25rem] bg-surface p-3.5 text-start ${move === m ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" : "shadow-card"}`}
                >
                  <span className={`mt-0.5 grid size-5 shrink-0 place-items-center rounded-full ${move === m ? "bg-brand" : "shadow-[inset_0_0_0_2px_var(--color-line)]"}`}>
                    {move === m && <span className="size-2 rounded-full bg-white" />}
                  </span>
                  <span className="min-w-0">
                    <span className="block text-[1.0312rem] font-bold leading-snug">{m ? words.move : words.keep}</span>
                    <span className="mt-0.5 block text-[0.875rem] leading-snug text-muted">{m ? words.moveSub : words.keepSub}</span>
                    <Wins n={m ? (impact?.winMove ?? 0) : winKeep} />
                  </span>
                </button>
              ))}
            </div>
          </>
        ) : (
          // nobody to choose for, but the new card fills some cards as they are: said before it is done
          <div className="shrink-0 pb-3 text-center">
            <Icon3D name="gift" size={64} className="mx-auto" />
            <h2 className="mt-1 text-balance text-[1.375rem] font-bold leading-tight">{title}</h2>
            <p className="mt-1 text-[1rem] text-muted">{winWords.winSub}</p>
          </div>
        )}

        <input type="hidden" name="move" value={move ? "1" : ""} />
        <div className={`shrink-0 space-y-1.5 ${editing ? "mt-1" : "mt-3"}`}>
          <Btn key="confirm" type="submit" disabled={pending}>
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
