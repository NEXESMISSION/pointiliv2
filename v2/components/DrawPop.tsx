"use client";

import { Btn, Icon3D } from "@/components/ui";
import { GOLD } from "@/components/CardDraw";
import { D } from "@/lib/draw";
import { fill } from "@/lib/t";

/**
 * The counter read the code of a golden ticket's winner (the customer showing their card, or their
 * number typed): what they won, over the screen, gold — with the number their card shows, to check —
 * hand it over now, or not now. The same question as a gift's, so the owner has one way for both.
 */
export function DrawPop({ who, wins, busy, onGive, onLater }: { who: string; wins: { id: number; gift: string }[]; busy: boolean; onGive: () => void; onLater: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={fill(D.popWon, { name: who })} onClick={onLater}>
      <div
        className="safe-b w-full max-w-md rounded-t-[1.75rem] px-[clamp(1rem,5vw,1.5rem)] pb-5 pt-[clamp(1rem,3dvh,1.75rem)] text-center"
        style={{ background: GOLD, color: "#5a3700", animation: "draw-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes draw-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
        <Icon3D name="trophy" size={72} className="mx-auto animate-pop" />
        <h2 className="mt-2 text-balance text-[1.375rem] font-bold leading-tight">{fill(D.popWon, { name: who })}</h2>
        <ul className="mx-auto mt-3 max-h-[28dvh] max-w-xs space-y-1.5 overflow-y-auto text-start">
          {wins.map((w) => (
            <li key={w.id} className="flex items-center gap-2.5 rounded-[0.875rem] bg-white/70 px-3 py-2">
              <bdi className="min-w-0 flex-1 truncate text-[1.0625rem] font-bold">{w.gift}</bdi>
              <span className="num shrink-0 rounded-full bg-white px-2.5 py-0.5 text-[0.8125rem] font-bold" dir="ltr">
                #{w.id}
              </span>
            </li>
          ))}
        </ul>
        <div className="mt-[2.5dvh] space-y-1.5">
          <Btn type="button" onClick={onGive} disabled={busy}>
            {busy ? "…" : D.popGive}
          </Btn>
          <Btn type="button" kind="ghost" onClick={onLater} disabled={busy} className="!text-[#5a3700]">
            {D.popLater}
          </Btn>
        </div>
      </div>
    </div>
  );
}
