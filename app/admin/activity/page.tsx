import Link from "next/link";
import { Activity } from "lucide-react";
import { ActivityIcon, activityLabel, type AdminActivity } from "@/components/admin/shared";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { PLAN_LABEL } from "@/lib/constants";
import { dayKey, dayLabel, formatTime } from "@/lib/format";
import { rpc } from "@/lib/session";

export const metadata = { title: "Activity" };

const TYPES = [
  { key: "all", label: "All" },
  { key: "stamp", label: "Stamps" },
  { key: "reward_redeemed", label: "Rewards" },
  { key: "business_created", label: "New businesses" },
  { key: "subscription_activated", label: "Plans activated" },
  { key: "payment_requested", label: "Payment requests" },
  { key: "business_suspended", label: "Suspensions" },
];

function detail(a: AdminActivity): string | null {
  const d = a.data ?? {};
  const parts: string[] = [];
  if (typeof d.reward_name === "string") parts.push(d.reward_name);
  if (typeof d.plan === "string") parts.push(PLAN_LABEL[d.plan] ?? d.plan);
  if (typeof d.reference === "string") parts.push(d.reference);
  return parts.length ? parts.join(" · ") : null;
}

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const type = TYPES.some((t) => t.key === sp.type) ? sp.type! : "all";
  const items = await rpc<AdminActivity[]>("admin_activity", { p_type: type === "all" ? null : type, p_limit: 200 });

  const groups: { key: string; label: string; items: AdminActivity[] }[] = [];
  for (const a of items) {
    const k = dayKey(a.at);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(a);
    else groups.push({ key: k, label: dayLabel(a.at), items: [a] });
  }

  return (
    <div className="animate-fade space-y-4">
      <TopBar back="/admin" title="Activity" subtitle="Latest 200 events across the platform" large />
      <Segmented active={type} items={TYPES.map((t) => ({ key: t.key, label: t.label, href: t.key === "all" ? "/admin/activity" : `/admin/activity?type=${t.key}` }))} />

      {groups.length === 0 ? (
        <EmptyState icon={<Activity className="size-8" />} title="No activity">
          Nothing has happened here yet.
        </EmptyState>
      ) : (
        <div className="space-y-5">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="mb-2 px-1 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
              <Card className="divide-y divide-line/80 overflow-hidden">
                {g.items.map((a) => {
                  const extra = detail(a);
                  const inner = (
                    <>
                      <ActivityIcon type={a.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-ink">
                          {activityLabel(a.type)}
                          {a.customer_code != null && <span className="font-normal text-muted"> · #{a.customer_code}</span>}
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {a.business_name ?? "Pointidi"}
                          {extra && ` · ${extra}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-faint tabular">{formatTime(a.at)}</span>
                    </>
                  );
                  const cls = "flex min-h-16 items-center gap-3 px-4 py-3";
                  return a.business_id ? (
                    <Link key={a.id} href={`/admin/businesses/${a.business_id}`} className={`${cls} transition hover:bg-canvas/70`}>
                      {inner}
                    </Link>
                  ) : (
                    <div key={a.id} className={cls}>
                      {inner}
                    </div>
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
