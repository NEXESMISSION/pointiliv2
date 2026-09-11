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

const IMAGE_TYPES: Record<string, string> = { "image/png": "png", "image/jpeg": "jpg", "image/webp": "webp" };
type ImageKind = "logo" | "cover";

/** Path inside the "logos" bucket for a public URL we issued, so replaced images don't pile up. */
function storedPath(url: string | null | undefined): string | null {
  const m = url?.match(/\/storage\/v1\/object\/public\/logos\/(.+)$/);
  return m ? decodeURIComponent(m[1]!) : null;
}

/** Logo or cover photo. The browser already cropped and compressed it; this re-checks type and size. */
export async function uploadBusinessImage(fd: FormData): Promise<{ ok: boolean; message: string }> {
  const kind: ImageKind = fd.get("kind") === "cover" ? "cover" : "logo";
  const ctx = await getContext();
  if (!ctx?.business || ctx.member_role !== "owner") return { ok: false, message: "Only the owner can change the branding." };
  const file = fd.get("file");
  if (!(file instanceof File) || file.size === 0) return { ok: false, message: "Choose an image first." };
  const ext = IMAGE_TYPES[file.type];
  if (!ext) return { ok: false, message: "Use a PNG, JPG or WebP image." };
  if (file.size > 3 * 1024 * 1024) return { ok: false, message: "The image must be under 3 MB." };

  const admin = createAdminClient();
  const path = `${ctx.business.id}/${kind}-${Date.now()}.${ext}`;
  const { error } = await admin.storage
    .from("logos")
    .upload(path, Buffer.from(await file.arrayBuffer()), { contentType: file.type, cacheControl: "31536000", upsert: false });
  if (error) {
    console.error(`[${kind}]`, error.message);
    return { ok: false, message: message("network") };
  }
  const url = admin.storage.from("logos").getPublicUrl(path).data.publicUrl;
  const previous = kind === "cover" ? ctx.business.cover_url : ctx.business.logo_url;
  // Identity and ownership were verified above through the user's own session.
  await admin.from("businesses").update(kind === "cover" ? { cover_url: url } : { logo_url: url }).eq("id", ctx.business.id);
  const old = storedPath(previous);
  if (old) await admin.storage.from("logos").remove([old]);
  revalidatePath("/", "layout");
  return { ok: true, message: kind === "cover" ? "Cover photo updated" : "Logo updated" };
}

export async function removeBusinessImage(kind: ImageKind): Promise<{ ok: boolean; message: string }> {
  const ctx = await getContext();
  if (!ctx?.business || ctx.member_role !== "owner") return { ok: false, message: "Only the owner can change the branding." };
  const admin = createAdminClient();
  const previous = kind === "cover" ? ctx.business.cover_url : ctx.business.logo_url;
  await admin.from("businesses").update(kind === "cover" ? { cover_url: null } : { logo_url: null }).eq("id", ctx.business.id);
  const old = storedPath(previous);
  if (old) await admin.storage.from("logos").remove([old]);
  revalidatePath("/", "layout");
  return { ok: true, message: kind === "cover" ? "Cover photo removed" : "Logo removed" };
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

/** Find a pending reward by the 6 digits typed, or read from the customer's reward QR. */
export async function lookupRedemptionCode(raw: string): Promise<{ ok: boolean; error?: string; redemption?: RedemptionView }> {
  const code = String(raw ?? "").replace(/\D/g, "");
  if (code.length !== 6) return { ok: false, error: "Enter the 6-digit code from the customer's screen." };
  const res = await call("merchant_lookup_redemption", { p_code: code });
  if (!res.ok) return { ok: false, error: redemptionLookupError(res.error) };
  return { ok: true, redemption: res.redemption as RedemptionView };
}

function redemptionLookupError(code: string | undefined) {
  if (code === "not_found") return "No active reward with this code. Ask the customer to tap “Use reward” again.";
  if (code === "expired") return "This reward code has expired. Ask the customer to tap “Use reward” again.";
  return message(code);
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
