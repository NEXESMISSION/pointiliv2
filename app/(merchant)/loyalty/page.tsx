import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { CardStudio } from "@/components/merchant/CardStudio";
import { WelcomeSteps } from "@/components/merchant/Welcome";
import { requireMerchant, rpc } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import { resolveDesign } from "@/lib/card-design";
import { getI18n } from "@/lib/i18n/server";
import type { CardImpact } from "@/lib/types";

const isOwnerOf = (role: string | null) => role === "owner";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.card };
}

/** One page for the whole card: creating it, changing it, and how it looks. */
export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ welcome?: string; from?: string }> }) {
  const [ctx, { t, count, fill }] = await Promise.all([requireMerchant("/loyalty"), getI18n()]);
  const card = ctx.card;
  const [{ from, welcome }, impact] = await Promise.all([searchParams, card ? rpc<CardImpact>("merchant_card_impact") : Promise.resolve(null)]);
  // step two of the owner's first sign-in: the steps stay in view, "back" returns to step one
  const inWelcome = !card && welcome === "1" && isOwnerOf(ctx.member_role);
  const category = ctx.business.category as keyof typeof CATEGORIES;
  const isOwner = ctx.member_role === "owner";
  const icon = card?.icon ?? CATEGORIES[category]?.icon ?? "coffee";
  const color = card?.color ?? "indigo";
  const design = resolveDesign(card?.design, { color, icon });

  return (
    <div className="mx-auto max-w-5xl">
      {inWelcome && (
        <div className="mb-2">
          <WelcomeSteps step={2} />
        </div>
      )}
      <TopBar
        title={card ? t.merchant.loyalty.yourCard : t.merchant.loyalty.createTitle}
        back={card ? "/more" : inWelcome ? "/welcome" : "/dashboard"}
        subtitle={impact && impact.customers > 0 ? fill(t.merchant.loyalty.live, { customers: count(t.common.customersCount, impact.customers) }) : undefined}
      />

      {/* Sent here by the QR screen: say why, once. A first visit needs no banner, the title says it all. */}
      {from === "qr" && !card && (
        <Alert tone="info" className="mb-3">
          {t.merchant.loyalty.needCardForQr}
        </Alert>
      )}

      {!isOwner && (
        <Alert tone="info" className="mb-3">
          {t.merchant.loyalty.ownerOnly}
        </Alert>
      )}

      <CardStudio
        business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url, category: ctx.business.category }}
        design={design}
        disabled={!isOwner}
        isNew={!card}
        impact={impact}
        initial={{
          name: card?.name ?? fill(t.merchant.loyalty.defaultName, { name: ctx.business.name }),
          description: card?.description ?? "",
          stamps_required: card?.stamps_required ?? 10,
          reward_name: card?.reward?.name ?? "",
          reward_description: card?.reward?.description ?? "",
          color,
          cooldown_minutes: card?.cooldown_minutes ?? 60,
          valid_days: card?.valid_days ?? 0,
          levels: card?.levels ?? [],
        }}
        branding={<BrandingEditor bare logo={ctx.business.logo_url} cover={ctx.business.cover_url} icon={icon} color={color} disabled={!isOwner} />}
      />

    </div>
  );
}
