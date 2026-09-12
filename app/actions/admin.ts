"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";

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

export async function grantPlan(businessId: string, plan: "six_month" | "yearly", method: string) {
  const { t } = await getI18n();
  return call("admin_grant_plan", { p_business: businessId, p_plan: plan, p_method: method }, t.admin.results.planActivated);
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

/** Support fallback when a customer cannot receive an SMS: a one-time temporary password, shown once. */
export async function resetUserPassword(userId: string): Promise<Result> {
  await requireAdmin();
  const { t, msg } = await getI18n();
  const temp = randomBytes(9).toString("base64url").slice(0, 10);
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: temp });
  if (error) return { ok: false, message: msg("network"), at: Date.now() };
  return { ok: true, message: t.admin.results.tempPasswordCreated, secret: temp, at: Date.now() };
}
