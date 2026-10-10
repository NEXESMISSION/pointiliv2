"use server";

import { randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath, updateTag } from "next/cache";
import { after } from "next/server";
import { sendPush } from "@/lib/push";
import sharp from "sharp";
import { call, db, service } from "@/lib/supabase";
import { getMe, homeOf, type Me } from "@/lib/session";
import { digits, phoneEmail, validPhone } from "@/lib/phone";
import { NEWS_ICONS, newsHref } from "@/lib/news";
import { clarityId, domainCode, pixelId, socialUrl, youtubeId } from "@/lib/settings";
import { fill, t } from "@/lib/t";
import type { CardView, FormState, ScanResult } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** Only paths inside the app: a crafted ?next= cannot send anyone elsewhere. */
const inside = (n: string) => (n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null);
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
const UUID = /^[0-9a-f-]{36}$/i;
const HOLD = "p2_hold";
/** The auth server's own minimum (Supabase password_min_length): the forms ask for the same. */
const PASSWORD_MIN = 8;

/** The caller's address, as Vercel saw it. */
async function address(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

/**
 * One more try at a door that counts (tries in the database). When the count
 * cannot be kept — the network — the door stays open: a customer at the
 * counter never waits on a limit.
 */
async function allowed(key: string, max: number, minutes: number): Promise<boolean> {
  const { data, error } = await service().rpc("try_once", { p_key: key, p_max: max, p_minutes: minutes });
  return error ? true : data !== false;
}

// ── accounts ───────────────────────────────────────────────────────────────
/** A new account: name, phone, password — then signed in. An owner goes on to open the shop. */
export async function join(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  const phone = digits(str(fd, "phone"));
  const password = String(fd.get("password") ?? "");
  const owner = fd.get("owner") === "1";
  const next = inside(str(fd, "next"));
  if (name.length < 2 || name.length > 60) return { error: t.errName, field: "name" };
  if (!validPhone(phone)) return { error: t.errPhone, field: "phone" };
  if (password.length < PASSWORD_MIN) return { error: t.errPassword, field: "password" };
  // a phone shop's wifi or a mobile network can share one address: the limit is wide
  if (!(await allowed(`join-ip:${await address()}`, 30, 60))) return { error: t.errTooMany };

  const admin = service();
  const { data, error } = await admin.auth.admin.createUser({ email: phoneEmail(phone), password, email_confirm: true, app_metadata: { phone: `+216${phone}` } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: t.errTaken, field: "phone" };
    if (/password/i.test(error.message)) return { error: t.errPassword, field: "password" };
    console.error("[join]", error.message);
    return { error: t.errNetwork };
  }
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${phone}` });

  const supabase = await db();
  const { error: e2 } = await supabase.auth.signInWithPassword({ email: phoneEmail(phone), password });
  if (e2) return { error: t.errNetwork };
  await markKnown();
  redirect(owner ? "/shop/setup" : (next ?? "/"));
}

/**
 * This phone has an account on it. Nothing about who — a 1, for a year — so
 * the front door can lead with «ادخل» for somebody coming back instead of
 * asking them to make the account they already have.
 */
async function markKnown() {
  (await cookies()).set("pl-known", "1", { maxAge: 31_536_000, sameSite: "lax", path: "/" });
}

export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const phone = digits(str(fd, "phone"));
  const password = String(fd.get("password") ?? "");
  const next = inside(str(fd, "next"));
  if (!validPhone(phone)) return { error: t.errPhone, field: "phone" };
  if (!password) return { error: t.errPassword, field: "password" };
  // guessing a password: 8 tries per number, 60 per address, every 15 minutes
  if (!(await allowed(`login:${phone}`, 8, 15)) || !(await allowed(`login-ip:${await address()}`, 60, 15))) return { error: t.errTooMany };

  const supabase = await db();
  const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(phone), password });
  if (error) return { error: /invalid|credentials/i.test(error.message) ? t.errLogin : t.errNetwork };
  await service().rpc("forget_tries", { p_key: `login:${phone}` });
  await markKnown();
  const { data: me } = await supabase.rpc("me");
  redirect(next ?? homeOf(me as Me));
}

export async function logout() {
  await (await db()).auth.signOut();
  redirect("/");
}

export async function setName(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  if (name.length < 2 || name.length > 60) return { error: t.errName, field: "name" };
  const res = await call<{ ok: boolean }>("set_name", { p_name: name });
  if (!res?.ok) return { error: t.errNetwork };
  revalidatePath("/", "layout");
  return { error: null };
}

/** A new password, from the account page (after the founder gave a temporary one, say). */
export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const password = String(fd.get("password") ?? "");
  if (password.length < PASSWORD_MIN) return { error: t.errPassword, field: "password" };
  const { error } = await (await db()).auth.updateUser({ password });
  // the same password again is not a failure
  if (error && !/different|same/i.test(error.message)) {
    console.error("[password]", error.message);
    return { error: t.errNetwork };
  }
  return { error: null };
}

// ── the scan ───────────────────────────────────────────────────────────────
/**
 * Called once by the scan page (a POST, so a link preview never spends a code).
 * Signed in: the stamp. Not signed in: the code is held for this phone for 20
 * minutes (an httpOnly cookie carries the proof) while they make an account.
 */
export async function scan(token: string): Promise<ScanResult> {
  if (!TOKEN.test(token)) return { kind: "error", code: "invalid" };
  const jar = await cookies();
  const stored = jar.get(HOLD)?.value ?? "";
  const dot = stored.lastIndexOf(".");
  const hold = dot > 0 && stored.slice(0, dot) === token ? stored.slice(dot + 1) : null;

  const supabase = await db();
  const { data: user } = await supabase.auth.getUser();
  if (user.user) {
    const { data, error } = await supabase.rpc("stamp", { p_token: token, p_hold: hold });
    if (error || !data) return { kind: "error", code: "network" };
    if (hold) jar.delete(HOLD);
    const res = data as { ok: boolean; error?: string; gift?: boolean; card?: CardView; next_at?: string; shop?: string; item?: string | null };
    if (res.ok && res.card) return { kind: "stamped", card: res.card, gift: !!res.gift, item: res.item ?? null };
    return { kind: "error", code: res.error ?? "invalid", card: res.card, next_at: res.next_at, shop: res.shop };
  }

  const fresh = hold ?? randomBytes(32).toString("base64url");
  const { data, error } = await service().rpc("hold", { p_token: token, p_hold: fresh });
  if (error || !data) return { kind: "error", code: "network" };
  const res = data as { ok: boolean; error?: string; shop?: string; color?: string; kind?: string };
  if (!res.ok) return { kind: "error", code: res.error ?? "invalid" };
  jar.set(HOLD, `${token}.${fresh}`, { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax", path: "/", maxAge: 20 * 60 });
  return { kind: "held", shop: res.shop ?? "", color: res.color ?? "#6C47FF", shopKind: res.kind ?? "other" };
}

// ── the owner ──────────────────────────────────────────────────────────────
/** Where every logo is read from: the public «logos» box, one folder per owner. */
const LOGOS = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/object/public/logos/`;

export async function openShop(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  if (name.length < 2 || name.length > 60) return { error: t.errName, field: "name" };
  const me = await getMe();
  if (!me) return { error: t.errNetwork };
  const res = await call<{ ok: boolean; error?: string }>("open_shop", { p_name: name, p_kind: str(fd, "kind") });
  if (!res?.ok) return { error: t.errNetwork };
  // the logo: only a picture of this owner's own folder in the box; "" takes it away
  const logo = str(fd, "logo");
  const before = me.shop?.logo ?? "";
  if (logo !== before && (logo === "" || logo.startsWith(`${LOGOS}${me.id}/`))) {
    await service().from("shops").update({ logo: logo || null }).eq("owner_id", me.id);
    if (before.startsWith(`${LOGOS}${me.id}/`)) await service().storage.from("logos").remove([before.slice(LOGOS.length)]);
  }
  revalidatePath("/", "layout");
  redirect(inside(str(fd, "next")) ?? "/shop/card");
}

/**
 * A shop's logo, from the owner's phone (made small there first): read as a
 * picture whatever it was (a photo, a PNG with see-through corners), turned
 * upright, fitted whole into 256×256 — nothing cut off — and kept as WebP in
 * the owner's own folder. The form saves it on the shop with the name.
 */
export async function uploadLogo(fd: FormData): Promise<{ url?: string; error?: string }> {
  const me = await getMe();
  if (!me) return { error: t.errNetwork };
  const file = fd.get("logo");
  if (!(file instanceof Blob) || !file.size) return { error: t.errLogo };
  if (file.size > 4_000_000) return { error: t.errLogoBig };
  if (!(await allowed(`logo:${me.id}`, 30, 60))) return { error: t.errTooMany };
  let picture: Buffer;
  try {
    picture = await sharp(Buffer.from(await file.arrayBuffer()), { limitInputPixels: 40_000_000 })
      .rotate()
      .resize(256, 256, { fit: "contain", background: { r: 255, g: 255, b: 255, alpha: 0 } })
      .webp({ quality: 88 })
      .toBuffer();
  } catch {
    return { error: t.errLogo };
  }
  const path = `${me.id}/${Date.now().toString(36)}${randomBytes(3).toString("hex")}.webp`;
  const box = service().storage.from("logos");
  const { error } = await box.upload(path, picture, { contentType: "image/webp", cacheControl: "31536000", upsert: false });
  if (error) return { error: t.errNetwork };
  return { url: `${LOGOS}${path}` };
}

export async function saveCard(_: FormState, fd: FormData): Promise<FormState> {
  const goal = Number(fd.get("goal"));
  const gift = str(fd, "gift");
  if (gift.length < 2) return { error: t.cardGiftPh, field: "gift" };
  // the wait between two tampons, in minutes (0: none; 1440: once a day); missing: as it was
  const gapRaw = str(fd, "gap");
  const gap = gapRaw === "" ? null : Math.round(Number(gapRaw));
  // the customers on their way: they finish the card they started, unless the owner moves them to the new one now
  const res = await call<{ ok: boolean; error?: string }>("save_card", { p_goal: goal, p_gift: gift, p_color: str(fd, "color"), p_gap: gap !== null && Number.isFinite(gap) ? gap : null, p_move: str(fd, "move") === "1" });
  if (!res?.ok) return { error: t.errNetwork };
  revalidatePath("/", "layout");
  redirect(inside(str(fd, "next")) ?? "/shop");
}

/** Before a change of card is saved: what it would do to the customers (on their way, eased, winning at once — if moved, or whatever is chosen). */
export async function cardChange(goal: number, gift: string): Promise<{ ok: boolean; way?: number; eased?: number; win_now?: number; win_eased?: number }> {
  const res = await call<{ ok: boolean; way?: number; eased?: number; win_now?: number; win_eased?: number }>("card_change", { p_goal: Math.round(goal), p_gift: String(gift).slice(0, 60) });
  return res ?? { ok: false };
}

/** What the shop sells, written whole: the names, then whether the counter asks.
 *  What cannot be kept is named rather than dropped quietly. */
export async function saveItems(names: string[], on: boolean): Promise<{ ok: boolean; error?: string }> {
  const clean = names.map((n) => n.trim()).filter(Boolean);
  if (clean.length > 20) return { ok: false, error: "too_many" };
  if (clean.some((n) => n.length > 40)) return { ok: false, error: "too_long" };
  const res = await call<{ ok: boolean; error?: string }>("set_items", { p_names: clean });
  if (!res?.ok) return { ok: false, error: res?.error ?? "network" };
  const sw = await call<{ ok: boolean }>("set_items_on", { p_on: on && clean.length > 0 });
  if (!sw?.ok) return { ok: false, error: "network" };
  revalidatePath("/", "layout");
  return { ok: true };
}

/** A one-time note just showed (see lib/once.ts): written on the person, so it never shows again. */
export async function markSeen(note: "coach" | "logo_tip" | "card_hello" | "offer" | "push" | "install"): Promise<void> {
  await call("see", { p_key: note });
}

/** A gift the customer's card holds for the shop to hand over. */
export type WaitingGift = { id: number; gift: string | null };

/** The customer behind a code or a number, for the shop about to give them a tampon (their first name, their card here, a gift waiting). */
export async function customerAt(who: string): Promise<{ ok: boolean; error?: string; name?: string | null; card?: CardView | null; waiting?: WaitingGift | null }> {
  const res = await call<{ ok: boolean; error?: string; name?: string | null; card?: CardView | null; waiting?: WaitingGift | null }>("customer_at", { p_who: String(who).slice(0, 20) });
  return res ?? { ok: false, error: "network" };
}

/** The shop gives the tampon itself: the same rules as a scan (the shop's wait between two, the gift at the goal). */
export async function giveStamp(who: string): Promise<{ ok: boolean; error?: string; gift?: boolean; name?: string | null; card?: CardView; next_at?: string; waiting?: WaitingGift | null; moment?: number }> {
  const res = await call<{ ok: boolean; error?: string; gift?: boolean; name?: string | null; card?: CardView; next_at?: string; waiting?: WaitingGift | null; moment?: number }>("give_stamp", { p_who: String(who).slice(0, 20) });
  // the last tampon by the shop's hand: the customer's phone hears it, after the answer has left
  if (res?.ok && res.gift && res.card) {
    const card = res.card;
    after(async () => {
      const { data } = await service().from("cards").select("user_id").eq("id", card.id).maybeSingle();
      if (data?.user_id) await sendPush(data.user_id, { title: fill(t.pushWonTitle, { gift: card.shop.gift ?? "" }), body: fill(t.pushWonBody, { shop: card.shop.name }), url: `/c/${card.id}?show=1`, tag: `gift-${card.id}` });
    });
  }
  return res ?? { ok: false, error: "network" };
}

/** The phone said «إيه، فكّروني»: written down, so the shop's reminders reach it. */
export async function pushSubscribe(endpoint: string, p256dh: string, auth: string): Promise<boolean> {
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000) return false;
  const res = await call<{ ok: boolean }>("push_subscribe", { p_endpoint: endpoint, p_p256dh: String(p256dh).slice(0, 200), p_auth: String(auth).slice(0, 100) });
  return !!res?.ok;
}

/** This browser's word taken back — on the way out, so the next person to sign in on this phone never gets the last one's reminders. */
export async function pushUnsubscribe(endpoint: string): Promise<boolean> {
  if (!/^https:\/\//.test(endpoint) || endpoint.length > 2000) return false;
  const res = await call<{ ok: boolean }>("push_unsubscribe", { p_endpoint: endpoint });
  return !!res?.ok;
}

/** The tampon just given by hand, taken back (the wrong customer, or twice): the card as it is after. */
export async function unstamp(moment: number): Promise<{ ok: boolean; error?: string; card?: CardView }> {
  if (!Number.isInteger(moment) || moment <= 0) return { ok: false, error: "invalid" };
  const res = await call<{ ok: boolean; error?: string; card?: CardView }>("unstamp", { p_moment: moment });
  return res ?? { ok: false, error: "network" };
}

/** The owner chose a way to pay and says the money is sent: one payment waits for the founder's word. */
export async function payRequest(method: string): Promise<{ ok: boolean; months?: number; error?: string }> {
  const res = await call<{ ok: boolean; months?: number; error?: string }>("pay_request", { p_method: method });
  revalidatePath("/shop");
  return res ?? { ok: false, error: "network" };
}

/** The founder's word on a payment: the money came (the year starts) or it did not. */
export async function adminPaymentDecide(id: string, paid: boolean): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const res = await call<{ ok: boolean }>("admin_payment_decide", { p_id: id, p_paid: paid });
  revalidatePath("/admin/payments");
  return !!res?.ok;
}

/** The founder writes a line in the books: what came in (in) or what the business spent (out) — on what, how much (dinars, millimes if any), which day (today in Tunis when not said), its kind. */
export async function adminBookAdd(side: "in" | "out", what: string, amount: number, on: string | null, kind: string): Promise<{ ok: boolean }> {
  const sum = Number(amount);
  if ((side !== "in" && side !== "out") || !Number.isFinite(sum) || sum <= 0 || sum > 1_000_000) return { ok: false };
  const kinds = side === "in" ? ["sub", "service"] : ["ads", "tools", "print", "move", "people"];
  const res = await call<{ ok: boolean }>("admin_book_add", {
    p_side: side,
    p_what: String(what ?? "").trim().slice(0, 120),
    p_amount: Math.round(sum * 1000) / 1000,
    p_on: on && /^\d{4}-\d{2}-\d{2}$/.test(on) ? on : null,
    p_kind: kinds.includes(kind) ? kind : "other",
  });
  revalidatePath("/admin/payments");
  return { ok: !!res?.ok };
}

/** A line of the books taken back. */
export async function adminBookDelete(id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) return false;
  const res = await call<{ ok: boolean }>("admin_book_delete", { p_id: id });
  revalidatePath("/admin/payments");
  return !!res?.ok;
}

