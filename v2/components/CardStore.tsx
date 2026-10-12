"use client";

import { useState, useTransition } from "react";
import { Minus, Plus, QrCode, ShoppingBag } from "lucide-react";
import { storeBuy, storeCancel } from "@/app/actions-store";
import { MyCode } from "@/components/MyCode";
import { Pass, type PassShop } from "@/components/Pass";
import { Confetti } from "@/components/StampLand";
import { useScreen } from "@/components/Tracker";
import { Icon3D } from "@/components/ui";
import { fill, t } from "@/lib/t";
import { signal } from "@/lib/track";
import type { Order, StoreItem } from "@/lib/types";

/** «2× قهوة، 1× كرواسون» */
const said = (orders: Order[]) =>
  orders
    .flatMap((o) => o.lines)
    .map((l) => `${l.qty}× ${l.name}`)
    .join("، ");

/**
 * The customer's side of a store: the things, a basket filled with + and −
 * (several things, several of each, never more than the tampons on the card),
 * one button to take them — and then the order, waiting with the customer's
 * code to show at the counter, which can still be taken back until it is
 * handed over (the tampons come back).
 */
export function CardStore({ card, shop, balance: first, items, waiting: firstWaiting, code, svg }: { card: string; shop: PassShop; balance: number; items: StoreItem[]; waiting: Order[]; code: string | null; svg: string | null }) {
  useScreen("store");
  const [balance, setBalance] = useState(first);
  const [waiting, setWaiting] = useState(firstWaiting);
  const [basket, setBasket] = useState<Record<number, number>>({});
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [party, setParty] = useState(0);
  const [cancelAsk, setCancelAsk] = useState<string | null>(null);

  const total = items.reduce((n, x) => n + x.cost * (basket[x.id] ?? 0), 0);
  const count = Object.values(basket).reduce((a, b) => a + b, 0);
  const left = balance - total;
  const put = (id: number, d: number) => setBasket((b) => ({ ...b, [id]: Math.max(0, Math.min(20, (b[id] ?? 0) + d)) }));

  const buy = () =>
    start(async () => {
      const lines = Object.entries(basket)
        .filter(([, q]) => q > 0)
        .map(([id, qty]) => ({ id: Number(id), qty }));
      const res = await storeBuy(card, lines);
      if (!res.ok) {
        setError(res.error === "not_enough" ? fill(t.storeShort, { n: total - balance }) : t.storeErr);
        return;
      }
      setError(null);
      setBalance(res.balance);
      setWaiting(res.waiting);
      setBasket({});
      setParty((p) => p + 1);
      navigator.vibrate?.(60);
      signal("store_buy", String(total));
    });
  const cancel = (batch: string) =>
    start(async () => {
      const res = await storeCancel(card, batch);
      setCancelAsk(null);
      if (res.ok) {
        setBalance(res.balance);
        setWaiting(res.waiting);
        signal("store_cancel");
      } else setError(t.storeErr);
    });

  return (
    <>
      {party > 0 && <Confetti key={party} count={50} />}
      {/* the card: the tampons it holds, the same moment they are spent */}
      <div className="mx-auto mt-[2dvh] w-full max-w-[min(100%,46dvh)] animate-rise">
        <Pass shop={shop} stamps={balance} small />
      </div>

      {/* an order waiting: the customer's code, to show at the counter */}
      {waiting.length > 0 && (
        <div className="relative mt-3 shrink-0 animate-pop overflow-hidden rounded-[1.5rem] bg-[linear-gradient(150deg,#ffa183,#ff6b4a_55%,#e0452a)] px-4 py-3 text-white shadow-[0_18px_40px_-18px_rgb(255_107_74/0.85)]">
          <div className="flex items-center gap-3">
            <Icon3D name="cart" size={40} className="shrink-0 animate-float" />
            <span className="min-w-0 flex-1">
              <span className="block text-[1.0625rem] font-bold">{t.storeBought}</span>
              <span className="block truncate text-[0.875rem] text-white/90">
                <bdi>{said(waiting)}</bdi>
              </span>
            </span>
          </div>
          <div className="mt-2.5 flex items-center gap-2">
            {code && svg ? (
              <MyCode code={code} svg={svg} gift={said(waiting)} startOpen={party > 0} className="press flex h-10 flex-1 items-center justify-center gap-2 rounded-full bg-white px-4 text-[0.9375rem] font-bold text-coral">
                <QrCode className="size-[1.125rem]" /> {t.storeShow}
              </MyCode>
            ) : (
              <span className="flex-1 text-[0.875rem] text-white/90">{t.storeShow}</span>
            )}
            {cancelAsk ? (
              <button type="button" disabled={pending} onClick={() => cancel(cancelAsk)} className="press h-10 shrink-0 rounded-full bg-white/25 px-3.5 text-[0.8438rem] font-bold">
                {t.storeCancelAsk}
              </button>
            ) : (
              <button type="button" onClick={() => setCancelAsk(waiting[waiting.length - 1]!.batch)} className="press h-10 shrink-0 rounded-full px-3 text-[0.875rem] font-semibold text-white/85 underline-offset-4 hover:underline">
                {t.storeCancel}
              </button>
            )}
          </div>
        </div>
      )}

      {/* the things: tap + to put one in the basket */}
      <section className="mt-[2.5dvh] flex min-h-0 flex-1 flex-col pb-3">
        <h2 className="mb-1 flex items-center gap-1.5 px-0.5 text-[1.0625rem] font-bold">
          <ShoppingBag className="size-5 text-brand" /> {t.storeTitle}
        </h2>
        <p className="mb-2 px-0.5 text-[0.8438rem] text-muted">{t.storeHint}</p>
        {items.length === 0 ? (
          <p className="rounded-[1.25rem] bg-surface p-4 text-center text-[0.9375rem] text-muted shadow-card">{t.storeEmpty}</p>
        ) : (
          <ul data-list className="min-h-0 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.375rem] bg-surface shadow-card">
            {items.map((x) => {
              const q = basket[x.id] ?? 0;
              const can = left >= x.cost;
              return (
                <li key={x.id} className={`flex items-center gap-3 px-3.5 py-2.5 transition-colors ${q > 0 ? "bg-brand-soft/60" : ""}`}>
                  <span className="min-w-0 flex-1">
                    <bdi className="block truncate text-[1rem] font-bold">{x.name}</bdi>
                    <span className={`block text-[0.8125rem] font-semibold ${can || q > 0 ? "text-brand" : "text-faint"}`}>
                      {fill(t.storeCost, { n: x.cost })}
                      {!can && q === 0 && <span className="font-normal text-muted"> · {fill(t.storeShort, { n: x.cost - left })}</span>}
                    </span>
                  </span>
                  <span className="flex shrink-0 items-center gap-1.5" dir="ltr">
                    {q > 0 && (
                      <>
                        <button type="button" onClick={() => put(x.id, -1)} className="press grid size-9 place-items-center rounded-full bg-surface text-brand shadow-card" aria-label="-1">
                          <Minus className="size-4" strokeWidth={2.6} />
                        </button>
                        <span className="num w-5 text-center text-[1.0625rem] font-bold">{q}</span>
                      </>
                    )}
                    <button type="button" disabled={!can} onClick={() => put(x.id, 1)} className="press grid size-9 place-items-center rounded-full bg-brand text-white shadow-[0_8px_18px_-10px_var(--color-brand)] disabled:bg-line disabled:text-faint disabled:shadow-none" aria-label="+1">
                      <Plus className="size-4" strokeWidth={2.6} />
                    </button>
                  </span>
                </li>
              );
            })}
          </ul>
        )}

        {/* the basket: what it costs, and the one button */}
        {count > 0 && (
          <div className="mt-2.5 shrink-0 animate-rise">
            {error && <p className="mb-1.5 text-center text-[0.875rem] font-semibold text-coral">{error}</p>}
            <button
              type="button"
              disabled={pending || left < 0}
              onClick={buy}
              className="press flex h-[3.5rem] w-full items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)] disabled:opacity-60"
            >
              <ShoppingBag className="size-5" /> {pending ? t.checking : fill(t.storeBuy, { n: total })}
              <span className="num rounded-full bg-white/20 px-2 py-0.5 text-[0.8125rem]">{count}</span>
            </button>
          </div>
        )}
        {count === 0 && error && <p className="mt-2 text-center text-[0.875rem] font-semibold text-coral">{error}</p>}
      </section>
    </>
  );
}
