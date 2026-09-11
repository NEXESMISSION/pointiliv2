import { redirect } from "next/navigation";
import { Check, Store, X } from "lucide-react";
import { BackButton } from "@/components/nav/BackButton";
import { Logo } from "@/components/Logo";
import { LoyaltyCardVisual } from "@/components/LoyaltyCardVisual";
import { Alert } from "@/components/ui/Alert";
import { LinkButton } from "@/components/ui/Button";
import { resolveDesign, type CardDesign } from "@/lib/card-design";
import { message } from "@/lib/messages";
import { getContext } from "@/lib/session";
import { createAdminClient } from "@/lib/supabase/admin";
import { createClient } from "@/lib/supabase/server";
import { JOIN_CODE_RE } from "@/lib/url";

export const dynamic = "force-dynamic";
export const metadata = { title: "Get the loyalty card", robots: { index: false, follow: false } };

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

  const { business, card, reward } = preview;
  const design = resolveDesign(card.design, { color: card.color, icon: card.icon });
  const next = encodeURIComponent(`/join/${code}`);

  return (
    <Shell>
      <h1 className="mt-8 text-center text-[1.6rem] font-semibold leading-tight tracking-[-0.025em] text-ink">
        Your card at
        <br />
        {business.name}
      </h1>
      <p className="mx-auto mt-2 max-w-xs text-center text-[15px] leading-relaxed text-muted">
        {reward ? (
          <>
            Collect {card.stamps_required} stamps, get <span className="font-medium text-ink">{reward.name}</span>.
          </>
        ) : (
          "Collect stamps on every visit and earn rewards."
        )}
      </p>

      <div className="mt-7">
        <LoyaltyCardVisual design={design} business={business} subtitle={card.description} filled={0} total={card.stamps_required} rewardName={reward?.name} />
      </div>

      {!preview.open && (
        <Alert tone="warning" className="mt-5">
          Stamps are paused at this business right now. You can still add the card.
        </Alert>
      )}

      <ul className="mt-6 space-y-2.5 text-[15px] text-body">
        {["Free, with your phone number", "No app to download", "Scan the QR on the counter screen to collect stamps"].map((t) => (
          <li key={t} className="flex items-center gap-2.5">
            <span className="grid size-5 shrink-0 place-items-center rounded-full bg-success-50 text-success-600">
              <Check className="size-3" strokeWidth={3.5} />
            </span>
            {t}
          </li>
        ))}
      </ul>

      <div className="mt-auto space-y-2 pt-8">
        <LinkButton href={`/customer/register?next=${next}`} block>
          Get my card
        </LinkButton>
        <LinkButton href={`/customer/login?next=${next}`} variant="outline" block>
          I already have an account
        </LinkButton>
      </div>
    </Shell>
  );
}

function Shell({ children }: { children: React.ReactNode }) {
  return (
    <main className="relative mx-auto flex min-h-dvh w-full max-w-md flex-col bg-white px-6 pb-[calc(1.5rem+env(safe-area-inset-bottom))] pt-[calc(0.75rem+env(safe-area-inset-top))] sm:my-10 sm:min-h-0 sm:rounded-3xl sm:border sm:border-line sm:shadow-card">
      <div className="grid h-11 grid-cols-[2.5rem_1fr_2.5rem] items-center">
        <BackButton fallback="/customer" className="-ml-2" />
        <span className="justify-self-center">
          <Logo size={22} />
        </span>
      </div>
      {children}
    </main>
  );
}

function JoinError({ code, businessName }: { code: string; businessName?: string }) {
  const own = code === "own_business";
  return (
    <Shell>
      <div className="flex flex-1 flex-col items-center pt-14 text-center">
        <div className={`grid size-20 place-items-center rounded-full ${own ? "bg-brand-50 text-brand-600" : "bg-danger-50 text-danger-600"}`}>{own ? <Store className="size-9" /> : <X className="size-9" />}</div>
        <h1 className="mt-6 text-2xl font-semibold tracking-tight text-ink">{own ? "This is your own card" : "Couldn't open this card"}</h1>
        {businessName && <p className="mt-1 font-medium text-body">{businessName}</p>}
        <p className="mx-auto mt-3 max-w-xs text-[15px] leading-relaxed text-muted">
          {own ? "Your customers scan this QR to add your card to their phone. It works — try it with another phone." : message(code === "invalid" ? "invalid" : code)}
        </p>
        <div className="mt-auto w-full space-y-2 pt-10">
          {own ? (
            <LinkButton href="/dashboard" block>
              Back to dashboard
            </LinkButton>
          ) : (
            <LinkButton href="/customer" block>
              Go to my cards
            </LinkButton>
          )}
        </div>
      </div>
    </Shell>
  );
}
