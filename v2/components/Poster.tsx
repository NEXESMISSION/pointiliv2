"use client";

import { useEffect, useRef, useState } from "react";
import { Printer } from "lucide-react";
import { Pass, type PassShop } from "@/components/Pass";
import { ShopMark } from "@/components/ShopMark";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";

/**
 * The counter's poster: an A5 page in the shop's colour that says, for the
 * owner, what the card is — «عندنا كارط الفيدليتي», the card itself, three
 * steps — so a customer asks for the code before the owner has to explain.
 * No code on it: the code is the one on the owner's phone, a new one every
 * scan. It is drawn at the A5 page's own size (148 × 210 mm) and, on the
 * screen, scaled down whole to the room there is — what the owner sees is
 * what the paper gets; printed, it fills the page.
 */
/** the A5 page in CSS pixels (96 per inch): 148 × 210 mm */
const PAGE_W = (148 / 25.4) * 96;
const PAGE_H = (210 / 25.4) * 96;

export function Poster({ shop }: { shop: PassShop & { logo?: string | null } }) {
  useScreen("poster");
  // the room on the screen, and the page scaled into it
  const box = useRef<HTMLDivElement>(null);
  const [scale, setScale] = useState(0.5);
  useEffect(() => {
    const el = box.current;
    if (!el) return;
    const fit = () => setScale(Math.min(el.clientWidth / PAGE_W, el.clientHeight / PAGE_H));
    fit();
    const ro = new ResizeObserver(fit);
    ro.observe(el);
    return () => ro.disconnect();
  }, []);
  const goal = shop.goal ?? 10;
  // a store or a wheel shop has no one gift at the end: the last step says what a tampon is for
  const steps = [t.posterStep1, t.posterStep2, shop.store || shop.wheel || !shop.gift ? t.posterStep3Other : fill(t.posterStep3, { n: goal, gift: shop.gift })];
  return (
    <>
      <style>{`
        .poster { container-type: inline-size; print-color-adjust: exact; -webkit-print-color-adjust: exact; }
        @page { size: A5 portrait; margin: 0; }
        @media print {
          body * { visibility: hidden; }
          .poster, .poster * { visibility: visible; }
          /* on paper: the page itself, unscaled, from the sheet's corner (no moved box around it to drag it along) */
          .poster-wrap { position: static !important; translate: none !important; }
          .poster { position: fixed; inset: 0; transform: none !important; border-radius: 0 !important; box-shadow: none !important; margin: 0 !important; }
        }
      `}</style>
      <div ref={box} className="relative min-h-0 flex-1">
      <div className="poster-wrap absolute start-1/2 top-0" style={{ width: PAGE_W * scale, height: PAGE_H * scale, translate: "50% 0" }}>
      <div
        className="poster relative flex flex-col overflow-hidden rounded-[2rem] bg-white text-ink shadow-card"
        style={{ width: "148mm", height: "210mm", transform: `scale(${scale})`, transformOrigin: "top right" }}
        dir="rtl"
        lang="ar"
      >
        {/* the shop: its colour, its logo, its name */}
        <div className="flex flex-col items-center px-[6cqw] pb-[5cqw] pt-[7cqw] text-center text-white" style={{ background: `linear-gradient(160deg, color-mix(in oklab, ${shop.color} 75%, white) -10%, ${shop.color} 50%, color-mix(in oklab, ${shop.color} 70%, black) 120%)` }}>
          <span className="grid size-[16cqw] place-items-center overflow-hidden rounded-[4cqw] bg-white/95">
            <ShopMark shop={shop} size={48} />
          </span>
          <p className="mt-[2.5cqw] text-[5.5cqw] font-bold leading-tight" dir="auto">
            {shop.name}
          </p>
          <h1 className="mt-[1.5cqw] text-[9cqw] font-bold leading-[1.15]">{t.posterTitle}</h1>
        </div>

        {/* the card, as the customer gets it */}
        <div className="-mt-[2cqw] px-[9cqw]">
          <Pass shop={shop} stamps={Math.max(1, Math.round(goal * 0.6))} />
        </div>

        {/* three steps */}
        <ol className="mt-[5cqw] space-y-[3cqw] px-[9cqw]">
          {steps.map((s, i) => (
            <li key={s} className="flex items-center gap-[3cqw]">
              <span className="num grid size-[8cqw] shrink-0 place-items-center rounded-full text-[4.5cqw] font-bold text-white" style={{ background: shop.color }}>
                {i + 1}
              </span>
              <span className="text-[4.6cqw] font-bold leading-snug">{s}</span>
            </li>
          ))}
        </ol>

        <p className="mt-auto pb-[5cqw] text-center text-[3.2cqw] font-semibold text-muted" dir="ltr">
          Pointili · {t.posterFoot}
        </p>
      </div>
      </div>
      </div>

      <div className="mt-[2dvh] shrink-0 pb-3">
        <Btn
          type="button"
          onClick={() => {
            signal("poster", "print");
            window.print();
          }}
        >
          <Printer className="size-5" /> {t.posterPrint}
        </Btn>
        <p className="mt-1.5 text-center text-[0.8125rem] text-muted">{t.posterHint}</p>
      </div>
    </>
  );
}