/** The owner paid by hand: the founder turns the access on (so many months, or until a date), or stops it — with what came in, for the books. */
export async function adminPlan(shopId: string, kind: "paid" | "until" | "end", months: number | null, until: string | null, note: string | null, show: boolean, method: string | null, amount: number | null = null): Promise<{ ok: boolean }> {
  if (!UUID.test(shopId)) return { ok: false };
  const res = await call<{ ok: boolean }>("admin_plan", {
    p_shop: shopId,
    p_kind: kind,
    p_months: months !== null && Number.isFinite(months) ? Math.round(months) : null,
    // a date picked is the end of that day in Tunis
    p_until: until && /^\d{4}-\d{2}-\d{2}$/.test(until) ? `${until}T23:59:00+01:00` : null,
    p_note: note?.trim().slice(0, 200) || null,
    p_show: show,
    p_method: method && ["cash", "d17", "virement", "versement", "mandat"].includes(method) ? method : null,
    p_amount: amount !== null && Number.isInteger(amount) && amount >= 0 && amount <= 100_000 ? amount : null,
  });
  revalidatePath(`/admin/shops/${shopId}`);
  revalidatePath("/admin/payments");
  return { ok: !!res?.ok };
}

/** The founder's hand on a shop's card: the same rules as the owner's. */
export async function adminSaveCard(shopId: string, goal: number, gift: string, gap: number, move: boolean): Promise<boolean> {
  if (!UUID.test(shopId)) return false;
  const res = await call<{ ok: boolean }>("admin_save_card", { p_shop: shopId, p_goal: Math.round(goal), p_gift: gift.slice(0, 60), p_gap: Math.round(gap), p_move: move });
  revalidatePath(`/admin/shops/${shopId}`);
  return !!res?.ok;
}

