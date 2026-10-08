"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronDown, SlidersHorizontal, X } from "lucide-react";

export type Menu = { key: string; name: string; value: string | null; items: { v: string; n: number | null; label: string }[] };

/** A Latin word in an Arabic line of a menu (a browser, an ad's name): sealed off, so its count stays beside it. */
const sealed = (s: string) => `⁨${s}⁩`;

/**
 * The traffic page's filters: one menu each (the phone's own picker on a
 * phone), and two days for a stretch of the founder's own. A choice is applied
 * at once, the other filters kept; each choice in a menu says how many visits
 * it would keep. On a phone the menus fold behind one button that says how
 * many filters are on.
 */
export function TrafficFilters({ menus, query, from, to }: { menus: Menu[]; query: Record<string, string>; from: string | null; to: string | null }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const on = menus.filter((m) => m.value).length + (from ? 1 : 0);

  const go = (set: Record<string, string | null>) => {
    const q = new URLSearchParams(query);
    for (const [k, v] of Object.entries(set)) {
      if (v) q.set(k, v);
      else q.delete(k);
    }
    // a new question: back to the list's start, out of any one visit
    q.delete("v");
    q.delete("n");
    const s = q.toString();
    start(() => router.push(`/admin/traffic${s ? `?${s}` : ""}`, { scroll: false }));
  };

  const box = "relative inline-flex h-9 shrink-0 items-center rounded-[0.625rem] border text-[0.8125rem] font-semibold transition-colors";

  return (
    <div className="mb-3" aria-busy={pending}>
      <button
        type="button"
        onClick={() => setOpen((o) => !o)}
        aria-expanded={open}
        className={`${box} gap-2 px-3 md:hidden ${on ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-body"}`}
      >
        <SlidersHorizontal className="size-4" />
        فلتر
        {on > 0 && <span className="grid size-5 place-items-center rounded-full bg-brand text-[0.6875rem] text-white">{on}</span>}
        <ChevronDown className={`size-4 opacity-60 transition-transform ${open ? "rotate-180" : ""}`} />
      </button>

      {/* two to a row on a phone, one long row that wraps on a desk */}
      <div className={`${open ? "grid" : "hidden"} mt-2 grid-cols-2 gap-2 md:mt-0 md:flex md:flex-wrap md:items-center ${pending ? "opacity-60" : ""}`}>
        {menus.map((m) => (
          <label key={m.key} className={`${box} min-w-0 ${m.value ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-body hover:border-brand"}`}>
            <span className="sr-only">{m.name}</span>
            <select
              value={m.value ?? ""}
              onChange={(e) => go({ [m.key]: e.target.value || null })}
              // 16px on a touch screen, or the phone zooms in on it
              className="h-full w-full min-w-0 cursor-pointer appearance-none truncate bg-transparent ps-3 pe-8 outline-none pointer-coarse:text-[16px] md:w-auto md:max-w-[15rem]"
            >
              <option value="">{`${m.name} · الكل`}</option>
              {m.items.map((x) => (
                <option key={x.v} value={x.v}>
                  {/* the chosen one, short: the menu is lit, and the chip under it says the rest */}
                  {x.v === m.value || x.n == null ? sealed(x.label) : `${sealed(x.label)} · ${x.n}`}
                </option>
              ))}
            </select>
            <ChevronDown className="pointer-events-none absolute end-2.5 size-4 opacity-60" />
          </label>
        ))}

        {/* the founder's own days: from one, up to another (the same, for one day) */}
        <span className={`${box} col-span-2 gap-1.5 px-2.5 ${from ? "border-brand bg-brand-soft text-brand" : "border-line bg-surface text-muted"}`}>
          من
          <input
            type="date"
            dir="ltr"
            value={from ?? ""}
            onChange={(e) => {
              const d = e.target.value || null;
              go(d ? { from: d, to: to && to >= d ? to : d, d: null } : { from: null, to: null });
            }}
            aria-label="من نهار"
            className="h-7 w-[8.25rem] bg-transparent text-[0.8125rem] text-body outline-none pointer-coarse:text-[16px]"
          />
          لين
          <input
            type="date"
            dir="ltr"
            value={to ?? ""}
            min={from ?? undefined}
            onChange={(e) => {
              const d = e.target.value || null;
              go(d ? { to: d, from: from && from <= d ? from : d, d: null } : { to: null });
            }}
            aria-label="لين نهار"
            className="h-7 w-[8.25rem] bg-transparent text-[0.8125rem] text-body outline-none pointer-coarse:text-[16px]"
          />
          {from && (
            <button type="button" onClick={() => go({ from: null, to: null })} aria-label="نحّي النهارات" className="grid size-6 place-items-center rounded-full hover:bg-brand/10">
              <X className="size-3.5" />
            </button>
          )}
        </span>
      </div>
    </div>
  );
}
