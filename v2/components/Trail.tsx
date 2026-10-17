"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { Pause, Play, RotateCcw, X } from "lucide-react";
import { screenName } from "@/lib/screens";
import { t } from "@/lib/t";

export type Step = { route: string; screen: string | null; ms: number };

/** A colour per screen, so the same place is the same colour everywhere down
 *  the page and a visit's shape can be read without any words at all. */
const INK = ["#6C47FF", "#12B76A", "#F79009", "#E0457B", "#0891B2", "#D7141A", "#7A5AF8", "#15803D", "#B45309", "#1D5FA8"];
const hue = (key: string) => {
  let n = 0;
  for (let i = 0; i < key.length; i++) n = (n * 31 + key.charCodeAt(i)) >>> 0;
  return INK[n % INK.length]!;
};
const keyOf = (w: Step) => `${w.route}:${w.screen ?? ""}`;
const say = (ms: number) => {
  const s = Math.round(ms / 1000);
  if (s < 60) return `${s}ث`;
  const m = Math.floor(s / 60);
  return s % 60 ? `${m}د ${s % 60}ث` : `${m}د`;
};

/**
 * A visit, seen rather than read.
 *
 * Thirty steps written as «دار المحل ← الكود ← دار المحل» is a wall nobody
 * finishes. The same thirty steps drawn as a ribbon — each screen a block as
 * wide as the time spent on it, each place its own colour — is one glance:
 * a long calm block is somebody working, a comb of thin stripes is somebody
 * lost, and you can tell them apart across a whole page without reading a
 * word.
 *
 * Pressing it replays the visit at speed, so you watch where the person went
 * instead of reconstructing it.
 */
export function Trail({ path, pages }: { path: Step[]; pages: number }) {
  const [open, setOpen] = useState(false);
  const total = useMemo(() => path.reduce((a, w) => a + Math.max(w.ms, 400), 0), [path]);

  if (!path.length) return <span className="text-faint">—</span>;

  return (
    <>
      <button
        type="button"
        onClick={(e) => {
          e.preventDefault();
          e.stopPropagation();
          setOpen(true);
        }}
        // the row's own link lies over the whole cell at z-1: the ribbon has
        // to sit above it, or every press opens the row instead of the replay
        className="group/t relative z-[2] block w-full min-w-[12rem] text-start"
        aria-label={t.aTrailOpen}
      >
        <span className="flex h-[1.375rem] w-full gap-[2px] overflow-hidden rounded-[0.3125rem]">
          {path.map((w, i) => (
            <span
              key={i}
              title={`${screenName(w.route, w.screen)} · ${say(w.ms)}`}
              className="min-w-[3px] transition-opacity group-hover/t:opacity-80"
              style={{ flexGrow: Math.max(w.ms, 400), background: hue(keyOf(w)) }}
            />
          ))}
        </span>
        <span className="mt-1 flex items-center gap-1.5 text-[0.75rem] text-muted">
          <span className="font-semibold text-body">{path.length}</span>
          {t.aTrailSteps}
          {pages > path.length && <span>+{pages - path.length}</span>}
          <span className="text-faint">·</span>
          <span>{t.aTrailWatch}</span>
        </span>
      </button>

      {open && <Player path={path} total={total} onClose={() => setOpen(false)} />}
    </>
  );
}

/** The same visit, played: one screen at a time, in the time it really took,
 *  at six times the speed so a ten-minute visit is watched in a hundred. */
function Player({ path, total, onClose }: { path: Step[]; total: number; onClose: () => void }) {
  const [at, setAt] = useState(0);
  const [going, setGoing] = useState(true);
  const tick = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (!going) return;
    const wait = Math.min(Math.max(path[at]?.ms ?? 600, 400) / 6, 2200);
    tick.current = setTimeout(() => {
      if (at + 1 < path.length) setAt(at + 1);
      else setGoing(false);
    }, wait);
    return () => {
      if (tick.current) clearTimeout(tick.current);
    };
  }, [at, going, path]);

  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => window.removeEventListener("keydown", esc);
  }, [onClose]);

  const now = path[at]!;
  const done = path.slice(0, at).reduce((a, w) => a + Math.max(w.ms, 400), 0);

  return (
    <div className="fixed inset-0 z-50 grid place-items-center bg-ink/60 p-4 backdrop-blur-[2px]" role="dialog" aria-modal="true" onClick={onClose}>
      <div className="w-full max-w-lg rounded-[1.25rem] bg-surface p-5 shadow-lift" onClick={(e) => e.stopPropagation()}>
        <div className="flex items-center justify-between gap-3">
          <h2 className="text-[1.0625rem] font-bold">{t.aTrailTitle}</h2>
          <button type="button" onClick={onClose} className="press grid size-8 place-items-center rounded-full bg-canvas text-muted" aria-label={t.closeIt}>
            <X className="size-4" />
          </button>
        </div>

        {/* the screen they are on, and the one before it */}
        <div className="mt-4 grid place-items-center rounded-[1rem] py-7 text-center" style={{ background: `${hue(keyOf(now))}14` }}>
          <span className="text-[0.8125rem] font-semibold text-muted">
            {at > 0 ? screenName(path[at - 1]!.route, path[at - 1]!.screen) : t.aTrailArrived}
          </span>
          <span className="mt-1 text-[1.5rem] font-bold leading-tight" style={{ color: hue(keyOf(now)) }}>
            {screenName(now.route, now.screen)}
          </span>
          <span className="mt-1 text-[0.875rem] font-semibold text-body">{say(now.ms)}</span>
        </div>

        {/* the whole visit, with where we are in it */}
        <div className="relative mt-4">
          <span className="flex h-3 w-full gap-[2px] overflow-hidden rounded-[0.25rem]">
            {path.map((w, i) => (
              <button
                key={i}
                type="button"
                onClick={() => {
                  setGoing(false);
                  setAt(i);
                }}
                title={`${screenName(w.route, w.screen)} · ${say(w.ms)}`}
                className={`min-w-[3px] transition-opacity ${i <= at ? "" : "opacity-25"}`}
                style={{ flexGrow: Math.max(w.ms, 400), background: hue(keyOf(w)) }}
              />
            ))}
          </span>
          <span className="pointer-events-none absolute -top-0.5 h-4 w-[2px] bg-ink transition-[inset-inline-start] duration-200" style={{ insetInlineStart: `${(done / total) * 100}%` }} />
        </div>

        <div className="mt-3 flex items-center gap-2">
          <button
            type="button"
            onClick={() => (at + 1 >= path.length && !going ? (setAt(0), setGoing(true)) : setGoing(!going))}
            className="press flex h-10 items-center gap-2 rounded-full bg-brand px-4 text-[0.9375rem] font-bold text-white"
          >
            {at + 1 >= path.length && !going ? <RotateCcw className="size-4" /> : going ? <Pause className="size-4" /> : <Play className="size-4" />}
            {at + 1 >= path.length && !going ? t.aTrailAgain : going ? t.aTrailStop : t.aTrailGo}
          </button>
          <span className="text-[0.8125rem] text-muted">
            <span className="font-semibold text-body">{at + 1}</span> / {path.length}
          </span>
          <span className="ms-auto text-[0.8125rem] font-semibold text-body">{say(total)}</span>
        </div>
      </div>
    </div>
  );
}
