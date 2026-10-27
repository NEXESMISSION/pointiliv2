"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Check, ChevronLeft, Minus, Plus, X } from "lucide-react";
import { setWheel, wheelSave } from "@/app/actions-wheel";
import { Switch } from "@/components/Owner";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { Wheel, WheelHow, type Prize } from "@/components/Wheel";
import { stampsN, t } from "@/lib/t";

/** a prize being edited: `stock` how many are left to give (null: no limit) */
type Row = { key: string; id?: number; name: string; chance: number; stock: number | null };
const rowOf = (p: Prize): Row => ({ key: `p${p.id}`, id: p.id, name: p.name, chance: p.chance, stock: p.stock ?? null });

/** the chances shared out evenly, the rest on the first ones, 100 in all */
const even = (rows: Row[]): Row[] => {
  const base = Math.floor(100 / rows.length);
  const rest = 100 - base * rows.length;
  return rows.map((r, i) => ({ ...r, chance: base + (i < rest ? 1 : 0) }));
};

/**
 * The owner's wheel (a shop the founder allowed it): the switch that turns
 * it on for his customers — a full card is then a turn («دورة»), not the
 * card's gift — the prizes it can give, each with its chance in percent —
 * 100 in all, shown as it goes, with one tap to share them out evenly — and
 * how many of it the owner has to give (27 Oct 2026: empty is no limit, one
 * prize at least stays so; each that falls takes one off, and at 0 it leaves
 * the wheel until he writes a new number) — and
 * the wheel itself as the customers will see it. The card's goal stays on
 * «الكارط». On only with two prizes saved; off, a card made on the wheel
 * goes to «الكارط» for a gift of its own.
 */
