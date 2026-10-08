"use client";

import { t } from "@/lib/t";

export type Item = { id: number; name: string };

/**
 * The question before the code.
 *
 * A shop that says what it sells is asked, every single time, what this one
 * is for. It is asked FIRST: there is no code on the screen yet to scan by
 * mistake, and the server will not make one without an answer either. So the
 * owner cannot forget to change it, and nothing is ever written down against
 * the wrong thing.
 *
 * One tap, on a target big enough for a thumb at a busy counter. Nothing to
 * read; a usual list sits in the middle, a long one (up to 20) scrolls inside
 * its own box, two to a row, the question always above it. (The screen's name
 * for the traffic is the counter's to give, not this one's.)
 */
export function PickItem({ items, onPick }: { items: Item[]; onPick: (item: Item) => void }) {
  const two = items.length > 5;
  return (
    // safe centring: in the middle while it fits, from the top once it does not (never cut above)
    <div className="flex min-h-0 w-full flex-1 flex-col px-5 py-6 [justify-content:safe_center]">
      <p className="shrink-0 text-center text-[1.375rem] font-bold leading-tight">{t.pickAsk}</p>
      <p className="mt-1.5 shrink-0 text-center text-[0.9375rem] text-muted">{t.pickHint}</p>

      <div data-list className="mx-auto mt-5 min-h-0 w-full max-w-sm overflow-y-auto overscroll-contain rounded-[1.25rem]">
        {/* a little air inside the box, so the edges' rings are not cut */}
        <div className={`grid gap-2.5 p-0.5 ${two ? "grid-cols-2" : ""}`}>
          {items.map((it) => (
            <button
              key={it.id}
              type="button"
              onClick={() => onPick(it)}
              className="press flex min-h-[3.75rem] items-center justify-center break-words rounded-[1.25rem] bg-surface px-4 py-2 text-center text-[1.125rem] font-bold leading-snug text-ink shadow-[0_1px_0_0_rgb(0_0_0/0.04)] ring-1 ring-line transition-colors active:bg-canvas"
            >
              {it.name}
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
