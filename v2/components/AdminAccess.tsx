"use client";

import { useState, useTransition } from "react";
import { Power } from "lucide-react";
import { adminPlan, adminTrial } from "@/app/actions";
import { adminPackPreview, adminSetPack } from "@/app/actions-packs";
import { P, PACK_NAME } from "@/lib/packs";
import type { BoardMore } from "@/app/admin/actions";
import type { AccessShop } from "@/lib/board";
import { PlanImage, type PlanShot } from "@/components/PlanImage";
import { GIFT_MONTHS, PAY_WAY_MAX, PAY_WAYS, payWayOf, plansOfPack, type Pack } from "@/lib/plans";
import { daysN, fill, monthsSaid, t } from "@/lib/t";

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
const NOT_DONE = "ما تعدّاتش، عاود.";
const chip = (on: boolean) => `h-9 rounded-full px-3.5 text-[0.8438rem] font-bold ${on ? "bg-brand text-white" : "bg-surface text-body ring-1 ring-line"}`;
const quiet = "press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-surface px-3.5 text-[0.875rem] font-semibold text-body ring-1 ring-line disabled:opacity-60";

/** a box typed into: lit while it holds something, coral while what it holds will not do */
const typedBox = (lit: boolean, bad = false) => `h-9 rounded-full bg-surface px-3 text-center text-[16px] ring-1 ${bad ? "ring-coral" : lit ? "ring-brand" : "ring-line"}`;

/**
 * The access: where it stands, and the founder's three moves once the owner
 * paid by hand or asked for time — turn the subscription on (how long, what
 * came in and how), add days of trial, or stop it. The subscription turned
 * on, its picture opens by itself, to send the owner on WhatsApp.
 *
 * The lengths are the shop's own price list (lib/plans.ts: a month 35, six
 * months 120, a year 180 — or the year at 120 for a shop that paid before),
 * each a tap that writes what came in; the two months of the offer ride on
 * six months or a year, ticked by themselves while the shop's offer runs.
 *
 * Anything else is typed (the founder, 8 Nov 2026: «add the option of typing
 * the number of months I want … and an option to type the payment method»):
 * the months, 1 to 120, exactly as typed (no offer on top, no price guessed —
 * the amount is said by hand too); the way it came, a few words of his own
 * next to the usual ones (lib/plans.ts, payWayOf).
 */
