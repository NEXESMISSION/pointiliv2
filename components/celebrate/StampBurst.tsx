"use client";

import { AMBER, BurstStyle, Chips, GREEN, Shockwaves, Sparks } from "./Burst";

/**
 * THE COUNTER CELEBRATION — a stamp was just collected, seen from a metre away.
 *
 * Everything lives BEHIND the QR card: the ring that lights up around it, the
 * waves that leave it, the sparks and confetti that shoot out from under its
 * edges in the shop's colour, and the big "+1 #code" that pops out of its top.
 * The code itself never moves, never dims and is never covered, so a phone
 * mid-scan is not disturbed and the next customer can scan while the party is
 * still on. Two seconds later the screen is calm again.
 *
 * Mount one per stamp (keyed by stamp id): two stamps in one poll come in
 * STAGGER_MS apart, so the second badge pops over the first instead of
 * disappearing into it.
 */

export const STAMP_BURST_MS = 2000;
export const STAMP_BURST_STAGGER_MS = 450;

const CSS = `
@keyframes cb-ring{0%{transform:scale(.96);opacity:0}7%{transform:scale(1.02);opacity:1}16%{transform:scale(1)}72%{transform:scale(1);opacity:1}100%{transform:scale(1.01);opacity:0}}
@keyframes cb-badge{0%{transform:translate3d(0,90%,0) scale(.4) rotate(-8deg);opacity:0}6%{opacity:1}16%{transform:translate3d(0,-16%,0) scale(1.14) rotate(3deg);opacity:1}24%{transform:translate3d(0,4%,0) scale(.97) rotate(-1.5deg)}32%{transform:translate3d(0,0,0) scale(1) rotate(0)}80%{transform:translate3d(0,0,0) scale(1) rotate(0);opacity:1}100%{transform:translate3d(0,-45%,0) scale(.92) rotate(0);opacity:0}}
@keyframes cb-wash{0%{opacity:0}12%{opacity:1}100%{opacity:0}}
.cb-ring{animation:cb-ring ${STAMP_BURST_MS}ms cubic-bezier(.2,.8,.3,1) both}
.cb-badge{animation:cb-badge ${STAMP_BURST_MS}ms cubic-bezier(.2,.8,.3,1) both}
.cb-wash{animation:cb-wash 1500ms ease-out both}
`;

export function StampBurst({ code, accent, soft, side, delay = 0 }: { code: number; accent: string; soft: string; side: string; delay?: number }) {
  /* The shop's colour leads; amber and green keep a slate or a navy card from throwing a grey party. */
  const colors = [accent, AMBER, accent, GREEN, soft];
  return (
    <div className="pointer-events-none absolute inset-0 grid place-items-center" style={{ "--s": side } as React.CSSProperties} aria-hidden>
      <BurstStyle />
      <style>{CSS}</style>

      {/* A solid slab a little larger than the card: what shows is a ring, and only its opacity moves. */}
      <span
        className="cb-ring absolute"
        style={{ inset: "calc(var(--s) * -0.03)", borderRadius: "calc(2rem + var(--s) * 0.03)", background: accent, boxShadow: `0 0 calc(var(--s) * 0.22) calc(var(--s) * 0.02) ${accent}80`, animationDelay: `${delay}ms` }}
      />

      <Shockwaves count={3} size="var(--s)" color={accent} from={1} to={1.4} radius="2rem" width={4} delay={delay} gap={140} />
      {/* They start under the card (0.4 of its side from the centre) and fly clear of its edges. */}
      <Sparks unit="var(--s)" count={16} from={0.4} near={0.66} far={0.98} dot={0.038} colors={colors} delay={delay} duration={1100} />
      <Chips unit="var(--s)" count={16} from={0.4} near={0.78} far={1.15} chip={0.04} colors={colors} delay={delay} duration={1500} />

      {/* The count is Latin in both languages: "+1" must never read as "1+". */}
      <div className="absolute inset-x-0 bottom-full mb-1 flex justify-center">
        {/* The white outline is part of the shadow: a ring-* utility is a box-shadow too, and an inline shadow would erase it. */}
        <span
          className="cb-badge inline-flex items-baseline gap-3 rounded-full px-7 py-3 font-extrabold leading-none text-white tabular"
          style={{ background: accent, boxShadow: `0 0 0 4px #fff, 0 18px 40px -12px ${accent}b3`, animationDelay: `${delay}ms` }}
        >
          <span dir="ltr" className="text-[clamp(2.5rem,7.5vh,5rem)]">
            +1
          </span>
          <span dir="ltr" className="text-[clamp(1.25rem,3.4vh,2.25rem)]">
            #{code}
          </span>
        </span>
      </div>
    </div>
  );
}

/** The whole screen blushes in the shop's colour for a second; goes under the content. */
export function ScreenWash({ accent, delay = 0 }: { accent: string; delay?: number }) {
  return (
    <span
      className="cb-wash pointer-events-none absolute inset-0"
      style={{ background: `radial-gradient(75% 60% at 50% 55%, ${accent}45, ${accent}14 55%, transparent 80%)`, animationDelay: `${delay}ms` }}
      aria-hidden
    >
      <style>{CSS}</style>
    </span>
  );
}