export function WheelEditor({ prizes, fell, goal, first = false, on: onAtFirst = false, gift = null }: { prizes: Prize[]; fell: { name: string; n: number }[]; goal: number | null; first?: boolean; on?: boolean; gift?: string | null }) {
  useScreen("wheel");
  const router = useRouter();
  const [rows, setRows] = useState<Row[]>(() => prizes.map(rowOf));
  const [fresh, setFresh] = useState("");
  const [dirty, setDirty] = useState(false);
  const [saved, setSaved] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();
  const [on, setOn] = useState(onAtFirst);
  const [flipping, flip] = useTransition();
  const [flipErr, setFlipErr] = useState<string | null>(null);
  // how the wheel works, from the «؟» in the header
  const [how, setHow] = useState(false);
  // the switch needs two prizes saved (what the customers would spin is what is saved, not what is typed)
  const canOn = prizes.length >= 2 || (saved && rows.length >= 2);
  const toggle = () =>
    flip(async () => {
      const next = !on;
      const res = await setWheel(next);
      if (!res.ok) {
        setFlipErr(res.error === "no_prizes" ? t.wheelNeedPrizes : res.error === "no_card" ? t.wheelNeedCard : t.storeErr);
        return;
      }
      setFlipErr(null);
      setOn(next);
      // off, and the card was made on the wheel: it needs a gift of its own
      if (!next && (!gift || gift === "الروليت")) router.push("/shop/card");
      else router.refresh();
    });

  const sum = rows.reduce((n, r) => n + r.chance, 0);
  // the wheel as the customers see it: a prize run out is not on it
  const live = rows.filter((r) => r.stock !== 0);
  const touch = (next: Row[]) => {
    setRows(next);
    setDirty(true);
    setSaved(false);
    setError(null);
  };
  const add = () => {
    const name = fresh.trim().slice(0, 40);
    if (!name || rows.length >= 12) return;
    touch(even([...rows, { key: `n${rows.length}-${name}`, name, chance: 0, stock: null }]));
    setFresh("");
  };
  const save = () =>
    start(async () => {
      // every prize with a number: the wheel would empty itself one day — said before asking the server
      if (rows.every((r) => r.stock !== null)) {
        setError(t.wheelNeedOpen);
        return;
      }
      const res = await wheelSave(rows.map((r) => ({ id: r.id, name: r.name, chance: r.chance, stock: r.stock })));
      if (!res.ok || !res.prizes) {
        setError(res.error === "sum" ? t.wheelSumBad : res.error === "count" ? t.wheelCount : res.error === "need_open" ? t.wheelNeedOpen : t.storeErr);
        return;
      }
      setRows(res.prizes.map(rowOf));
      setDirty(false);
      setSaved(true);
      // the shop's first set-up: that was the last thing to choose — the clips, then the code (as after any first card)
      if (first) router.push("/shop/start");
      else router.refresh();
    });

  return (
    <>
      <Top
        back={first ? "/shop/card" : "/shop"}
        title={t.wheelOwnerTitle}
        hint={first ? undefined : t.wheelOwnerHint}
        // the same three lines as in the card's question: how it works, wherever the wheel is
        end={
          <button type="button" onClick={() => setHow(true)} aria-label={t.wheelHowTitle} className="press grid size-11 shrink-0 place-items-center rounded-full bg-surface text-[1.125rem] font-bold text-brand shadow-card">
            <span aria-hidden>؟</span>
          </button>
        }
      />
      {how && <WheelHow goal={goal ?? 0} prizes={live.map((r) => ({ name: r.name, chance: r.chance }))} onClose={() => setHow(false)} />}
      {first && (
        <>
          <p className="mt-1 shrink-0 text-[0.9375rem] font-semibold text-brand">الخطوة 2 من 2</p>
          <h1 className="shrink-0 text-balance text-[1.25rem] font-bold leading-tight">شنوّة يربح الحريف في الروليت؟</h1>
          <p className="shrink-0 text-[0.8125rem] text-muted">اكتب الكادوات، قدّاش حظ كل وحدة (المجموع 100%)، وكان تحب قدّاش عندك منها</p>
        </>
      )}

      {/* on or off for the customers: one switch, said plainly */}
      {!first && (
        <div className="mt-[1.2dvh] flex shrink-0 items-center gap-3 rounded-[1.25rem] bg-surface p-3.5 shadow-card">
          <span className="min-w-0 flex-1">
            <b className="block text-[0.9375rem] font-bold">{t.wheelSwitch}</b>
            <span className="block text-[0.8125rem] leading-snug text-muted">{flipErr ?? (on ? t.wheelSwitchOn : canOn ? t.wheelSwitchOff : t.wheelNeedPrizes)}</span>
          </span>
          <Switch on={on} onClick={toggle} label={t.wheelSwitch} disabled={flipping || (!on && !canOn)} />
        </div>
      )}

      {/* the wheel as the customers will see it (it does not turn here) */}
      {live.length >= 2 && (
        <div className="pointer-events-none mx-auto mt-[1.5dvh] shrink-0 opacity-95 [@media(max-height:640px)]:hidden" aria-hidden>
          <Wheel prizes={live} size="min(46vw, 22dvh, 12rem)" spin={async () => null} onDone={() => {}} label="" />
        </div>
      )}

      <section className="mt-[1.5dvh] flex min-h-0 flex-1 flex-col">
        <div data-list className="min-h-0 flex-1 overflow-y-auto overscroll-contain rounded-[1.25rem] bg-surface shadow-card">
          {rows.length === 0 && <p className="px-4 pb-1 pt-4 text-center text-[0.9375rem] text-muted">حتى كادو مازال: اكتب أوّل واحد لتحت</p>}
          <ul className="divide-y divide-line">
            {rows.map((x) => (
              <li key={x.key} className="px-3 py-2">
                <div className="flex items-center gap-2">
                  <input
                    value={x.name}
                    onChange={(e) => touch(rows.map((r) => (r.key === x.key ? { ...r, name: e.target.value.slice(0, 40) } : r)))}
                    aria-label={t.wheelPrize}
                    className={`h-10 min-w-0 flex-1 rounded-[0.75rem] bg-canvas px-3 text-[0.9375rem] font-semibold outline-none focus:ring-2 focus:ring-brand/40 ${x.stock === 0 ? "text-muted line-through decoration-coral/60" : ""}`}
                  />
                  <button type="button" onClick={() => touch(rows.filter((r) => r.key !== x.key))} className="press grid size-9 shrink-0 place-items-center rounded-full text-muted hover:text-coral" aria-label="X">
                    <X className="size-4" />
                  </button>
                </div>
                <div className="mt-1.5 flex items-center gap-2">
                  <span className="flex shrink-0 items-center gap-1" dir="ltr">
                    <button type="button" onClick={() => touch(rows.map((r) => (r.key === x.key ? { ...r, chance: Math.max(1, r.chance - 5) } : r)))} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="-5%">
                      <Minus className="size-4" />
                    </button>
                    <span className="num w-12 rounded-[0.625rem] bg-brand-soft py-1.5 text-center text-[0.9375rem] font-bold text-brand">{x.chance}%</span>
                    <button type="button" onClick={() => touch(rows.map((r) => (r.key === x.key ? { ...r, chance: Math.min(100, r.chance + 5) } : r)))} className="press grid size-9 place-items-center rounded-full bg-canvas" aria-label="+5%">
                      <Plus className="size-4" />
                    </button>
                  </span>
                  {/* how many of it to give: empty is no limit; at 0 it is off the wheel until a new number */}
                  <label className="ms-auto flex min-w-0 items-center gap-1.5">
                    {x.stock === 0 ? <span className="shrink-0 rounded-full bg-coral-soft px-2 py-0.5 text-[0.75rem] font-bold text-coral">{t.wheelOut}</span> : <span className="shrink-0 text-[0.8125rem] font-semibold text-muted">{t.wheelStock}</span>}
                    <input
                      value={x.stock ?? ""}
                      onChange={(e) => {
                        const d = e.target.value.replace(/\D/g, "").slice(0, 4);
                        touch(rows.map((r) => (r.key === x.key ? { ...r, stock: d === "" ? null : Number(d) } : r)));
                      }}
                      inputMode="numeric"
                      placeholder={t.wheelNoLimit}
                      aria-label={`${t.wheelStock}: ${x.name}`}
                      className="h-9 w-[4.75rem] shrink-0 rounded-[0.625rem] bg-canvas text-center text-[0.9375rem] font-bold outline-none placeholder:text-[0.8125rem] placeholder:font-semibold placeholder:text-faint focus:ring-2 focus:ring-brand/40"
                    />
                  </label>
                </div>
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

