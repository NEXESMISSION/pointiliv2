"use client";

import { useRef, useState } from "react";
import { fill, stampsN, t } from "@/lib/t";

export type Prize = { id?: number; name: string; chance: number };
export type SpinResult = { prize: string; index: number | null } | null;

/** the wheel's colours, one per slice in turn — bright, and white text reads on each */
export const WHEEL_COLORS = ["#6C47FF", "#FF6B4A", "#12B76A", "#F59E0B", "#0EA5E9", "#EC4899", "#8B5CF6", "#14B8A6", "#EF4444", "#3B82F6", "#D946EF", "#22C55E"];
/** the colour a prize wears everywhere: on its slice, and on its chip while the owner builds the wheel */
export const prizeColor = (i: number) => WHEEL_COLORS[i % WHEEL_COLORS.length]!;
const short = (s: string) => (s.length > 13 ? `${s.slice(0, 12)}…` : s);

/** a number cut to two places: the server and the phone work out sin and cos a hair apart, and the page must match */
const r2 = (x: number) => Math.round(x * 100) / 100;

/** a slice of the wheel from angle a to b (degrees, 0 at the top, clockwise), radius r around 100,100 */
function slice(a: number, b: number, r: number): string {
  const p = (deg: number) => [r2(100 + r * Math.sin((deg * Math.PI) / 180)), r2(100 - r * Math.cos((deg * Math.PI) / 180))];
  const [x1, y1] = p(a);
  const [x2, y2] = p(b);
  return `M100,100 L${x1},${y1} A${r},${r} 0 ${b - a > 180 ? 1 : 0} 1 ${x2},${y2} Z`;
}

/**
 * The wheel's face, slices and all: drawn the same whether it is being spun or
 * only looked at, so the owner building it sees exactly the wheel his
 * customers will. Turned (and, while turning, eased) from the outside.
 */
export function WheelFace({ prizes, turn = 0, spinning = false, onStopped, className = "" }: { prizes: Prize[]; turn?: number; spinning?: boolean; onStopped?: () => void; className?: string }) {
  const n = Math.max(prizes.length, 1);
  const seg = 360 / n;
  return (
    <svg
      viewBox="0 0 200 200"
      className={`size-full drop-shadow-[0_18px_30px_rgb(20_16_40/0.28)] ${className}`}
      style={{ transform: `rotate(${turn}deg)`, transition: spinning ? "transform 4.6s cubic-bezier(0.15, 0.8, 0.12, 1)" : undefined }}
      onTransitionEnd={onStopped}
      role="img"
      aria-label={prizes.map((p) => p.name).join("، ")}
    >
      <circle cx="100" cy="100" r="99" fill="#fff" />
      {prizes.map((p, i) => (
        <g key={`${p.name}-${i}`}>
          <path d={slice(i * seg, (i + 1) * seg, 94)} fill={prizeColor(i)} stroke="#fff" strokeWidth="1.5" />
          <text
            x="100"
            y="100"
            // the slices in the lower half turn their words round, so none reads upside down
            transform={`rotate(${r2((i + 0.5) * seg)} 100 100) translate(0 -58)${(i + 0.5) * seg > 90 && (i + 0.5) * seg < 270 ? " rotate(180 100 100)" : ""}`}
            textAnchor="middle"
            dominantBaseline="middle"
            fill="#fff"
            fontWeight="700"
            fontSize={n > 8 ? 8 : n > 5 ? 9.5 : 11}
            style={{ fontFamily: "inherit" }}
          >
            {short(p.name)}
          </text>
        </g>
      ))}
      {/* the little bulbs round the edge */}
      {Array.from({ length: 24 }, (_, i) => (
        <circle key={i} cx={r2(100 + 96.5 * Math.sin((i * 15 * Math.PI) / 180))} cy={r2(100 - 96.5 * Math.cos((i * 15 * Math.PI) / 180))} r="1.6" fill="#fff" opacity="0.9" />
      ))}
    </svg>
  );
}

/**
 * How the wheel works, said in three lines to the owner — it opens by itself
 * the first time they choose «الروليت», and from the «؟» beside it after that
 * (the founder, 18 Oct 2026: «when they click on it explain how it work nice
 * and easy»). The wheel they are building is drawn at the top, so the words
 * are about the thing in front of them.
 */
