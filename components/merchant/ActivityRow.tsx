import Link from "next/link";
import { Gift } from "lucide-react";
import { formatTime, timeAgo } from "@/lib/format";
import type { ActivityItem } from "@/lib/types";

export function ActivityRow({ item, relative = false }: { item: ActivityItem; relative?: boolean }) {
  const stamp = item.type === "stamp";
  const body = (
    <>
      <span className={`grid size-9 shrink-0 place-items-center rounded-full text-sm font-bold ${stamp ? "bg-success-50 text-success-600" : "bg-warning-50 text-warning-700"}`}>
        {stamp ? "+1" : <Gift className="size-4" />}
      </span>
      <span className="min-w-0 flex-1">
        <span className="block truncate text-[15px] font-semibold text-ink">{stamp ? "+1 stamp" : `Reward redeemed · ${item.data.reward_name ?? ""}`}</span>
        <span className="block truncate text-sm text-muted">
          {item.customer_code ? `Customer #${item.customer_code}` : "Customer"}
          {stamp && item.data.balance != null ? ` · ${item.data.balance} stamp${item.data.balance === 1 ? "" : "s"}` : ""}
        </span>
      </span>
      <span className="shrink-0 text-xs font-medium text-muted tabular">{relative ? timeAgo(item.at) : formatTime(item.at)}</span>
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
