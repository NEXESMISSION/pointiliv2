import QRCode from "qrcode";
import { notFound } from "next/navigation";
import { RedemptionScreen } from "@/components/customer/RedemptionScreen";
import { rpc } from "@/lib/session";
import { requestOrigin } from "@/lib/origin";
import { getI18n } from "@/lib/i18n/server";
import type { RedemptionStatus } from "@/lib/types";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.customer.use.title };
}

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
