import { redirect } from "next/navigation";
import { Back } from "@/components/Back";
import { StaffJoin } from "@/components/StaffScreens";
import { Screen } from "@/components/ui";
import { P } from "@/lib/packs";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: P.staffHome, robots: { index: false } };

/**
 * An owner's invite for a staff phone (Pro), opened: signed in first (the link comes back after), then the
 * shop it is for and one button to join it.
 */
export default async function StaffJoinPage({ params }: { params: Promise<{ token: string }> }) {
  const { token } = await params;
  if (!/^[A-Za-z0-9_-]{20,64}$/.test(token)) redirect("/");
  const me = await getMe();
  if (!me) redirect(`/login?next=${encodeURIComponent(`/staff/join/${token}`)}`);
  const peek = await call<{ ok: boolean; error?: string; shop?: string; kind?: string; color?: string; logo?: string | null; state?: "open" | "used" | "expired" | "mine" }>("staff_invite_peek", { p_token: token });
  return (
    <Screen>
      <header className="flex shrink-0 items-center pt-2">
        <Back home="/" />
      </header>
      <StaffJoin token={token} peek={peek} owner={!!me.shop} />
    </Screen>
  );
}
