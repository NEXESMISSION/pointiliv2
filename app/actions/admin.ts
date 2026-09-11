"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { requireAdmin } from "@/lib/session";
import { message } from "@/lib/messages";

type Result = { ok: boolean; message: string; at: number; secret?: string };

async function call(fn: string, args: Record<string, unknown>, success: string): Promise<Result> {
  // Every admin_* function re-checks the role in the database with auth.uid().
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  const res = data as { ok: boolean; error?: string } | null;
  revalidatePath("/admin", "layout");
  if (error || !res?.ok) return { ok: false, message: message(res?.error ?? "network"), at: Date.now() };
  return { ok: true, message: success, at: Date.now() };
}

export async function setBusinessStatus(id: string, status: "active" | "suspended") {
  return call("admin_set_business_status", { p_id: id, p_status: status }, status === "active" ? "Business activated" : "Business suspended");
}

export async function grantPlan(businessId: string, plan: "six_month" | "yearly", method: string) {
  return call("admin_grant_plan", { p_business: businessId, p_plan: plan, p_method: method }, "Plan activated");
}

export async function cancelSubscription(id: string) {
  return call("admin_cancel_subscription", { p_id: id }, "Subscription cancelled");
}

export async function confirmPayment(id: string) {
  return call("admin_confirm_payment", { p_id: id }, "Payment confirmed — plan activated");
}

export async function rejectPayment(id: string) {
  return call("admin_reject_payment", { p_id: id }, "Payment marked as failed");
}

export async function runCleanup() {
  return call("admin_cleanup", {}, "Cleanup done");
}

/** Support fallback when a customer cannot receive an SMS: a one-time temporary password, shown once. */
export async function resetUserPassword(userId: string): Promise<Result> {
  await requireAdmin();
  const temp = randomBytes(9).toString("base64url").slice(0, 10);
  const { error } = await createAdminClient().auth.admin.updateUserById(userId, { password: temp });
  if (error) return { ok: false, message: message("network"), at: Date.now() };
  return { ok: true, message: "Temporary password created", secret: temp, at: Date.now() };
}
