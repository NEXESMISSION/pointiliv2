"use client";

import { useState } from "react";
import { Check, Crown, MessageCircle, Phone, Sparkles } from "lucide-react";
import { Left } from "@/components/Pay";
import { Detail, spaced, WAYS } from "@/components/PayMethods";
import { perMonth, planFirst, plansFor, type Plan } from "@/lib/plans";
import { signal } from "@/lib/track";
import { fill, monthsSaid, t } from "@/lib/t";

type Details = { d17: string | null; banks: { bank: string | null; rib: string; transfer?: boolean }[] };

/**
 * Paying, one choice a screen (the founder chose it among three, 16 Nov 2026: «the steps thing is good, keep it»).
 *  ① the length: a month, six months, a year, as rows — the year ticked first and marked the best, each with what a
 *    month comes to, and in the trial's first 3 days the two months more on six months and the year, the clock above
 *    them — then «كمّل · 180 د»;
 *  ② how: D17, a transfer, a deposit, a money order, as four tiles. The one chosen opens what to send and where (the
 *    number, the accounts, each with its copy button), then the receipt on WhatsApp, already written with the shop,
 *    the plan and the way. What was chosen in ① sits on top, one tap from changing it.
 * A call is under both steps. A shop with one price (paid before 7 Nov 2026) has nothing to choose: it starts on ②.
 * Nothing here is a request — the WhatsApp or the call is the whole of it, and the founder turns the subscription on
 * by hand (no-pay-requests). Each step fits one phone screen, from 548px tall.
 */
