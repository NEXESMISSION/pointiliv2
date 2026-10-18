"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { QrCode, ScanLine, X } from "lucide-react";
import { Go } from "@/components/next/Go";
import { Live } from "@/components/next/Live";
import { ShopMark } from "@/components/ShopMark";
import { Mark } from "@/components/Tracker";
import { t } from "@/lib/t";
import { nextTampon } from "@/lib/when";
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
 * Three looks were drawn and the founder chose this one (18 Oct 2026): the
 * shop's own colour, a block each — «tal9a elli t7eb 3la 7sab el loun», you
 * find the card you want by its colour before you have read a word. The quiet
 * paper and the one-big-card are gone rather than kept as options; a screen
 * with three moods is a screen nobody designed.
 */

export function NextHome({ me, name, code, svg, cards }: { me: string; name: string; code: string | null; svg: string | null; cards: CardView[] }) {
  const [codeOpen, setCodeOpen] = useState(false);
  const first = (name.split(" ")[0] ?? "").trim();
  const ready = (c: CardView) => c.ready || (c.waiting_n ?? 0) > 0;
  // the clock is read after mounting, never while the server renders: a time
  // drawn on both sides never agrees, and it has to keep itself anyway
  const [now, setNow] = useState<number | null>(null);
  useEffect(() => {
    setNow(Date.now());
    const beat = setInterval(() => setNow(Date.now()), 30_000);
    return () => clearInterval(beat);
  }, []);

  /**
   * What this card has to say, in the order it matters: a shop that is stopped
   * says so (the app looked broken when it was the shop that stopped); then a
   * gift waiting; then, when another tampon cannot land yet, WHEN it can —
   * the wait between two tampons used to be met only as a refusal after
   * scanning (the founder, 18 Oct 2026).
   */
  const line = (c: CardView) => {
    if (c.shop.paused) return "المحل موقّف توّا";
    if (ready(c)) return "الكادو متاعك حاضر";
    const gap = c.shop.gap ?? 0;
    if (now && gap > 0 && c.last_at) {
      const next = new Date(c.last_at).getTime() + gap * 60_000;
      if (next > now) return `تامبون جديد ${nextTampon(new Date(next).toISOString())}`;
    }
    const left = Math.max((c.shop.goal ?? 10) - c.stamps, 0);
    return `مازالولك ${left} على ${c.shop.gift ?? ""}`;
  };

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col px-[clamp(1rem,5vw,1.5rem)]">
      <Mark screen="next-home" />
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

/** a card's colour: a stopped shop goes grey (nothing will land on it), a gift is coral, else the shop's own */
const tone = (c: CardView, ready: boolean) => (c.shop.paused ? "var(--color-faint)" : ready ? "var(--color-coral)" : c.shop.color);

/** A — the shop's own colour, a block each: the card you are looking for is found by its colour. */
function Blocks({ cards, line, ready }: Bits) {
  return (
    <div data-list className="mt-[2dvh] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2">
      {cards.map((c) => (
        <div key={c.id} className="flex items-center gap-3 rounded-[1.5rem] px-3.5 py-3 text-white shadow-card" style={{ background: tone(c, ready(c)) }}>
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


