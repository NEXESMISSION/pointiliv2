import type { Metadata } from "next";
import { QrScanner } from "@/components/scan/QrScanner";
import { getI18n } from "@/lib/i18n/server";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.scan.titles.camera, robots: { index: false } };
}

export default function ScanQrPage() {
  return <QrScanner />;
}
