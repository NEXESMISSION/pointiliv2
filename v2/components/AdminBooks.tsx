"use client";

import { useRouter } from "next/navigation";
import { useState, useTransition } from "react";
import { ArrowDownLeft, ArrowUpRight, Plus, Trash2 } from "lucide-react";
import { adminBookAdd, adminBookDelete } from "@/app/actions";
import { CBtn } from "@/components/console";
import { t } from "@/lib/t";

type Side = "in" | "out";
/** what a line is about, each side its own kinds */
const KINDS: Record<Side, string[]> = { in: ["service", "sub", "other"], out: ["ads", "tools", "print", "move", "people", "other"] };
const label = "mb-1 block text-[0.8125rem] font-semibold text-muted";
const field = "h-10 w-full rounded-[0.625rem] border border-line bg-surface px-3 text-[16px] text-ink outline-none placeholder:text-faint focus:border-brand";

/**
 * The founder writes a line in the books with his own hand: what came in
 * (a service sold, a subscription paid outside the app…) or what the business
 * spent — on what, how much (dinars, millimes if any), which day (today
 * unless changed) and its kind. The side, the day and the kind stay after a
 * save: a few lines of the same day go in a row. `today` comes from the books
 * themselves (the day in Tunis).
 */
export function AdminBookAdd({ today }: { today: string }) {
  const router = useRouter();
  // busy only while the line is written: the list refreshes on its own, and the next line can be typed at once
  const [pending, setPending] = useState(false);
  const [side, setSide] = useState<Side>("out");
  const [what, setWhat] = useState("");
  const [amount, setAmount] = useState("");
  const [on, setOn] = useState(today);
  const [kind, setKind] = useState("other");
  const [error, setError] = useState<string | null>(null);

  const sum = Number(amount);
  const can = what.trim().length >= 2 && sum > 0 && sum <= 1_000_000 && /^\d{4}-\d{2}-\d{2}$/.test(on) && on <= today;
  const pick = (s: Side) => {
    setSide(s);
    if (!KINDS[s].includes(kind)) setKind("other");
  };
  const save = async () => {
    setPending(true);
    setError(null);
    try {
      const res = await adminBookAdd(side, what, sum, on, kind);
      if (!res.ok) return setError(t.errNetwork);
      setWhat("");
      setAmount("");
      router.refresh();
    } catch {
      setError(t.errNetwork);
    } finally {
      setPending(false);
    }
  };

  return (
    <form
      className="space-y-3"
      onSubmit={(e) => {
        e.preventDefault();
        if (can && !pending) void save();
      }}
    >
      <div className="grid gap-2 sm:grid-cols-[9.5rem_1fr_7.5rem_10rem]">
        {/* which side: in or out */}
        <div className="grid grid-cols-2 gap-1 self-end rounded-[0.75rem] bg-ink/[0.05] p-1" role="radiogroup" aria-label={t.aBookHint}>
          {(["out", "in"] as const).map((s) => (
            <button
              key={s}
              type="button"
              role="radio"
              aria-checked={side === s}
              onClick={() => pick(s)}
              className={`flex h-8 items-center justify-center gap-1 rounded-[0.5rem] text-[0.8125rem] font-bold ${side === s ? (s === "in" ? "bg-mint text-white" : "bg-coral text-white") : "text-muted"}`}
            >
              {s === "in" ? <ArrowDownLeft className="size-4" /> : <ArrowUpRight className="size-4" />} {s === "in" ? t.aBookIn : t.aBookOut}
            </button>
          ))}
        </div>
        <label className="block min-w-0">
          <span className={label}>{t.aBookWhat}</span>
          <input value={what} onChange={(e) => setWhat(e.target.value.slice(0, 120))} placeholder={side === "in" ? t.aBookWhatPhIn : t.aBookWhatPhOut} className={field} />
        </label>
        <label className="block">
          <span className={label}>{t.aBookAmount}</span>
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
          <span className={label}>{t.aBookDay}</span>
          <input type="date" value={on} max={today} onChange={(e) => setOn(e.target.value)} dir="ltr" className={field} />
        </label>
      </div>

      <div className="flex flex-wrap items-center gap-1.5" role="radiogroup" aria-label={t.aBookKind}>
        {KINDS[side].map((k) => (
          <button
            key={k}
            type="button"
            role="radio"
            aria-checked={kind === k}
            onClick={() => setKind(k)}
            className={`h-8 rounded-full px-3 text-[0.8125rem] font-bold ${kind === k ? "bg-ink text-white" : "bg-surface text-body ring-1 ring-line"}`}
          >
            {t.aBookKinds[k]}
          </button>
        ))}
        <CBtn kind="main" type="submit" disabled={pending || !can} className="ms-auto">
          <Plus className="size-4" /> {pending ? t.checking : t.aBookAdd}
        </CBtn>
      </div>
      {error && <p className="text-[0.8438rem] font-semibold text-coral">{error}</p>}
    </form>
  );
}

/** One line of the books taken back (a slip of the finger): asked once, then gone. */
export function AdminBookDelete({ id }: { id: number }) {
  const router = useRouter();
  const [pending, start] = useTransition();
  const [ask, setAsk] = useState(false);
  if (!ask) {
    return (
      <button type="button" onClick={() => setAsk(true)} aria-label={t.aBookDelete} title={t.aBookDelete} className="grid size-8 place-items-center rounded-[0.5rem] text-faint transition-colors hover:bg-coral-soft hover:text-coral">
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
            await adminBookDelete(id);
            setAsk(false);
            router.refresh();
          })
        }
      >
        {t.aBookDeleteYes}
      </CBtn>
      <CBtn kind="soft" disabled={pending} onClick={() => setAsk(false)}>
        {t.back}
      </CBtn>
    </span>
  );
}
