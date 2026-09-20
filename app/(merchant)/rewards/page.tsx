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
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.common.rewards };
}

type Reward = { id: string; name: string; description: string | null; stamps_required: number; is_primary: boolean; active: boolean; redeemed: number };

export default async function RewardsPage() {
  const [ctx, { t, count, fill }] = await Promise.all([requireMerchant("/rewards"), getI18n()]);
  const data = await rpc<{ card: { id: string } | null; items: Reward[] }>("merchant_rewards");
  const c = cardColor(ctx.card?.color);
  const isOwner = ctx.member_role === "owner";

  return (
    <div className="mx-auto w-full max-w-md">
      <TopBar title={t.common.rewards} large back="/loyalty" subtitle={t.merchant.rewards.subtitle} />
      {!data.card ? (
        <EmptyState icon={<Gift className="size-8" />} title={t.merchant.rewards.noCard} action={<LinkButton href="/loyalty" block>{t.merchant.rewards.createCard}</LinkButton>}>
          {t.merchant.rewards.noCardBody}
        </EmptyState>
      ) : (
        <>
          {/* a long list scrolls inside itself, so the page frame never moves */}
          <div className="max-h-[30rem] space-y-2 overflow-y-auto px-0.5 pb-0.5">
            {data.items.map((r) => (
              <Card key={r.id} className={`flex items-center gap-2.5 p-3 ${r.active ? "" : "opacity-70"}`}>
                <span className="grid size-11 shrink-0 place-items-center rounded-xl" style={{ background: c.bg, color: c.accent }}>
                  <Gift className="size-6" />
                </span>
                <div className="min-w-0 flex-1">
                  <p className="truncate text-[15px] font-bold text-ink">{r.name}</p>
                  <p className="text-[13px] text-muted tabular">
                    {count(t.common.stampsCount, r.stamps_required)} · {count(t.merchant.rewards.redeemed, r.redeemed)}
                  </p>
                  <div className="mt-1 flex flex-wrap gap-1.5">
                    <Badge tone={r.active ? "success" : "neutral"}>{r.active ? t.merchant.rewards.active : t.merchant.rewards.paused}</Badge>
                    {r.is_primary && <Badge tone="brand">{t.merchant.rewards.main}</Badge>}
                  </div>
                </div>
                {isOwner && (
                  <div className="flex shrink-0 items-center gap-1">
                    {!r.is_primary && <RewardToggle reward={r} />}
                    <Link href={`/rewards/${r.id}`} className="grid size-10 place-items-center rounded-xl text-muted hover:bg-canvas hover:text-ink" aria-label={fill(t.merchant.rewards.editAria, { name: r.name })}>
                      <Pencil className="size-5" />
                    </Link>
                  </div>
                )}
              </Card>
            ))}
          </div>
          {isOwner && (
            <LinkButton href="/rewards/new" size="md" block className="mt-3" icon={<Plus className="size-5" />}>
              {t.merchant.rewards.add}
            </LinkButton>
          )}
          <p className="mt-2.5 text-center text-xs leading-snug text-muted">{t.merchant.rewards.tip}</p>
        </>
      )}
    </div>
  );
}
