"use client";

import { useCallback, useEffect, useState } from "react";
import { createPortal } from "react-dom";
import { MessageCircle, Phone, Play, X } from "lucide-react";
import { useBrowser } from "@/components/Client";
import { ClipSheet } from "@/components/HowClip";
import { signal, watching } from "@/lib/track";
import { fill, t } from "@/lib/t";

export type HelpVideo = { id: string; label: string; vertical: boolean };
export type HelpSettings = { phone: string | null; video1: HelpVideo | null; video2: HelpVideo | null; from?: string | null };

/** +21622123456 → +216 22 123 456 */
const pretty = (d: string) => (d.length === 11 && d.startsWith("216") ? `+216 ${d.slice(3, 5)} ${d.slice(5, 8)} ${d.slice(8)}` : `+${d}`);

/** A YouTube video over the whole screen: standing up for a Short, lying down otherwise. */
export function VideoModal({ video, onClose }: { video: HelpVideo; onClose: () => void }) {
  useEffect(() => {
    const opened = Date.now();
    signal("video", video.label);
    watching(true);
    return () => {
      watching(false);
      signal("video_close", `${Math.round((Date.now() - opened) / 1000)}s · ${video.label}`);
    };
  }, [video.label]);
  useEffect(() => {
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [onClose]);
  const browser = useBrowser();
  const panel = (
    <div className="fixed inset-0 z-[60] flex animate-fade flex-col items-center justify-center bg-black/90 p-4" role="dialog" aria-modal="true" aria-label={video.label} onClick={onClose}>
      <button type="button" onClick={onClose} className="press absolute end-4 top-4 grid size-11 place-items-center rounded-full bg-white/15 text-white" aria-label={t.back}>
        <X className="size-5" />
      </button>
      <p className="mb-3 max-w-md text-center text-[0.9375rem] font-bold text-white">{video.label}</p>
      <div
        className="overflow-hidden rounded-[1.25rem] bg-black shadow-2xl"
        // a picture whose height follows its width: capped by the screen both ways, so it never spills out
        style={video.vertical ? { height: "min(78dvh, calc((100vw - 2rem) * 16 / 9))", aspectRatio: "9 / 16" } : { width: "min(92vw, 56rem, calc((100dvh - 8rem) * 16 / 9))", aspectRatio: "16 / 9" }}
        onClick={(e) => e.stopPropagation()}
      >
        <iframe
          src={`https://www.youtube-nocookie.com/embed/${video.id}?autoplay=1&rel=0&modestbranding=1&playsinline=1`}
          title={video.label}
          className="size-full"
          allow="autoplay; encrypted-media; picture-in-picture; fullscreen"
          allowFullScreen
        />
      </div>
    </div>
  );
  // on the page's body: the front door's own box hides what overflows, and a sheet drawn inside it
  // came out with its last rows cut off (19 Oct 2026)
  return browser ? createPortal(panel, document.body) : null;
}

/** The floating «▶ كيفاش تخدم؟» on the front door: the first video, one tap. */
export function VideoPill({ video, className = "" }: { video: HelpVideo | null; className?: string }) {
  const [open, setOpen] = useState(false);
  if (!video) return null;
  return (
    <>
      <button type="button" onClick={() => setOpen(true)} className={`press flex h-[2.4rem] items-center gap-2 rounded-full bg-ink/90 pe-3.5 ps-1.5 text-[0.8125rem] font-bold text-white shadow-[0_12px_26px_-10px_rgb(0_0_0/0.6)] backdrop-blur ${className}`}>
        <span className="relative grid size-[1.75rem] shrink-0 place-items-center rounded-full bg-[#D7141A]">
          <span className="absolute inset-0 animate-ping rounded-full bg-[#D7141A]/60 [animation-duration:1.8s]" aria-hidden />
          <Play className="relative size-3.5 translate-x-[1px] fill-white" />
        </span>
        <span className="min-w-0 truncate">{video.label}</span>
      </button>
      {open && <VideoModal video={video} onClose={() => setOpen(false)} />}
    </>
  );
}

/**
 * «عندك سؤال؟» for an owner: a quiet round «؟» in the corner (no words: it sat
 * beside the shop's name and competed with it — 17 Oct 2026) that opens a sheet —
 * call us, write on WhatsApp, see the filmed slides again («هكّا تخدم في
 * المحل», the onboarding's three clips — the founder asked for them here, 17
 * Oct 2026), or watch the two videos (the number and the videos set by the
 * founder in the console).
 */
// `compact` is kept for the callers that pass it: every help is the round one now
export function HelpButton({ help, light = false, small = false }: { help: HelpSettings; light?: boolean; compact?: boolean; small?: boolean }) {
  const [open, setOpen] = useState(false);
  const [video, setVideo] = useState<HelpVideo | null>(null);
  const videos = [help.video1, help.video2].filter((v): v is HelpVideo => !!v);
  const [clips, setClips] = useState(false);
  const closeClips = useCallback(() => setClips(false), []);
  const browser = useBrowser();
  const panel = (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/40" onClick={() => setOpen(false)} role="dialog" aria-modal="true" aria-label={t.helpTitle}>
              <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-3 text-ink shadow-[0_-20px_50px_-20px_rgb(0_0_0/0.5)]" style={{ animation: "help-up 360ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
                <style>{`@keyframes help-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
                <span className="mx-auto mb-3 block h-1.5 w-10 rounded-full bg-line" aria-hidden />
                <h2 className="text-[1.25rem] font-bold">{t.helpTitle}</h2>
                <p className="mt-1 text-[0.9375rem] text-muted">{t.helpBody}</p>
                <div className="mt-4 space-y-2">
                  {help.phone && (
                    <div className="grid grid-cols-2 gap-2">
                      <a href={`tel:+${help.phone}`} className="press flex h-[3.25rem] items-center justify-center gap-2 rounded-[1.125rem] bg-brand text-[0.9375rem] font-bold text-white shadow-[0_12px_26px_-12px_rgb(108_71_255/0.7)]">
                        <Phone className="size-5" /> {t.helpCall}
                      </a>
                      <a href={`https://wa.me/${help.phone}?text=${encodeURIComponent(t.helpWhatsappMsg + (help.from ? fill(t.waFrom, { who: help.from }) : ""))}`} target="_blank" rel="noreferrer" className="press flex h-[3.25rem] items-center justify-center gap-2 rounded-[1.125rem] bg-[#25D366] text-[0.9375rem] font-bold text-white">
                        <MessageCircle className="size-5" /> {t.helpWhatsapp}
                      </a>
                    </div>
                  )}
                  {help.phone && (
                    <p dir="ltr" className="num text-center text-[0.8125rem] text-muted">
                      {pretty(help.phone)}
                    </p>
                  )}
                  {/* the filmed slides, first: the café, the restaurant, the shop — the owner's own work, seen */}
                  <button
                    type="button"
                    onClick={() => {
                      setOpen(false);
                      setClips(true);
                    }}
                    className="press flex h-[3.25rem] w-full items-center gap-3 rounded-[1.125rem] bg-surface px-3 text-start text-[0.9375rem] font-semibold shadow-card"
                  >
                    <span className="relative grid size-9 shrink-0 place-items-center overflow-hidden rounded-full bg-ink text-white">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img src="/clips/how-1-v2.webp" alt="" className="absolute inset-0 size-full object-cover opacity-80" />
                      <Play className="relative size-4 fill-white" />
                    </span>
                    <span className="min-w-0 flex-1 truncate">{t.clipTitle}</span>
                  </button>
                  {videos.map((v) => (
                    <button key={v.id} type="button" onClick={() => setVideo(v)} className="press flex h-[3.25rem] w-full items-center gap-3 rounded-[1.125rem] bg-surface px-3 text-start text-[0.9375rem] font-semibold shadow-card">
                      <span className="grid size-9 shrink-0 place-items-center rounded-full bg-[#D7141A] text-white">
                        <Play className="size-4 fill-white" />
                      </span>
                      <span className="min-w-0 flex-1 truncate">{v.label}</span>
                    </button>
                  ))}
                </div>
              </div>
            </div>
  );

  return (
    <>
      <button
        type="button"
        onClick={() => {
          setOpen(true);
          signal("help_open");
        }}
        aria-label={t.helpCta}
        className={`press relative grid shrink-0 place-items-center rounded-full text-[1.125rem] font-bold ${small ? "size-10" : "size-11"} ${light ? "bg-white/15 text-white" : "bg-surface text-brand shadow-card"}`}
      >
        <span aria-hidden>؟</span>
      </button>
      {/* the sheet on the page's body, never inside the screen that opened it: the front door hides
          what overflows its own box, and the last rows of this came out cut (19 Oct 2026) */}
      {open && browser && createPortal(panel, document.body)}
      {video && <VideoModal video={video} onClose={() => setVideo(null)} />}
      {clips && <ClipSheet onClose={closeClips} />}
    </>
  );
}
