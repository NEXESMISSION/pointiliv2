"use client";

import Link from "next/link";
import { CardDeadline } from "@/components/customer/CardDeadline";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { PointsPass } from "@/components/PointsPass";
import { useT } from "@/components/i18n/Provider";
import { resolveDesign } from "@/lib/card-design";
import { daysUntil } from "@/lib/format";
import { rateRule } from "@/lib/points";
import type { HomeCard } from "@/lib/types";

/** A loyalty card in the customer's list — the business's own card design, stamps or points. */
export function CardTile({ card }: { card: HomeCard }) {
  const { t } = useT();
  const design = resolveDesign(card.card.design, { color: card.card.color, icon: card.card.icon });
  const reward = card.unlocked[0] ?? card.next_reward?.name ?? card.primary_reward;
  return (
    <Link href={`/customer/cards/${card.customer_id}`} className="block rounded-[1.25rem] transition active:scale-[0.98]">
      {card.system === "points" ? (
        <PointsPass
          size="tile"
          design={design}
          business={card.business}
          subtitle={rateRule(card.card.dinars_per_point ?? 1, t.points)}
          balance={card.balance}
          goal={card.card.stamps_required}
          ready={card.unlocked[0] ?? null}
          next={card.next_reward ? { name: card.next_reward.name, remaining: card.next_reward.remaining } : null}
        />
      ) : (
        <LoyaltyCardVisual size="tile" design={design} business={card.business} subtitle={card.card.description} filled={card.balance} total={card.card.stamps_required} levels={card.card.levels} rewardName={reward} />
      )}
      {card.system !== "points" && card.expires_at && daysUntil(card.expires_at) <= 7 && <CardDeadline expiresAt={card.expires_at} className="mx-auto mt-1.5 w-fit" />}
    </Link>
  );
}
