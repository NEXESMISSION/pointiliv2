"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import { ChevronDown, Search, X } from "lucide-react";
import { Icon3D, boxLook } from "@/components/ui";
import { KIND_GROUPS, kindIcon, kindMatches, t } from "@/lib/t";

/** One kind of shop: its picture and its name, lit when chosen. */
export function KindTile({ id, on, onPick, lazy }: { id: string; on: boolean; onPick: (id: string) => void; lazy?: boolean }) {
  return (
    <button
      type="button"
      onClick={() => onPick(id)}
      aria-pressed={on}
      className={`press flex flex-col items-center gap-1 rounded-[1.125rem] px-1 py-3 text-[0.8125rem] font-semibold leading-tight ${on ? "bg-brand-soft text-brand shadow-[inset_0_0_0_2px_var(--color-brand)]" : "bg-surface text-body shadow-card"}`}
    >
      <Icon3D name={kindIcon(id)} size={32} lazy={lazy} />
      <span className="line-clamp-2 text-center">{t.kinds[id]}</span>
    </button>
  );
}

/**
 * What the shop sells, as one field: the kind chosen (its picture and its
 * name) or the question, and a tap opens every kind (KindPicker). One look,
 * one tap — not a row of chips sliding sideways.
 */
export function KindField({ value, onPick, error, compact }: { value: string; onPick: (id: string) => void; error?: string | null; compact?: boolean }) {
  const [open, setOpen] = useState(false);
  const close = useCallback(() => setOpen(false), []);
  return (
    <div>
      <button
        type="button"
        onClick={() => setOpen(true)}
        aria-haspopup="dialog"
        className={`press flex w-full items-center gap-3 px-3 text-start ${compact ? "h-[3.25rem] [@media(max-height:520px)]:h-[2.875rem]" : "h-[3.5rem]"} ${boxLook} ${error ? "shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-coral)]" : ""}`}
      >
        {value ? (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-brand-soft">
              <Icon3D name={kindIcon(value)} size={24} />
            </span>
            <span className="min-w-0 flex-1 truncate text-[1.0625rem] font-bold text-ink">{t.kinds[value]}</span>
            <span className="shrink-0 text-[0.8125rem] font-semibold text-brand">{t.kindChange}</span>
          </>
        ) : (
          <>
            <span className="grid size-9 shrink-0 place-items-center rounded-[0.75rem] bg-canvas">
              <Search className="size-[1.125rem] text-faint" />
            </span>
            <span className="min-w-0 flex-1 truncate text-[0.9375rem] text-faint">{t.kindPick}</span>
            <ChevronDown className="size-5 shrink-0 text-faint" />
          </>
        )}
      </button>
      {error && <span className="mt-1.5 block px-1 text-[0.8125rem] font-medium text-coral">{error}</span>}
      {open && (
        <KindPicker
          value={value}
          onPick={(id) => {
            onPick(id);
            setOpen(false);
          }}
          onClose={close}
        />
      )}
    </div>
  );
}

/**
 * Every kind of shop, in eight groups, over the whole screen — with a search
 * that knows the French names too (parfum, friperie, pressing…). One tap
 * chooses and closes.
 */
export function KindPicker({ value, onPick, onClose }: { value: string; onPick: (id: string) => void; onClose: () => void }) {
  const [q, setQ] = useState("");
  const list = useRef<HTMLDivElement>(null);
  // a group's chip brings its kinds to the top of the list
  const jump = (id: string) => {
    const el = list.current?.querySelector<HTMLElement>(`[data-group="${id}"]`);
    if (el && list.current) list.current.scrollTo({ top: el.offsetTop - 4, behavior: "smooth" });
  };
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
          <h2 className="text-[1.5rem] font-bold leading-tight">{t.kindsTitle}</h2>
          <button type="button" onClick={onClose} className="press grid size-11 shrink-0 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
            <X className="size-5" />
          </button>
        </div>
        <label className="relative mt-3 block">
          <Search className="pointer-events-none absolute start-4 top-1/2 size-[1.125rem] -translate-y-1/2 text-faint" />
          <input
            type="search"
            value={q}
            onChange={(e) => setQ(e.target.value)}
            placeholder={t.kindsSearch}
            aria-label={t.kindsSearch}
            className={`h-12 w-full ps-11 pe-4 text-[16px] outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)] ${boxLook}`}
          />
        </label>
        {/* the eight groups, one tap from their kinds (while nothing is searched) */}
        {!q.trim() && (
          <div data-list className="-mx-5 mt-2.5 flex gap-1.5 overflow-x-auto px-5 pb-0.5 [scrollbar-width:none]">
            {KIND_GROUPS.map((g) => (
              <button key={g.id} type="button" onClick={() => jump(g.id)} className="press h-9 shrink-0 rounded-full bg-surface px-3.5 text-[0.8125rem] font-bold text-body shadow-card">
                {g.label}
              </button>
            ))}
          </div>
        )}
      </div>
      {/* the one list that scrolls: every kind, in its groups */}
      <div ref={list} data-list className="relative min-h-0 flex-1 overflow-y-auto overscroll-contain">
        <div className="safe-b mx-auto w-full max-w-md px-5 pb-10">
          {groups.length === 0 && (
            <div className="mt-6 text-center">
              <p className="text-[0.9375rem] text-muted">{t.kindsNone}</p>
              <div className="mx-auto mt-3 w-24">
                <KindTile id="other" on={value === "other"} onPick={onPick} />
              </div>
            </div>
          )}
          {groups.map((g) => (
            <section key={g.id} data-group={g.id} className="mt-3">
              <h3 className="mb-2 px-1 text-[0.8125rem] font-bold text-muted">{g.label}</h3>
              <div className="grid grid-cols-4 gap-2">
                {g.kinds.map((id) => (
                  <KindTile key={id} id={id} on={value === id} onPick={onPick} lazy />
                ))}
              </div>
            </section>
          ))}
        </div>
      </div>
    </div>
  );
}
