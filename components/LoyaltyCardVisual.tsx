import { Check, Gift, Heart, Star } from "lucide-react";
import { CardIcon } from "@/components/CardIcon";
import { patternImage, surface, type CardDesign } from "@/lib/card-design";

type Props = {
  design: CardDesign;
  business: { name: string; logo_url: string | null; cover_url?: string | null };
  subtitle?: string | null;
  /** stamps the customer has (extra past the goal carry over) */
  filled: number;
  /** stamps this customer needs */
  total: number;
  rewardName?: string | null;
  /** tile = customer home list; full = card page, previews */
  size?: "tile" | "full";
  animateIndex?: number;
  className?: string;
};

/** The loyalty card, in the owner's own design. One component for every place a card appears. */
export function LoyaltyCardVisual({ design, business, subtitle, filled, total, rewardName, size = "full", animateIndex, className = "" }: Props) {
  const s = surface(design, !!business.cover_url);
  const tile = size === "tile";
  const done = Math.min(filled, total);
  const complete = filled >= total;
  const extras = Math.max(0, filled - total);
  const cols = tile ? Math.min(total, 10) : total <= 5 ? total : total <= 10 ? 5 : total <= 12 ? 6 : total <= 20 ? 5 : 6;

  return (
    <div
      className={`relative isolate overflow-hidden rounded-[1.75rem] shadow-lift ${className}`}
      style={{ background: s.background, color: s.fg, border: s.border }}
      role="img"
      aria-label={`${business.name} loyalty card: ${done} of ${total} stamps${rewardName ? `, reward ${rewardName}` : ""}`}
    >
      {s.photo && business.cover_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={business.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.68) 100%)" }} />
        </>
      )}
      {design.pattern !== "none" && <div className="absolute inset-0" style={{ backgroundImage: patternImage(design.pattern, s.light) }} aria-hidden />}

      <div className={`relative ${tile ? "p-4" : "p-5"}`}>
        <div className="flex items-center gap-3">
          <span className="grid shrink-0 place-items-center overflow-hidden rounded-2xl" style={{ width: tile ? 42 : 50, height: tile ? 42 : 50, background: s.chip }}>
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="" className="size-full object-cover" />
            ) : (
              <CardIcon name={design.icon} className="size-[52%]" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-bold leading-tight ${tile ? "text-[17px]" : "text-lg"}`}>{business.name}</span>
            {subtitle && (
              <span className="block truncate text-sm" style={{ color: s.muted }}>
                {subtitle}
              </span>
            )}
          </span>
          <span className="shrink-0 text-right leading-none">
            <span className={`font-extrabold tabular ${tile ? "text-2xl" : "text-[1.75rem]"}`}>{done}</span>
            <span className="text-base font-semibold tabular" style={{ color: s.muted }}>
              /{total}
            </span>
          </span>
        </div>

        <div className={`grid ${tile ? "mt-4 gap-1.5" : "mt-5 gap-2.5"}`} style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
          {Array.from({ length: total }, (_, i) => {
            const on = i < done;
            const last = i === total - 1;
            if (on) {
              return (
                <span
                  key={i}
                  className={`grid aspect-square place-items-center overflow-hidden rounded-full ${i === animateIndex ? "animate-stamp" : ""}`}
                  style={{ background: design.accent, color: s.onAccent, boxShadow: "0 2px 6px rgba(0,0,0,0.14)" }}
                >
                  <StampMark design={design} logo={business.logo_url} tile={tile} last={last} />
                </span>
              );
            }
            return (
              <span
                key={i}
                className="grid aspect-square place-items-center rounded-full border-2 border-dashed"
                style={{ borderColor: s.emptyBorder, background: s.emptyFill, color: s.emptyBorder }}
              >
                {last ? <Gift className={tile ? "size-[52%]" : "size-[44%]"} /> : !tile && design.stamp === "icon" ? <CardIcon name={design.icon} className="size-[40%]" /> : null}
              </span>
            );
          })}
        </div>

        {rewardName && (
          <div className={`flex items-center gap-2 rounded-2xl font-semibold ${tile ? "mt-3.5 px-3 py-2 text-[13px]" : "mt-5 px-3.5 py-2.5 text-sm"}`} style={{ background: s.chip }}>
            <Gift className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{rewardName}</span>
            <span className="shrink-0" style={{ color: complete ? undefined : s.muted }}>
              {complete ? "Ready 🎉" : `${total - filled} to go`}
              {extras > 0 ? ` · +${extras}` : ""}
            </span>
          </div>
        )}
      </div>
    </div>
  );
}

function StampMark({ design, logo, tile, last }: { design: CardDesign; logo: string | null; tile: boolean; last: boolean }) {
  const cls = tile ? "size-[56%]" : "size-[50%]";
  if (last) return <Gift className={cls} strokeWidth={2.4} />;
  switch (design.stamp) {
    case "logo":
      // eslint-disable-next-line @next/next/no-img-element
      return logo ? <img src={logo} alt="" className="size-full rounded-full object-cover p-[3px]" /> : <Check className={cls} strokeWidth={3} />;
    case "check":
      return <Check className={cls} strokeWidth={3} />;
    case "heart":
      return <Heart className={cls} fill="currentColor" />;
    case "star":
      return <Star className={cls} fill="currentColor" />;
    default:
      return <CardIcon name={design.icon} className={cls} />;
  }
}
