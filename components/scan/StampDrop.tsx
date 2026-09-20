"use client";

import { Stamp } from "lucide-react";

/**
 * THE TAMPON LANDING — the half-second a scan is actually about.
 *
 * A stamp falls in from above the screen, hits hard enough to shake the block,
 * throws three shockwaves and a ring of ink, and a +1 pops out of the impact.
 * CSS only (transform / opacity), one shot, no library: the reduced-motion rule
 * in globals.css flattens every duration to 1 ms, so someone who asked for no
 * motion still lands on the finished screen — just without the journey.
 *
 * THE TRAP: the timing is written ONCE, here. IMPACT_MS is the moment the stamp
 * touches down; every screen that uses this staggers its own copy after that
 * number, so the words look caused by the impact instead of racing it.
 */

/** When the falling stamp touches the page. Callers cascade their copy after it. */
export const IMPACT_MS = 420;

const SPARKS = 12;

export function StampDrop({ label, tone = "brand", size = 104 }: { label: string; tone?: "brand" | "success"; size?: number }) {
  const success = tone === "success";
  const disc = success ? "#22c55e" : "#6535e0";
  const ring = success ? "#22c55e" : "#7c50ee";
  const halo = success ? "rgba(34,197,94,0.20)" : "rgba(101,53,224,0.18)";
  const shadow = success ? "0 18px 40px -12px rgb(34 197 94 / 0.65)" : "0 18px 40px -12px rgb(101 53 224 / 0.6)";

  return (
    <div className="pd-shake relative grid shrink-0 place-items-center" style={{ width: size * 1.62, height: size * 1.34 }}>
      <style>{`
@keyframes pd-drop{0%{transform:translate3d(0,-180px,0) scale(1.9) rotate(-26deg);opacity:0}18%{opacity:1}52%{transform:translate3d(0,0,0) scale(.82) rotate(5deg);opacity:1}64%{transform:translate3d(0,-16px,0) scale(1.07) rotate(-3deg)}78%{transform:translate3d(0,0,0) scale(.97) rotate(1deg)}100%{transform:translate3d(0,0,0) scale(1) rotate(0)}}
@keyframes pd-shake{0%,46%{transform:translate3d(0,0,0)}52%{transform:translate3d(0,7px,0)}58%{transform:translate3d(-4px,-3px,0)}64%{transform:translate3d(4px,2px,0)}72%{transform:translate3d(-2px,0,0)}100%{transform:translate3d(0,0,0)}}
@keyframes pd-shock{0%{transform:scale(.34);opacity:.55}100%{transform:scale(2.6);opacity:0}}
@keyframes pd-spark{0%{transform:rotate(var(--a)) translateX(0) scale(.2);opacity:0}18%{opacity:1}100%{transform:rotate(var(--a)) translateX(var(--d)) scale(.85);opacity:0}}
@keyframes pd-plus{0%{transform:translate3d(0,16px,0) scale(.3);opacity:0}55%{transform:translate3d(0,-7px,0) scale(1.2);opacity:1}72%{transform:translate3d(0,0,0) scale(.95)}100%{transform:translate3d(0,0,0) scale(1);opacity:1}}
@keyframes pd-flash{0%{opacity:0}8%{opacity:.9}100%{opacity:0}}
@keyframes pd-halo{0%,100%{transform:scale(1);opacity:.5}50%{transform:scale(1.13);opacity:.85}}
.pd-shake{animation:pd-shake 820ms ease-out both}
.pd-drop{animation:pd-drop 820ms cubic-bezier(.2,.75,.28,1) both}
.pd-shock{animation:pd-shock 900ms cubic-bezier(.15,.7,.3,1) both}
.pd-spark{animation:pd-spark 720ms cubic-bezier(.2,.7,.3,1) both}
.pd-plus{animation:pd-plus 620ms cubic-bezier(.2,.8,.3,1.4) both}
.pd-flash{animation:pd-flash 520ms ease-out both}
.pd-halo{animation:pd-halo 2600ms ease-in-out 1100ms infinite}
`}</style>

      <span
        className="pd-flash pointer-events-none absolute rounded-full"
        style={{ width: size * 2.4, height: size * 2.4, background: "radial-gradient(circle,rgba(255,255,255,.92) 0%,rgba(255,255,255,0) 65%)", animationDelay: `${IMPACT_MS - 20}ms` }}
        aria-hidden
      />
      <span className="pd-halo pointer-events-none absolute rounded-full" style={{ width: size * 1.42, height: size * 1.42, background: halo }} aria-hidden />

      {[0, 1, 2].map((i) => (
        <span
          key={i}
          className="pd-shock pointer-events-none absolute rounded-full border-2"
          style={{ width: size, height: size, borderColor: ring, animationDelay: `${IMPACT_MS + i * 120}ms` }}
          aria-hidden
        />
      ))}

      {Array.from({ length: SPARKS }, (_, i) => (
        <span
          key={i}
          className="pd-spark pointer-events-none absolute rounded-full"
          style={
            {
              width: i % 3 === 0 ? 9 : 6,
              height: i % 3 === 0 ? 9 : 6,
              background: i % 2 ? ring : "#f59e0b",
              "--a": `${(360 / SPARKS) * i}deg`,
              "--d": `${size * (0.62 + (i % 4) * 0.12)}px`,
              animationDelay: `${IMPACT_MS + (i % 3) * 40}ms`,
            } as React.CSSProperties
          }
          aria-hidden
        />
      ))}

      <span className="pd-drop grid place-items-center rounded-[2rem]" style={{ width: size, height: size, background: disc, color: "#fff", boxShadow: shadow }} aria-hidden>
        <Stamp strokeWidth={2.1} style={{ width: size * 0.46, height: size * 0.46 }} />
      </span>

      {/* The count is Latin in both languages: "+1" must never read as "1+". */}
      <span
        className="pd-plus absolute top-0 inline-flex items-center gap-1 rounded-full bg-ink px-2.5 py-1 text-[13px] font-extrabold leading-none text-white shadow-lift"
        style={{ insetInlineEnd: 0, animationDelay: `${IMPACT_MS}ms` }}
      >
        <span dir="ltr">+1</span>
        {label}
      </span>
    </div>
  );
}
