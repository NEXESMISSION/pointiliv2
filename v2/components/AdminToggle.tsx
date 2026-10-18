"use client";

import { useState, useTransition, type ReactNode } from "react";
import type { LucideIcon } from "lucide-react";
import { Mark, Switch } from "@/components/Owner";

/**
 * One of a shop's options in the console, as a line: its icon, its name and
 * how it stands, one short sentence of what it does, and a switch at the end
 * (18 Oct 2026 — three big purple buttons, each under a paragraph, were the
 * console's noisiest corner). A change that the customers would feel asks
 * once, in the same line, before it turns.
 */
export function AdminToggle({
  icon,
  title,
  state,
  line,
  on,
  ask,
  note,
  disabled = false,
  flip,
}: {
  icon: LucideIcon;
  title: string;
  /** how it stands now, in two or three words */
  state: { say: string; tone: "brand" | "mint" | "grey" };
  line: ReactNode;
  on: boolean;
  /** asked before it turns (none: it turns at once) */
  ask?: string;
  /** why it cannot turn, or a word of warning */
  note?: string | null;
  disabled?: boolean;
  flip: () => Promise<string | null>;
}) {
  const [pending, start] = useTransition();
  const [asking, setAsking] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const go = () =>
    start(async () => {
      const err = await flip();
      setError(err);
      if (!err) setAsking(false);
    });
  const pill = { brand: "bg-brand-soft text-brand", mint: "bg-mint-soft text-mint", grey: "bg-canvas text-muted ring-1 ring-inset ring-line/80" }[state.tone];

  return (
    <div className="flex items-start gap-3 py-3.5 first:pt-0 last:pb-0">
      <Mark icon={icon} size={36} />
      <div className="min-w-0 flex-1">
        <p className="flex flex-wrap items-center gap-2">
          <b className="text-[0.9375rem] font-bold text-ink">{title}</b>
          <span className={`rounded-full px-2 py-0.5 text-[0.6875rem] font-semibold ${pill}`}>{state.say}</span>
        </p>
        <p className="mt-0.5 text-[0.8125rem] leading-relaxed text-muted">{line}</p>
        {note && <p className="mt-1 text-[0.75rem] font-semibold text-coral">{note}</p>}
        {asking && (
          <div className="mt-2.5 flex flex-wrap items-center gap-2 rounded-[0.75rem] bg-canvas p-2.5">
            <span className="min-w-0 flex-1 text-[0.8125rem] font-semibold text-ink">{ask}</span>
            <button type="button" onClick={() => setAsking(false)} className="h-8 rounded-[0.5rem] bg-surface px-3 text-[0.8125rem] font-semibold text-body ring-1 ring-line">
              لا
            </button>
            <button type="button" disabled={pending} onClick={go} className="h-8 rounded-[0.5rem] bg-brand px-3 text-[0.8125rem] font-bold text-white disabled:opacity-60">
              {pending ? "…" : "إيه"}
            </button>
          </div>
        )}
        {error && <p className="mt-1 text-[0.75rem] font-semibold text-coral">{error}</p>}
      </div>
      <Switch on={on} label={title} disabled={disabled || pending} onClick={() => (ask ? setAsking(!asking) : go())} />
    </div>
  );
}