/** The founder renames a shop, or changes its kind. */
export async function adminShopEdit(shopId: string, name: string, kind: string): Promise<boolean> {
  if (!UUID.test(shopId)) return false;
  const res = await call<{ ok: boolean }>("admin_shop_edit", { p_shop: shopId, p_name: name.slice(0, 60), p_kind: kind });
  revalidatePath(`/admin/shops/${shopId}`);
  revalidatePath("/admin/shops");
  return !!res?.ok;
}

/** The owner saw what the founder gave: said once. */
export async function planSeen(id: number): Promise<void> {
  if (Number.isInteger(id) && id > 0) await call("plan_seen", { p_id: id });
}

/** The test account, back to a starting point (lib/tester.ts): fresh, new (no shop), or an owner of three days. */
export async function adminTester(mode: "fresh" | "new" | "owner"): Promise<"ok" | "no_account" | "error"> {
  if (!(await getMe())?.admin) return "error";
  const { resetTester } = await import("@/lib/tester");
  const res = await resetTester(mode);
  revalidatePath("/admin/tester");
  return res;
}

/** A piece of news showed to this owner: written on them, once (who saw it, and when). */
export async function newsSeen(id: string): Promise<void> {
  if (UUID.test(id)) await call("news_seen", { p_id: id });
}

