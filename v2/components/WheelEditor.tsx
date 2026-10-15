"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronLeft, Minus, Plus, X } from "lucide-react";
import { wheelSave } from "@/app/actions-wheel";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { Wheel, type Prize } from "@/components/Wheel";
import { stampsN, t } from "@/lib/t";

type Row = { key: string; id?: number; name: string; chance: number };

/** the chances shared out evenly, the rest on the first ones, 100 in all */
const even = (rows: Row[]): Row[] => {
  const base = Math.floor(100 / rows.length);
  const rest = 100 - base * rows.length;
  return rows.map((r, i) => ({ ...r, chance: base + (i < rest ? 1 : 0) }));
};

/**
 * The owner's wheel (a shop the founder switched to it): the prizes a full
 * card can win, each with its chance in percent — 100 in all, shown as it
 * goes, with one tap to share them out evenly — and the wheel itself as the
 * customers will see it. The card's goal stays on «الكارط».
 */
export function WheelEditor({ prizes, fell, goal, first = false }: { prizes: Prize[]; fell: { name: string; n: number }[]; goal: number | null; first?: boolean }) {
  useScreen("wheel");
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => prizes.map((p) => ({ key: `p${p.id}`, id: p.id, name: p.name, chance: p.chance })));
  const [fresh, setFresh] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const sum = rows.reduce((n, r) => n + r.chance, 0);
  const touch = (next: Row[]) => {
    setRows(next);
    setDirty(true);
    setSaved(false);
    setError(null);
  };
  const add = () => {
    const name = fresh.trim().slice(0, 40);
    if (!name || rows.length >= 12) return;
    touch(even([...rows, { key: `n${rows.length}-${name}`, name, chance: 0 }]));
    setFresh("");
  };
  const save = () =>
    start(async () => {
      const res = await wheelSave(rows.map((r) => ({ id: r.id, name: r.name, chance: r.chance })));
      if (!res.ok || !res.prizes) {
        setError(res.error === "sum" ? t.wheelSumBad : res.error === "count" ? t.wheelCount : t.storeErr);
        return;
      }
      setRows(res.prizes.map((p) => ({ key: `p${p.id}`, id: p.id, name: p.name, chance: p.chance })));
      setDirty(false);
      setSaved(true);
      // the shop's first set-up: that was the last thing to choose — home, with its welcome
      if (first) router.push("/shop?welcome=1");
      else router.refresh();
    });

  return (
    <>
      <Top back={first ? "/shop/card" : "/shop"} title={t.wheelOwnerTitle} hint={first ? undefined : t.wheelOwnerHint} />
      {first && (
        <>
          <p className="mt-1 shrink-0 text-[0.9375rem] font-semibold text-brand">الخطوة 2 من 2</p>
          <h1 className="shrink-0 text-balance text-[1.25rem] font-bold leading-tight">شنوّة يربح الحريف في الروليت؟</h1>
          <p className="shrink-0 text-[0.8125rem] text-muted">اكتب الكادوات، وقدّاش حظ كل وحدة (المجموع 100%)</p>
        </>
      )}

      {/* the wheel as the customers will see it (it does not turn here) */}
      {rows.length >= 2 && (
        <div className="pointer-events-none mx-auto mt-[1.5dvh] shrink-0 opacity-95 [@media(max-height:640px)]:hidden" aria-hidden>
          <Wheel prizes={rows} size="min(46vw, 22dvh, 12rem)" spin={async () => null} onDone={() => {}} label="" />
        </div>
      )}

      <section className="mt-[1.5dvh] flex min-h-0 flex-1 flex-col">
        <div data-list className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
          {rows.length === 0 && <p className="px-4 pb-1 pt-4 text-center text-[0.9375rem] text-muted">حتى كادو مازال: اكتب أوّل واحد لتحت</p>}
          <ul className="divide-y divide-line">
            {rows.map((x) => (
              <li key={x.key} className="flex items-center gap-2 px-3 py-2">
                <input
                  value={x.name}
                  onChange={(e) => touch(rows.map((r) => (r.key === x.key ? { ...r, name: e.target.value.slice(0, 40) } : r)))}
                  aria-label={t.wheelPrize}
                  className="h-10 min-w-0 flex-1 rounded-[0.75rem] bg-canvas px-3 text-[0.9375rem] font-semibold outline-none focus:ring-2 focus:ring-brand/40"
                />
                <span className="flex shrink-0 items-center gap-1" dir="ltr">
                  <button type="button" onClick={() => touch(rows.map((r) => (r.key === x.key ? { ...r, chance: Math.max(1, r.chance - 5) } : r)))} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="-5%">
                    <Minus className="size-4" />
                  </button>
                  <span className="num w-12 rounded-[0.625rem] bg-brand-soft py-1.5 text-center text-[0.9375rem] font-bold text-brand">{x.chance}%</span>
                  <button type="button" onClick={() => touch(rows.map((r) => (r.key === x.key ? { ...r, chance: Math.min(100, r.chance + 5) } : r)))} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="+5%">
                    <Plus className="size-4" />
                  </button>
                </span>
                <button type="button" onClick={() => touch(rows.filter((r) => r.key !== x.key))} className="press grid size-9 shrink-0 place-items-center rounded-full text-muted hover:text-coral" aria-label="X">
                  <X className="size-4" />
                </button>
              </li>
            ))}
            {rows.length < 12 && (
              <li className="flex items-center gap-2 px-3 py-2">
                <input
                  value={fresh}
                  onChange={(e) => setFresh(e.target.value)}
                  onKeyDown={(e) => e.key === "Enter" && add()}
                  placeholder={t.wheelAdd}
                  className="h-10 min-w-0 flex-1 rounded-[0.75rem] border-2 border-dashed border-line bg-transparent px-3 text-[0.9375rem] outline-none focus:border-brand"
                />
                <button type="button" onClick={add} disabled={!fresh.trim()} className="press flex h-10 shrink-0 items-center gap-1 rounded-[0.75rem] bg-brand px-3.5 text-[0.9375rem] font-bold text-white disabled:opacity-40">
                  <Plus className="size-4" /> {t.wheelAdd}
                </button>
              </li>
            )}
          </ul>
        </div>

        {/* 100% in all: said as it goes, and one tap to share it out */}
        <div className="mt-2 flex shrink-0 items-center justify-between gap-2 px-0.5">
          <span className={`text-[0.9375rem] font-bold ${sum === 100 ? "text-mint" : "text-coral"}`}>
            {t.wheelTotal}: <span className="num">{sum}%</span>
          </span>
          {rows.length >= 2 && sum !== 100 && (
            <button type="button" onClick={() => touch(even(rows))} className="press h-9 rounded-full bg-brand-soft px-3.5 text-[0.8125rem] font-bold text-brand">
              {t.wheelEven}
            </button>
          )}
        </div>

        {fell.length > 0 && (
          <div className="-mx-5 mt-1.5 flex shrink-0 gap-1.5 overflow-x-auto px-5 [scrollbar-width:none]">
            <span className="shrink-0 self-center text-[0.75rem] font-semibold text-muted">{t.wheelFell}</span>
            {fell.map((x) => (
              <span key={x.name} className="flex shrink-0 items-center gap-1 rounded-full bg-surface px-3 py-1 text-[0.8125rem] font-bold shadow-card">
                <bdi>{x.name}</bdi> <span className="num text-brand">×{x.n}</span>
              </span>
            ))}
          </div>
        )}

        <div className="shrink-0 pb-3 pt-2">
          {error && <p className="mb-1.5 text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
          <Btn type="button" onClick={save} disabled={pending || !dirty || sum !== 100 || rows.length < 2}>
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
          {/* the card's goal: how many tampons for a turn */}
          {!first && (
          <Link href="/shop/card" className="mt-1 flex items-center justify-center gap-1 py-1.5 text-[0.8125rem] font-semibold text-brand">
            {t.wheelEditCard} {goal ? <span className="text-muted">({stampsN(goal)})</span> : null} <ChevronLeft className="size-4" />
          </Link>
          )}
        </div>
      </section>
    </>
  );
}

