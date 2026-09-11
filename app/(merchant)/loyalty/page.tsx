import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { LoyaltyCardForm } from "@/components/merchant/LoyaltyCardForm";
import { requireMerchant } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";

export const metadata = { title: "Loyalty card" };

const REWARD_IDEAS: Record<string, string> = {
  cafe: "Free Coffee",
  restaurant: "Free Dessert",
  fast_food: "Free Sandwich",
  pizzeria: "Free Pizza",
  bakery: "Free Croissant",
  ice_cream: "Free Ice Cream",
  salon: "Free Haircut",
  beauty: "Free Manicure",
  retail: "10% Discount",
  other: "Free Gift",
};

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireMerchant("/loyalty");
  const { welcome } = await searchParams;
  const card = ctx.card;
  const category = ctx.business.category as keyof typeof CATEGORIES;
  const isOwner = ctx.member_role === "owner";

  return (
    <div className="mx-auto max-w-3xl">
      <TopBar title={card ? "Loyalty card" : "Create loyalty card"} back="/dashboard" />
      {welcome && !card && (
        <Alert tone="success" title={`Welcome to Pointidi, ${ctx.business.name}! 🎉`} className="mb-5">
          Let&apos;s create your loyalty card. Your customers will see exactly this.
        </Alert>
      )}
      {!isOwner && <Alert tone="info" className="mb-5">Only the business owner can change the loyalty card.</Alert>}
      <LoyaltyCardForm
        businessName={ctx.business.name}
        logo={ctx.business.logo_url}
        disabled={!isOwner}
        initial={{
          name: card?.name ?? `${ctx.business.name} Loyalty`,
          description: card?.description ?? "",
          stamps_required: card?.stamps_required ?? 10,
          reward_name: card?.reward?.name ?? REWARD_IDEAS[category] ?? "Free Gift",
          reward_description: card?.reward?.description ?? "",
          color: card?.color ?? "emerald",
          icon: card?.icon ?? CATEGORIES[category]?.icon ?? "coffee",
          cooldown_minutes: card?.cooldown_minutes ?? 60,
        }}
        isNew={!card}
      />
    </div>
  );
}
