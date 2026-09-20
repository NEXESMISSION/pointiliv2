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
    <div className="animate-fade space-y-2">
      <TopBar back="/admin" title={w.title} subtitle={w.subtitle} large />

      <div className="grid grid-cols-2 gap-2">
        <StatCard label={w.databaseSize} value={<span dir="ltr">{s.database_size}</span>} icon={<Database className="size-5" />} tint="brand" />
        {/* the stamp is long: one 12px line beats two wrapped ones */}
        <StatCard label={w.serverTime} value={<span className="text-xs">{formatDateTime(s.server_time, locale)}</span>} icon={<Clock className="size-5" />} tint="white" />
      </div>

      <section>
        <SectionTitle>{w.lastHour}</SectionTitle>
        {/* one tile grid instead of four cards: same four numbers, half the height */}
        <Card className="grid grid-cols-2 gap-px overflow-hidden bg-line/60 lg:grid-cols-4">
          {[
            { icon: <QrCode className="size-4" />, label: w.qrMinted, value: s.last_hour.qr_minted, tone: "text-muted" },
            { icon: <Stamp className="size-4" />, label: w.stamps, value: s.last_hour.stamps, tone: "text-warning-700" },
            { icon: <Timer className="size-4" />, label: w.claimsPending, value: s.last_hour.claims_pending, tone: "text-muted" },
            { icon: <UserPlus className="size-4" />, label: w.signups, value: s.last_hour.signups, tone: "text-success-600" },
          ].map((it) => (
            <div key={it.label} className="bg-white px-2 py-1.5 text-center">
              <p className="flex items-center justify-center gap-1.5 text-xs font-medium text-muted">
                <span className="truncate">{it.label}</span>
                <span className={`shrink-0 ${it.tone}`}>{it.icon}</span>
              </p>
              <p className="text-base font-semibold leading-tight text-ink tabular">{formatNumber(it.value, locale)}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>{w.tableRows}</SectionTitle>
        <Card className="grid max-h-[8.75rem] grid-cols-3 gap-px overflow-y-auto overscroll-contain bg-line/60 lg:max-h-none lg:grid-cols-5">
          {Object.entries(s.tables).map(([k, v]) => (
            <div key={k} className="bg-white px-2 py-1.5 text-center">
              <p className="text-base font-bold leading-tight text-ink tabular">{formatNumber(v, locale)}</p>
              <p className="truncate text-[11px] font-medium text-muted">{tables[k] ?? k}</p>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>{w.admins}</SectionTitle>
        <Card className="max-h-[6.5rem] divide-y divide-line/80 overflow-y-auto overscroll-contain lg:max-h-none">
          {s.admins.map((a, i) => (
            <div key={i} className="flex items-center gap-2.5 px-3.5 py-1.5">
              <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-brand-50 text-brand-600">
                <ShieldCheck className="size-[18px]" />
              </span>
              <div className="min-w-0 flex-1">
                <p className="truncate text-sm font-medium text-ink">{a.name || (a.phone ? formatPhone(a.phone) : a.email) || w.adminFallback}</p>
                <p className="truncate text-xs text-muted">
                  <span dir="ltr">{[a.phone ? formatPhone(a.phone) : null, a.email].filter(Boolean).join(" · ") || "—"}</span>
                </p>
              </div>
            </div>
          ))}
        </Card>
      </section>

      <section>
        <SectionTitle>{w.maintenance}</SectionTitle>
        <Card className="flex items-center gap-2.5 p-2">
          <div className="min-w-0 flex-1">
            <p className="text-sm font-semibold text-ink">{w.cleanupTitle}</p>
            <p className="text-xs leading-tight text-muted">{w.cleanupBody}</p>
          </div>
          <CleanupButton />
        </Card>
      </section>
    </div>
  );
}
