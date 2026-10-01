"use client";

import { useActionState, useState } from "react";
import { openShop } from "@/app/actions";
import { Btn, Field, Icon3D } from "@/components/ui";
import { KINDS, kindIcon, t } from "@/lib/t";
import type { FormState } from "@/lib/types";


/** Step 2 for an owner: the shop's name and what it sells — two answers, one tap each. */
export function ShopForm({ name = "", kind = "cafe", next }: { name?: string; kind?: string; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(openShop, null);
  const [k, setK] = useState(kind);
  return (
    <form action={action} className="flex flex-1 flex-col">
      <Field label={t.shopName} name="name" defaultValue={name} placeholder={t.shopNamePh} required maxLength={60} error={state?.field === "name" ? state.error : null} />
      <p className="mb-2 mt-6 px-1 text-[14px] font-semibold text-muted">{t.shopKind}</p>
      <div className="grid grid-cols-4 gap-2">
        {KINDS.map((id) => (
          <button
            key={id}
            type="button"
            onClick={() => setK(id)}
            aria-pressed={k === id}
            className={`press flex flex-col items-center gap-1 rounded-[18px] px-1 py-3 text-[12.5px] font-semibold leading-tight ${k === id ? "bg-brand-soft text-brand shadow-[inset_0_0_0_2px_var(--color-brand)]" : "bg-surface text-body shadow-card"}`}
          >
            <Icon3D name={kindIcon(id)} size={32} />
            <span className="line-clamp-2 text-center">{t.kinds[id]}</span>
          </button>
        ))}
      </div>
      <input type="hidden" name="kind" value={k} />
      {next && <input type="hidden" name="next" value={next} />}
      {state?.error && !state.field && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[14.5px] font-medium text-coral">{state.error}</p>}
      <div className="mt-auto pt-8">
        <Btn type="submit" disabled={pending}>
          {pending ? t.checking : t.next}
        </Btn>
      </div>
    </form>
  );
}
