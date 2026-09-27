"use client";

import Link from "next/link";
import { useActionState, useState } from "react";
import { UserPlus } from "lucide-react";
import { abAddMember, type AbForm } from "@/app/actions/abonili";
import { money } from "@/lib/abonili/format";
import { AB_METHODS, type AbPlan } from "@/lib/abonili/types";
import { useAb } from "./AbProvider";
import { PlanLimit } from "./PlanLimit";

/**
 * Selling an abonnement to someone new, while they stand at the desk with the
 * money: name, formule, what they paid — three things, and they are in. The
 * phone is only there to send them their card.
 */
export function AddMemberForm({ plans, today }: { plans: AbPlan[]; today: string }) {
  const { a, intl, locale } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abAddMember, null);
  const v = state?.values ?? {};
  const selling = plans.filter((p) => p.active);
  const [planId, setPlanId] = useState(v.plan ?? selling[0]?.id ?? "");
  const plan = selling.find((p) => p.id === planId) ?? null;
  const [amount, setAmount] = useState(v.amount ?? (plan ? String(plan.price) : ""));
  const [method, setMethod] = useState(v.method || "cash");

  return (
    <form action={action} className="space-y-5">
      {state?.error && (
        <div className="ab-alert space-y-2">
          <p>{state.error}</p>
          {state.code === "phone_taken" && typeof state.data?.member_id === "string" && (
            <Link href={`/abonili/members/${state.data.member_id}`} className="underline">{a.add.openExisting}</Link>
          )}
        </div>
      )}

      <div>
        <label className="ab-label" htmlFor="name">{a.add.name}</label>
        <input id="name" name="name" className="ab-input" required minLength={2} maxLength={80} autoComplete="off"
          placeholder={a.add.namePh} defaultValue={v.name} autoFocus dir="auto" />
      </div>

      <div>
        <label className="ab-label" htmlFor="phone">{a.add.phone}</label>
        <div className="flex items-stretch gap-2" dir="ltr">
          <span className="ab-well grid place-items-center px-3 text-[16px] font-bold ab-dim">+216</span>
          <input id="phone" name="phone" className="ab-input" inputMode="tel" autoComplete="off" maxLength={14}
            placeholder="28 131 507" defaultValue={v.phone} />
        </div>
        <p className="ab-hint">{a.add.phoneHint}</p>
      </div>

      <fieldset>
        <legend className="ab-label">{a.add.plan}</legend>
        <div className="grid gap-2 sm:grid-cols-2">
          {selling.map((p) => (
            <label key={p.id} className="ab-panel flex cursor-pointer items-center gap-3 p-3.5 has-[:checked]:border-[var(--ab-lime)] has-[:checked]:bg-[rgb(200_240_60/0.06)]">
              <input type="radio" name="plan" value={p.id} checked={planId === p.id} className="size-5 accent-[var(--ab-lime)]"
                onChange={() => { setPlanId(p.id); setAmount(String(p.price)); }} />
              <span className="min-w-0 flex-1">
                <span className="ab-trunc block text-[16px] font-bold" dir="auto">{p.name}</span>
                <span className="block text-[13px] ab-faint"><PlanLimit p={p} /></span>
              </span>
              <span className="text-[15px] font-bold ab-ltr">{money(p.price, intl, locale)}</span>
            </label>
          ))}
          <label className="ab-panel flex cursor-pointer items-center gap-3 p-3.5 has-[:checked]:border-[var(--ab-line-2)]">
            <input type="radio" name="plan" value="" checked={planId === ""} className="size-5 accent-[var(--ab-lime)]"
              onChange={() => { setPlanId(""); setAmount(""); }} />
            <span className="text-[15px] font-semibold ab-dim">{a.add.noPlan}</span>
          </label>
        </div>
      </fieldset>

      {plan && (
        <div className="grid gap-4 sm:grid-cols-2">
          <div>
            <label className="ab-label" htmlFor="amount">{a.add.amount}</label>
            <input id="amount" name="amount" className="ab-input ab-ltr text-[20px] font-bold" inputMode="decimal"
              value={amount} onChange={(e) => setAmount(e.target.value)} required />
          </div>
          <div>
            <span className="ab-label">{a.add.method}</span>
            <input type="hidden" name="method" value={method} />
            <div className="flex flex-wrap gap-2">
              {AB_METHODS.filter((m) => m !== "other").map((m) => (
                <button key={m} type="button" className="ab-chip" aria-current={method === m ? "page" : undefined} onClick={() => setMethod(m)}>
                  {a.methods[m]}
                </button>
              ))}
            </div>
          </div>
          <div>
            <label className="ab-label" htmlFor="starts">{a.add.starts}</label>
            <input id="starts" name="starts" type="date" className="ab-input ab-ltr" defaultValue={v.starts || today} />
          </div>
        </div>
      )}

      <div>
        <label className="ab-label" htmlFor="note">{a.add.note}</label>
        <textarea id="note" name="note" className="ab-textarea" maxLength={300} placeholder={a.add.notePh} defaultValue={v.note} dir="auto" />
      </div>

      <button type="submit" className="ab-btn ab-btn-xl ab-btn-block" disabled={pending}>
        <UserPlus aria-hidden />
        {pending ? a.add.saving : a.add.submit}
      </button>
    </form>
  );
}
