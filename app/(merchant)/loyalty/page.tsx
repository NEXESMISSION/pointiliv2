import Link from "next/link";
import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { LoyaltyCardForm } from "@/components/merchant/LoyaltyCardForm";
import { requireMerchant, rpc } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import { resolveDesign } from "@/lib/card-design";
import type { CardImpact } from "@/lib/types";

export const metadata = { title: "Loyalty card" };

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireMerchant("/loyalty");
  const card = ctx.card;
  const [{ welcome }, impact] = await Promise.all([searchParams, card ? rpc<CardImpact>("merchant_card_impact") : Promise.resolve(null)]);
  const category = ctx.business.category as keyof typeof CATEGORIES;
  const isOwner = ctx.member_role === "owner";
  const icon = card?.icon ?? CATEGORIES[category]?.icon ?? "coffee";
  const color = card?.color ?? "emerald";

  return (
    <div className="mx-auto max-w-5xl">
      <TopBar title={card ? "Your card" : "Create your card"} back={card ? "/more" : "/dashboard"} subtitle={impact && impact.customers > 0 ? `Live · ${impact.customers} customer${impact.customers > 1 ? "s" : ""}` : undefined} />

      {welcome && !card && (
        <Alert tone="info" className="mb-4">
          Two questions and your card is ready.
        </Alert>
      )}

      {!isOwner && (
        <Alert tone="info" className="mb-4">
          Only the owner can change the card.
        </Alert>
      )}

      <LoyaltyCardForm
        business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url, category: ctx.business.category }}
        design={resolveDesign(card?.design, { color, icon })}
        disabled={!isOwner}
        isNew={!card}
        impact={impact}
        initial={{
          name: card?.name ?? `${ctx.business.name} Loyalty`,
          description: card?.description ?? "",
          stamps_required: card?.stamps_required ?? 10,
          reward_name: card?.reward?.name ?? "",
          reward_description: card?.reward?.description ?? "",
          color,
          icon,
          cooldown_minutes: card?.cooldown_minutes ?? 60,
        }}
      />

      {card && isOwner && (
        <p className="mt-5 text-center">
          <Link href="/rewards" className="text-[13px] font-semibold text-brand-600">
            Add a second, bigger reward
          </Link>
        </p>
      )}
    </div>
  );
}
