"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { Coins, Pencil, Plus, X } from "lucide-react";
import { dropReward, saveReward, type Reward, type StoreLog } from "@/app/actions-store";
import { signal } from "@/lib/track";
import { fill, pointsSaid, t } from "@/lib/t";

const when = (iso: string) =>
  new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: "Africa/Tunis" }).format(new Date(iso));

/**
 * The owner's store, two sides of one screen:
 *   «الماغازة» — the things, each with its price in points: one line to add
 *     (a name, a number), a tap on a thing to change it, × to put it away;
 *   «شنوّة خذاو» — every thing taken, the newest first: what, how many
 *     points, who, when; and above, how many times each thing was taken.
 * The lists scroll inside their own box: the screen stays one screen.
 */
export function StoreEditor({ items, log }: { items: Reward[]; log: StoreLog | null }) {
  const [side, setSide] = useState<"items" | "log">("items");
  const [editing, setEditing] = useState<number | null>(null);
  const [name, setName] = useState("");
  const [cost, setCost] = useState("");
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState<string | null>(null);
  const router = useRouter();

  const save = async () => {
    if (busy) return;
    const n = Number(cost);
    if (name.trim().length < 2) return setErr(t.storeErrName);
    if (!Number.isInteger(n) || n < 1 || n > 100000) return setErr(t.storeErrCost);
    setBusy(true);
    setErr(null);
    const res = await saveReward(editing, name.trim(), n).catch(() => ({ ok: false, error: "network" }));
    setBusy(false);
    if (!res.ok) {
      setErr(res.error === "bad_name" ? t.storeErrName : res.error === "bad_cost" ? t.storeErrCost : res.error === "exists" ? t.storeErrExists : res.error === "too_many" ? t.storeErrMany : t.errNetwork);
      return;
    }
    signal("store_save", editing ? "edit" : "add");
    setEditing(null);
    setName("");
    setCost("");
    router.refresh();
  };

  const drop = async (r: Reward) => {
    if (busy) return;
    setBusy(true);
    await dropReward(r.id).catch(() => false);
    setBusy(false);
    if (editing === r.id) {
      setEditing(null);
      setName("");
      setCost("");
    }
    router.refresh();
  };

  return (
    <div className="flex min-h-0 flex-1 flex-col pb-4">
      <div className="mt-[1.5dvh] grid shrink-0 grid-cols-2 gap-1 rounded-[1.125rem] bg-ink/[0.06] p-1">
        {(
          [
            { id: "items", label: t.storeTitle },
            { id: "log", label: t.storeLog },
          ] as const
        ).map((x) => (
          <button key={x.id} type="button" onClick={() => setSide(x.id)} className={`h-11 rounded-[0.875rem] text-[0.9688rem] font-bold ${side === x.id ? "bg-surface text-ink shadow-card" : "text-muted"}`}>
            {x.label}
          </button>
        ))}
      </div>

      {side === "items" ? (
        <>
          <p className="mt-3 shrink-0 text-[0.9062rem] leading-snug text-muted">{t.storeMineWhat}</p>
          <ul data-list className="mt-3 min-h-0 flex-1 space-y-2 overflow-y-auto overscroll-contain pb-1">
            {items.length === 0 ? (
              <li className="rounded-[1.25rem] bg-surface p-4 text-[0.9375rem] text-muted shadow-card">{t.storeEmptyOwner}</li>
            ) : (
              items.map((r) => (
                <li key={r.id} className={`flex items-center gap-2 rounded-[1.25rem] bg-surface p-2.5 ps-4 shadow-card ${editing === r.id ? "ring-2 ring-brand" : ""}`}>
                  <button
                    type="button"
                    onClick={() => {
                      setEditing(r.id);
                      setName(r.name);
                      setCost(String(r.cost));
                      setErr(null);
                    }}
                    className="flex min-w-0 flex-1 items-center gap-2 text-start"
                  >
                    <bdi className="min-w-0 flex-1 truncate text-[1.0312rem] font-bold">{r.name}</bdi>
                    <span className="flex shrink-0 items-center gap-1 text-[0.9062rem] font-bold text-brand">
                      <Coins className="size-4" /> {pointsSaid(r.cost)}
                    </span>
                    <Pencil className="size-4 shrink-0 text-faint" />
                  </button>
                  <button type="button" onClick={() => void drop(r)} disabled={busy} aria-label={`${r.name} ×`} className="press grid size-10 shrink-0 place-items-center rounded-full text-muted hover:bg-coral-soft hover:text-coral disabled:opacity-50">
                    <X className="size-4" />
                  </button>
                </li>
              ))
            )}
          </ul>

          {/* one line to add (or, a thing tapped, to change it): its name, its price */}
          <form
            className="mt-3 shrink-0 rounded-[1.25rem] bg-surface p-3 shadow-card"
            onSubmit={(e) => {
              e.preventDefault();
              void save();
            }}
          >
            <div className="flex gap-2">
              {/* 17px: under 16px an iPhone zooms in on the field */}
              <input value={name} onChange={(e) => setName(e.target.value)} maxLength={40} dir="auto" placeholder={t.storeNamePh} aria-label={t.storeName} className="h-12 min-w-0 flex-1 rounded-[0.875rem] bg-canvas px-3.5 text-[17px] outline-none focus:ring-2 focus:ring-brand" />
              <input
                value={cost}
                onChange={(e) => setCost(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                pattern="[0-9]*"
                placeholder="50"
                aria-label={t.storeCost}
                className="num h-12 w-[5.5rem] shrink-0 rounded-[0.875rem] bg-canvas px-3 text-center text-[17px] font-bold outline-none focus:ring-2 focus:ring-brand"
              />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="min-w-0 flex-1 truncate text-[0.8125rem] font-semibold text-muted">{t.storeCost}</span>
              {editing !== null && (
                <button
                  type="button"
                  onClick={() => {
                    setEditing(null);
                    setName("");
                    setCost("");
                    setErr(null);
                  }}
                  className="press h-10 rounded-[0.875rem] px-3 text-[0.875rem] font-bold text-muted"
                >
                  {t.storeCancel}
                </button>
              )}
              <button type="submit" disabled={busy} className="press flex h-10 items-center gap-1.5 rounded-[0.875rem] bg-brand px-4 text-[0.9375rem] font-bold text-white disabled:opacity-60">
                {editing === null && <Plus className="size-4" strokeWidth={3} />}
                {busy ? "…" : editing === null ? t.storeAdd : t.storeSave}
              </button>
            </div>
            {err && <p className="mt-1.5 text-[0.8438rem] font-semibold text-coral">{err}</p>}
          </form>
        </>
      ) : (
        <>
          {log && log.count > 0 ? (
            <>
              <p className="mt-3 shrink-0 text-[0.9375rem] font-bold">{fill(t.storeLogTotal, { count: log.count, points: log.spent })}</p>
              {/* each thing, how many times */}
              <div className="-mx-1 mt-2 flex shrink-0 gap-2 overflow-x-auto px-1 pb-1 [scrollbar-width:none]">
                {log.by_thing.map((x) => (
                  <span key={x.name} className="shrink-0 rounded-full bg-surface px-3 py-1.5 text-[0.8438rem] font-semibold shadow-card">
                    <bdi>{x.name}</bdi> <span className="num font-bold text-brand">×{x.n}</span>
                  </span>
                ))}
              </div>
              <ul data-list data-clarity-mask="true" className="mt-2 min-h-0 flex-1 divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.375rem] bg-surface shadow-card">
                {log.lines.map((l) => (
                  <li key={l.id} className="flex items-center gap-3 px-4 py-3">
                    <span className="min-w-0 flex-1">
                      <bdi className="block truncate text-[0.9688rem] font-bold">{l.name}</bdi>
                      <span className="block truncate text-[0.7812rem] text-muted">
                        {l.who ?? t.someone}
                        {l.phone ? (
                          <>
                            {" · "}
                            <span dir="ltr" className="num inline-block">
                              {l.phone}
                            </span>
                          </>
                        ) : null}
                        {" · "}
                        {when(l.at)}
                      </span>
                    </span>
                    <span className="num shrink-0 text-[0.9375rem] font-bold text-coral">−{l.cost}</span>
                  </li>
                ))}
              </ul>
            </>
          ) : (
            <p className="mt-4 rounded-[1.25rem] bg-surface p-4 text-[0.9375rem] text-muted shadow-card">{t.storeLogEmpty}</p>
          )}
        </>
      )}
    </div>
  );
}
