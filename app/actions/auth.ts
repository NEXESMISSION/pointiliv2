"use server";

import { randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { after } from "next/server";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneAuthEmail } from "@/lib/phone";
import { clientIp, safeNext } from "@/lib/url";
import { allow } from "@/lib/limit";
import { getI18n } from "@/lib/i18n/server";
import { sendResetCode } from "@/lib/sms";
import { homeFor } from "@/lib/session";
import { recordAuthEvent } from "@/lib/analytics/server";
import type { SessionContext } from "@/lib/types";
import type { FormState } from "./types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const now = () => Date.now();

async function ip() {
  return clientIp(await headers()) ?? "unknown";
}

async function contextOf(supabase: SupabaseClient): Promise<SessionContext | null> {
  const { data } = await supabase.rpc("session_context");
  return (data as SessionContext) ?? null;
}

/** The console's traffic page counts sign-ins and sign-ups; written after the response, never in its way. */
async function track(kind: "login" | "signup", userId: string | undefined, path: string) {
  if (!userId) return;
  const jar = await cookies();
  const h = await headers();
  after(() => recordAuthEvent(kind, userId, path, jar, h));
}

type AuthErrors = Awaited<ReturnType<typeof getI18n>>["t"]["auth"]["errors"];

function passwordProblem(e: AuthErrors, password: string, confirm?: string): Record<string, string> | null {
  if (password.length < 8) return { password: e.passwordShort };
  if (password.length > 72) return { password: e.passwordLong };
  if (confirm !== undefined && password !== confirm) return { confirm: e.passwordMismatch };
  return null;
}

