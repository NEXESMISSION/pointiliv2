"use client";

import { useActionState, useEffect, useState } from "react";
import { Pencil, Plus } from "lucide-react";
import { abSavePlan, type AbForm } from "@/app/actions/abonili";
import { money } from "@/lib/abonili/format";
import type { AbPlan } from "@/lib/abonili/types";
import { useAb } from "./AbProvider";
import { PlanLimit } from "./PlanLimit";
import { Sheet } from "./Sheet";

type Draft = { id?: string; name: string; price: string; days: string; sessions: string; active: boolean };

const blank: Draft = { name: "", price: "", days: "30", sessions: "", active: true };

/** The formules: a list you can read, and one sheet to make or change any of them. */
export function PlansEditor({ plans }: { plans: AbPlan[] }) {
  const { a, count, intl, locale } = useAb();
  const [draft, setDraft] = useState<Draft | null>(null);

  const presets: Draft[] = [
    { name: a.plans.preset.month, price: "", days: "30", sessions: "", active: true },
    { name: a.plans.preset.quarter, price: "", days: "90", sessions: "", active: true },
    { name: a.plans.preset.year, price: "", days: "365", sessions: "", active: true },
    { name: a.plans.preset.ten, price: "", days: "", sessions: "10", active: true },
  ];

  return (
    <div className="space-y-5">
      <button type="button" className="ab-btn" onClick={() => setDraft(blank)}>
        <Plus aria-hidden />
        {a.plans.add}
      </button>

      {plans.length === 0 ? (
        <div className="ab-panel space-y-3 p-5">
          <p className="text-[15px] ab-dim">{a.plans.empty}</p>
          <p className="ab-h2 !mb-0">{a.plans.presets}</p>
          <div className="flex flex-wrap gap-2">
            {presets.map((p) => (
              <button key={p.name} type="button" className="ab-chip" onClick={() => setDraft(p)}>{p.name}</button>
            ))}
          </div>
        </div>
      ) : (
        <ul className="grid gap-3 sm:grid-cols-2">
          {plans.map((p) => (
            <li key={p.id} className={`ab-panel p-4 ${p.active ? "" : "opacity-55"}`}>
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="ab-trunc text-[18px] font-extrabold" dir="auto">{p.name}</p>
                  <p className="text-[14px] ab-dim"><PlanLimit p={p} /></p>
                </div>
                <p className="ab-ltr ab-num text-[26px]" style={{ color: "var(--ab-lime)" }}>{money(p.price, intl, locale)}</p>
              </div>
              <div className="mt-4 flex items-center justify-between gap-3">
                <span className="text-[13px] font-semibold ab-faint">
                  {p.active ? count(a.plans.onIt, p.members) : a.plans.inactive}
                </span>
                <button type="button" className="ab-btn ab-btn-quiet ab-btn-sm"
                  onClick={() => setDraft({ id: p.id, name: p.name, price: String(p.price), days: p.days ? String(p.days) : "", sessions: p.sessions ? String(p.sessions) : "", active: p.active })}>
                  <Pencil aria-hidden />
                  {a.plans.edit}
                </button>
              </div>
            </li>
          ))}
        </ul>
      )}

      <Sheet open={draft !== null} onClose={() => setDraft(null)} title={draft?.id ? a.plans.edit : a.plans.add}>
        {draft && <PlanForm key={draft.id ?? draft.name} draft={draft} onDone={() => setDraft(null)} />}
      </Sheet>
    </div>
  );
}

function PlanForm({ draft, onDone }: { draft: Draft; onDone: () => void }) {
  const { a } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abSavePlan, null);
  const [active, setActive] = useState(draft.active);
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);

  return (
    <form action={action} className="space-y-4">
      {draft.id && <input type="hidden" name="id" value={draft.id} />}
      <input type="hidden" name="active" value={String(active)} />
      {state?.error && <p className="ab-alert">{state.error}</p>}

      <div>
        <label className="ab-label" htmlFor="p-name">{a.plans.name}</label>
        <input id="p-name" name="name" className="ab-input" defaultValue={draft.name} placeholder={a.plans.namePh} required minLength={2} maxLength={40} dir="auto" />
      </div>
      <div>
        <label className="ab-label" htmlFor="p-price">{a.plans.price}</label>
        <input id="p-price" name="price" className="ab-input ab-ltr text-[20px] font-bold" inputMode="decimal" defaultValue={draft.price} required autoFocus={!draft.price} />
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ab-label" htmlFor="p-days">{a.plans.days}</label>
          <input id="p-days" name="days" className="ab-input ab-ltr" inputMode="numeric" defaultValue={draft.days} placeholder={a.plans.sessionsPh} />
        </div>
        <div>
          <label className="ab-label" htmlFor="p-sessions">{a.plans.sessions}</label>
          <input id="p-sessions" name="sessions" className="ab-input ab-ltr" inputMode="numeric" defaultValue={draft.sessions} placeholder={a.plans.sessionsPh} />
        </div>
      </div>
      <p className="ab-hint !mt-1">{a.plans.limitHint}</p>

      {draft.id && (
        <div className="flex gap-2">
          <button type="button" className="ab-chip flex-1 justify-center" aria-current={active ? "page" : undefined} onClick={() => setActive(true)}>{a.plans.active}</button>
          <button type="button" className="ab-chip flex-1 justify-center" aria-current={!active ? "page" : undefined} onClick={() => setActive(false)}>{a.plans.inactive}</button>
        </div>
      )}

      <button type="submit" className="ab-btn ab-btn-block" disabled={pending}>
        {draft.id ? a.plans.save : a.plans.create}
      </button>
    </form>
  );
}
