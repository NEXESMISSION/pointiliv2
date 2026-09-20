import Link from "next/link";
import { Activity } from "lucide-react";
import { ActivityIcon, activityLabel, type AdminActivity } from "@/components/admin/shared";
import { Segmented, TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { dayKey, dayLabel, formatTime } from "@/lib/format";
import { getI18n } from "@/lib/i18n/server";
import { rpc } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.admin.activity.title };
}

const KEYS = ["all", "stamp", "reward_redeemed", "business_created", "subscription_activated", "payment_requested", "business_suspended"] as const;

export default async function ActivityPage({ searchParams }: { searchParams: Promise<Record<string, string | undefined>> }) {
  const sp = await searchParams;
  const type = (KEYS as readonly string[]).includes(sp.type ?? "") ? sp.type! : "all";
  const items = await rpc<AdminActivity[]>("admin_activity", { p_type: type === "all" ? null : type, p_limit: 200 });
  const { t, locale } = await getI18n();
  const w = t.admin.activity;
  const plans = t.data.plans as Record<string, string>;
  const filterLabel: Record<string, string> = { all: t.admin.all, ...w.filters };

  /** The reward, the plan or the payment reference carried by the event. */
  function detail(a: AdminActivity): string | null {
    const d = a.data ?? {};
    const parts: string[] = [];
    if (typeof d.reward_name === "string") parts.push(d.reward_name);
    if (typeof d.plan === "string") parts.push(plans[d.plan] ?? d.plan);
    if (typeof d.reference === "string") parts.push(d.reference);
    return parts.length ? parts.join(" · ") : null;
  }

  const groups: { key: string; label: string; items: AdminActivity[] }[] = [];
  for (const a of items) {
    const k = dayKey(a.at);
    const last = groups[groups.length - 1];
    if (last && last.key === k) last.items.push(a);
    else groups.push({ key: k, label: dayLabel(a.at, locale), items: [a] });
  }

  return (
    <div className="animate-fade space-y-2.5">
      <TopBar back="/admin" title={w.title} subtitle={w.subtitle} large />
      <Segmented active={type} items={KEYS.map((key) => ({ key, label: filterLabel[key]!, href: key === "all" ? "/admin/activity" : `/admin/activity?type=${key}` }))} />

      {groups.length === 0 ? (
        <EmptyState icon={<Activity className="size-8" />} title={w.emptyTitle}>
          {w.emptyBody}
        </EmptyState>
      ) : (
        /* a day-by-day log: it scrolls inside its own frame, day labels pinned */
        <div className="max-h-[calc(100dvh-17rem)] space-y-3 overflow-y-auto overscroll-contain lg:max-h-none">
          {groups.map((g) => (
            <section key={g.key}>
              <h2 className="sticky top-0 z-10 mb-1.5 bg-canvas px-1 py-0.5 text-xs font-semibold uppercase tracking-wide text-muted">{g.label}</h2>
              <Card className="divide-y divide-line/80 overflow-hidden">
                {g.items.map((a) => {
                  const extra = detail(a);
                  const inner = (
                    <>
                      <ActivityIcon type={a.type} />
                      <span className="min-w-0 flex-1">
                        <span className="block truncate text-[15px] font-medium text-ink">
                          {activityLabel(w.types, a.type)}
                          {a.customer_code != null && (
                            <span className="font-normal text-muted">
                              {" · "}
                              <span dir="ltr">#{a.customer_code}</span>
                            </span>
                          )}
                        </span>
                        <span className="block truncate text-sm text-muted">
                          {a.business_name ?? "Pointili"}
                          {extra && ` · ${extra}`}
                        </span>
                      </span>
                      <span className="shrink-0 text-xs text-faint tabular">{formatTime(a.at, locale)}</span>
                    </>
                  );
                  const cls = "flex items-center gap-2.5 px-3.5 py-2";
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