export function AdminAccess({ shop, plan = null, reload, pack = "old", packChanged }: { shop: AccessShop; plan?: BoardMore["plan"] | null; reload?: () => Promise<void>; /** the shop's pack (lib/plans): Pro's own prices; an old shop, its own as always */ pack?: Pack; /** the pack chosen here and set with the subscription: read the shop's systems again */ packChanged?: () => Promise<void> }) {
  const [mode, setMode] = useState<null | "plan" | "trial" | "end">(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  // the pack the owner paid for, chosen here with the length (the founder, 9 Nov 2026: one place for both) —
  // the price list follows it; an old shop stays old unless another is chosen
  const [packNow, setPackNow] = useState<Pack>(pack);
  // another pack chosen here: what it changes for the shop, read and said before the button (the same list
  // as the pack's own line) — a shop on the store cannot go down to Pointili until it is back on the card
  const [packSaid, setPackSaid] = useState<{ changes: string[]; blocked: string | null } | "…" | "failed" | null>(null);
  const packAsk = (p: Pack) => {
    if (p === pack) return setPackSaid(null);
    setPackSaid("…");
    void adminPackPreview(shop.id, p)
      .catch(() => null)
      .then((got) => setPackSaid(got ?? "failed"));
  };
  const packBlocked = packNow !== pack && (packSaid === null || typeof packSaid === "string" || !!packSaid.blocked);
  const plans = plansOfPack(packNow, shop.old_price);
  const first = plans.find((p) => p.id === "year") ?? plans[0];
  // the offer still running for this shop (the trial's first 3 days, nothing paid): its two months, ticked
  const [inOffer] = useState(() => !shop.paid && !!shop.offer_until && Date.parse(shop.offer_until) > Date.now());
  const [base, setBase] = useState(() => first.months);
  const [gift, setGift] = useState(inOffer);
  const [amount, setAmount] = useState<number | null>(first.price);
  // the months typed by hand, in place of the price list's lengths
  const [typed, setTyped] = useState("");
  const typedOk = /^\d{1,3}$/.test(typed) && Number(typed) >= 1 && Number(typed) <= 120;
  const listed = typed ? null : (plans.find((p) => p.months === base) ?? null);
  const giftOn = gift && !!listed?.gift;
  const months = typed ? (typedOk ? Number(typed) : 0) : base + (giftOn ? GIFT_MONTHS : 0);
  const [other, setOther] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  // the way it came, typed: it takes the place of a chip
  const [wayTyped, setWayTyped] = useState("");
  const way = payWayOf(wayTyped) ?? method;
  const [show, setShow] = useState(true);
  const [made, setMade] = useState<PlanShot | null>(null);
  const sum = other ? Number(other) : amount;
  // something to turn on, and what came in said (a sum, or «with no money») — and another pack, once its changes are read
  const canGo = months >= 1 && sum !== null && !packBlocked;

  const line = shop.paid && shop.paid_until ? `خالص حتى ${day(shop.paid_until)}` : shop.shut ? `التجربة وفات ${day(shop.trial_end)}` : shop.started ? `التجربة توفى ${day(shop.trial_end)}` : "التجربة تبدا مع أوّل حريف";
  const done = async (ok: boolean) => {
    if (!ok) return setError(NOT_DONE);
    setError(null);
    setMode(null);
    await reload?.();
  };
  const turnOn = () =>
    start(async () => {
      if (!canGo) return;
      const res = await adminPlan(shop.id, "paid", months, null, null, show, sum ? way : null, sum);
      if (res.ok) setMade({ at: new Date().toISOString(), kind: "paid", months, until: res.until ?? null, amount: sum ?? null, method: sum ? way : null, shop: shop.name, owner: shop.owner.name });
      // the pack paid for, set with it (its switches follow); the subscription stands even when the pack is refused
      if (res.ok && packNow !== pack) {
        const set = await adminSetPack(shop.id, packNow);
        if (!set.ok) {
          setError(set.error === "store_on" ? P.aPackStoreOn : NOT_DONE);
          await reload?.();
          return;
        }
        await packChanged?.();
      }
      await done(res.ok);
    });

  return (
    <section className="rounded-[0.875rem] bg-canvas/70 p-3">
      <p className="flex flex-wrap items-center gap-x-2 gap-y-0.5">
        <b className="text-[0.9375rem] text-ink">الأبونمان</b>
        <span className={`text-[0.8125rem] font-semibold ${shop.paid ? "text-mint" : shop.shut ? "text-coral" : "text-muted"}`}>{line}</span>
      </p>

      {mode === null && (
        <div className="mt-2.5 flex flex-wrap gap-2">
          <button type="button" onClick={() => setMode("plan")} className="press flex h-10 items-center gap-1.5 rounded-[0.75rem] bg-brand px-3.5 text-[0.875rem] font-bold text-white">
            <Power className="size-4" /> {t.aPlanGive}
          </button>
          <button type="button" onClick={() => setMode("trial")} className={quiet}>
            + أيّام تجربة
          </button>
          {shop.paid && (
            <button type="button" onClick={() => setMode("end")} className={`${quiet} text-coral`}>
              {t.aPlanEnd}
            </button>
          )}
        </div>
      )}

      {mode === "plan" && (
        <div className="mt-2.5 space-y-3">
          <div>
            <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{P.aPack}</span>
            <div className="flex flex-wrap gap-1.5">
              {(pack === "old" ? (["old", "base", "pro"] as const) : (["base", "pro"] as const)).map((p) => (
                <button
                  key={p}
                  type="button"
                  onClick={() => {
                    setPackNow(p);
                    packAsk(p);
                    const list = plansOfPack(p, shop.old_price);
                    const y = list.find((x) => x.id === "year") ?? list[0];
                    setBase(y.months);
                    setAmount(y.price);
                    setOther("");
                    setTyped("");
                  }}
                  className={chip(packNow === p)}
                >
                  {p === "old" ? P.aPackOld : PACK_NAME[p]}
                </button>
              ))}
            </div>
            {/* another pack than the shop's: what it changes, before the button that does it */}
            {packNow !== pack && packSaid !== null && (
              <div className="mt-1.5 rounded-[0.75rem] bg-surface p-2.5 ring-1 ring-line">
                <p className="text-[0.8125rem] font-bold text-ink">{fill(P.aPackAsk, { pack: packNow === "old" ? P.aPackOld : PACK_NAME[packNow] })}</p>
                {packSaid === "…" ? (
                  <p className="mt-1 text-[0.75rem] text-muted">…</p>
                ) : packSaid === "failed" ? (
                  <p className="mt-1 flex items-center gap-2 text-[0.75rem] font-semibold text-coral">
                    <span className="min-w-0 flex-1">{NOT_DONE}</span>
                    <button type="button" onClick={() => packAsk(packNow)} className="h-7 rounded-[0.5rem] bg-canvas px-2.5 text-[0.75rem] font-bold text-brand">
                      عاود
                    </button>
                  </p>
                ) : packSaid.blocked ? (
                  <p className="mt-1 text-[0.75rem] font-semibold text-coral">{P.aPackStoreOn}</p>
                ) : (
                  <ul className="mt-1 list-disc space-y-0.5 ps-4 text-[0.75rem] text-body">
                    {packSaid.changes.length === 0 ? <li>{P.aPackNothing}</li> : packSaid.changes.map((c) => <li key={c}>{P.aPackChanges[c] ?? c}</li>)}
                  </ul>
                )}
              </div>
            )}
          </div>
          <div>
            <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanMonths}</span>
            <div className="flex flex-wrap gap-1.5">
              {plans.map((p) => (
                <button
                  key={p.months}
                  type="button"
                  onClick={() => {
                    setBase(p.months);
                    setAmount(p.price);
                    setOther("");
                    setTyped("");
                  }}
                  className={chip(!typed && base === p.months)}
                >
                  {monthsSaid(p.months)} · {p.price} {t.payCurrency}
                </button>
              ))}
              {/* any other length, typed: exactly that many months, its amount said below by hand */}
              <input
                value={typed}
                onChange={(e) => {
                  const v = e.target.value.replace(/\D/g, "").slice(0, 3);
                  setTyped(v);
                  // a price list's amount means nothing for a length typed by hand (a «with no money» chosen stays)
                  if (v) {
                    if (amount !== 0) setAmount(null);
                  } else setAmount(plans.find((p) => p.months === base)?.price ?? null);
                }}
                inputMode="numeric"
                placeholder={t.aPlanMonthsTyped}
                aria-label={t.aPlanMonthsTyped}
                aria-invalid={!!typed && !typedOk}
                className={`${typedBox(!!typed, !!typed && !typedOk)} w-[10.5rem]`}
              />
            </div>
            {!!typed && !typedOk && <p className="mt-1 text-[0.75rem] font-semibold text-coral">{t.aPlanMonthsRange}</p>}
            {!!listed?.gift && (
              <label className="mt-2 flex items-center gap-2 text-[0.8438rem] font-semibold text-body">
                <input type="checkbox" checked={gift} onChange={(e) => setGift(e.target.checked)} className="size-4 accent-[#6c47ff]" />
                {t.payOfferPlus} {inOffer ? "(العرض مازال يجري)" : "(العرض وفى)"}
              </label>
            )}
            {shop.old_price && <p className="mt-1 text-[0.75rem] text-muted">خلّص قبل 7 نوفمبر 2026: يقعد بالسوم القديم</p>}
            {shop.paid && shop.paid_until && <p className="mt-1 text-[0.75rem] text-muted">{fill(t.aPlanFromEnd, { date: day(shop.paid_until) })}</p>}
          </div>
          <div>
            <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanAmount}</span>
            <div className="flex flex-wrap gap-1.5">
              {[...new Set([listed?.price ?? amount ?? 0, 0])].map((a) => (
                <button
                  key={a}
                  type="button"
                  onClick={() => {
                    setAmount(a);
                    setOther("");
                  }}
                  className={chip(!other && amount === a)}
                >
                  {a === 0 ? t.aPlanAmountExtra : `${a} ${t.payCurrency}`}
                </button>
              ))}
              <input
                value={other}
                onChange={(e) => setOther(e.target.value.replace(/\D/g, "").slice(0, 5))}
                inputMode="numeric"
                placeholder={t.aPlanAmountOther}
                aria-label={t.aPlanAmountOther}
                className={`${typedBox(!!other)} w-[7.5rem]`}
              />
            </div>
            {sum === null && <p className="mt-1 text-[0.75rem] font-semibold text-muted">{t.aPlanAmountNeed}</p>}
          </div>
          {sum !== 0 && (
            <div>
              <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanHow}</span>
              <div className="flex flex-wrap items-center gap-1.5">
                {PAY_WAYS.map((m) => {
                  const on = !wayTyped.trim() && method === m.id;
                  return (
                    <button
                      key={m.id}
                      type="button"
                      onClick={() => {
                        setMethod(on ? null : m.id);
                        setWayTyped("");
                      }}
                      className={`h-8 rounded-full px-3 text-[0.8125rem] font-bold ${on ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}
                    >
                      {m.label}
                    </button>
                  );
                })}
                {/* any other way, in the founder's own words (a usual one typed is taken as that one) */}
                <input
                  value={wayTyped}
                  onChange={(e) => setWayTyped(e.target.value.slice(0, PAY_WAY_MAX))}
                  maxLength={PAY_WAY_MAX}
                  placeholder={t.aPlanHowTyped}
                  aria-label={t.aPlanHowTyped}
                  className={`${typedBox(!!wayTyped.trim())} w-[9.5rem]`}
                />
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-[0.8438rem] font-semibold text-body">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-4 accent-[#6c47ff]" />
            {t.aPlanShow}
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={pending || !canGo} onClick={turnOn} className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand text-[0.875rem] font-bold text-white disabled:opacity-60">
              <Power className="size-4" /> {pending ? "…" : months >= 1 ? `خدّم ${monthsSaid(months)}` : t.aPlanGive}
            </button>
            <button type="button" onClick={() => setMode(null)} className={quiet}>
              {t.back}
            </button>
          </div>
        </div>
      )}

      {mode === "trial" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2">
          <span className="text-[0.8125rem] font-semibold text-muted">زيدو في التجربة:</span>
          {[3, 7].map((n) => (
            <button key={n} type="button" disabled={pending} onClick={() => start(async () => done((await adminTrial(shop.id, n)).ok))} className="press h-9 rounded-full bg-brand px-3.5 text-[0.8438rem] font-bold text-white disabled:opacity-60">
              +{daysN(n)}
            </button>
          ))}
          <button type="button" onClick={() => setMode(null)} className="h-9 px-2 text-[0.8438rem] font-semibold text-muted">
            {t.back}
          </button>
        </div>
      )}

      {mode === "end" && (
        <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-coral-soft p-2.5">
          <span className="min-w-0 flex-1 text-[0.8438rem] font-semibold text-coral">{t.aPlanEndConfirm}</span>
          <button type="button" onClick={() => setMode(null)} className="h-9 rounded-[0.625rem] bg-surface px-3 text-[0.8125rem] font-semibold">
            لا
          </button>
          <button type="button" disabled={pending} onClick={() => start(async () => done((await adminPlan(shop.id, "end", null, null, null, false, null)).ok))} className="h-9 rounded-[0.625rem] bg-coral px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60">
            {t.aPlanEnd}
          </button>
        </div>
      )}

      {error && <p className="mt-2 text-[0.8125rem] font-semibold text-coral">{error}</p>}
      {made && (
        <div className="mt-2.5">
          <PlanImage plan={made} startOpen label="تصويرة الأبونمان" onClose={() => setMade(null)} />
        </div>
      )}

      {/* what the founder did to this shop's access, the last four */}
      {plan && plan.length > 0 && (
        <ul className="mt-2.5 space-y-1 border-t border-line/70 pt-2 text-[0.8125rem] text-body">
          {plan.map((l, i) => (
            <li key={i} className="flex gap-2">
              <span className="min-w-0 flex-1">
                {l.kind === "paid" && l.months ? `خدّمنا ${monthsSaid(l.months)}` : l.kind === "until" && l.until ? `خدّمنا حتى ${day(l.until)}` : l.kind === "trial" && l.until ? `زدنا في التجربة حتى ${day(l.until)}` : "وقّفناه"}
                {l.amount ? ` · ${l.amount} ${t.payCurrency}` : ""}
              </span>
              <span className="shrink-0 text-muted">{day(l.at)}</span>
            </li>
          ))}
        </ul>
      )}
    </section>
  );
}
