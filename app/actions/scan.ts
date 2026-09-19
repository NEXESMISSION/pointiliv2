"use server";

import { randomBytes } from "node:crypto";
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n/server";
import { allow } from "@/lib/limit";
import { normalizePhone, phoneAuthEmail } from "@/lib/phone";
import { getContext } from "@/lib/session";
import { clientIp, TOKEN_RE } from "@/lib/url";
import type { FormState } from "./types";
import type { StampResult } from "@/lib/types";

export type ScanOutcome =
  | { kind: "stamped"; result: Extract<StampResult, { ok: true }> }
  | { kind: "error"; code: string; result?: StampResult }
  | { kind: "auth"; businessName: string | null };

const CLAIM_COOKIE = "pd_claim";

/**
 * The whole scan, server-side:
 *  · signed in  → collect_stamp (atomic, replay-proof) and return the card.
 *  · signed out → reserve the token for THIS browser (httpOnly claim cookie) so
 *    the stamp survives registration, then ask the person to sign up / log in.
 * Invoked by the scan page with POST (never on GET), so link previews and
 * prefetchers cannot consume a token.
 */
export async function processScan(token: string): Promise<ScanOutcome> {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return { kind: "error", code: "invalid" };

  const jar = await cookies();
  const stored = jar.get(CLAIM_COOKIE)?.value ?? "";
  const dot = stored.lastIndexOf(".");
  const storedToken = dot > 0 ? stored.slice(0, dot) : "";
  const storedClaim = dot > 0 ? stored.slice(dot + 1) : "";
  const claim = storedToken === token ? storedClaim : null;

  const ctx = await getContext();
  if (ctx) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("collect_stamp", { p_token: token, p_claim: claim });
    if (error || !data) {
      console.error("[scan] collect_stamp", error?.message);
      return { kind: "error", code: "network" };
    }
    const result = data as StampResult;
    if (claim && result.ok !== undefined && !(result.ok === false && result.error === "rate_limited")) {
      jar.delete(CLAIM_COOKIE);
    }
    if (result.ok) return { kind: "stamped", result };
    return { kind: "error", code: result.error, result };
  }

  const newClaim = claim ?? randomBytes(32).toString("base64url");
  const { data, error } = await createAdminClient().rpc("claim_qr_token", { p_token: token, p_claim: newClaim });
  if (error || !data) {
    console.error("[scan] claim", error?.message);
    return { kind: "error", code: "network" };
  }
  const res = data as { ok: boolean; error?: string; business_name?: string };
  if (!res.ok) return { kind: "error", code: res.error ?? "invalid" };

  jar.set(CLAIM_COOKIE, `${token}.${newClaim}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60,
  });
  return { kind: "auth", businessName: res.business_name ?? null };
}

/**
 * One screen instead of two: the person types a number and a password and gets
 * the stamp. No account yet? It is created here — the choice between "sign up"
 * and "log in" was the step people got stuck on at the counter.
 */
export async function stampSignIn(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const at = Date.now();
  const token = String(fd.get("token") ?? "");
  const values = { phone: String(fd.get("phone") ?? "").trim() };
  const phone = normalizePhone(values.phone);
  const password = String(fd.get("password") ?? "");

  if (!TOKEN_RE.test(token)) return { error: msg("invalid"), values, at };
  if (!phone) return { fields: { phone: t.auth.errors.invalidPhone }, values, at };
  if (password.length < 8) return { fields: { password: t.auth.errors.passwordShort }, values, at };
  if (password.length > 72) return { fields: { password: t.auth.errors.passwordLong }, values, at };

  const ipKey = clientIp(await headers()) ?? "unknown";
  if (!(await allow(`stamp-signin:${phone}`, 8, 900)) || !(await allow(`stamp-signin:ip:${ipKey}`, 40, 900))) {
    return { error: msg("rate_limited"), values, at };
  }

  const admin = createAdminClient();
  const supabase = await createClient();
  const { data: found } = await admin.rpc("auth_lookup", { p_identifier: phone });
  const exists = !!(found && typeof found === "object" && "user_id" in found && (found as { user_id: string | null }).user_id);

  if (exists) {
    const { error } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
    if (error) return { fields: { password: t.scan.signIn.wrongPassword }, values, at };
  } else {
    const { error } = await admin.auth.admin.createUser({ email: phoneAuthEmail(phone), password, email_confirm: true, app_metadata: { phone } });
    if (error) {
      console.error("[scan] create", error.message);
      return { error: msg("network"), values, at };
    }
    const { error: signInError } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
    if (signInError) {
      console.error("[scan] sign-in", signInError.message);
      return { error: msg("network"), values, at };
    }
  }
  redirect(`/scan/${token}`);
}
