import { Clock, Database, QrCode, ShieldCheck, Stamp, Timer, UserPlus } from "lucide-react";
import { CleanupButton } from "@/components/admin/AdminActions";
import type { AdminSystem } from "@/components/admin/shared";
import { TopBar } from "@/components/nav/TopBar";
import { Card, SectionTitle } from "@/components/ui/Card";
import { StatCard } from "@/components/ui/Stat";
import { formatDateTime, formatNumber } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.system.title };
}

export default async function SystemPage() {
  const s = await rpc<AdminSystem>("admin_system");
  const { t, locale } = await getI18n();
  const w = t.admin.system;
  const tables = w.tables as Record<string, string>;

  return (
    <div className="animate-fade space-y-6">
      <TopBar back="/admin" title={w.title} subtitle={w.subtitle} large />

      <div className="grid grid-cols-2 gap-3">
        <StatCard label={w.databaseSize} value={<span dir="ltr">{s.database_size}</span>} icon={<Database className="size-5" />} tint="brand" />
        <StatCard label={w.serverTime} value={<span className="text-base">{formatDateTime(s.server_time, locale)}</span>} icon={<Clock className="size-5" />} tint="white" />
      </div>

      <section>
        <SectionTitle>{w.lastHour}</SectionTitle>
        <div className="grid grid-cols-2 gap-3 lg:grid-cols-4">
          <StatCard label={w.qrMinted} value={formatNumber(s.last_hour.qr_minted, locale)} icon={<QrCode className="size-5" />} tint="white" />
          <StatCard label={w.stamps} value={formatNumber(s.last_hour.stamps, locale)} icon={<Stamp className="size-5" />} tint="amber" />
          <StatCard label={w.claimsPending} value={formatNumber(s.last_hour.claims_pending, locale)} icon={<Timer className="size-5" />} tint="white" />
          <StatCard label={w.signups} value={formatNumber(s.last_hour.signups, locale)} icon={<UserPlus className="size-5" />} tint="green" />
        </div>
      </section>

      <section>
        <SectionTitle>{w.tableRows}</SectionTitle>
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line/60 sm:grid-cols-3 lg:grid-cols-5">
          {Object.entries(s.tables).map(([k, v]) => (
            <div key={k} className="bg-white p-4">
              <p className="text-xl font-bold text-ink tabular">{formatNumber(v, locale)}</p>
              <p className="truncate text-xs font-medium text-muted">{tables[k] ?? k}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>{w.admins}</SectionTitle>
        <Card className="divide-y divide-line/80 overflow-hidden">
          {s.admins.map((a, i) => (
            <div key={i} className="flex min-h-16 items-center gap-3 px-4 py-3">
              <span className="grid size-10 shrink-0 place-items-center rounded-2xl bg-brand-50 text-brand-600">
                <ShieldCheck className="size-5" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-[15px] font-medium text-ink">{a.name || (a.phone ? formatPhone(a.phone) : a.email) || w.adminFallback}</p>
                <p className="truncate text-sm text-muted">
                  <span dir="ltr">{[a.phone ? formatPhone(a.phone) : null, a.email].filter(Boolean).join(" · ") || "—"}</span>
                </p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>{w.maintenance}</SectionTitle>
        <Card className="flex flex-col gap-4 p-4 sm:flex-row sm:items-center sm:p-5">
          <div className="min-w-0 flex-1">
            <p className="font-semibold text-ink">{w.cleanupTitle}</p>
            <p className="text-sm text-muted">{w.cleanupBody}</p>
          </div>
          <CleanupButton />
        </Card>
      </section>
    </div>
  );
}
