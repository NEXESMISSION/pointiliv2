"use client";

import type { AbPlan } from "@/lib/abonili/types";
import { useAb } from "./AbProvider";

/** "30 jours", "10 séances", or "30 jours · 12 séances" */
export function PlanLimit({ p }: { p: Pick<AbPlan, "days" | "sessions"> }) {
  const { a, count } = useAb();
  const parts = [p.days ? count(a.units.days, p.days) : null, p.sessions ? count(a.units.sessions, p.sessions) : null].filter(Boolean);
  return <>{parts.join(" · ")}</>;
}
