import Link from "next/link";
import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { Alert } from "@/components/ui/Alert";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { CardDesigner } from "@/components/merchant/CardDesigner";
import { requireMerchant } from "@/lib/session";
import { resolveDesign } from "@/lib/card-design";

export const metadata = { title: "Design your card" };

export default async function DesignPage({ searchParams }: { searchParams: Promise<{ welcome?: string }> }) {
  const ctx = await requireMerchant("/loyalty/design");
  if (!ctx.card) redirect("/loyalty?welcome=1");
  const { welcome } = await searchParams;
  const isOwner = ctx.member_role === "owner";
  const design = resolveDesign(ctx.card.design, { color: ctx.card.color, icon: ctx.card.icon });

  return (
    <div className="mx-auto max-w-5xl">
      <TopBar title="Design your card" back="/loyalty" subtitle="Make it look like your shop" />
      {welcome && (
        <Alert
          tone="success"
          title="Your card is ready — now make it yours ✨"
          className="mb-5"
          action={
            <Link href="/dashboard?ready=1" className="font-semibold underline">
              Skip for now
            </Link>
          }
        >
          Pick a style and your colours. This is exactly what customers see on their phone.
        </Alert>
      )}
      {!isOwner && (
        <Alert tone="info" className="mb-5">
          Only the business owner can change the card design.
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
        branding={<BrandingEditor logo={ctx.business.logo_url} cover={ctx.business.cover_url} icon={design.icon} color={ctx.card.color} disabled={!isOwner} />}
      />
    </div>
  );
}
