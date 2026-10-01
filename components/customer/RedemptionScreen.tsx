"use client";

import { useEffect, useState, useTransition } from "react";
import { cancelRedemption } from "@/app/actions/customer";
import { Button, LinkButton } from "@/components/ui/Button";
import { GIFT_OPEN_MS, GiftOpen } from "@/components/celebrate/GiftOpen";
import { TopBar } from "@/components/nav/TopBar";
import { Icon3D } from "@/components/ui/Icon3D";
import { useT } from "@/components/i18n/Provider";
import type { RedemptionStatus } from "@/lib/types";

/** Shows the code to the staff and waits, live, for the merchant to confirm. */
export function RedemptionScreen({ initial, qrSvg }: { initial: RedemptionStatus; qrSvg: string }) {
  const { t, fill, count } = useT();
  const [state, setState] = useState(initial);
  // a catalog gift is paid in points: the screen is sea blue and says what it costs (board 2, P7)
  const points = state.system === "points";
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
    /* The payoff of ten visits: the gift opens, and everything comes out of it in reading order — see GiftOpen. */
    const after = (ms: number) => ({ animationDelay: `${GIFT_OPEN_MS + ms}ms` });
    return (
      <div className="relative flex min-h-[80dvh] flex-col items-center justify-center overflow-hidden rounded-3xl bg-gradient-to-b from-success-50 to-canvas px-6 text-center">
        <GiftOpen size={112} fountain />
        <h1 className="mt-3 animate-rise text-2xl font-bold text-ink" style={after(120)}>
          {t.customer.use.doneTitle}
        </h1>
        <p className="mt-2 animate-land text-3xl font-bold text-success-600 text-balance" style={after(260)}>
          {state.reward_name}
        </p>
        <p className="mt-1 animate-rise text-muted" style={after(420)}>
          {state.business_name}
        </p>
        <p className="mt-2 animate-rise text-sm text-muted" style={after(480)}>
          {t.customer.use.enjoy}
        </p>
        <div className="mt-6 w-full max-w-xs animate-rise space-y-2" style={after(560)}>
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
      <div
        className={`relative overflow-hidden rounded-[32px] px-5 pb-5 pt-5 text-center text-white ${
          points
            ? "bg-[linear-gradient(170deg,#3fd0e6_0%,#0891b2_45%,#0b5f75_100%)] shadow-[0_24px_50px_-20px_rgb(8_145_178/0.6)]"
            : "bg-[linear-gradient(170deg,#ffa183_0%,#ff6b4a_45%,#d93f22_100%)] shadow-[0_24px_50px_-20px_rgb(217_63_34/0.6)]"
        }`}
      >
        <Icon3D name={points ? "ticket" : "gift"} size={58} className="mx-auto animate-float" />
        <p className="mt-1.5 text-[26px] font-bold leading-tight text-balance">{state.reward_name}</p>
        <p className="text-sm opacity-85">{state.business_name}</p>

        {state.status === "cancelled" || expired ? (
          <div className="mt-5 space-y-3">
            <p className="rounded-2xl bg-white/15 p-3 text-sm font-medium">{state.status === "cancelled" ? t.errors.cancelled : t.customer.use.expired}</p>
            <LinkButton href="/customer/rewards" variant="outline" block>
              {t.customer.use.backToRewards}
            </LinkButton>
          </div>
        ) : (
          <>
            <p className="mt-3 text-sm font-medium opacity-90">{t.customer.use.showQr}</p>
            <div className="mx-auto mt-3 w-[min(62vw,15rem)] rounded-[28px] bg-white p-3.5 text-[#0f0e17] shadow-[0_24px_50px_-20px_rgb(60_10_0/0.5)]">
              <div className="aspect-square [&>svg]:size-full" role="img" aria-label={t.customer.use.qrAria} dangerouslySetInnerHTML={{ __html: qrSvg }} />
              <p className="num mt-1.5 text-[26px] font-bold tracking-[0.14em]" aria-label={fill(t.customer.use.codeAria, { code: state.code.split("").join(" ") })}>
                {state.code.slice(0, 3)} {state.code.slice(3)}
              </p>
            </div>
            {points && !!state.points_spent && (
              <p className="mx-auto mt-3 w-fit rounded-full bg-white/15 px-3.5 py-1.5 text-sm font-semibold">
                {count(t.points.costLine, state.points_spent, { left: Math.max(0, (state.balance ?? 0) - state.points_spent) })}
              </p>
            )}
            <div className="mx-auto mt-4 flex w-fit items-center gap-2 rounded-full bg-white/15 px-3.5 py-2 text-sm font-medium">
              <span className="relative flex size-2.5">
                <span className="absolute inline-flex size-full animate-ping rounded-full bg-white opacity-60" />
                <span className="relative inline-flex size-2.5 rounded-full bg-white" />
              </span>
              <span>
                {t.customer.use.waiting} ·{" "}
                <span className="num">
                  {Math.floor(left / 60)}:{String(left % 60).padStart(2, "0")}
                </span>
              </span>
            </div>
            <p className="mt-2.5 text-xs opacity-80">{points ? t.points.onlyAfterConfirm : t.customer.use.onlyAfterConfirm}</p>
            <Button variant="ghost" size="md" className="mt-1.5 text-white hover:bg-white/10 hover:text-white" loading={cancelling} onClick={() => startCancel(() => cancelRedemption(state.id))}>
              {t.customer.use.cancelRequest}
            </Button>
          </>
        )}
      </div>
    </>
  );
}
