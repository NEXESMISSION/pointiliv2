import { QrScanner } from "@/components/scan/QrScanner";

export const metadata = { title: "Scan QR", robots: { index: false } };

export default function ScanQrPage() {
  return <QrScanner />;
}
