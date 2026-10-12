"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ChevronLeft } from "lucide-react";
import { saveWheelGoal } from "@/app/actions-wheel";
import { Pass, type PassShop } from "@/components/Pass";
import { Top } from "@/components/Top";
import { useScreen } from "@/components/Tracker";
import { Btn } from "@/components/ui";
import { t } from "@/lib/t";

const GOALS = [5, 6, 8, 10, 12];

/**
 * The card of a wheel shop, in one question: how many tampons for a turn of
 * the wheel. Nothing else to choose — no gift (the wheel is the gift), the
 * wait and the colour as they are. Then the wheel's prizes, and that is all.
 */
export function WheelGoal({ shop, editing }: { shop: PassShop; editing: boolean }) {
  useScreen("wheel-goal");
  const router = useRouter();
  const [goal, setGoal] = useState(shop.goal ?? 8);
  const [other, setOther] = useState(shop.goal && !GOALS.includes(shop.goal) ? String(shop.goal) : "");
  const [error, setError] = useState(false);
  const [pending, start] = useTransition();
  const bad = other !== "" && !(Number(other) >= 3 && Number(other) <= 30);

  const save = () =>
    start(async () => {
      const ok = await saveWheelGoal(goal);
      if (!ok) return setError(true);
      router.push(editing ? "/shop/wheel" : "/shop/wheel?start=1");
    });

  return (
    <>
      <Top back={editing ? "/shop/wheel" : undefined} title={t.wheelOwnerTitle} />
      {!editing && <p className="mt-1 shrink-0 text-[0.9375rem] font-semibold text-brand">الخطوة 1 من 2</p>}
      <h1 className="mt-[1.5dvh] shrink-0 text-balance text-[1.5rem] font-bold leading-tight">قدّاش من تامبون باش يدوّر الحريف الروليت؟</h1>

      <div className="mx-auto mt-[2.4dvh] w-full max-w-[min(100%,46dvh)] shrink-0">
        <Pass shop={{ ...shop, goal, wheel: true, gift: "الروليت" }} stamps={Math.max(1, Math.round(goal * 0.6))} />
      </div>

      <div className="mt-[2.4dvh] grid shrink-0 grid-cols-5 gap-2">
        {GOALS.map((g) => (
          <button
            key={g}
            type="button"
            onClick={() => {
              setGoal(g);
              setOther("");
            }}
            aria-pressed={goal === g}
            className={`press num h-[3.6rem] rounded-[1.125rem] text-[1.3125rem] font-bold ${goal === g ? "bg-brand text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-ink shadow-card"}`}
          >
            {g}
          </button>
        ))}
      </div>
      <label className="mt-[1.6dvh] flex shrink-0 items-center justify-center gap-2.5">
        <span className="text-[0.9062rem] font-semibold text-muted">{t.wizGoalOther}</span>
        <input
          type="text"
          inputMode="numeric"
          maxLength={2}
          value={other}
          onChange={(e) => {
            const v = e.target.value.replace(/\D/g, "").slice(0, 2);
            setOther(v);
            if (Number(v) >= 3 && Number(v) <= 30) setGoal(Number(v));
          }}
          placeholder="15"
          aria-label={t.wizGoalOther}
          className={`num h-11 w-[4.75rem] rounded-[1rem] bg-surface text-center text-[16px] font-bold shadow-card outline-none ${bad ? "ring-2 ring-coral" : "focus:ring-2 focus:ring-brand"}`}
        />
        <span className={`text-[0.8125rem] ${bad ? "font-semibold text-coral" : "text-faint"}`}>{t.wizGoalRange}</span>
      </label>

      <div className="mt-auto shrink-0 pb-3 pt-3">
        {error && <p className="mb-1.5 text-center text-[0.875rem] font-semibold text-coral">{t.errNetwork}</p>}
        <Btn type="button" onClick={save} disabled={pending || bad}>
          {pending ? t.checking : editing ? t.storeSave : "كمّل: الكادوات متاع الروليت"} {!pending && !editing && <ChevronLeft className="size-5" />}
        </Btn>
      </div>
    </>
  );
}
