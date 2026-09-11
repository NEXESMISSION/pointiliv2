import Link from "next/link";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { resolveDesign } from "@/lib/card-design";
import type { HomeCard } from "@/lib/types";

/** A loyalty card in the customer's list — the business's own card design. */
export function CardTile({ card }: { card: HomeCard }) {
  const design = resolveDesign(card.card.design, { color: card.card.color, icon: card.card.icon });
  const reward = card.unlocked[0] ?? card.next_reward?.name ?? card.primary_reward;
  return (
    <Link href={`/customer/cards/${card.customer_id}`} className="block rounded-[1.75rem] transition active:scale-[0.98]">
      <LoyaltyCardVisual size="tile" design={design} business={card.business} subtitle={card.card.description} filled={card.balance} total={card.card.stamps_required} rewardName={reward} />
    </Link>
  );
}
