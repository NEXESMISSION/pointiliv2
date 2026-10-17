"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronLeft, Play, X } from "lucide-react";
import { useBars } from "@/lib/bars";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";

/**
 * How it works, filmed for real (17 Oct 2026, «vedio pointili 3»), as three
 * slides the owner swipes like stories: a restaurant (clip 2 — the founder's
 * choice for the first), a café (clip 1), a shop (clip 3); in each the owner
 * shows the code, the customer scans it with their own phone, the tampon
 * lands. Each slide plays by itself without sound and passes to the next
 * when it ends; the last one waits for its button. The only way out before
 * the end is «تخطّى». Made light for a phone on a data plan: each clip
 * 540×960, no sound, H.264 ~430 kb/s (about 0.5 MB), a 20 KB still shown at
 * once, only the slide shown and its neighbour loaded, a year in the phone's
 * cache (next.config: /clips). A new cut is a new name: how-1-v3.mp4.
 */
const SLIDES = [
  { src: "/clips/how-1-v2.mp4", poster: "/clips/how-1-v2.webp", title: t.clipBeat1, line: t.clipLine1 },
  { src: "/clips/how-2-v2.mp4", poster: "/clips/how-2-v2.webp", title: t.clipBeat2, line: t.clipLine2 },
  { src: "/clips/how-3-v2.mp4", poster: "/clips/how-3-v2.webp", title: t.clipBeat3, line: t.clipLine3 },
];

const saving = () => typeof navigator !== "undefined" && !!(navigator as Navigator & { connection?: { saveData?: boolean } }).connection?.saveData;

/** Warm the phone's cache with the first slide before it is needed (never on a data saver). */
export function prefetchClip() {
  const src = SLIDES[0]!.src;
  if (saving() || document.querySelector(`link[href="${src}"]`)) return;
  document.head.append(Object.assign(document.createElement("link"), { rel: "prefetch", href: src, as: "video" }));
}

/**
 * The three slides over the whole screen. `skip`: the way out before the end
 * (its label, or a close); `done`: the last slide's button. Both call `onDone`.
 */
