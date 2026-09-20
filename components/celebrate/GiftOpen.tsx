"use client";

import { Check } from "lucide-react";
import { AMBER, BurstStyle, Chips, Flash, Fountain, GREEN, Shockwaves, Sparks, VIOLET } from "./Burst";

/**
 * THE GIFT OPENING — the payoff of ten visits, on both sides of the counter.
 *
 * A wrapped box arrives, trembles with what is inside, then the lid flies off:
 * a flash, waves, sparks, and the green check rises out of the box while the
 * box itself falls away. The check is the resting state — the finished screen
 * is the same calm "done" card as before, it just had a better entrance.
 *
 * Two paces, same gestures. "grand" is the customer's: the box drops in from
 * above and takes its time (and can fire a confetti cannon). "quick" is the
 * owner's: the box pops in, opens at once, and the console is ready again in
 * a second and a half.
 *
 * THE TRAP: the timing is written ONCE, here. GIFT_OPEN_MS / GIFT_QUICK_OPEN_MS
 * is the moment the lid comes off; the screens cascade their words after it,
 * so the reward name looks like it came OUT of the box instead of racing it.
 */

export const GIFT_OPEN_MS = 900;
export const GIFT_QUICK_OPEN_MS = 520;

const BOX = "#6535e0";
const LID = "#5328c4";
const RIBBON = AMBER;

const CSS = `
@keyframes cb-gift-grand{0%{transform:translate3d(0,-170px,0) scale(1.5,1.5) rotate(-16deg);opacity:0}10%{opacity:1}40%{transform:translate3d(0,0,0) scale(1.1,.84) rotate(3deg);opacity:1}50%{transform:translate3d(0,-10px,0) scale(.96,1.06) rotate(-2deg)}58%{transform:translate3d(0,0,0) scale(1,1) rotate(0)}66%{transform:translate3d(0,0,0) scale(1.03,1.03) rotate(-7deg)}74%{transform:translate3d(0,0,0) scale(1.05,1.05) rotate(7deg)}82%{transform:translate3d(0,0,0) scale(1.07,1.07) rotate(-6deg)}90%{transform:translate3d(0,0,0) scale(1.09,1.09) rotate(5deg)}100%{transform:translate3d(0,0,0) scale(1.12,1.04) rotate(0);opacity:1}}
@keyframes cb-gift-quick{0%{transform:translate3d(0,14px,0) scale(.3,.3) rotate(0);opacity:0}35%{transform:translate3d(0,-4px,0) scale(1.12,1.12) rotate(0);opacity:1}50%{transform:translate3d(0,0,0) scale(.97,.97) rotate(0)}62%{transform:translate3d(0,0,0) scale(1.02,1.02) rotate(-7deg)}76%{transform:translate3d(0,0,0) scale(1.05,1.05) rotate(7deg)}88%{transform:translate3d(0,0,0) scale(1.08,1.08) rotate(-5deg)}100%{transform:translate3d(0,0,0) scale(1.12,1.04) rotate(0);opacity:1}}
@keyframes cb-gift-lid{0%{transform:translate3d(0,0,0) rotate(0);opacity:1}40%{opacity:1}100%{transform:translate3d(48%,-130%,0) rotate(48deg);opacity:0}}
@keyframes cb-gift-body{0%{transform:translate3d(0,0,0) scale(1,1);opacity:1}30%{transform:translate3d(0,0,0) scale(1.1,.92);opacity:1}100%{transform:translate3d(0,40%,0) scale(.5,.5);opacity:0}}
@keyframes cb-gift-check{0%{transform:translate3d(0,22%,0) scale(.2);opacity:0}55%{transform:translate3d(0,-9%,0) scale(1.16);opacity:1}75%{transform:translate3d(0,0,0) scale(.96)}100%{transform:translate3d(0,0,0) scale(1);opacity:1}}
@keyframes cb-gift-halo{0%,100%{opacity:.45}50%{opacity:.9}}
.cb-gift-grand{animation:cb-gift-grand ${GIFT_OPEN_MS}ms cubic-bezier(.2,.75,.28,1) both}
.cb-gift-quick{animation:cb-gift-quick ${GIFT_QUICK_OPEN_MS}ms cubic-bezier(.2,.8,.3,1.4) both}
.cb-gift-lid{animation:cb-gift-lid 700ms cubic-bezier(.15,.7,.3,1) both}
.cb-gift-body{animation:cb-gift-body 460ms cubic-bezier(.4,0,.7,.4) both}
.cb-gift-check{animation:cb-gift-check 640ms cubic-bezier(.2,.8,.3,1.4) both}
.cb-gift-halo{animation:cb-gift-halo 2600ms ease-in-out infinite both}
`;

