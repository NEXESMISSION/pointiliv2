"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Gift, ScanLine, Search, X } from "lucide-react";
import { CardMoments } from "@/components/CardMoments";
import { Pass, type PassShop } from "@/components/Pass";
import { fill, giftsN, stampsN, t } from "@/lib/t";
import { signal } from "@/lib/track";

export type CustomerRow = { id: string; name: string | null; phone: string | null; last_item?: string | null; items?: { name: string; n: number }[]; stamps: number; gifts: number; last_at: string | null; ready: boolean; goal: number | null; gift: string | null };

const when = (iso: string | null) =>
  iso ? new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso)) : t.never;

/**
 * Every customer of the shop, the latest visit first — and each row opens:
 * the owners kept tapping the rows (forty dead taps in a week), so a row now
 * shows the customer's card as it stands, the last visit, the gifts taken,
 * and, when a gift waits, the one way to hand it over («سكاني»).
 */
export function CustomerList({ items, shop, goal }: { items: CustomerRow[]; shop: PassShop; goal: number }) {
  const [open, setOpen] = useState<CustomerRow | null>(null);
  // a long list: a search (a name, or a phone's digits) and a second order — the ones nearest their gift first
  const [q, setQ] = useState("");
  const [near, setNear] = useState(false);
  const many = items.length > 6;
  const digits = q.replace(/\D/g, "");
  const shown = items
    .filter((c) => !q.trim() || (c.name ?? "").toLowerCase().includes(q.trim().toLowerCase()) || (digits.length >= 2 && (c.phone ?? "").replace(/\D/g, "").includes(digits)))
    .sort((a, b) => (near ? Number(b.ready) - Number(a.ready) || b.stamps / (b.goal ?? goal) - a.stamps / (a.goal ?? goal) : 0));
  useEffect(() => {
    if (!open) return;
    signal("customer_open");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(null);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open]);

  return (
    <>
      {many && (
        <div className="mt-[2dvh] flex shrink-0 items-center gap-2">
          <label className="relative min-w-0 flex-1">
            <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" />
            <input type="search" value={q} onChange={(e) => setQ(e.target.value)} placeholder={t.customersSearch} aria-label={t.customersSearch} className="h-11 w-full rounded-full bg-surface pe-4 ps-10 text-[16px] shadow-card outline-none placeholder:text-faint focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]" />
          </label>
          {!shop.store && (
            <button type="button" onClick={() => setNear(!near)} aria-pressed={near} className={`press flex h-11 shrink-0 items-center gap-1.5 rounded-full px-3.5 text-[0.8125rem] font-bold shadow-card ${near ? "bg-brand text-white" : "bg-surface text-body"}`}>
              <Gift className="size-4" /> {t.customersNear}
            </button>
          )}
        </div>
      )}
      {shown.length === 0 && <p className="mt-4 text-center text-[0.9375rem] text-muted">{t.customersNone}</p>}
      <ul data-list data-clarity-mask="true" className={`mb-[2dvh] min-h-0 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.375rem] bg-surface shadow-card ${many ? "mt-[1.4dvh]" : "mt-[2.5dvh]"} ${shown.length ? "" : "hidden"}`}>
        {shown.map((c) => {
          // each card has its own goal: the one it started with
          const of = c.goal ?? goal;
          const pct = Math.min(100, Math.round((c.stamps / of) * 100));
          return (
            <li key={c.id}>
              <button type="button" onClick={() => setOpen(c)} className="flex w-full items-center gap-3 px-4 py-3 text-start transition-colors active:bg-canvas">
                <span className="grid size-11 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[0.9375rem] font-bold text-white">{(c.name?.[0] ?? "؟").toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-semibold">{c.name ?? t.someone}</span>
                  <span className="block truncate text-[0.8125rem] text-muted">
                    {when(c.last_at)}
                    {c.last_item && (
                      <>
                        {" · "}
                        <bdi className="font-semibold text-brand">{c.last_item}</bdi>
                      </>
                    )}
                    {c.phone && (
                      <>
                        {" · "}
                        <span dir="ltr" className="num inline-block">
                          {c.phone}
                        </span>
                      </>
                    )}
                  </span>
                  {/* a shop with a store has no goal to fill: the tampons kept, on the right */}
                  {!shop.store && (
                    <span className="mt-1.5 block h-1.5 overflow-hidden rounded-full bg-line">
                      <span className="block h-full rounded-full bg-brand" style={{ width: `${pct}%` }} />
                    </span>
                  )}
                </span>
                {shop.store ? (
                  <span className="num shrink-0 rounded-full bg-brand-soft px-2.5 py-1 text-[0.8125rem] font-bold text-brand">{c.stamps}</span>
                ) : c.ready ? (
                  <span className="flex shrink-0 items-center gap-1 rounded-full bg-coral-soft px-2.5 py-1 text-[0.8125rem] font-bold text-coral">
                    <Gift className="size-3.5" /> {t.ready.replace("!", "")}
                  </span>
                ) : (
                  <span className="num shrink-0 text-[0.8125rem] font-bold text-body">
                    {Math.min(c.stamps, of)}/{of}
                  </span>
                )}
              </button>
            </li>
          );
        })}
      </ul>

      {open && (
        <div data-clarity-mask="true" className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={open.name ?? t.someone} onClick={() => setOpen(null)}>
          <div className="safe-b max-h-[92dvh] w-full max-w-md overflow-y-auto overscroll-contain rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-4 pt-3 text-ink" style={{ animation: "cust-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
            <style>{`@keyframes cust-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
            <div className="flex items-center justify-between">
              <span className="size-10" />
              <span className="mx-auto block h-1.5 w-10 rounded-full bg-line" aria-hidden />
              <button type="button" onClick={() => setOpen(null)} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
                <X className="size-5" />
              </button>
            </div>
            <div className="mt-1 flex items-center gap-3">
              <span className="grid size-12 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[1.0625rem] font-bold text-white">{(open.name?.[0] ?? "؟").toUpperCase()}</span>
              <span className="min-w-0">
                <span className="block truncate text-[1.25rem] font-bold">{open.name ?? t.someone}</span>
                <span className="block text-[0.8125rem] text-muted">
                  {fill(t.customerLast, { when: when(open.last_at) })}
                  {open.gifts > 0 ? ` · ${fill(t.customerGifts, { gifts: giftsN(open.gifts) })}` : ""}
                </span>
              </span>
            </div>
            {/* everything this customer took here, by thing, the most first — one row that slides */}
            {!!open.items?.length && (
              <div className="-mx-[clamp(1rem,5vw,1.5rem)] mt-2.5 flex gap-1.5 overflow-x-auto px-[clamp(1rem,5vw,1.5rem)] [scrollbar-width:none]">
                {open.items.map((x) => (
                  <span key={x.name} className="flex shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[0.8125rem] font-bold text-brand">
                    <bdi>{x.name}</bdi>
                    <span className="num text-[0.8125rem] text-brand/75">×{x.n}</span>
                  </span>
                ))}
              </div>
            )}
            <div className="mt-3">
              <Pass shop={{ ...shop, goal: open.goal ?? shop.goal, gift: open.gift ?? shop.gift }} stamps={open.stamps} />
            </div>
            {shop.store ? (
              <p className="mt-3 text-center text-[0.9375rem] font-semibold text-body">{fill(t.storeHolds, { n: open.stamps })}</p>
            ) : open.ready ? (
              <div className="mt-3 flex items-center gap-3 rounded-[1.25rem] bg-coral-soft p-3.5">
                <Gift className="size-6 shrink-0 text-coral" />
                <span className="min-w-0 flex-1 text-[0.9375rem] font-semibold text-coral">{t.customerGiftWaits}</span>
                <Link href="/shop/collect?by=scan" className="press flex h-10 shrink-0 items-center gap-1.5 rounded-[0.875rem] bg-coral px-3.5 text-[0.9375rem] font-bold text-white">
                  <ScanLine className="size-4" /> {t.collectScanShort}
                </Link>
              </div>
            ) : (
              <p className="mt-3 text-center text-[0.9375rem] text-muted">{fill(t.customerLeft, { n: stampsN(Math.max((open.goal ?? goal) - open.stamps, 0)), gift: open.gift ?? shop.gift ?? "" })}</p>
            )}
            {/* every tampon on the card, and what each one was for (the things' totals are above) */}
            <CardMoments card={open.id} color={shop.color} tally={!(open.items && open.items.length)} />
          </div>
        </div>
      )}
    </>
  );
}
