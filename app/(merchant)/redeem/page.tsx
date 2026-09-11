import { TopBar } from "@/components/nav/TopBar";
import { RedeemConsole } from "@/components/merchant/RedeemConsole";
import { rpc } from "@/lib/session";
import type { RedemptionView } from "@/lib/types";

export const metadata = { title: "Redeem reward" };

export default async function RedeemPage() {
  const pending = await rpc<RedemptionView[]>("merchant_pending_redemptions");
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title="Redeem reward" back="/dashboard" subtitle="The customer taps “Use reward” and shows you a code." />
      <RedeemConsole initialPending={pending} />
    </div>
  );
}
