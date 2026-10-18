"use client";

import { useEffect, useState } from "react";

/**
 * What a computer sees around the front door.
 *
 * The welcome is a phone's column, 28rem wide and centred, so on a computer
 * everything either side of it was the app's grey while the column itself is
 * cream — a seam straight down both sides of the screen (the founder, 18 Oct
 * 2026: «fix the desktop mismatch bg color»). The cream now runs edge to edge,
 * and the room that opened up holds the clips that were already filmed for
 * «هكّا تخدم في المحل» — a real counter either side of the phone, quiet,
 * dimmed, and far enough out that nothing moves near the words.
 *
 * It costs a phone nothing: the layer is not rendered under 1100px, and the
 * clips are only given a src once that is true, after the page is interactive.
 * This is the page an ad lands on, so it is never allowed to delay it.
 */
const CLIPS = ["/clips/how-1-v2.mp4", "/clips/how-3-v2.mp4"];

export function WelcomeDesk() {
  const [wide, setWide] = useState(false);

  useEffect(() => {
    const m = window.matchMedia("(min-width: 1100px)");
    const look = () => setWide(m.matches);
    look();
    m.addEventListener("change", look);
    return () => m.removeEventListener("change", look);
  }, []);

  return (
    <>
      {/* the cream, edge to edge, under everything — on a phone this is all there is */}
      <div className="fixed inset-0 -z-20 bg-[#FBF6EF]" aria-hidden />
      {wide && (
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden>
          {CLIPS.map((src, i) => (
            <video
              key={src}
              src={src}
              poster={src.replace(/\.mp4$/, ".webp")}
              autoPlay
              muted
              loop
              playsInline
              preload="none"
              // a phone lying on the desk, one on each side, tilted away from the middle
              className={`absolute top-1/2 h-[min(62vh,34rem)] w-auto -translate-y-1/2 rounded-[2rem] opacity-[0.38] shadow-[0_40px_80px_-30px_rgb(20_16_40/0.45)] ${
                i === 0 ? "start-[6vw] -rotate-6" : "end-[6vw] rotate-6"
              }`}
            />
          ))}
          {/* the middle stays calm: the clips fade out before they reach the column */}
          <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#FBF6EF_24rem,rgb(251_246_239/0.55)_38rem,transparent_60rem)]" />
        </div>
      )}
    </>
  );
}
