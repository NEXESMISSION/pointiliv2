import Link from "next/link";
import { Gift } from "lucide-react";
import { getI18n } from "@/lib/i18n/server";
import { formatTime, timeAgo } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

export async function ActivityRow({ item, relative = false }: { item: ActivityItem; relative?: boolean }) {
  const { t, locale, count, fill } = await getI18n();
  const w = t.ops.activity;
  const stamp = item.type === "stamp";
  const body = (
    <>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${stamp ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-700"}`}>
        {stamp ? "+1" : <Gift className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{stamp ? w.rowStamp : fill(w.rowReward, { name: item.data.reward_name ?? "" })}</span>
        <span className="block truncate text-sm text-muted">
          {item.customer_code ? fill(t.ops.customers.anon, { code: item.customer_code }) : w.customer}
          {stamp && item.data.balance != null ? ` · ${count(t.common.stampsCount, item.data.balance)}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium text-muted tabular">{relative ? timeAgo(item.at, locale) : formatTime(item.at, locale)}</span>
    </>
  );
  const cls = "flex items-center gap-3 px-4 py-3";
  return item.customer_id ? (
    <Link href={`/customers/${item.customer_id}`} className={`${cls} hover:bg-canvas/70`}>
      {body}
    </Link>
  ) : (
    <div className={cls}>{body}</div>
  );
}
