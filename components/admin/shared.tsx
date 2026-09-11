import Form from "next/form";
import {
  Activity,
  BadgeCheck,
  Ban,
  CirclePlay,
  CreditCard,
  Gift,
  Receipt,
  Search,
  Stamp,
  Store,
  Ticket,
  X,
  type LucideIcon,
} from "lucide-react";
import { Badge } from "@/components/ui/Badge";
import { CATEGORIES } from "@/lib/constants";
import type { SubscriptionState } from "@/lib/types";

/* ── Shapes returned by the admin_* database functions ─────────────────────── */

export type AdminActivity = {
  id: number;
  type: string;
  at: string;
  business_id: string | null;
  business_name: string | null;
  customer_code: number | null;
  data: Record<string, unknown> | null;
};

export type AdminOverview = {
  businesses: number;
  active_businesses: number;
  suspended_businesses: number;
  customers: number;
  new_customers_month: number;
  stamps_today: number;
  stamps_total: number;
  active_subscriptions: number;
  trials: number;
  expiring_soon: number;
  revenue: number;
  revenue_month: number;
  pending_payments: number;
  recent: AdminActivity[];
};

export type AdminBusinessRow = {
  id: string;
  name: string;
  category: string;
  status: "active" | "suspended";
  logo_url: string | null;
  created_at: string;
  owner: { name: string | null; phone: string | null; email: string | null };
  customers: number;
  stamps: number;
  subscription: SubscriptionState;
};

export type AdminPaymentLite = {
  id: string;
  plan: string;
  amount: number;
  method: string;
  status: string;
  payment_reference: string;
  created_at: string;
  confirmed_at: string | null;
};

export type AdminBusinessDetail = {
  id: string;
  name: string;
  category: string;
  status: "active" | "suspended";
  phone: string | null;
  address: string | null;
  logo_url: string | null;
  created_at: string;
  owner: { id: string; name: string | null; phone: string | null; email: string | null };
  card: { name: string; stamps_required: number; active: boolean; cooldown_minutes: number } | null;
  rewards: { name: string; stamps_required: number; active: boolean }[];
  stats: { customers: number; stamps: number; stamps_today: number; redemptions: number; last_stamp_at: string | null };
  subscription: SubscriptionState;
  subscriptions: { id: string; plan: string; price: number | null; starts_at: string; expires_at: string; status: string }[];
  payments: AdminPaymentLite[];
};

export type AdminSubscriptionRow = {
  business_id: string;
  business_name: string;
  business_status: "active" | "suspended";
  owner_phone: string | null;
  subscription: SubscriptionState;
  pending_payment: { id: string; plan: string; amount: number; payment_reference: string } | null;
};

export type AdminPayment = AdminPaymentLite & {
  business_id: string;
  business_name: string;
  currency: string;
  notes: string | null;
};

export type AdminPayments = { total_paid: number; items: AdminPayment[] };

export type AdminCustomer = {
  id: string;
  phone: string | null;
  name: string | null;
  role: string;
  created_at: string;
  cards: number;
  stamps: number;
  redemptions: number;
  last_stamp_at: string | null;
};

export type AdminCustomers = { total: number; items: AdminCustomer[] };

export type AdminSystem = {
  database_size: string;
  server_time: string;
  tables: Record<string, number>;
  last_hour: { qr_minted: number; stamps: number; claims_pending: number; signups: number };
  admins: { phone: string | null; email: string | null; name: string | null }[];
};

/* ── Helpers ───────────────────────────────────────────────────────────────── */

export const ACTIVITY_LABEL: Record<string, string> = {
  stamp: "+1 stamp",
  reward_redeemed: "Reward redeemed",
  business_created: "New business",
  subscription_activated: "Plan activated",
  payment_requested: "Payment requested",
  business_suspended: "Business suspended",
  business_activated: "Business activated",
  subscription_cancelled: "Subscription cancelled",
  card_created: "Loyalty card created",
  card_updated: "Loyalty card updated",
  reward_created: "Reward added",
};

export function activityLabel(type: string): string {
  return ACTIVITY_LABEL[type] ?? type.replace(/_/g, " ").replace(/^\w/, (c) => c.toUpperCase());
}

const ACTIVITY_ICON: Record<string, { icon: LucideIcon; tone: string }> = {
  stamp: { icon: Stamp, tone: "bg-brand-50 text-brand-600" },
  reward_redeemed: { icon: Gift, tone: "bg-[#FFEEF6] text-[#DB2777]" },
  business_created: { icon: Store, tone: "bg-success-50 text-success-600" },
  subscription_activated: { icon: BadgeCheck, tone: "bg-success-50 text-success-600" },
  payment_requested: { icon: Receipt, tone: "bg-warning-50 text-warning-700" },
  business_suspended: { icon: Ban, tone: "bg-danger-50 text-danger-600" },
  business_activated: { icon: CirclePlay, tone: "bg-success-50 text-success-600" },
  subscription_cancelled: { icon: X, tone: "bg-danger-50 text-danger-600" },
  card_created: { icon: CreditCard, tone: "bg-brand-50 text-brand-600" },
  card_updated: { icon: CreditCard, tone: "bg-canvas text-body" },
  reward_created: { icon: Ticket, tone: "bg-brand-50 text-brand-600" },
};

export function ActivityIcon({ type }: { type: string }) {
  const it = ACTIVITY_ICON[type] ?? { icon: Activity, tone: "bg-canvas text-body" };
  const Icon = it.icon;
  return (
    <span className={`grid size-10 shrink-0 place-items-center rounded-2xl ${it.tone}`}>
      <Icon className="size-5" aria-hidden />
    </span>
  );
}

export function categoryIcon(category: string | null | undefined): string {
  return CATEGORIES[(category ?? "other") as keyof typeof CATEGORIES]?.icon ?? "star";
}

export function PaymentBadge({ status }: { status: string }) {
  switch (status) {
    case "pending":
      return <Badge tone="warning">Pending</Badge>;
    case "paid":
      return <Badge tone="success">Paid</Badge>;
    case "failed":
      return <Badge tone="danger">Failed</Badge>;
    default:
      return <Badge tone="neutral">{status === "cancelled" ? "Cancelled" : status}</Badge>;
  }
}

export function BusinessStatusBadge({ status }: { status: string }) {
  return status === "suspended" ? <Badge tone="danger">Suspended</Badge> : null;
}

export function isPast(iso: string | null | undefined): boolean {
  return !!iso && new Date(iso).getTime() <= Date.now();
}

/** Builds "?a=1&b=2", skipping empty values and defaults. */
export function qs(params: Record<string, string | null | undefined>): string {
  const sp = new URLSearchParams();
  for (const [k, v] of Object.entries(params)) if (v) sp.set(k, v);
  const s = sp.toString();
  return s ? `?${s}` : "";
}

/** GET search form; keeps other query params as hidden fields. */
export function SearchForm({ action, q, placeholder, hidden = {} }: { action: string; q?: string; placeholder: string; hidden?: Record<string, string | undefined> }) {
  return (
    <Form action={action} className="relative" role="search">
      <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" aria-hidden />
      <input
        type="search"
        name="q"
        defaultValue={q}
        placeholder={placeholder}
        aria-label={placeholder}
        className="block h-12 w-full rounded-2xl border border-line bg-white pl-12 pr-4 text-base text-ink placeholder:text-faint transition focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
      />
      {Object.entries(hidden).map(([k, v]) => (v ? <input key={k} type="hidden" name={k} value={v} /> : null))}
    </Form>
  );
}
