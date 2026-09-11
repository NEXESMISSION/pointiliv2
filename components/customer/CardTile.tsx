import Link from "next/link";
import { ChevronRight, Gift } from "lucide-react";
import { BusinessAvatar } from "@/components/CardIcon";
import { StampDots } from "@/components/LoyaltyCard";
import { cardColor } from "@/lib/constants";
import type { HomeCard } from "@/lib/types";

/** A loyalty card as it appears in lists: pastel card colour, stamps, what is left. */
export function CardTile({ card }: { card: HomeCard }) {
  const c = cardColor(card.card.color);
  const required = card.card.stamps_required;
  const unlocked = card.unlocked.length > 0;
  return (
    <Link
      href={`/customer/cards/${card.customer_id}`}
      className="block rounded-3xl p-4 transition active:scale-[0.99]"
      style={{ background: c.bg, boxShadow: `inset 0 0 0 1px ${c.soft}` }}
    >
      <div className="flex items-center gap-3">
        <BusinessAvatar logo={card.business.logo_url} icon={card.card.icon} color={card.card.color} size={52} />
        <div className="min-w-0 flex-1">
          <p className="truncate text-[17px] font-bold text-ink">{card.business.name}</p>
          <p className="text-sm font-medium text-body tabular">
            <span style={{ color: c.accent }} className="font-bold">
              {card.balance}
            </span>{" "}
            / {required} stamps
          </p>
        </div>
        <ChevronRight className="size-5 shrink-0 text-faint" />
      </div>
      <div className="mt-3.5">
        <StampDots filled={card.balance} total={required} color={card.card.color} />
      </div>
      <p className="mt-3 flex items-center gap-1.5 text-sm font-medium text-body">
        {unlocked ? (
          <>
            <Gift className="size-4" style={{ color: c.accent }} />
            <span className="font-semibold" style={{ color: c.accent }}>
              {card.unlocked[0]} unlocked!
            </span>
          </>
        ) : card.next_reward ? (
          <>
            {card.next_reward.remaining} more to get your reward
          </>
        ) : (
          "Keep collecting stamps"
        )}
      </p>
    </Link>
  );
}
