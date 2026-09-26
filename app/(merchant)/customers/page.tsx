import Link from "next/link";
import type { Metadata } from "next";
import { Gift, Search } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { LinkButton } from "@/components/ui/Button";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import { dayKey, timeAgo } from "@/lib/format";
import type { ActivityItem, MerchantCustomerRow } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.merchant.people.title };
}

const DAY = 86_400_000;

/**
 * One page for "who comes" and "what happened": every customer, most recent
 * first, grouped by when they were last here. Today's group is today's
 * activity; the ring on each row is their card. No log, no sort menu.
 */
export default async function PeoplePage({ searchParams }: { searchParams: Promise<{ q?: string }> }) {
  const [{ t, locale, count, fill }, { q = "" }] = await Promise.all([getI18n(), searchParams]);
  const w = t.merchant.people;
  const [list, today] = await Promise.all([
    rpc<{ total: number; stamps_required: number | null; items: MerchantCustomerRow[] }>("merchant_customers", { p_search: q || null, p_sort: "recent", p_limit: 200, p_offset: 0 }),
    rpc<{ stamps: number; redemptions: number; items: ActivityItem[] }>("merchant_activity", { p_range: "today", p_from: null, p_to: null }),
  ]);
  const required = list.stamps_required ?? 10;
  const groups = byRecency(list.items);

  return (
    <div className="mx-auto max-w-2xl">
      <TopBar title={w.title} large back="/dashboard" subtitle={fill(w.today, { stamps: count(t.common.stampsCount, today.stamps), rewards: count(w.rewardsCount, today.redemptions) })} />

      <form action="/customers" className="relative mb-3">
        <Search className="pointer-events-none absolute start-3.5 top-1/2 size-4 -translate-y-1/2 text-faint" aria-hidden />
        <input
          name="q"
          defaultValue={q}
          type="search"
          inputMode="search"
          placeholder={w.search}
          aria-label={w.search}
          className="h-11 w-full rounded-2xl border border-line bg-white ps-10 pe-4 text-base placeholder:text-faint focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
        />
      </form>

      {list.total === 0 ? (
        <EmptyState icon={<Gift className="size-8" />} title={w.emptyTitle} action={<LinkButton href="/qr" block>{w.openQr}</LinkButton>}>
          {w.emptyBody}
        </EmptyState>
      ) : list.items.length === 0 ? (
        <EmptyState title={fill(w.noMatch, { q })} />
      ) : (
        // hundreds of regulars scroll in here; the frame, the title and the search stay put
        <div className="max-h-[60dvh] space-y-4 overflow-y-auto pb-2">
          {groups
            .filter((g) => g.rows.length > 0)
            .map((g) => (
              <section key={g.key}>
                <h2 className="mb-1.5 flex items-baseline gap-1.5 text-[13px] font-semibold text-muted">
                  {w.groups[g.key]} <span className="font-medium text-faint tabular">{g.rows.length}</span>
                </h2>
                <Card className="divide-y divide-line/80 overflow-hidden">
                  {g.rows.map((row) => {
                    const target = row.target ?? required;
                    return (
                      <Link key={row.id} href={`/customers/${row.id}`} className="flex items-center gap-3 px-3.5 py-2.5 transition-colors hover:bg-canvas/70">
                        <Ring balance={row.balance} target={target} ready={row.reward_ready} />
                        <span className="min-w-0 flex-1">
                          <span className="block truncate text-[15px] font-semibold text-ink">{row.name || fill(w.anon, { code: row.code })}</span>
                          <span className="block truncate text-[13px] text-muted">
                            {row.last_stamp_at ? timeAgo(row.last_stamp_at, locale) : w.never}
                            {row.phone_masked ? <span dir="ltr" className="inline-block"> · {row.phone_masked}</span> : null}
                          </span>
                        </span>
                        {row.reward_ready ? (
                          <span className="shrink-0 rounded-full bg-brand-600 px-2.5 py-1 text-xs font-bold text-white">{w.ready}</span>
                        ) : (
                          <span dir="ltr" className="shrink-0 text-sm font-semibold text-body tabular">
                            {Math.min(row.balance, target)}
                            <span className="text-muted">/{target}</span>
                          </span>
                        )}
                      </Link>
                    );
                  })}
                </Card>
              </section>
            ))}
        </div>
      )}
    </div>
  );
}

/** Today, this week, before: the list reads as a log without being one. */
function byRecency(rows: MerchantCustomerRow[]) {
  const now = Date.now();
  const todayKey = dayKey(new Date(now).toISOString());
  const groups: { key: "today" | "week" | "earlier"; rows: MerchantCustomerRow[] }[] = [
    { key: "today", rows: [] },
    { key: "week", rows: [] },
    { key: "earlier", rows: [] },
  ];
  for (const row of rows) {
    const at = row.last_stamp_at ? new Date(row.last_stamp_at).getTime() : 0;
    const g = row.last_stamp_at && dayKey(row.last_stamp_at) === todayKey ? 0 : now - at < 7 * DAY ? 1 : 2;
    groups[g]!.rows.push(row);
  }
  return groups;
}

/** The customer's card as one ring: how full it is, and whether a reward is waiting. */
function Ring({ balance, target, ready }: { balance: number; target: number; ready: boolean }) {
  const r = 16;
  const c = 2 * Math.PI * r;
  const done = Math.min(1, Math.max(0, target ? balance / target : 0));
  return (
    <span className="relative grid size-11 shrink-0 place-items-center" aria-hidden>
      <svg viewBox="0 0 40 40" className="absolute inset-0 size-full -rotate-90">
        <circle cx="20" cy="20" r={r} fill={ready ? "#6535E0" : "none"} stroke="#E8E8ED" strokeWidth="3.5" />
        <circle cx="20" cy="20" r={r} fill="none" stroke="#6535E0" strokeWidth="3.5" strokeLinecap="round" strokeDasharray={c} strokeDashoffset={c * (1 - done)} />
      </svg>
      {ready ? <Gift className="relative size-4 text-white" strokeWidth={2.4} /> : <span className="relative text-[11px] font-bold text-ink tabular">{Math.min(balance, target)}</span>}
    </span>
  );
}
