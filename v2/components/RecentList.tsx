"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Hourglass, QrCode, TriangleAlert, Undo2, X } from "lucide-react";
import { Pass, type PassShop } from "@/components/Pass";
import { CardMoments } from "@/components/CardMoments";
import { Icon3D } from "@/components/ui";
import { fill, stampsN, t } from "@/lib/t";
import { signal } from "@/lib/track";

/** one line of «آخر حركة», its words and time already said by the page */
export type RecentRow = {
  id: number | string; kind: "stamp" | "gift" | "held"; name: string; line: string; time: string; stamps: number; goal: number; gift: string | null; item?: string | null;
  /** the customer's card (not on a scan without an account) */
  card?: string;
  /** a scan without an account: how it ended, and until when it waits */
  state?: "waiting" | "lost" | "done" | "back"; until?: string;
};

/** a scan without an account, by how it ended: its mark and colours */
const HELD = {
  waiting: { icon: Hourglass, ring: "bg-[#fff4e0] text-[#d97706]" },
  lost: { icon: TriangleAlert, ring: "bg-coral-soft text-coral" },
  done: { icon: Check, ring: "bg-mint-soft text-mint" },
  back: { icon: Undo2, ring: "bg-mint-soft text-mint" },
} as const;

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
export function RecentList({ rows, shop, fix = false }: { rows: RecentRow[]; shop: PassShop; fix?: boolean }) {
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
              {r.kind === "held" ? (
                <HeldMark state={r.state ?? "waiting"} />
              ) : r.kind === "stamp" ? (
                <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.7812rem] font-bold text-brand">+1</span>
              ) : (
                <span className="grid size-9 shrink-0 place-items-center rounded-full bg-coral-soft">
                  <Icon3D name="gift" size={22} />
                </span>
              )}
              <span className={`min-w-0 flex-1 truncate text-[0.9062rem] font-medium ${r.kind === "held" && r.state === "lost" ? "text-coral" : ""}`}>
                {r.line}
                {/* what the tampon was for */}
                {r.item && (
                  <>
                    {" · "}
                    <bdi className="font-bold text-brand">{r.item}</bdi>
                  </>
                )}
              </span>
              <span className="num shrink-0 text-[0.75rem] text-muted">{r.time}</span>
            </button>
          </li>
        ))}
      </ul>

      {open && (
        <div data-clarity-mask="true" className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={open.name} onClick={() => setOpen(null)}>
          <div className="safe-b max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-3 text-ink" style={{ animation: "recent-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <style>{`@keyframes recent-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
            <div className="flex items-center justify-between">
              <span className="size-10" />
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
              <button type="button" onClick={() => setOpen(null)} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
                <X className="size-5" />
              </button>
            </div>
            {open.kind === "held" ? (
              <HeldSheet row={open} />
            ) : (
              <>
            <p className="mt-1 text-[1.25rem] font-bold">{open.name}</p>
            <p className="text-[0.9062rem] text-muted">
              {open.line} · <span className="num">{open.time}</span>
            </p>
            <div className="mt-4">
              <Pass shop={{ ...shop, goal: open.goal, gift: open.gift ?? shop.gift }} stamps={open.stamps} />
            </div>
            <p className="mt-3 text-center text-[0.9375rem] font-semibold text-body">
              {shop.store ? fill(t.storeHolds, { n: open.stamps }) : open.stamps >= open.goal ? fill(say.ready, { gift: open.gift ?? shop.gift ?? "" }) : fill(say.left, { n: stampsN(open.goal - open.stamps), gift: open.gift ?? shop.gift ?? "" })}
            </p>
            {/* every tampon on the card, and what each one was for */}
            {open.card && <CardMoments card={open.card} color={shop.color} />}
            {/* the wrong thing tapped at the counter: put right in two taps */}
            {fix && open.kind === "stamp" && (
              <Link href={`/shop/tampons?m=${open.id}`} className="press mt-3 flex h-11 items-center justify-center rounded-[1rem] bg-brand-soft text-[0.9062rem] font-bold text-brand">
                غلطت في الحاجة؟ بدّلها
              </Link>
            )}
            <Link href="/shop/customers" className="press mt-4 flex h-12 items-center justify-center gap-1 rounded-[1rem] bg-surface text-[0.9375rem] font-bold text-brand shadow-card">
              {say.all} <ChevronLeft className="size-4" />
            </Link>
              </>
            )}
          </div>
        </div>
      )}
    </>
  );
}

const clock = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/** the round mark of a scan without an account; one still waiting blinks */
function HeldMark({ state }: { state: keyof typeof HELD }) {
  const h = HELD[state];
  return (
    <span className={`relative grid size-9 shrink-0 place-items-center rounded-full ${h.ring}`}>
      <h.icon className="size-[1.125rem]" strokeWidth={2.4} />
      {state === "waiting" && <span className="absolute -end-0.5 -top-0.5 size-2.5 animate-ping rounded-full bg-[#f59e0b]" aria-hidden />}
    </span>
  );
}

/**
 * A scan by a phone without an account, opened: what it means, and the easy
 * way to make it right — the tampon given back by the customer's number (the
 * scan is then marked as settled), or the code to scan again.
 */
function HeldSheet({ row }: { row: RecentRow }) {
  const st = row.state ?? "waiting";
  const h = HELD[st];
  const open = st === "waiting" || st === "lost";
  const title = st === "waiting" ? t.heldSheetWaiting : st === "lost" ? t.heldSheetLost : row.line;
  return (
    <div className="pt-1 text-center">
      <span className={`mx-auto grid size-16 animate-pop place-items-center rounded-full ${h.ring}`}>
        <h.icon className="size-8" strokeWidth={2.2} />
      </span>
      <p className="mt-3 text-balance text-[1.25rem] font-bold">{title}</p>
      <p className="mt-1 text-[0.875rem] text-muted">
        <span className="num">{row.time}</span>
        {row.item && (
          <>
            {" · "}
            <bdi className="font-bold text-brand">{row.item}</bdi>
          </>
        )}
      </p>
      {open && (
        <p className="mx-auto mt-3 max-w-sm text-balance text-[0.9375rem] leading-relaxed text-body">
          {st === "waiting" ? fill(t.heldSheetWaitingBody, { until: row.until ? clock(row.until) : "" }) : t.heldSheetLostBody}
        </p>
      )}
      {open && (
        <div className="mt-4 space-y-2">
          <Link
            href={`/shop/collect?by=code&back=${row.id}`}
            className="press flex h-[3.25rem] items-center justify-center gap-2 rounded-[1.125rem] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-[1rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]"
          >
            <Undo2 className="size-5" /> {t.heldGiveBack}
          </Link>
          <Link href="/shop/qr" className="press flex h-12 items-center justify-center gap-2 rounded-[1rem] bg-surface text-[0.9375rem] font-bold text-brand shadow-card">
            <QrCode className="size-4" /> {t.heldShowCode}
          </Link>
        </div>
      )}
    </div>
  );
}
