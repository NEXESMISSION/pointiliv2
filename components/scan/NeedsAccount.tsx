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
 * One compact block, centred in the screen.
 */
export function NeedsAccount({ token, businessName }: { token: string; businessName: string | null }) {
  const { t } = useT();
  const w = t.scan.needsAccount;
  const next = encodeURIComponent(`/scan/${token}`);

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-4 py-6 text-center">
      <Logo size={24} />

      <div className="grid size-[72px] animate-pop place-items-center rounded-[1.75rem] bg-brand-50 text-brand-600">
        <Stamp className="size-9" />
      </div>

      <div className="space-y-1">
        <h1 className="text-[23px] font-extrabold leading-tight tracking-tight text-ink">{w.title}</h1>
        {businessName && <p className="text-base font-semibold text-brand-600">{businessName}</p>}
      </div>

      <p className="max-w-[32ch] text-[15px] leading-relaxed text-body">{w.body}</p>

      <p className="flex max-w-[34ch] flex-col items-center gap-1.5 rounded-2xl bg-warning-50 px-4 py-3 text-sm font-semibold leading-relaxed text-warning-700">
        <AlertTriangle className="size-5" aria-hidden />
        {w.warning}
      </p>

      <p className="inline-flex items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-sm font-medium text-success-600">
        <Clock className="size-4" aria-hidden /> {w.held}
      </p>

      <div className="mt-1 w-full space-y-2">
        <LinkButton href={`/customer/register?next=${next}`} block>
          {w.createAccount}
        </LinkButton>
        <p className="text-xs text-muted">{w.firstTime}</p>
        <LinkButton href={`/customer/login?next=${next}`} variant="outline" block>
          {t.scan.haveAccount}
        </LinkButton>
      </div>
    </div>
  );
}