// ── customer registration ─────────────────────────────────────────────────
export async function registerCustomer(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const values = { phone: str(fd, "phone"), full_name: str(fd, "full_name") };
  const next = safeNext(fd.get("next"), "/customer");
  const phone = normalizePhone(values.phone);
  const password = String(fd.get("password") ?? "");
  const fullName = values.full_name.trim().slice(0, 80);
  // Checked in the order the eye meets the fields, so the first complaint is
  // about the first box.
  if (fullName.length < 2) return { fields: { full_name: t.auth.errors.nameRequired }, values, at: now() };
  if (!phone) return { fields: { phone: t.auth.errors.invalidPhone }, values, at: now() };
  const pw = passwordProblem(t.auth.errors, password, String(fd.get("confirm") ?? ""));
  if (pw) return { fields: pw, values, at: now() };

  if (!(await allow(`register:ip:${await ip()}`, 10, 3600)) || !(await allow(`register:${phone}`, 5, 3600))) {
    return { error: msg("rate_limited"), values, at: now() };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: phoneAuthEmail(phone),
    password,
    email_confirm: true,
    // handle_new_user() reads these: app_metadata is the only place a browser
    // cannot write, which is why the name travels here and not in a column.
    app_metadata: { phone, full_name: fullName },
  });
  const supabase = await createClient();
  if (error) {
    if (/already|registered|exists|duplicate|unique/i.test(error.message)) {
      // A sign-up that died halfway leaves the account behind. If this password
      // opens it, finish the job instead of sending the person to a dead end.
      const { data: resumed, error: resume } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
      if (!resume) {
        await track("login", resumed.user?.id, "/customer/register");
        // An account made before the name was asked for, or a sign-up that died
        // before the trigger ran: take the name now that it has been typed.
        // supabase returns errors rather than throwing them; a name that fails
        // to save must not cost this person the sign-in they just completed.
        await supabase.rpc("update_my_profile", { p_full_name: fullName });
        redirect(next);
      }
      return { fields: { phone: t.auth.errors.phoneTaken }, values, at: now() };
    }
    console.error("[register]", error.message);
    return { error: msg("network"), values, at: now() };
  }

  const { data: signedIn, error: signInError } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
  await track("signup", signedIn?.user?.id, "/customer/register");
  if (signInError) {
    console.error("[register] sign-in", signInError.message);
    redirect(`/customer/login?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

// ── login (customer app and business portal share it) ─────────────────────
export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const raw = str(fd, "identifier") || str(fd, "phone");
  const portal = str(fd, "portal") === "business" ? "business" : "customer";
  const nextRaw = fd.get("next");
  const values = { phone: raw, identifier: raw };
  const isEmail = raw.includes("@");
  const phone = isEmail ? null : normalizePhone(raw);
  const password = String(fd.get("password") ?? "");

  if (!isEmail && !phone) return { fields: { phone: t.auth.errors.invalidPhone }, values, at: now() };
  if (!password) return { fields: { password: t.auth.errors.enterPassword }, values, at: now() };

  const key = isEmail ? raw.toLowerCase() : phone!;
  if (!(await allow(`login:${key}`, 8, 900)) || !(await allow(`login:ip:${await ip()}`, 60, 900))) {
    return { error: msg("rate_limited"), values, at: now() };
  }

  let authEmail = phone ? phoneAuthEmail(phone) : raw.toLowerCase();
  if (isEmail) {
    const { data } = await createAdminClient().rpc("auth_lookup", { p_identifier: raw });
    if (data && typeof data === "object" && "auth_email" in data) authEmail = String((data as { auth_email: string }).auth_email);
  }

  const supabase = await createClient();
  const { data: signed, error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
  if (error) {
    return { error: isEmail ? t.auth.errors.wrongEmail : t.auth.errors.wrongPhone, values, at: now() };
  }
  await track("login", signed.user?.id, portal === "business" ? "/login" : "/customer/login");

  const ctx = await contextOf(supabase);
  // The shop login only opens shops. Owners never create one here — Pointili
  // opens every shop from the console — so an account without one (usually a
  // customer at the wrong door) is told so instead of being sent anywhere.
  if (portal === "business" && ctx && !ctx.business && ctx.user.role !== "admin") {
    return { error: t.auth.errors.noShop, values, at: now() };
  }
  let dest = homeFor(ctx);
  if (typeof nextRaw === "string" && nextRaw) dest = safeNext(nextRaw, dest);
  redirect(dest);
}

export async function logout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/");
}

// ── password recovery (phone + SMS code) ──────────────────────────────────
const RESET_PHONE = "pd_reset_phone";
const RESET_TOKEN = "pd_reset_token";
const shortCookie = { httpOnly: true, secure: process.env.NODE_ENV === "production", sameSite: "lax" as const, path: "/", maxAge: 15 * 60 };

export async function requestResetCode(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg, fill } = await getI18n();
  const values = { phone: str(fd, "phone") };
  const phone = normalizePhone(values.phone);
  if (!phone) return { step: "phone", fields: { phone: t.auth.errors.invalidPhone }, values, at: now() };
  if (!(await allow(`reset:ip:${await ip()}`, 20, 3600))) return { step: "phone", error: msg("rate_limited"), values, at: now() };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { data, error } = await createAdminClient().rpc("reset_request", { p_phone: phone, p_code: code });
  if (error) return { step: "phone", error: msg("network"), values, at: now() };
  const res = data as { ok: boolean; sent?: boolean; error?: string; wait_seconds?: number };
  if (!res.ok) {
    if (res.error === "resend_wait") {
      (await cookies()).set(RESET_PHONE, phone, shortCookie);
      return { step: "code", error: fill(t.auth.errors.resendWait, { s: res.wait_seconds ?? 60 }), values, at: now() };
    }
    return { step: "phone", error: msg(res.error), values, at: now() };
  }

  let devCode: string | undefined;
  if (res.sent) {
    const outcome = await sendResetCode(phone, code, fill(t.auth.sms.resetCode, { code }));
    if (!outcome.sent) devCode = outcome.devCode;
  }
  (await cookies()).set(RESET_PHONE, phone, shortCookie);
  // Same answer whether or not the number has an account.
  return { step: "code", ok: true, values, devCode, at: now() };
}

export async function verifyResetCode(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const jar = await cookies();
  const phone = jar.get(RESET_PHONE)?.value;
  if (!phone) return { step: "phone", error: t.auth.errors.sessionExpired, at: now() };
  const code = str(fd, "code").replace(/\D/g, "");
  if (code.length !== 6) return { step: "code", fields: { code: t.auth.errors.codeLength }, at: now() };

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await createAdminClient().rpc("reset_verify", { p_phone: phone, p_code: code, p_reset_token: token });
  if (error) return { step: "code", error: msg("network"), at: now() };
  const res = data as { ok: boolean; error?: string };
  if (!res.ok) return { step: res.error === "expired" || res.error === "too_many_attempts" ? "phone" : "code", error: msg(res.error), at: now() };

  jar.set(RESET_TOKEN, token, shortCookie);
  return { step: "password", ok: true, at: now() };
}

export async function setNewPassword(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const jar = await cookies();
  const token = jar.get(RESET_TOKEN)?.value;
  if (!token) return { step: "phone", error: t.auth.errors.sessionExpiredRestart, at: now() };
  const password = String(fd.get("password") ?? "");
  const pw = passwordProblem(t.auth.errors, password, String(fd.get("confirm") ?? ""));
  if (pw) return { step: "password", fields: pw, at: now() };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reset_consume", { p_reset_token: token });
  const res = data as { ok: boolean; user_id?: string; auth_email?: string; error?: string } | null;
  if (error || !res?.ok || !res.user_id || !res.auth_email) return { step: "phone", error: t.auth.errors.resetExpired, at: now() };

  const { error: upErr } = await admin.auth.admin.updateUserById(res.user_id, { password });
  if (upErr) return { step: "password", error: msg("network"), at: now() };

  jar.delete(RESET_TOKEN);
  jar.delete(RESET_PHONE);
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: res.auth_email, password });
  redirect(homeFor(await contextOf(supabase)));
}

// ── signed-in account changes ──────────────────────────────────────────────
export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) redirect("/customer/login");

  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  const pw = passwordProblem(t.auth.errors, password, String(fd.get("confirm") ?? ""));
  if (pw) return { fields: pw, at: now() };
  if (!(await allow(`pwchange:${user.id}`, 5, 900))) return { error: msg("rate_limited"), at: now() };

  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { fields: { current: t.auth.errors.currentWrong }, at: now() };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: /different|same/i.test(error.message) ? t.auth.errors.samePassword : msg("network"), at: now() };
  return { ok: true, message: t.auth.changePassword.changed, at: now() };
}

export async function updateName(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_my_profile", { p_full_name: str(fd, "full_name") });
  if (error || !(data as { ok: boolean })?.ok) return { ok: false, message: msg("network"), at: now() };
  return { ok: true, message: t.common.saved, at: now() };
}
