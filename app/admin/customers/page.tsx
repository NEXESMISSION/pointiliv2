import { Users } from "lucide-react";
import { ResetPasswordButton } from "@/components/admin/AdminActions";
import { SearchForm, type AdminCustomers } from "@/components/admin/shared";
import { TopBar } from "@/components/nav/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Stat";
import { formatDate, formatNumber, initials, timeAgo } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.customers.title };
}

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const { total, items } = await rpc<AdminCustomers>("admin_customers", { p_search: q || null });
  const { t, locale, count, fill } = await getI18n();
  const w = t.admin.customers;

  return (
    <div className="animate-fade space-y-4">
      <TopBar
        back="/admin"
        title={w.title}
        subtitle={q ? `${count(w.found, items.length)} · ${count(w.total, total)}` : count(w.total, total)}
        large
      />
      <SearchForm action="/admin/customers" q={q} placeholder={w.searchPlaceholder} />

      {items.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title={q ? w.emptyFoundTitle : w.emptyTitle}>
          {q ? fill(w.emptySearch, { q }) : w.emptyBody}
        </EmptyState>
      ) : (
        <Card className="divide-y divide-line/80 overflow-hidden">
          {items.map((c) => {
            const phone = c.phone ? formatPhone(c.phone) : "—";
            return (
              <div key={c.id} className="flex flex-col gap-3 px-4 py-3.5 sm:flex-row sm:items-center">
                <div className="flex min-w-0 flex-1 items-center gap-3">
                  <Avatar label={initials(c.name, "#")} size={44} />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2">
                      <p className="truncate text-[15px] font-semibold text-ink tabular">
                        <span dir="ltr">{phone}</span>
                      </p>
                      {c.role !== "customer" && <Badge tone={c.role === "admin" ? "brand" : "neutral"}>{c.role === "admin" ? w.roleAdmin : w.roleMerchant}</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted">{c.name || "—"}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>
                        <span className="font-semibold text-body tabular">{formatNumber(c.cards, locale)}</span> {count(w.cardsUnit, c.cards)}
                      </span>
                      <span>
                        <span className="font-semibold text-body tabular">{formatNumber(c.stamps, locale)}</span> {count(w.stampsUnit, c.stamps)}
                      </span>
                      <span>
                        <span className="font-semibold text-body tabular">{formatNumber(c.redemptions, locale)}</span> {count(w.rewardsUnit, c.redemptions)}
                      </span>
                      <span>{fill(w.joined, { date: formatDate(c.created_at, locale) })}</span>
                      <span>{fill(w.lastStamp, { ago: timeAgo(c.last_stamp_at, locale) })}</span>
                    </p>
                  </div>
                </div>
                <div className="sm:shrink-0">
                  <ResetPasswordButton userId={c.id} label={c.name ? `${c.name} (${phone})` : phone} />
                </div>
              </div>
            );
          })}
        </Card>
      )}
    </div>
  );
}
