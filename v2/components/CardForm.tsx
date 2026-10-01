"use client";

import { useActionState, useState } from "react";
import { Check, Info } from "lucide-react";
import { saveCard } from "@/app/actions";
import { Pass } from "@/components/Pass";
import { Btn } from "@/components/ui";
import { customersN, fill, sameGift, t } from "@/lib/t";
import type { FormState } from "@/lib/types";

const GOALS = [5, 6, 8, 10, 12];
const COLORS = ["#6C47FF", "#FF6B4A", "#0891B2", "#12B76A", "#E0457B", "#1F1B2E", "#B45309", "#7C3AED"];

/**
 * Step 3 for an owner: the card. How many stamps, what the gift is, its
 * colour — and the card itself above, changing as they choose, the way the
 * customer will see it. When the card is changed later, one line says what
 * happens to the customers already on their way (`onTheWay` of them).
 */
export function CardForm({ shop, next, cta, onTheWay }: { shop: { name: string; kind: string; goal: number | null; gift: string | null; color: string }; next?: string; cta: string; onTheWay?: number }) {
  const [state, action, pending] = useActionState<FormState, FormData>(saveCard, null);
  const [goal, setGoal] = useState(shop.goal ?? 8);
  const [gift, setGift] = useState(shop.gift ?? t.ideas[shop.kind]?.[0] ?? "");
  const [color, setColor] = useState(shop.color.toUpperCase());
  const ideas = t.ideas[shop.kind] ?? t.ideas.other!;
  const changed = !!shop.goal && onTheWay !== undefined && (goal !== shop.goal || !sameGift(gift, shop.gift));
  const easier = changed && goal < (shop.goal ?? 0) && sameGift(gift, shop.gift);
  const note = !changed ? null : onTheWay === 0 ? t.cardNoteNone : fill(easier ? t.cardNoteEase : t.cardNoteKeep, { who: customersN(onTheWay ?? 0) });

  return (
    <form action={action} className="flex flex-1 flex-col">
      <div className="sticky top-0 z-10 -mx-5 bg-canvas/90 px-5 pb-3 pt-1 backdrop-blur">
        <p className="mb-1.5 px-1 text-[12.5px] font-semibold text-faint">{t.preview}</p>
        <Pass shop={{ name: shop.name, kind: shop.kind, goal, gift, color }} stamps={Math.max(1, Math.round(goal * 0.6))} />
      </div>

      <p className="mb-2 mt-4 px-1 text-[14px] font-semibold text-muted">{t.cardGoal}</p>
      <div className="grid grid-cols-5 gap-2">
        {GOALS.map((g) => (
          <button key={g} type="button" onClick={() => setGoal(g)} aria-pressed={goal === g} className={`press num h-[52px] rounded-[16px] text-[19px] font-bold ${goal === g ? "bg-brand text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]" : "bg-surface text-ink shadow-card"}`}>
            {g}
          </button>
        ))}
      </div>

      <label className="mt-6 block">
        <span className="mb-1.5 block px-1 text-[14px] font-semibold text-muted">{t.cardGift}</span>
        <input
          name="gift"
          value={gift}
          onChange={(e) => setGift(e.target.value)}
          placeholder={t.cardGiftPh}
          maxLength={60}
          required
          className="block h-[56px] w-full rounded-[18px] bg-surface px-4 text-[17px] shadow-[var(--shadow-card),inset_0_0_0_1px_var(--color-line)] outline-none focus:shadow-[var(--shadow-card),inset_0_0_0_2px_var(--color-brand)]"
        />
      </label>
      <div className="mt-2 flex flex-wrap gap-1.5">
        {ideas.map((idea) => (
          <button key={idea} type="button" onClick={() => setGift(idea)} className={`press rounded-full px-3.5 py-2 text-[13.5px] font-semibold ${gift === idea ? "bg-brand-soft text-brand" : "bg-surface text-body shadow-card"}`}>
            {idea}
          </button>
        ))}
      </div>

      <p className="mb-2 mt-6 px-1 text-[14px] font-semibold text-muted">{t.cardColor}</p>
      <div className="flex flex-wrap gap-3 px-1">
        {COLORS.map((c) => (
          <button key={c} type="button" onClick={() => setColor(c)} aria-label={c} aria-pressed={color === c} className="press grid size-11 place-items-center rounded-full text-white" style={{ background: c, boxShadow: color === c ? `0 0 0 3px var(--color-canvas), 0 0 0 5px ${c}` : undefined }}>
            {color === c && <Check className="size-5" strokeWidth={3} />}
          </button>
        ))}
      </div>

      <input type="hidden" name="goal" value={goal} />
      <input type="hidden" name="color" value={color} />
      {next && <input type="hidden" name="next" value={next} />}
      {note && (
        <p className="mt-6 flex animate-fade gap-2.5 rounded-2xl bg-brand-soft px-4 py-3 text-[14.5px] font-medium leading-relaxed text-brand-deep" role="status">
          <Info className="mt-0.5 size-[18px] shrink-0" /> {note}
        </p>
      )}
      {state?.error && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[14.5px] font-medium text-coral">{state.error}</p>}
      <div className="mt-auto pt-8">
        <Btn type="submit" disabled={pending || gift.trim().length < 2}>
          {pending ? t.checking : cta}
        </Btn>
      </div>
    </form>
  );
}
