"use client";

import { useEffect, useState } from "react";

/**
 * The film behind the front door, on a PHONE (the founder, 19 Oct 2026: «i
 * want it mainly for the mobile design not the desktop»).
 *
 * The welcome is a cream column. On a computer the window around it used to be
 * the app's grey — a seam down both sides — so the cream runs edge to edge
 * now whatever else is on; that part is settled and is not one of the choices.
 *
 * What is to be chosen is how the counter's own clip sits behind a phone's
 * screen, where there is no room to spare and nothing may move near the
 * words: /?desk=1|2|3|4.
 *   1 — behind everything, far under the cream
 *   2 — a band across the top, under the card, gone before the title
 *   3 — a band across the foot, under the two buttons
 *   4 — no film: the clip's own still frame (36KB, nothing to play)
 *
 * The page an ad lands on pays for every byte, so: one clip at most, muted,
 * looping, `preload="none"`, and the still shown until the page is idle —
 * the card, the words and the buttons never wait behind a video.
 */
export type Desk = "1" | "2" | "3" | "4";

const CLIP = "/clips/how-1-v2.mp4";
const STILL = "/clips/how-1-v2.webp";

export function WelcomeDesk({ which = "1" }: { which?: Desk }) {
  const [ready, setReady] = useState(false);
  useEffect(() => {
    const w = window as Window & { requestIdleCallback?: (cb: () => void) => number; cancelIdleCallback?: (id: number) => void };
    const id = w.requestIdleCallback ? w.requestIdleCallback(() => setReady(true)) : window.setTimeout(() => setReady(true), 400);
    return () => (w.cancelIdleCallback ? w.cancelIdleCallback(id) : clearTimeout(id));
  }, []);

  const film = (className: string) =>
    ready && which !== "4" ? (
      <video src={CLIP} poster={STILL} autoPlay muted loop playsInline preload="none" className={className} />
    ) : (
      // eslint-disable-next-line @next/next/no-img-element
      <img src={STILL} alt="" className={className} />
    );

  return (
    <>
      {/* the cream, edge to edge, under everything */}
      <div className="fixed inset-0 -z-20 bg-[#FBF6EF]" aria-hidden />
      <div className="pointer-events-none absolute inset-0 z-0 overflow-hidden" aria-hidden data-desk={which}>
        {(which === "1" || which === "4") && (
          <>
            {film("absolute inset-0 size-full object-cover opacity-[0.18]")}
            <div className="absolute inset-0 bg-[linear-gradient(to_bottom,#FBF6EF_0%,rgb(251_246_239/0.7)_40%,#FBF6EF_100%)]" />
          </>
        )}
        {which === "2" && (
          <>
            {film("absolute inset-x-0 top-0 h-[46dvh] w-full object-cover opacity-[0.3]")}
            <div className="absolute inset-x-0 top-0 h-[46dvh] bg-[linear-gradient(to_bottom,rgb(251_246_239/0.5),#FBF6EF_92%)]" />
          </>
        )}
        {which === "3" && (
          <>
            {film("absolute inset-x-0 bottom-0 h-[38dvh] w-full object-cover opacity-[0.28]")}
            <div className="absolute inset-x-0 bottom-0 h-[38dvh] bg-[linear-gradient(to_top,rgb(251_246_239/0.45),#FBF6EF_90%)]" />
          </>
        )}
      </div>
    </>
  );
}
