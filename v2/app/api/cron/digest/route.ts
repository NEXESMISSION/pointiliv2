import { NextResponse, type NextRequest } from "next/server";
import { service } from "@/lib/supabase";
import { esc, tg } from "@/lib/telegram";

export const dynamic = "force-dynamic";
export const maxDuration = 60;

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pointili.online").replace(/\/$/, "");
const DAY = 86_400_000;
const tunisDay = (d: Date) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(d);
const tunisHour = (iso: string) => Number(new Intl.DateTimeFormat("en-GB", { hour: "2-digit", hour12: false, timeZone: "Africa/Tunis" }).format(new Date(iso)));
const list = (names: string[], max = 8) => (names.length ? names.slice(0, max).map((n) => `• ${n}`).join("\n") + (names.length > max ? `\n• … و${names.length - max} آخرين` : "") : "");

type Shop = { id: string; name: string; owner_id: string; created_at: string; trial_days: number; paid_until: string | null; goal: number | null };

/**
 * Every morning at 8 (Tunis, vercel.json): yesterday in numbers on the
 * founder's Telegram, and today's calls — the shops that used Pointili for
 * real and do not pay yet, the trials that end today, and yesterday's night
 * sign-ups that never gave a tampon. Robots, testers and the founder's own
 * accounts left out. Only Vercel's clock may call it, with its word.
 */
export async function GET(request: NextRequest) {
  const word = process.env.CRON_SECRET;
  if (!word || request.headers.get("authorization") !== `Bearer ${word}`) return new Response("no", { status: 401 });
  const db = service();
  const now = new Date();
  const today = tunisDay(now);
  const yesterday = tunisDay(new Date(now.getTime() - DAY));

  // who never counts: robots (by phone), testers, the founder
  const [{ data: robots }, { data: staff }] = await Promise.all([
    db.from("robots").select("phone"),
    db.from("people").select("id").or("is_admin.eq.true,is_tester.eq.true"),
  ]);
  const robotPhones = new Set((robots ?? []).map((r) => r.phone));
  const { data: people } = await db.from("people").select("id, phone");
  const out = new Set([...(staff ?? []).map((p) => p.id), ...(people ?? []).filter((p) => p.phone && robotPhones.has(p.phone)).map((p) => p.id)]);

  const { data: all } = await db.from("shops").select("id, name, owner_id, created_at, trial_days, paid_until, goal");
  const shops = ((all ?? []) as Shop[]).filter((s) => !out.has(s.owner_id));
  const byId = new Map(shops.map((s) => [s.id, s]));
  const paid = (s: Shop) => !!s.paid_until && Date.parse(s.paid_until) > now.getTime();

  // yesterday's sign-ups, by hour
  const born = shops.filter((s) => tunisDay(new Date(s.created_at)) === yesterday);
  // tampons of the last 8 days at real shops, to real customers (not the owner, not a robot or a tester, not in the first hour)
  const since = new Date(now.getTime() - 8 * DAY).toISOString();
  const { data: moments } = await db.from("moments").select("shop_id, card_id, kind, created_at").eq("kind", "stamp").gte("created_at", since);
  const cardIds = [...new Set((moments ?? []).map((m) => m.card_id))];
  const cards = new Map<string, string>();
  for (let i = 0; i < cardIds.length; i += 200) {
    const { data } = await db.from("cards").select("id, user_id").in("id", cardIds.slice(i, i + 200));
    for (const c of data ?? []) cards.set(c.id, c.user_id);
  }
  const real = (moments ?? []).filter((m) => {
    const s = byId.get(m.shop_id);
    const who = cards.get(m.card_id);
    // a real tampon: to someone else than the owner, an hour or more after the shop opened (the first hour is a test)
    return s && who && who !== s.owner_id && !out.has(who) && Date.parse(m.created_at) > Date.parse(s.created_at) + 3600_000;
  });
  const realYesterday = real.filter((m) => tunisDay(new Date(m.created_at)) === yesterday);
  const shopsYesterday = [...new Set(realYesterday.map((m) => m.shop_id))].map((id) => byId.get(id)!.name);
  const activeWeek = [...new Set(real.map((m) => m.shop_id))].map((id) => byId.get(id)!).filter((s) => !paid(s));

  // trials that end today, at shops that gave at least one real tampon this week (the end as the database
  // counts it: from the opening, or from the first customer for the shops opened since 14 Oct 2026)
  const { data: ends } = await db.rpc("trial_ends");
  const endOf = new Map(((ends ?? []) as { id: string; ends: string }[]).map((e) => [e.id, e.ends]));
  const endsToday = activeWeek.filter((s) => {
    const end = endOf.get(s.id) ?? new Date(Date.parse(s.created_at) + s.trial_days * DAY).toISOString();
    return tunisDay(new Date(end)) === today;
  });
  // yesterday's night sign-ups that never gave a tampon: the morning calls
  const stamped = new Set(real.map((m) => m.shop_id));
  const nightSilent = born.filter((s) => {
    const h = tunisHour(s.created_at);
    return (h >= 19 || h < 8) && !stamped.has(s.id);
  });
  const { count: waitingPay } = await db.from("payments").select("id", { count: "exact", head: true }).eq("status", "pending");

  const text = [
    `☀️ <b>صباح الخير · Pointili البارح</b> (${yesterday})`,
    "",
    `🆕 محلات جدد: <b>${born.length}</b>`,
    list(born.map((s) => esc(s.name))),
    `🎟 تامبونات لحرفاء حقيقيين: <b>${realYesterday.length}</b> في ${shopsYesterday.length} محلّات`,
    list(shopsYesterday.map(esc), 6),
    waitingPay ? `💰 طلبات خلاص تستنّى: <b>${waitingPay}</b>` : "",
    "",
    `📞 <b>عيّطلهم اليوم</b>`,
    endsToday.length ? `⏳ التجربة توفى اليوم (ويخدمو بيها):\n${list(endsToday.map((s) => esc(s.name)))}` : "",
    activeWeek.length ? `🔥 خدمو بيها هالجمعة وما خلّصوش (${activeWeek.length}):\n${list(activeWeek.map((s) => esc(s.name)))}` : "",
    nightSilent.length ? `🌙 تحلّو البارح في الليل، حتى تامبون (${nightSilent.length}):\n${list(nightSilent.map((s) => esc(s.name)))}` : "",
    !endsToday.length && !activeWeek.length && !nightSilent.length ? "حتى حد اليوم." : "",
  ]
    .filter((l, i, a) => l !== "" || (a[i - 1] ?? "") !== "")
    .join("\n");

  // ?preview=1: the text only, nothing sent (to read what the morning will say)
  if (request.nextUrl.searchParams.get("preview") === "1") return NextResponse.json({ ok: true, text });
  const sent = await tg(text, [[{ text: "📋 المتابعة", url: `${SITE}/admin/crm?f=today` }, { text: "🧾 المحلات", url: `${SITE}/admin/shops` }]]);
  return NextResponse.json({ ok: true, sent, born: born.length, stamps: realYesterday.length, calls: endsToday.length + activeWeek.length + nightSilent.length });
}
