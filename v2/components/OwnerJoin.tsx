"use client";

import Link from "next/link";
import { useActionState, useCallback, useEffect, useState } from "react";
import { LayoutGrid } from "lucide-react";
import { joinShop } from "@/app/actions";
import { KindPicker } from "@/components/KindPicker";
import { PhoneField } from "@/components/PhoneField";
import { POPULAR } from "@/components/ShopForm";
import { Btn, Field, Icon3D } from "@/components/ui";
import { KINDS, kindIcon, t } from "@/lib/t";
import { signal } from "@/lib/track";
import type { FormState } from "@/lib/types";

/**
 * A new owner's first screen: the account and the shop in one — their name,
 * the shop's name, the phone, a password, and what the shop sells (a row of
 * the usual kinds, the other 39 behind «الكل»). Nothing is lit at first: the
 * kind decides the card's gift ideas, so it is a choice, not a default. The
 * logo comes later, from «المحل».
 */
export function OwnerJoin() {
  const [state, action, pending] = useActionState<FormState, FormData>(joinShop, null);
  // kept by hand: a form action clears its fields, and what was typed once is enough
  const [name, setName] = useState("");
  const [shop, setShop] = useState("");
  const [password, setPassword] = useState("");
  const [kind, setKind] = useState("");
  const [all, setAll] = useState(false);
  const close = useCallback(() => setAll(false), []);
  const err = (f: string) => (state?.field === f ? state.error : null);
  useEffect(() => {
    if (state?.error) signal("form_error", `join-shop · ${state.field ?? "form"} · ${state.error}`);
  }, [state]);
  // a kind chosen from the full list takes the first place, lit
  const shown = !kind || POPULAR.includes(kind) ? POPULAR : [kind, ...POPULAR];

  return (
    // noValidate: the browser's own bubbles never show inside Facebook's browser; the server says each mistake under its field
    <form action={action} noValidate className="mt-[2.4dvh] flex flex-col">
      <div className="space-y-[1.3dvh]">
        <Field label={t.ownerName} name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} autoComplete="name" maxLength={60} error={err("name")} className="!h-[3.25rem] [@media(max-height:520px)]:!h-[2.875rem]" />
        <Field label={t.joinShopName} name="shop" value={shop} onChange={(e) => setShop(e.target.value)} placeholder={t.shopNamePh} autoComplete="organization" maxLength={60} error={err("shop")} className="!h-[3.25rem] [@media(max-height:520px)]:!h-[2.875rem]" />
        <PhoneField label={t.phone} error={err("phone")} compact />
        <Field label={t.password} name="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t.passwordPh} autoComplete="new-password" minLength={8} error={err("password")} className="!h-[3.25rem] [@media(max-height:520px)]:!h-[2.875rem]" />
      </div>

      {/* what it sells: one row of the usual kinds, sliding sideways, and «الكل» at its end */}
      <p className="mb-1.5 mt-[1.6dvh] px-1 text-[0.8125rem] font-semibold text-muted">{t.kindAsk}</p>
      <div data-list className="-mx-[clamp(1rem,5vw,1.5rem)] flex gap-1.5 overflow-x-auto overscroll-x-contain px-[clamp(1rem,5vw,1.5rem)] pb-1 [scrollbar-width:none]" role="radiogroup" aria-label={t.kindAsk}>
        {shown.map((id) => (
          <button
            key={id}
            type="button"
            role="radio"
            aria-checked={kind === id}
            onClick={() => setKind(id)}
            className={`press flex h-[2.625rem] shrink-0 items-center gap-1.5 rounded-full ps-1.5 pe-3.5 text-[0.9375rem] font-semibold ${kind === id ? "bg-brand text-white" : "bg-surface text-body shadow-card"}`}
          >
            <span className={`grid size-[1.875rem] place-items-center rounded-full ${kind === id ? "bg-white/90" : "bg-canvas"}`}>
              <Icon3D name={kindIcon(id)} size={20} />
            </span>
            {t.kinds[id]}
          </button>
        ))}
        <button type="button" onClick={() => setAll(true)} className="press flex h-[2.625rem] shrink-0 items-center gap-1.5 rounded-full bg-brand-soft px-3.5 text-[0.9375rem] font-bold text-brand">
          <LayoutGrid className="size-4" strokeWidth={2.4} />
          {t.kindsAll} <span className="num font-semibold opacity-75">+{KINDS.length - shown.length}</span>
        </button>
      </div>
      {err("kind") && <span className="mt-1 block px-1 text-[0.8125rem] font-medium text-coral">{err("kind")}</span>}
      <input type="hidden" name="kind" value={kind} />
      {all && (
        <KindPicker
          value={kind}
          onPick={(id) => {
            setKind(id);
            setAll(false);
          }}
          onClose={close}
        />
      )}

      {state?.error && !state.field && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9375rem] font-medium text-coral">{state.error}</p>}
      {state?.field === "phone" && state.error === t.errTaken && (
        <Link href="/login?next=%2Fshop%2Fnew" className="mt-2 px-1 text-[0.9375rem] font-semibold text-brand">
          {t.toLogin}
        </Link>
      )}

      <div className="mt-[2.6dvh]">
        <Btn type="submit" disabled={pending}>
          {pending ? t.checking : t.next}
        </Btn>
        <Link href="/login?next=%2Fshop%2Fnew" className="press mt-1 flex h-11 items-center justify-center text-[0.9375rem] font-semibold text-muted [@media(max-height:520px)]:h-9">
          {t.toLogin}
        </Link>
      </div>
    </form>
  );
}
