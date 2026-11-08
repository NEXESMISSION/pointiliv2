import { redirect } from "next/navigation";
import { Back } from "@/components/Back";
import { ShopMark } from "@/components/ShopMark";
import { StaffJoin } from "@/components/StaffScreens";
import { LinkBtn, Screen } from "@/components/ui";
import { P } from "@/lib/packs";
import { getMe } from "@/lib/session";
import { call, service } from "@/lib/supabase";
import { fill } from "@/lib/t";

export const dynamic = "force-dynamic";
export const metadata = { title: P.staffHome, robots: { index: false } };

type Info = { ok: boolean; error?: string; shop?: string; kind?: string; color?: string; logo?: string | null; state?: "open" | "used" | "expired" | "mine" } | null;

/**
 * An owner's invite for a staff phone (Pro), opened. Signed in: the shop it is for and one button to
 * join it. Not signed in yet: the same shop, said first — who invites, and why — then the way in or a
 * new account, both coming back here (the founder, 9 Nov 2026: no bare sign-in page with no word of why).
 */
export default async function StaffJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) redirect("/");
  const me = await getMe();
  const back = encodeURIComponent(`/staff/join/${token}`);
  if (!me) {
    // the server's own key: a visitor without an account calls nothing in the database
    const { data } = await service().rpc("staff_invite_info", { p_token: token });
    const info = data as Info;
    const bad = !info?.ok ? P.joinErr.invalid : info.state === "used" ? P.joinErr.used : info.state === "expired" ? P.joinErr.expired : null;
    return (
      <Screen>
        <header className="flex shrink-0 items-center pt-2">
          <Back home="/" />
        </header>
        <div className="flex flex-1 flex-col items-center justify-center text-center">
          {info?.ok && (
            <span className="grid size-20 place-items-center overflow-hidden rounded-full shadow-card" style={{ background: info.color ?? "#6c47ff" }}>
              <ShopMark shop={{ kind: info.kind ?? "other", logo: info.logo ?? null }} size={48} />
            </span>
          )}
          <h1 className="mt-4 text-balance text-[1.375rem] font-bold leading-tight">{fill(P.joinTitle, { shop: info?.shop ?? "…" })}</h1>
          {bad ? (
            <p className="mt-6 rounded-[1.125rem] bg-coral-soft px-4 py-3 text-[0.9375rem] font-semibold text-coral">{bad}</p>
          ) : (
            <>
              <p className="mt-1.5 max-w-xs text-[0.9375rem] text-muted">{P.joinGuest}</p>
              <div className="mt-6 w-full max-w-xs space-y-2">
                <LinkBtn href={`/login?next=${back}`}>{P.joinLogin}</LinkBtn>
                <LinkBtn href={`/join?next=${back}`} kind="line">
                  {P.joinSignup}
                </LinkBtn>
              </div>
            </>
          )}
        </div>
      </Screen>
    );
  }
  const peek = await call<Info>("staff_invite_peek", { p_token: token });
  return (
    <Screen>
      <header className="flex shrink-0 items-center pt-2">
        <Back home="/" />
      </header>
      <StaffJoin token={token} peek={peek} owner={!!me.shop} />
    </Screen>
  );
}
