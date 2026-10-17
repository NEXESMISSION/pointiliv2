"use client";

import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { Check, ChevronDown } from "lucide-react";
import { markSeen, setMomentItem } from "@/app/actions";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { signal } from "@/lib/track";

export type FixStamp = { id: number; at: string; name: string | null; phone: string | null; item: number | null; item_name: string | null };
type Item = { id: number; name: string };

const TZ = "Africa/Tunis";
const time = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23", timeZone: TZ }).format(new Date(iso));

/** the first time here: what this page is for, in three short lines and one button */
function Tip({ onDone }: { onDone: () => void }) {
  const said = useRef(false);
  useEffect(() => {
    if (said.current) return;
    said.current = true;
    void markSeen("fix_tip").catch(() => {});
  }, []);
  const steps = [
    { text: "غلطت وعطيت التامبون على حاجة موش هي؟ عادي." },
    { text: "اختار التامبون من الليستة (آخر جمعة)." },
    { text: "اختار الحاجة الصحيحة. تتبدّل وحدها، والتامبون يقعد كيف ما هو." },
  ];
  return (
    <div className="fixed inset-0 z-50 flex animate-fade items-end justify-center bg-ink/45 sm:items-center" role="dialog" aria-modal="true" aria-label="بدّل الحاجة">
      <div className="safe-b w-full max-w-md rounded-t-[1.75rem] bg-canvas px-5 pb-5 pt-6 sm:rounded-[1.75rem]" style={{ animation: "fix-up 380ms cubic-bezier(0.2,0.8,0.2,1) both" }}>
        <style>{`@keyframes fix-up { from { transform: translateY(40px); opacity: 0; } to { transform: none; opacity: 1; } }`}</style>
        <h2 className="text-center text-[1.25rem] font-bold">تنجم تبدّل الحاجة متاع أي تامبون</h2>
        <ol className="mt-4 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex animate-rise items-center gap-3 rounded-[1.125rem] bg-surface p-3 shadow-card" style={{ animationDelay: `${120 + i * 120}ms` }}>
              <span className="num grid size-9 shrink-0 place-items-center rounded-full bg-brand text-[0.9375rem] font-bold text-white">{i + 1}</span>
              <span className="min-w-0 flex-1 text-[0.9375rem] leading-snug">{s.text}</span>
            </li>
          ))}
        </ol>
        <Btn type="button" className="mt-5" onClick={onDone}>
          فهمت
        </Btn>
      </div>
    </div>
  );
}

/**
 * Put a tampon right: the latest tampons (a week back), each with the thing it
 * was written for; a tap opens the shop's things under it, a tap on the right
 * one changes it — at once, said with a tick. Nothing else about the tampon
 * changes. The first time, a short note says what the page is for.
 */
export function FixItems({ stamps: first, items, tip, focus }: { stamps: FixStamp[]; items: Item[]; tip: boolean; focus?: number | null }) {
  useScreen("fix");
  const [stamps, setStamps] = useState(first);
  const [open, setOpen] = useState<number | null>(focus && first.some((s) => s.id === focus) ? focus : null);
  const [done, setDone] = useState<number | null>(null);
  const [showTip, setShowTip] = useState(tip);
  const [error, setError] = useState<string | null>(null);
  const [pending, start] = useTransition();

  const change = (stamp: FixStamp, item: Item) =>
    start(async () => {
      if (stamp.item === item.id) return setOpen(null);
      const ok = await setMomentItem(stamp.id, item.id);
      if (!ok) return setError("ما تبدّلتش، عاود");
      setError(null);
      setStamps((all) => all.map((s) => (s.id === stamp.id ? { ...s, item: item.id, item_name: item.name } : s)));
      setOpen(null);
      setDone(stamp.id);
      navigator.vibrate?.(40);
      signal("fix_item", item.name);
      setTimeout(() => setDone((d) => (d === stamp.id ? null : d)), 2200);
    });

  return (
    <>
      <Top back="/shop" title="بدّل الحاجة" hint="غلطت في الحاجة؟ اختار التامبون وبدّلها" />
      {items.length === 0 ? (
        <div className="my-auto text-center">
          <p className="text-[0.9375rem] text-muted">ما عندكش حاجات مكتوبة في «شنوّة تبيع».</p>
          <Link href="/shop/items" className="press mt-3 inline-flex h-11 items-center rounded-full bg-brand px-5 text-[0.9375rem] font-bold text-white">
            شنوّة تبيع
          </Link>
        </div>
      ) : stamps.length === 0 ? (
        <p className="my-auto text-center text-[0.9375rem] text-muted">حتى تامبون هالجمعة</p>
      ) : (
        <ul data-list className="mb-3 mt-[2dvh] min-h-0 shrink divide-y divide-line overflow-y-auto overscroll-contain rounded-[1.375rem] bg-surface shadow-card">
          {stamps.map((s) => (
            <li key={s.id} className={done === s.id ? "bg-mint-soft transition-colors" : ""}>
              <button type="button" onClick={() => setOpen(open === s.id ? null : s.id)} aria-expanded={open === s.id} className="flex w-full items-center gap-3 px-3.5 py-3 text-start">
                <span className="grid size-10 shrink-0 place-items-center rounded-full bg-[linear-gradient(145deg,#ffb18a,#ff6b4a)] text-[0.9375rem] font-bold text-white">{(s.name?.[0] ?? "؟").toUpperCase()}</span>
                <span className="min-w-0 flex-1">
                  <span className="block truncate text-[0.9375rem] font-semibold">{s.name ?? "حريف"}</span>
                  <span className="block text-[0.8125rem] text-muted">{time(s.at)}</span>
                </span>
                {done === s.id ? (
                  <span className="flex shrink-0 animate-pop items-center gap-1 rounded-full bg-mint px-3 py-1 text-[0.8125rem] font-bold text-white">
                    <Check className="size-4" strokeWidth={3} /> {s.item_name}
                  </span>
                ) : (
                  <span className={`shrink-0 rounded-full px-3 py-1 text-[0.8125rem] font-bold ${s.item_name ? "bg-brand-soft text-brand" : "bg-canvas text-faint"}`}>
                    <bdi>{s.item_name ?? "بلا حاجة"}</bdi>
                  </span>
                )}
                <ChevronDown className={`size-4 shrink-0 text-muted transition-transform ${open === s.id ? "rotate-180" : ""}`} />
              </button>
              {open === s.id && (
                <div className="animate-rise px-3.5 pb-3.5">
                  <p className="mb-2 text-[0.8125rem] font-semibold text-muted">التامبون هذا كان على:</p>
                  <div className="grid grid-cols-3 gap-1.5">
                    {items.map((it) => (
                      <button
                        key={it.id}
                        type="button"
                        disabled={pending}
                        onClick={() => change(s, it)}
                        className={`press min-h-[2.75rem] rounded-[0.875rem] px-2 text-[0.9375rem] font-bold leading-tight disabled:opacity-60 ${s.item === it.id ? "bg-brand text-white" : "bg-canvas text-ink"}`}
                      >
                        <span className="line-clamp-2">{it.name}</span>
                      </button>
                    ))}
                  </div>
                </div>
              )}
            </li>
          ))}
        </ul>
      )}
      {error && <p className="mb-3 text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
      {showTip && <Tip onDone={() => setShowTip(false)} />}
    </>
  );
}
