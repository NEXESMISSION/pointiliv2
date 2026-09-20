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
    <div className="animate-fade space-y-2.5">
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
        /* the directory is long by nature: it scrolls inside its own card */
        <Card className="max-h-[calc(100dvh-18rem)] divide-y divide-line/80 overflow-y-auto overscroll-contain lg:max-h-none">
          {items.map((c) => {
            const phone = c.phone ? formatPhone(c.phone) : "—";
            return (
              <div key={c.id} className="flex items-start gap-2.5 px-3.5 py-2.5">
                <Avatar label={initials(c.name, "#")} size={40} />
                <div className="min-w-0 flex-1">
                  {/* the action shares the phone's line, so the facts below keep the full width */}
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink tabular">
                      <span dir="ltr">{phone}</span>
                    </p>
                    <ResetPasswordButton userId={c.id} label={c.name ? `${c.name} (${phone})` : phone} />
                  </div>
                  <p className="flex items-center gap-2 text-[13px] text-muted">
                    <span className="min-w-0 truncate">{c.name || "—"}</span>
                    {c.role !== "customer" && <Badge tone={c.role === "admin" ? "brand" : "neutral"}>{c.role === "admin" ? w.roleAdmin : w.roleMerchant}</Badge>}
                  </p>
                  <p className="flex flex-wrap gap-x-2.5 gap-y-0.5 text-xs text-muted">
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
            );
          })}
        </Card>
      )}
    </div>
  );
}
