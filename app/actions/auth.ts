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
import { message } from "@/lib/messages";
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

function passwordProblem(password: string, confirm?: string): Record<string, string> | null {
  if (password.length < 8) return { password: "Use at least 8 characters." };
  if (password.length > 72) return { password: "Use at most 72 characters." };
  if (confirm !== undefined && password !== confirm) return { confirm: "Passwords don't match." };
  return null;
}

// ── customer registration ─────────────────────────────────────────────────
export async function registerCustomer(_: FormState, fd: FormData): Promise<FormState> {
  const values = { phone: str(fd, "phone") };
  const next = safeNext(fd.get("next"), "/customer");
  const phone = normalizePhone(values.phone);
  const password = String(fd.get("password") ?? "");
  if (!phone) return { fields: { phone: "Enter a valid Tunisian number (8 digits)." }, values, at: now() };
  const pw = passwordProblem(password, String(fd.get("confirm") ?? ""));
  if (pw) return { fields: pw, values, at: now() };

  if (!(await allow(`register:ip:${await ip()}`, 10, 3600)) || !(await allow(`register:${phone}`, 5, 3600))) {
    return { error: message("rate_limited"), values, at: now() };
  }

  const admin = createAdminClient();
  const { error } = await admin.auth.admin.createUser({
    email: phoneAuthEmail(phone),
    password,
    email_confirm: true,
    app_metadata: { phone },
  });
  if (error) {
    if (/already|registered|exists|duplicate|unique/i.test(error.message)) {
      return { fields: { phone: "An account with this number already exists. Log in instead." }, values, at: now() };
    }
    console.error("[register]", error.message);
    return { error: message("network"), values, at: now() };
  }

  const supabase = await createClient();
  const { error: signInError } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
  if (signInError) {
    console.error("[register] sign-in", signInError.message);
    redirect(`/customer/login?next=${encodeURIComponent(next)}`);
  }
  redirect(next);
}

// ── login (customer app and business portal share it) ─────────────────────
export async function login(_: FormState, fd: FormData): Promise<FormState> {
  const raw = str(fd, "identifier") || str(fd, "phone");
  const portal = str(fd, "portal") === "business" ? "business" : "customer";
  const nextRaw = fd.get("next");
  const values = { phone: raw, identifier: raw };
  const isEmail = raw.includes("@");
  const phone = isEmail ? null : normalizePhone(raw);
  const password = String(fd.get("password") ?? "");

  if (!isEmail && !phone) return { fields: { phone: "Enter a valid Tunisian number (8 digits)." }, values, at: now() };
  if (!password) return { fields: { password: "Enter your password." }, values, at: now() };

  const key = isEmail ? raw.toLowerCase() : phone!;
  if (!(await allow(`login:${key}`, 8, 900)) || !(await allow(`login:ip:${await ip()}`, 60, 900))) {
    return { error: message("rate_limited"), values, at: now() };
  }

  let authEmail = phone ? phoneAuthEmail(phone) : raw.toLowerCase();
  if (isEmail) {
    const { data } = await createAdminClient().rpc("auth_lookup", { p_identifier: raw });
    if (data && typeof data === "object" && "auth_email" in data) authEmail = String((data as { auth_email: string }).auth_email);
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: authEmail, password });
  if (error) {
    return { error: isEmail ? "Wrong email or password." : "Wrong phone number or password.", values, at: now() };
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
  const values = { phone: str(fd, "phone") };
  const phone = normalizePhone(values.phone);
  if (!phone) return { step: "phone", fields: { phone: "Enter a valid Tunisian number (8 digits)." }, values, at: now() };
  if (!(await allow(`reset:ip:${await ip()}`, 20, 3600))) return { step: "phone", error: message("rate_limited"), values, at: now() };

  const code = String(randomInt(0, 1_000_000)).padStart(6, "0");
  const { data, error } = await createAdminClient().rpc("reset_request", { p_phone: phone, p_code: code });
  if (error) return { step: "phone", error: message("network"), values, at: now() };
  const res = data as { ok: boolean; sent?: boolean; error?: string; wait_seconds?: number };
  if (!res.ok) {
    if (res.error === "resend_wait") {
      (await cookies()).set(RESET_PHONE, phone, shortCookie);
      return { step: "code", error: `Please wait ${res.wait_seconds ?? 60}s before requesting a new code.`, values, at: now() };
    }
    return { step: "phone", error: message(res.error), values, at: now() };
  }

  let devCode: string | undefined;
  if (res.sent) {
    const outcome = await sendResetCode(phone, code);
    if (!outcome.sent) devCode = outcome.devCode;
  }
  (await cookies()).set(RESET_PHONE, phone, shortCookie);
  // Same answer whether or not the number has an account.
  return { step: "code", ok: true, values, devCode, at: now() };
}

