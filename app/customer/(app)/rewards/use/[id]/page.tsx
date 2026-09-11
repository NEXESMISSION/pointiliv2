import { notFound } from "next/navigation";
import { RedemptionScreen } from "@/components/customer/RedemptionScreen";
import { rpc } from "@/lib/session";
import type { RedemptionStatus } from "@/lib/types";

export const metadata = { title: "Use reward" };

export default async function UseReward({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const status = await rpc<RedemptionStatus | null>("redemption_status", { p_id: id });
  if (!status) notFound();
  return <RedemptionScreen initial={status} />;
}
