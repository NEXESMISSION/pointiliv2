"use client";

import Link from "next/link";
import { useEffect, useState } from "react";
import { Check, ChevronLeft, Clock, Sparkles, X } from "lucide-react";
import { Confetti } from "@/components/StampLand";
import { Icon3D } from "@/components/ui";
import { seenBefore, shown } from "@/lib/once";
import { signal } from "@/lib/track";
import { t } from "@/lib/t";

/** The shop's year, as the server tells it (v2.my_payment). */
export type Pay = {
  paid_until: string | null;
  paid: boolean;
  offer_until: string | null;
  /** the access the founder just turned on, to say once (PlanOn) */
  grant?: import("@/components/PlanOn").Grant | null;
  /** within the 48 hours, and not paid: the year counts 15 months */
  offer: boolean;
  last: { id: string; method: string; months: number; status: "pending" | "paid" | "refused"; at: string } | null;
};

/** Hours, minutes and seconds left until `until`, ticking every second (zeros once it is over). */
export function useLeft(until: string) {
  const end = Date.parse(until);
  const [now, setNow] = useState(() => Date.now());
  useEffect(() => {
    const id = setInterval(() => setNow(Date.now()), 1000);
    return () => clearInterval(id);
  }, []);
  const s = Math.max(0, Math.floor((end - now) / 1000));
  return { over: s === 0, h: Math.floor(s / 3600), m: Math.floor((s % 3600) / 60), s: s % 60 };
}
const two = (n: number) => String(n).padStart(2, "0");

/** «47:59:12»: the time left, in one string. */
export function Left({ until, className = "" }: { until: string; className?: string }) {
  const { h, m, s } = useLeft(until);
  return (
    <bdi className={`num ${className}`} suppressHydrationWarning>
      {two(h)}:{two(m)}:{two(s)}
    </bdi>
  );
}

/**
 * The thin line under the shop's name until the year is paid: during the
 * first 48 hours, the offer with its clock ticking; after, the price; while
 * a payment waits for the founder's word, just that.
 */
export function PayBanner({ pay, offer }: { pay: Pay; offer: boolean }) {
  if (pay.last?.status === "pending" && pay.last.method !== "contact") {
    return (
      <p className="mt-3 flex shrink-0 items-center gap-2 rounded-full bg-ink/[0.05] px-4 py-2 text-[0.8438rem] font-semibold text-body">
        <Clock className="size-4 shrink-0 text-muted" /> {t.payPending}
      </p>
    );
  }
  if (offer) {
    return (
      <Link
        href="/shop/pay"
        className="press relative mt-3 flex shrink-0 items-center gap-2.5 overflow-hidden rounded-full bg-[linear-gradient(110deg,#ff8a3d,#ff4f7b_45%,#8b5cf6)] py-2 pe-3 ps-2 text-white"
      >
        <span className="pay-shine pointer-events-none absolute inset-y-0 w-1/3 bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.45),transparent)]" aria-hidden />
        <span className="grid size-8 shrink-0 place-items-center rounded-full bg-white/25">
          <Icon3D name="gift" size={22} />
        </span>
        <span className="min-w-0 flex-1 truncate text-[0.875rem] font-bold">{t.payBanner}</span>
        <span className="flex shrink-0 items-center gap-1 rounded-full bg-white/20 px-2.5 py-1 text-[0.8125rem] font-bold">
          <Clock className="size-3.5" /> <Left until={pay.offer_until ?? new Date().toISOString()} />
        </span>
        <style>{`@keyframes pay-shine { from { inset-inline-start: -40%; } to { inset-inline-start: 120%; } } .pay-shine { animation: pay-shine 2.8s ease-in-out infinite; }`}</style>
      </Link>
    );
  }
  return (
    <Link href="/shop/pay" className="press mt-3 flex shrink-0 items-center gap-2 rounded-full bg-surface py-2 pe-2 ps-4 shadow-card">
      <span className="min-w-0 flex-1 truncate text-[0.875rem] font-semibold text-body">{t.payBannerPlain}</span>
      <span className="flex items-center gap-0.5 rounded-full bg-brand px-3 py-1 text-[0.8125rem] font-bold text-white">
        {t.payBannerCta} <ChevronLeft className="size-3.5" />
      </span>
    </Link>
  );
}

