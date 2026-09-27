"use client";

import type { ReactNode } from "react";
import { day } from "@/lib/abonili/format";
import type { AbMember } from "@/lib/abonili/types";
import { useAb } from "./AbProvider";

/** The status pill: a coloured dot and a word, readable at a glance. */
export function StatusPill({ status }: { status: AbMember["status"] }) {
  const { a } = useAb();
  return (
    <span className="ab-pill" data-s={status}>
      {a.status[status]}
    </span>
  );
}

/** The one number that matters for this member right now, and its unit. */
export function useHeadline(m: Pick<AbMember, "status" | "days_left" | "sessions_left" | "until" | "ended_on" | "next_starts">) {
  const { a, count, fill, intl } = useAb();
  const inside = m.status === "active" || m.status === "soon";
  if (inside && m.sessions_left !== null) {
    return {
      big: String(m.sessions_left),
      unit: count(a.units.sessionsBig, m.sessions_left),
      line: m.until ? fill(a.door.until, { date: day(m.until, intl) }) : null,
    };
  }
  if (inside && m.days_left !== null) {
    return {
      big: String(m.days_left),
      unit: count(a.units.daysBig, m.days_left),
      line: m.days_left === 1 ? a.door.lastDay : fill(a.door.until, { date: day(m.until, intl) }),
    };
  }
  if (m.status === "upcoming") return { big: null, unit: null, line: fill(a.door.startsOn, { date: day(m.next_starts, intl) }) };
  if (m.status === "expired") return { big: null, unit: null, line: m.ended_on ? fill(a.door.endedOn, { date: day(m.ended_on, intl) }) : null };
  return { big: null, unit: null, line: null };
}

/**
 * The answer at the door, big enough to read from across the desk: a coloured
 * band, the name, and either the days/séances left or the word that says no.
 */
export function Verdict({ m, children, flash }: { m: AbMember; children?: ReactNode; flash?: boolean }) {
  const { a } = useAb();
  const h = useHeadline(m);
  return (
    <section className={`ab-verdict ${flash ? "ab-in-flash" : ""}`} data-s={m.status} aria-live="polite">
      <div className="flex items-center justify-between gap-3">
        <StatusPill status={m.status} />
        <span className="ab-code">{m.code}</span>
      </div>

      <h2 className="mt-4 text-[30px] font-extrabold leading-tight" dir="auto">
        {m.name}
      </h2>
      {m.plan_name && <p className="mt-1 text-[15px] ab-dim" dir="auto">{m.plan_name}</p>}

      <div className="mt-5 flex items-end gap-4">
        {h.big !== null ? (
          <>
            <span className="ab-num ab-big">{h.big}</span>
            <div className="pb-2">
              <p className="text-[18px] font-bold" style={{ color: "var(--s)" }}>{h.unit}</p>
              {h.line && <p className="text-[14px] ab-dim">{h.line}</p>}
            </div>
          </>
        ) : (
          <div>
            <p className="text-[34px] font-extrabold leading-none" style={{ color: "var(--s)" }}>{a.status[m.status]}</p>
            {h.line && <p className="mt-2 text-[15px] ab-dim">{h.line}</p>}
          </div>
        )}
      </div>

      {children && <div className="mt-6">{children}</div>}
    </section>
  );
}
