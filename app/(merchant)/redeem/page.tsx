import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { RedeemConsole } from "@/components/merchant/RedeemConsole";
import { rpc } from "@/lib/session";
import { message } from "@/lib/messages";
import type { RedemptionView } from "@/lib/types";

export const metadata = { title: "Redeem reward" };

const STEPS = [
  { title: "The card fills up", text: "When a customer reaches the stamps you set, “Reward unlocked 🎉” appears on their phone." },
  { title: "They tap “Use reward” at your counter", text: "Their phone shows a reward QR (and a 6-digit code). It also appears here under “Waiting at the counter”." },
  { title: "Scan it and confirm", text: "Tap “Scan reward QR”, point at their phone, give the reward and confirm. Their card starts again; extra stamps carry over." },
];

export default async function RedeemPage({ searchParams }: { searchParams: Promise<{ code?: string; scan?: string }> }) {
  const { code, scan } = await searchParams;
  const digits = (code ?? "").replace(/\D/g, "");

  // Opened from the reward QR with the phone's own camera: /redeem?code=123456
  let initialFound: RedemptionView | null = null;
  let initialError: string | null = null;
  const [pending] = await Promise.all([rpc<RedemptionView[]>("merchant_pending_redemptions")]);
  if (digits.length === 6) {
    const res = await rpc<{ ok: boolean; error?: string; redemption?: RedemptionView }>("merchant_lookup_redemption", { p_code: digits });
    if (res.ok && res.redemption) initialFound = res.redemption;
    else initialError = res.error === "not_found" || res.error === "expired" ? "This reward code is no longer active. Ask the customer to tap “Use reward” again." : message(res.error);
  }

  return (
    <div className="mx-auto max-w-xl">
      <TopBar title="Redeem reward" back="/dashboard" subtitle="Give a customer the reward they earned." />
      <RedeemConsole initialPending={pending} initialFound={initialFound} initialError={initialError} autoScan={scan === "1"} />

      <Card className="mt-6 p-5">
        <p className="font-semibold text-ink">How it works</p>
        <ol className="mt-4 space-y-4">
          {STEPS.map((s, i) => (
            <li key={s.title} className="flex gap-3">
              <span className="grid size-8 shrink-0 place-items-center rounded-full bg-brand-50 text-sm font-bold text-brand-700">{i + 1}</span>
              <span>
                <span className="block font-semibold text-ink">{s.title}</span>
                <span className="block text-sm text-muted">{s.text}</span>
              </span>
            </li>
          ))}
        </ol>
        <p className="mt-4 rounded-2xl bg-canvas p-3 text-sm text-body">
          Nothing is spent until <b>you</b> confirm, so a reward can&apos;t be used from home or used twice. Your phone&apos;s normal camera works too — the reward QR opens this page ready to confirm. No phone? Open the customer in <b>Customers</b> and tap <b>Redeem</b>.
        </p>
      </Card>
    </div>
  );
}
