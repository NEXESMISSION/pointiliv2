"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { call, db, service } from "@/lib/supabase";
import { homeOf, type Me } from "@/lib/session";
import { digits, phoneEmail, validPhone } from "@/lib/phone";
import { t } from "@/lib/t";
import type { CardView, FormState, ScanResult } from "@/lib/types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** Only paths inside the app: a crafted ?next= cannot send anyone elsewhere. */
const inside = (n: string) => (n.startsWith("/") && !n.startsWith("//") && !n.startsWith("/\\") ? n : null);
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;
const HOLD = "p2_hold";

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
  if (password.length < 6) return { error: t.errPassword, field: "password" };

  const admin = service();
  const { data, error } = await admin.auth.admin.createUser({ email: phoneEmail(phone), password, email_confirm: true, app_metadata: { phone: `+216${phone}` } });
  if (error) {
    if (/already|registered|exists/i.test(error.message)) return { error: t.errTaken, field: "phone" };
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

  const supabase = await db();
  const { error } = await supabase.auth.signInWithPassword({ email: phoneEmail(phone), password });
  if (error) return { error: /invalid|credentials/i.test(error.message) ? t.errLogin : t.errNetwork };
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
