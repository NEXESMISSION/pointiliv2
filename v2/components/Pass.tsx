import { Check, Gift } from "lucide-react";
import { Icon3D } from "@/components/ui";
import { fill, kindIcon, t } from "@/lib/t";

export type PassShop = { name: string; kind: string; color: string; goal: number | null; gift: string | null };

/**
 * The loyalty card, the same everywhere: the shop's colour, its name, a dot
 * per stamp (the last one is the gift), and one line saying how far the gift
 * is. `small` is the wallet's card behind the front one: the top line only.
 * `fresh` makes the newest stamp land (after a scan).
 */
export function Pass({ shop, stamps, small, fresh, className = "" }: { shop: PassShop; stamps: number; small?: boolean; fresh?: boolean; className?: string }) {
  const goal = shop.goal ?? 10;
  const done = Math.min(stamps, goal);
  const ready = stamps >= goal;
  const left = goal - done;
  const cols = goal <= 6 ? goal : goal <= 10 ? 5 : goal <= 12 ? 6 : goal <= 16 ? 8 : 10;

  return (
    <div
      className={`relative overflow-hidden rounded-[1.75rem] text-white ${className}`}
      style={{
        background: `linear-gradient(150deg, color-mix(in oklab, ${shop.color} 75%, white) -20%, ${shop.color} 45%, color-mix(in oklab, ${shop.color} 70%, black) 120%)`,
        boxShadow: `0 20px 44px -18px color-mix(in oklab, ${shop.color} 80%, black)`,
      }}
    >
      {/* light from the top corner, and soft waves: the pass looks like a pass */}
      <span className="pointer-events-none absolute inset-0 bg-[radial-gradient(110%_80%_at_0%_0%,rgb(255_255_255/0.28),transparent_55%)]" aria-hidden />
      <svg className="pointer-events-none absolute inset-0 size-full opacity-[0.13]" aria-hidden>
        <defs>
          <pattern id="waves" width="90" height="36" patternUnits="userSpaceOnUse">
            <path d="M0 18c22 0 22-10 45-10s23 10 45 10" fill="none" stroke="white" strokeWidth="2" />
          </pattern>
        </defs>
        <rect width="100%" height="100%" fill="url(#waves)" />
      </svg>

      <div className={`relative ${small ? "px-4 pb-7 pt-3.5" : "p-5"}`}>
        <div className="flex items-center gap-3">
          <span className="grid size-[2.875rem] shrink-0 place-items-center rounded-[0.9375rem] bg-white/20 backdrop-blur-sm">
            <Icon3D name={kindIcon(shop.kind)} size={30} />
          </span>
          <span className="min-w-0 flex-1 truncate text-[1.125rem] font-bold leading-tight">{shop.name}</span>
          <span className="num shrink-0 leading-none">
            <span className="text-[2rem] font-bold">{done}</span>
            <span className="text-[1rem] font-semibold text-white/70">/{goal}</span>
          </span>
        </div>

        {!small && (
          <>
            <div className="mt-5 grid gap-2" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }}>
              {Array.from({ length: goal }, (_, i) => {
                const on = i < done;
                const last = i === goal - 1;
                const landing = fresh && i === done - 1;
                return on ? (
                  <span
                    key={i}
                    className={`grid aspect-square place-items-center rounded-full bg-white shadow-[0_3px_8px_rgb(0_0_0/0.18)] ${landing ? "pass-land" : ""}`}
                    style={{ color: shop.color, animationDelay: landing ? "380ms" : undefined }}
                  >
                    {last ? <Gift className="size-[52%]" strokeWidth={2.4} /> : <Check className="size-[52%]" strokeWidth={3.2} />}
                  </span>
                ) : (
                  <span key={i} className="grid aspect-square place-items-center rounded-full border-2 border-dashed border-white/45 bg-white/[0.07] text-white/70">
                    {last && <Gift className="size-[46%]" />}
                  </span>
                );
              })}
            </div>

            {shop.gift && (
              <div className="mt-4 flex items-center gap-2 rounded-2xl bg-white/[0.16] px-3.5 py-2.5 text-[0.9062rem] font-semibold">
                <Gift className="size-[1.125rem] shrink-0" />
                <span className="min-w-0 flex-1 truncate">{ready ? fill(t.won, { gift: shop.gift }) : left === 1 ? fill(t.toGoOne, { gift: shop.gift }) : fill(t.toGo, { n: left, gift: shop.gift })}</span>
              </div>
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
