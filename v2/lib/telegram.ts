import "server-only";
import { metaActivated } from "@/lib/meta";
import { service } from "@/lib/supabase";

/**
 * The founder's alerts on Telegram: a word on his phone when something worth
 * a call happens — a shop opened, its first real customer, a milestone,
 * «كلّمنا» tapped — and a digest every morning. (Paying is not one of them:
 * the owner calls or sends the receipt on WhatsApp, and that is the word.)
 *
 * TELEGRAM_BOT_TOKEN (from @BotFather) and TELEGRAM_CHAT_ID (scripts/telegram.mjs
 * finds it) in the environment; without them nothing is sent, quietly. Robots,
 * testers and the founder's own accounts never ring.
 */

const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pointili.online").replace(/\/$/, "");
type Button = { text: string; url: string };

/** Telegram's HTML: only these three need escaping */
export const esc = (s: unknown) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

/** One message to the founder, with buttons under it (each a link). Never throws. */
export async function tg(text: string, buttons: Button[][] = []): Promise<boolean> {
  const token = process.env.TELEGRAM_BOT_TOKEN;
  const chat = process.env.TELEGRAM_CHAT_ID;
  if (!token || !chat) {
    // the local server has no bot: what would have gone is printed instead, to be read
    if (process.env.NODE_ENV === "development") console.info(`[telegram · not sent]\n${text}`);
    return false;
  }
  try {
    const res = await fetch(`https://api.telegram.org/bot${token}/sendMessage`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify({
        chat_id: chat,
        text: text.slice(0, 4000),
        parse_mode: "HTML",
        disable_web_page_preview: true,
        ...(buttons.length ? { reply_markup: { inline_keyboard: buttons } } : {}),
      }),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[telegram]", res.status, (await res.text()).slice(0, 200));
    return res.ok;
  } catch (e) {
    console.error("[telegram]", (e as Error).message);
    return false;
  }
}

type Shop = { id: string; name: string; kind: string; created_at: string; owner_id: string; trial_days: number; paid_until: string | null };
type Owner = { name: string; phone: string | null };
export type ShopFacts = { shop: Shop; owner: Owner };

/** A shop and its owner — or null for a robot's, a tester's or the founder's own (they never ring). */
export async function shopFacts(by: { shop?: string; owner?: string }): Promise<ShopFacts | null> {
  const db = service();
  const q = db.from("shops").select("id, name, kind, created_at, owner_id, trial_days, paid_until");
  const { data: shop, error } = by.shop ? await q.eq("id", by.shop).maybeSingle() : await q.eq("owner_id", by.owner ?? "").maybeSingle();
  if (error || !shop) return null;
  const [{ data: owner, error: ownerError }, { data: robot, error: robotError }] = await Promise.all([
    db.from("people").select("name, phone, is_admin, is_tester").eq("id", shop.owner_id).maybeSingle(),
    db.rpc("is_robot", { p_id: shop.owner_id }),
  ]);
  // a read that failed says nothing: a robot's or a tester's shop must never ring for want of an answer
  if (ownerError || robotError) return null;
  if (robot === true || owner?.is_admin || owner?.is_tester) return null;
  return { shop: shop as Shop, owner: { name: owner?.name ?? "", phone: owner?.phone ?? null } };
}

/** The buttons under every alert: the shop's whole page in the console, and WhatsApp to its owner */
export function shopButtons(f: ShopFacts): Button[][] {
  // everything about the shop (what the call gave goes in its note there), and its owner on WhatsApp
  const row: Button[] = [{ text: "🧾 المحل", url: `${SITE}/admin/shop/${f.shop.id}` }];
  const d = (f.owner.phone ?? "").replace(/\D/g, "").replace(/^216/, "");
  if (/^\d{8}$/.test(d)) row.push({ text: "💬 واتساب", url: `https://wa.me/216${d}` });
  return [row];
}

/** «Café Yasmine (قهوة) · ياسمين · 94 547 186» */
export function shopLine(f: ShopFacts): string {
  const d = (f.owner.phone ?? "").replace(/\D/g, "").replace(/^216/, "");
  const phone = /^\d{8}$/.test(d) ? `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}` : "";
  return [`<b>${esc(f.shop.name)}</b>`, esc(f.owner.name), phone].filter(Boolean).join(" · ");
}

const hourTunis = (iso: string) => new Intl.DateTimeFormat("fr-TN", { hour: "2-digit", minute: "2-digit", timeZone: "Africa/Tunis" }).format(new Date(iso));

/** A new shop opened: who, where from (the ad or not), at what hour, on what phone. */
export async function alertNewShop(owner: string): Promise<void> {
  const f = await shopFacts({ owner });
  if (!f) return;
  const { data: v } = await service()
    .from("visits")
    .select("source, campaign, content, browser, os")
    .eq("user_id", owner)
    .order("started_at", { ascending: true })
    .limit(1)
    .maybeSingle();
  const from = v?.campaign ? `📣 ${esc(v.campaign)}${v.content ? ` · ${esc(v.content)}` : ""}` : v?.source ? `🔗 ${esc(v.source)}` : "";
  const night = (() => {
    const h = Number(hourTunis(f.shop.created_at).slice(0, 2));
    return h >= 19 || h < 8;
  })();
  await tg(
    [
      `🆕 <b>محل جديد</b>`,
      shopLine(f),
      `${esc(f.shop.kind)} · ${hourTunis(f.shop.created_at)}${night ? " 🌙 (في الليل: عيّطلو غدوة الصباح)" : " ☀️ (في النهار: عيّطلو توّا)"}`,
      [from, v ? `📱 ${esc(v.os ?? "")} · ${esc(v.browser ?? "")}` : ""].filter(Boolean).join("\n"),
    ]
      .filter(Boolean)
      .join("\n"),
    shopButtons(f),
  );
}

/**
 * A tampon given (scanned or by hand): the shop's real customers counted —
 * not the owner, not a robot or a tester — and a word on the 1st, then on 5,
 * 10, 25, 50, 100. Only when this tampon brought a new customer, so each
 * milestone rings once.
 */
export async function alertStamp(shopId: string, cardId: string): Promise<void> {
  const db = service();
  const { data: card } = await db.from("cards").select("user_id").eq("id", cardId).maybeSingle();
  if (!card) return;
  const { count: mine } = await db.from("moments").select("id", { count: "exact", head: true }).eq("card_id", cardId).eq("kind", "stamp");
  if (mine !== 1) return; // not this customer's first tampon here
  const f = await shopFacts({ shop: shopId });
  if (!f || card.user_id === f.shop.owner_id) return;
  const { data: cards } = await db.from("cards").select("user_id").eq("shop_id", shopId).neq("user_id", f.shop.owner_id);
  const ids = [...new Set((cards ?? []).map((c) => c.user_id))];
  if (!ids.length) return;
  const { data: people } = await db.from("people").select("id, is_admin, is_tester").in("id", ids);
  const staff = new Set((people ?? []).filter((p) => p.is_admin || p.is_tester).map((p) => p.id));
  const robots = await Promise.all(ids.map(async (id) => (await db.rpc("is_robot", { p_id: id })).data === true));
  const real = ids.filter((id, i) => !staff.has(id) && !robots[i]);
  if (!real.includes(card.user_id)) return;
  const n = real.length;
  const hours = (Date.now() - Date.parse(f.shop.created_at)) / 3600_000;
  if (n === 1) {
    // the shop used for real (not the owner's first-hour try): Facebook learns which sign-ups became shops (lib/meta)
    await metaActivated(shopId, true, hours);
    await tg(
      [
        `🎉 <b>أوّل حريف</b>`,
        shopLine(f),
        hours < 1 ? "في الساعة الأولى: ممكن تجربة (هو ولا واحد قريب منو)." : `${Math.round(hours)} ساعة بعد ما حلّ المحل: يخدم بيها في الحانوت 🔥`,
      ].join("\n"),
      shopButtons(f),
    );
  } else if ([5, 10, 25, 50, 100].includes(n)) {
    await tg([`🔥 <b>${n} حرفاء</b>`, shopLine(f), "المحل هذا يخدم بالحق: وقت مزيان باش تعيّطلو على الأبونمان."].join("\n"), shopButtons(f));
  }
}

/** A gift handed over: a word on the shop's first one only — the loop is closed, the owner has seen it all work. */
export async function alertGift(moment: number): Promise<void> {
  const db = service();
  const { data: m } = await db.from("moments").select("shop_id, gift, card_id").eq("id", moment).maybeSingle();
  if (!m) return;
  const { count } = await db.from("moments").select("id", { count: "exact", head: true }).eq("shop_id", m.shop_id).eq("kind", "gift").not("given_at", "is", null);
  if (count !== 1) return;
  const f = await shopFacts({ shop: m.shop_id });
  if (!f) return;
  await tg([`🎁 <b>أوّل كادو تعطى</b>`, shopLine(f), m.gift ? esc(m.gift) : "", "الدورة كاملة خدمت عندو: وقت مزيان باش تعيّطلو."].filter(Boolean).join("\n"), shopButtons(f));
}

/** The owner tapped «كلّمنا» on the trial's line (a call), or — the trial over — its WhatsApp button (a message on its way). */
export async function alertCall(owner: string, whatsapp = false): Promise<void> {
  const f = await shopFacts({ owner });
  if (!f) return;
  const lines = whatsapp
    ? ["💬 <b>التجربة وفات: فتح واتساب باش يبعثلك</b>", shopLine(f), "الميساج يوصلك على واتساب بالكونت متاعو، وتخدّملو الأبونمان كي يخلّص."]
    : ["📞 <b>نزل على «كلّمنا»</b>", shopLine(f), "يستنّى في تليفونك توّا."];
  await tg(lines.join("\n"), shopButtons(f));
}

/** How Pointili went onto the phone: its own Android app (the user agent says PointiliApp), Android's Chrome, an iPhone, a computer. */
export type AppWay = "apk" | "android" | "iphone" | "computer";
export function appWay(ua: string): AppWay {
  if (/PointiliApp\//.test(ua)) return "apk";
  if (/iPhone|iPad|iPod/i.test(ua)) return "iphone";
  if (/Android/i.test(ua)) return "android";
  return "computer";
}
const WAY: Record<AppWay, string> = { apk: "🤖 Android · التطبيق (APK)", android: "🤖 Android · Chrome", iphone: "🍏 iPhone", computer: "💻 كمبيوتر" };

/**
 * Not yet seen in the app: no visit of theirs opened as the app. Asked before the beacon writes its batch, and
 * only for a batch that is the app's or an install's — so the people who were already using the app before this
 * alert existed never ring for it. «unknown» when the read failed: no ring this time, asked again next batch.
 */
export async function newToApp(user: string): Promise<"yes" | "no" | "unknown"> {
  const { data, error } = await service().from("visits").select("id").eq("user_id", user).eq("standalone", true).limit(1);
  if (error) return "unknown";
  return data.length ? "no" : "yes";
}

/** The mark on the person that the founder was told Pointili is on their phone (alertApp) — not a note, never shown. */
export const APP_TOLD = "app_told";

/**
 * The «once» of once per person, kept on the person and taken atomically: APP_TOLD added to people.seen only if
 * the list is still the one just read (a note seen in between: read again). True for exactly one caller, whatever
 * the server instance, the batch or the order — the install said in a tab, then the first open, ring once; two
 * batches at the same moment, once. A failed read or write: false, never a ring for nothing.
 */
async function claimApp(user: string): Promise<boolean> {
  const db = service();
  for (let i = 0; i < 3; i++) {
    const { data, error } = await db.from("people").select("seen").eq("id", user).maybeSingle();
    if (error || !data) return false;
    const seen: string[] = data.seen ?? [];
    if (seen.includes(APP_TOLD)) return false;
    const was = `{${seen.map((k) => `"${k.replace(/["\\]/g, "\\$&")}"`).join(",")}}`;
    const won = await db.from("people").update({ seen: [...seen, APP_TOLD] }).eq("id", user).filter("seen", "eq", was).select("id");
    if (won.error) return false;
    if (won.data.length) return true;
  }
  return false;
}

