"use client";

import { useEffect, useRef, useState } from "react";
import { Play, X } from "lucide-react";
import { MorphGround } from "@/components/Morph";
import { useBars } from "@/lib/bars";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";

/**
 * How it works, filmed for real (17 Oct 2026, «vedio pointili 3» clips 1–3):
 * a café, a restaurant, a shop — the owner shows the code, the customer scans
 * it with their own phone, the tampon lands. It replaced the drawn demo of
 * four beats. Made light for a phone on a data plan: the three clips joined
 * at 480×854, no sound, H.264 at ~390 kb/s (1.3 MB for 26 s), a 17 KB still
 * shown at once, and a name with a version so a phone keeps it a year
 * (next.config: /clips). A new cut is a new name: how-v2.mp4.
 */
export const CLIP = { src: "/clips/how-v1.mp4", poster: "/clips/how-v1.webp" };
/** what each part of the clip shows, from the second it starts */
const BEATS: [number, string][] = [
  [0, t.clipBeat1],
  [9.1, t.clipBeat2],
  [16.2, t.clipBeat3],
];

/** Warm the phone's cache with the clip before it is needed (never on a data saver). */
export function prefetchClip() {
  const c = (navigator as Navigator & { connection?: { saveData?: boolean } }).connection;
  if (c?.saveData || document.querySelector(`link[href="${CLIP.src}"]`)) return;
  const l = Object.assign(document.createElement("link"), { rel: "prefetch", href: CLIP.src, as: "video" });
  document.head.append(l);
}

/**
 * The clip in a rounded frame, playing by itself without sound, the part it
 * is at said over it and a thin bar of how far it is. A phone that refuses to
 * play by itself (a battery saver) shows the still and a play button. `onEnd`
 * when it has played to the end.
 */
export function HowClip({ onEnd, className = "" }: { onEnd?: () => void; className?: string }) {
  const video = useRef<HTMLVideoElement>(null);
  const bar = useRef<HTMLSpanElement>(null);
  const [beat, setBeat] = useState(0);
  const [stuck, setStuck] = useState(false);
  const ended = useRef(onEnd);
  useEffect(() => {
    ended.current = onEnd;
  }, [onEnd]);

  useEffect(() => {
    const v = video.current;
    if (!v) return;
    v.play().catch(() => setStuck(true));
    let raf = 0;
    const tick = () => {
      if (bar.current && v.duration) bar.current.style.transform = `scaleX(${v.currentTime / v.duration})`;
      let b = 0;
      BEATS.forEach(([from], i) => v.currentTime >= from && (b = i));
      setBeat(b);
      raf = requestAnimationFrame(tick);
    };
    raf = requestAnimationFrame(tick);
    const done = () => {
      signal("clip", "ended");
      ended.current?.();
    };
    v.addEventListener("ended", done);
    return () => {
      cancelAnimationFrame(raf);
      v.removeEventListener("ended", done);
    };
  }, []);

  return (
    <div className={`relative aspect-[9/16] overflow-hidden rounded-[1.75rem] bg-ink shadow-[0_30px_60px_-28px_rgb(40_20_120/0.6)] ring-[5px] ring-white ${className}`}>
      <video
        ref={video}
        src={CLIP.src}
        poster={CLIP.poster}
        muted
        playsInline
        autoPlay
        preload="auto"
        disablePictureInPicture
        className="absolute inset-0 size-full object-cover"
        onClick={(e) => {
          const v = e.currentTarget;
          if (v.paused) v.play().then(() => setStuck(false)).catch(() => setStuck(true));
          else v.pause();
        }}
        onPlay={() => setStuck(false)}
      />
      {/* how far: one thin bar along the top, like a story */}
      <span className="pointer-events-none absolute inset-x-3 top-3 h-1 overflow-hidden rounded-full bg-white/35">
        <span ref={bar} className="block h-full origin-right scale-x-0 rounded-full bg-white" />
      </span>
      {/* what this part shows, over a soft dark foot */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 bg-[linear-gradient(to_top,rgb(15_14_23/0.78),transparent)] px-4 pb-4 pt-12">
        <p key={beat} className="animate-rise text-balance text-center text-[1.0625rem] font-bold leading-snug text-white">
          {BEATS[beat]![1]}
        </p>
      </div>
      {stuck && (
        <button
          type="button"
          onClick={() => video.current?.play().then(() => setStuck(false)).catch(() => {})}
          className="press absolute inset-0 m-auto grid size-20 place-items-center rounded-full bg-white/90 text-brand shadow-[0_12px_30px_-10px_rgb(0_0_0/0.5)]"
          aria-label={t.clipPlay}
        >
          <Play className="ms-1 size-9" fill="currentColor" />
        </button>
      )}
    </div>
  );
}

/** The clip over the whole screen, for a look again from the counter or the home: a close, and «فهمت». */
export function ClipSheet({ onClose }: { onClose: () => void }) {
  useBars("#f7f5ff", "#ece8fb");
  useEffect(() => {
    signal("clip", "open");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  return (
    <div className="safe-t safe-b fixed inset-0 z-50 flex animate-fade flex-col items-center justify-center px-5 text-center text-ink" role="dialog" aria-modal="true" aria-label={t.clipTitle}>
      <MorphGround />
      <button type="button" onClick={onClose} className="press absolute end-4 top-[max(1rem,env(safe-area-inset-top))] grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
        <X className="size-5" />
      </button>
      <p className="text-[1.25rem] font-bold">{t.clipTitle}</p>
      <HowClip className="mt-3 h-[min(70dvh,calc((100vw-2.5rem)*16/9))]" />
      <button type="button" onClick={onClose} className="press mt-4 h-12 w-full max-w-[19rem] rounded-full bg-brand text-[0.9375rem] font-bold text-white shadow-[0_12px_24px_-12px_rgb(108_71_255/0.8)]">
        {t.tryGotIt}
      </button>
    </div>
  );
}

/** A button that opens the clip: its children are its face. */
export function ClipButton({ className, children }: { className?: string; children: React.ReactNode }) {
  const [open, setOpen] = useState(false);
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={className}>
        {children}
      </button>
      {open && <ClipSheet onClose={() => setOpen(false)} />}
    </>
  );
}
