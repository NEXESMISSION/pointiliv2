import { redirect } from "next/navigation";
import { Wallet } from "@/components/Wallet";
import { getMe, homeOf } from "@/lib/session";
import { call } from "@/lib/supabase";
import type { CardView } from "@/lib/types";

export const metadata = { title: "الكارطات متاعي" };

/** An owner (or the founder) collects stamps elsewhere too: their own cards, from the account page. */
export default async function MyCards() {
  const me = await getMe();
  if (!me) redirect("/login?next=/wallet");
  if (!me.shop && !me.admin) redirect("/");
  const cards = (await call<CardView[]>("wallet")) ?? [];
  return <Wallet me={me} cards={cards} back={homeOf(me)} />;
}