/** Its button tapped. */
export async function newsClicked(id: string): Promise<void> {
  if (UUID.test(id)) await call("news_clicked", { p_id: id });
}

/** The shop hands a waiting gift over. */
export async function give(moment: number): Promise<boolean> {
  const res = await call<{ ok: boolean }>("give", { p_moment: moment });
  return !!res?.ok;
}

// ── the founder ────────────────────────────────────────────────────────────
export async function adminPause(id: string, paused: boolean): Promise<boolean> {
  const res = await call<{ ok: boolean }>("admin_set_paused", { p_id: id, p_paused: paused });
  revalidatePath("/admin", "layout");
  return !!res?.ok;
}

/** The founder's word on an account: a test (apart from the real ones, out of the numbers) or a real one again. */
export async function adminSetTester(id: string, on: boolean): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const res = await call<{ ok: boolean }>("admin_set_tester", { p_id: id, p_on: on });
  revalidatePath("/admin", "layout");
  return !!res?.ok;
}

/** The scripts' leftover accounts, swept: how many went (null: it did not work). */
export async function adminSweepRobots(): Promise<number | null> {
  const res = await call<{ ok: boolean; removed?: number }>("admin_sweep_robots");
  revalidatePath("/admin", "layout");
  return res?.ok ? (res.removed ?? 0) : null;
}

