"use client";

import { useState } from "react";
import { Check, Copy, Info, Printer, UserPlus } from "lucide-react";
import { ShopMark } from "@/components/ShopMark";
import { useScreen } from "@/components/Tracker";
import type { Shop } from "@/lib/session";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";

/**
 * The shop's sign-up code as a little poster — its colour, its mark and name,
 * the code, one line that says what to do — the same on the screen and on
 * paper («اطبعو» prints the poster alone). Under it, how many customers it
 * brought, and the line that matters: this code never gives a tampon.
 */
export function JoinCode({ shop, svg, link, joined, week }: { shop: Shop; svg: string; link: string; joined: number; week: number }) {
  useScreen("join");
  const [copied, setCopied] = useState(false);
  const copy = async () => {
    await navigator.clipboard?.writeText(link).catch(() => {});
    signal("join_copy");
    setCopied(true);
    setTimeout(() => setCopied(false), 1800);
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col items-center pb-3">
      {/* the poster: what is printed */}
      <section className="mt-[2dvh] w-full max-w-[22rem] shrink-0 overflow-hidden rounded-[1.75rem] bg-surface shadow-card print:mt-0 print:max-w-none print:rounded-none print:shadow-none" aria-label={t.joinCodeTitle}>
        <div className="flex items-center gap-3 px-4 py-[clamp(0.6rem,1.6dvh,0.9rem)] text-white" style={{ background: shop.color }}>
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.875rem] bg-white/20">
            <ShopMark shop={shop} size={26} />
          </span>
          <bdi className="min-w-0 flex-1 truncate text-[1.125rem] font-bold">{shop.name}</bdi>
          <UserPlus className="size-5 shrink-0 opacity-90" />
        </div>
        <div className="flex flex-col items-center px-5 pb-[clamp(0.75rem,2dvh,1.25rem)] pt-[clamp(0.75rem,2dvh,1.25rem)]">
          <div className="aspect-square w-[min(62vw,29dvh,15rem)] print:w-[11cm] [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={t.joinPoster} />
          <p className="mt-[1.6dvh] text-balance text-center text-[1.1875rem] font-bold leading-snug">{t.joinPoster}</p>
          <p className="mt-0.5 text-[0.8125rem] font-semibold text-muted">{t.joinPosterSub}</p>
          <p className="mt-1 text-[0.75rem] font-semibold text-faint" dir="ltr">
            www.pointili.online
          </p>
        </div>
      </section>

      <p className="mt-[1.6dvh] shrink-0 text-center text-[0.875rem] font-semibold text-body print:hidden">
        {joined ? fill(t.joinCount, { n: joined }) : t.joinCountNone}
        {week > 0 && <span className="text-mint"> · {fill(t.joinWeek, { n: week })}</span>}
      </p>
      <p className="mt-[1.2dvh] flex w-full max-w-[22rem] shrink-0 items-start gap-2 rounded-[1rem] bg-[#fff4e0] px-3.5 py-2.5 text-[0.8125rem] font-semibold leading-snug text-[#b45309] print:hidden">
        <Info className="mt-0.5 size-4 shrink-0" /> {t.joinNoTampon}
      </p>

      <div className="mt-auto grid w-full max-w-[22rem] shrink-0 grid-cols-[1fr_auto] gap-2 pt-[1.6dvh] print:hidden">
        <button
          type="button"
          onClick={() => {
            signal("join_print");
            window.print();
          }}
          className="press flex h-[3.25rem] items-center justify-center gap-2 rounded-[1.125rem] bg-brand text-[1rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(108_71_255/0.7)]"
        >
          <Printer className="size-5" /> {t.joinPrint}
        </button>
        <button type="button" onClick={() => void copy()} className="press flex h-[3.25rem] items-center gap-1.5 rounded-[1.125rem] bg-surface px-4 text-[0.875rem] font-bold text-brand shadow-card">
          {copied ? <Check className="size-4" /> : <Copy className="size-4" />} {copied ? t.joinCopied : t.joinCopy}
        </button>
      </div>
    </div>
  );
}
