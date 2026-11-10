import Link from "next/link";
import { redirect } from "next/navigation";
import { Pass, type PassShop } from "@/components/Pass";
import { Icon3D, LinkBtn, Middle, Screen } from "@/components/ui";
import { getMe } from "@/lib/session";
import { call, service } from "@/lib/supabase";
import { fill, t } from "@/lib/t";

export const dynamic = "force-dynamic";
export const metadata = { title: "كارط الفيدليتي", robots: { index: false, follow: false } };

type Open = { ok: boolean; id: string; mine: boolean; card: string | null } & PassShop;

/**
 * A shop's sign-up code, opened by a phone's camera (10 Nov 2026): no tampon
 * here, ever — only the way to the shop's card. Nobody signed in: the card as
 * it will be, and the door to make an account (or to sign in), which comes
 * back here. Signed in: the card is taken (at zero, or as it already was)
 * and the customer lands on it. The shop's owner is told what the code is for.
 */
export default async function JoinCodePage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  const ok = /^[A-Za-z0-9_-]{8,40}$/.test(token);
  const me = ok ? await getMe() : null;
  const shop = !ok ? null : me ? await call<Open | null>("join_open", { p_token: token }) : ((await service().rpc("join_open", { p_token: token })).data as Open | null);

  // turned off (or never on): a printed code that no longer leads anywhere says so, gently
  if (!shop?.ok) {
    return (
      <Screen>
        <Middle className="items-center text-center">
          <Icon3D name="ticket" size={88} className="animate-float" />
          <h1 className="mt-4 text-[1.375rem] font-bold">{t.joinGone}</h1>
          <p className="mt-1.5 max-w-[17rem] text-[0.9375rem] text-muted">{t.joinGoneSub}</p>
          <LinkBtn href="/" className="mt-6 max-w-xs">
            Pointili
          </LinkBtn>
        </Middle>
      </Screen>
    );
  }

  if (me && !shop.mine) {
    const took = await call<{ ok: boolean; card?: string }>("join_take", { p_token: token });
    if (took?.ok && took.card) redirect(`/c/${took.card}`);
    if (shop.card) redirect(`/c/${shop.card}`);
  }

  const next = encodeURIComponent(`/j/${token}`);
  return (
    <Screen>
      <Middle className="items-center text-center">
        <div className="w-full max-w-[21rem] animate-rise">
          <Pass shop={shop} stamps={0} />
        </div>
        {shop.mine ? (
          <p className="mt-6 max-w-[19rem] text-balance text-[1rem] font-semibold text-body">{t.joinMine}</p>
        ) : (
          <>
            <h1 className="mt-[3.5dvh] max-w-[20rem] text-balance text-[1.375rem] font-bold leading-snug">{fill(t.joinWelcome, { shop: shop.name })}</h1>
            <p className="mt-1.5 text-[0.9375rem] text-muted">{t.joinWelcomeSub}</p>
            <LinkBtn href={`/join?next=${next}`} className="mt-[3.5dvh] w-full max-w-[21rem]">
              {t.joinCta}
            </LinkBtn>
            <Link href={`/login?next=${next}`} className="press mx-auto mt-2 flex h-11 items-center gap-1.5 px-3 text-[0.9375rem] font-semibold text-muted">
              {t.joinHave} <span className="font-bold text-brand">{t.joinIn}</span>
            </Link>
          </>
        )}
      </Middle>
    </Screen>
  );
}
