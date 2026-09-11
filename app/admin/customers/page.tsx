import { Users } from "lucide-react";
import { ResetPasswordButton } from "@/components/admin/AdminActions";
import { SearchForm, type AdminCustomers } from "@/components/admin/shared";
import { TopBar } from "@/components/nav/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Avatar } from "@/components/ui/Stat";
import { formatDate, formatNumber, initials, timeAgo } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export const metadata = { title: "Customers" };

export default async function CustomersPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const q = (sp.q ?? "").trim();
  const { total, items } = await rpc<AdminCustomers>("admin_customers", { p_search: q || null });

  return (
    <div className="animate-fade space-y-4">
      <TopBar title="Customers" subtitle={q ? `${formatNumber(items.length)} found · ${formatNumber(total)} customers in total` : `${formatNumber(total)} customers in total`} large />
      <SearchForm action="/admin/customers" q={q} placeholder="Search phone or name" />

      {items.length === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title={q ? "No one found" : "No customers yet"}>
          {q ? `Nothing matches “${q}”. Try the last digits of the phone number.` : "Customers appear here after they sign up."}
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
                      <p className="truncate text-[15px] font-semibold text-ink tabular">{phone}</p>
                      {c.role !== "customer" && <Badge tone={c.role === "admin" ? "brand" : "neutral"}>{c.role === "admin" ? "Admin" : "Merchant"}</Badge>}
                    </div>
                    <p className="truncate text-sm text-muted">{c.name || "—"}</p>
                    <p className="mt-1 flex flex-wrap gap-x-3 gap-y-0.5 text-xs text-muted">
                      <span>
                        <span className="font-semibold text-body tabular">{formatNumber(c.cards)}</span> card{c.cards === 1 ? "" : "s"}
                      </span>
                      <span>
                        <span className="font-semibold text-body tabular">{formatNumber(c.stamps)}</span> stamps
                      </span>
                      <span>
                        <span className="font-semibold text-body tabular">{formatNumber(c.redemptions)}</span> reward{c.redemptions === 1 ? "" : "s"}
                      </span>
                      <span>Joined {formatDate(c.created_at)}</span>
                      <span>Last stamp {timeAgo(c.last_stamp_at)}</span>
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
