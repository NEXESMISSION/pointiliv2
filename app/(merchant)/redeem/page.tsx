import type { Metadata } from "next";
import { TopBar } from "@/components/nav/TopBar";
import { RedeemConsole } from "@/components/merchant/RedeemConsole";
import { rpc } from "@/lib/session";
import { getI18n } from "@/lib/i18n/server";
import type { RedemptionView } from "@/lib/types";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.ops.redeem.title };
}

export default async function RedeemPage({ searchParams }: { searchParams: Promise<{ code?: string; scan?: string }> }) {
  const { t, msg } = await getI18n();
  const { code, scan } = await searchParams;
  const digits = (code ?? "").replace(/\D/g, "");
  const w = t.ops.redeem;

  // Opened from the reward QR with the phone's own camera: /redeem?code=123456
  let initialFound: RedemptionView | null = null;
  let initialError: string | null = null;
  const pending = await rpc<RedemptionView[]>("merchant_pending_redemptions");
  if (digits.length === 6) {
    const res = await rpc<{ ok: boolean; error?: string; redemption?: RedemptionView }>("merchant_lookup_redemption", { p_code: digits });
    if (res.ok && res.redemption) initialFound = res.redemption;
    else initialError = res.error === "not_found" || res.error === "expired" ? w.codeInactive : msg(res.error);
  }

  return (
    <div className="mx-auto w-full max-w-xl">
      <TopBar title={w.title} back="/dashboard" subtitle={w.subtitle} />
      <RedeemConsole initialPending={pending} initialFound={initialFound} initialError={initialError} autoScan={scan === "1"} />
      <p className="mt-4 text-center text-[13px] leading-relaxed text-muted">{w.footnote}</p>
    </div>
  );
}
