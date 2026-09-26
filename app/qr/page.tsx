import { redirect } from "next/navigation";
import { MerchantQr } from "@/components/merchant/MerchantQr";
import { currentSystem, requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.qr.title, robots: { index: false } };
}

export default async function QrPage() {
  const [ctx, system] = await Promise.all([requireMerchant("/qr"), currentSystem()]);
  /* A salle has no loyalty card and never will, so "go and make one" is the
     wrong answer for it — that redirect is only for a shop whose ONLY system
     is Fidélité and which has not set its card up yet. */
  const abonili = system === "abonili" || Boolean(ctx.systems?.memberships && !ctx.systems?.loyalty);
  if (!abonili && !ctx.card) redirect("/loyalty?welcome=1&from=qr");
  return (
    <MerchantQr
      businessName={ctx.business.name}
      logo={ctx.business.logo_url}
      icon={ctx.card?.icon ?? "coffee"}
      color={ctx.card?.color ?? "indigo"}
      abonili={abonili}
    />
  );
}
