"use client";

import { useRouter } from "next/navigation";
import { useActionState, useEffect, useState, useTransition } from "react";
import { CalendarPlus, DoorOpen, Pencil, RefreshCw } from "lucide-react";
import { abAddDays, abCheckin, abRenew, abUpdateMember, type AbForm } from "@/app/actions/abonili";
import { money, phoneLocal, time } from "@/lib/abonili/format";
import { AB_METHODS, type AbMember, type AbPlan } from "@/lib/abonili/types";
import { useAb } from "./AbProvider";
import { PlanLimit } from "./PlanLimit";
import { Sheet } from "./Sheet";

export type Open = "renew" | "days" | "edit" | null;

/** Everything the owner can do to one member, under the status card. */
export function MemberActions({ m, plans, suspended, startWith = null }: { m: AbMember; plans: AbPlan[]; suspended: boolean; startWith?: Open }) {
  const { a, err, fill, intl } = useAb();
  const router = useRouter();
  // arriving from the door with ?renew=1 opens the renewal straight away
  const [open, setOpen] = useState<Open>(startWith);
  const [busy, start] = useTransition();
  const [note, setNote] = useState<string | null>(null);
  const inside = m.status === "active" || m.status === "soon";

  function letIn(force: boolean) {
    start(async () => {
      const r = await abCheckin(m.id, force);
      if (r.ok) {
        setNote(`${a.door.in} · ${time(new Date().toISOString(), intl)}`);
        router.refresh();
      } else if (r.error === "already_in") {
        setNote(fill(a.door.alreadyIn, { time: time(r.at, intl) }));
      } else setNote(err(r.error));
    });
  }

  const close = () => setOpen(null);

  return (
    <div className="space-y-3">
      {inside && (
        m.visited_today ? (
          <button type="button" className="ab-btn ab-btn-ghost ab-btn-block" disabled={busy || suspended} onClick={() => letIn(true)}>
            {a.door.letInAgain}
          </button>
        ) : (
          <button type="button" className="ab-btn ab-btn-xl ab-btn-block" disabled={busy || suspended} onClick={() => letIn(false)}>
            <DoorOpen aria-hidden />
            {a.door.letIn}
          </button>
        )
      )}
      {note && <p className="ab-ok" role="status">{note}</p>}

      <div className="grid grid-cols-3 gap-2">
        <button type="button" className={`ab-btn ${inside ? "ab-btn-quiet" : ""} ab-btn-sm`} disabled={suspended} onClick={() => setOpen("renew")}>
          <RefreshCw aria-hidden />
          {a.member.renew}
        </button>
        <button type="button" className="ab-btn ab-btn-quiet ab-btn-sm" disabled={suspended || !m.until} onClick={() => setOpen("days")}>
          <CalendarPlus aria-hidden />
          {a.member.addDays}
        </button>
        <button type="button" className="ab-btn ab-btn-quiet ab-btn-sm" onClick={() => setOpen("edit")}>
          <Pencil aria-hidden />
          {a.member.edit}
        </button>
      </div>

      <Sheet open={open === "renew"} onClose={close} title={a.member.renewTitle}>
        <RenewForm m={m} plans={plans} onDone={close} />
      </Sheet>
      <Sheet open={open === "days"} onClose={close} title={a.member.daysTitle}>
        <DaysForm m={m} onDone={close} />
      </Sheet>
      <Sheet open={open === "edit"} onClose={close} title={a.member.editTitle}>
        <EditForm m={m} onDone={close} />
      </Sheet>
    </div>
  );
}

function useDone(state: AbForm, onDone: () => void) {
  useEffect(() => {
    if (state?.ok) onDone();
  }, [state, onDone]);
}

