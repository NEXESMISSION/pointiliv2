"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { joinShop } from "@/app/actions";
import { KindField } from "@/components/KindPicker";
import { PhoneField } from "@/components/PhoneField";
import { Btn, Field } from "@/components/ui";
import { Trap } from "@/components/Trap";
import { t } from "@/lib/t";
import { signal } from "@/lib/track";
import type { FormState } from "@/lib/types";

/**
 * A new owner's first screen: the account and the shop in one — their name,
 * the shop's name, the phone, a password, and what the shop sells (one
 * field that opens every kind, in groups, with a search). Nothing is chosen at first: the
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
  const err = (f: string) => (state?.field === f ? state.error : null);
  useEffect(() => {
    if (state?.error) signal("form_error", `join-shop · ${state.field ?? "form"} · ${state.error}`);
  }, [state]);
  // an account already (the phone is taken, or «عندك كونت؟»): signing in leads straight to the shop's screen,
  // with the shop's name and kind already written there — nothing typed twice
  const signIn = `/login?next=${encodeURIComponent(`/shop/setup?${new URLSearchParams({ ...(shop.trim() ? { name: shop.trim() } : {}), ...(kind ? { kind } : {}) })}`)}`;

  return (
    // noValidate: the browser's own bubbles never show inside Facebook's browser; the server says each mistake under its field
    <form action={action} noValidate className="mt-[2.4dvh] flex flex-col">
      <Trap />
      <div className="space-y-[1.3dvh]">
        <Field label={t.ownerName} name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} autoComplete="name" maxLength={60} error={err("name")} className="!h-[3.25rem] [@media(max-height:520px)]:!h-[2.875rem]" />
        <Field label={t.joinShopName} name="shop" value={shop} onChange={(e) => setShop(e.target.value)} placeholder={t.shopNamePh} autoComplete="organization" maxLength={60} error={err("shop")} className="!h-[3.25rem] [@media(max-height:520px)]:!h-[2.875rem]" />
        <PhoneField label={t.phone} error={err("phone")} compact />
        <Field label={t.password} name="password" value={password} onChange={(e) => setPassword(e.target.value)} type="password" placeholder={t.passwordPh} autoComplete="new-password" minLength={8} error={err("password")} className="!h-[3.25rem] [@media(max-height:520px)]:!h-[2.875rem]" />
      </div>

      {/* what it sells: one field — a tap opens every kind, in groups, with a search */}
      <p className="mb-1.5 mt-[1.6dvh] px-1 text-[0.8125rem] font-semibold text-muted">{t.kindAsk}</p>
      <KindField value={kind} onPick={setKind} error={err("kind")} compact />
      <input type="hidden" name="kind" value={kind} />

      {state?.error && !state.field && <p className="mt-3 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9375rem] font-medium text-coral">{state.error}</p>}
      {state?.field === "phone" && state.error === t.errTaken && (
        <Link href={signIn} className="mt-2 px-1 text-[0.9375rem] font-semibold text-brand">
          {t.toLogin}
        </Link>
      )}

      <div className="mt-[2.6dvh]">
        <Btn type="submit" disabled={pending}>
          {pending ? t.checking : t.next}
        </Btn>
        <Link href={signIn} className="press mt-1 flex h-11 items-center justify-center text-[0.9375rem] font-semibold text-muted [@media(max-height:520px)]:h-9">
          {t.toLogin}
        </Link>
      </div>
    </form>
  );
}
