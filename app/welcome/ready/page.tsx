import { redirect } from "next/navigation";
import { QrCode } from "lucide-react";
import { Confetti } from "@/components/Confetti";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { WelcomeSteps } from "@/components/merchant/Welcome";
import { LinkButton } from "@/components/ui/Button";
import { resolveDesign } from "@/lib/card-design";
import { getI18n } from "@/lib/i18n/server";
import { requireMerchant } from "@/lib/session";

export async function generateMetadata() {
  const { t } = await getI18n();
  return { title: t.merchant.welcome.readyTitle };
}

/** Step three: the card as a customer will see it, and the one thing to do next — show the QR. */
export default async function WelcomeReadyPage() {
  const [ctx, { t }] = await Promise.all([requireMerchant("/welcome/ready"), getI18n()]);
  const card = ctx.card;
  if (!card) redirect("/loyalty?welcome=1");
  const w = t.merchant.welcome;
  const design = resolveDesign(card.design, { color: card.color, icon: card.icon });

  return (
    <div className="animate-fade space-y-4 text-center">
      <Confetti count={40} />
      <WelcomeSteps step={3} />
      <div>
        <h1 className="text-[1.35rem] font-semibold leading-tight tracking-tight text-ink">{w.readyTitle}</h1>
        <p className="mx-auto mt-1.5 max-w-xs text-sm leading-relaxed text-muted">{w.readyBody}</p>
      </div>
      <LoyaltyCardVisual
        design={design}
        business={{ name: ctx.business.name, logo_url: ctx.business.logo_url, cover_url: ctx.business.cover_url }}
        subtitle={card.description}
        filled={Math.max(1, Math.round(card.stamps_required * 0.4))}
        total={card.stamps_required}
        levels={card.levels.map((l) => l.stamps)}
        rewardName={card.reward?.name}
        className="text-start"
      />
      <div className="space-y-2">
        <LinkButton href="/qr" block icon={<QrCode className="size-5" />}>
          {w.showQr}
        </LinkButton>
        <LinkButton href="/dashboard" variant="outline" block>
          {w.toDashboard}
        </LinkButton>
      </div>
    </div>
  );
}
