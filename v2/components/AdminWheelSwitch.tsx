"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Disc3 } from "lucide-react";
import { adminSetWheel } from "@/app/actions-wheel";

/**
 * The founder's switch for one shop: the wheel allowed, or not. Asked once
 * before it turns. Allowed, the owner finds «الروليت» in his shop's settings:
 * he writes the prizes and turns it on for his customers himself (then a
 * full card is a turn — «دورة» — instead of the one gift). Taken away, it is
 * off too; the turns already won stay, to be spun. `on` is «allowed».
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
            ? "الروليت مسموحة للمحل هذا: المولى يلقاها في «الريڤلاج»، يحطّ الكادوات ويخدّمها للحرفاء وقتلّي يحب. كي تكون مخدومة، الحريف كي يكمّل الكارط ياخو دورة في بلاصة الكادو."
            : "الروليت موش مسموحة للمحل هذا. كي تسمحلو: المولى يلقى «الروليت» في الريڤلاج، يحطّ الكادوات، ويخدّمها هو للحرفاء متاعو."}
          {!on && store && <span className="block font-semibold text-coral">الماغازة مخدومة: المولى ما ينجمش يخدّم الروليت مادامها مخدومة.</span>}
        </p>
      </div>
      {ask ? (
        <div className="rounded-[0.75rem] bg-canvas p-3 text-center">
          <p className="text-[0.8438rem] font-semibold text-ink">{on ? "تنحّي الروليت للمحل هذا؟ تتطفى للحرفاء، والدورات اللي ربحوها تقعد تستنّى." : "تسمح بالروليت للمحل هذا؟ المولى هو اللي يخدّمها للحرفاء."}</p>
          <div className="mt-2.5 grid grid-cols-2 gap-2">
            <button type="button" onClick={() => setAsk(false)} className="h-9 rounded-[0.625rem] bg-surface text-[0.8438rem] font-semibold">
              رجوع
            </button>
            <button type="button" disabled={pending} onClick={flip} className="h-9 rounded-[0.625rem] bg-brand text-[0.8438rem] font-bold text-white disabled:opacity-60">
              {pending ? "…" : on ? "نحّي الروليت" : "اسمح بالروليت"}
            </button>
          </div>
        </div>
      ) : (
        <button
          type="button"
          onClick={() => setAsk(true)}
          className={`flex h-9 w-full items-center justify-center gap-1.5 rounded-[0.625rem] text-[0.8438rem] font-semibold transition-colors disabled:opacity-50 ${on ? "border border-line bg-surface text-body hover:border-coral hover:text-coral" : "bg-brand text-white hover:bg-brand-deep"}`}
        >
          {on ? "نحّي الروليت" : "اسمح بالروليت"}
        </button>
      )}
      {/* a shop with no card yet starts straight on this: one short set-up, nothing else */}
      {!hasCard && <p className="text-center text-[0.75rem] text-muted">المحل مازال ما عملش الكارط: لازمو يعملها قبل ما يخدّم الروليت.</p>}
      {error && <p className="text-center text-[0.8125rem] font-semibold text-coral">{error}</p>}
    </div>
  );
}
