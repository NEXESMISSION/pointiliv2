"use client";

import { useEffect, useRef, useState } from "react";
import { Check, Download, Info, Printer, Share2 } from "lucide-react";
import { useScreen } from "@/components/Tracker";
import { drawPoster, POSTER, type PosterArt, type PosterFormat, type PosterLook } from "@/lib/poster";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";

const FORMATS: { id: PosterFormat; label: string; sub: string }[] = [
  { id: "a4", label: "A4", sub: "للطباعة" },
  { id: "story", label: "ستوري", sub: "واتساب، إنستا" },
  { id: "square", label: "بوست", sub: "فيسبوك" },
];
const LOOKS: { id: PosterLook; label: string }[] = [
  { id: "brand", label: "Pointili" },
  { id: "shop", label: "لون المحل" },
  { id: "light", label: "أبيض" },
];

/** an image from this site (or a logo that allows it): null when it cannot be drawn on a canvas */
const load = (src: string, cross = false) =>
  new Promise<HTMLImageElement | null>((done) => {
    const img = new Image();
    if (cross) img.crossOrigin = "anonymous";
    img.onload = () => done(img);
    img.onerror = () => done(null);
    img.src = src;
  });

/**
 * «كود التسجيل» as a poster (13 Nov 2026): the poster itself in the middle of the screen, as it will be
 * printed or posted — its size (A4, a story, a square post) and its look (Pointili's purple, the shop's
 * colour, white) one tap each — then download it, send it, or print it. Under it, how many customers it
 * brought, and the one thing to know: this code makes an account and the card, never a tampon.
 */
