import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { BusinessForm } from "@/components/merchant/SettingsForms";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.settings.shopInfo };
}

/** The shop's own details, on a screen with nothing else competing for room. */
export default async function ShopInfoPage() {
  const { t } = await getI18n();
  const ctx = await requireMerchant("/settings/shop");
  return (
    <div className="mx-auto w-full max-w-md">
      <TopBar title={t.ops.settings.shopInfo} back="/settings" />
      <Card className="p-3.5">
        <BusinessForm business={ctx.business} disabled={ctx.member_role !== "owner"} />
      </Card>
    </div>
  );
}
