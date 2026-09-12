"use client";

import { useEffect, useState, useTransition } from "react";
import { Check, Gift } from "lucide-react";
import { cancelRedemption } from "@/app/actions/customer";
import { Button, LinkButton } from "@/components/ui/Button";
import { Confetti } from "@/components/Confetti";
import { TopBar } from "@/components/nav/TopBar";
import { useT } from "@/components/i18n/Provider";
import type { RedemptionStatus } from "@/lib/types";

/** Shows the code to the staff and waits, live, for the merchant to confirm. */
export function RedemptionScreen({ initial, qrSvg }: { initial: RedemptionStatus; qrSvg: string }) {
  const { t, fill } = useT();
  const [state, setState] = useState(initial);
  const [now, setNow] = useState(() => Date.now());
  const [cancelling, startCancel] = useTransition();

  useEffect(() => {
    if (state.status !== "pending") return;
    const tick = setInterval(() => setNow(Date.now()), 1000);
    const poll = setInterval(async () => {
      if (document.visibilityState !== "visible") return;
      try {
        const res = await fetch(`/api/redemptions/${state.id}`, { cache: "no-store" });
        if (res.ok) setState(await res.json());
      } catch {
        /* offline for a moment — keep waiting */
      }
    }, 2000);
    return () => {
      clearInterval(tick);
      clearInterval(poll);
    };
  }, [state.id, state.status]);

  const left = Math.max(0, Math.floor((new Date(state.expires_at).getTime() - now) / 1000));
  const expired = state.status === "expired" || (state.status === "pending" && left === 0);

  if (state.status === "redeemed") {
    return (
      <div className="relative flex min-h-[80dvh] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-success-50 to-canvas px-6 text-center">
        <Confetti />
        <div className="grid size-24 animate-pop place-items-center rounded-full bg-success-500 text-white shadow-lift">
          <Check className="size-12" strokeWidth={3} />
        </div>
        <h1 className="mt-6 text-3xl font-extrabold tracking-tight text-ink">{t.customer.use.doneTitle}</h1>
        <p className="mt-2 text-xl font-bold text-success-600">{state.reward_name}</p>
        <p className="text-muted">{state.business_name}</p>
        <p className="mt-2 text-sm text-muted">{t.customer.use.enjoy}</p>
        <div className="mt-8 w-full max-w-xs space-y-2">
          <LinkButton href={`/customer/cards/${state.customer_id}`} block>
            {t.common.done}
          </LinkButton>
        </div>
      </div>
    );
  }

  return (
    <>
      <TopBar title={t.customer.use.title} back="/customer/rewards" />
      <div className="rounded-3xl bg-white p-6 text-center shadow-card">
        <span className="mx-auto grid size-16 place-items-center rounded-3xl bg-brand-50 text-brand-600">
          <Gift className="size-8" />
        </span>
        <p className="mt-4 text-2xl font-extrabold uppercase tracking-tight text-ink">{state.reward_name}</p>
        <p className="text-muted">{state.business_name}</p>

        {state.status === "cancelled" || expired ? (
          <div className="mt-6 space-y-3">
            <p className="rounded-2xl bg-warning-50 p-3 text-sm font-medium text-warning-700">
              {state.status === "cancelled" ? t.errors.cancelled : t.customer.use.expired}
            </p>
            <LinkButton href="/customer/rewards" block>
              {t.customer.use.backToRewards}
            </LinkButton>
          </div>
        ) : (
          <>
            <p className="mt-6 text-sm font-medium text-body">{t.customer.use.showQr}</p>
            <div
              className="mx-auto mt-3 aspect-square w-[min(72vw,16rem)] rounded-3xl border border-line bg-white p-4 shadow-card [&>svg]:size-full"
              role="img"
              aria-label={t.customer.use.qrAria}
              dangerouslySetInnerHTML={{ __html: qrSvg }}
            />
            <p className="mt-4 text-xs font-medium uppercase tracking-wide text-muted">{t.customer.use.orCode}</p>
            <p
              dir="ltr"
              className="mt-1 font-mono text-4xl font-extrabold tracking-[0.18em] text-brand-700 tabular"
              aria-label={fill(t.customer.use.codeAria, { code: state.code.split("").join(" ") })}
            >
              {state.code.slice(0, 3)} {state.code.slice(3)}
            </p>
            <div className="mt-5 flex items-center justify-center gap-2 text-sm text-muted">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-brand-400 opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-brand-600" />
              </span>
              <span>
                {t.customer.use.waiting} ·{" "}
                <span dir="ltr" className="tabular">
                  {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                </span>
              </span>
            </div>
            <p className="mt-4 text-xs text-faint">{t.customer.use.onlyAfterConfirm}</p>
            <Button variant="ghost" size="md" className="mt-4" loading={cancelling} onClick={() => startCancel(() => cancelRedemption(state.id))}>
              {t.customer.use.cancelRequest}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
