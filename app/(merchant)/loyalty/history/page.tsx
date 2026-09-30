import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { CardHistory, type CardVersion } from "@/components/merchant/CardHistory";
import { requireMerchant, rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.loyalty.history };
}

/** Every version of the card, and the way back to any of them (board 8, K6). */
export default async function CardHistoryPage() {
  const [ctx, { t }] = await Promise.all([requireMerchant("/loyalty/history"), getI18n()]);
  // the card is the owner's (and the founder's, inside the shop): the staff only use it
  if (!ctx.card || ctx.member_role !== "owner") redirect("/loyalty");
  const history = await rpc<{ ok: boolean; live: number; items: CardVersion[] }>("card_history");

  return (
    <div className="mx-auto max-w-2xl">
      <TopBar back="/loyalty" title={t.merchant.loyalty.history} subtitle={t.merchant.loyalty.historyHint} />
      <CardHistory items={history?.items ?? []} live={history?.live ?? ctx.card.version} category={ctx.business.category} />
    </div>
  );
}
