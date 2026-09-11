import Link from "next/link";
import { Gift, Pencil, Plus } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Badge } from "@/components/ui/Badge";
import { LinkButton } from "@/components/ui/Button";
import { Card } from "@/components/ui/Card";
import { EmptyState } from "@/components/ui/EmptyState";
import { RewardToggle } from "@/components/merchant/RewardToggle";
import { requireMerchant, rpc } from "@/lib/session";
import { cardColor } from "@/lib/constants";

export const metadata = { title: "Rewards" };

type Reward = { id: string; name: string; description: string | null; stamps_required: number; is_primary: boolean; active: boolean; redeemed: number };

export default async function RewardsPage() {
  const ctx = await requireMerchant("/rewards");
  const data = await rpc<{ card: { id: string } | null; items: Reward[] }>("merchant_rewards");
  const c = cardColor(ctx.card?.color);
  const isOwner = ctx.member_role === "owner";

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title="Rewards" large subtitle="What customers unlock with stamps" />
      {!data.card ? (
        <EmptyState icon={<Gift className="size-8" />} title="Create your loyalty card first" action={<LinkButton href="/loyalty" block>Create loyalty card</LinkButton>}>
          Your main reward is set up together with the card.
        </EmptyState>
      ) : (
        <>
          <div className="space-y-3">
            {data.items.map((r) => (
              <Card key={r.id} className={`flex items-center gap-3 p-4 ${r.active ? "" : "opacity-70"}`}>
                <span className="grid size-14 shrink-0 place-items-center rounded-2xl" style={{ background: c.bg, color: c.accent }}>
                  <Gift className="size-7" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[16px] font-bold text-ink">{r.name}</p>
                  <p className="text-sm text-muted tabular">
                    {r.stamps_required} stamps · {r.redeemed} redeemed
                  </p>
                  <div className="mt-1.5 flex flex-wrap gap-1.5">
                    <Badge tone={r.active ? "success" : "neutral"}>{r.active ? "Active" : "Paused"}</Badge>
                    {r.is_primary && <Badge tone="brand">Main reward</Badge>}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    {!r.is_primary && <RewardToggle reward={r} />}
                    <Link href={`/rewards/${r.id}`} className="grid size-11 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink" aria-label={`Edit ${r.name}`}>
                      <Pencil className="size-5" />
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </div>
          {isOwner && (
            <LinkButton href="/rewards/new" block className="mt-5" icon={<Plus className="size-5" />}>
              Add reward
            </LinkButton>
          )}
          <p className="mt-4 text-center text-sm text-muted">Customers keep collecting after the main reward — a bigger reward at 15 or 20 stamps keeps regulars coming.</p>
        </>
      )}
    </div>
  );
}
