"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { join, login } from "@/app/actions";
import { PhoneField } from "@/components/PhoneField";
import { Btn, Field } from "@/components/ui";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

/**
 * One form for every door: a customer's new account, an owner's new account
 * (who goes on to open the shop), or signing back in. Three fields at most.
 */
export function AuthForm({ mode, next, owner }: { mode: "join" | "login"; next?: string; owner?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "join" ? join : login, null);
  // kept by hand: a form action clears its fields, and a name typed once is enough
  const [name, setName] = useState("");
  const err = (f: string) => (state?.field === f ? state.error : null);
  // an owner who already has an account signs in and carries on opening the shop
  const after = next ?? (owner ? "/shop/new" : undefined);
  const q = after ? `?next=${encodeURIComponent(after)}` : "";

  return (
    <form action={action} className="mt-[3dvh] flex flex-col">
      <div className="space-y-[1.8dvh]">
        {mode === "join" && (
          <Field label={owner ? t.ownerName : t.name} name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} autoComplete="name" required maxLength={60} error={err("name")} />
        )}
        <PhoneField label={t.phone} error={err("phone")} />
        <Field label={t.password} name="password" type="password" placeholder={t.passwordPh} autoComplete={mode === "join" ? "new-password" : "current-password"} required minLength={mode === "join" ? 8 : 1} error={err("password")} />
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      {owner && <input type="hidden" name="owner" value="1" />}
      {state?.error && !state.field && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9062rem] font-medium text-coral">{state.error}</p>}
      {state?.field === "phone" && state.error === t.errTaken && (
        <Link href={`/login${q}`} className="mt-2 px-1 text-[0.9062rem] font-semibold text-brand">
          {t.toLogin}
        </Link>
      )}
      {mode === "login" && (
        <Link href="/forgot" className="mt-3 self-start px-1 text-[0.9062rem] font-semibold text-muted">
          {t.forgot}
        </Link>
      )}

      <div className="mt-[3.5dvh] space-y-1">
        <Btn type="submit" disabled={pending}>
          {pending ? t.checking : mode === "join" ? (owner ? t.next : t.join) : t.login}
        </Btn>
        <Link href={mode === "join" ? `/login${q}` : owner ? "/shop/new" : `/join${q}`} className="block py-2 text-center text-[0.9375rem] font-semibold text-brand">
          {mode === "join" ? t.toLogin : t.toJoin}
        </Link>
      </div>
    </form>
  );
}
