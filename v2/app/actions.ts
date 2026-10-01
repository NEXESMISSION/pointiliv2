"use server";

import { randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { call, db, service } from "@/lib/supabase";
import { getMe, homeOf, type Me } from "@/lib/session";
import { digits, phoneEmail, validPhone } from "@/lib/phone";
import { t } from "@/lib/t";
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
  redirect(owner ? "/shop/setup" : (next ?? "/"));
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
    const res = data as { ok: boolean; error?: string; gift?: boolean; card?: CardView; next_at?: string; shop?: string };
    if (res.ok && res.card) return { kind: "stamped", card: res.card, gift: !!res.gift };
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
export async function openShop(_: FormState, fd: FormData): Promise<FormState> {
  const name = str(fd, "name");
  if (name.length < 2 || name.length > 60) return { error: t.errName, field: "name" };
  const res = await call<{ ok: boolean; error?: string }>("open_shop", { p_name: name, p_kind: str(fd, "kind") });
  if (!res?.ok) return { error: t.errNetwork };
  redirect(inside(str(fd, "next")) ?? "/shop/card");
}

export async function saveCard(_: FormState, fd: FormData): Promise<FormState> {
  const goal = Number(fd.get("goal"));
  const gift = str(fd, "gift");
  if (gift.length < 2) return { error: t.cardGiftPh, field: "gift" };
  const res = await call<{ ok: boolean; error?: string }>("save_card", { p_goal: goal, p_gift: gift, p_color: str(fd, "color") });
  if (!res?.ok) return { error: t.errNetwork };
  revalidatePath("/", "layout");
  redirect(inside(str(fd, "next")) ?? "/shop");
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

export async function adminDelete(id: string) {
  const res = await call<{ ok: boolean }>("admin_delete_shop", { p_id: id });
  revalidatePath("/admin", "layout");
  if (res?.ok) redirect("/admin");
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
  revalidatePath("/admin", "layout");
  redirect("/admin?tab=people");
}
