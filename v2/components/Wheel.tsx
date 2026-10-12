"use client";

import { useRef, useState } from "react";
import { t } from "@/lib/t";

export type Prize = { id?: number; name: string; chance: number };
export type SpinResult = { prize: string; index: number | null } | null;

/** the wheel's colours, one per slice in turn — bright, and white text reads on each */
const COLORS = ["#6C47FF", "#FF6B4A", "#12B76A", "#F59E0B", "#0EA5E9", "#EC4899", "#8B5CF6", "#14B8A6", "#EF4444", "#3B82F6", "#D946EF", "#22C55E"];
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
  const n = Math.max(prizes.length, 1);
  const seg = 360 / n;

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
        <svg
          viewBox="0 0 200 200"
          className="size-full drop-shadow-[0_18px_30px_rgb(20_16_40/0.28)]"
          style={{ transform: `rotate(${turn}deg)`, transition: busy ? "transform 4.6s cubic-bezier(0.15, 0.8, 0.12, 1)" : undefined }}
          onTransitionEnd={() => {
            if (won.current) onDone(won.current);
          }}
          role="img"
          aria-label={prizes.map((p) => p.name).join("، ")}
        >
          <circle cx="100" cy="100" r="99" fill="#fff" />
          {prizes.map((p, i) => (
            <g key={`${p.name}-${i}`}>
              <path d={slice(i * seg, (i + 1) * seg, 94)} fill={COLORS[i % COLORS.length]} stroke="#fff" strokeWidth="1.5" />
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
