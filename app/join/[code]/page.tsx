import type { Metadata } from "next";
import { redirect } from "next/navigation";
import { Check, Store, X } from "lucide-react";
import { BackButton } from "@/components/nav/BackButton";
import { Logo } from "@/components/Logo";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { resolveDesign, type CardDesign } from "@/lib/card-design";
import { getI18n } from "@/lib/i18n/server";
import { getContext } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { JOIN_CODE_RE } from "@/lib/url";

export const dynamic = "force-dynamic";

export async function generateMetadata(): Promise<Metadata> {
  const { t } = await getI18n();
  return { title: t.scan.titles.join, robots: { index: false, follow: false } };
}

type Preview =
  | {
      ok: true;
      open: boolean;
      business: { name: string; logo_url: string | null; cover_url: string | null; category: string; address: string | null };
      card: { name: string; description: string | null; stamps_required: number; color: string; icon: string; design: Partial<CardDesign> | null };
      reward: { name: string; description: string | null } | null;
    }
  | { ok: false; error: string; business?: { name: string } };

/**
 * The printed counter QR lands here. It only ever adds the card (0 stamps):
 *  · signed in  → add or find the card, open it.
 *  · signed out → show the card, then create an account / log in and come back.
 */
export default async function JoinPage({ params }: { params: Promise<{ code: string }> }) {
  const { code } = await params;
  if (!JOIN_CODE_RE.test(code)) return <JoinError code="invalid" />;

  const ctx = await getContext();
  if (ctx) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("join_card", { p_code: code });
    const res = data as { ok: boolean; customer_id?: string; created?: boolean; error?: string } | null;
    if (!error && res?.ok) redirect(`/customer/cards/${res.customer_id}${res.created ? "?joined=1" : ""}`);
    return <JoinError code={error ? "network" : (res?.error ?? "network")} />;
  }

  const { data, error } = await createAdminClient().rpc("join_card_preview", { p_code: code });
  const preview = (error ? { ok: false, error: "network" } : data) as Preview;
  if (!preview.ok) return <JoinError code={preview.error} businessName={preview.business?.name} />;

  const { t, count, fill } = await getI18n();
  const { business, card, reward } = preview;
  const design = resolveDesign(card.design, { color: card.color, icon: card.icon });
  const next = encodeURIComponent(`/join/${code}`);
  const perks = [t.scan.join.perkFree, t.scan.join.perkNoApp, t.scan.join.perkScan];

  return (
    <Shell>
      <h1 className="mt-4 text-center text-[1.6rem] font-semibold leading-tight tracking-[-0.025em] text-ink">
        {t.scan.join.heading}
        <br />
        {business.name}
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-[15px] leading-relaxed text-muted">
        {reward ? (
          <>
            {fill(t.scan.join.rewardLine, { stamps: count(t.common.stampsCount, card.stamps_required) })} <span className="font-medium text-ink">{reward.name}</span>.
          </>
        ) : (
          t.scan.join.noRewardLine
        )}
      </p>

      <div className="mt-5">
        <LoyaltyCardVisual design={design} business={business} subtitle={card.description} filled={0} total={card.stamps_required} rewardName={reward?.name} />
      </div>

      {!preview.open && (
        <Alert tone="warning" className="mt-5">
          {t.scan.join.paused}
        </Alert>
      )}

      <ul className="mt-5 space-y-2 text-[15px] text-body">
        {perks.map((perk) => (
          <li key={perk} className="flex items-center gap-2.5">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success-50 text-success-600">
              <Check className="size-3" strokeWidth={3.5} />
            </span>
            {perk}
          </li>
        ))}
      </ul>

      <div className="space-y-2 pt-6">
        <LinkButton href={`/customer/register?next=${next}`} block>
          {t.scan.join.getCard}
        </LinkButton>
        <LinkButton href={`/customer/login?next=${next}`} variant="outline" block>
          {t.scan.haveAccount}
        </LinkButton>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex h-dvh w-full max-w-md flex-col justify-center overflow-hidden bg-white px-6 pb-[calc(1rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:my-10 sm:h-auto sm:overflow-visible sm:rounded-3xl sm:border sm:border-line sm:shadow-card">
      <div className="grid h-10 shrink-0 grid-cols-[2.5rem_1fr_2.5rem] items-center">
        <BackButton fallback="/customer" className="-ms-2" />
        <span className="justify-self-center">
          <Logo size={22} />
        </span>
      </div>
      {children}
    </main>
  );
}

async function JoinError({ code, businessName }: { code: string; businessName?: string }) {
  const { t, msg } = await getI18n();
  const own = code === "own_business";
  return (
    <Shell>
      <div className="flex flex-col items-center pt-6 text-center">
        <div className={`grid size-20 place-items-center rounded-full ${own ? "bg-brand-50 text-brand-600" : "bg-danger-50 text-danger-600"}`}>{own ? <Store className="size-9" /> : <X className="size-9" />}</div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">{own ? t.scan.join.ownTitle : t.scan.join.errorTitle}</h1>
        {businessName && <p className="mt-1 font-medium text-body">{businessName}</p>}
        <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">{own ? t.scan.join.ownBody : msg(code === "invalid" ? "invalid" : code)}</p>
        <div className="w-full space-y-2 pt-8">
          {own ? (
            <LinkButton href="/dashboard" block>
              {t.scan.join.backToDashboard}
            </LinkButton>
          ) : (
            <LinkButton href="/customer" block>
              {t.scan.goToCards}
            </LinkButton>
          )}
        </div>
      </div>
    </Shell>
  );
}