export async function adminDelete(id: string) {
  const { data: shop } = UUID.test(id) ? await service().from("shops").select("owner_id").eq("id", id).maybeSingle() : { data: null };
  const res = await call<{ ok: boolean }>("admin_delete_shop", { p_id: id });
  revalidatePath("/admin", "layout");
  if (res?.ok) {
    if (shop) await dropLogos(shop.owner_id as string);
    redirect("/admin");
  }
}

/** An owner's logos go with the shop (or the account): the whole folder in the box. */
async function dropLogos(owner: string) {
  const box = service().storage.from("logos");
  const { data } = await box.list(owner, { limit: 100 });
  if (data?.length) await box.remove(data.map((f) => `${owner}/${f.name}`));
}

/**
 * A piece of news for the owners, published at once: a title, a few words, a
 * picture, and maybe a button that leads to one of the owner's places (or to
 * a web address). It goes to every shop opened before now, once each.
 */
export async function adminNewsSave(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await getMe())?.admin) return { error: t.errNetwork };
  const title = str(fd, "title");
  const body = str(fd, "body").replace(/\r\n/g, "\n");
  const icon = (NEWS_ICONS as readonly string[]).includes(str(fd, "icon")) ? str(fd, "icon") : "sparkles";
  const target = str(fd, "cta_target");
  const href = newsHref(target === "link" ? str(fd, "cta_link") : target);
  const label = str(fd, "cta_label");
  if (title.length < 2 || title.length > 80) return { error: t.aNewsErrTitle, field: "title" };
  if (body.length > 400) return { error: t.aNewsErrBody, field: "body" };
  if (href === null) return { error: t.aNewsErrLink, field: "cta_link" };
  if (href && (label.length < 2 || label.length > 30)) return { error: t.aNewsErrLabel, field: "cta_label" };
  const res = await call<{ ok: boolean; id?: string }>("admin_news_save", {
    p_title: title,
    p_body: body,
    p_icon: icon,
    p_cta_label: href ? label : null,
    p_cta_href: href || null,
    p_only: null,
  });
  if (!res?.ok || !res.id) return { error: t.errNetwork };
  revalidatePath("/admin/news");
  redirect(`/admin/news?id=${res.id}`);
}

