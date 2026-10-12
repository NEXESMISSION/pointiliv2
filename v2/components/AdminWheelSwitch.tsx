"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Disc3 } from "lucide-react";
import { adminSetWheel } from "@/app/actions-wheel";

/**
 * The founder's switch for one shop: its gift, or the wheel. Asked once
 * before it turns. On the wheel, a full card is a turn of the owner's wheel
 * (prizes and chances the owner writes) instead of the one gift; the card
 * itself stays the same. It turns the store off, if it was on.
 */
export function AdminWheelSwitch({ id, on, hasCard, store }: { id: string; on: boolean; hasCard: boolean; store: boolean }) {
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const router = useRouter();

  const flip = () =>
    start(async () => {
      const res = await adminSetWheel(id, !on);
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
          <Disc3 className="size-5" />
        </span>
        <p className="min-w-0 flex-1 text-[0.8438rem] leading-relaxed text-body">
          {on
            ? "الروليت مخدومة: الحريف يكمّل الكارط كالعادة، وفي بلاصة الكادو يدوّر الروليت متاع المولى (الكادوات والحظ اللي حطّهم)، ويلمّ اللي طاحلو بالكود."
            : "المحل خدّام بالكادو العادي. كي تخدم الروليت: الكارط كيف ما هي، أما كي يكمّلها الحريف يدوّر روليت فيها الكادوات اللي يحطّهم المولى، كل وحدة بالحظ متاعها."}
          {!on && store && <span className="block font-semibold text-coral">الماغازة مخدومة: كي تخدم الروليت، الماغازة تتسكّر.</span>}
        </p>
      </div>
      {ask ? (
        <div className="rounded-[0.75rem] bg-canvas p-3 text-center">
          <p className="text-[0.8438rem] font-semibold text-ink">{on ? "ترجّع المحل للكادو العادي؟ الروليت اللي مازالت ما تدوّرتش تقعد تستنّى." : "تخدم الروليت للمحل هذا؟ الحرفاء متاعو بركا يتبدّللهم الكادو."}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsk(false)} className="h-9 rounded-[0.625rem] bg-surface text-[0.8438rem] font-semibold">
              رجوع
            </button>
            <button type="button" disabled={pending} onClick={flip} className="h-9 rounded-[0.625rem] bg-brand text-[0.8438rem] font-bold text-white disabled:opacity-60">
              {pending ? "…" : on ? "رجّعو للكادو" : "خدّم الروليت"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsk(true)}
          className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[0.625rem] text-[0.8438rem] font-semibold transition-colors disabled:opacity-50 ${on ? "border border-line bg-surface text-body hover:border-coral hover:text-coral" : "bg-brand text-white hover:bg-brand-deep"}`}
        >
          {on ? "رجّعو للكادو العادي" : "خدّم الروليت"}
        </button>
      )}
      {/* a shop with no card yet starts straight on this: one short set-up, nothing else */}
      {!hasCard && <p className="text-center text-[0.75rem] text-muted">المحل مازال ما عملش الكارط: كي يدخل، يختار قدّاش من تامبون والكادوات متاع الروليت، وهذا كل شي.</p>}
      {error && <p className="text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
    </div>
  );
}
