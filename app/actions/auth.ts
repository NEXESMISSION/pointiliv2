"use server";

import { randomBytes, randomInt } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import type { SupabaseClient } from "@supabase/supabase-js";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { normalizePhone, phoneAuthEmail } from "@/lib/phone";
import { clientIp, safeNext } from "@/lib/url";
import { allow } from "@/lib/limit";
import { getI18n } from "@/lib/i18n/server";
import { sendResetCode } from "@/lib/sms";
import { getContext, homeFor } from "@/lib/session";
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
  const values = { phone: str(fd, "phone") };
  const next = safeNext(fd.get("next"), "/customer");
  const phone = normalizePhone(values.phone);
  const password = String(fd.get("password") ?? "");
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
    app_metadata: { phone },
  });
  const supabase = await createClient();
  if (error) {
    if (/already|registered|exists|duplicate|unique/i.test(error.message)) {
      // A sign-up that died halfway leaves the account behind. If this password
      // opens it, finish the job instead of sending the person to a dead end.
      const { error: resume } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
      if (!resume) redirect(next);
      return { fields: { phone: t.auth.errors.phoneTaken }, values, at: now() };
    }
    console.error("[register]", error.message);
    return { error: msg("network"), values, at: now() };
  }

  const { error: signInError } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
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
  const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
  if (error) {
    return { error: isEmail ? t.auth.errors.wrongEmail : t.auth.errors.wrongPhone, values, at: now() };
  }

  const ctx = await contextOf(supabase);
  let dest = homeFor(ctx);
  if (portal === "business" && ctx && !ctx.business && ctx.user.role !== "admin") dest = "/register";
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

// ── merchant registration ─────────────────────────────────────────────────
export async function registerBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const values = {
    business_name: str(fd, "business_name"),
    full_name: str(fd, "full_name"),
    phone: str(fd, "phone"),
    email: str(fd, "email").toLowerCase(),
    category: str(fd, "category") || "cafe",
  };
  const fields: Record<string, string> = {};
  if (values.business_name.length < 2 || values.business_name.length > 60) fields.business_name = t.auth.errors.businessName;
  if (values.full_name.length < 2) fields.full_name = t.auth.errors.yourName;
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) fields.email = t.auth.errors.invalidEmail;

  const existing = await getContext();
  const supabase = await createClient();

  if (!existing) {
    const phone = normalizePhone(values.phone);
    if (!phone) fields.phone = t.auth.errors.invalidPhone;
    const password = String(fd.get("password") ?? "");
    const pw = passwordProblem(t.auth.errors, password);
    if (pw) Object.assign(fields, pw);
    if (Object.keys(fields).length) return { fields, values, at: now() };

    if (!(await allow(`register:ip:${await ip()}`, 10, 3600))) return { error: msg("rate_limited"), values, at: now() };

    const admin = createAdminClient();
    if (values.email) {
      const { data: taken } = await admin.rpc("auth_lookup", { p_identifier: values.email });
      if (taken) return { fields: { email: t.auth.errors.emailTaken }, values, at: now() };
    }
    const { error } = await admin.auth.admin.createUser({
      email: phoneAuthEmail(phone!),
      password,
      email_confirm: true,
      app_metadata: { phone, full_name: values.full_name, contact_email: values.email || null },
    });
    if (error) {
      if (!/already|registered|exists|duplicate|unique/i.test(error.message)) {
        console.error("[register-business]", error.message);
        return { error: msg("network"), values, at: now() };
      }
      // The account exists — often a sign-up that died before the business was
      // created. If this password opens it, carry on and finish the business.
      const { error: resume } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone!), password });
      // `data: "login"` tells the form to offer a sign-in link beside the message.
      if (resume) return { error: t.auth.errors.phoneTakenBusiness, data: "login", values, at: now() };
    } else {
      const { error: signInError } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone!), password });
      if (signInError) return { error: msg("network"), values, at: now() };
    }
  } else if (Object.keys(fields).length) {
    return { fields, values, at: now() };
  }

  const { data, error } = await supabase.rpc("create_business", {
    p_name: values.business_name,
    p_category: values.category,
    p_owner_name: values.full_name,
    p_phone: null,
    p_email: values.email || null,
  });
  const res = data as { ok: boolean; error?: string } | null;
  if (error || !res?.ok) {
    if (res?.error === "already_has_business") redirect("/dashboard");
    return { error: msg(res?.error ?? "network"), values, at: now() };
  }
  redirect("/loyalty?welcome=1");
}