/** «3 ساعة بعد ما حلّ المحل» */
function sinceShop(iso: string): string {
  const h = (Date.now() - Date.parse(iso)) / 3600_000;
  if (h < 1) return "في الساعة الأولى متاع المحل";
  return h < 48 ? `${Math.round(h)} ساعة بعد ما حلّ المحل` : `${Math.round(h / 24)} يوم بعد ما حلّ المحل`;
}

/**
 * Pointili put on an owner's phone (the founder, 16 Nov 2026: «when people add the PWA I really want to know»): the
 * first time they open it as the app — the only sign an iPhone ever gives — or the moment Android's Chrome says it
 * is installed, whichever comes first; once per owner (claimApp): the shop, and how long after it opened. A
 * customer's phone rings nothing — the same evening, four new customers of one shop rang four times in half an hour
 * («each time he enters, it's wrong»): the morning's digest says them instead, a line a shop (api/cron/digest).
 * Robots, testers and the founder never ring, and a read that failed rings for nobody.
 */
export async function alertApp(user: string, way: AppWay, opened: boolean): Promise<void> {
  const how = `${WAY[way]} · ${opened ? "حلّها من الأيقونة" : "تحطّت (مازال ما حلّهاش)"}`;
  const own = await service().from("shops").select("id").eq("owner_id", user).maybeSingle();
  if (own.error || !own.data) return;
  const f = await shopFacts({ shop: own.data.id });
  if (!f || !(await claimApp(user))) return;
  await tg([`📲 <b>مولى المحل حطّ Pointili في تليفونو</b>`, shopLine(f), `${how} · ${sinceShop(f.shop.created_at)}`].join("\n"), shopButtons(f));
}
