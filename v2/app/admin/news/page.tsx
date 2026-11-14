import { redirect } from "next/navigation";
import { AdminNews } from "@/components/AdminNews";
import type { SentNews } from "@/lib/bell";
import { getMe } from "@/lib/session";
import { call, service } from "@/lib/supabase";

export const dynamic = "force-dynamic";
export const metadata = { title: "الإشعارات" };

/**
 * «الإشعارات» (13 Nov 2026): the founder writes to the owners — they find it in their 🔔. Opened from a
 * shop's page (`?to=` its owner), the note is for that owner alone.
 */
export default async function AdminNewsPage({ searchParams }: { searchParams: Promise<{ to?: string }> }) {
  const me = await getMe();
  if (!me?.admin) redirect("/");
  const { to } = await searchParams;
  const id = to && /^[0-9a-f-]{36}$/i.test(to) ? to : null;
  const [list, shop] = await Promise.all([
    call<SentNews[]>("admin_news_list"),
    id ? service().from("shops").select("name").eq("owner_id", id).maybeSingle() : Promise.resolve(null),
  ]);
  const name = (shop?.data as { name?: string } | null)?.name ?? null;
  return <AdminNews list={list ?? []} to={id && name ? { id, shop: name } : null} />;
}
