"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ShoppingBag } from "lucide-react";
import { adminSetStore } from "@/app/actions-store";

/**
 * The founder's switch for one shop: its card, or the store. Asked once
 * before it turns, because the customers' screen changes with it: in the
 * store the tampons are kept and spent on the owner's things instead of
 * filling a card to a gift. Other shops, and the same customers' other
 * cards, never change.
 */
export function AdminStoreSwitch({ id, on, hasCard }: { id: string; on: boolean; hasCard: boolean }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const flip = () =>
    start(async () => {
      const res = await adminSetStore(id, !on);
      if (!res.ok) setError(res.error === "no_card" ? "المحل ما عندوش كارط: لازمو يعمل الكارط قبل" : "ما تعدّاتش، عاود");
      else {
        setError(null);
        setAsk(false);
        router.refresh();
      }
    });

  return (
    <div className="space-y-2">
      <div className="flex items-start gap-3">
        <span className={`grid size-10 shrink-0 place-items-center rounded-[0.75rem] ${on ? "bg-brand text-white" : "bg-canvas text-muted"}`}>
          <ShoppingBag className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-[0.8438rem] leading-relaxed text-body">
          {on
            ? "الماغازة مخدومة: التامبونات يتلمّو ويقعدو، والحريف يشري بيهم الحاجات اللي المولى حطّها. الكارط والكادو مخبّيين."
            : "المحل خدّام بالكارط العادية. كي تخدم الماغازة: التامبونات يتلمّو، والحريف يشري بيهم حاجات (برشا حاجات مرّة وحدة)، والمولى يسلّمهم كي يسكانيلو الكود."}
        </p>
      </div>
      {ask ? (
        <div className="rounded-[0.75rem] bg-canvas p-3 text-center">
          <p className="text-[0.8438rem] font-semibold text-ink">{on ? "ترجّع المحل للكارط العادية؟ التامبونات اللي عند الحرفاء يقعدو على الكارط." : "تخدم الماغازة للمحل هذا؟ الحرفاء متاعو بركا يتبدّللهم الإيكران."}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsk(false)} className="h-9 rounded-[0.625rem] bg-surface text-[0.8438rem] font-semibold">
              رجوع
            </button>
            <button type="button" disabled={pending} onClick={flip} className="h-9 rounded-[0.625rem] bg-brand text-[0.8438rem] font-bold text-white disabled:opacity-60">
              {pending ? "…" : on ? "رجّعو للكارط" : "خدّم الماغازة"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsk(true)}
          className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[0.625rem] text-[0.8438rem] font-semibold transition-colors disabled:opacity-50 ${on ? "border border-line bg-surface text-body hover:border-coral hover:text-coral" : "bg-brand text-white hover:bg-brand-deep"}`}
        >
          {on ? "رجّعو للكارط العادية" : "خدّم الماغازة"}
        </button>
      )}
      {/* a shop with no card yet starts straight on this: one short set-up, nothing else */}
      {!hasCard && <p className="text-center text-[0.75rem] text-muted">المحل مازال ما عملش الكارط: كي يدخل، يحطّ الحاجات متاع الماغازة وهذا كل شي.</p>}
      {error && <p className="text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
    </div>
  );
}
