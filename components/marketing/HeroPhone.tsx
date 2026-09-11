import { Check, Gift } from "lucide-react";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { TEMPLATES, type CardDesign } from "@/lib/card-design";

const bold: CardDesign = { template: "bold", stamp: "icon", icon: "coffee", ...(TEMPLATES.bold.make("#6535E0") as Omit<CardDesign, "template" | "stamp" | "icon">) };
const midnight: CardDesign = { template: "midnight", stamp: "star", icon: "scissors", ...(TEMPLATES.midnight.make("#111827") as Omit<CardDesign, "template" | "stamp" | "icon">) };

/** Hero: a phone showing real Pointili cards (the same component customers see). */
export function HeroPhone() {
  return (
    <div className="relative mx-auto w-full max-w-[20rem]">
      <div
        role="img"
        aria-label="The Pointili app on a phone: Café Bonheur card with 6 of 10 stamps"
        className="relative rounded-[2.6rem] border border-line bg-white p-2.5 shadow-lift"
      >
        <div className="overflow-hidden rounded-[2.1rem] bg-canvas px-3 pb-4 pt-8">
          <div aria-hidden className="absolute left-1/2 top-4 h-5 w-20 -translate-x-1/2 rounded-full bg-ink/90" />
          <p className="text-center text-xs font-medium text-muted">Your loyalty cards</p>
          <div className="mt-3 space-y-3">
            <LoyaltyCardVisual size="tile" design={bold} business={{ name: "Café Bonheur", logo_url: null }} subtitle="Coffee & more" filled={6} total={10} rewardName="Free coffee" />
            <LoyaltyCardVisual size="tile" design={midnight} business={{ name: "Salon Yasmine", logo_url: null }} subtitle="Hair & beauty" filled={3} total={8} rewardName="Free haircut" />
          </div>
        </div>
      </div>

      <div aria-hidden className="absolute -right-3 top-24 flex animate-pop items-center gap-2 rounded-2xl border border-line bg-white py-2 pl-2 pr-3.5 shadow-lift sm:-right-10" style={{ animationDelay: "400ms" }}>
        <span className="grid size-8 place-items-center rounded-full bg-success-500 text-white">
          <Check className="size-4" strokeWidth={3} />
        </span>
        <span className="text-[13px] font-bold text-ink">+1 stamp</span>
      </div>
      <div aria-hidden className="absolute -left-3 bottom-16 flex animate-pop items-center gap-2 rounded-2xl border border-line bg-white py-2 pl-2 pr-3.5 shadow-lift sm:-left-10" style={{ animationDelay: "700ms" }}>
        <span className="grid size-8 place-items-center rounded-full bg-brand-600 text-white">
          <Gift className="size-4" />
        </span>
        <span className="text-[13px] font-bold text-ink">Reward ready</span>
      </div>
    </div>
  );
}