export function PosterStudio({
  shop,
  link,
  offer,
  steps,
  joined,
  week,
}: {
  shop: { name: string; color: string; logo: string | null; icon: string };
  link: string;
  offer: string;
  steps: string[];
  joined: number;
  week: number;
}) {
  useScreen("join");
  const canvas = useRef<HTMLCanvasElement>(null);
  const [format, setFormat] = useState<PosterFormat>("a4");
  const [look, setLook] = useState<PosterLook>("brand");
  const [art, setArt] = useState<PosterArt | null>(null);
  const [said, setSaid] = useState<string | null>(null);

  // once: the page's font, the shop's face, Pointili's mark, the gift's picture
  useEffect(() => {
    let alive = true;
    (async () => {
      const font = getComputedStyle(document.body).fontFamily || "sans-serif";
      await Promise.all([400, 500, 600, 700].map((wt) => document.fonts.load(`${wt} 48px ${font}`, "كارط Pointili 123").catch(() => [])));
      const kind = `/3d/${shop.icon}.webp`;
      const [logo, mark, gift] = await Promise.all([shop.logo ? load(shop.logo, true) : Promise.resolve(null), load("/brand-mark.svg"), load("/3d/gift.webp")]);
      const face = logo ?? (await load(kind));
      if (!alive) return;
      setArt({
        name: shop.name,
        color: shop.color,
        face,
        logo: !!logo,
        mark,
        gift,
        head: "كارط الفيدليتي متاعنا، في تليفونك",
        offer,
        steps,
        scan: "سكاني بكاميرا التليفون",
        foot: "بلا أبليكاسيون · في دقيقة",
        link,
        font,
      });
    })();
    return () => {
      alive = false;
    };
  }, [shop, link, offer, steps]);

  useEffect(() => {
    if (art && canvas.current) drawPoster(canvas.current, format, look, art);
  }, [art, format, look]);

  const blob = () => new Promise<Blob | null>((done) => (canvas.current ? canvas.current.toBlob(done, "image/png") : done(null)));
  const fileName = `pointili-${format}.png`;

  const download = async () => {
    const b = await blob();
    if (!b) return;
    const a = document.createElement("a");
    a.href = URL.createObjectURL(b);
    a.download = fileName;
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 4000);
    signal("poster_download", `${format}·${look}`);
    setSaid("تحمّلت ✓");
  };
  const share = async () => {
    const b = await blob();
    const file = b ? new File([b], fileName, { type: "image/png" }) : null;
    try {
      if (file && navigator.canShare?.({ files: [file] })) {
        await navigator.share({ files: [file], title: shop.name });
        signal("poster_share", format);
        return;
      }
    } catch {
      return; // closed by the person: nothing to say
    }
    // no sharing of pictures here (a computer): the link, copied
    await navigator.clipboard?.writeText(link).catch(() => {});
    signal("join_copy");
    setSaid("الرابط تنسخ ✓");
  };
  const print = () => {
    const c = canvas.current;
    if (!c) return;
    const url = c.toDataURL("image/png");
    const f = document.createElement("iframe");
    f.setAttribute("aria-hidden", "true");
    f.style.cssText = "position:fixed;right:0;bottom:0;width:0;height:0;border:0";
    document.body.appendChild(f);
    const d = f.contentDocument;
    if (!d) return;
    d.open();
    d.write(
      `<!doctype html><html><head><meta charset="utf-8"><style>@page{size:${format === "a4" ? "A4 portrait" : "auto"};margin:0}html,body{margin:0;height:100%}img{display:block;width:100%;height:100%;object-fit:contain}</style></head><body><img src="${url}"></body></html>`,
    );
    d.close();
    const img = d.querySelector("img");
    const go = () => {
      f.contentWindow?.focus();
      f.contentWindow?.print();
      setTimeout(() => f.remove(), 60_000);
    };
    if (img && !img.complete) img.onload = go;
    else go();
    signal("join_print", format);
  };

  const { w, h } = POSTER[format];
  return (
    <div className="flex min-h-0 flex-1 flex-col pb-3">
      {/* the poster, as it will be */}
      <div className="relative mt-[1.6dvh] min-h-[12rem] flex-1">
        <canvas
          ref={canvas}
          width={w}
          height={h}
          role="img"
          aria-label={`${shop.name} · ${offer}`}
          data-drawn={art ? "1" : undefined}
          className={`absolute inset-0 m-auto max-h-full max-w-full rounded-[0.875rem] bg-surface shadow-[0_18px_40px_-18px_rgb(20_16_40/0.45)] ring-1 ring-black/5 transition-opacity duration-300 ${art ? "opacity-100" : "opacity-0"}`}
        />
        {!art && <span className="absolute inset-0 m-auto size-10 animate-spin rounded-full border-4 border-line border-t-brand" aria-hidden />}
      </div>

      {/* its size, and its look */}
      <div className="mt-[1.6dvh] grid shrink-0 grid-cols-3 gap-1 rounded-[1rem] bg-surface p-1 shadow-card" role="radiogroup" aria-label="القياس">
        {FORMATS.map((f) => (
          <button
            key={f.id}
            type="button"
            role="radio"
            aria-checked={format === f.id}
            onClick={() => {
              setFormat(f.id);
              setSaid(null);
            }}
            className={`press flex flex-col items-center rounded-[0.75rem] py-1.5 transition-colors ${format === f.id ? "bg-ink text-white" : "text-body"}`}
          >
            <b className="text-[0.9375rem] leading-tight">{f.label}</b>
            <span className={`text-[0.6875rem] ${format === f.id ? "text-white/70" : "text-muted"}`}>{f.sub}</span>
          </button>
        ))}
      </div>
      <div className="mt-2 flex shrink-0 items-center justify-center gap-2" role="radiogroup" aria-label="اللون">
        {LOOKS.map((l) => (
          <button
            key={l.id}
            type="button"
            role="radio"
            aria-checked={look === l.id}
            onClick={() => {
              setLook(l.id);
              setSaid(null);
            }}
            className={`press flex h-9 items-center gap-1.5 rounded-full ps-1.5 pe-3 text-[0.8125rem] font-bold transition-colors ${look === l.id ? "bg-surface text-ink shadow-card ring-2 ring-brand" : "text-muted"}`}
          >
            <span
              className="size-6 rounded-full ring-1 ring-black/10"
              style={{ background: l.id === "brand" ? "linear-gradient(150deg,#8d70ff,#4220cc)" : l.id === "shop" ? shop.color : "#ffffff" }}
              aria-hidden
            />
            {l.label}
          </button>
        ))}
      </div>

      {/* what to do with it */}
      <div className="mt-[1.4dvh] grid shrink-0 grid-cols-[1fr_auto_auto] gap-2">
        <button type="button" disabled={!art} onClick={() => void download()} className="press flex h-[3.25rem] items-center justify-center gap-2 rounded-[1.125rem] bg-brand text-[1rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(108_71_255/0.7)] disabled:opacity-50">
          {said ? <Check className="size-5" /> : <Download className="size-5" />} {said ?? "حمّل التصويرة"}
        </button>
        <button type="button" disabled={!art} onClick={() => void share()} aria-label="ابعث" className="press flex h-[3.25rem] flex-col items-center justify-center rounded-[1.125rem] bg-surface px-3.5 text-brand shadow-card disabled:opacity-50">
          <Share2 className="size-5" />
          <span className="text-[0.6875rem] font-bold">ابعث</span>
        </button>
        <button type="button" disabled={!art} onClick={print} aria-label="اطبع" className="press flex h-[3.25rem] flex-col items-center justify-center rounded-[1.125rem] bg-surface px-3.5 text-brand shadow-card disabled:opacity-50">
          <Printer className="size-5" />
          <span className="text-[0.6875rem] font-bold">اطبع</span>
        </button>
      </div>

      <p className="mt-[1.2dvh] flex shrink-0 items-center justify-center gap-1.5 text-center text-[0.75rem] text-muted">
        <span className="font-semibold text-body">{joined ? `${joined} عملو الكونت بيه` : "مازال حتى حريف عمل بيه الكونت"}</span>
        {week > 0 && <span className="font-semibold text-mint">· {fill(t.joinWeek, { n: week })}</span>}
        <span aria-hidden>·</span>
        <Info className="size-3.5 shrink-0" /> ما يعطيش تامبون
      </p>
    </div>
  );
}