export function WheelHow({ goal, prizes = [], onClose }: { goal: number; prizes?: Prize[]; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/40" onClick={onClose} role="dialog" aria-modal="true" aria-label={t.wheelHowTitle}>
      <div
        className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-3 text-ink shadow-[0_-20px_50px_-20px_rgb(0_0_0/0.5)]"
        style={{ animation: "wheel-how-up 360ms cubic-bezier(0.2,0.8,0.2,1) both" }}
        onClick={(e) => e.stopPropagation()}
      >
        <style>{`@keyframes wheel-how-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
        <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line" aria-hidden />
        {prizes.length > 0 && (
          <div className="mx-auto mb-3 w-[clamp(4.5rem,13dvh,6.5rem)] [@media(max-height:620px)]:hidden" aria-hidden>
            <WheelFace prizes={prizes} />
          </div>
        )}
        <h2 className="text-[1.25rem] font-bold">{t.wheelHowTitle}</h2>
        <ol className="mt-3 space-y-2">
          {[fill(t.wheelHow1, { n: stampsN(goal) }), t.wheelHow2, t.wheelHow3].map((line, i) => (
            <li key={i} className="flex items-start gap-3 rounded-[1.125rem] bg-surface p-3 text-start shadow-card">
              <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.875rem] font-bold text-brand">{i + 1}</span>
              <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold leading-snug">{line}</span>
            </li>
          ))}
        </ol>
        <p className="mt-2.5 text-center text-[0.8125rem] text-muted">{t.wheelHowChance}</p>
        <button type="button" onClick={onClose} className="press mt-3 h-[3.25rem] w-full rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white">
          {t.ok}
        </button>
      </div>
    </div>
  );
}

/**
 * The wheel: the owner's prizes as equal slices (what a slice is worth is its
 * chance, kept on the server — the wheel only shows where it lands). A tap
 * asks the server for the prize, then the wheel turns five times and slows
 * onto it under the pointer; `onDone` once it stops.
 */
export function Wheel({ prizes, spin, onDone, size = 280, label = t.wheelSpin }: { prizes: Prize[]; spin: () => Promise<SpinResult>; onDone: (prize: string) => void; size?: number | string; label?: string }) {
  const [turn, setTurn] = useState(0);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState(false);
  const won = useRef<string | null>(null);
  const seg = 360 / Math.max(prizes.length, 1);

  const go = async () => {
    if (busy) return;
    setBusy(true);
    setError(false);
    const res = await spin().catch(() => null);
    if (!res) {
      setBusy(false);
      setError(true);
      return;
    }
    won.current = res.prize;
    const i = res.index ?? Math.max(0, prizes.findIndex((p) => p.name === res.prize));
    // the slice's middle under the pointer (at the top), after five full turns, a little off-centre so it feels real
    const wobble = (Math.random() - 0.5) * seg * 0.5;
    setTurn((r) => r - (r % 360) + 360 * 5 + (360 - (i + 0.5) * seg) + wobble);
    navigator.vibrate?.(30);
  };

  return (
    <div className="flex flex-col items-center">
      <div className="relative" style={{ width: size, height: size }}>
        {/* the pointer, at the top */}
        <svg viewBox="0 0 40 40" className="absolute -top-2 left-1/2 z-10 size-10 -translate-x-1/2 drop-shadow-[0_4px_6px_rgb(0_0_0/0.3)]" aria-hidden>
          <path d="M20 38 L6 8 Q20 0 34 8 Z" fill="#0F0E17" />
          <circle cx="20" cy="12" r="4" fill="#fff" />
        </svg>
        <WheelFace prizes={prizes} turn={turn} spinning={busy} onStopped={() => won.current && onDone(won.current)} />
        {/* the hub: the button */}
        <button
          type="button"
          onClick={() => void go()}
          disabled={busy}
          className="press absolute left-1/2 top-1/2 grid size-[30%] -translate-x-1/2 -translate-y-1/2 place-items-center rounded-full bg-white text-[1rem] font-bold text-ink shadow-[0_6px_18px_rgb(20_16_40/0.3)] ring-4 ring-white/60 disabled:opacity-90"
        >
          {busy ? "…" : label}
        </button>
      </div>
      {error && <p className="mt-2 text-[0.875rem] font-semibold text-coral">{t.errNetwork}</p>}
    </div>
  );
}
