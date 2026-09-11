import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { LoyaltyCardForm } from "@/components/merchant/LoyaltyCardForm";
import { requireMerchant, rpc } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import type { CardImpact } from "@/lib/types";

export const metadata = { title: "Loyalty card" };

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireMerchant("/loyalty");
  const card = ctx.card;
  const [{ welcome }, impact] = await Promise.all([searchParams, card ? rpc<CardImpact>("merchant_card_impact") : Promise.resolve(null)]);
  const category = ctx.business.category as keyof typeof CATEGORIES;
  const isOwner = ctx.member_role === "owner";
  const midCard = impact?.progress.reduce((a, r) => a + r.n, 0) ?? 0;

  return (
    <div className="mx-auto max-w-5xl">
      <TopBar title={card ? "Loyalty card" : "Create loyalty card"} back="/dashboard" />

      {welcome && !card && (
        <Alert tone="success" title={`Welcome to Pointidi, ${ctx.business.name}! 🎉`} className="mb-5">
          Let&apos;s create your loyalty card. The preview shows exactly what your customers will see.
        </Alert>
      )}

      {impact && impact.customers > 0 && (
        <div className="mb-5 flex items-center gap-2.5 rounded-2xl bg-success-50 px-4 py-3 text-sm font-medium text-success-600" role="status">
          <span className="relative flex size-2.5 shrink-0">
            <span className="absolute inline-flex size-full animate-ping rounded-full bg-success-500 opacity-60" />
            <span className="relative inline-flex size-2.5 rounded-full bg-success-500" />
          </span>
          Your card is live · {impact.customers} customer{impact.customers > 1 ? "s" : ""}
          {midCard > 0 ? ` · ${midCard} collecting now` : ""}
        </div>
      )}

      {!isOwner && (
        <Alert tone="info" className="mb-5">
          Only the business owner can change the loyalty card.
        </Alert>
      )}

      <LoyaltyCardForm
        business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url, category: ctx.business.category, address: ctx.business.address }}
        disabled={!isOwner}
        isNew={!card}
        impact={impact}
        branding={<BrandingEditor logo={ctx.business.logo_url} cover={ctx.business.cover_url} icon={card?.icon ?? CATEGORIES[category]?.icon} color={card?.color ?? "emerald"} disabled={!isOwner} />}
        initial={{
          name: card?.name ?? `${ctx.business.name} Loyalty`,
          description: card?.description ?? "",
          stamps_required: card?.stamps_required ?? 10,
          reward_name: card?.reward?.name ?? "",
          reward_description: card?.reward?.description ?? "",
          color: card?.color ?? "emerald",
          icon: card?.icon ?? CATEGORIES[category]?.icon ?? "coffee",
          cooldown_minutes: card?.cooldown_minutes ?? 60,
        }}
      />
    </div>
  );
}