export function GiftOpen({ size = 104, pace = "grand", fountain = false, className = "" }: { size?: number; pace?: "grand" | "quick"; fountain?: boolean; className?: string }) {
  const grand = pace === "grand";
  const open = grand ? GIFT_OPEN_MS : GIFT_QUICK_OPEN_MS;
  const disc = size * 0.8;
  const unit = `${size}px`;
  const colors = [VIOLET, AMBER, GREEN, "#ec4899", "#0ea5e9"];

  return (
    <div className={`relative grid shrink-0 place-items-center ${className}`} style={{ width: size * 1.62, height: size * 1.34 }}>
      <BurstStyle />
      <style>{CSS}</style>

      {/* Breath, but only light: an element that keeps resizing never settles. */}
      <span className="cb-gift-halo pointer-events-none absolute rounded-full" style={{ width: disc * 1.5, height: disc * 1.5, background: "rgba(34,197,94,0.2)", animationDelay: `${open + 900}ms` }} aria-hidden />
      <Flash size={`${size * 2.4}px`} delay={open - 20} />
      <Shockwaves count={grand ? 3 : 2} size={`${disc}px`} color={GREEN} delay={open} />
      <Sparks unit={unit} count={grand ? 14 : 12} colors={[GREEN, AMBER, VIOLET]} dot={0.07} delay={open + 20} />
      {grand && <Chips unit={unit} count={10} near={0.9} far={1.4} chip={0.06} colors={colors} delay={open + 20} />}
      {fountain && <Fountain colors={colors} delay={open + 40} />}

      {/* The box: body and lid share the arrival, then part ways. */}
      <span className={`${grand ? "cb-gift-grand" : "cb-gift-quick"} pointer-events-none absolute`} style={{ width: size, height: size }} aria-hidden>
        <svg className="cb-gift-body absolute inset-0 size-full" style={{ animationDelay: `${open}ms` }} viewBox="0 0 100 100">
          <rect x="14" y="46" width="72" height="46" rx="9" fill={BOX} />
          <rect x="14" y="46" width="72" height="9" fill="rgba(0,0,0,.14)" />
          <rect x="43" y="46" width="14" height="46" fill={RIBBON} />
        </svg>
        <svg className="cb-gift-lid absolute inset-0 size-full" style={{ animationDelay: `${open}ms` }} viewBox="0 0 100 100">
          <rect x="7" y="30" width="86" height="18" rx="6" fill={LID} />
          <rect x="43" y="30" width="14" height="18" fill={RIBBON} />
          <ellipse cx="37" cy="21" rx="11" ry="7.5" transform="rotate(-24 37 21)" fill="none" stroke={RIBBON} strokeWidth="5" />
          <ellipse cx="63" cy="21" rx="11" ry="7.5" transform="rotate(24 63 21)" fill="none" stroke={RIBBON} strokeWidth="5" />
          <circle cx="50" cy="27" r="5.5" fill={RIBBON} />
        </svg>
      </span>

      {/* What was inside. This is where the screen rests. */}
      <span
        className="cb-gift-check grid place-items-center rounded-full text-white shadow-lift"
        style={{ width: disc, height: disc, background: GREEN, animationDelay: `${open + 60}ms` }}
        aria-hidden
      >
        <Check strokeWidth={3} style={{ width: disc * 0.5, height: disc * 0.5 }} />
      </span>
    </div>
  );
}
