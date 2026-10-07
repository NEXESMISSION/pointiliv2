import { NextResponse, type NextRequest } from "next/server";
import { sendPush } from "@/lib/push";
import { service } from "@/lib/supabase";
import { fill, stampsN, t } from "@/lib/t";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

type Due = { user_id: string; card: string; shop: string; left: number; gift: string; kind: "near" | "gift" | "owner" };

/**
 * Every morning (vercel.json): the customers to remind, each on their own
 * phone — a card on its way that saw no tampon for two weeks, or a gift
 * waiting for days. Once a month per card at most (push_reminders decides).
 * Only Vercel's clock may call this, with the word it was given.
 */
export async function GET(request: NextRequest) {
  const word = process.env.CRON_SECRET;
  if (!word || request.headers.get("authorization") !== `Bearer ${word}`) return new Response("no", { status: 401 });
  const { data, error } = await service().rpc("push_reminders");
  if (error) return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  const due = (data ?? []) as Due[];
  let sent = 0;
  for (const d of due) {
    // an owner: the card made, never shown — the code, one tap away; a customer: the gift, or what is left
    const note =
      d.kind === "owner"
        ? { title: fill(t.pushOwnerTitle, { shop: d.shop }), body: t.pushOwnerBody, url: "/shop/qr", tag: `owner-${d.card}` }
        : d.kind === "gift"
          ? { title: t.pushWaitingTitle, body: fill(t.pushWaitingBody, { gift: d.gift, shop: d.shop }), url: `/c/${d.card}?show=1`, tag: `gift-${d.card}` }
          : { title: fill(t.pushNearTitle, { shop: d.shop }), body: fill(t.pushNearBody, { n: stampsN(d.left), gift: d.gift }), url: `/c/${d.card}`, tag: `near-${d.card}` };
    sent += await sendPush(d.user_id, note);
    await service().rpc(d.kind === "owner" ? "push_nudged" : "push_remembered", d.kind === "owner" ? { p_shop: d.card } : { p_card: d.card });
  }
  return NextResponse.json({ ok: true, due: due.length, sent });
}
