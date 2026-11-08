"use client";

import { useState } from "react";
import { Check, Clock, Crown, Sparkles } from "lucide-react";
import { Left } from "@/components/Pay";
import { PayMethods } from "@/components/PayMethods";
import { perMonth, planFirst, plansFor, plansOfPack, type Plan } from "@/lib/plans";
import { PACK_NAME } from "@/lib/packs";
import { signal } from "@/lib/track";
import { fill, monthsSaid, t } from "@/lib/t";

type Details = { d17: string | null; banks: { bank: string | null; rib: string }[] };

/**
 * The pay page's card and its three steps (the founder, 7 Nov 2026): the
 * lengths side by side — a month, six months, a year, each with what a month
 * comes to, the year chosen first and marked the best — and, during the
 * trial's first 3 days, the two months more on six months and the year, the
 * clock beside it. The steps under it send the chosen plan's amount, and the
 * WhatsApp message tells the founder which plan. A shop that paid before
 * keeps its one price: the year at 120, nothing to choose.
 *
 * `paidUntil`: paid, and not near its end — the card says so and nothing is
 * to be paid (the steps come back a few days before the end: RENEW_DAYS).
 */
export function PayPlans({
  old,
  offerUntil,
  paidUntil,
  shop,
  support,
  details,
  phone,
  pack = null,
  want = null,
}: {
  old: boolean;
  /** the offer's end while it runs (null: no offer) */
  offerUntil: string | null;
  paidUntil: string | null;
  shop: string;
  support: string | null;
  details?: Details;
  phone?: string | null;
  /** a shop on a pack (lib/packs): its pack now — it chooses between the two; null: a shop already open, as always */
  pack?: "base" | "pro" | null;
  /** the pack chosen first (the owner came for Pro) */
  want?: "base" | "pro" | null;
}) {
  const [chosen, setChosen] = useState<"base" | "pro" | null>(want ?? pack);
  const plans = chosen ? plansOfPack(chosen, old) : plansFor(old);
  const [plan, setPlan] = useState<Plan>(() => (chosen ? (plans.find((p) => p.id === "year") ?? plans[0]) : planFirst(old)));
  // the pack changed: the same length on the other pack's list
  const pick = (p: "base" | "pro") => {
    setChosen(p);
    const list = plansOfPack(p, old);
    setPlan(list.find((x) => x.id === plan.id) ?? list[list.length - 1]);
    signal("pay", `pack · ${p}`);
  };
  const offer = !!offerUntil;
  const gift = offer && plan.gift > 0;

  return (
    <>
      <section className="relative mt-[1.6dvh] overflow-hidden rounded-[1.75rem] bg-[linear-gradient(140deg,#7c4dff,#6c47ff_45%,#3f22c9)] p-5 text-white [@media(max-height:700px)]:p-4">
        <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(90%_70%_at_0%_0%,rgb(255_255_255/0.25),transparent_60%)]" aria-hidden />
        <div className="relative flex items-start justify-between gap-3">
          <span className="min-w-0">
            <span className="block text-[0.8125rem] font-semibold text-white/80">{chosen ? `${PACK_NAME[chosen]} · ${t.payTitle}` : t.payPlan}</span>
            {/* one price (the shops that paid before), said as it always was */}
            {plans.length === 1 && !paidUntil && (
              <span className="mt-1 flex items-end gap-1.5">
                <span className="num text-[2.75rem] font-bold leading-none">{plans[0].price}</span>
                <span className="pb-1 text-[0.9375rem] font-bold">
                  {t.payCurrency} <span className="font-semibold text-white/80">{t.payPer}</span>
                </span>
              </span>
            )}
            {plans.length > 1 && !paidUntil && <span className="mt-0.5 block text-[1.0625rem] font-bold [@media(max-height:700px)]:hidden">{t.planPick}</span>}
          </span>
          {/* the owner screens' icons are line icons (components/Owner.tsx): on the purple card, white on its soft square */}
          <span className={`grid size-12 shrink-0 place-items-center rounded-[0.875rem] bg-white/20 ${plans.length > 1 && !paidUntil ? "[@media(max-height:700px)]:hidden" : ""}`}>
            <Crown className="size-6" strokeWidth={2.2} />
          </span>
        </div>

        {/* a shop on a pack: Pointili or Pointili Pro, side by side (Pro: the golden ticket, the store, staff phones, the file) */}
        {chosen && !paidUntil && (
          <div className="relative mt-3 grid grid-cols-2 gap-1 rounded-[1rem] bg-white/15 p-1" role="radiogroup" aria-label="Pointili">
            {(["base", "pro"] as const).map((p) => (
              <button
                key={p}
                type="button"
                role="radio"
                aria-checked={chosen === p}
                onClick={() => pick(p)}
                className={`press h-9 rounded-[0.75rem] text-[0.875rem] font-bold ${chosen === p ? "bg-white text-brand" : "text-white/90"}`}
              >
                {PACK_NAME[p]}
              </button>
            ))}
          </div>
        )}
        {plans.length > 1 && !paidUntil && (
          <div className="relative mt-3.5 grid grid-cols-3 gap-2 [@media(max-height:700px)]:mt-3" role="radiogroup" aria-label={t.planPick}>
            {plans.map((p) => {
              const on = p.id === plan.id;
              const best = p.id === "year";
              const more = offer && p.gift > 0;
              return (
                <button
                  key={p.id}
                  type="button"
                  role="radio"
                  aria-checked={on}
                  aria-label={`${monthsSaid(p.months)} · ${p.price} ${t.payCurrency}`}
                  onClick={() => {
                    setPlan(p);
                    signal("pay", `plan · ${p.months}`);
                  }}
                  className={`press relative flex min-w-0 flex-col items-center rounded-[1.125rem] px-1 pb-2.5 pt-3.5 text-center [@media(max-height:700px)]:pb-2 [@media(max-height:700px)]:pt-3 transition-colors duration-200 ${on ? "bg-white text-ink shadow-[0_12px_26px_-14px_rgb(20_16_40/0.6)]" : "bg-white/12 text-white ring-1 ring-inset ring-white/25"}`}
                >
                  {best && (
                    <span className={`absolute -top-2 start-1/2 -translate-x-1/2 whitespace-nowrap rounded-full px-2 py-px text-[0.625rem] font-bold rtl:translate-x-1/2 ${on ? "bg-mint text-white" : "bg-white text-brand"}`}>
                      {t.planBest}
                    </span>
                  )}
                  <span className={`text-[0.8125rem] font-bold ${on ? "text-body" : "text-white/85"}`}>{monthsSaid(p.months)}</span>
                  <span className="mt-1 flex items-end gap-0.5">
                    <span className={`num text-[1.75rem] font-bold leading-none [@media(max-height:700px)]:text-[1.5rem] ${on ? "text-brand" : ""}`}>{p.price}</span>
                    <span className="pb-0.5 text-[0.8125rem] font-bold">{t.payCurrency}</span>
                  </span>
                  <span className={`mt-1 w-full truncate text-[0.6875rem] font-semibold ${on ? "text-muted" : "text-white/75"}`}>
                    {p.months === 1 ? t.planFree : fill(t.planPerMonth, { n: perMonth(p, more) })}
                  </span>
                  {more && (
                    <span className={`mt-1.5 rounded-full px-2 py-px text-[0.6875rem] font-bold ${on ? "bg-mint-soft text-mint" : "bg-white/20 text-white"}`}>
                      {t.planGift}
                    </span>
                  )}
                </button>
              );
            })}
          </div>
        )}

        {offer && !paidUntil && (
          <div className="relative mt-3 flex items-center gap-2 rounded-[1rem] bg-white/15 px-3 py-2 backdrop-blur [@media(max-height:700px)]:mt-2 [@media(max-height:700px)]:py-1.5">
            <Sparkles className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 text-[0.8125rem] font-bold leading-tight">
              {t.payOfferPlus} <span className="font-semibold text-white/85">{t.payOfferOn}</span>
            </span>
            <span className="flex shrink-0 items-center gap-1 rounded-full bg-white px-2.5 py-1 text-[0.8125rem] font-bold text-brand">
              <Clock className="size-3.5" /> <Left until={offerUntil!} />
            </span>
          </div>
        )}

        {/* a phone of ordinary height keeps the plans and the ways to pay (with the numbers to copy) on one
            screen: the perks step aside under 760px — the owner has used them for days already */}
        <ul className={`relative mt-3 space-y-1.5 ${paidUntil ? "" : "[@media(max-height:760px)]:hidden"}`}>
          {[...t.payPerks, ...(chosen === "pro" ? PRO_PERKS : [])].map((p) => (
            <li key={p} className="flex items-start gap-2 text-[0.8125rem] text-white/95">
              <Check className="mt-0.5 size-4 shrink-0" strokeWidth={3} /> {p}
            </li>
          ))}
        </ul>
      </section>

      {paidUntil ? (
        <p className="mt-4 flex items-center justify-center gap-2 rounded-[1.25rem] bg-mint-soft px-4 py-3.5 text-[0.9375rem] font-bold text-mint">
          <Check className="size-5" strokeWidth={3} /> {fill(t.payPaidUntil, { date: day(paidUntil) })}
        </p>
      ) : (
        <PayMethods support={support} shop={shop} plan={plan} gift={gift} details={details} phone={phone} pack={chosen ? PACK_NAME[chosen] : null} />
      )}
    </>
  );
}

/** what Pro adds, said with the rest (lib/packs) */
const PRO_PERKS = ["التذكرة الذهبية: سحب للحرفاء", "الماغازة: التامبونات يوليو نقاط", "3 تليفونات للخدّامة", "ليستة الحرفاء في فيشي Excel"];

const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: "Africa/Tunis" }).format(new Date(iso));
