"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { ChevronLeft, X } from "lucide-react";
import { Pass, type PassShop } from "@/components/Pass";
import { Icon3D } from "@/components/ui";
import { fill, stampsN, t } from "@/lib/t";
import { signal } from "@/lib/track";

/** one line of «آخر حركة», its words and time already said by the page */
export type RecentRow = { id: number; kind: "stamp" | "gift"; name: string; line: string; time: string; stamps: number; goal: number; gift: string | null };

const say = {
  left: "مازالو {n} على {gift}",
  ready: "الكادو حاضر: {gift}",
  all: "الحرفاء الكل",
};

/**
 * «آخر حركة» on the owner's home: each line opens, the way owners kept
 * tapping them (43 taps on nothing in two days) — the customer's card as it
 * stands, what just happened, and the way to all the customers.
 */
export function RecentList({ rows, shop }: { rows: RecentRow[]; shop: PassShop }) {
  const [open, setOpen] = useState<RecentRow | null>(null);
  useEffect(() => {
    if (!open) return;
    signal("recent_open");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      <ul data-list data-clarity-mask="true" className="min-h-0 divide-y divide-line overflow-y-auto overscroll-contain">
        {rows.map((r) => (
          <li key={r.id}>
            <button type="button" onClick={() => setOpen(r)} className="flex w-full items-center gap-3 px-3.5 py-2.5 text-start transition-colors active:bg-canvas">
              {r.kind === "stamp" ? (
                <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.7812rem] font-bold text-brand">+1</span>
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral-soft">
                  <Icon3D name="gift" size={22} />
                </span>
              )}
              <span className="min-w-0 flex-1 truncate text-[0.9062rem] font-medium">{r.line}</span>
              <span className="num shrink-0 text-[0.75rem] text-muted">{r.time}</span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div data-clarity-mask="true" className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={open.name} onClick={() => setOpen(null)}>
          <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-3 text-ink" style={{ animation: "recent-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <style>{`@keyframes recent-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
            <div className="flex items-center justify-between">
              <span className="size-10" />
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
              <button type="button" onClick={() => setOpen(null)} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
                <X className="size-5" />
              </button>
            </div>
            <p className="mt-1 text-[1.25rem] font-bold">{open.name}</p>
            <p className="text-[0.9062rem] text-muted">
              {open.line} · <span className="num">{open.time}</span>
            </p>
            <div className="mt-4">
              <Pass shop={{ ...shop, goal: open.goal, gift: open.gift ?? shop.gift }} stamps={open.stamps} />
            </div>
            <p className="mt-3 text-center text-[0.9375rem] font-semibold text-body">
              {open.stamps >= open.goal ? fill(say.ready, { gift: open.gift ?? shop.gift ?? "" }) : fill(say.left, { n: stampsN(open.goal - open.stamps), gift: open.gift ?? shop.gift ?? "" })}
            </p>
            <Link href="/shop/customers" className="press mt-4 flex h-12 items-center justify-center gap-1 rounded-[1rem] bg-surface text-[0.9375rem] font-bold text-brand shadow-card">
              {say.all} <ChevronLeft className="size-4" />
            </Link>
          </div>
        </div>
      )}
    </>
  );
}