/** Stop a piece of news (nobody new sees it), or let it go on. */
export async function adminNewsActive(id: string, active: boolean): Promise<boolean> {
  if (!UUID.test(id)) return false;
  const res = await call<{ ok: boolean }>("admin_news_set_active", { p_id: id, p_active: active });
  revalidatePath("/admin/news");
  return !!res?.ok;
}

/** Delete a piece of news, and who saw it with it. */
export async function adminNewsDelete(id: string) {
  if (!UUID.test(id)) return;
  const res = await call<{ ok: boolean }>("admin_news_delete", { p_id: id });
  revalidatePath("/admin/news");
  if (res?.ok) redirect("/admin/news");
}

/** The founder's settings: the number owners call, the two videos (YouTube links checked here). */
export async function adminSaveSettings(_: FormState, fd: FormData): Promise<FormState> {
  if (!(await getMe())?.admin) return { error: t.errNetwork };
  const keys = ["support_phone", "video1_label", "video1_url", "video2_label", "video2_url", "facebook_url", "instagram_url", "tiktok_url", "meta_pixel", "fb_domain_verify", "clarity_id"] as const;
  const phone = str(fd, "support_phone");
  if (phone && phone.replace(/\D/g, "").length < 8) return { error: t.errPhone, field: "support_phone" };
  for (const [key, host] of [["facebook_url", "facebook.com"], ["instagram_url", "instagram.com"], ["tiktok_url", "tiktok.com"]] as const) {
    const url = str(fd, key);
    if (url && !socialUrl(url, host)) return { error: fill(t.aSocialBad, { site: host }), field: key };
  }
  for (const key of ["video1_url", "video2_url"] as const) {
    const url = str(fd, key);
    if (url && !youtubeId(url)) return { error: t.aVideoBad, field: key };
  }
  // Facebook's pixel: its number, and the domain's code (only what is between content="…")
  if (str(fd, "meta_pixel") && !pixelId(str(fd, "meta_pixel"))) return { error: t.aPixelBad, field: "meta_pixel" };
  if (str(fd, "fb_domain_verify") && !domainCode(str(fd, "fb_domain_verify"))) return { error: t.aFbVerifyBad, field: "fb_domain_verify" };
  // Microsoft Clarity: its project id, or its whole snippet pasted (only the id is kept)
  if (str(fd, "clarity_id") && !clarityId(str(fd, "clarity_id"))) return { error: t.aClarityBad, field: "clarity_id" };
  for (const key of keys) {
    const value = key === "clarity_id" ? (clarityId(str(fd, key)) ?? "") : str(fd, key);
    const res = await call<{ ok: boolean }>("admin_set_setting", { p_key: key, p_value: value });
    if (!res?.ok) return { error: t.errNetwork };
  }
  updateTag("settings");
  revalidatePath("/", "layout");
  return { error: null };
}

