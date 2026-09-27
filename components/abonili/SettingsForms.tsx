"use client";

import { useActionState, useTransition } from "react";
import { abChangePassword, abSetLanguage, abUpdateClub, type AbForm } from "@/app/actions/abonili";
import { phoneLocal } from "@/lib/abonili/format";
import { AB_KINDS, type AbClub } from "@/lib/abonili/types";
import { LOCALES, LOCALE_NAME } from "@/lib/i18n/config";
import { useAb } from "./AbProvider";

function Feedback({ state }: { state: AbForm }) {
  if (state?.error) return <p className="ab-alert">{state.error}</p>;
  if (state?.ok && state.message) return <p className="ab-ok" role="status">{state.message}</p>;
  return null;
}

export function ClubForm({ club }: { club: AbClub }) {
  const { a } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abUpdateClub, null);
  return (
    <form action={action} className="space-y-4">
      <Feedback state={state} />
      <div>
        <label className="ab-label" htmlFor="c-name">{a.settings.name}</label>
        <input id="c-name" name="name" className="ab-input" defaultValue={club.name} required minLength={2} maxLength={60} dir="auto" />
      </div>
      <div>
        <label className="ab-label" htmlFor="c-kind">{a.settings.kind}</label>
        <select id="c-kind" name="kind" className="ab-select" defaultValue={club.kind}>
          {AB_KINDS.map((k) => <option key={k} value={k}>{a.kinds[k]}</option>)}
        </select>
      </div>
      <div>
        <label className="ab-label" htmlFor="c-phone">{a.settings.phone}</label>
        <input id="c-phone" name="phone" className="ab-input ab-ltr" inputMode="tel" defaultValue={phoneLocal(club.phone)} />
      </div>
      <div>
        <label className="ab-label" htmlFor="c-address">{a.settings.address}</label>
        <input id="c-address" name="address" className="ab-input" defaultValue={club.address ?? ""} maxLength={120} dir="auto" />
      </div>
      <button type="submit" className="ab-btn" disabled={pending}>{a.settings.save}</button>
    </form>
  );
}

export function PasswordForm() {
  const { a } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abChangePassword, null);
  return (
    <form action={action} className="space-y-4" key={state?.ok ? state.at : "pw"}>
      <Feedback state={state} />
      <div>
        <label className="ab-label" htmlFor="pw-current">{a.settings.current}</label>
        <input id="pw-current" name="current" type="password" className="ab-input" autoComplete="current-password" required />
      </div>
      <div>
        <label className="ab-label" htmlFor="pw-new">{a.settings.newPassword}</label>
        <input id="pw-new" name="password" type="password" className="ab-input" autoComplete="new-password" minLength={8} maxLength={72} required />
      </div>
      <button type="submit" className="ab-btn ab-btn-quiet" disabled={pending}>{a.settings.changePassword}</button>
    </form>
  );
}

export function LanguageSwitch() {
  const { locale } = useAb();
  const [busy, start] = useTransition();
  return (
    <div className="flex gap-2">
      {LOCALES.map((l) => (
        <button key={l} type="button" className="ab-chip flex-1 justify-center" disabled={busy}
          aria-current={l === locale ? "page" : undefined} onClick={() => start(() => abSetLanguage(l))}>
          {LOCALE_NAME[l]}
        </button>
      ))}
    </div>
  );
}
