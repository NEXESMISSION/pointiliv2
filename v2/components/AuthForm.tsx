"use client";

import Link from "next/link";
import { useActionState } from "react";
import { join, login } from "@/app/actions";
import { Btn, Field } from "@/components/ui";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

/**
 * One form for every door: a customer's new account, an owner's new account
 * (who goes on to open the shop), or signing back in. Three fields at most.
 */
export function AuthForm({ mode, next, owner }: { mode: "join" | "login"; next?: string; owner?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "join" ? join : login, null);
  const err = (f: string) => (state?.field === f ? state.error : null);
  const q = next ? `?next=${encodeURIComponent(next)}` : "";

  return (
    <form action={action} className="flex flex-1 flex-col">
      <div className="space-y-4">
        {mode === "join" && <Field label={owner ? t.ownerName : t.name} name="name" placeholder={t.namePh} autoComplete="name" required maxLength={60} error={err("name")} />}
        <Field label={t.phone} name="phone" type="tel" inputMode="numeric" placeholder="22 123 456" autoComplete="tel-national" dir="ltr" className="text-start" required error={err("phone")} />
        <Field label={t.password} name="password" type="password" placeholder={t.passwordPh} autoComplete={mode === "join" ? "new-password" : "current-password"} required minLength={mode === "join" ? 6 : 1} error={err("password")} />
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      {owner && <input type="hidden" name="owner" value="1" />}
      {state?.error && !state.field && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[14.5px] font-medium text-coral">{state.error}</p>}
      {state?.field === "phone" && state.error === t.errTaken && (
        <Link href={`/login${q}`} className="mt-2 px-1 text-[14.5px] font-semibold text-brand">
          {t.toLogin}
        </Link>
      )}

      <div className="mt-auto space-y-3 pt-8">
        <Btn type="submit" disabled={pending}>
          {pending ? t.checking : mode === "join" ? (owner ? t.next : t.join) : t.login}
        </Btn>
        <Link href={mode === "join" ? `/login${q}` : owner ? "/shop/new" : `/join${q}`} className="block py-2 text-center text-[15px] font-semibold text-brand">
          {mode === "join" ? t.toLogin : t.toJoin}
        </Link>
      </div>
    </form>
  );
}
