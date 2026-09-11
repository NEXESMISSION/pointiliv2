"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/lib/session";
import { message } from "@/lib/messages";
import type { RedemptionView } from "@/lib/types";
import type { FormState } from "./types";

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string) => Number.parseInt(String(fd.get(k) ?? ""), 10);
const now = () => Date.now();

type RpcResult = { ok: boolean; error?: string; [k: string]: unknown };

async function call(fn: string, args: Record<string, unknown>): Promise<RpcResult> {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc(fn, args);
  if (error) {
    console.error(`[${fn}]`, error.message);
    return { ok: false, error: /not_merchant|not_authenticated/.test(error.message) ? "not_merchant" : "network" };
  }
  return data as RpcResult;
}

export async function saveLoyaltyCard(_: FormState, fd: FormData): Promise<FormState> {
  const values = Object.fromEntries(["name", "description", "stamps_required", "reward_name", "reward_description", "color", "icon", "cooldown_minutes"].map((k) => [k, str(fd, k)]));
  const res = await call("save_loyalty_card", {
    p_name: values.name,
    p_description: values.description,
    p_stamps_required: int(fd, "stamps_required"),
    p_reward_name: values.reward_name,
    p_reward_description: values.reward_description,
    p_color: values.color,
    p_icon: values.icon,
    p_cooldown_minutes: int(fd, "cooldown_minutes"),
  });
  if (!res.ok) return { ok: false, error: message(res.error), values, at: now() };
  revalidatePath("/", "layout");
  if (res.created) redirect("/dashboard?ready=1");
  return { ok: true, message: "Loyalty card saved", values, at: now() };
}

export async function saveReward(_: FormState, fd: FormData): Promise<FormState> {
  const id = str(fd, "id") || null;
  const values = { name: str(fd, "name"), description: str(fd, "description"), stamps_required: str(fd, "stamps_required") };
  const res = await call("save_reward", {
    p_id: id,
    p_name: values.name,
    p_description: values.description,
    p_stamps_required: int(fd, "stamps_required"),
    p_active: fd.get("active") === null ? true : fd.get("active") === "on" || fd.get("active") === "true",
  });
  if (!res.ok) return { ok: false, error: message(res.error), values, at: now() };
  revalidatePath("/rewards");
  redirect("/rewards");
}

export async function setRewardActive(id: string, active: boolean, reward: { name: string; description: string | null; stamps_required: number }) {
  const res = await call("save_reward", { p_id: id, p_name: reward.name, p_description: reward.description ?? "", p_stamps_required: reward.stamps_required, p_active: active });
  revalidatePath("/rewards");
  return { ok: res.ok, message: res.ok ? (active ? "Reward activated" : "Reward paused") : message(res.error), at: now() };
}

export async function updateBusiness(_: FormState, fd: FormData): Promise<FormState> {
  const res = await call("update_business", {
    p_name: str(fd, "name"),
    p_category: str(fd, "category"),
    p_phone: str(fd, "phone"),
    p_address: str(fd, "address"),
  });
  if (!res.ok) return { ok: false, message: message(res.error), at: now() };
  revalidatePath("/", "layout");
  return { ok: true, message: "Business details saved", at: now() };
}

const LOGO_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };

export async function uploadLogo(_: FormState, fd: FormData): Promise<FormState> {
  const ctx = await getContext();
  if (!ctx?.business || ctx.member_role !== "owner") return { ok: false, message: "Only the owner can change the logo.", at: now() };
  const file = fd.get("logo");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image first.", at: now() };
  const ext = LOGO_TYPES[file.type];
  if (!ext) return { ok: false, message: "Use a PNG, JPG or WebP image.", at: now() };
  if (file.size > 1024 * 1024) return { ok: false, message: "The image must be under 1 MB.", at: now() };

  const admin = createAdminClient();
  const path = `${ctx.business.id}/logo-${Date.now()}.${ext}`;
  const { error } = await admin.storage.from("logos").upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, upsert: false });
  if (error) {
    console.error("[logo]", error.message);
    return { ok: false, message: message("network"), at: now() };
  }
  const url = admin.storage.from("logos").getPublicUrl(path).data.publicUrl;
  // Identity and ownership were verified above through the user's own session.
  await admin.from("businesses").update({ logo_url: url }).eq("id", ctx.business.id);
  revalidatePath("/", "layout");
  return { ok: true, message: "Logo updated", at: now() };
}

export async function removeLogo() {
  const ctx = await getContext();
  if (!ctx?.business || ctx.member_role !== "owner") return;
  await createAdminClient().from("businesses").update({ logo_url: null }).eq("id", ctx.business.id);
  revalidatePath("/", "layout");
}

export async function requestPlan(_: FormState, fd: FormData): Promise<FormState> {
  const res = await call("request_plan", { p_plan: str(fd, "plan"), p_method: str(fd, "method") });
  if (!res.ok) return { ok: false, message: message(res.error), at: now() };
  revalidatePath("/billing");
  return { ok: true, message: `Request sent — reference ${res.payment_reference}`, at: now() };
}

export async function cancelPlanRequest(id: string) {
  await call("cancel_plan_request", { p_id: id });
  revalidatePath("/billing");
}

export async function lookupRedemption(_: FormState, fd: FormData): Promise<FormState> {
  const code = str(fd, "code").replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, fields: { code: "Enter the 6-digit code from the customer's screen." }, values: { code }, at: now() };
  const res = await call("merchant_lookup_redemption", { p_code: code });
  if (!res.ok) {
    const text = res.error === "not_found" ? "No active reward request with this code." : res.error === "expired" ? "This code has expired. Ask the customer to tap “Use reward” again." : message(res.error);
    return { ok: false, error: text, values: { code }, at: now() };
  }
  return { ok: true, data: res.redemption as RedemptionView, values: { code }, at: now() };
}

export async function confirmRedemption(id: string): Promise<{ ok: boolean; message: string; redemption?: RedemptionView }> {
  const res = await call("merchant_confirm_redemption", { p_id: id });
  revalidatePath("/redeem");
  revalidatePath("/dashboard");
  if (!res.ok) return { ok: false, message: message(res.error) };
  return { ok: true, message: "Reward redeemed", redemption: res.redemption as RedemptionView };
}

export async function redeemDirect(customerId: string, rewardId: string): Promise<{ ok: boolean; message: string }> {
  const res = await call("merchant_redeem_direct", { p_customer_id: customerId, p_reward_id: rewardId });
  revalidatePath(`/customers/${customerId}`);
  return { ok: res.ok, message: res.ok ? "Reward redeemed" : message(res.error) };
}
