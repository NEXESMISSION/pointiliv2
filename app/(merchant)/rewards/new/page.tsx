import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { RewardForm } from "@/components/merchant/RewardForm";
import { requireMerchant } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.rewardForm.addTitle };
}

export default async function NewRewardPage() {
  const [ctx, { t }] = await Promise.all([requireMerchant("/rewards/new"), getI18n()]);
  if (!ctx.card) redirect("/loyalty");
  if (ctx.member_role !== "owner") redirect("/rewards");
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title={t.merchant.rewardForm.addTitle} back="/rewards" />
      <RewardForm initial={{ name: "", description: "", stamps_required: Math.min(100, ctx.card.stamps_required + 5), active: true, is_primary: false }} />
    </div>
  );
}
