"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { Plus, Trash2 } from "lucide-react";
import { adminExpenseAdd, adminExpenseDelete } from "@/app/actions";
import { CBtn } from "@/components/console";
import { t } from "@/lib/t";

/** what the money went on, as the books sort it */
const KINDS = ["ads", "tools", "print", "move", "people", "other"] as const;
const label = "mb-1 block text-[0.8125rem] font-semibold text-muted";
const field = "h-10 w-full rounded-[0.625rem] border border-line bg-surface px-3 text-[16px] text-ink outline-none placeholder:text-faint focus:border-brand";

/**
 * The founder notes what the business spent, in one line: on what, how much
 * (dinars, millimes if any), which day (today unless changed) and its kind.
 * The day and the kind stay after a save: a few lines of the same day go in a
 * row. `today` comes from the books themselves (the day in Tunis).
 */
export function AdminExpenseAdd({ today }: { today: string }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [on, setOn] = useState(today);
  const [kind, setKind] = useState<(typeof KINDS)[number]>("other");
  const [error, setError] = useState<string | null>(null);

  const sum = Number(amount);
  const can = what.trim().length >= 2 && sum > 0 && sum <= 1_000_000 && /^\d{4}-\d{2}-\d{2}$/.test(on) && on <= today;
  const save = () =>
    start(async () => {
      setError(null);
      const res = await adminExpenseAdd(what, sum, on, kind);
      if (!res.ok) return setError(t.errNetwork);
      setWhat("");
      setAmount("");
      router.refresh();
    });

  return (
    <form
      className="space-y-3 border-b border-line p-4"
      onSubmit={(e) => {
        e.preventDefault();
        if (can && !pending) save();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[1fr_7.5rem_10rem]">
        <label className="block min-w-0">
          <span className={label}>{t.aExpWhat}</span>
          <input value={what} onChange={(e) => setWhat(e.target.value.slice(0, 120))} placeholder={t.aExpWhatPh} className={field} />
        </label>
        <label className="block">
          <span className={label}>{t.aExpAmount}</span>
          <input
            value={amount}
            // 47.350: digits, and one point with up to three after it (a comma typed is a point)
            onChange={(e) => setAmount(e.target.value.replace(",", ".").replace(/[^\d.]/g, "").match(/^\d{0,7}(?:\.\d{0,3})?/)?.[0] ?? "")}
            inputMode="decimal"
            dir="ltr"
            placeholder="47.350"
            className={`${field} text-center`}
          />
        </label>
        <label className="block">
          <span className={label}>{t.aExpDay}</span>
          <input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} dir="ltr" className={field} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t.aExpKind}>
        {KINDS.map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`h-8 rounded-full px-3 text-[0.8125rem] font-bold ${kind === k ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}
          >
            {t.aExpKinds[k]}
          </button>
        ))}
        <CBtn kind="main" type="submit" disabled={pending || !can} className="ms-auto">
          <Plus className="size-4" /> {pending ? t.checking : t.aExpAdd}
        </CBtn>
      </div>
      {error && <p className="text-[0.8438rem] font-semibold text-coral">{error}</p>}
    </form>
  );
}

/** One line of the expenses taken back (a slip of the finger): asked once, then gone from the books. */
export function AdminExpenseDelete({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <button type="button" onClick={() => setAsk(true)} aria-label={t.aExpDelete} title={t.aExpDelete} className="grid size-8 place-items-center rounded-[0.5rem] text-faint transition-colors hover:bg-coral-soft hover:text-coral">
        <Trash2 className="size-4" />
      </button>
    );
  }
  return (
    <span className="inline-flex items-center gap-1.5">
      <CBtn
        kind="coral"
        disabled={pending}
        onClick={() =>
          start(async () => {
            await adminExpenseDelete(id);
            setAsk(false);
            router.refresh();
          })
        }
      >
        {t.aExpDeleteYes}
      </CBtn>
      <CBtn kind="soft" disabled={pending} onClick={() => setAsk(false)}>
        {t.back}
      </CBtn>
    </span>
  );
}
