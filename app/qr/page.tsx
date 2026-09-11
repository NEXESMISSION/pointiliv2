import { redirect } from "next/navigation";
import { MerchantQr } from "@/components/merchant/MerchantQr";
import { requireMerchant } from "@/lib/session";

export const metadata = { title: "QR code", robots: { index: false } };

export default async function QrPage() {
  const ctx = await requireMerchant("/qr");
  if (!ctx.card) redirect("/loyalty?welcome=1");
  return <MerchantQr businessName={ctx.business.name} logo={ctx.business.logo_url} cover={ctx.business.cover_url} icon={ctx.card.icon} color={ctx.card.color} />;
}
