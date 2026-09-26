"use client";

import { useRouter } from "next/navigation";
import { useState } from "react";
import { CreditCard, DoorOpen } from "lucide-react";
import { setSystems } from "@/app/actions/admin";
import { useT } from "@/components/i18n/Provider";
import { Card } from "@/components/ui/Card";
import { useToast } from "@/components/ui/Toast";

/**
 * The two switches that decide what a shop can do at all.
 *
 * THE ONE RULE: a shop with neither system can do nothing — no QR, no screen,
 * nothing to sell. So the last switch still on cannot be turned off; it is
 * disabled rather than left to fail in the database, because a switch that
 * flips back with an error message reads as a bug.
 */
export function SystemsCard({ businessId, loyalty, memberships, members, plans }: { businessId: string; loyalty: boolean; memberships: boolean; members: number; plans: number }) {
  const { t, fill } = useT();
  const w = t.admin.systems;
  const toast = useToast();
  const router = useRouter();
  const [busy, setBusy] = useState(false);
  const [on, setOn] = useState({ loyalty, memberships });
  const onlyOne = Number(on.loyalty) + Number(on.memberships) === 1;

  async function flip(key: "loyalty" | "memberships") {
    if (busy) return;
    const next = { ...on, [key]: !on[key] };
    setBusy(true);
    setOn(next); // optimistic: the switch must move under the finger
    const r = await setSystems(businessId, next.loyalty, next.memberships);
    if (!r.ok) setOn(on);
    toast(r.message, r.ok ? "success" : "error");
    if (r.ok) router.refresh();
    setBusy(false);
  }

  const rows = [
    { key: "loyalty" as const, icon: CreditCard, label: w.loyalty, hint: w.loyaltyHint },
    { key: "memberships" as const, icon: DoorOpen, label: w.abonili, hint: members > 0 || plans > 0 ? fill(w.aboniliCount, { members, plans }) : w.aboniliHint },
  ];

  return (
    <Card className="divide-y divide-line/80 overflow-hidden">
      {rows.map((r) => {
        const active = on[r.key];
        const locked = active && onlyOne;
        return (
          <div key={r.key} className="flex items-center gap-3 px-3.5 py-3">
            <span className={`grid size-9 shrink-0 place-items-center rounded-xl ${active ? "bg-brand-50 text-brand-600" : "bg-canvas text-muted"}`}>
              <r.icon className="size-[18px]" />
            </span>
            <span className="min-w-0 flex-1">
              <span className="block text-[15px] font-semibold text-ink">{r.label}</span>
              <span className="block text-[12.5px] leading-snug text-muted">{locked ? w.lastOne : r.hint}</span>
            </span>
            <button
              type="button"
              role="switch"
              aria-checked={active}
              aria-label={r.label}
              disabled={busy || locked}
              onClick={() => flip(r.key)}
              className={`relative h-6 w-11 shrink-0 rounded-full transition-colors disabled:opacity-50 ${active ? "bg-brand-600" : "bg-line"}`}
            >
              <span className={`absolute top-0.5 size-5 rounded-full bg-white shadow transition-all ${active ? "start-[1.375rem]" : "start-0.5"}`} />
            </button>
          </div>
        );
      })}
    </Card>
  );
}
