import { redirect } from "next/navigation";
import { HelpButton } from "@/components/Help";
import { Inbox } from "@/components/Inbox";
import { Top } from "@/components/Top";
import { Screen } from "@/components/ui";
import { B, type InboxItem } from "@/lib/bell";
import { getMe } from "@/lib/session";
import { getHelp } from "@/lib/settings";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإشعارات", robots: { index: false } };

/** 🔔 (13 Nov 2026): what the founder wrote to this owner, kept — the newest first (components/Inbox). */
export default async function ShopInbox() {
  const me = await getMe();
  if (!me) redirect("/login?next=/shop/inbox");
  if (!me.shop) redirect("/shop/setup");
  const [items, help] = await Promise.all([call<InboxItem[]>("my_inbox"), getHelp()]);
  // eslint-disable-next-line react-hooks/purity -- a server page: the clock is read once per request
  const now = Date.now();
  return (
    <Screen>
      <Top back="/shop" end={<HelpButton help={help} />} title={B.title} />
      <Inbox items={items ?? []} now={now} />
    </Screen>
  );
}
