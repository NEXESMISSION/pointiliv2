"use client";

import { useActionState, useCallback, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { openShop } from "@/app/actions";
import { KindPicker, KindTile } from "@/components/KindPicker";
import { Btn, Field } from "@/components/ui";
import { KINDS, t } from "@/lib/t";
import type { FormState } from "@/lib/types";

/** The kinds most shops are: one tap away. The other 39 are behind «الكل». */
const POPULAR = ["cafe", "juice", "bakery", "pastry", "restaurant", "fastfood", "pizza", "barber", "hair", "beauty", "clothes"];

/** Step 2 for an owner: the shop's name and what it sells — two answers, one tap each. */
export function ShopForm({ name = "", kind = "cafe", next }: { name?: string; kind?: string; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(openShop, null);
  const [shopName, setShopName] = useState(name);
  const [k, setK] = useState(KINDS.includes(kind) ? kind : "other");
  const [all, setAll] = useState(false);
  const close = useCallback(() => setAll(false), []);
  // a kind chosen from the full list takes the first place, lit
  const shown = POPULAR.includes(k) ? POPULAR : [k, ...POPULAR.slice(0, POPULAR.length - 1)];

  return (
    <form action={action} className="flex flex-1 flex-col">
      <Field label={t.shopName} name="name" value={shopName} onChange={(e) => setShopName(e.target.value)} placeholder={t.shopNamePh} required maxLength={60} error={state?.field === "name" ? state.error : null} />
      <p className="mb-2 mt-6 px-1 text-[14px] font-semibold text-muted">{t.shopKind}</p>
      <div className="grid grid-cols-4 gap-2">
        {shown.map((id) => (
          <KindTile key={id} id={id} on={k === id} onPick={setK} />
        ))}
        <button type="button" onClick={() => setAll(true)} className="press flex flex-col items-center justify-center gap-1 rounded-[18px] bg-brand px-1 py-3 text-[12.5px] font-bold leading-tight text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]">
          <LayoutGrid className="size-[30px]" strokeWidth={2.2} />
          <span>
            {t.kindsAll} <span className="num font-semibold text-white/80">+{KINDS.length - shown.length}</span>
          </span>
        </button>
      </div>
      {all && (
        <KindPicker
          value={k}
          onPick={(id) => {
            setK(id);
            setAll(false);
          }}
          onClose={close}
        />
      )}
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
