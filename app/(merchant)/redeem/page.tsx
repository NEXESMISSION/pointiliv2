import { TopBar } from "@/components/nav/TopBar";
import { Card } from "@/components/ui/Card";
import { RedeemConsole } from "@/components/merchant/RedeemConsole";
import { rpc } from "@/lib/session";
import type { RedemptionView } from "@/lib/types";

export const metadata = { title: "Redeem reward" };

const STEPS = [
  { title: "The card fills up", text: "When a customer reaches the stamps you set, “Reward unlocked 🎉” appears on their phone." },
  { title: "They tap “Use reward” at your counter", text: "A 6-digit code shows on their phone — and appears here under “Waiting at the counter” within seconds." },
  { title: "You check the code and confirm", text: "Give them the reward. The stamps are used and their card starts again; extra stamps carry over." },
];

export default async function RedeemPage() {
  const pending = await rpc<RedemptionView[]>("merchant_pending_redemptions");
  return (
    <div className="mx-auto max-w-xl">
      <TopBar title="Redeem reward" back="/dashboard" subtitle="Give a customer the reward they earned." />
      <RedeemConsole initialPending={pending} />

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
          Nothing is spent until <b>you</b> confirm, so a reward can&apos;t be used from home or used twice. No phone? Open the customer in <b>Customers</b> and tap <b>Redeem</b>.
        </p>
      </Card>
    </div>
  );
}
