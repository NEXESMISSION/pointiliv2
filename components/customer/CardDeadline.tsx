"use client";

import { Clock } from "lucide-react";
import { useT } from "@/components/i18n/Provider";
import { daysUntil } from "@/lib/format";

/**
 * The card's clock. The owner gives a card a life (30 days, say) and it starts
 * on the first stamp — so the customer has to know where they stand, before the
 * day it goes back to zero and not after.
 */
export function CardDeadline({ expiresAt, className = "" }: { expiresAt?: string | null; className?: string }) {
  const { t, count } = useT();
  if (!expiresAt) return null;
  const days = daysUntil(expiresAt);
  const soon = days <= 3;

  return (
    <p className={`flex items-center justify-center gap-1.5 rounded-full px-3 py-1 text-[13px] font-semibold ${soon ? "bg-warning-50 text-warning-700" : "bg-canvas text-muted"} ${className}`}>
      <Clock className="size-3.5 shrink-0" aria-hidden />
      {days === 0 ? t.customer.card.lastDay : count(t.customer.card.daysToFinish, days)}
    </p>
  );
}
