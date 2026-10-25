import { Check, Gift, ShoppingBag } from "lucide-react";
import { ShopMark } from "@/components/ShopMark";
import { fill, t } from "@/lib/t";

export type PassShop = { name: string; kind: string; color: string; goal: number | null; gift: string | null; logo?: string | null; stamp_logo?: boolean; store?: boolean; wheel?: boolean };

/**
 * The loyalty card, the same everywhere: the shop's colour, its name, a dot
 * per stamp (the last one is the gift), and one line saying how far the gift
 * is. `small` is the wallet's card behind the front one: the top line only.
 * `fresh` makes the newest stamp land (after a scan).
 */
export function Pass({ shop, stamps, waiting, won: wonSaid, small, fresh, className = "" }: { shop: PassShop; stamps: number; waiting?: number; /** gifts waiting that are not all the same, said by name (lib/t giftsSaid) */ won?: string | null; small?: boolean; fresh?: boolean; className?: string }) {
  const goal = shop.goal ?? 10;
  const done = Math.min(stamps, goal);
  // `waiting`: the vouchers this card has earned (since 15 Oct 2026 a full card becomes a voucher and starts
  // again from zero) — the dots show the new card, the line says the gifts that wait. A card from before
  // still holds its stamps past the goal: each full card a gift, what is left over for the next one
  const vouchers = shop.store ? 0 : (waiting ?? 0);
  const ready = vouchers > 0 || stamps >= goal;
  const won = vouchers > 0 ? vouchers : Math.floor(stamps / goal);
  const rest = vouchers === 0 && won > 0 ? stamps - won * goal : 0;
  const left = goal - done;
  const cols = goal <= 6 ? goal : goal <= 10 ? 5 : goal <= 12 ? 6 : goal <= 16 ? 8 : 10;
  // the shop's own mark in place of the tick. The dot stays a white disc
  // either way, so a logo drawn on nothing still reads as a stamp filled in.
  const mark = !!shop.stamp_logo && !!shop.logo;

  // the dots keep a size a thumb understands: never giant on a short card, never tiny on a long one
  const dot = goal <= 6 ? "max-w-[3rem]" : "max-w-[2.5rem]";
  // several gifts that differ (two prizes of the wheel, a card changed between two full cards): each by name
  const line = ready && wonSaid
    ? fill(t.won, { gift: wonSaid })
    : shop.wheel
    ? ready
      ? shop.gift && shop.gift !== "الروليت"
        ? fill(t.won, { gift: shop.gift })
        : t.wheelReady
      : left === 1
        ? t.wheelToGoOne
        : fill(t.wheelToGo, { n: left })
    : ready
      ? fill(won > 1 ? t.wonMany : t.won, { gift: shop.gift ?? "", n: won })
      : left === 1
        ? fill(t.toGoOne, { gift: shop.gift ?? "" })
        : fill(t.toGo, { n: left, gift: shop.gift ?? "" });

  return (
    <div
      className={`relative overflow-hidden rounded-[1.5rem] text-white ${className}`}
      style={{
        // one colour, the shop's, a little lighter at the top: no pattern, nothing to read through
        background: `linear-gradient(165deg, color-mix(in oklab, ${shop.color} 82%, white) 0%, ${shop.color} 55%, color-mix(in oklab, ${shop.color} 88%, black) 100%)`,
        boxShadow: `0 14px 30px -18px color-mix(in oklab, ${shop.color} 75%, black)`,
      }}
    >
      <div className={`relative ${small ? "px-4 pb-6 pt-3.5" : "px-5 pb-4 pt-4"}`}>
        <div className="flex items-center gap-3">
          <span data-mark className="grid size-9 shrink-0 place-items-center overflow-hidden rounded-[0.75rem] bg-white/95">
            <ShopMark shop={shop} size={26} />
          </span>
          {/* a name in Latin letters too long for the card loses its end, never its start: «Pâtisserie El Me…» */}
          <span dir="auto" className="min-w-0 flex-1 truncate text-right text-[1rem] font-bold leading-tight">
            {shop.name}
          </span>
          {shop.store ? (
            // a shop with a store: the tampons kept, to spend
            <span className="num shrink-0 text-end leading-none">
              <span className="text-[1.5rem] font-bold">{stamps}</span>
              <span className="block text-[0.6875rem] font-semibold text-white/75">{t.storeBalance}</span>
            </span>
          ) : (
            <span className="num shrink-0 leading-none">
              <span className="text-[1.5rem] font-bold">{done}</span>
              <span className="text-[0.9375rem] font-semibold text-white/70">/{goal}</span>
            </span>
          )}
        </div>

        {!small && shop.store && (
          <p className="mt-3.5 flex items-center gap-2 border-t border-white/20 pt-2.5 text-[0.8438rem] font-semibold text-white/95">
            <ShoppingBag className="size-[1.125rem] shrink-0" />
            <span className="min-w-0 flex-1 truncate">{t.storeSpend}</span>
          </p>
        )}

        {!small && !shop.store && (
          <>
            <div className="mt-3.5 grid justify-items-center gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: goal }, (_, i) => {
                const on = i < done;
                const last = i === goal - 1;
                const landing = fresh && i === done - 1;
                return on ? (
                  <span
                    key={i}
                    data-dot={i}
                    className={`grid aspect-square w-full place-items-center rounded-full bg-white shadow-[0_2px_6px_rgb(0_0_0/0.15)] ${dot} ${landing ? "pass-land" : ""}`}
                    style={{ color: shop.color, animationDelay: landing ? "380ms" : undefined }}
                  >
                    {last ? (
                      <Gift className="size-[50%]" strokeWidth={2.4} />
                    ) : mark ? (
                      // eslint-disable-next-line @next/next/no-img-element
                      <img src={shop.logo!} alt="" decoding="async" className="size-[72%] rounded-full object-contain" />
                    ) : (
                      <Check className="size-[50%]" strokeWidth={3.2} />
                    )}
                  </span>
                ) : (
                  <span key={i} data-dot={i} className={`grid aspect-square w-full place-items-center rounded-full bg-white/20 text-white/80 ${dot}`}>
                    {last && <Gift className="size-[46%]" />}
                  </span>
                );
              })}
            </div>

            {shop.gift && (
              // one plain line under a thin rule: how far the gift is
              <p data-line className="mt-3.5 flex items-center gap-2 border-t border-white/20 pt-2.5 text-[0.8438rem] font-semibold text-white/95">
                <Gift className="size-[1.0625rem] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{line}</span>
                {rest > 0 && (
                  <span className="shrink-0 rounded-full bg-white/25 px-2 py-0.5 text-[0.8125rem] font-bold">
                    <bdi dir="ltr" className="num">+{rest}</bdi> {t.savedNext}
                  </span>
                )}
              </p>
            )}
          </>
        )}
      </div>
      <style>{`
        @keyframes pass-land {
          0% { transform: scale(2.4) rotate(-20deg); opacity: 0; }
          55% { transform: scale(0.82) rotate(4deg); opacity: 1; }
          75% { transform: scale(1.12) rotate(-2deg); }
          100% { transform: scale(1) rotate(0); }
        }
        .pass-land { animation: pass-land 700ms cubic-bezier(0.2, 0.9, 0.3, 1.2) both; }
      `}</style>
    </div>
  );
}
