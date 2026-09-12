import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { RewardForm } from "@/components/merchant/RewardForm";
import { requireMerchant, rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.rewardForm.editTitle };
}

type Reward = { id: string; name: string; description: string | null; stamps_required: number; is_primary: boolean; active: boolean };

export default async function EditRewardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [ctx, { t }] = await Promise.all([requireMerchant("/rewards"), getI18n()]);
  if (ctx.member_role !== "owner") redirect("/rewards");
  const data = await rpc<{ items: Reward[] }>("merchant_rewards");
  const reward = data.items.find((r) => r.id === id);
  if (!reward) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title={t.merchant.rewardForm.editTitle} back="/rewards" />
      <RewardForm initial={{ ...reward, description: reward.description ?? "" }} />
    </div>
  );
}