export async function verifyResetCode(_: FormState, fd: FormData): Promise<FormState> {
  const jar = await cookies();
  const phone = jar.get(RESET_PHONE)?.value;
  if (!phone) return { step: "phone", error: "Your session expired. Enter your number again.", at: now() };
  const code = str(fd, "code").replace(/\D/g, "");
  if (code.length !== 6) return { step: "code", fields: { code: "Enter the 6-digit code." }, at: now() };

  const token = randomBytes(32).toString("base64url");
  const { data, error } = await createAdminClient().rpc("reset_verify", { p_phone: phone, p_code: code, p_reset_token: token });
  if (error) return { step: "code", error: message("network"), at: now() };
  const res = data as { ok: boolean; error?: string };
  if (!res.ok) return { step: res.error === "expired" || res.error === "too_many_attempts" ? "phone" : "code", error: message(res.error), at: now() };

  jar.set(RESET_TOKEN, token, shortCookie);
  return { step: "password", ok: true, at: now() };
}

export async function setNewPassword(_: FormState, fd: FormData): Promise<FormState> {
  const jar = await cookies();
  const token = jar.get(RESET_TOKEN)?.value;
  if (!token) return { step: "phone", error: "Your session expired. Start again.", at: now() };
  const password = String(fd.get("password") ?? "");
  const pw = passwordProblem(password, String(fd.get("confirm") ?? ""));
  if (pw) return { step: "password", fields: pw, at: now() };

  const admin = createAdminClient();
  const { data, error } = await admin.rpc("reset_consume", { p_reset_token: token });
  const res = data as { ok: boolean; user_id?: string; auth_email?: string; error?: string } | null;
  if (error || !res?.ok || !res.user_id || !res.auth_email) return { step: "phone", error: "This reset link expired. Start again.", at: now() };

  const { error: upErr } = await admin.auth.admin.updateUserById(res.user_id, { password });
  if (upErr) return { step: "password", error: message("network"), at: now() };

  jar.delete(RESET_TOKEN);
  jar.delete(RESET_PHONE);
  const supabase = await createClient();
  await supabase.auth.signInWithPassword({ email: res.auth_email, password });
  redirect(homeFor(await contextOf(supabase)));
}

// ── signed-in account changes ──────────────────────────────────────────────
export async function changePassword(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data: userData } = await supabase.auth.getUser();
  const user = userData.user;
  if (!user?.email) redirect("/customer/login");

  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  const pw = passwordProblem(password, String(fd.get("confirm") ?? ""));
  if (pw) return { fields: pw, at: now() };
  if (!(await allow(`pwchange:${user.id}`, 5, 900))) return { error: message("rate_limited"), at: now() };

  const { error: wrong } = await supabase.auth.signInWithPassword({ email: user.email, password: current });
  if (wrong) return { fields: { current: "Your current password is not correct." }, at: now() };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return { error: /different|same/i.test(error.message) ? "Choose a password different from the current one." : message("network"), at: now() };
  return { ok: true, message: "Password changed", at: now() };
}

export async function updateName(_: FormState, fd: FormData): Promise<FormState> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("update_my_profile", { p_full_name: str(fd, "full_name") });
  if (error || !(data as { ok: boolean })?.ok) return { ok: false, message: message("network"), at: now() };
  return { ok: true, message: "Saved", at: now() };
}

// ── merchant registration ─────────────────────────────────────────────────
export async function registerBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const values = {
    business_name: str(fd, "business_name"),
    full_name: str(fd, "full_name"),
    phone: str(fd, "phone"),
    email: str(fd, "email").toLowerCase(),
    category: str(fd, "category") || "cafe",
  };
  const fields: Record<string, string> = {};
  if (values.business_name.length < 2 || values.business_name.length > 60) fields.business_name = "Enter your business name.";
  if (values.full_name.length < 2) fields.full_name = "Enter your name.";
  if (values.email && !/^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(values.email)) fields.email = "Enter a valid email or leave it empty.";

  const existing = await getContext();
  const supabase = await createClient();

  if (!existing) {
    const phone = normalizePhone(values.phone);
    if (!phone) fields.phone = "Enter a valid Tunisian number (8 digits).";
    const password = String(fd.get("password") ?? "");
    const pw = passwordProblem(password);
    if (pw) Object.assign(fields, pw);
    if (Object.keys(fields).length) return { fields, values, at: now() };

    if (!(await allow(`register:ip:${await ip()}`, 10, 3600))) return { error: message("rate_limited"), values, at: now() };

    const admin = createAdminClient();
    if (values.email) {
      const { data: taken } = await admin.rpc("auth_lookup", { p_identifier: values.email });
      if (taken) return { fields: { email: "This email is already used by another account." }, values, at: now() };
    }
    const { error } = await admin.auth.admin.createUser({
      email: phoneAuthEmail(phone!),
      password,
      email_confirm: true,
      app_metadata: { phone, full_name: values.full_name, contact_email: values.email || null },
    });
    if (error) {
      if (/already|registered|exists|duplicate|unique/i.test(error.message)) {
        return { error: "This phone number already has a Pointili account. Log in first, then create your business.", values, at: now() };
      }
      console.error("[register-business]", error.message);
      return { error: message("network"), values, at: now() };
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone!), password });
    if (signInError) return { error: message("network"), values, at: now() };
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
    return { error: message(res?.error ?? "network"), values, at: now() };
  }
  redirect("/loyalty?welcome=1");
}
