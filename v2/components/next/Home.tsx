"use client";

import Link from "next/link";
import { useState } from "react";
import { QrCode, ScanLine, X } from "lucide-react";
import { Go } from "@/components/next/Go";
import { Live } from "@/components/next/Live";
import { ShopMark } from "@/components/ShopMark";
import { Mark } from "@/components/Tracker";
import { t } from "@/lib/t";
import type { CardView } from "@/lib/types";

/*
 * The customer's home, built again (the founder, 18 Oct 2026).
 *
 * THE ONE RULE THE FIRST TRY BROKE: a person has ONE code, not one per shop.
 * Drawing it inside every card stacked the same QR as many times as the person
 * had cards — «the client can have multiple qr stacked for the same owner».
 * The code is one thing, in one place, reached the same way from anywhere; a
 * card says how far the gift is and nothing else.
 *
 * Three looks of that same screen are drawn here, to be chosen between rather
 * than argued about: /next?look=a|b|c. They differ in the eye, not the model.
 */

export type Look = "a" | "b" | "c";

export function NextHome({ me, name, code, svg, cards, look = "a" }: { me: string; name: string; code: string | null; svg: string | null; cards: CardView[]; look?: Look }) {
  const [codeOpen, setCodeOpen] = useState(false);
  const [pick, setPick] = useState(0);
  const first = (name.split(" ")[0] ?? "").trim();
  const ready = (c: CardView) => c.ready || (c.waiting_n ?? 0) > 0;
  const line = (c: CardView) => {
    const goal = c.shop.goal ?? 10;
    const left = Math.max(goal - c.stamps, 0);
    return ready(c) ? "الكادو متاعك حاضر" : `مازالولك ${left} على ${c.shop.gift ?? ""}`;
  };

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col px-[clamp(1rem,5vw,1.5rem)]">
      <Mark screen={`next-home-${look}`} />
      {/* the tampon lands here by itself: no pull to refresh */}
      <Live me={me} />

      <header className="flex shrink-0 items-center justify-between pt-2">
        <Link href="/me" aria-label={t.account} className="press grid size-11 place-items-center rounded-full bg-surface text-[1.0625rem] font-bold text-ink shadow-card">
          {(first[0] ?? "؟").toUpperCase()}
        </Link>
        <span className="text-[0.9375rem] font-bold text-muted">{first ? `أهلا ${first}` : "أهلا"}</span>
      </header>

      {cards.length === 0 ? (
        <p className="my-auto text-balance px-6 text-center text-[0.9375rem] leading-relaxed text-muted">
          مازال ما عندك كارط. سكاني الكود اللي عند الكاسة في أي محل يخدم بـ Pointili، والكارط تتعمل وحدها.
        </p>
      ) : look === "b" ? (
        <Quiet cards={cards} line={line} ready={ready} />
      ) : look === "c" ? (
        <One cards={cards} pick={pick} setPick={setPick} line={line} ready={ready} />
      ) : (
        <Blocks cards={cards} line={line} ready={ready} />
      )}

      {/* the two things a customer ever does, side by side and never moving */}
      <div className="grid shrink-0 grid-cols-2 gap-2 pb-[2dvh] pt-[1.5dvh]">
        <button
          type="button"
          onClick={() => setCodeOpen(true)}
          className="press flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-surface text-[1rem] font-bold text-ink shadow-card"
        >
          <QrCode className="size-5" /> الكود متاعي
        </button>
        <Go href="/scan" icon={<ScanLine className="size-5" />} className="flex h-[3.5rem] items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(108_71_255/0.9)]">
          سكاني
        </Go>
      </div>

      {/* the code: one screen, white, nothing drawn around it — a counter's camera reads it at arm's length */}
      {codeOpen && (
        <div className="safe-t safe-b fixed inset-0 z-50 flex animate-fade flex-col bg-white px-5 text-center" role="dialog" aria-modal="true">
          <div className="flex shrink-0 justify-end pt-2">
            <button type="button" onClick={() => setCodeOpen(false)} aria-label={t.closeIt} className="press grid size-11 place-items-center rounded-full bg-canvas">
              <X className="size-5" />
            </button>
          </div>
          <div className="flex min-h-0 flex-1 animate-rise flex-col items-center justify-center pb-[4dvh]">
            {svg && code ? (
              <>
                <span className="block w-[min(78vw,46dvh)]" dangerouslySetInnerHTML={{ __html: svg }} />
                <span className="num mt-4 block text-[1.5rem] font-bold tracking-[0.2em] text-ink">{code}</span>
                <span className="mt-1 block text-[0.9375rem] text-muted">ورّي الكود للكاسة</span>
              </>
            ) : (
              <span className="text-[0.9375rem] text-muted">الكود مازال ما تعملش</span>
            )}
          </div>
        </div>
      )}
    </main>
  );
}

