"use client";

import type { ReactNode } from "react";
import { useT } from "@/components/i18n/Provider";

type Tone = "success" | "warning" | "danger" | "brand" | "neutral";

const tones: Record<Tone, string> = {
  success: "bg-success-50 text-success-600 ring-success-500/15",
  warning: "bg-warning-50 text-warning-700 ring-warning-500/20",
  danger: "bg-danger-50 text-danger-600 ring-danger-500/15",
  brand: "bg-brand-50 text-brand-700 ring-brand-500/15",
  neutral: "bg-canvas text-muted ring-black/5",
};

export function Badge({ tone = "neutral", children, className = "" }: { tone?: Tone; children: ReactNode; className?: string }) {
  return <span className={`inline-flex items-center gap-1 whitespace-nowrap rounded-md px-1.5 py-0.5 text-xs font-medium ring-1 ring-inset ${tones[tone]} ${className}`}>{children}</span>;
}

export function SubscriptionBadge({ status, plan }: { status: string | null | undefined; plan?: string | null }) {
  const { t } = useT();
  const s = t.data.subscription;
  switch (status) {
    case "active":
      return <Badge tone={plan === "trial" ? "brand" : "success"}>{plan === "trial" ? s.trial : s.active}</Badge>;
    case "expiring_soon":
      return <Badge tone="warning">{s.expiring_soon}</Badge>;
    case "cancelled":
      return <Badge tone="neutral">{s.cancelled}</Badge>;
    case "expired":
      return <Badge tone="danger">{s.expired}</Badge>;
    default:
      return <Badge tone="neutral">{s.none}</Badge>;
  }
}
