"use client";

import { AlertTriangle, Clock, Stamp } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";

/**
 * The scan screen for someone who is not signed in. The stamp is already
 * reserved for this browser for 20 minutes — what this screen has to make
 * obvious is that it is lost unless they finish with an account, and then
 * give exactly two ways forward: make one, or open the one they have.
 */
export function NeedsAccount({ token, businessName }: { token: string; businessName: string | null }) {
  const { t } = useT();
  const w = t.scan.needsAccount;
  const next = encodeURIComponent(`/scan/${token}`);

  return (
    <div className="flex flex-1 flex-col text-center">
      <Logo size={28} className="mx-auto" />

      <div className="mx-auto mt-9 grid size-24 animate-pop place-items-center rounded-[2rem] bg-brand-50 text-brand-600">
        <Stamp className="size-12" />
      </div>

      <h1 className="mt-5 text-[26px] font-extrabold leading-tight tracking-tight text-ink">{w.title}</h1>
      {businessName && <p className="mt-1 text-lg font-semibold text-brand-600">{businessName}</p>}
      <p className="mt-3 text-[15px] leading-relaxed text-body">{w.body}</p>

      <p className="mt-5 flex items-start gap-2.5 rounded-2xl bg-warning-50 p-4 text-start text-[15px] font-semibold leading-relaxed text-warning-700">
        <AlertTriangle className="mt-0.5 size-5 shrink-0" aria-hidden />
        {w.warning}
      </p>

      <p className="mx-auto mt-4 flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-sm font-medium text-success-600">
        <Clock className="size-4" aria-hidden /> {w.held}
      </p>

      <div className="mt-auto space-y-2.5 pt-8">
        <LinkButton href={`/customer/register?next=${next}`} block>
          {w.createAccount}
        </LinkButton>
        <p className="text-sm text-muted">{w.firstTime}</p>
        <LinkButton href={`/customer/login?next=${next}`} variant="outline" block>
          {t.scan.haveAccount}
        </LinkButton>
      </div>
    </div>
  );
}
