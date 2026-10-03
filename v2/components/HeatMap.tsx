"use client";

import { useEffect, useRef, useState } from "react";

/** One tap: across and down the screen (0..1), and 0 = a tap, 1 = on nothing (dead), 2 = in anger (rage). */
export type HeatTap = [number, number, number];

/** The colours of heat, cold to hot: drawn once into a 256-step table. */
let lut: Uint8ClampedArray | null = null;
function palette(): Uint8ClampedArray {
  if (lut) return lut;
  const c = document.createElement("canvas");
  c.width = 256;
  c.height = 1;
  const x = c.getContext("2d")!;
  const g = x.createLinearGradient(0, 0, 256, 0);
  g.addColorStop(0, "#2563eb");
  g.addColorStop(0.35, "#10b981");
  g.addColorStop(0.6, "#eab308");
  g.addColorStop(0.82, "#f97316");
  g.addColorStop(1, "#dc2626");
  x.fillStyle = g;
  x.fillRect(0, 0, 256, 1);
  lut = x.getImageData(0, 0, 256, 1).data;
  return lut;
}

const W = 390;
const H = 844;

/**
 * Where fingers landed on one screen, on a phone: the screen as it looks (a
 * picture taken on a 390×844 phone, when there is one) and the taps glowing
 * over it — blue where a few landed, red where most did. «نقاط» shows every
 * tap as a dot instead; a red ring is a tap in anger, a grey one hit nothing.
 */
export function HeatMap({ taps, shot, label, caption }: { taps: HeatTap[]; shot: string | null; label: string; caption?: string }) {
  const canvas = useRef<HTMLCanvasElement>(null);
  const img = useRef<HTMLImageElement>(null);
  const [pic, setPic] = useState(!!shot);
  const [dots, setDots] = useState(false);

  // a picture that failed before React was listening (no such screen yet) still goes
  useEffect(() => {
    const i = img.current;
    if (i && i.complete && !i.naturalWidth) setPic(false);
  }, []);

  useEffect(() => {
    const c = canvas.current;
    if (!c) return;
    c.width = W;
    c.height = H;
    const ctx = c.getContext("2d");
    if (!ctx) return;
    ctx.clearRect(0, 0, W, H);

    if (!dots) {
      // each tap a soft round stain; where they pile up, the stain darkens
      const r = 30;
      const blob = document.createElement("canvas");
      blob.width = blob.height = r * 2;
      const b = blob.getContext("2d")!;
      const g = b.createRadialGradient(r, r, 0, r, r, r);
      g.addColorStop(0, "rgba(0,0,0,1)");
      g.addColorStop(1, "rgba(0,0,0,0)");
      b.fillStyle = g;
      b.fillRect(0, 0, r * 2, r * 2);
      ctx.globalAlpha = Math.min(0.5, Math.max(0.05, 3 / Math.sqrt(taps.length + 1)));
      for (const [x, y] of taps) ctx.drawImage(blob, x * W - r, y * H - r);
      // then every stain takes the colour of how dark it got
      const img = ctx.getImageData(0, 0, W, H);
      const d = img.data;
      const p = palette();
      for (let i = 0; i < d.length; i += 4) {
        const a = d[i + 3]!;
        if (!a) continue;
        d[i] = p[a * 4]!;
        d[i + 1] = p[a * 4 + 1]!;
        d[i + 2] = p[a * 4 + 2]!;
        d[i + 3] = Math.min(235, 60 + a * 1.4);
      }
      ctx.globalAlpha = 1;
      ctx.putImageData(img, 0, 0);
    }

    // the dots, and the taps that went wrong: always on top
    for (const [x, y, f] of taps) {
      if (!dots && !f) continue;
      ctx.beginPath();
      ctx.arc(x * W, y * H, f ? 9 : 6, 0, Math.PI * 2);
      if (f === 2) {
        ctx.lineWidth = 3;
        ctx.strokeStyle = "#dc2626";
        ctx.stroke();
      } else if (f === 1) {
        ctx.lineWidth = 2.5;
        ctx.strokeStyle = "#6b7280";
        ctx.stroke();
      } else {
        ctx.fillStyle = "rgba(108,71,255,0.55)";
        ctx.fill();
      }
    }
  }, [taps, dots]);

  return (
    <div className="flex flex-col items-center">
      <div className="mb-2.5 flex w-full items-center justify-between gap-2">
        {caption && <p className="min-w-0 truncate text-[0.75rem] text-muted tabular-nums">{caption}</p>}
        <div className="flex shrink-0 gap-1 rounded-full bg-ink/[0.06] p-1 text-[0.75rem] font-semibold">
          {[
            { on: !dots, label: "حرارة", set: false },
            { on: dots, label: "نقاط", set: true },
          ].map((x) => (
            <button key={x.label} type="button" onClick={() => setDots(x.set)} className={`h-7 rounded-full px-3 ${x.on ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
              {x.label}
            </button>
          ))}
        </div>
      </div>
      <div
        className="relative aspect-[390/844] overflow-hidden rounded-[1.75rem] bg-canvas shadow-[0_0_0_6px_var(--color-ink),0_20px_40px_-20px_rgb(0_0_0/0.5)]"
        // as wide as the column allows, never taller than what is left of the screen
        style={{ width: "min(100%, 17rem, calc((100dvh - 19rem) * 390 / 844))" }}
      >
        {shot && pic ? (
          // eslint-disable-next-line @next/next/no-img-element
          <img ref={img} src={`/heat/${shot}.webp`} alt="" className="absolute inset-0 size-full object-cover object-top opacity-80" onError={() => setPic(false)} />
        ) : (
          <div className="absolute inset-0 grid place-items-center bg-[linear-gradient(var(--color-line)_1px,transparent_1px),linear-gradient(90deg,var(--color-line)_1px,transparent_1px)] bg-[size:12.5%_6.25%] p-4 text-center text-[0.8125rem] font-semibold text-muted">
            {label}
          </div>
        )}
        <canvas ref={canvas} className="absolute inset-0 size-full" aria-label={label} />
      </div>
    </div>
  );
}