/**
 * The offer, once in a new owner's life (their first 48 hours): a card that
 * rises with a little party — a whole year and three months for nothing, the
 * clock ticking down in big digits, what the year gives — and one button to
 * the page where they pay. Written down the moment it shows.
 */
export function OfferPopup({ shopId, offerUntil }: { shopId: string; offerUntil: string }) {
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const left = useLeft(offerUntil);

  useEffect(() => {
    if (seenBefore("offer", shopId)) return;
    const id = setTimeout(() => {
      if (seenBefore("offer", shopId)) return;
      shown("offer", shopId);
      signal("offer", "shown");
      setOpen(true);
    }, 900);
    return () => clearTimeout(id);
  }, [shopId]);

  if (!open || left.over) return null;
  const close = () => {
    setLeaving(true);
    signal("offer", "later");
    setTimeout(() => setOpen(false), 220);
  };

  return (
    <div className={`fixed inset-0 z-50 flex items-center justify-center bg-[rgb(20_16_40/0.55)] px-5 backdrop-blur-[3px] transition-opacity duration-200 ${leaving ? "opacity-0" : "animate-fade"}`} role="dialog" aria-modal="true" aria-label={t.payOfferTitle} onClick={close}>
      <Confetti count={60} />
      <style>{`
        @keyframes offer-in { 0% { opacity: 0; transform: translateY(30px) scale(0.92); } 60% { opacity: 1; transform: translateY(-4px) scale(1.01); } 100% { transform: none; } }
        @keyframes offer-glow { 0%, 100% { background-position: 0% 50%; } 50% { background-position: 100% 50%; } }
        @keyframes offer-tick { 0% { transform: scale(1); } 50% { transform: scale(1.06); } 100% { transform: scale(1); } }
        .offer-glow { background-size: 220% 220%; animation: offer-glow 5s ease-in-out infinite; }
      `}</style>
      <div className="relative w-full max-w-sm pt-10" style={{ animation: "offer-in 620ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
        <div className="relative overflow-hidden rounded-[2rem] bg-surface text-center text-ink shadow-[0_40px_90px_-30px_rgb(20_16_40/0.7)]">
          {/* the ribbon of colour on top, slowly moving */}
          <div className="offer-glow relative bg-[linear-gradient(120deg,#ff8a3d,#ff4f7b,#8b5cf6,#ff8a3d)] px-5 pb-16 pt-12 text-white [@media(max-height:560px)]:pb-14">
            <span className="inline-flex items-center gap-1.5 rounded-full bg-white/20 px-3 py-1 text-[0.75rem] font-bold backdrop-blur">
              <Sparkles className="size-3.5" /> {t.payOfferBadge}
            </span>
            <h2 className="mt-2.5 text-[1.5rem] font-bold leading-snug">{t.payOfferTitle}</h2>
            <p className="mx-auto mt-1 max-w-[17rem] text-[0.875rem] leading-snug text-white/90">{t.payOfferBody}</p>
          </div>
          {/* the colour does not stop on a ruled line: the paper curves up to meet the price */}
          <svg className="relative -mt-14 block h-[3.5rem] w-full [@media(max-height:560px)]:-mt-12 [@media(max-height:560px)]:h-[3rem]" viewBox="0 0 100 14" preserveAspectRatio="none" aria-hidden>
            <path d="M0 6 C 22 -2, 78 -2, 100 6 L100 14 L0 14 Z" fill="var(--color-surface)" />
          </svg>
          {/* the price, on a card of its own, straddling the two */}
          <p className="relative z-10 -mt-8 mb-1 inline-flex items-end gap-1.5 rounded-[1.375rem] bg-surface px-6 py-3 shadow-[0_18px_34px_-18px_rgb(20_16_40/0.45)] [@media(max-height:560px)]:py-2">
            <span className="num bg-[linear-gradient(120deg,#ff4f7b,#8b5cf6)] bg-clip-text text-[2.75rem] font-bold leading-none text-transparent">{t.payPrice}</span>
            <span className="pb-1 text-start text-[0.9375rem] font-bold leading-tight text-ink">
              {t.payCurrency}
              <span className="block text-[0.75rem] font-semibold text-muted">{t.payPer}</span>
            </span>
          </p>
          {/* the clock */}
          <div className="relative flex justify-center gap-2 px-5" dir="ltr">
            {[
              { v: left.h, l: t.payHours },
              { v: left.m, l: t.payMinutes },
              { v: left.s, l: t.paySeconds },
            ].map((x, i) => (
              <span key={i} className="flex w-[4.75rem] flex-col items-center rounded-[1.125rem] bg-ink py-2 text-white [@media(max-height:560px)]:py-1.5">
                <span key={x.v} className="num text-[1.5rem] font-bold leading-none" style={i === 2 ? { animation: "offer-tick 400ms ease-out" } : undefined}>
                  {two(x.v)}
                </span>
                <span className="mt-0.5 flex items-center gap-1 text-[0.6875rem] text-white/70">
                  <Clock className="size-3" /> {x.l}
                </span>
              </span>
            ))}
          </div>
          {/* what is in it, on one sheet of paper instead of three loose lines */}
          <ul className="mx-5 mt-4 divide-y divide-line rounded-[1.25rem] bg-canvas text-start [@media(max-height:560px)]:mt-3">
            {t.payPerks.map((p) => (
              <li key={p} className="flex items-start gap-2.5 px-3.5 py-2.5 text-[0.875rem] leading-snug [@media(max-height:560px)]:py-2">
                <span className="mt-px grid size-5 shrink-0 place-items-center rounded-full bg-mint text-white">
                  <Check className="size-3" strokeWidth={3.5} />
                </span>
                {p}
              </li>
            ))}
          </ul>
          <div className="space-y-1 p-5 pt-4 [@media(max-height:560px)]:pb-4 [@media(max-height:560px)]:pt-3">
            <Link
              href="/shop/pay"
              onClick={() => signal("offer", "pay")}
              className="press relative flex h-[3.5rem] w-full items-center justify-center overflow-hidden rounded-[1.25rem] bg-[linear-gradient(110deg,#ff6a3d,#ff3d77_50%,#7c4dff)] text-[1.0625rem] font-bold text-white shadow-[0_16px_34px_-14px_rgb(255_61_119/0.9)] [@media(max-height:560px)]:h-[3.25rem]"
            >
              <span className="pay-shine pointer-events-none absolute inset-y-0 w-1/3 bg-[linear-gradient(100deg,transparent,rgb(255_255_255/0.5),transparent)]" aria-hidden />
              <style>{`@keyframes pay-shine { from { inset-inline-start: -40%; } to { inset-inline-start: 120%; } } .pay-shine { animation: pay-shine 2.6s ease-in-out infinite; }`}</style>
              {t.payNow}
            </Link>
            <button type="button" onClick={close} className="press h-10 w-full text-[0.9375rem] font-semibold text-muted [@media(max-height:560px)]:h-9">
              {t.payLater}
            </button>
          </div>
        </div>
        {/* the gift sits on the card's shoulder, and the × where a thumb finds it */}
        <span className="pointer-events-none absolute start-1/2 top-0 grid size-[5.5rem] -translate-x-1/2 place-items-center rtl:translate-x-1/2">
          <Icon3D name="gift" size={86} className="animate-float" />
        </span>
        <button type="button" onClick={close} aria-label={t.closeIt} className="press absolute start-3 top-[3.25rem] grid size-9 place-items-center rounded-full bg-white/25 text-white backdrop-blur hover:bg-white/40">
          <X className="size-5" strokeWidth={2.5} />
        </button>
      </div>
    </div>
  );
}