export function PaySteps({
  old,
  offerUntil,
  shop,
  support,
  details,
  phone,
  title,
  note,
}: {
  old: boolean;
  /** the offer's end while it runs (null: no offer) */
  offerUntil: string | null;
  shop: string;
  support: string | null;
  details?: Details;
  phone?: string | null;
  /** «خدّم الأبونمان متاعك», or «جدّد الأبونمان» */
  title: string;
  /** under the title: until when it is paid now (a renewal) */
  note?: string | null;
}) {
  const plans = plansFor(old);
  const [plan, setPlan] = useState<Plan>(() => planFirst(old));
  const [way, setWay] = useState<string | null>(null);
  const [step, setStep] = useState<1 | 2>(plans.length > 1 ? 1 : 2);
  const offer = !!offerUntil;
  const gift = offer && plan.gift > 0;
  const amount = plan.price;
  // the founder reads the plan in the message: «عام + شهرين بلاش، 180 د»
  const which = fill(gift ? t.planSaidGift : t.planSaid, { plan: monthsSaid(plan.months), amount });
  const receipt = support && way ? `https://wa.me/${support}?text=${encodeURIComponent(fill(t.payReceiptMsg, { shop, plan: which, way, from: phone ? fill(t.waFrom, { who: spaced(phone) }) : "" }))}` : null;
  const how =
    way === "D17" ? fill(t.payD17How, { amount }) : way === "Virement" ? fill(t.payRibHow, { amount }) : way === "Versement" ? fill(t.payVersementHow, { amount }) : way === "Mandat" ? fill(t.payMandatHow, { amount }) : null;
  // a transfer: the bank that takes them only (never none: with no such bank set, all of them); a deposit: every bank
  const banks = way === "Virement" && details?.banks.some((b) => b.transfer) ? details.banks.filter((b) => b.transfer) : (details?.banks ?? []);
  const rows =
    way === "D17" && details?.d17
      ? [{ label: "D17", value: details.d17, sub: null as string | null }]
      : way === "Virement" || way === "Versement"
        ? banks.filter((b) => b.rib).map((b) => ({ label: t.payRib, value: b.rib, sub: b.bank }))
        : [];
  const call = support ? (
    <a href={`tel:+${support}`} onClick={() => signal("pay", "call")} className="press flex h-11 items-center justify-center gap-2 text-[0.875rem] font-bold text-brand">
      <Phone className="size-4" /> {t.payAskCall}
    </a>
  ) : null;

  if (step === 1) {
    return (
      <div className="flex min-h-0 flex-1 flex-col justify-center-safe py-[2dvh]">
        <h1 className="text-[1.625rem] font-bold leading-tight">{title}</h1>
        <p className="mt-0.5 text-[0.9375rem] font-semibold text-muted">{note ?? t.planPick}</p>
        {offer && (
          <p className="mt-3 flex items-center gap-2 rounded-full bg-mint-soft py-1.5 pe-1.5 ps-3 text-[0.8125rem] font-bold text-mint">
            <Sparkles className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">
              {t.payOfferPlus} <span className="font-semibold">{t.payOfferOn}</span>
            </span>
            <Left until={offerUntil!} className="shrink-0 rounded-full bg-surface px-2.5 py-0.5 text-[0.8125rem] text-ink" />
          </p>
        )}
        <div className="mt-3 space-y-2" role="radiogroup" aria-label={t.planPick}>
          {plans.map((x) => {
            const on = x.id === plan.id;
            const more = offer && x.gift > 0;
            return (
              <button
                key={x.id}
                type="button"
                role="radio"
                aria-checked={on}
                aria-label={`${monthsSaid(x.months)} · ${x.price} ${t.payCurrency}`}
                onClick={() => {
                  setPlan(x);
                  signal("pay", `plan · ${x.months}`);
                }}
                className={`press flex w-full items-center gap-3 rounded-[1.25rem] bg-surface px-4 py-[clamp(0.6rem,1.6dvh,0.95rem)] text-start transition-shadow duration-200 ${on ? "ring-[2.5px] ring-inset ring-brand shadow-[0_10px_24px_-16px_rgb(74_42_214/0.6)]" : "shadow-card"}`}
              >
                <span className={`grid size-6 shrink-0 place-items-center rounded-full ${on ? "bg-brand text-white" : "ring-2 ring-inset ring-line"}`}>{on && <Check className="size-3.5" strokeWidth={3.5} />}</span>
                <span className="min-w-0 flex-1">
                  <span className="flex items-center gap-2">
                    <b className="text-[1.0625rem] font-bold">{monthsSaid(x.months)}</b>
                    {x.id === "year" && <span className="rounded-full bg-brand-soft px-2 py-px text-[0.6875rem] font-bold text-brand">{t.planBest}</span>}
                  </span>
                  <span className="block truncate text-[0.8125rem] text-muted">
                    {x.months === 1 ? t.planFree : fill(t.planPerMonth, { n: perMonth(x, more) })}
                    {more && <b className="font-bold text-mint"> · {t.payOfferPlus}</b>}
                  </span>
                </span>
                <span className="flex shrink-0 items-end gap-0.5">
                  <b className={`num text-[1.625rem] font-bold leading-none ${on ? "text-brand" : ""}`}>{x.price}</b>
                  <span className="pb-0.5 text-[0.8125rem] font-bold">{t.payCurrency}</span>
                </span>
              </button>
            );
          })}
        </div>
        <button
          type="button"
          onClick={() => {
            setStep(2);
            signal("pay", `next · ${plan.months}`);
          }}
          className="press mt-4 flex h-14 shrink-0 items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(150deg,#8f75ff,#6c47ff_50%,#4a2ad6)] text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-14px_rgb(108_71_255/0.8)]"
        >
          {t.payNext} · <bdi className="num">{amount}</bdi> {t.payCurrency}
        </button>
        {call && <div className="mt-1">{call}</div>}
      </div>
    );
  }

  return (
    <div className="flex min-h-0 flex-1 flex-col justify-center-safe py-[2dvh]">
      {plans.length > 1 ? (
        <>
          {/* what was chosen, one tap from changing it */}
          <button type="button" onClick={() => setStep(1)} className="press flex max-w-full items-center gap-2 self-start rounded-full bg-surface py-1.5 pe-3 ps-1.5 text-[0.8125rem] font-bold shadow-card">
            <span className="grid size-6 shrink-0 place-items-center rounded-full bg-brand text-white">
              <Check className="size-3.5" strokeWidth={3.5} />
            </span>
            <span className="min-w-0 truncate">
              {monthsSaid(plan.months)}
              {gift && <span className="text-mint"> {t.payOfferPlus}</span>} · <bdi className="num">{amount}</bdi> {t.payCurrency}
            </span>
            <span className="shrink-0 text-brand">{t.payChange}</span>
          </button>
          <h1 className="mt-3 text-[1.625rem] font-bold leading-tight">{t.payHowTitle}</h1>
        </>
      ) : (
        <>
          {/* one price, nothing to choose: the page's own title, then the price */}
          <h1 className="text-[1.625rem] font-bold leading-tight">{title}</h1>
          {note && <p className="mt-0.5 text-[0.9375rem] font-semibold text-muted">{note}</p>}
          <p className="mt-2 flex items-center gap-2 self-start rounded-full bg-surface py-1.5 pe-3.5 ps-1.5 text-[0.9375rem] font-bold shadow-card">
            <span className="grid size-7 place-items-center rounded-full bg-brand-soft text-brand">
              <Crown className="size-4" strokeWidth={2.2} />
            </span>
            <span>
              <bdi className="num">{amount}</bdi> {t.payCurrency} <span className="font-semibold text-body">{t.payPer}</span>
            </span>
          </p>
          <h2 className="mt-3 text-[1.0625rem] font-bold">{t.payHowTitle}</h2>
        </>
      )}
      <div className="mt-3 grid grid-cols-2 gap-2" role="radiogroup" aria-label={t.payWays}>
        {WAYS.map((w) => {
          const on = way === w.key;
          return (
            <button
              key={w.key}
              type="button"
              role="radio"
              aria-checked={on}
              aria-label={w.key}
              onClick={() => {
                setWay(w.key);
                signal("pay", `way · ${w.key}`);
              }}
              className={`press flex h-[3.5rem] min-w-0 items-center justify-center gap-2.5 rounded-[1rem] bg-surface px-3 shadow-card transition-shadow duration-200 ${on ? "ring-[2.5px] ring-inset ring-brand" : ""}`}
            >
              {w.title ? (
                <>
                  <span className="[&>svg]:size-8">{w.mark}</span>
                  <span className={`min-w-0 text-center text-[0.875rem] font-bold ${on ? "text-brand" : ""}`} dir="ltr">
                    {w.title}
                  </span>
                </>
              ) : (
                <span className="[&>svg]:size-10">{w.mark}</span>
              )}
            </button>
          );
        })}
      </div>
      {/* what to send and where, with the copy buttons */}
      {how && (
        <div className="mt-3 animate-pop rounded-[1.25rem] bg-surface p-3.5 shadow-card">
          <p className="text-[0.875rem] font-bold leading-snug">{how}</p>
          {rows.length > 0 && (
            <div className="mt-1.5 divide-y divide-line rounded-[1rem] bg-canvas">
              {rows.map((r) => (
                <Detail key={r.value} label={r.label} value={r.value} sub={r.sub} />
              ))}
            </div>
          )}
        </div>
      )}
      {support && (
        <div className="mt-[1.8dvh]">
          {receipt ? (
            <a
              href={receipt}
              target="_blank"
              rel="noreferrer"
              onClick={() => signal("pay", `receipt · ${way} · ${plan.months}${gift ? "+2" : ""}`)}
              className="press flex h-14 animate-pop items-center justify-center gap-2 rounded-[1.25rem] bg-[linear-gradient(150deg,#3ee07f,#25d366_50%,#1aa851)] text-[1.0625rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(37_211_102/0.6)]"
            >
              <MessageCircle className="size-5" /> {t.payReceiptGo}
            </a>
          ) : (
            <span className="flex h-14 items-center justify-center rounded-[1.25rem] bg-ink/[0.06] text-[1rem] font-bold text-muted" aria-disabled>
              {t.payChoose}
            </span>
          )}
          {receipt && <p className="mt-1.5 text-center text-[0.75rem] text-muted">{t.payReceiptSub}</p>}
          <div className="mt-0.5">{call}</div>
        </div>
      )}
    </div>
  );
}
