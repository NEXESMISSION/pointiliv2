"use client";

import { useState, useTransition } from "react";
import { Power } from "lucide-react";
import { adminPlan, adminTrial } from "@/app/actions";
import type { BoardMore } from "@/app/admin/actions";
import type { AccessShop } from "@/lib/board";
import { PlanImage, type PlanShot } from "@/components/PlanImage";
import { daysN, fill, monthsSaid, t } from "@/lib/t";

const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));
const NOT_DONE = "ما تعدّاتش، عاود.";
const chip = (on: boolean) => `h-9 rounded-full px-3.5 text-[0.8438rem] font-bold ${on ? "bg-brand text-white" : "bg-surface text-body ring-1 ring-line"}`;
const quiet = "press flex h-10 items-center justify-center gap-1.5 rounded-[0.75rem] bg-surface px-3.5 text-[0.875rem] font-semibold text-body ring-1 ring-line disabled:opacity-60";

const METHODS = [
  { id: "cash", label: t.aPlanCash },
  { id: "d17", label: "D17" },
  { id: "virement", label: "Virement" },
  { id: "versement", label: "Versement" },
  { id: "mandat", label: "Mandat" },
];
const MONTHS = [1, 3, 6, 12, 15, 24];

/**
 * The access: where it stands, and the founder's three moves once the owner
 * paid by hand or asked for time — turn the subscription on (how long, what
 * came in and how), add days of trial, or stop it. The subscription turned
 * on, its picture opens by itself, to send the owner on WhatsApp.
 */
export function AdminAccess({ shop, plan = null, reload }: { shop: AccessShop; plan?: BoardMore["plan"] | null; reload?: () => Promise<void> }) {
  const [mode, setMode] = useState<null | "plan" | "trial" | "end">(null);
  const [pending, start] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [months, setMonths] = useState(12);
  const [amount, setAmount] = useState<number | null>(120);
  const [other, setOther] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [show, setShow] = useState(true);
  const [made, setMade] = useState<PlanShot | null>(null);
  const sum = other ? Number(other) : amount;

  const line = shop.paid && shop.paid_until ? `خالص حتى ${day(shop.paid_until)}` : shop.shut ? `التجربة وفات ${day(shop.trial_end)}` : shop.started ? `التجربة توفى ${day(shop.trial_end)}` : "التجربة تبدا مع أوّل حريف";
  const done = async (ok: boolean) => {
    if (!ok) return setError(NOT_DONE);
    setError(null);
    setMode(null);
    await reload?.();
  };
  const turnOn = () =>
    start(async () => {
      const res = await adminPlan(shop.id, "paid", months, null, null, show, sum ? method : null, sum);
      if (res.ok) setMade({ at: new Date().toISOString(), kind: "paid", months, until: res.until ?? null, amount: sum ?? null, method: sum ? method : null, shop: shop.name, owner: shop.owner.name });
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
            <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanMonths}</span>
            <div className="flex flex-wrap gap-1.5">
              {MONTHS.map((m) => (
                <button key={m} type="button" onClick={() => setMonths(m)} className={chip(months === m)}>
                  {monthsSaid(m)}
                </button>
              ))}
            </div>
            {shop.paid && shop.paid_until && <p className="mt-1 text-[0.75rem] text-muted">{fill(t.aPlanFromEnd, { date: day(shop.paid_until) })}</p>}
          </div>
          <div>
            <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanAmount}</span>
            <div className="flex flex-wrap gap-1.5">
              {[120, 0].map((a) => (
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
                onChange={(e) => setOther(e.target.value.replace(/\D/g, "").slice(0, 6))}
                inputMode="numeric"
                placeholder={t.aPlanAmountOther}
                aria-label={t.aPlanAmountOther}
                className={`h-9 w-[7.5rem] rounded-full bg-surface px-3 text-center text-[16px] ring-1 ${other ? "ring-brand" : "ring-line"}`}
              />
            </div>
          </div>
          {sum !== 0 && (
            <div>
              <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanHow}</span>
              <div className="flex flex-wrap gap-1.5">
                {METHODS.map((m) => (
                  <button key={m.id} type="button" onClick={() => setMethod(method === m.id ? null : m.id)} className={`h-8 rounded-full px-3 text-[0.8125rem] font-bold ${method === m.id ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}>
                    {m.label}
                  </button>
                ))}
              </div>
            </div>
          )}
          <label className="flex items-center gap-2 text-[0.8438rem] font-semibold text-body">
            <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-4 accent-[#6c47ff]" />
            {t.aPlanShow}
          </label>
          <div className="flex gap-2">
            <button type="button" disabled={pending} onClick={turnOn} className="press flex h-10 flex-1 items-center justify-center gap-1.5 rounded-[0.75rem] bg-brand text-[0.875rem] font-bold text-white disabled:opacity-60">
              <Power className="size-4" /> {pending ? "…" : `خدّم ${monthsSaid(months)}`}
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