function RenewForm({ m, plans, onDone }: { m: AbMember; plans: AbPlan[]; onDone: () => void }) {
  const { a, intl, locale } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abRenew.bind(null, m.id), null);
  useDone(state, onDone);
  const selling = plans.filter((p) => p.active);
  const first = selling.find((p) => p.id === m.plan_id) ?? selling[0];
  const [planId, setPlanId] = useState(first?.id ?? "");
  const [amount, setAmount] = useState(first ? String(first.price) : "");
  const [method, setMethod] = useState("cash");

  return (
    <form action={action} className="space-y-4">
      <p className="text-[14px] ab-dim">{a.member.renewHint}</p>
      {state?.error && <p className="ab-alert">{state.error}</p>}
      <div className="grid gap-2">
        {selling.map((p) => (
          <label key={p.id} className="ab-panel flex cursor-pointer items-center gap-3 p-3.5 has-[:checked]:border-[var(--ab-lime)]">
            <input type="radio" name="plan" value={p.id} checked={planId === p.id} className="size-5 accent-[var(--ab-lime)]"
              onChange={() => { setPlanId(p.id); setAmount(String(p.price)); }} />
            <span className="min-w-0 flex-1">
              <span className="block text-[16px] font-bold" dir="auto">{p.name}</span>
              <span className="block text-[13px] ab-faint"><PlanLimit p={p} /></span>
            </span>
            <span className="ab-ltr text-[15px] font-bold">{money(p.price, intl, locale)}</span>
          </label>
        ))}
      </div>
      <div className="grid grid-cols-2 gap-3">
        <div>
          <label className="ab-label" htmlFor="r-amount">{a.add.amount}</label>
          <input id="r-amount" name="amount" className="ab-input ab-ltr text-[20px] font-bold" inputMode="decimal" value={amount} onChange={(e) => setAmount(e.target.value)} required />
        </div>
        <div>
          <span className="ab-label">{a.add.method}</span>
          <input type="hidden" name="method" value={method} />
          <div className="flex flex-wrap gap-1.5">
            {AB_METHODS.filter((x) => x !== "other" && x !== "card").map((x) => (
              <button key={x} type="button" className="ab-chip !h-9 !px-3" aria-current={method === x ? "page" : undefined} onClick={() => setMethod(x)}>
                {a.methods[x]}
              </button>
            ))}
          </div>
        </div>
      </div>
      <button type="submit" className="ab-btn ab-btn-block" disabled={pending || !planId}>
        {a.member.renewSubmit}
      </button>
    </form>
  );
}

function DaysForm({ m, onDone }: { m: AbMember; onDone: () => void }) {
  const { a } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abAddDays.bind(null, m.id), null);
  useDone(state, onDone);
  const [days, setDays] = useState("7");
  return (
    <form action={action} className="space-y-4">
      <p className="text-[14px] ab-dim">{a.member.daysHint}</p>
      {state?.error && <p className="ab-alert">{state.error}</p>}
      <div className="flex gap-2">
        {["1", "3", "7", "15", "30"].map((d) => (
          <button key={d} type="button" className="ab-chip flex-1 justify-center" aria-current={days === d ? "page" : undefined} onClick={() => setDays(d)}>
            <span className="ab-ltr">+{d}</span>
          </button>
        ))}
      </div>
      <input name="days" className="ab-input ab-ltr text-[20px] font-bold" inputMode="numeric" value={days} onChange={(e) => setDays(e.target.value.replace(/\D/g, ""))} />
      <button type="submit" className="ab-btn ab-btn-block" disabled={pending || !days}>
        {a.member.daysSubmit}
      </button>
    </form>
  );
}

function EditForm({ m, onDone }: { m: AbMember; onDone: () => void }) {
  const { a } = useAb();
  const [state, action, pending] = useActionState<AbForm, FormData>(abUpdateMember.bind(null, m.id), null);
  useDone(state, onDone);
  return (
    <form action={action} className="space-y-4">
      {state?.error && <p className="ab-alert">{state.error}</p>}
      <div>
        <label className="ab-label" htmlFor="e-name">{a.add.name}</label>
        <input id="e-name" name="name" className="ab-input" defaultValue={m.name} required minLength={2} maxLength={80} dir="auto" />
      </div>
      <div>
        <label className="ab-label" htmlFor="e-phone">{a.add.phone}</label>
        <input id="e-phone" name="phone" className="ab-input ab-ltr" inputMode="tel" defaultValue={phoneLocal(m.phone)} />
      </div>
      <div>
        <label className="ab-label" htmlFor="e-note">{a.add.note}</label>
        <textarea id="e-note" name="note" className="ab-textarea" defaultValue={m.note ?? ""} maxLength={300} dir="auto" />
      </div>
      <button type="submit" className="ab-btn ab-btn-block" disabled={pending}>
        {a.member.save}
      </button>
    </form>
  );
}
