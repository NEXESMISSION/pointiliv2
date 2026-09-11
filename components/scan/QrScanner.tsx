"use client";

import { useRouter } from "next/navigation";
import { joinCodeFromScan, rewardCodeFromScan, tokenFromScan } from "@/lib/url";
import { CameraScanner } from "./CameraScanner";

/** Customer: scan the business's stamp QR. */
export function QrScanner() {
  const router = useRouter();
  return (
    <CameraScanner
      title="Scan QR"
      backHref="/customer"
      hint="Point your camera at the business QR code"
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
        if (rewardCodeFromScan(text)) return "That's a reward QR — the staff scans it.";
        return "That isn't a Pointili QR code.";
      }}
    />
  );
}
