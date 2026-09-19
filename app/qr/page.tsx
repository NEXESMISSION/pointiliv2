import { redirect } from "next/navigation";
import { MerchantQr } from "@/components/merchant/MerchantQr";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.qr.title, robots: { index: false } };
}

export default async function QrPage() {
  const ctx = await requireMerchant("/qr");
  if (!ctx.card) redirect("/loyalty?welcome=1");
  return <MerchantQr businessName={ctx.business.name} logo={ctx.business.logo_url} icon={ctx.card.icon} color={ctx.card.color} />;
}
