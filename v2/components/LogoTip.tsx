"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Icon3D } from "@/components/ui";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

type Spot = { top: number; left: number; width: number; height: number };

/**
 * Once per shop, on the owner's home: the «المحل» tile lit in the dark, and
 * a note under it — the logo lives there, and it can be put or changed any
 * time («نحطّو توّا» goes straight there when there is none yet).
 */
export function LogoTip({ shopId, logo }: { shopId: string; logo: string | null }) {
  const key = `pt_logo_tip:${shopId}`;
  const [open, setOpen] = useState(false);
  const [spot, setSpot] = useState<Spot | null>(null);

  useEffect(() => {
    let seen = false;
    try {
      seen = !!localStorage.getItem(key);
    } catch {
      seen = true;
    }
    if (seen) return;
    const find = () => {
      const r = document.getElementById("shop-tile")?.getBoundingClientRect();
      setSpot(r ? { top: r.top, left: r.left, width: r.width, height: r.height } : null);
    };
    const id = setTimeout(() => {
      find();
      setOpen(true);
      signal("logo_tip", logo ? "has" : "none");
    }, 700);
    addEventListener("resize", find);
    return () => {
      clearTimeout(id);
      removeEventListener("resize", find);
    };
  }, [key, logo]);

  const close = () => {
    try {
      localStorage.setItem(key, "1");
    } catch {
      /* private mode: it may show once more */
    }
    setOpen(false);
  };
  if (!open) return null;

  // the note goes under the tile, or over it when the screen is short
  const vh = typeof window === "undefined" ? 800 : innerHeight;
  const vw = typeof window === "undefined" ? 400 : innerWidth;
  const width = Math.min(448, vw - 32);
  const left = (vw - width) / 2;
  const below = !spot || vh - (spot.top + spot.height) > 250;
  const arrow = spot ? Math.min(width - 28, Math.max(12, spot.left + spot.width / 2 - left - 8)) : null;

  return (
    <div className="fixed inset-0 z-50 animate-fade" role="dialog" aria-modal="true" aria-label={logo ? t.logoTipTitle : t.logoTipTitleNone}>
      {spot ? (
        // the tile stays lit: everything around it goes dark
        <span
          className="pointer-events-none fixed rounded-[1.25rem] shadow-[0_0_0_4px_#fff,0_0_0_200vmax_rgb(20_16_40/0.6)]"
          style={{ top: spot.top - 5, left: spot.left - 5, width: spot.width + 10, height: spot.height + 10 }}
          aria-hidden
        />
      ) : (
        <span className="absolute inset-0 bg-[rgb(20_16_40/0.6)]" aria-hidden />
      )}
      {/* a tap anywhere around closes it too */}
      <button type="button" className="absolute inset-0 cursor-default" onClick={close} tabIndex={-1} aria-hidden />

      <div
        className="fixed rounded-[1.5rem] bg-surface p-4 text-ink shadow-[0_24px_60px_-20px_rgb(0_0_0/0.6)]"
        style={{
          width,
          left,
          ...(spot ? (below ? { top: spot.top + spot.height + 16 } : { bottom: vh - spot.top + 16 }) : { top: "28%" }),
          animation: "ct-in 420ms cubic-bezier(0.2,0.8,0.2,1) both",
        }}
      >
        <style>{`@keyframes ct-in { 0% { transform: translateY(14px); opacity: 0; } 100% { transform: none; opacity: 1; } }`}</style>
        {arrow != null && <span className={`absolute size-4 rotate-45 bg-surface ${below ? "-top-2" : "-bottom-2"}`} style={{ left: arrow }} aria-hidden />}
        <div className="flex items-center gap-3">
          {logo ? (
            // eslint-disable-next-line @next/next/no-img-element
            <img src={logo} alt="" className="size-12 shrink-0 rounded-[0.875rem] bg-white object-contain p-1 shadow-card" />
          ) : (
            <Icon3D name="camera" size={46} className="shrink-0" />
          )}
          <h2 className="text-[1.1875rem] font-bold leading-snug">{logo ? t.logoTipTitle : t.logoTipTitleNone}</h2>
        </div>
        <p className="mt-2 text-[0.9375rem] leading-relaxed text-body">{logo ? t.logoTipBody : t.logoTipBodyNone}</p>
        <div className="mt-3.5 flex gap-2">
          {logo ? (
            <button type="button" onClick={close} className="press h-11 flex-1 rounded-[0.875rem] bg-brand text-[0.9688rem] font-bold text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]">
              {t.logoTipOk}
            </button>
          ) : (
            <>
              <Link href="/shop/setup?edit=1" onClick={close} className="press grid h-11 flex-1 place-items-center rounded-[0.875rem] bg-brand text-[0.9688rem] font-bold text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]">
                {t.logoTipNow}
              </Link>
              <button type="button" onClick={close} className="press h-11 flex-1 rounded-[0.875rem] bg-ink/[0.06] text-[0.9688rem] font-bold text-body">
                {t.logoTipLater}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