type Bits = { cards: CardView[]; line: (c: CardView) => string; ready: (c: CardView) => boolean };

/** A — the shop's own colour, a block each: the card you are looking for is found by its colour. */
function Blocks({ cards, line, ready }: Bits) {
  return (
    <div data-list className="mt-[2dvh] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2">
      {cards.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-[1.5rem] px-3.5 py-3 text-white shadow-card" style={{ background: ready(c) ? "var(--color-coral)" : c.shop.color }}>
          <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.875rem] bg-white/15">
            <ShopMark shop={c.shop} size={26} />
          </span>
          <span className="min-w-0 flex-1">
            <span className="block truncate text-[1.0625rem] font-bold">{c.shop.name}</span>
            <span className="block truncate text-[0.8125rem] text-white/85">{line(c)}</span>
          </span>
          <span className="num shrink-0 text-[1.25rem] font-bold tabular-nums">
            {c.stamps}
            <span className="text-[0.875rem] opacity-70">/{c.shop.goal ?? 10}</span>
          </span>
        </div>
      ))}
    </div>
  );
}

/** B — paper: white rows, the shop's colour only as a thread, the number doing the talking. */
function Quiet({ cards, line, ready }: Bits) {
  return (
    // the scroller takes the room; the paper inside it hugs its rows, since a panel
    // stretched to the whole screen is mostly empty paper
    <div data-list className="mt-[2dvh] min-h-0 flex-1 overflow-y-auto overscroll-contain">
      <div className="divide-y divide-line rounded-[1.25rem] bg-surface shadow-card">
      {cards.map((c) => {
        const goal = c.shop.goal ?? 10;
        return (
          <div key={c.id} className="flex items-center gap-3 px-4 py-3.5">
            <span className="h-10 w-1 shrink-0 rounded-full" style={{ background: ready(c) ? "var(--color-coral)" : c.shop.color }} aria-hidden />
            <span className="min-w-0 flex-1">
              <span className="block truncate text-[1rem] font-bold text-ink">{c.shop.name}</span>
              <span className={`block truncate text-[0.8125rem] ${ready(c) ? "font-bold text-coral" : "text-muted"}`}>{line(c)}</span>
            </span>
            <span className="num shrink-0 text-[1.125rem] font-bold tabular-nums text-ink">
              {c.stamps}
              <span className="text-[0.8125rem] text-faint">/{goal}</span>
            </span>
          </div>
        );
      })}
      </div>
    </div>
  );
}

/** C — one card, whole: the nearest gift fills the screen, the others are chips under it. */
function One({ cards, pick, setPick, line, ready }: Bits & { pick: number; setPick: (n: number) => void }) {
  const c = cards[Math.min(pick, cards.length - 1)]!;
  const goal = c.shop.goal ?? 10;
  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center">
      <div className="mx-auto w-full rounded-[1.75rem] p-5 text-white shadow-card" style={{ background: ready(c) ? "var(--color-coral)" : c.shop.color }}>
        <div className="flex items-center gap-3">
          <span className="grid size-12 shrink-0 place-items-center overflow-hidden rounded-[1rem] bg-white/15">
            <ShopMark shop={c.shop} size={30} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[1.25rem] font-bold">{c.shop.name}</span>
        </div>
        {/* the dots: the card as a card, read in one look */}
        <div className="mt-5 flex flex-wrap gap-1.5">
          {Array.from({ length: goal }, (_, i) => (
            <span key={i} className={`size-[1.375rem] rounded-full ${i < c.stamps ? "bg-white" : "bg-white/25"}`} aria-hidden />
          ))}
        </div>
        <p className="mt-4 text-[1rem] font-bold">{line(c)}</p>
      </div>
      {cards.length > 1 && (
        <div className="mt-3 flex flex-wrap justify-center gap-1.5">
          {cards.map((x, i) => (
            <button
              key={x.id}
              type="button"
              onClick={() => setPick(i)}
              aria-current={i === pick}
              className={`press size-9 overflow-hidden rounded-full ring-2 ${i === pick ? "ring-ink" : "ring-transparent opacity-60"}`}
              style={{ background: ready(x) ? "var(--color-coral)" : x.shop.color }}
              aria-label={x.shop.name}
            >
              <ShopMark shop={x.shop} size={22} />
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
