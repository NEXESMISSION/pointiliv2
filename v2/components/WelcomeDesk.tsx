"use client";

import { useEffect, useState } from "react";

/**
 * What a computer sees around the front door.
 *
 * The welcome is a phone's column, 28rem wide and centred, so on a computer
 * everything either side of it was the app's grey while the column itself is
 * cream — a seam straight down both sides (the founder, 18 Oct 2026: «fix the
 * desktop mismatch bg color»). The cream runs edge to edge now, on every
 * option below; what differs is what fills the room that opens up.
 *
 * Four of them, to be looked at rather than argued about: /?desk=1|2|3|4.
 *   1 — two counters, one each side, tilted away from the middle
 *   2 — one counter behind everything, the column held up in front of it
 *   3 — no film at all: Sidi Bou Said, large and quiet
 *   4 — the film kept to the far edges, the middle pure cream
 *
 * None of it costs a phone anything: nothing is rendered under 1100px, the
 * media query is read after mounting, and every clip is muted, looping and
 * `preload="none"`. This is the page an ad lands on.
 */
export type Desk = "1" | "2" | "3" | "4";

const LEFT = "/clips/how-1-v2.mp4";
const RIGHT = "/clips/how-3-v2.mp4";
const poster = (src: string) => src.replace(/\.mp4$/, ".webp");

export function WelcomeDesk({ which = "1" }: { which?: Desk }) {
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
        <div className="pointer-events-none fixed inset-0 -z-10 overflow-hidden" aria-hidden data-desk={which}>
          {which === "1" && <Sides />}
          {which === "2" && <Behind />}
          {which === "3" && <Quiet />}
          {which === "4" && <Edges />}
        </div>
      )}
    </>
  );
}

/** 1 — two counters, one each side, tilted away from the middle. */
function Sides() {
  return (
    <>
      {[LEFT, RIGHT].map((src, i) => (
        <video
          key={src}
          src={src}
          poster={poster(src)}
          autoPlay
          muted
          loop
          playsInline
          preload="none"
          className={`absolute top-1/2 h-[min(62vh,34rem)] w-auto -translate-y-1/2 rounded-[2rem] opacity-[0.38] shadow-[0_40px_80px_-30px_rgb(20_16_40/0.45)] ${
            i === 0 ? "start-[6vw] -rotate-6" : "end-[6vw] rotate-6"
          }`}
        />
      ))}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#FBF6EF_24rem,rgb(251_246_239/0.55)_38rem,transparent_60rem)]" />
    </>
  );
}

/** 2 — one counter behind the whole window, the column held up in front of it. */
function Behind() {
  return (
    <>
      <video src={RIGHT} poster={poster(RIGHT)} autoPlay muted loop playsInline preload="none" className="absolute inset-0 size-full object-cover opacity-[0.45]" />
      {/* the middle is kept clean enough to read on, the edges keep the room */}
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#FBF6EF_21rem,rgb(251_246_239/0.72)_38rem,rgb(251_246_239/0.3)_78rem)]" />
    </>
  );
}

/** 3 — no film: Sidi Bou Said, large and still, the way the column's own corner already is. */
function Quiet() {
  return (
    <>
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tn/sidibou.webp" alt="" className="absolute -start-[6vw] top-1/2 h-[min(86vh,52rem)] w-auto -translate-y-1/2 opacity-[0.3]" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tn/jasmine.webp" alt="" className="absolute -end-[3vw] bottom-[8vh] h-[min(42vh,24rem)] w-auto opacity-40" />
      {/* eslint-disable-next-line @next/next/no-img-element */}
      <img src="/tn/tea.webp" alt="" className="absolute end-[12vw] top-[10vh] h-[min(34vh,20rem)] w-auto opacity-30" />
      <div className="absolute inset-0 bg-[radial-gradient(ellipse_at_center,#FBF6EF_26rem,rgb(251_246_239/0.5)_44rem,transparent_70rem)]" />
    </>
  );
}

/** 4 — the film kept to the far edges, in two tall strips; the middle is pure cream. */
function Edges() {
  return (
    <>
      {[LEFT, RIGHT].map((src, i) => (
        <div key={src} className={`absolute inset-y-0 w-[min(18vw,15rem)] overflow-hidden ${i === 0 ? "start-0" : "end-0"}`}>
          <video src={src} poster={poster(src)} autoPlay muted loop playsInline preload="none" className="size-full object-cover opacity-[0.45]" />
          <div className={`absolute inset-0 ${i === 0 ? "bg-[linear-gradient(to_left,#FBF6EF,transparent_70%)] rtl:bg-[linear-gradient(to_right,#FBF6EF,transparent_70%)]" : "bg-[linear-gradient(to_right,#FBF6EF,transparent_70%)] rtl:bg-[linear-gradient(to_left,#FBF6EF,transparent_70%)]"}`} />
        </div>
      ))}
    </>
  );
}
