"use client";

import Link from "next/link";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { PointsPass } from "@/components/PointsPass";
import { useT } from "@/components/i18n/Provider";
import { resolveDesign } from "@/lib/card-design";
import { rateRule } from "@/lib/points";
import type { HomeCard } from "@/lib/types";

/** Cards held like a phone wallet: the newest in front with everything on it,
    the ones behind showing only their top line, a little smaller the further back. */
export function WalletStack({ cards, max = 3 }: { cards: HomeCard[]; max?: number }) {
  const { t } = useT();
  const shown = cards.slice(0, max).reverse();
  return (
    <div className="flex flex-col">
      {shown.map((card, i) => {
        const depth = shown.length - 1 - i;
        const design = resolveDesign(card.card.design, { color: card.card.color, icon: card.card.icon });
        const reward = card.unlocked[0] ?? card.next_reward?.name ?? card.primary_reward;
        return (
          <Link
            key={card.customer_id}
            href={`/customer/cards/${card.customer_id}`}
            className={`block origin-top rounded-[26px] ${depth ? "" : "press"}`}
            style={{ marginTop: i === 0 ? 0 : -26, transform: depth ? `scale(${1 - depth * 0.05})` : undefined, zIndex: i }}
          >
            {card.system === "points" ? (
              <PointsPass
                size={depth ? "stack" : "tile"}
                design={design}
                business={card.business}
                subtitle={rateRule(card.card.dinars_per_point ?? 1, t.points)}
                balance={card.balance}
                goal={card.card.stamps_required}
                ready={card.unlocked[0] ?? null}
                next={card.next_reward ? { name: card.next_reward.name, remaining: card.next_reward.remaining } : null}
              />
            ) : (
              <LoyaltyCardVisual
                size={depth ? "stack" : "tile"}
                design={design}
                business={card.business}
                subtitle={card.card.description}
                filled={card.balance}
                total={card.card.stamps_required}
                levels={card.card.levels}
                rewardName={depth ? null : reward}
              />
            )}
          </Link>
        );
      })}
    </div>
  );
}
