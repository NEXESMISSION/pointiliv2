import Link from "next/link";
import { Palette } from "lucide-react";
import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { LoyaltyCardForm } from "@/components/merchant/LoyaltyCardForm";
import { requireMerchant, rpc } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import { resolveDesign } from "@/lib/card-design";
import { getI18n } from "@/lib/i18n/server";
import type { CardImpact } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.card };
}

export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [ctx, { t, count, fill }] = await Promise.all([requireMerchant("/loyalty"), getI18n()]);
  const card = ctx.card;
  const [{ welcome }, impact] = await Promise.all([searchParams, card ? rpc<CardImpact>("merchant_card_impact") : Promise.resolve(null)]);
  const category = ctx.business.category as keyof typeof CATEGORIES;
  const isOwner = ctx.member_role === "owner";
  const icon = card?.icon ?? CATEGORIES[category]?.icon ?? "coffee";
  const color = card?.color ?? "emerald";

  return (
    <div className="mx-auto max-w-5xl">
      <TopBar
        title={card ? t.merchant.loyalty.yourCard : t.merchant.loyalty.createTitle}
        back={card ? "/more" : "/dashboard"}
        subtitle={impact && impact.customers > 0 ? fill(t.merchant.loyalty.live, { customers: count(t.common.customersCount, impact.customers) }) : undefined}
      />

      {welcome && !card && (
        <Alert tone="info" className="mb-3">
          {t.merchant.loyalty.welcome}
        </Alert>
      )}

      {!isOwner && (
        <Alert tone="info" className="mb-3">
          {t.merchant.loyalty.ownerOnly}
        </Alert>
      )}

      <LoyaltyCardForm
        business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url, category: ctx.business.category }}
        design={resolveDesign(card?.design, { color, icon })}
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
          icon,
          cooldown_minutes: card?.cooldown_minutes ?? 60,
        }}
      />

      {card && (
        <div className="mt-2 flex flex-wrap items-center justify-center gap-x-4 gap-y-1 text-[13px] font-semibold text-brand-600">
          <Link href="/loyalty/design" className="inline-flex items-center gap-1.5">
            <Palette className="size-4" /> {t.merchant.loyalty.changeLook}
          </Link>
          {isOwner && <Link href="/rewards">{t.merchant.loyalty.addBigger}</Link>}
        </div>
      )}
    </div>
  );
}
