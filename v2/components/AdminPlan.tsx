"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { CalendarClock, CalendarPlus, Power, StopCircle } from "lucide-react";
import { adminPlan } from "@/app/actions";
import { CBtn } from "@/components/console";
import { fill, monthsSaid, t } from "@/lib/t";

type By = "months" | "until";
const PICKS = [1, 3, 6, 12, 24, 36];
/** how the owner paid, noted with the access (optional) */
const METHODS = [
  { id: "cash", label: t.aPlanCash },
  { id: "d17", label: "D17" },
  { id: "virement", label: "Virement" },
  { id: "versement", label: "Versement" },
  { id: "mandat", label: "Mandat" },
];
const TZ = "Africa/Tunis";
const day = (iso: string) => new Intl.DateTimeFormat("ar-TN-u-nu-latn", { day: "numeric", month: "long", year: "numeric", timeZone: TZ }).format(new Date(iso));

/**
 * The founder's hand on a shop's access, once the owner paid by hand (cash,
 * D17, a transfer…): turn it on for so many months — from today, or from the
 * end of the year already running — or until a date; or stop it now. How it
 * was paid is noted with it. The owner's home says it once, plainly
 * («الأبونمان متاعك تفعّل»), unless the box is unticked. Nothing is ever free.
 */
export function AdminPlan({ shopId, paidUntil, paid }: { shopId: string; paidUntil: string | null; paid: boolean }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [open, setOpen] = useState(false);
  const [ending, setEnding] = useState(false);
  const [by, setBy] = useState<By>("months");
  const [months, setMonths] = useState(12);
  const [custom, setCustom] = useState("");
  const [until, setUntil] = useState("");
  const [method, setMethod] = useState<string | null>(null);
  const [note, setNote] = useState("");
  const [show, setShow] = useState(true);
  const [error, setError] = useState<string | null>(null);

  const n = custom ? Number(custom) : months;
  const customBad = custom !== "" && !(n >= 1 && n <= 120);
  // months turned on add onto a year still running, else they start today
  const from = paid ? paidUntil : null;

  const save = () =>
    start(async () => {
      setError(null);
      const res = await adminPlan(shopId, by === "until" ? "until" : "paid", by === "until" ? null : n, by === "until" ? until : null, note, show, method);
      if (!res.ok) return setError(t.errNetwork);
      setOpen(false);
      setNote("");
      setCustom("");
      setMethod(null);
      router.refresh();
    });
  const stop = () =>
    start(async () => {
      await adminPlan(shopId, "end", null, null, null, false, null);
      setEnding(false);
      router.refresh();
    });

  if (ending) {
    return (
      <div className="rounded-[1rem] border border-coral/20 bg-coral-soft p-3.5 text-center">
        <p className="text-[0.9062rem] font-semibold text-coral">{t.aPlanEndConfirm}</p>
        <div className="mt-2.5 grid grid-cols-2 gap-2">
          <button type="button" onClick={() => setEnding(false)} className="h-9 rounded-[0.625rem] bg-surface text-[0.8438rem] font-semibold">
            {t.back}
          </button>
          <button type="button" disabled={pending} onClick={stop} className="h-9 rounded-[0.625rem] bg-coral text-[0.8438rem] font-bold text-white disabled:opacity-60">
            {t.aPlanEnd}
          </button>
        </div>
      </div>
    );
  }

  if (!open) {
    return (
      <div className="flex flex-wrap gap-2">
        <CBtn kind="main" onClick={() => setOpen(true)}>
          <Power className="size-4" /> {t.aPlanGive}
        </CBtn>
        {paid && (
          <CBtn kind="soft" onClick={() => setEnding(true)}>
            <StopCircle className="size-4" /> {t.aPlanEnd}
          </CBtn>
        )}
      </div>
    );
  }

  const ways: { id: By; label: string; icon: typeof Power }[] = [
    { id: "months", label: t.aPlanByMonths, icon: CalendarPlus },
    { id: "until", label: t.aPlanUntil, icon: CalendarClock },
  ];
  const can = by === "until" ? !!until : !customBad && n >= 1;
  return (
    <div className="space-y-3 rounded-[1rem] border border-line bg-canvas/60 p-3.5">
      {/* for so many months, or until a date */}
      <div className="grid grid-cols-2 gap-1 rounded-[0.75rem] bg-ink/[0.05] p-1">
        {ways.map((w) => (
          <button
            key={w.id}
            type="button"
            onClick={() => setBy(w.id)}
            className={`flex h-9 items-center justify-center gap-1.5 rounded-[0.5rem] text-[0.8438rem] font-bold ${by === w.id ? "bg-surface text-ink shadow-sm" : "text-muted"}`}
          >
            <w.icon className="size-4" /> {w.label}
          </button>
        ))}
      </div>

      {by === "until" ? (
        <label className="block">
          <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanUntilAsk}</span>
          <input type="date" value={until} onChange={(e) => setUntil(e.target.value)} dir="ltr" className="h-10 w-full rounded-[0.625rem] border border-line bg-surface px-3 text-[16px]" />
        </label>
      ) : (
        <div>
          <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanMonths}</span>
          <div className="flex flex-wrap gap-1.5">
            {PICKS.map((m) => (
              <button
                key={m}
                type="button"
                onClick={() => {
                  setMonths(m);
                  setCustom("");
                }}
                className={`h-9 rounded-full px-3.5 text-[0.8438rem] font-bold ${!custom && months === m ? "bg-brand text-white" : "bg-surface text-body ring-1 ring-line"}`}
              >
                {monthsSaid(m)}
              </button>
            ))}
            <input
              value={custom}
              onChange={(e) => setCustom(e.target.value.replace(/\D/g, "").slice(0, 3))}
              inputMode="numeric"
              placeholder={t.aPlanCustom}
              aria-label={t.aPlanCustom}
              className={`h-9 w-[7.5rem] rounded-full bg-surface px-3 text-center text-[16px] ring-1 ${customBad ? "ring-coral" : custom ? "ring-brand" : "ring-line"}`}
            />
          </div>
          <p className="mt-1.5 text-[0.8125rem] text-muted">{from ? fill(t.aPlanFromEnd, { date: day(from) }) : t.aPlanFromToday}</p>
        </div>
      )}

      <div>
        <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanHow}</span>
        <div className="flex flex-wrap gap-1.5">
          {METHODS.map((m) => (
            <button
              key={m.id}
              type="button"
              onClick={() => setMethod(method === m.id ? null : m.id)}
              className={`h-8 rounded-full px-3 text-[0.8125rem] font-bold ${method === m.id ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}
            >
              {m.label}
            </button>
          ))}
        </div>
      </div>

      <label className="block">
        <span className="mb-1 block text-[0.8125rem] font-semibold text-muted">{t.aPlanNote}</span>
        <input value={note} onChange={(e) => setNote(e.target.value.slice(0, 200))} placeholder={t.aPlanNotePh} className="h-10 w-full rounded-[0.625rem] border border-line bg-surface px-3 text-[16px]" />
      </label>

      <label className="flex items-center gap-2 text-[0.875rem] font-semibold text-body">
        <input type="checkbox" checked={show} onChange={(e) => setShow(e.target.checked)} className="size-4 accent-[#6c47ff]" />
        {t.aPlanShow}
      </label>

      {error && <p className="text-[0.8438rem] font-semibold text-coral">{error}</p>}
      <div className="flex gap-2">
        <CBtn kind="main" disabled={pending || !can} onClick={save}>
          <Power className="size-4" /> {pending ? t.checking : t.aPlanSave}
        </CBtn>
        <CBtn kind="soft" disabled={pending} onClick={() => setOpen(false)}>
          {t.back}
        </CBtn>
      </div>
    </div>
  );
}
