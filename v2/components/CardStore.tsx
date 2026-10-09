"use client";

import { useEffect, useState, useSyncExternalStore } from "react";
import { createPortal } from "react-dom";
import { useRouter } from "next/navigation";
import { ChevronLeft, Coins, QrCode, ShoppingBag, X } from "lucide-react";
import { cancelOrder, orderReward, type Order, type Reward } from "@/app/actions-store";
import { signal } from "@/lib/track";
import { fill, pointsSaid, t } from "@/lib/t";

const never = () => () => {};
const useBrowser = () => useSyncExternalStore(never, () => true, () => false);

/**
 * The shop's store, from the customer's card: a bar under the card (or, when
 * a thing is chosen and waiting, the same bar in coral: «تستنّاك: كابوسة»),
 * and a sheet. In it, what the store has, each with its price; what the points
 * pay for can be taken. Taking one holds it and shows the customer's own code
 * — the one the shop scans for a tampon — with the thing's name over it: the
 * shop scans, hands it over, and only then do the points leave the card.
 */
export function CardStore({ card, points, items, order: first, code, svg }: { card: string; points: number; items: Reward[]; order: Order | null; code: string | null; svg: string | null }) {
  const [open, setOpen] = useState(false);
  const [order, setOrder] = useState<Order | null>(first);
  const [busy, setBusy] = useState<number | "cancel" | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const browser = useBrowser();
  const router = useRouter();

  useEffect(() => {
    if (!open) return;
    signal("store_open", order ? "order" : "list");
    const esc = (e: KeyboardEvent) => e.key === "Escape" && setOpen(false);
    addEventListener("keydown", esc);
    return () => removeEventListener("keydown", esc);
  }, [open, order]);

  // back on the page (after the counter): the card as it is now — the points spent, the order gone
  useEffect(() => {
    const back = () => document.visibilityState === "visible" && router.refresh();
    document.addEventListener("visibilitychange", back);
    return () => document.removeEventListener("visibilitychange", back);
  }, [router]);

  const take = async (r: Reward) => {
    setBusy(r.id);
    setErr(null);
    const res = await orderReward(card, r.id).catch(() => ({ ok: false, error: "network" }) as Awaited<ReturnType<typeof orderReward>>);
    setBusy(null);
    if (res.ok && res.order) {
      setOrder(res.order);
      signal("store_take", `${r.name} · ${r.cost}`);
    } else setErr(res.error === "not_enough" ? t.storeNotEnough : res.error === "gone" ? t.storeGone : t.errNetwork);
  };

  const cancel = async () => {
    setBusy("cancel");
    await cancelOrder(card).catch(() => false);
    setBusy(null);
    setOrder(null);
  };

  if (!items.length && !order) return null;

  return (
    <>
      <button
        type="button"
        onClick={() => setOpen(true)}
        className={`press mt-3 flex w-full shrink-0 items-center gap-3 rounded-[1.25rem] px-4 py-3 text-start ${order ? "bg-[linear-gradient(150deg,#ffa183,#ff6b4a)] text-white shadow-[0_14px_30px_-14px_rgb(255_107_74/0.8)]" : "bg-surface text-ink shadow-card"}`}
      >
        <ShoppingBag className={`size-6 shrink-0 ${order ? "" : "text-brand"}`} />
        <span className="min-w-0 flex-1">
          <span className="block truncate text-[1rem] font-bold">{order ? fill(t.storeWaiting, { name: order.name }) : t.storeTitle}</span>
          <span className={`block truncate text-[0.8125rem] ${order ? "text-white/85" : "text-muted"}`}>
            {order ? t.storeShowShort : fill(t.storeHave, { n: pointsSaid(points) })}
          </span>
        </span>
        {order ? <QrCode className="size-6 shrink-0" /> : <ChevronLeft className="size-5 shrink-0 opacity-60" />}
      </button>

      {open &&
        browser &&
        createPortal(
          <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45" role="dialog" aria-modal="true" aria-label={t.storeTitle} onClick={() => setOpen(false)}>
            <div className="safe-b flex max-h-[92dvh] w-full max-w-md flex-col rounded-t-[1.75rem] bg-canvas px-[clamp(1rem,5vw,1.5rem)] pb-5 pt-4" style={{ animation: "st-up 360ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
              <style>{`@keyframes st-up { from { transform: translateY(100%); } to { transform: none; } }`}</style>
              <div className="flex shrink-0 items-center justify-between">
                <h2 className="text-[1.375rem] font-bold">{order ? order.name : t.storeTitle}</h2>
                <button type="button" onClick={() => setOpen(false)} className="press grid size-10 place-items-center rounded-full bg-surface shadow-card" aria-label={t.back}>
                  <X className="size-5" />
                </button>
              </div>

              {order ? (
                // the thing held: the customer's own code, the thing's name and price over it
                <div className="flex min-h-0 flex-col items-center text-center">
                  <p className="mt-1 flex items-center gap-1.5 text-[1.0625rem] font-bold text-coral">
                    <Coins className="size-5" /> {pointsSaid(order.cost)}
                  </p>
                  {svg && code ? (
                    <>
                      <div className="mt-3 w-[min(78vw,17rem,44dvh)] rounded-[1.5rem] bg-white p-4 shadow-card [&>svg]:size-full" dangerouslySetInnerHTML={{ __html: svg }} role="img" aria-label={t.storeShow} data-clarity-mask="true" />
                      <p className="num mt-2 text-[1.5rem] font-bold tracking-[0.2em]" dir="ltr">
                        {code}
                      </p>
                    </>
                  ) : null}
                  <p className="mt-2 text-balance text-[1rem] font-semibold text-body">{t.storeShow}</p>
                  <button type="button" onClick={() => void cancel()} disabled={busy === "cancel"} className="press mt-3 h-11 rounded-full px-5 text-[0.9375rem] font-bold text-muted disabled:opacity-50">
                    {t.storeCancel}
                  </button>
                </div>
              ) : (
                <>
                  <p className="mt-1 shrink-0 text-[0.9375rem] font-semibold text-muted">{fill(t.storeHave, { n: pointsSaid(points) })}</p>
                  <ul data-list className="mt-3 min-h-0 space-y-2 overflow-y-auto overscroll-contain pb-1">
                    {items.map((r) => {
                      const can = points >= r.cost;
                      return (
                        <li key={r.id} className="flex items-center gap-3 rounded-[1.25rem] bg-surface p-3 shadow-card">
                          <span className="min-w-0 flex-1">
                            <bdi className="block truncate text-[1.0625rem] font-bold">{r.name}</bdi>
                            <span className="mt-0.5 flex items-center gap-1 text-[0.875rem] font-semibold text-brand">
                              <Coins className="size-4" /> {pointsSaid(r.cost)}
                            </span>
                          </span>
                          {can ? (
                            <button type="button" onClick={() => void take(r)} disabled={busy !== null} className="press h-11 shrink-0 rounded-[1rem] bg-brand px-4 text-[0.9688rem] font-bold text-white disabled:opacity-60">
                              {busy === r.id ? "…" : t.storeTake}
                            </button>
                          ) : (
                            <span className="shrink-0 text-[0.8125rem] font-semibold text-faint">{fill(t.storeMissing, { n: pointsSaid(r.cost - points) })}</span>
                          )}
                        </li>
                      );
                    })}
                  </ul>
                  {err && <p className="mt-2 shrink-0 text-center text-[0.9062rem] font-semibold text-coral">{err}</p>}
                </>
              )}
            </div>
          </div>,
          document.body,
        )}
    </>
  );
}
