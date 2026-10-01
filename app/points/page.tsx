import { redirect } from "next/navigation";
import { PointsCounter } from "@/components/merchant/PointsCounter";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.points.add, robots: { index: false } };
}

/** The counter of a points shop: what was paid → a QR for that purchase. */
export default async function PointsPage() {
  const ctx = await requireMerchant("/points");
  if (!ctx.card) redirect("/loyalty?welcome=1&from=qr");
  if (ctx.card.system !== "points") redirect("/qr");
  return <PointsCounter businessName={ctx.business.name} logo={ctx.business.logo_url} icon={ctx.card.icon} color={ctx.card.color} rate={Number(ctx.card.dinars_per_point) || 1} />;
}
