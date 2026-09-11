import { redirect } from "next/navigation";
import { TopBar } from "@/components/nav/TopBar";
import { RewardForm } from "@/components/merchant/RewardForm";
import { requireMerchant } from "@/lib/session";

export const metadata = { title: "Add reward" };

export default async function NewRewardPage() {
  const ctx = await requireMerchant("/rewards/new");
  if (!ctx.card) redirect("/loyalty");
  if (ctx.member_role !== "owner") redirect("/rewards");
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title="Add reward" back="/rewards" />
      <RewardForm initial={{ name: "", description: "", stamps_required: Math.min(100, ctx.card.stamps_required + 5), active: true, is_primary: false }} />
    </div>
  );
}
