"use client";

import { useEffect, useRef, useState } from "react";
import type { TrafficClicks } from "./model";

/** One warm hue, light → dark: it has to read on top of a purple page. */
const RAMP: [number, number, number, number][] = [
  [0, 253, 208, 162],
  [0.4, 253, 141, 60],
  [0.7, 230, 85, 13],
  [1, 166, 54, 3],
];

function ramp(t: number): [number, number, number] {
  for (let i = 1; i < RAMP.length; i++) {
    const [t1, r1, g1, b1] = RAMP[i]!;
    const [t0, r0, g0, b0] = RAMP[i - 1]!;
    if (t <= t1) {
      const f = (t - t0) / (t1 - t0 || 1);
      return [r0 + (r1 - r0) * f, g0 + (g1 - g0) * f, b0 + (b1 - b0) * f];
    }
  }
  const last = RAMP[RAMP.length - 1]!;
  return [last[1], last[2], last[3]];
}

function paint(canvas: HTMLCanvasElement, points: TrafficClicks["points"], docW: number, docH: number, ratio: number) {
  canvas.width = Math.round(docW * ratio);
  canvas.height = Math.round(docH * ratio);
  canvas.style.width = `${docW}px`;
  canvas.style.height = `${docH}px`;
  const ctx = canvas.getContext("2d", { willReadFrequently: true });
  if (!ctx) return;
  ctx.setTransform(ratio, 0, 0, ratio, 0, 0);
  ctx.clearRect(0, 0, docW, docH);
  // density first, in the alpha channel only…
  const r = 22;
  for (const [x, y, dh] of points) {
    const px = x * docW;
    const py = dh && dh > 0 ? (y / dh) * docH : y;
    const g = ctx.createRadialGradient(px, py, 0, px, py, r);
    g.addColorStop(0, "rgba(0,0,0,0.3)");
    g.addColorStop(1, "rgba(0,0,0,0)");
    ctx.fillStyle = g;
    ctx.fillRect(px - r, py - r, r * 2, r * 2);
  }
  // …then coloured: more taps, darker and more opaque
  const img = ctx.getImageData(0, 0, canvas.width, canvas.height);
  const d = img.data;
  for (let i = 0; i < d.length; i += 4) {
    const a = d[i + 3]! / 255;
    if (!a) continue;
    const [cr, cg, cb] = ramp(a);
    d[i] = cr;
    d[i + 1] = cg;
    d[i + 2] = cb;
    d[i + 3] = Math.round((0.35 + 0.55 * a) * 255);
  }
  ctx.putImageData(img, 0, 0);
}

/**
 * The real page in a frame the size of a phone's (or a computer's) screen,
 * shrunk to fit, with every tap drawn over it. The whole first screen shows at
 * once; the frame scrolls like the page for the rest. Nothing in it clicks.
 */
export function ClickMap({
  src,
  points,
  width,
  height,
  maxHeight,
  title,
  fit = "width",
}: {
  src: string;
  points: TrafficClicks["points"];
  width: number;
  height: number;
  maxHeight: number;
  title: string;
  /** "height": always as tall as maxHeight (a phone beside a list); "width": as wide as the space allows. */
  fit?: "width" | "height";
}) {
  const box = useRef<HTMLDivElement>(null);
  const frame = useRef<HTMLIFrameElement>(null);
  const [boxW, setBoxW] = useState(0);
  const [loaded, setLoaded] = useState(0);

  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const ro = new ResizeObserver(() => setBoxW(el.clientWidth));
    ro.observe(el);
    setBoxW(el.clientWidth);
    return () => ro.disconnect();
  }, []);

  const scale = fit === "height" ? maxHeight / height : boxW ? Math.min(boxW / width, maxHeight / height) : 0;

  useEffect(() => {
    const doc = frame.current?.contentDocument;
    if (!loaded || !scale || !doc?.body) return;
    let canvas = doc.getElementById("pl-heat") as HTMLCanvasElement | null;
    if (!canvas) {
      canvas = doc.createElement("canvas");
      canvas.id = "pl-heat";
      canvas.setAttribute("aria-hidden", "true");
      canvas.style.cssText = "position:absolute;left:0;top:0;pointer-events:none;z-index:2147483647";
      doc.body.appendChild(canvas);
      // a preview: links and buttons do nothing in here
      const stop = (e: Event) => {
        e.preventDefault();
        e.stopPropagation();
      };
      doc.addEventListener("click", stop, true);
      doc.addEventListener("submit", stop, true);
    }
    const draw = () => {
      const de = doc.documentElement;
      const docW = de.clientWidth || width;
      const docH = Math.min(16_000, Math.max(de.scrollHeight, doc.body.scrollHeight));
      const ratio = Math.max(0.5, Math.min(2, (window.devicePixelRatio || 1) * scale));
      paint(canvas!, points, docW, docH, ratio);
    };
    draw();
    // fonts and images move things for a moment after load
    const later = setTimeout(draw, 1200);
    return () => clearTimeout(later);
  }, [loaded, scale, points, width]);

  return (
    <div ref={box} className={fit === "height" ? "shrink-0" : "flex w-full justify-center"}>
      <div
        className="relative overflow-hidden rounded-xl bg-surface shadow-card"
        style={{ width: scale ? width * scale : "100%", height: scale ? height * scale : maxHeight }}
      >
        {scale > 0 && (
          <iframe
            ref={frame}
            src={src}
            title={title}
            onLoad={() => setLoaded((n) => n + 1)}
            className="absolute left-0 top-0 border-0 bg-surface"
            style={{ width, height, transform: `scale(${scale})`, transformOrigin: "0 0" }}
          />
        )}
      </div>
    </div>
  );
}
