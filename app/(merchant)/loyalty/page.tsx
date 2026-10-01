import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import Link from "next/link";
import { CardStudio } from "@/components/merchant/CardStudio";
import { PointsStudio, type GiftDraft } from "@/components/merchant/PointsStudio";
import { WelcomeSteps } from "@/components/merchant/Welcome";
import { requireMerchant, rpc } from "@/lib/session";
import { CATEGORIES } from "@/lib/constants";
import { resolveDesign } from "@/lib/card-design";
import { getI18n } from "@/lib/i18n/server";
import type { CardImpact, CardSystem } from "@/lib/types";

type PointsCardData = {
  version: number;
  dinars_per_point: number;
  points_expire: boolean;
  holders: number;
  catalog: { id: string; name: string; points: number; now: number; next_points: number | null; next_at: string | null; ends_at: string | null }[];
};

const isOwnerOf = (role: string | null) => role === "owner";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.nav.merchant.card };
}

/** One page for the whole card: creating it, changing it, and how it looks. */
export default async function LoyaltyPage({ searchParams }: { searchParams: Promise<{ welcome?: string; from?: string; system?: string }> }) {
  const [ctx, { t, count, fill }] = await Promise.all([requireMerchant("/loyalty"), getI18n()]);
  const card = ctx.card;
  const sp = await searchParams;
  // a card runs the system it was made with; a new one picks (board 2: one system per shop)
  const system: CardSystem = card?.system ?? (sp.system === "points" ? "points" : "stamps");
  const [{ from, welcome }, impact, pc] = await Promise.all([
    sp,
    card && system === "stamps" ? rpc<CardImpact>("merchant_card_impact") : Promise.resolve(null),
    card && system === "points" ? rpc<PointsCardData | null>("points_card") : Promise.resolve(null),
  ]);
  // step two of the owner's first sign-in: the steps stay in view, "back" returns to step one
  const inWelcome = !card && welcome === "1" && isOwnerOf(ctx.member_role);
  const category = ctx.business.category as keyof typeof CATEGORIES;
  const isOwner = ctx.member_role === "owner";
  const icon = card?.icon ?? CATEGORIES[category]?.icon ?? "coffee";
  const color = card?.color ?? (system === "points" ? "sky" : "indigo");
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
        subtitle={
          impact && impact.customers > 0
            ? fill(t.merchant.loyalty.live, { customers: count(t.common.customersCount, impact.customers) })
            : pc && pc.holders > 0
              ? fill(t.merchant.loyalty.live, { customers: count(t.common.customersCount, pc.holders) })
              : undefined
        }
      />

      {!card && isOwner && (
        <div className="mb-3 flex items-center gap-2">
          <span className="shrink-0 text-sm font-medium text-muted">{t.points.systemQuestion}</span>
          <div className="flex flex-1 gap-1 rounded-full bg-surface p-1 shadow-card">
            {(["stamps", "points"] as const).map((s) => (
              <Link
                key={s}
                href={`/loyalty?${new URLSearchParams({ ...(welcome ? { welcome } : {}), system: s })}`}
                replace
                aria-current={system === s ? "true" : undefined}
                className={`flex h-9 flex-1 items-center justify-center rounded-full text-[13.5px] font-semibold transition ${system === s ? (s === "points" ? "bg-sea-500 text-white" : "bg-brand-600 text-white") : "text-body hover:bg-canvas"}`}
              >
                {s === "points" ? t.points.system : t.points.systemStamps}
              </Link>
            ))}
          </div>
        </div>
      )}

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

      {system === "points" ? (
        <PointsStudio
          key={card?.version ?? 0}
          business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url, category: ctx.business.category }}
          design={design}
          disabled={!isOwner}
          isNew={!card}
          version={card?.version ?? null}
          initial={{
            name: card?.name ?? fill(t.merchant.loyalty.defaultName, { name: ctx.business.name }),
            description: card?.description ?? "",
            dinars_per_point: Number(pc?.dinars_per_point ?? 1),
            points_expire: pc?.points_expire ?? false,
            catalog: pc
              ? pc.catalog.filter((g) => !g.ends_at).map((g): GiftDraft => ({ id: g.id, name: g.name, points: g.points, now: g.now, next_points: g.next_points, next_at: g.next_at }))
              : defaultGifts(t.merchant.ideas as unknown as Record<string, Record<string, string>>, ctx.business.category),
          }}
          leaving={pc ? pc.catalog.filter((g) => g.ends_at).map((g): GiftDraft => ({ id: g.id, name: g.name, points: g.points, ends_at: g.ends_at })) : []}
          branding={<BrandingEditor bare logo={ctx.business.logo_url} cover={ctx.business.cover_url} icon={icon} color={color} disabled={!isOwner} />}
        />
      ) : (
      <CardStudio
        business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url, category: ctx.business.category }}
        design={design}
        disabled={!isOwner}
        isNew={!card}
        version={card?.version ?? null}
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
      )}

    </div>
  );
}

/** A new points card starts with two gifts from the shop's kind of ideas, at 100 and 200 points. */
function defaultGifts(ideas: Record<string, Record<string, string>>, category: string): GiftDraft[] {
  const names = Object.values(ideas[category] ?? ideas.other ?? {});
  return names.slice(0, 2).map((name, i) => ({ name, points: (i + 1) * 100 }));
}
