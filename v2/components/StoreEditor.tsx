"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, Minus, Plus, ShoppingCart, X } from "lucide-react";
import { storeGive, storeSave } from "@/app/actions-store";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { fill, t } from "@/lib/t";
import type { Order, StoreItem } from "@/lib/types";

type Row = { key: string; id?: number; name: string; cost: number };
export type Waiting = { card: string; name: string | null; phone: string | null; orders: Order[] };

/** what a few things usually cost in tampons, for the first rows: a price is easier to change than to invent */
const START = 10;

/**
 * The owner's store (a shop the founder switched to it): the orders waiting
 * on top — each handed over in one tap, though usually it is done at the
 * counter by scanning the customer's code — and the things on sale, each a
 * name and a price in tampons, changed in place and saved at once.
 */
export function StoreEditor({ items, waiting, sold, first = false }: { items: StoreItem[]; waiting: Waiting[]; sold: { name: string; n: number }[]; first?: boolean }) {
  useScreen("store");
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => items.map((x) => ({ key: `i${x.id}`, id: x.id, name: x.name, cost: x.cost })));
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [fresh, setFresh] = useState("");

  const change = (key: string, patch: Partial<Row>) => {
    setRows((r) => r.map((x) => (x.key === key ? { ...x, ...patch } : x)));
    setDirty(true);
    setSaved(false);
  };
  const add = () => {
    const name = fresh.trim().slice(0, 40);
    if (!name) return;
    setRows((r) => [...r, { key: `n${Date.now()}`, name, cost: START }]);
    setFresh("");
    setDirty(true);
    setSaved(false);
  };
  const save = () =>
    start(async () => {
      const res = await storeSave(rows.filter((x) => x.name.trim()).map((x) => ({ id: x.id, name: x.name, cost: x.cost })));
      if (!res.ok || !res.items) {
        setError(t.storeErr);
        return;
      }
      setError(null);
      setRows(res.items.map((x) => ({ key: `i${x.id}`, id: x.id, name: x.name, cost: x.cost })));
      setDirty(false);
      setSaved(true);
      // the shop's first set-up: that was the only thing to choose — the clips, then the code (as after any first card)
      if (first && res.items.length > 0) router.push("/shop/start");
      else router.refresh();
    });
  const give = (card: string) =>
    start(async () => {
      await storeGive(card);
      router.refresh();
    });

  return (
    <>
      <Top back={first ? undefined : "/shop"} title={t.storeOwnerTitle} hint={first ? undefined : t.storeOwnerHint} />
      {first && (
        <>
          <h1 className="mt-1 shrink-0 text-balance text-[1.25rem] font-bold leading-tight">شنوّة يشريو الحرفاء بالتامبونات؟</h1>
          <p className="shrink-0 text-[0.8125rem] text-muted">اكتب الحاجات وقدّاش من تامبون كل وحدة. هذا كل شي.</p>
        </>
      )}

      {/* what customers ordered and have not taken: handed over here, or by scanning their code */}
      {waiting.length > 0 && (
        <section className="mt-[2dvh] shrink-0 rounded-[1.25rem] bg-brand-soft p-3">
          <h2 className="mb-2 flex items-center gap-1.5 px-0.5 text-[0.9375rem] font-bold text-brand">
            <ShoppingCart className="size-5" strokeWidth={2.2} /> {t.storeOrders} <span className="num">({waiting.length})</span>
          </h2>
          <ul className="max-h-[22dvh] space-y-1.5 overflow-y-auto overscroll-contain" data-list>
            {waiting.map((w) => (
              <li key={w.card} className="flex items-center gap-2.5 rounded-[1rem] bg-surface px-3 py-2 shadow-card">
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-bold">{w.name ?? t.someone}</span>
                  <span className="block truncate text-[0.8125rem] text-muted">
                    {w.orders.flatMap((o) => o.lines).map((l, i) => (
                      <span key={i}>
                        {i > 0 && "، "}
                        <bdi className="num">{l.qty}×</bdi> <bdi>{l.name}</bdi>
                      </span>
                    ))}
                  </span>
                </span>
                <button type="button" disabled={pending} onClick={() => give(w.card)} className="press h-10 shrink-0 rounded-[0.875rem] bg-brand px-4 text-[0.9375rem] font-bold text-white disabled:opacity-60">
                  {t.storeGive}
                </button>
              </li>
            ))}
          </ul>
        </section>
      )}

      {/* the things on sale: a name and a price, each changed in place */}
      <section className="mt-[2dvh] flex min-h-0 flex-1 flex-col">
        <div data-list className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
          {rows.length === 0 && <p className="px-4 pb-1 pt-4 text-center text-[0.9375rem] text-muted">{t.storeEmpty}</p>}
          <ul className="divide-y divide-line">
            {rows.map((x) => (
              <li key={x.key} className="flex items-center gap-2 px-3 py-2">
                <input
                  value={x.name}
                  onChange={(e) => change(x.key, { name: e.target.value.slice(0, 40) })}
                  aria-label={t.storeName}
                  className="h-10 min-w-0 flex-1 rounded-[0.75rem] bg-canvas px-3 text-[0.9375rem] font-semibold outline-none focus:ring-2 focus:ring-brand/40"
                />
                <span className="flex shrink-0 items-center gap-1" dir="ltr">
                  <button type="button" onClick={() => change(x.key, { cost: Math.max(1, x.cost - 1) })} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="-1">
                    <Minus className="size-4" />
                  </button>
                  <input
                    value={x.cost}
                    onChange={(e) => change(x.key, { cost: Math.min(9999, Math.max(1, Number(e.target.value.replace(/\D/g, "")) || 1)) })}
                    inputMode="numeric"
                    aria-label={fill(t.storeCost, { n: x.cost })}
                    className="num h-9 w-12 rounded-[0.625rem] bg-brand-soft text-center text-[0.9375rem] font-bold text-brand outline-none"
                  />
                  <button type="button" onClick={() => change(x.key, { cost: Math.min(9999, x.cost + 1) })} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="+1">
                    <Plus className="size-4" />
                  </button>
                </span>
                <button
                  type="button"
                  onClick={() => {
                    setRows((r) => r.filter((y) => y.key !== x.key));
                    setDirty(true);
                    setSaved(false);
                  }}
                  className="press grid size-9 shrink-0 place-items-center rounded-full text-muted hover:text-coral"
                  aria-label="X"
                >
                  <X className="size-4" />
                </button>
              </li>
            ))}
            <li className="flex items-center gap-2 px-3 py-2">
              <input
                value={fresh}
                onChange={(e) => setFresh(e.target.value)}
                onKeyDown={(e) => e.key === "Enter" && add()}
                placeholder={t.storeAdd}
                className="h-10 min-w-0 flex-1 rounded-[0.75rem] border-2 border-dashed border-line bg-transparent px-3 text-[0.9375rem] outline-none focus:border-brand"
              />
              <button type="button" onClick={add} disabled={!fresh.trim()} className="press flex h-10 shrink-0 items-center gap-1 rounded-[0.75rem] bg-brand px-3.5 text-[0.9375rem] font-bold text-white disabled:opacity-40">
                <Plus className="size-4" /> {t.storeAdd}
              </button>
            </li>
          </ul>
        </div>

        {sold.length > 0 && (
          <div className="-mx-5 mt-2 flex shrink-0 gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
            <span className="shrink-0 self-center text-[0.75rem] font-semibold text-muted">{t.storeSold}</span>
            {sold.map((x) => (
              <span key={x.name} className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1 text-[0.8125rem] font-bold shadow-card">
                <bdi>{x.name}</bdi> <span className="num text-brand">×{x.n}</span>
              </span>
            ))}
          </div>
        )}

        <div className="shrink-0 pb-3 pt-2">
          {error && <p className="mb-1.5 text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
          <Btn type="button" onClick={save} disabled={pending || !dirty}>
            {saved && !dirty ? (
              <>
                <Check className="size-5" /> {t.storeSaved}
              </>
            ) : pending ? (
              t.checking
            ) : (
              t.storeSave
            )}
          </Btn>
        </div>
      </section>
    </>
  );
}
