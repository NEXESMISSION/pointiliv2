"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { getI18n } from "@/lib/i18n/server";
import type { FormState } from "./types";

/**
 * Abonili's four writes. Every one of them is a security-definer RPC that
 * re-derives the business from auth.uid(), so nothing here takes a business id
 * from the browser — the same rule the loyalty actions follow.
 */

const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
const int = (fd: FormData, k: string) => {
  const n = Number.parseInt(String(fd.get(k) ?? ""), 10);
  return Number.isFinite(n) ? n : null;
};
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

/** Sell an abonnement: a phone, a name, a formule. The cash was taken at the counter. */
export async function addMember(_: FormState, fd: FormData): Promise<FormState> {
  const { msg } = await getI18n();
  const values = { phone: str(fd, "phone"), full_name: str(fd, "full_name"), plan_id: str(fd, "plan_id") };
  if (!values.plan_id) return { ok: false, error: msg("plan_not_found"), values, at: now() };

  const res = await call("add_membership", {
    p_phone: values.phone,
    p_name: values.full_name,
    p_plan_id: values.plan_id,
  });
  if (!res.ok) return { ok: false, error: msg(res.error), values, at: now() };

  revalidatePath("/members");
  redirect("/members");
}

/** Renewing early loses nothing — the database starts the new period where the old one ended. */
export async function renewMember(id: string, planId: string | null) {
  const { t, msg } = await getI18n();
  const res = await call("renew_membership", { p_id: id, p_plan_id: planId });
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  return { ok: res.ok, message: res.ok ? t.merchant.abonili.renewed : msg(res.error), at: now() };
}

/** Marid, safer, ramadan: days on the end. No pause state to get stuck in. */
export async function addDays(id: string, days: number) {
  const { t, fill, msg } = await getI18n();
  const res = await call("add_membership_days", { p_id: id, p_days: days });
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  return { ok: res.ok, message: res.ok ? fill(t.merchant.abonili.daysAdded, { n: days }) : msg(res.error), at: now() };
}

export async function cancelMember(id: string) {
  const { t, msg } = await getI18n();
  const res = await call("cancel_membership", { p_id: id });
  revalidatePath("/members");
  revalidatePath(`/members/${id}`);
  return { ok: res.ok, message: res.ok ? t.merchant.abonili.cancelled : msg(res.error), at: now() };
}

/** A formule limits time, or visits, or both — never neither. The RPC refuses the empty case. */
export async function savePlan(_: FormState, fd: FormData): Promise<FormState> {
  const { t, msg } = await getI18n();
  const values = {
    name: str(fd, "name"),
    price: str(fd, "price"),
    duration_days: str(fd, "duration_days"),
    sessions: str(fd, "sessions"),
  };
  const res = await call("save_membership_plan", {
    p_id: str(fd, "id") || null,
    p_name: values.name,
    p_price: Number(values.price) || 0,
    p_duration_days: int(fd, "duration_days"),
    p_sessions: int(fd, "sessions"),
    p_active: fd.get("active") === null ? true : fd.get("active") === "on" || fd.get("active") === "true",
  });
  if (!res.ok) return { ok: false, error: msg(res.error), values, at: now() };

  revalidatePath("/formules");
  revalidatePath("/members");
  return { ok: true, message: t.merchant.abonili.planSaved, at: now() };
}

export async function setPlanActive(plan: { id: string; name: string; price: number; duration_days: number | null; sessions: number | null }, active: boolean) {
  const { t, msg } = await getI18n();
  const res = await call("save_membership_plan", {
    p_id: plan.id,
    p_name: plan.name,
    p_price: plan.price,
    p_duration_days: plan.duration_days,
    p_sessions: plan.sessions,
    p_active: active,
  });
  revalidatePath("/formules");
  return { ok: res.ok, message: res.ok ? t.merchant.abonili.planSaved : msg(res.error), at: now() };
}
