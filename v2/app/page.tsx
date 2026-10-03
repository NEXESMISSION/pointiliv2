import { redirect } from "next/navigation";
import { Wallet } from "@/components/Wallet";
import { Welcome } from "@/components/Welcome";
import { getMe, homeOf } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";
import type { CardView } from "@/lib/types";

/** Home: the welcome for a stranger, the counter for a shop, the wallet for a customer. */
export default async function Home() {
  const me = await getMe();
  if (!me) return <Welcome video={(await getHelp()).video1} />;
  if (me.shop) redirect(homeOf(me));
  const cards = (await call<CardView[]>("wallet")) ?? [];
  return <Wallet me={me} cards={cards} />;
}
