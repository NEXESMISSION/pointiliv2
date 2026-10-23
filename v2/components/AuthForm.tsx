"use client";

import Link from "next/link";
import { useActionState, useEffect, useState } from "react";
import { KeyRound, UserPlus } from "lucide-react";
import { join, login } from "@/app/actions";
import { PasswordField } from "@/components/PasswordField";
import { PhoneField } from "@/components/PhoneField";
import { Btn, Field, LinkBtn } from "@/components/ui";
import { Trap } from "@/components/Trap";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";
import type { FormState } from "@/lib/types";

/**
 * One form for every door: a customer's new account, an owner's new account
 * (who goes on to open the shop), or signing back in. Three fields at most.
 * A new password shows as it is typed (never chosen blind); signing in, a
 * wrong one says so and offers a new one right there, the number already in
 * the message (23 Oct 2026); a number with no account offers to make one.
 */
export function AuthForm({ mode, next, owner }: { mode: "join" | "login"; next?: string; owner?: boolean }) {
  const [state, action, pending] = useActionState<FormState, FormData>(mode === "join" ? join : login, null);
  // kept by hand: a form action clears its fields, and a name typed once is enough
  const [name, setName] = useState("");
  const [password, setPassword] = useState("");
  // the number as typed, for «نسيت كلمة السر؟» and «اعمل كونت»: nothing typed twice
  const [phone, setPhone] = useState("");
  const err = (f: string) => (state?.field === f ? state.error : null);
  useEffect(() => {
    if (state?.error) signal("form_error", `${mode}${owner ? "-owner" : ""} · ${state.field ?? "form"} · ${state.error}`);
  }, [state, mode, owner]);
  // an owner who already has an account signs in and carries on opening the shop
  const after = next ?? (owner ? "/shop/new" : undefined);
  const q = after ? `?next=${encodeURIComponent(after)}` : "";
  const forgot = `/forgot${phone.length === 8 ? `?phone=${phone}` : ""}`;
  const wrong = mode === "login" && state?.error === t.errWrongPassword;
  const none = mode === "login" && state?.error === t.errNoAccount;

  return (
    // noValidate: the browser's own bubble for an empty field never showed inside Facebook's browser, so «كمّل»
    // looked dead (7 owners left that way); the server checks every field and says it under the field
    <form action={action} noValidate className="mt-[3dvh] flex flex-col">
      <Trap />
      <div className="space-y-[1.8dvh]">
        {mode === "join" && (
          <Field label={owner ? t.ownerName : t.name} name="name" value={name} onChange={(e) => setName(e.target.value)} placeholder={t.namePh} autoComplete="name" required maxLength={60} error={err("name")} />
        )}
        <PhoneField label={t.phone} error={err("phone")} onValue={setPhone} />
        <PasswordField
          label={t.password}
          name="password"
          value={password}
          onChange={(e) => setPassword(e.target.value)}
          placeholder={t.passwordPh}
          autoComplete={mode === "join" ? "new-password" : "current-password"}
          shown={mode === "join"}
          required
          minLength={mode === "join" ? 8 : 1}
          error={err("password")}
        />
      </div>
      {next && <input type="hidden" name="next" value={next} />}
      {owner && <input type="hidden" name="owner" value="1" />}
      {state?.error && !state.field && <p className="mt-4 rounded-2xl bg-coral-soft px-4 py-3 text-[0.9375rem] font-medium text-coral">{state.error}</p>}
      {state?.field === "phone" && state.error === t.errTaken && (
        <Link href={`/login${q}`} className="mt-2 px-1 text-[0.9375rem] font-semibold text-brand">
          {t.toLogin}
        </Link>
      )}
      {/* the password wrong: a new one, asked right here — the number goes with the message */}
      {wrong && (
        <LinkBtn href={forgot} kind="line" className="mt-3 !h-12 !text-[0.9375rem]">
          <KeyRound className="size-[1.125rem]" /> {t.forgotAsk}
        </LinkBtn>
      )}
      {/* no account with this number: make one with it */}
      {none && (
        <LinkBtn href={`/join${q}`} kind="line" className="mt-3 !h-12 !text-[0.9375rem]">
          <UserPlus className="size-[1.125rem]" /> {t.noAccountJoin}
        </LinkBtn>
      )}
      {mode === "login" && !wrong && (
        <Link href={forgot} className="mt-3 self-start px-1 text-[0.9375rem] font-semibold text-muted">
          {t.forgot}
        </Link>
      )}

      <div className="mt-[3.5dvh] space-y-2.5">
        <Btn type="submit" disabled={pending}>
          {pending ? t.checking : mode === "join" ? (owner ? t.next : t.join) : t.login}
        </Btn>
        <LinkBtn href={mode === "join" ? `/login${q}` : owner ? "/shop/new" : `/join${q}`} kind="line">
          {mode === "join" ? t.toLogin : t.toJoin}
        </LinkBtn>
      </div>
    </form>
  );
}
