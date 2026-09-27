"use client";

import Link from "next/link";
import { useActionState } from "react";
import { ArrowRight } from "lucide-react";
import { abLogin, type AbForm } from "@/app/actions/abonili";
import { useAb } from "./AbProvider";

export function LoginForm({ next }: { next?: string }) {
  const { a } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abLogin, null);

  return (
    <form action={action} className="space-y-4">
      {next && <input type="hidden" name="next" value={next} />}

      {state?.code === "no_club" ? (
        <div className="ab-alert space-y-2">
          <p>{a.login.noClub}</p>
          <p className="font-medium opacity-80">{a.login.noClubHint}</p>
          <Link href="/app" className="inline-block underline">{a.login.toPointili}</Link>
        </div>
      ) : state?.error ? (
        <p className="ab-alert">{state.error}</p>
      ) : null}

      <div>
        <label className="ab-label" htmlFor="phone">{a.login.phone}</label>
        <div className="flex items-stretch gap-2" dir="ltr">
          <span className="ab-well grid place-items-center px-3 text-[16px] font-bold ab-dim">+216</span>
          <input id="phone" name="phone" className="ab-input text-[18px] font-bold" inputMode="tel" autoComplete="tel-national"
            placeholder="28 131 507" defaultValue={state?.values?.phone} required autoFocus />
        </div>
      </div>
      <div>
        <label className="ab-label" htmlFor="password">{a.login.password}</label>
        <input id="password" name="password" type="password" className="ab-input" autoComplete="current-password" required />
      </div>
      <button type="submit" className="ab-btn ab-btn-xl ab-btn-block" disabled={pending}>
        {a.login.submit}
        <ArrowRight aria-hidden className="rtl:rotate-180" />
      </button>
    </form>
  );
}