export function HowStory({ onDone, done, skip, close = false }: { onDone: (how: "done" | "skip") => void; done: string; skip: string; close?: boolean }) {
  useBars("#0f0e17");
  const track = useRef<HTMLDivElement>(null);
  const videos = useRef<(HTMLVideoElement | null)[]>([]);
  const slides = useRef<(HTMLDivElement | null)[]>([]);
  const bars = useRef<(HTMLSpanElement | null)[]>([]);
  const [at, setAt] = useState(0);
  const [moved, setMoved] = useState(false);
  const [stuck, setStuck] = useState(false);
  const last = at === SLIDES.length - 1;
  const lean = saving();

  // right to left: the track's scroll runs negative in today's browsers
  const sign = () => (track.current && getComputedStyle(track.current).direction === "rtl" ? -1 : 1);
  const go = useCallback((i: number) => {
    const el = track.current;
    if (!el) return;
    el.scrollTo({ left: sign() * i * el.clientWidth, behavior: "smooth" });
  }, []);

  // the slide in sight: depth while it is dragged (the others shrink and round off), and which one is shown
  useEffect(() => {
    const el = track.current;
    if (!el) return;
    let raf = 0;
    const paint = () => {
      raf = 0;
      const pos = Math.abs(el.scrollLeft) / Math.max(1, el.clientWidth);
      slides.current.forEach((s, i) => {
        if (!s) return;
        const d = Math.min(Math.abs(i - pos), 1);
        s.style.transform = `scale(${1 - d * 0.12})`;
        s.style.borderRadius = `${d * 32}px`;
        s.style.opacity = String(1 - d * 0.35);
      });
      const i = Math.round(pos);
      setAt((now) => (now === i ? now : i));
      if (pos > 0.05) setMoved(true);
    };
    const onScroll = () => {
      if (!raf) raf = requestAnimationFrame(paint);
    };
    el.addEventListener("scroll", onScroll, { passive: true });
    paint();
    return () => {
      el.removeEventListener("scroll", onScroll);
      cancelAnimationFrame(raf);
    };
  }, []);

  // the slide shown plays from its start; the others rest at theirs
  useEffect(() => {
    signal("clip", `slide ${at + 1}`);
    videos.current.forEach((v, i) => {
      if (!v) return;
      if (i === at) {
        v.currentTime = 0;
        v.play().then(() => setStuck(false)).catch(() => setStuck(true));
      } else {
        v.pause();
        v.currentTime = 0;
      }
    });
  }, [at]);

  // the bar of the slide shown fills with its clip; the ones before are full, the ones after empty
  useEffect(() => {
    let raf = 0;
    const tick = () => {
      bars.current.forEach((b, i) => {
        if (!b) return;
        const v = videos.current[i];
        const p = i < at ? 1 : i > at ? 0 : v && v.duration ? v.currentTime / v.duration : 0;
        b.style.transform = `scaleX(${p})`;
      });
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(raf);
  }, [at]);

  const s = SLIDES[at]!;
  return (
    <div className="fixed inset-0 z-50 flex animate-fade justify-center bg-ink text-white" role="dialog" aria-modal="true" aria-label={t.clipTitle}>
      <div className="relative h-full w-full max-w-md overflow-hidden">
        {/* the slides: swiped with a finger, one at a time */}
        <div ref={track} data-list className="flex h-full snap-x snap-mandatory overflow-x-auto overflow-y-hidden overscroll-x-contain [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
          {SLIDES.map((sl, i) => (
            <section key={sl.src} className="relative h-full w-full shrink-0 snap-center snap-always">
              <div
                ref={(el) => {
                  slides.current[i] = el;
                }}
                className="absolute inset-0 overflow-hidden bg-ink will-change-transform"
              >
                <video
                  ref={(el) => {
                    videos.current[i] = el;
                  }}
                  // only the slide shown and its neighbour fetch anything (the one shown alone on a data saver)
                  src={Math.abs(i - at) <= (lean ? 0 : 1) || i < at ? sl.src : undefined}
                  poster={sl.poster}
                  muted
                  playsInline
                  preload={i === at ? "auto" : "metadata"}
                  loop={i === SLIDES.length - 1}
                  disablePictureInPicture
                  onEnded={() => i === at && i < SLIDES.length - 1 && go(i + 1)}
                  onPlay={() => i === at && setStuck(false)}
                  className="size-full object-cover"
                />
              </div>
            </section>
          ))}
        </div>

        {/* the top: the bars, what this is, and the way out */}
        <div className="pointer-events-none absolute inset-x-0 top-0 h-40 bg-[linear-gradient(to_bottom,rgb(15_14_23/0.7),transparent)]" />
        <div className="safe-t pointer-events-none absolute inset-x-0 top-0 px-4">
          <div className="flex gap-1.5 pt-2">
            {SLIDES.map((sl, i) => (
              <span key={sl.src} className="h-1 flex-1 overflow-hidden rounded-full bg-white/30">
                <span
                  ref={(el) => {
                    bars.current[i] = el;
                  }}
                  className="block h-full origin-right scale-x-0 rounded-full bg-white"
                />
              </span>
            ))}
          </div>
          <div className="mt-3 flex items-center justify-between gap-3">
            <span className="text-[0.9375rem] font-bold text-white/90">{t.clipTitle}</span>
            <button
              type="button"
              onClick={() => onDone("skip")}
              aria-label={close ? t.back : skip}
              className="press pointer-events-auto flex h-9 shrink-0 items-center gap-1 rounded-full bg-white/20 px-3.5 text-[0.8125rem] font-bold backdrop-blur-sm"
            >
              {close ? <X className="size-4" /> : skip}
            </button>
          </div>
        </div>

        {/* a phone that refuses to play by itself (a battery saver): the still, and a play button */}
        {stuck && (
          <button
            type="button"
            onClick={() => videos.current[at]?.play().then(() => setStuck(false)).catch(() => {})}
            className="press absolute inset-0 m-auto grid size-20 place-items-center rounded-full bg-white/90 text-brand shadow-[0_12px_30px_-10px_rgb(0_0_0/0.5)]"
            aria-label={t.clipPlay}
          >
            <Play className="ms-1 size-9" fill="currentColor" />
          </button>
        )}

        {/* the foot: the step, what it shows, and the one button */}
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[48%] bg-[linear-gradient(to_top,rgb(15_14_23/0.9),rgb(15_14_23/0.55)_45%,transparent)]" />
        <div className="safe-b absolute inset-x-0 bottom-0 px-5 pb-4">
          <div key={at} className="text-start">
            <p className="flex animate-rise items-center gap-2">
              <span className="num grid size-7 place-items-center rounded-full bg-white text-[0.8125rem] font-bold text-ink">{at + 1}</span>
              {at === 0 && !moved && (
                // the first slide: slides go sideways, said once with a nudge
                <span className="ms-auto flex animate-pulse items-center gap-1 text-[0.8125rem] font-bold text-white/85">
                  {t.clipSwipe} <ChevronLeft className="size-4" />
                </span>
              )}
            </p>
            <h2 className="mt-2 animate-rise text-balance text-[1.625rem] font-bold leading-tight [animation-delay:80ms]">{s.title}</h2>
            <p className="mt-1 animate-rise text-balance text-[0.9688rem] leading-relaxed text-white/80 [animation-delay:160ms]">{s.line}</p>
          </div>
          <button
            type="button"
            onClick={() => (last ? onDone("done") : go(at + 1))}
            className={`press mt-4 flex h-14 w-full items-center justify-center gap-2 rounded-[1.25rem] text-[1.0625rem] font-bold transition-colors duration-300 ${last ? "bg-brand text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.8)]" : "bg-white text-ink"}`}
          >
            {last ? done : t.next}
          </button>
        </div>
      </div>
    </div>
  );
}

/** The slides from the counter, the home or «سكاني»: a close in place of «تخطّى», «فهمت» at the end. */
export function ClipSheet({ onClose }: { onClose: () => void }) {
  useEffect(() => {
    signal("clip", "open");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  return <HowStory onDone={onClose} done={t.tryGotIt} skip={t.back} close />;
}

/** A button that opens the slides: its children are its face. */
export function ClipButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <ClipSheet onClose={close} />}
    </>
  );
}
