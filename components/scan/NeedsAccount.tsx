"use client";

import { AlertTriangle, Clock } from "lucide-react";
import { Logo } from "@/components/Logo";
import { LinkButton } from "@/components/ui/Button";
import { useT } from "@/components/i18n/Provider";
import { IMPACT_MS, StampDrop } from "./StampDrop";

/**
 * The scan screen for someone who is not signed in. The stamp is already
 * reserved for this browser for 20 minutes — what this screen has to make
 * obvious is that it is lost unless they finish with an account, and then
 * give exactly two ways forward: make one, or open the one they have.
 *
 * THE TAMPON LANDS FIRST, and the words arrive out of the impact: +1 is what
 * they scanned for, and an account is only the price of keeping it. Asking
 * before showing it reads as a toll gate; showing it first reads as a gift
 * with a name on it.
 *
 * THE TRAP: every delay here is measured from StampDrop's IMPACT_MS, never
 * typed as its own number — a cascade that drifts out of step with the impact
 * looks like a slow page rather than a choreographed one.
 */
export function NeedsAccount({ token, businessName }: { token: string; businessName: string | null }) {
  const { t } = useT();
  const w = t.scan.needsAccount;
  const next = encodeURIComponent(`/scan/${token}`);
  /* ms after the stamp hits — the order the eye should read them in. */
  const after = (ms: number) => ({ animationDelay: `${IMPACT_MS + ms}ms` });

  return (
    <div className="flex flex-1 flex-col items-center justify-center gap-3.5 py-4 text-center">
      <Logo size={24} />

      <StampDrop label={t.scan.stampWord} size={100} />

      <div className="space-y-1">
        <h1 className="animate-rise text-[26px] font-extrabold leading-tight tracking-tight text-ink" style={after(100)}>
          {w.title}
        </h1>
        {businessName && (
          <p className="animate-rise text-base font-semibold text-brand-600" style={after(160)}>
            {businessName}
          </p>
        )}
      </div>

      <p className="animate-rise text-[15px] text-body" style={after(220)}>
        {w.body}
      </p>

      <p
        className="inline-flex max-w-[34ch] animate-rise items-center gap-2 rounded-2xl bg-warning-50 px-4 py-3 text-[15px] font-semibold leading-snug text-warning-700"
        style={after(280)}
      >
        <AlertTriangle className="size-5 shrink-0" aria-hidden />
        {w.warning}
      </p>

      <p className="inline-flex animate-rise items-center gap-1.5 rounded-full bg-success-50 px-3 py-1.5 text-sm font-medium text-success-600" style={after(340)}>
        <Clock className="size-4" aria-hidden /> {w.held}
      </p>

      <div className="mt-1 w-full space-y-2">
        {/* Two animations cannot share one element — the second `animation`
            declaration simply replaces the first — so the arrival is on the
            wrapper and the breathing stays on the button itself. */}
        <div className="animate-rise" style={after(400)}>
          <LinkButton href={`/customer/register?next=${next}`} block className="animate-breathe">
            {w.createAccount}
          </LinkButton>
        </div>
        <p className="animate-rise text-xs text-muted" style={after(440)}>
          {w.firstTime}
        </p>
        <div className="animate-rise" style={after(480)}>
          <LinkButton href={`/customer/login?next=${next}`} variant="outline" block>
            {t.scan.haveAccount}
          </LinkButton>
        </div>
      </div>
    </div>
  );
}
