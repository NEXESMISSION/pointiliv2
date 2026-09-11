import { notFound, redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { RewardForm } from "@/components/merchant/RewardForm";
import { requireMerchant, rpc } from "@/lib/session";

export const metadata = { title: "Edit reward" };

type Reward = { id: string; name: string; description: string | null; stamps_required: number; is_primary: boolean; active: boolean };

export default async function EditRewardPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const ctx = await requireMerchant("/rewards");
  if (ctx.member_role !== "owner") redirect("/rewards");
  const data = await rpc<{ items: Reward[] }>("merchant_rewards");
  const reward = data.items.find((r) => r.id === id);
  if (!reward) notFound();
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title="Edit reward" back="/rewards" />
      <RewardForm initial={{ ...reward, description: reward.description ?? "" }} />
    </div>
  );
}
