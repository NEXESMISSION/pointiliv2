import { TopBar } from "@/components/nav/TopBar";
import { RedeemConsole } from "@/components/merchant/RedeemConsole";
import { rpc } from "@/lib/session";
import { message } from "@/lib/messages";
import type { RedemptionView } from "@/lib/types";

export const metadata = { title: "Give a reward" };

export default async function RedeemPage({ searchParams }: { searchParams: Promise<{ code?: string; scan?: string }> }) {
  const { code, scan } = await searchParams;
  const digits = (code ?? "").replace(/\D/g, "");

  // Opened from the reward QR with the phone's own camera: /redeem?code=123456
  let initialFound: RedemptionView | null = null;
  let initialError: string | null = null;
  const pending = await rpc<RedemptionView[]>("merchant_pending_redemptions");
  if (digits.length === 6) {
    const res = await rpc<{ ok: boolean; error?: string; redemption?: RedemptionView }>("merchant_lookup_redemption", { p_code: digits });
    if (res.ok && res.redemption) initialFound = res.redemption;
    else initialError = res.error === "not_found" || res.error === "expired" ? "This reward code is no longer active. Ask the customer to tap Use reward again." : message(res.error);
  }

  return (
    <div className="mx-auto max-w-xl">
      <TopBar title="Give a reward" back="/dashboard" subtitle="Scan the QR on the customer's phone" />
      <RedeemConsole initialPending={pending} initialFound={initialFound} initialError={initialError} autoScan={scan === "1"} />
      <p className="mt-5 text-center text-[13px] leading-relaxed text-muted">
        Nothing is taken from their card until you confirm. No phone? Open the customer in Customers and tap Redeem.
      </p>
    </div>
  );
}
