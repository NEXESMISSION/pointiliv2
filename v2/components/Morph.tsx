"use client";

import { useEffect, useRef, type ReactNode } from "react";
import { Check } from "lucide-react";
import { Pass, type PassShop } from "@/components/Pass";

/**
 * The owner's onboarding in the look of the «Morph» reel (social/reel/
 * cards5s.html, take A, the one the founder chose on 17 Oct 2026): a soft
 * lavender ground, a big headline with a quiet line under it, and the card in
 * the middle answering every choice — a new number bumps it and drops the new
 * dots in, a colour flows into it, a new logo or gift pops, and a card made
 * shines. The steps stay the app's own; only how they look and move is the
 * reel's.
 */

/** The ground behind a whole screen: lavender, a violet light up the start side, a coral one down the end side. */
export function MorphGround() {
  return <div aria-hidden className="morph-ground pointer-events-none fixed inset-0 -z-10" />;
}

/** The big headline and its quiet line; `k` changes → it rises in again. */
export function MorphHead({ title, sub, k, className = "" }: { title: ReactNode; sub?: ReactNode; k?: string | number; className?: string }) {
  return (
    <div key={k} className={`animate-rise text-center ${className}`}>
      <h1 className="text-balance text-[1.625rem] font-bold leading-tight [@media(max-height:520px)]:sr-only">{title}</h1>
      {sub ? <p className="mt-1 text-balance text-[0.9375rem] font-medium text-muted [@media(max-height:680px)]:hidden">{sub}</p> : null}
    </div>
  );
}

const SPRING = "cubic-bezier(0.2, 0.9, 0.3, 1.25)";
const can = () => typeof window !== "undefined" && !window.matchMedia("(prefers-reduced-motion: reduce)").matches;

/**
 * The card that answers. `made`: the card is being made — a light sweeps
 * over it. Everything else is the card as the customer will see it (Pass).
 */
export function MorphCard({ shop, stamps, fresh, small, made, className = "" }: { shop: PassShop; stamps: number; fresh?: boolean; small?: boolean; made?: boolean; className?: string }) {
  const box = useRef<HTMLDivElement>(null);
  const was = useRef({ goal: shop.goal, mark: `${shop.kind}|${shop.logo ?? ""}|${shop.stamp_logo ? 1 : 0}`, gift: shop.gift, name: shop.name });

  useEffect(() => {
    const el = box.current;
    if (!el || !can()) return;
    const before = was.current;
    const mark = `${shop.kind}|${shop.logo ?? ""}|${shop.stamp_logo ? 1 : 0}`;
    // a new number: the card bumps, and the dots that are new drop in one after another (all of them ripple when it shrinks)
    if (before.goal !== shop.goal && shop.goal) {
      el.animate([{ transform: "scale(1)" }, { transform: "scale(1.045)" }, { transform: "scale(1)" }], { duration: 300, easing: SPRING });
      const from = (before.goal ?? 0) < shop.goal ? (before.goal ?? 0) : 0;
      el.querySelectorAll<HTMLElement>("[data-dot]").forEach((d) => {
        const i = Number(d.dataset.dot);
        if (i < from) return;
        d.animate([{ transform: "scale(0.2)", opacity: 0 }, { transform: "scale(1.15)", opacity: 1, offset: 0.7 }, { transform: "scale(1)", opacity: 1 }], { duration: 320, delay: (i - from) * 32, easing: SPRING, fill: "backwards" });
      });
    }
    // a new face (the kind, a logo, the tampon's shape): it pops
    if (before.mark !== mark) {
      el.querySelector<HTMLElement>("[data-mark]")?.animate([{ transform: "scale(0.4) rotate(-12deg)" }, { transform: "scale(1.15) rotate(3deg)", offset: 0.7 }, { transform: "scale(1)" }], { duration: 420, easing: SPRING });
    }
    // a new gift, or a new name: the line under the dots says it, with a small lift
    if (before.gift !== shop.gift || before.name !== shop.name) {
      el.querySelector<HTMLElement>("[data-line]")?.animate([{ transform: "translateY(6px)", opacity: 0.3 }, { transform: "translateY(0)", opacity: 1 }], { duration: 260, easing: "ease-out" });
    }
    was.current = { goal: shop.goal, mark, gift: shop.gift, name: shop.name };
  }, [shop.goal, shop.kind, shop.logo, shop.stamp_logo, shop.gift, shop.name]);

  useEffect(() => {
    if (made && can()) box.current?.animate([{ transform: "scale(1)" }, { transform: "scale(1.05)" }, { transform: "scale(1)" }], { duration: 420, easing: SPRING });
  }, [made]);

  return (
    // --mc carries the colour: the card's gradient, shadow and ticks follow it as it flows (globals.css)
    <div ref={box} className={`morph-c relative ${className}`} style={{ "--mc": shop.color } as React.CSSProperties}>
      <Pass shop={{ ...shop, color: "var(--mc)" }} stamps={stamps} fresh={fresh} small={small} />
      {made && (
        <span aria-hidden className="pointer-events-none absolute inset-0 overflow-hidden rounded-[1.5rem]">
          <span className="morph-shine absolute inset-y-0 left-0 w-1/3 bg-[linear-gradient(90deg,transparent,rgb(255_255_255/0.5),transparent)]" />
        </span>
      )}
    </div>
  );
}

/**
 * A row of choices in one white track, the chosen one under a violet pill
 * that slides to it (the reel's number picker). None chosen (a number typed
 * instead): the pill steps away. Right to left: the first choice is on the right.
 */
export function SlideChoice<T extends string | number>({
  options,
  value,
  onPick,
  label,
  render,
  className = "",
}: {
  options: T[];
  value: T | null;
  onPick: (v: T) => void;
  label: string;
  render?: (v: T) => ReactNode;
  className?: string;
}) {
  const at = value == null ? -1 : options.indexOf(value);
  const n = options.length;
  return (
    <div role="radiogroup" aria-label={label} className={`relative grid rounded-[1.125rem] bg-surface p-1 shadow-[0_14px_32px_-22px_rgb(40_20_120/0.5)] ${className}`} style={{ gridTemplateColumns: `repeat(${n}, minmax(0, 1fr))` }}>
      <span
        aria-hidden
        className="absolute inset-y-1 start-1 rounded-[0.875rem] bg-brand shadow-[0_8px_18px_-10px_rgb(108_71_255/0.9)] transition-[transform,opacity] duration-300 [transition-timing-function:cubic-bezier(0.3,1.25,0.4,1)]"
        style={{ width: `calc((100% - 0.5rem) / ${n})`, transform: `translateX(${-Math.max(at, 0) * 100}%)`, opacity: at < 0 ? 0 : 1 }}
      />
      {options.map((o) => {
        const on = o === value;
        return (
          <button key={String(o)} type="button" role="radio" aria-checked={on} onClick={() => onPick(o)} className={`press relative z-[1] h-11 rounded-[0.875rem] px-1 [@media(max-height:560px)]:h-9 text-[0.9375rem] font-bold transition-colors duration-200 ${on ? "text-white" : "text-body"}`}>
            {render ? render(o) : o}
          </button>
        );
      })}
    </div>
  );
}

/** «الكارط تحلّت ✓»: the green word the reel ends on, popping in. */
export function MadePill({ children }: { children: ReactNode }) {
  return (
    <span className="mx-auto flex w-fit animate-pop items-center gap-2 rounded-full bg-mint px-4 py-2 text-[0.9375rem] font-bold text-white shadow-[0_12px_26px_-14px_rgb(18_183_106/0.9)]">
      <Check className="size-4" strokeWidth={3} /> {children}
    </span>
  );
}
