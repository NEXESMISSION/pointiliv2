"use client";

import { useEffect, useState } from "react";
import { Search, X } from "lucide-react";
import { Icon3D, boxLook } from "@/components/ui";
import { KIND_GROUPS, kindIcon, kindMatches, t } from "@/lib/t";

/** One kind of shop: its picture and its name, lit when chosen. */
export function KindTile({ id, on, onPick }: { id: string; on: boolean; onPick: (id: string) => void }) {
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      aria-pressed={on}
      className={`press flex flex-col items-center gap-1 rounded-[18px] px-1 py-3 text-[12.5px] font-semibold leading-tight ${on ? "bg-brand-soft text-brand shadow-[inset_0_0_0_2px_var(--color-brand)]" : "bg-surface text-body shadow-card"}`}
    >
      <Icon3D name={kindIcon(id)} size={32} />
      <span className="line-clamp-2 text-center">{t.kinds[id]}</span>
    </button>
  );
}

/**
 * Every kind of shop, in five groups, over the whole screen — with a search
 * that knows the French names too (parfum, friperie, pressing…). One tap
 * chooses and closes.
 */
export function KindPicker({ value, onPick, onClose }: { value: string; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const groups = KIND_GROUPS.map((g) => ({ ...g, kinds: q.trim() ? g.kinds.filter((id) => kindMatches(id, q)) : g.kinds })).filter((g) => g.kinds.length > 0);

  useEffect(() => {
    const before = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    const esc = (e: KeyboardEvent) => e.key === "Escape" && onClose();
    window.addEventListener("keydown", esc);
    return () => {
      document.body.style.overflow = before;
      window.removeEventListener("keydown", esc);
    };
  }, [onClose]);

  return (
    <div className="fixed inset-0 z-50 flex animate-fade flex-col bg-canvas" role="dialog" aria-modal="true" aria-label={t.kindsTitle}>
      <div className="safe-t mx-auto w-full max-w-md px-5 pb-3">
        <div className="flex items-center justify-between gap-3 pt-3">
          <h2 className="text-[24px] font-bold leading-tight">{t.kindsTitle}</h2>
          <button type="button" onClick={onClose} className="press grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <X className="size-5" />
          </button>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-[18px] -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.kindsSearch}
            aria-label={t.kindsSearch}
            className={`h-12 w-full ps-11 pe-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
          />
        </label>
      </div>
      <div className="flex-1 overflow-y-auto overscroll-contain">
        <div className="safe-b mx-auto w-full max-w-md px-5 pb-10">
          {groups.length === 0 && (
            <div className="mt-6 text-center">
              <p className="text-[15px] text-muted">{t.kindsNone}</p>
              <div className="mx-auto mt-3 w-24">
                <KindTile id="other" on={value === "other"} onPick={onPick} />
              </div>
            </div>
          )}
          {groups.map((g) => (
            <section key={g.id} className="mt-3">
              <h3 className="mb-2 px-1 text-[14px] font-bold text-muted">{g.label}</h3>
              <div className="grid grid-cols-4 gap-2">
                {g.kinds.map((id) => (
                  <KindTile key={id} id={id} on={value === id} onPick={onPick} />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
