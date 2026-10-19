"use client";

import { useState } from "react";
import { Plus, X } from "lucide-react";
import { prizeColor, WheelFace } from "@/components/Wheel";
import { boxLook } from "@/components/ui";
import { fill, t } from "@/lib/t";

/**
 * What the wheel holds, built by the owner while looking at it: the wheel
 * itself drawn from the chips below, a chip per prize in its own slice's
 * colour (the × takes it off), the trade's own ideas it does not hold yet as
 * dashed chips, and a field for one more.
 *
 * One file for the two places that build a wheel — the first card and
 * changing it later — so a prize chip is the same thing in both, and nothing
 * that is fixed here has to be fixed twice.
 *
 * `onEnter`: what the keyboard's Enter does when the field is empty and the
 * wheel is ready (the next question, usually). `face`: where the wheel itself
 * is worth its room — the question it sits in knows that, not this file (on
 * the first card the question is alone on the screen, so the wheel shows on
 * any phone that is not tiny; in the wizard it shares with more). The sheet that explains the
 * wheel is not here: each screen opens it from where it has room
 * (components/Wheel.tsx, WheelHow).
 */
export function WheelBuild({ prizes, setPrizes, ideas, onEnter, className = "", face = "[@media(max-height:860px)]:hidden" }: { prizes: string[]; setPrizes: (p: string[]) => void; ideas: string[]; onEnter?: () => void; className?: string; face?: string }) {
  const [fresh, setFresh] = useState("");
  const add = () => {
    const name = fresh.trim().slice(0, 40);
    if (name.length < 2) return;
    if (!prizes.includes(name) && prizes.length < 12) setPrizes([...prizes, name]);
    setFresh("");
  };

  return (
    <div className={className}>
      {/* the wheel as the customer will see it. It only appears where the question still fits
          without the page scrolling — on a short phone the chips and the field take all there
          is, and the chips already wear the slices' colours, so nothing is lost by leaving it out */}
      <div className={`mx-auto w-[clamp(4.5rem,11dvh,8rem)] ${face}`} aria-hidden>
        <WheelFace prizes={prizes.map((name) => ({ name, chance: 0 }))} />
      </div>
      <div className="mt-2.5 flex flex-wrap gap-1.5">
        {prizes.map((name, i) => (
          <span key={name} className="flex items-center gap-1 rounded-full py-1.5 pe-1.5 ps-3 text-[0.8125rem] font-bold text-white" style={{ background: prizeColor(i) }}>
            <bdi>{name}</bdi>
            <button type="button" onClick={() => setPrizes(prizes.filter((x) => x !== name))} aria-label={fill(t.wheelDrop, { prize: name })} className="press grid size-5 place-items-center rounded-full bg-white/25">
              <X className="size-3.5" strokeWidth={3} />
            </button>
          </span>
        ))}
        {/* the trade's ideas it does not hold yet: quieter, and a + says what tapping does */}
        {prizes.length < 12 &&
          ideas
            .filter((idea) => !prizes.includes(idea))
            .map((idea) => (
              <button key={idea} type="button" onClick={() => setPrizes([...prizes, idea])} className="press flex items-center gap-1 rounded-full border border-dashed border-line px-3 py-1.5 text-[0.8125rem] font-semibold text-muted">
                <Plus className="size-3.5" strokeWidth={3} />
                {idea}
              </button>
            ))}
      </div>
      {/* one more prize, typed: added to the wheel, the field empty again */}
      <div className="relative mt-2.5 [@media(max-height:700px)]:mt-1.5">
        <input
          value={fresh}
          onChange={(e) => setFresh(e.target.value)}
          onKeyDown={(e) => {
            if (e.key !== "Enter") return;
            e.preventDefault();
            if (fresh.trim()) add();
            else if (prizes.length >= 2) onEnter?.();
          }}
          placeholder={t.wizSpinPh}
          maxLength={40}
          aria-label={t.wizSpinPh}
          className={`block h-[3.25rem] w-full pe-14 ps-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
        />
        <button type="button" onClick={add} disabled={fresh.trim().length < 2} aria-label={t.wheelAdd} className="press absolute inset-y-1.5 end-1.5 grid w-10 place-items-center rounded-[0.875rem] bg-brand text-white disabled:opacity-30">
          <Plus className="size-5" strokeWidth={2.6} />
        </button>
      </div>
      {/* two at least, or the wheel has nothing to land on */}
      {prizes.length < 2 && <p className="mt-1.5 text-center text-[0.8125rem] font-semibold text-coral">{t.wheelCount}</p>}
    </div>
  );
}

/** The two ways of giving, side by side: one gift, or the wheel. */
export const WHEEL_DOT = "conic-gradient(#FF6B4A 0 25%, #FFC53D 0 50%, #12B76A 0 75%, #6C47FF 0)";

export function GiftWay({ spin, onPick, className = "" }: { spin: boolean; onPick: (on: boolean) => void; className?: string }) {
  return (
    <div className={`grid grid-cols-2 gap-1 rounded-[1.125rem] bg-canvas p-1 ${className}`}>
      {[false, true].map((on) => (
        <button
          key={String(on)}
          type="button"
          onClick={() => onPick(on)}
          aria-pressed={spin === on}
          className={`press flex h-11 items-center justify-center gap-1.5 rounded-[0.875rem] text-[0.9375rem] font-bold [@media(max-height:700px)]:h-10 ${spin === on ? "bg-surface text-ink shadow-card" : "text-muted"}`}
        >
          {on && <span className={`size-[1.125rem] rounded-full ${spin ? "animate-[spin_3s_linear_infinite]" : ""}`} style={{ background: WHEEL_DOT }} aria-hidden />}
          {on ? t.wheelOwnerTitle : t.wizGiftOne}
        </button>
      ))}
    </div>
  );
}
