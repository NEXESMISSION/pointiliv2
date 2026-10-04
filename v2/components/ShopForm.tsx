"use client";

import { useActionState, useCallback, useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { openShop } from "@/app/actions";
import { KindPicker, KindTile } from "@/components/KindPicker";
import { LogoPicker } from "@/components/LogoPicker";
import { Btn, boxFocus, boxLook } from "@/components/ui";
import { KINDS, t } from "@/lib/t";
import { signal } from "@/lib/track";
import type { FormState } from "@/lib/types";

/** The kinds most shops are: one tap away. The other 39 are behind «الكل». */
const POPULAR = ["cafe", "juice", "bakery", "pastry", "restaurant", "fastfood", "pizza", "barber", "hair", "beauty", "clothes"];

/**
 * Step 2 for an owner: the shop's name (and its logo beside it, if the owner
 * has one — not needed) and what it sells. Later, from «المحل», the same
 * form changes any of them.
 */
export function ShopForm({ name = "", kind = "cafe", logo = "", next }: { name?: string; kind?: string; logo?: string | null; next?: string }) {
  const [state, action, pending] = useActionState<FormState, FormData>(openShop, null);
  const [logoBusy, setLogoBusy] = useState(false);
  const [shopName, setShopName] = useState(name);
  const [mark, setMark] = useState(logo ?? "");
  const [logoError, setLogoError] = useState<string | null>(null);
  const [k, setK] = useState(KINDS.includes(kind) ? kind : "other");
  const [all, setAll] = useState(false);
  const close = useCallback(() => setAll(false), []);
  useEffect(() => {
    if (state?.error) signal("form_error", `shop · ${state.field ?? "form"} · ${state.error}`);
  }, [state]);
  // a kind chosen from the full list takes the first place, lit
  const shown = POPULAR.includes(k) ? POPULAR : [k, ...POPULAR.slice(0, POPULAR.length - 1)];

  return (
    <form action={action} className="mt-[3dvh] flex flex-col">
      {/* the name, and the logo beside it */}
      <div>
        <div className="mb-1.5 flex items-baseline justify-between gap-2 px-1">
          <label htmlFor="shop-name" className="text-[0.875rem] font-semibold text-muted">
            {t.shopName}
          </label>
          <span className="text-[0.8125rem] font-semibold text-muted">
            {t.logo} <span className="font-normal text-faint">· {t.optional}</span>
          </span>
        </div>
        <div className="flex items-center gap-2.5">
          <input
            id="shop-name"
            name="name"
            value={shopName}
            onChange={(e) => setShopName(e.target.value)}
            placeholder={t.shopNamePh}
            required
            maxLength={60}
            aria-invalid={state?.field === "name"}
            className={`block h-[3.5rem] min-w-0 flex-1 px-4 text-[17px] text-ink outline-none placeholder:text-faint ${boxLook} ${boxFocus}`}
          />
          <LogoPicker value={mark} onChange={setMark} onError={setLogoError} onBusy={setLogoBusy} />
        </div>
        {state?.field === "name" && state.error && <span className="mt-1.5 block px-1 text-[0.8438rem] font-medium text-coral">{state.error}</span>}
        {logoError && <span className="mt-1.5 block px-1 text-[0.8438rem] font-medium text-coral">{logoError}</span>}
      </div>
      <input type="hidden" name="logo" value={mark} />
      <p className="mb-2 mt-[2.5dvh] px-1 text-[0.875rem] font-semibold text-muted">{t.shopKind}</p>
      <div className="grid grid-cols-4 gap-2">
        {shown.map((id) => (
          <KindTile key={id} id={id} on={k === id} onPick={setK} />
        ))}
        <button type="button" onClick={() => setAll(true)} className="press flex flex-col items-center justify-center gap-1 rounded-[1.125rem] bg-brand px-1 py-3 text-[0.7812rem] font-bold leading-tight text-white shadow-[0_10px_22px_-10px_rgb(108_71_255/0.8)]">
          <LayoutGrid className="size-[1.875rem]" strokeWidth={2.2} />
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
      {state?.error && !state.field && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{state.error}</p>}
      <div className="mt-[3.5dvh]">
        <Btn type="submit" disabled={pending || logoBusy}>
          {pending ? t.checking : logoBusy ? t.logoWait : t.next}
        </Btn>
      </div>
    </form>
  );
}