/** Someone who is not the founder: the only people the console may change. */
async function changeable(id: string): Promise<boolean> {
  if (!UUID.test(id) || !(await getMe())?.admin) return false;
  const { data } = await service().from("people").select("is_admin").eq("id", id).maybeSingle();
  return !!data && !data.is_admin;
}

/**
 * A forgotten password: the founder gives a new one (eight digits, shown once,
 * sent on WhatsApp), and every phone signed in with the old one is signed out.
 */
export async function adminResetPassword(id: string): Promise<{ ok: boolean; password?: string }> {
  if (!(await changeable(id))) return { ok: false };
  const password = String(randomInt(10_000_000, 100_000_000));
  const sv = service();
  const { error } = await sv.auth.admin.updateUserById(id, { password });
  if (error) {
    console.error("[reset]", error.message);
    return { ok: false };
  }
  await sv.rpc("end_sessions", { p_user: id });
  return { ok: true, password };
}

/** An account goes, with its cards — and its shop, if it has one. */
export async function adminDeletePerson(id: string) {
  if (!(await changeable(id))) return;
  const { error } = await service().auth.admin.deleteUser(id);
  if (error) {
    console.error("[delete person]", error.message);
    return;
  }
  await dropLogos(id);
  revalidatePath("/admin", "layout");
  redirect("/admin?tab=people");
}
