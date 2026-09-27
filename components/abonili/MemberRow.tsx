"use client";

import Link from "next/link";
import { day } from "@/lib/abonili/format";
import type { AbMember } from "@/lib/abonili/types";
import { useAb } from "./AbProvider";
import { StatusPill } from "./Verdict";

/** One line of the roster: number, name, formule, and what is left. */
export function MemberRow({ m }: { m: AbMember }) {
  const { a, count, fill, intl } = useAb();
  const inside = m.status === "active" || m.status === "soon";
  const left = inside
    ? m.sessions_left !== null
      ? count(a.units.sessionsLeft, m.sessions_left)
      : m.days_left !== null
        ? count(a.units.daysLeft, m.days_left)
        : null
    : m.status === "expired" && m.ended_on
      ? fill(a.door.endedOn, { date: day(m.ended_on, intl) })
      : m.status === "upcoming"
        ? fill(a.door.startsOn, { date: day(m.next_starts, intl) })
        : null;

  return (
    <Link href={`/abonili/members/${m.id}`} className="ab-row">
      <span className="ab-code">{m.code}</span>
      <span className="ab-grow">
        <span className="ab-trunc block text-[16px] font-bold" dir="auto">{m.name}</span>
        <span className="ab-trunc block text-[13px] ab-faint">
          <bdi>{m.plan_name ?? a.status.none}</bdi>
          {left ? ` · ${left}` : ""}
        </span>
      </span>
      <StatusPill status={m.status} />
    </Link>
  );
}
