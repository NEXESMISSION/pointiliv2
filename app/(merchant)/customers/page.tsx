import Link from "next/link";
import { ChevronRight, Search, Users } from "lucide-react";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Badge } from "@/components/ui/Badge";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { Avatar } from "@/components/ui/Stat";
import { rpc } from "@/lib/session";
import { formatNumber, initials, timeAgo } from "@/lib/format";
import type { MerchantCustomerRow } from "@/lib/types";

export const metadata = { title: "Customers" };

const SORTS = [
  { key: "recent", label: "Recent" },
  { key: "active", label: "Most active" },
  { key: "stamps", label: "Stamps" },
  { key: "rewards", label: "Rewards" },
];

const AVATAR_COLORS = ["#4536F0", "#0E9F6E", "#D97706", "#E11D48", "#0284C7", "#7C3AED"];

export default async function CustomersPage({ searchParams }: { searchParams: Promise<{ q?: string; sort?: string }> }) {
  const { q = "", sort = "recent" } = await searchParams;
  const activeSort = SORTS.some((s) => s.key === sort) ? sort : "recent";
  const data = await rpc<{ total: number; stamps_required: number | null; items: MerchantCustomerRow[] }>("merchant_customers", {
    p_search: q || null,
    p_sort: activeSort,
    p_limit: 100,
    p_offset: 0,
  });
  const required = data.stamps_required ?? 10;
  const qs = (s: string) => `/customers?sort=${s}${q ? `&q=${encodeURIComponent(q)}` : ""}`;

  return (
    <div className="mx-auto max-w-4xl">
      <TopBar title="Customers" large subtitle={`${formatNumber(data.total)} total`} />

      <form action="/customers" className="relative mb-3">
        <input type="hidden" name="sort" value={activeSort} />
        <Search className="pointer-events-none absolute left-4 top-1/2 size-5 -translate-y-1/2 text-faint" />
        <input
          name="q"
          defaultValue={q}
          type="search"
          inputMode="search"
          placeholder="Search #number or name"
          className="h-12 w-full rounded-2xl border border-line bg-white pl-12 pr-4 text-base placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
          aria-label="Search customers"
        />
      </form>
      <div className="mb-4">
        <Segmented active={activeSort} items={SORTS.map((s) => ({ ...s, href: qs(s.key) }))} />
      </div>

      {data.total === 0 ? (
        <EmptyState icon={<Users className="size-8" />} title="No customers yet." action={<LinkButton href="/qr" block>Open QR</LinkButton>}>
          Open your QR and let your first customer scan it.
        </EmptyState>
      ) : data.items.length === 0 ? (
        <EmptyState title="No match">Nobody matches “{q}”.</EmptyState>
      ) : (
        <Card className="divide-y divide-line/80 overflow-hidden">
          <div className="hidden grid-cols-[1fr_7rem_6rem_7rem_1.5rem] gap-3 px-4 py-2.5 text-xs font-semibold uppercase tracking-wide text-muted sm:grid">
            <span>Customer</span>
            <span>Stamps</span>
            <span>Visits</span>
            <span>Last visit</span>
            <span />
          </div>
          {data.items.map((c) => (
            <Link key={c.id} href={`/customers/${c.id}`} className="flex items-center gap-3 px-4 py-3 hover:bg-canvas/70 sm:grid sm:grid-cols-[1fr_7rem_6rem_7rem_1.5rem]">
              <span className="flex min-w-0 flex-1 items-center gap-3">
                <Avatar label={c.name ? initials(c.name) : "#"} size={42} color={AVATAR_COLORS[c.code % AVATAR_COLORS.length]} />
                <span className="min-w-0">
                  <span className="block truncate font-semibold text-ink">{c.name || `Customer #${c.code}`}</span>
                  <span className="block truncate text-sm text-muted tabular">
                    #{c.code} · {c.phone_masked}
                  </span>
                  <span className="mt-0.5 block text-sm text-body tabular sm:hidden">
                    <b className="text-brand-600">{c.balance}</b>/{c.target ?? required} · {c.total_stamps} visits
                  </span>
                </span>
              </span>
              <span className="hidden text-sm tabular sm:block">
                <b className="text-brand-600">{c.balance}</b>/{c.target ?? required} {c.reward_ready && <Badge tone="success" className="ml-1">Reward</Badge>}
              </span>
              <span className="hidden text-sm text-body tabular sm:block">{c.total_stamps}</span>
              <span className="hidden text-sm text-muted sm:block">{timeAgo(c.last_stamp_at)}</span>
              {c.reward_ready && <Badge tone="success" className="sm:hidden">Reward</Badge>}
              <ChevronRight className="size-5 shrink-0 text-faint" />
            </Link>
          ))}
        </Card>
      )}
    </div>
  );
}
