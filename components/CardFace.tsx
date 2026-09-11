import { Gift, MapPin } from "lucide-react";
import { BusinessAvatar, CardIcon } from "@/components/CardIcon";
import { StampGrid } from "@/components/LoyaltyCard";
import { cardColor, categoryLabel } from "@/lib/constants";

type Props = {
  business: { name: string; logo_url: string | null; cover_url?: string | null; category: string; address?: string | null };
  style: { color: string; icon: string };
  /** stamps the customer has (may exceed total: the extra carry over) */
  filled: number;
  /** stamps this customer needs for the card */
  total: number;
  reward?: { name: string; description?: string | null } | null;
  animateIndex?: number;
};

/** The loyalty card exactly as a customer sees it. Used by the customer app and the owner's live preview. */
export function CardFace({ business, style, filled, total, reward, animateIndex }: Props) {
  const c = cardColor(style.color);
  const complete = filled >= total;
  const extras = Math.max(0, filled - total);

  return (
    <div className="overflow-hidden rounded-3xl border border-line/80 bg-white shadow-card">
      <div className="relative h-28" style={{ background: `linear-gradient(135deg, ${c.accent}, ${c.accent}CC)` }}>
        {business.cover_url ? (
          <>
            {/* eslint-disable-next-line @next/next/no-img-element */}
            <img src={business.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
            <div className="absolute inset-0 bg-gradient-to-t from-black/25 to-transparent" />
          </>
        ) : (
          <CardIcon name={style.icon} className="absolute -right-3 -top-4 size-32 text-white/15" />
        )}
      </div>
      <div className="px-5 pb-5">
        <div className="relative -mt-9 mb-3 inline-block rounded-2xl bg-white p-1 shadow-card">
          <BusinessAvatar logo={business.logo_url} icon={style.icon} color={style.color} size={60} />
        </div>
        <h2 className="text-xl font-bold text-ink">{business.name}</h2>
        <p className="flex min-w-0 items-center gap-1 text-sm text-muted">
          {categoryLabel(business.category)}
          {business.address && (
            <>
              {" · "}
              <MapPin className="size-3.5 shrink-0" />
              <span className="truncate">{business.address}</span>
            </>
          )}
        </p>

        <div className="mt-5 rounded-3xl p-4" style={{ background: c.bg }}>
          <StampGrid filled={Math.min(filled, total)} total={total} color={style.color} icon={style.icon} animateIndex={animateIndex} />
          <p className="mt-4 text-center text-lg font-bold text-ink tabular">
            {complete ? (
              "Card complete! 🎉"
            ) : (
              <>
                <span style={{ color: c.accent }}>{filled}</span> / {total} stamps
              </>
            )}
          </p>
          {extras > 0 && (
            <p className="text-center text-sm font-medium text-body">
              +{extras} extra stamp{extras > 1 ? "s" : ""} saved for your next card
            </p>
          )}
        </div>

        {reward && (
          <div className="mt-4 flex gap-3 rounded-2xl border border-line p-3.5">
            <span className="grid size-12 shrink-0 place-items-center rounded-2xl" style={{ background: c.soft, color: c.accent }}>
              <Gift className="size-6" />
            </span>
            <div className="min-w-0">
              <p className="text-xs font-medium uppercase tracking-wide text-muted">Reward</p>
              <p className="font-bold text-ink">{reward.name || "Your reward"}</p>
              <p className="text-sm text-muted">{reward.description || `Collect ${total} stamps to unlock it.`}</p>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
