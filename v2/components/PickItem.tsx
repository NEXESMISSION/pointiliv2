"use client";

import { useScreen } from "@/components/Tracker";
import { t } from "@/lib/t";

export type Item = { id: number; name: string };

/**
 * The question before the code: which one is this.
 *
 * Asked first, with nothing on screen to scan yet, and the server will not
 * make a code without an answer either — so a tampon can never be written
 * down against the wrong thing.
 *
 * Laid out as a grid rather than a column: six things fit a short screen
 * without scrolling, which is what a counter needs. Two across unless the
 * list is long, and then three — so the names stay readable instead of the
 * boxes staying square.
 */
export function PickItem({ items, onPick }: { items: Item[]; onPick: (item: Item) => void }) {
  useScreen("counter-pick");
  const cols = items.length > 6 ? 3 : items.length > 1 ? 2 : 1;

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center px-4 py-4">
      <p className="text-center text-[1.25rem] font-bold leading-tight">{t.pickAsk}</p>
      <p className="mt-1 text-center text-[0.875rem] text-white/70">{t.pickHint}</p>

      <div className="mx-auto mt-4 grid w-full max-w-sm gap-1.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
        {items.map((it) => (
          <button
            key={it.id}
            type="button"
            onClick={() => onPick(it)}
            className="press flex min-h-[3.25rem] items-center justify-center rounded-[1rem] bg-white/95 px-2 text-center text-[1.0625rem] font-bold leading-tight text-ink shadow-[0_8px_20px_-10px_rgb(0_0_0/0.5)] active:bg-white"
          >
            <span className="line-clamp-2">{it.name}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
