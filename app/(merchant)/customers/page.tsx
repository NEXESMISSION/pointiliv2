import Link from "next/link";
import type { Metadata } from "next";
import { ChevronRight, Search, Users } from "lucide-react";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Stat";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { formatNumber, initials, timeAgo } from "@/lib/format";
import type { MerchantCustomerRow } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.customers.title };
}

const SORT_KEYS = ["recent", "active", "stamps", "rewards"] as const;

const AVATAR_COLORS = ["#6535E0", "#0E9F6E", "#D97706", "#E11D48", "#0284C7", "#7C3AED"];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const { t, locale, count, fill } = await getI18n();
  const { q = "", sort = "recent" } = await searchParams;
  const activeSort = (SORT_KEYS as readonly string[]).includes(sort) ? sort : "recent";
  const data = await rpc<{ total: number; stamps_required: number | null; items: MerchantCustomerRow[] }>("merchant_customers", {
    p_search: q || null,
    p_sort: activeSort,
    p_limit: 100,
    p_offset: 0,
  });
  const required = data.stamps_required ?? 10;
  const qs = (s: string) => `/customers?sort=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;
  const c = t.ops.customers;

  return (
    <div className="mx-auto max-w-4xl">
      <TopBar title={c.title} large back="/dashboard" subtitle={fill(c.total, { n: formatNumber(data.total, locale) })} />

      <form action="/customers" className="relative mb-3">
        <input type="hidden" name="sort" value={activeSort} />
        <Search className="pointer-events-none absolute start-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
        <input
          name="q"
          defaultValue={q}
          type="search"
          inputMode="search"
          placeholder={c.searchPlaceholder}
          className="h-12 w-full rounded-2xl border border-line bg-white ps-12 pe-4 text-base placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          aria-label={c.searchAria}
        />
      </form>
      <div className="mb-4">
        <Segmented active={activeSort} items={SORT_KEYS.map((k) => ({ key: k, label: c.sort[k], href: qs(k) }))} />
      </div>

      {data.total === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title={c.emptyTitle} action={<LinkButton href="/qr" block>{c.openQr}</LinkButton>}>
          {c.emptyBody}
        </EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState title={c.noMatchTitle}>{fill(c.noMatchBody, { q })}</EmptyState>
      ) : (
        <Card className="divide-y divide-line/80 overflow-hidden">
          <div className="hidden grid-cols-[1fr_7rem_6rem_7rem_1.5rem] gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>{c.colCustomer}</span>
            <span>{c.colStamps}</span>
            <span>{c.colVisits}</span>
            <span>{c.colLastVisit}</span>
            <span />
          </div>
          {data.items.map((row) => (
            <Link key={row.id} href={`/customers/${row.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas/70 sm:grid sm:grid-cols-[1fr_7rem_6rem_7rem_1.5rem]">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar label={row.name ? initials(row.name) : "#"} size={42} color={AVATAR_COLORS[row.code % AVATAR_COLORS.length]} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{row.name || fill(c.anon, { code: row.code })}</span>
                  <span className="block truncate text-sm text-muted tabular">
                    <span dir="ltr" className="inline-block">
                      #{row.code} · {row.phone_masked}
                    </span>
                  </span>
                  <span className="mt-0.5 block text-sm text-body tabular sm:hidden">
                    <b className="text-brand-600">{row.balance}</b>/{row.target ?? required} · {count(t.common.visitsCount, row.total_stamps)}
                  </span>
                </span>
              </span>
              <span className="hidden text-sm tabular sm:block">
                <b className="text-brand-600">{row.balance}</b>/{row.target ?? required} {row.reward_ready && <Badge tone="success" className="ms-1">{c.rewardReady}</Badge>}
              </span>
              <span className="hidden text-sm text-body tabular sm:block">{row.total_stamps}</span>
              <span className="hidden text-sm text-muted sm:block">{timeAgo(row.last_stamp_at, locale)}</span>
              {row.reward_ready && <Badge tone="success" className="sm:hidden">{c.rewardReady}</Badge>}
              <ChevronRight className="rtl:-scale-x-100 size-5 shrink-0 text-faint" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
