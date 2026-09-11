import { Clock, Database, QrCode, ShieldCheck, Stamp, Timer, UserPlus } from "lucide-react";
import { CleanupButton } from "@/components/admin/AdminActions";
import type { AdminSystem } from "@/components/admin/shared";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { formatDateTime, formatNumber } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export const metadata = { title: "System" };

const TABLE_LABEL: Record<string, string> = {
  profiles: "Profiles",
  businesses: "Businesses",
  customers: "Customer cards",
  stamps: "Stamps",
  qr_tokens: "QR tokens",
  reward_redemptions: "Redemptions",
  subscriptions: "Subscriptions",
  payments: "Payments",
  activity_logs: "Activity logs",
  rate_limits: "Rate limits",
};

export default async function SystemPage() {
  const s = await rpc<AdminSystem>("admin_system");

  return (
    <div className="animate-fade space-y-6">
      <TopBar title="System" subtitle="Database health and maintenance" large />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label="Database size" value={s.database_size} icon={<Database className="size-5" />} tint="brand" />
        <StatCard label="Server time" value={<span className="text-base">{formatDateTime(s.server_time)}</span>} icon={<Clock className="size-5" />} tint="white" />
      </div>

      <section>
        <SectionTitle>Last hour</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label="QR codes minted" value={formatNumber(s.last_hour.qr_minted)} icon={<QrCode className="size-5" />} tint="white" />
          <StatCard label="Stamps" value={formatNumber(s.last_hour.stamps)} icon={<Stamp className="size-5" />} tint="amber" />
          <StatCard label="Claims pending" value={formatNumber(s.last_hour.claims_pending)} icon={<Timer className="size-5" />} tint="white" />
          <StatCard label="Sign-ups" value={formatNumber(s.last_hour.signups)} icon={<UserPlus className="size-5" />} tint="green" />
        </div>
      </section>

      <section>
        <SectionTitle>Table rows</SectionTitle>
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line/60 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(s.tables).map(([k, v]) => (
            <div key={k} className="bg-white p-4">
              <p className="text-xl font-bold text-ink tabular">{formatNumber(v)}</p>
              <p className="truncate text-xs font-medium text-muted">{TABLE_LABEL[k] ?? k}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Admins</SectionTitle>
        <Card className="divide-y divide-line/80 overflow-hidden">
          {s.admins.map((a, i) => (
            <div key={i} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <ShieldCheck className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{a.name || (a.phone ? formatPhone(a.phone) : a.email) || "Admin"}</p>
                <p className="truncate text-sm text-muted">{[a.phone ? formatPhone(a.phone) : null, a.email].filter(Boolean).join(" · ") || "—"}</p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>Maintenance</SectionTitle>
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">Clean up old data</p>
            <p className="text-sm text-muted">Removes expired QR tokens, old rate-limit rows and password-reset codes, and expires stale reward redemptions. Safe to run anytime.</p>
          </div>
          <CleanupButton />
        </Card>
      </section>
    </div>
  );
}
