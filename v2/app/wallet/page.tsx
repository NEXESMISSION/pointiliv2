import { Suspense } from "react";
import { redirect } from "next/navigation";
import { Wallet, WalletWait } from "@/components/Wallet";
import { getMe, homeOf } from "@/lib/session";

export const metadata = { title: "الكارطات متاعي" };

/** An owner (or the founder) collects stamps elsewhere too: their own cards, from the account page. */
export default async function MyCards() {
  const me = await getMe();
  if (!me) redirect("/login?next=/wallet");
  if (!me.shop && !me.admin) redirect("/");
  return (
    <Suspense fallback={<WalletWait />}>
      <Wallet me={me} back={homeOf(me)} />
    </Suspense>
  );
}
