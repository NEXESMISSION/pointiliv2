"use client";

import Link from "next/link";
import { useState } from "react";
import { ScanLine } from "lucide-react";
import { ShopMark } from "@/components/ShopMark";
import { Mark } from "@/components/Tracker";
import { t } from "@/lib/t";
import type { CardView } from "@/lib/types";

/*
 * The customer's home, built again.
 *
 * What the old one made a person do, to show a code at a counter: open the
 * app, read a list, tap a card, wait for a page, tap the card again, wait for
 * a sheet. Five steps for the one thing they are standing there to do. A
 * quarter of every tap on the card page reached for something that was not
 * there, and those taps landed on the card itself — people were pressing it
 * expecting it to be the button. Here it is the button.
 *
 * One screen. The cards, and under them the camera. A tap opens a card where
 * it already is, with no page behind it to come back from: the code, big
 * enough for a counter to read over the counter, and the one line that says
 * how far the gift is. A second tap closes it.
 */
export function NextHome({ name, code, svg, cards }: { name: string; code: string | null; svg: string | null; cards: CardView[] }) {
  const [open, setOpen] = useState<string | null>(cards.length === 1 ? (cards[0]?.id ?? null) : null);
  const first = (name.split(" ")[0] ?? "").trim();

  return (
    <main className="safe-t safe-b mx-auto flex h-dvh w-full max-w-md flex-col px-[clamp(1rem,5vw,1.5rem)]">
      <Mark screen="next-home" />

      <header className="flex shrink-0 items-center justify-between pt-2">
        <Link href="/me" aria-label={t.account} className="press grid size-11 place-items-center rounded-full bg-surface text-[1.0625rem] font-bold text-ink shadow-card">
          {(first[0] ?? "؟").toUpperCase()}
        </Link>
        <span className="text-[0.9375rem] font-bold text-muted">{first ? `أهلا ${first}` : "أهلا"}</span>
      </header>

      {/* the cards: the only list, and every one of them opens where it is */}
      <div data-list className="mt-[2dvh] min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-2">
        {cards.length === 0 && (
          <p className="mt-[8dvh] text-balance px-6 text-center text-[0.9375rem] leading-relaxed text-muted">
            مازال ما عندك كارط. سكاني الكود اللي عند الكاسة في أي محل يخدم بـ Pointili، والكارط تتعمل وحدها.
          </p>
        )}
        {cards.map((c) => (
          <Card key={c.id} card={c} open={open === c.id} onTap={() => setOpen(open === c.id ? null : c.id)} svg={svg} code={code} />
        ))}
      </div>

      {/* the one thing to do, always in the same place under the thumb */}
      <div className="shrink-0 pb-[2dvh] pt-[1.5dvh]">
        <Link href="/scan" className="press flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-brand text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(108_71_255/0.9)]">
          <ScanLine className="size-5" /> سكاني الكود
        </Link>
      </div>
    </main>
  );
}

/**
 * One card. Closed, it says the shop, how far the gift is, and nothing else.
 * Open, the code fills it — white, nothing drawn around it, because a counter's
 * camera has to read it off a stranger's phone at arm's length.
 */
function Card({ card, open, onTap, svg, code }: { card: CardView; open: boolean; onTap: () => void; svg: string | null; code: string | null }) {
  const goal = card.shop.goal ?? 10;
  const left = Math.max(goal - card.stamps, 0);
  const ready = card.ready || (card.waiting_n ?? 0) > 0;

  return (
    <button
      type="button"
      onClick={onTap}
      aria-expanded={open}
      className="press block w-full overflow-hidden rounded-[1.5rem] text-start shadow-card"
      style={{ background: ready ? "var(--color-coral)" : card.shop.color }}
    >
      <span className="flex items-center gap-3 px-3.5 py-3 text-white">
        <span className="grid size-10 shrink-0 place-items-center overflow-hidden rounded-[0.875rem] bg-white/15">
          <ShopMark shop={card.shop} size={26} />
        </span>
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1.0625rem] font-bold">{card.shop.name}</span>
          <span className="block truncate text-[0.8125rem] text-white/85">
            {ready ? "الكادو متاعك حاضر · ورّي الكود" : `مازالولك ${left} على ${card.shop.gift ?? ""}`}
          </span>
        </span>
        {/* the number, read before the words */}
        <span className="num shrink-0 text-[1.25rem] font-bold tabular-nums">
          {card.stamps}
          <span className="text-[0.875rem] opacity-70">/{goal}</span>
        </span>
      </span>

      {/* open: the code itself, on white */}
      {open && (
        <span className="block animate-rise bg-white px-4 pb-4 pt-3.5 text-center">
          {svg && code ? (
            <>
              <span className="mx-auto block w-[min(62vw,34dvh)]" dangerouslySetInnerHTML={{ __html: svg }} />
              <span className="num mt-2 block text-[1.125rem] font-bold tracking-[0.2em] text-ink">{code}</span>
              <span className="mt-0.5 block text-[0.8125rem] text-muted">ورّي الكود للكاسة</span>
            </>
          ) : (
            <span className="block py-6 text-[0.9375rem] text-muted">الكود مازال ما تعملش</span>
          )}
        </span>
      )}
    </button>
  );
}
