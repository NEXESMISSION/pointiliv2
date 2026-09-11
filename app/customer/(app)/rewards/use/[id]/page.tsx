import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { RedemptionScreen } from "@/components/customer/RedemptionScreen";
import { rpc } from "@/lib/session";
import { requestOrigin } from "@/lib/origin";
import type { RedemptionStatus } from "@/lib/types";

export const metadata = { title: "Use reward" };

export default async function UseReward({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[0-9a-f-]{36}$/i.test(id)) notFound();
  const status = await rpc<RedemptionStatus | null>("redemption_status", { p_id: id });
  if (!status) notFound();

  // The staff scans this with the Redeem page (or any camera: it opens /redeem ready to confirm).
  const qrSvg = await QRCode.toString(`${await requestOrigin()}/redeem?code=${status.code}`, {
    type: "svg",
    margin: 0,
    errorCorrectionLevel: "M",
    color: { dark: "#0F1222", light: "#FFFFFF" },
  });
  return <RedemptionScreen initial={status} qrSvg={qrSvg} />;
}
