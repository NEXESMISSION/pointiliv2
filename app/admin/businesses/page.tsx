import Link from "next/link";
import { ChevronRight, Store, Users } from "lucide-react";
import { BusinessStatusBadge, SearchForm, categoryIcon, qs, type AdminBusinessRow } from "@/components/admin/shared";
import { BusinessAvatar } from "@/components/CardIcon";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PLAN_LABEL } from "@/lib/constants";
import { formatDate, formatNumber } from "@/lib/format";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export const metadata = { title: "Businesses" };

const FILTERS = [
  { key: "all", label: "All" },
  { key: "active", label: "Active" },
  { key: "trial", label: "Trial" },
  { key: "expiring", label: "Expiring" },
  { key: "expired", label: "Expired" },
  { key: "suspended", label: "Suspended" },
];

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter = FILTERS.some((f) => f.key === sp.filter) ? sp.filter! : "all";
  const q = (sp.q ?? "").trim();
  const items = await rpc<AdminBusinessRow[]>("admin_businesses", { p_filter: filter, p_search: q || null });

  return (
    <div className="animate-fade space-y-4">
      <TopBar title="Businesses" subtitle={`${formatNumber(items.length)} ${q || filter !== "all" ? "found" : "in total"}`} large />

      <SearchForm action="/admin/businesses" q={q} placeholder="Search name, owner or phone" hidden={{ filter: filter === "all" ? undefined : filter }} />
      <Segmented
        active={filter}
        items={FILTERS.map((f) => ({ key: f.key, label: f.label, href: `/admin/businesses${qs({ filter: f.key === "all" ? null : f.key, q })}` }))}
      />

      {items.length === 0 ? (
        <EmptyState icon={<Store className="size-8" />} title="No businesses found">
          {q ? `Nothing matches “${q}”. Try another name or phone.` : "No business matches this filter yet."}
        </EmptyState>
      ) : (
        <>
          {/* Mobile: cards */}
          <Card className="divide-y divide-line/80 overflow-hidden lg:hidden">
            {items.map((b) => (
              <Link key={b.id} href={`/admin/businesses/${b.id}`} className="flex items-start gap-3 px-4 py-3.5 transition hover:bg-canvas/70">
                <BusinessAvatar logo={b.logo_url} icon={categoryIcon(b.category)} size={44} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <p className="min-w-0 flex-1 truncate text-[15px] font-semibold text-ink">{b.name}</p>
                    <ChevronRight className="size-5 shrink-0 text-faint" />
                  </div>
                  <p className="truncate text-sm text-muted">
                    {b.owner.phone ? formatPhone(b.owner.phone) : (b.owner.email ?? "—")}
                    {b.owner.name && ` · ${b.owner.name}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-body">{PLAN_LABEL[b.subscription.plan ?? ""] ?? "No plan"}</span>
                    <SubscriptionBadge status={b.subscription.status} plan={b.subscription.plan} />
                    <BusinessStatusBadge status={b.status} />
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" /> {formatNumber(b.customers)}
                    </span>
                    <span>Created {formatDate(b.created_at)}</span>
                    <span>Expires {formatDate(b.subscription.expires_at)}</span>
                  </p>
                </div>
              </Link>
            ))}
          </Card>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-left text-sm">
                <thead className="border-b border-line/80 bg-canvas/60 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">Business</th>
                    <th className="px-4 py-3">Plan</th>
                    <th className="px-4 py-3">Status</th>
                    <th className="px-4 py-3 text-right">Customers</th>
                    <th className="px-4 py-3">Created</th>
                    <th className="px-4 py-3">Expiration</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">Actions</span>
                    </th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-line/80">
                  {items.map((b) => (
                    <tr key={b.id} className="transition hover:bg-canvas/50">
                      <td className="px-4 py-3">
                        <div className="flex items-center gap-3">
                          <BusinessAvatar logo={b.logo_url} icon={categoryIcon(b.category)} size={40} />
                          <div className="min-w-0">
                            <Link href={`/admin/businesses/${b.id}`} className="block max-w-56 truncate font-semibold text-ink hover:text-brand-700">
                              {b.name}
                            </Link>
                            <p className="max-w-56 truncate text-xs text-muted">{b.owner.phone ? formatPhone(b.owner.phone) : (b.owner.email ?? "—")}</p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-body">{PLAN_LABEL[b.subscription.plan ?? ""] ?? "—"}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <SubscriptionBadge status={b.subscription.status} plan={b.subscription.plan} />
                          <BusinessStatusBadge status={b.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-right font-semibold text-ink tabular">{formatNumber(b.customers)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(b.created_at)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(b.subscription.expires_at)}</td>
                      <td className="px-4 py-3 text-right">
                        <Link href={`/admin/businesses/${b.id}`} className="inline-flex h-9 items-center rounded-xl px-3 font-semibold text-brand-700 hover:bg-brand-50">
                          View
                        </Link>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </Card>
        </>
      )}
    </div>
  );
}
