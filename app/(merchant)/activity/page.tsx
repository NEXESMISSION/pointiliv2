import { Activity } from "lucide-react";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { ActivityRow } from "@/components/merchant/ActivityRow";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { Input } from "@/components/ui/Field";
import { rpc } from "@/lib/session";
import { dayKey, dayLabel, formatNumber } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

export const metadata = { title: "Activity" };

const RANGES = [
  { key: "today", label: "Today" },
  { key: "week", label: "Week" },
  { key: "month", label: "Month" },
  { key: "custom", label: "Custom" },
];
const DATE = /^\d{4}-\d{2}-\d{2}$/;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<{ range?: string; from?: string; to?: string }> }) {
  const sp = await searchParams;
  const range = RANGES.some((r) => r.key === sp.range) ? sp.range! : "today";
  const from = sp.from && DATE.test(sp.from) ? sp.from : null;
  const to = sp.to && DATE.test(sp.to) ? sp.to : null;
  const data = await rpc<{ from: string; to: string; stamps: number; redemptions: number; items: ActivityItem[] }>("merchant_activity", {
    p_range: range,
    p_from: from,
    p_to: to,
  });

  const groups = new Map<string, ActivityItem[]>();
  for (const item of data.items) {
    const k = dayKey(item.at);
    groups.set(k, [...(groups.get(k) ?? []), item]);
  }

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Activity" large back="/dashboard" />
      <div className="mb-4">
        <Segmented active={range} items={RANGES.map((r) => ({ ...r, href: `/activity?range=${r.key}` }))} />
      </div>

      {range === "custom" && (
        <form action="/activity" className="mb-4 flex flex-wrap items-end gap-2">
          <input type="hidden" name="range" value="custom" />
          <label className="min-w-0 flex-1 text-sm font-medium text-body">
            From
            <Input type="date" name="from" defaultValue={data.from} className="mt-1 h-12" />
          </label>
          <label className="min-w-0 flex-1 text-sm font-medium text-body">
            To
            <Input type="date" name="to" defaultValue={data.to} className="mt-1 h-12" />
          </label>
          <button type="submit" className="h-12 rounded-2xl bg-brand-600 px-5 font-semibold text-white">
            Show
          </button>
        </form>
      )}

      <div className="mb-4 grid grid-cols-2 gap-3">
        <Card className="p-4">
          <p className="text-2xl font-bold text-ink tabular">{formatNumber(data.stamps)}</p>
          <p className="text-xs font-medium text-muted">Stamps</p>
        </Card>
        <Card className="p-4">
          <p className="text-2xl font-bold text-ink tabular">{formatNumber(data.redemptions)}</p>
          <p className="text-xs font-medium text-muted">Rewards redeemed</p>
        </Card>
      </div>

      {data.items.length === 0 ? (
        <EmptyState icon={<Activity className="size-8" />} title="Nothing here yet">
          Stamps and redeemed rewards appear here as they happen.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {[...groups.entries()].map(([k, items]) => (
            <section key={k}>
              <h2 className="mb-2 text-sm font-semibold text-muted">{dayLabel(items[0]!.at)}</h2>
              <Card className="divide-y divide-line/80 overflow-hidden">
                {items.map((a) => (
                  <ActivityRow key={a.id} item={a} />
                ))}
              </Card>
            </section>
          ))}
        </div>
      )}
    </div>
  );
}
