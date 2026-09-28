"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import { normalizePhone, phoneAuthEmail } from "@/lib/phone";

type Result = { ok: boolean; message: string; at: number; secret?: string };

async function call(fn: string, args: Record<string, unknown>, success: string): Promise<Result> {
  // Every admin_* function re-checks the role in the database with auth.uid().
  const supabase = await createClient();
  const { msg } = await getI18n();
  const { data, error } = await supabase.rpc(fn, args);
  const res = data as { ok: boolean; error?: string } | null;
  revalidatePath("/admin", "layout");
  if (error || !res?.ok) return { ok: false, message: msg(res?.error ?? "network"), at: Date.now() };
  return { ok: true, message: success, at: Date.now() };
}

export async function setBusinessStatus(id: string, status: "active" | "suspended") {
  const { t } = await getI18n();
  const r = t.admin.results;
  return call("admin_set_business_status", { p_id: id, p_status: status }, status === "active" ? r.businessActivated : r.businessSuspended);
}

/** Any plan until any date, at any price — the founder's own words for what a shop has. */
export async function setSubscription(businessId: string, plan: "trial" | "six_month" | "yearly", expiresAt: string, price: number | null, method: string) {
  const { t } = await getI18n();
  return call(
    "admin_set_subscription",
    { p_business: businessId, p_plan: plan, p_expires_at: expiresAt, p_price: price, p_method: method },
    t.admin.results.planActivated,
  );
}

export async function extendSubscription(businessId: string, days: number) {
  const { t } = await getI18n();
  return call("admin_extend_subscription", { p_business: businessId, p_days: days }, t.admin.results.extended);
}

export async function cancelSubscription(id: string) {
  const { t } = await getI18n();
  return call("admin_cancel_subscription", { p_id: id }, t.admin.results.subscriptionCancelled);
}

export async function confirmPayment(id: string) {
  const { t } = await getI18n();
  return call("admin_confirm_payment", { p_id: id }, t.admin.results.paymentConfirmed);
}

export async function rejectPayment(id: string) {
  const { t } = await getI18n();
  return call("admin_reject_payment", { p_id: id }, t.admin.results.paymentFailed);
}

export async function runCleanup() {
  const { t } = await getI18n();
  return call("admin_cleanup", {}, t.admin.results.cleanupDone);
}

/**
 * Open a shop for somebody, at their counter, in one step: the auth user (only
 * the service role may mint one) with the password the founder typed, then the
 * business with its 30-day trial — or, when he picked a paid plan, that plan
 * from today, paid in cash at the install. There is no e-mail to send anything
 * to: the founder reads the phone and password to the owner, who is right there.
 *
 * THE TRAP: if the business insert fails the auth user is already made, and an
 * account with no shop cannot be created again (the phone is taken). So a
 * failure takes the user back out with it.
 */
export async function createBusinessAccount(fd: FormData): Promise<Result> {
  await requireAdmin();
  const { t, msg } = await getI18n();
  const phone = normalizePhone(String(fd.get("phone") ?? ""));
  const name = String(fd.get("name") ?? "").trim();
  const ownerName = String(fd.get("owner_name") ?? "").trim();
  const category = String(fd.get("category") ?? "cafe");
  const password = String(fd.get("password") ?? "");
  const plan = String(fd.get("plan") ?? "trial");

  if (name.length < 2) return { ok: false, message: msg("invalid_name"), at: Date.now() };
  if (!phone) return { ok: false, message: msg("invalid_phone"), at: Date.now() };
  if (password.length < 8 || password.length > 72) return { ok: false, message: t.auth.errors.passwordShort, at: Date.now() };
  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: phoneAuthEmail(phone),
    password,
    email_confirm: true,
    app_metadata: { phone, full_name: ownerName },
  });
  if (error || !created?.user) {
    const taken = /already|registered|exists|duplicate/i.test(error?.message ?? "");
    return { ok: false, message: taken ? t.admin.results.phoneTaken : msg("network"), at: Date.now() };
  }

  const supabase = await createClient();
  const { data, error: rpcError } = await supabase.rpc("admin_create_business", {
    p_owner: created.user.id,
    p_name: name,
    p_category: category,
    p_owner_name: ownerName,
  });
  const res = data as { ok: boolean; error?: string } | null;
  if (rpcError || !res?.ok) {
    // do not leave an account behind that can never be given a shop
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: msg(res?.error ?? "network"), at: Date.now() };
  }

  // a paid plan starts today; the trial the shop was born with ends with it
  if (plan === "six_month" || plan === "yearly") {
    const until = new Date();
    until.setMonth(until.getMonth() + (plan === "yearly" ? 12 : 6));
    const { data: sub } = await supabase.rpc("admin_set_subscription", {
      p_business: (res as { business_id?: string }).business_id,
      p_plan: plan,
      p_expires_at: until.toISOString(),
      p_price: null,
      p_method: "cash",
    });
    if (!(sub as { ok?: boolean } | null)?.ok) console.error("[create business] plan", sub);
  }

  revalidatePath("/admin", "layout");
  return { ok: true, message: t.admin.results.businessCreated, secret: password, at: Date.now() };
}

/** Support fallback when a customer cannot receive an SMS: a one-time temporary password, shown once. */
export async function resetUserPassword(userId: string): Promise<Result> {
  await requireAdmin();
  const { t, msg } = await getI18n();
  const temp = randomBytes(9).toString("base64url").slice(0, 10);
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: temp });
  if (error) return { ok: false, message: msg("network"), at: Date.now() };
  return { ok: true, message: t.admin.results.tempPasswordCreated, secret: temp, at: Date.now() };
}
