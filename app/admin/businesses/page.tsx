import Link from "next/link";
import { ChevronRight, Store, Users } from "lucide-react";
import { BusinessStatusBadge, SearchForm, categoryIcon, qs, type AdminBusinessRow } from "@/components/admin/shared";
import { BusinessAvatar } from "@/components/CardIcon";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { SubscriptionBadge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { formatDate, formatNumber } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { formatPhone } from "@/lib/phone";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.businesses.title };
}

const KEYS = ["all", "active", "trial", "expiring", "expired", "suspended"] as const;

export default async function BusinessesPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const filter = (KEYS as readonly string[]).includes(sp.filter ?? "") ? sp.filter! : "all";
  const q = (sp.q ?? "").trim();
  const items = await rpc<AdminBusinessRow[]>("admin_businesses", { p_filter: filter, p_search: q || null });
  const { t, locale, count, fill } = await getI18n();
  const w = t.admin.businesses;
  const plans = t.data.plans as Record<string, string>;
  const planName = (plan: string | null | undefined, fallback: string) => (plan && plans[plan]) || fallback;
  const filterLabel: Record<string, string> = { all: t.admin.all, ...w.filters };

  return (
    <div className="animate-fade space-y-4">
      <TopBar
        back="/admin"
        title={w.title}
        subtitle={q || filter !== "all" ? count(w.found, items.length) : fill(w.inTotal, { n: formatNumber(items.length, locale) })}
        large
      />

      <SearchForm action="/admin/businesses" q={q} placeholder={w.searchPlaceholder} hidden={{ filter: filter === "all" ? undefined : filter }} />
      <Segmented
        active={filter}
        items={KEYS.map((key) => ({ key, label: filterLabel[key]!, href: `/admin/businesses${qs({ filter: key === "all" ? null : key, q })}` }))}
      />

      {items.length === 0 ? (
        <EmptyState icon={<Store className="size-8" />} title={w.emptyTitle}>
          {q ? fill(w.emptySearch, { q }) : w.emptyFilter}
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
                    <ChevronRight className="rtl:-scale-x-100 size-5 shrink-0 text-faint" />
                  </div>
                  <p className="truncate text-sm text-muted">
                    {b.owner.phone ? <span dir="ltr">{formatPhone(b.owner.phone)}</span> : (b.owner.email ?? "—")}
                    {b.owner.name && ` · ${b.owner.name}`}
                  </p>
                  <div className="mt-2 flex flex-wrap items-center gap-1.5">
                    <span className="text-xs font-semibold text-body">{planName(b.subscription.plan, t.data.plans.none)}</span>
                    <SubscriptionBadge status={b.subscription.status} plan={b.subscription.plan} />
                    <BusinessStatusBadge status={b.status} />
                  </div>
                  <p className="mt-1.5 flex flex-wrap items-center gap-x-3 gap-y-0.5 text-xs text-muted">
                    <span className="inline-flex items-center gap-1">
                      <Users className="size-3.5" /> {formatNumber(b.customers, locale)}
                    </span>
                    <span>{fill(w.created, { date: formatDate(b.created_at, locale) })}</span>
                    <span>{fill(w.expires, { date: formatDate(b.subscription.expires_at, locale) })}</span>
                  </p>
                </div>
              </Link>
            ))}
          </Card>

          {/* Desktop: table */}
          <Card className="hidden overflow-hidden lg:block">
            <div className="overflow-x-auto">
              <table className="w-full text-start text-sm">
                <thead className="border-b border-line/80 bg-canvas/60 text-xs font-semibold uppercase tracking-wide text-muted">
                  <tr>
                    <th className="px-4 py-3">{w.table.business}</th>
                    <th className="px-4 py-3">{w.table.plan}</th>
                    <th className="px-4 py-3">{w.table.status}</th>
                    <th className="px-4 py-3 text-end">{w.table.customers}</th>
                    <th className="px-4 py-3">{w.table.created}</th>
                    <th className="px-4 py-3">{w.table.expiration}</th>
                    <th className="px-4 py-3">
                      <span className="sr-only">{w.table.actions}</span>
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
                            <p className="max-w-56 truncate text-xs text-muted">
                              {b.owner.phone ? <span dir="ltr">{formatPhone(b.owner.phone)}</span> : (b.owner.email ?? "—")}
                            </p>
                          </div>
                        </div>
                      </td>
                      <td className="whitespace-nowrap px-4 py-3 text-body">{planName(b.subscription.plan, "—")}</td>
                      <td className="px-4 py-3">
                        <div className="flex flex-wrap gap-1.5">
                          <SubscriptionBadge status={b.subscription.status} plan={b.subscription.plan} />
                          <BusinessStatusBadge status={b.status} />
                        </div>
                      </td>
                      <td className="px-4 py-3 text-end font-semibold text-ink tabular">{formatNumber(b.customers, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(b.created_at, locale)}</td>
                      <td className="whitespace-nowrap px-4 py-3 text-muted">{formatDate(b.subscription.expires_at, locale)}</td>
                      <td className="px-4 py-3 text-end">
                        <Link href={`/admin/businesses/${b.id}`} className="inline-flex h-9 items-center rounded-xl px-3 font-semibold text-brand-700 hover:bg-brand-50">
                          {w.view}
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
