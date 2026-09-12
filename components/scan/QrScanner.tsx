"use client";

import { useRouter } from "next/navigation";
import { useT } from "@/components/i18n/Provider";
import { joinCodeFromScan, rewardCodeFromScan, tokenFromScan } from "@/lib/url";
import { CameraScanner } from "./CameraScanner";

/** Customer: scan the business's stamp QR. */
export function QrScanner() {
  const router = useRouter();
  const { t } = useT();
  return (
    <CameraScanner
      title={t.scan.qr.title}
      backHref="/customer"
      hint={t.scan.qr.hint}
      onText={(text) => {
        const token = tokenFromScan(text);
        if (token) {
          router.push(`/scan/${token}`);
          return null;
        }
        const join = joinCodeFromScan(text);
        if (join) {
          router.push(`/join/${join}`);
          return null;
        }
        if (rewardCodeFromScan(text)) return t.scan.qr.rewardQr;
        return t.scan.qr.notPointili;
      }}
    />
  );
}
