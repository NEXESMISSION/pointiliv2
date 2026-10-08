"use client";

import { useScreen } from "@/components/Tracker";
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
 * read, nothing to scroll for a list of the usual size.
 */
export function PickItem({ items, onPick }: { items: Item[]; onPick: (item: Item) => void }) {
  useScreen("counter-pick");

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-5 py-6">
      <p className="text-center text-[1.375rem] font-bold leading-tight">{t.pickAsk}</p>
      <p className="mt-1.5 text-center text-[0.9375rem] text-muted">{t.pickHint}</p>

      <div className="mx-auto mt-5 grid w-full max-w-sm gap-2.5">
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onPick(it)}
            className="press flex min-h-[3.75rem] items-center justify-center rounded-[1.25rem] bg-surface px-4 text-[1.125rem] font-bold text-ink shadow-[0_1px_0_0_rgb(0_0_0/0.04)] ring-1 ring-line transition-colors active:bg-canvas"
          >
            {it.name}
          </button>
        ))}
      </div>
    </div>
  );
}
