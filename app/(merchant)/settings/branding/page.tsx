import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { BrandingEditor } from "@/components/merchant/BrandingEditor";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.settings.branding };
}

/** The logo and the cover: two pictures, nothing to type. */
export default async function BrandingPage() {
  const { t } = await getI18n();
  const ctx = await requireMerchant("/settings/branding");
  const b = ctx.business;
  return (
    <div className="mx-auto w-full max-w-md">
      <TopBar title={t.ops.settings.branding} back="/settings" />
      <Card className="p-3.5">
        <BrandingEditor bare logo={b.logo_url} cover={b.cover_url} icon={ctx.card?.icon} color={ctx.card?.color} disabled={ctx.member_role !== "owner"} />
      </Card>
    </div>
  );
}
