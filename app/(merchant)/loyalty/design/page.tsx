import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { CardDesigner } from "@/components/merchant/CardDesigner";
import { requireMerchant } from "@/lib/session";
import { resolveDesign } from "@/lib/card-design";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.design.title };
}

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const [ctx, { t }] = await Promise.all([requireMerchant("/loyalty/design"), getI18n()]);
  if (!ctx.card) redirect("/loyalty?welcome=1");
  const { welcome } = await searchParams;
  const isOwner = ctx.member_role === "owner";
  const design = resolveDesign(ctx.card.design, { color: ctx.card.color, icon: ctx.card.icon });

  return (
    <div className="mx-auto max-w-5xl">
      <TopBar title={t.merchant.design.title} back="/loyalty" subtitle={t.merchant.design.subtitle} />
      {welcome && (
        <Alert
          tone="success"
          title={t.merchant.design.welcomeTitle}
          className="mb-2.5"
          action={
            <Link href="/dashboard?ready=1" className="font-semibold underline">
              {t.merchant.design.skipForNow}
            </Link>
          }
        >
          {t.merchant.design.welcomeBody}
        </Alert>
      )}
      {!isOwner && (
        <Alert tone="info" className="mb-2.5">
          {t.merchant.design.ownerOnly}
        </Alert>
      )}
      <CardDesigner
        initial={design}
        description={ctx.card.description ?? ""}
        business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url }}
        stampsRequired={ctx.card.stamps_required}
        rewardName={ctx.card.reward?.name ?? ""}
        welcome={!!welcome}
        disabled={!isOwner}
        branding={<BrandingEditor bare logo={ctx.business.logo_url} cover={ctx.business.cover_url} icon={design.icon} color={ctx.card.color} disabled={!isOwner} />}
      />
    </div>
  );
}
