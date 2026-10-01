"use server";

import { randomBytes } from "node:crypto";
import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getI18n } from "@/lib/i18n/server";
import { requireAdmin } from "@/lib/session";
import { normalizePhone, phoneAuthEmail } from "@/lib/phone";
import { PLANS, type CardIconName } from "@/lib/constants";
import { TEMPLATES, resolveDesign } from "@/lib/card-design";
import { saveCard, savePointsCard } from "@/app/actions/merchant";

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
type MadeShop = { ok: true; businessId: string; userId: string; phone: string } | { ok: false; message: string };

/**
 * The auth user (only the service role may mint one) with the password the
 * founder typed, then the business with its 30-day trial.
 *
 * THE TRAP: if the business insert fails the auth user is already made, and an
 * account with no shop cannot be created again (the phone is taken). So a
 * failure takes the user back out with it.
 */
async function makeShop(input: { name: string; category: string; ownerName: string; phone: string; password: string }): Promise<MadeShop> {
  const { t, msg } = await getI18n();
  const phone = normalizePhone(input.phone);
  const name = input.name.trim();
  if (name.length < 2) return { ok: false, message: msg("invalid_name") };
  if (!phone) return { ok: false, message: msg("invalid_phone") };
  if (input.password.length < 8 || input.password.length > 72) return { ok: false, message: t.auth.errors.passwordShort };
  const admin = createAdminClient();
  const { data: created, error } = await admin.auth.admin.createUser({
    email: phoneAuthEmail(phone),
    password: input.password,
    email_confirm: true,
    app_metadata: { phone, full_name: input.ownerName.trim() },
  });
  if (error || !created?.user) {
    const taken = /already|registered|exists|duplicate/i.test(error?.message ?? "");
    return { ok: false, message: taken ? t.admin.results.phoneTaken : msg("network") };
  }
  const supabase = await createClient();
  const { data, error: rpcError } = await supabase.rpc("admin_create_business", {
    p_owner: created.user.id,
    p_name: name,
    p_category: input.category,
    p_owner_name: input.ownerName.trim(),
  });
  const res = data as { ok: boolean; error?: string; business_id?: string } | null;
  if (rpcError || !res?.ok || !res.business_id) {
    // do not leave an account behind that can never be given a shop
    await admin.auth.admin.deleteUser(created.user.id);
    return { ok: false, message: msg(res?.error ?? "network") };
  }
  return { ok: true, businessId: res.business_id, userId: created.user.id, phone };
}

/** A paid plan from today until 6 or 12 months on; the trial the shop was born with ends with it. */
async function startPlan(businessId: string, plan: string, price: number | null, method: string) {
  if (plan !== "six_month" && plan !== "yearly") return;
  const until = new Date();
  until.setMonth(until.getMonth() + (plan === "yearly" ? 12 : 6));
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_set_subscription", { p_business: businessId, p_plan: plan, p_expires_at: until.toISOString(), p_price: price, p_method: method });
  if (!(data as { ok?: boolean } | null)?.ok) console.error("[open shop] plan", data);
}

/**
 * Open a shop for somebody, at their counter, in one step. There is no e-mail
 * to send anything to: the founder reads the phone and password to the owner,
 * who is right there.
 */
export async function createBusinessAccount(fd: FormData): Promise<Result> {
  await requireAdmin();
  const { t } = await getI18n();
  const password = String(fd.get("password") ?? "");
  const plan = String(fd.get("plan") ?? "trial");
  const made = await makeShop({
    name: String(fd.get("name") ?? ""),
    category: String(fd.get("category") ?? "cafe"),
    ownerName: String(fd.get("owner_name") ?? ""),
    phone: String(fd.get("phone") ?? ""),
    password,
  });
  if (!made.ok) return { ok: false, message: made.message, at: Date.now() };
  await startPlan(made.businessId, plan, null, "cash");
  revalidatePath("/admin", "layout");
  return { ok: true, message: t.admin.results.businessCreated, secret: password, at: Date.now() };
}

export type NewShopInput = {
  name: string;
  category: string;
  city: string;
  ownerName: string;
  phone: string;
  password: string;
  plan: "trial" | "six_month" | "yearly";
  /** how it was paid today; "later" records no payment yet */
  paid: "cash" | "d17" | "bank_transfer" | "later";
  /** "skip": the owner chooses the card at the first sign-in (the welcome) */
  system: "stamps" | "levels" | "points" | "skip";
  goal: number;
  reward: string;
  levels: { name: string; stamps: number }[];
  /** points: dinars paid for one point, and the gifts priced in points (0016) */
  rate: number;
  gifts: { name: string; points: number }[];
  /** the card's colour (hex) and the mark on its stamps */
  color: string;
  icon: CardIconName;
};

/** The legacy colour name nearest to a hex, for the parts of the app that still read it. */
function legacyColor(hex: string): string {
  const h = hex.toLowerCase();
  if (["#ff6b4a", "#ea580c"].includes(h)) return "orange";
  if (["#0891b2", "#0284c7"].includes(h)) return "sky";
  if (["#1f1b2e", "#334155", "#111827"].includes(h)) return "slate";
  if (["#e0457b", "#e11d48", "#db2777"].includes(h)) return "rose";
  if (["#16a34a", "#0e9f6e"].includes(h)) return "emerald";
  if (["#d97706", "#6b4226"].includes(h)) return "amber";
  return "violet";
}

/**
 * The founder's six steps (board 9) in one go: the account and the shop, the
 * subscription and today's payment, then the card — made from inside the shop
 * («ادخل كمحل», 0013), so it goes through the very same checks as an owner's.
 */
export async function openShop(input: NewShopInput): Promise<{ ok: true; businessId: string; phone: string; password: string } | { ok: false; message: string }> {
  await requireAdmin();
  const { msg } = await getI18n();
  const made = await makeShop(input);
  if (!made.ok) return made;
  const price = input.plan === "trial" || input.paid === "later" ? null : PLANS[input.plan].price;
  await startPlan(made.businessId, input.plan, price, input.paid === "later" ? "cash" : input.paid);

  const supabase = await createClient();
  const inside = await supabase.rpc("admin_act_as", { p_business: made.businessId });
  if (!(inside.data as { ok?: boolean } | null)?.ok) return { ok: false, message: msg("network") };
  try {
    if (input.city.trim()) {
      await supabase.rpc("update_business", { p_name: input.name.trim(), p_category: input.category, p_phone: null, p_address: input.city.trim(), p_instagram: null });
    }
    if (input.system === "points") {
      const design = resolveDesign({ ...TEMPLATES.bold.make(input.color), template: "bold", stamp: "icon", icon: input.icon });
      const saved = await savePointsCard({
        name: input.name.trim(),
        description: "",
        dinars_per_point: input.rate,
        points_expire: false,
        catalog: input.gifts.map((g) => ({ name: g.name.trim(), points: g.points })),
        design,
      });
      if (!saved.ok) return { ok: false, message: saved.message };
    } else if (input.system !== "skip") {
      const design = resolveDesign({ ...TEMPLATES.bold.make(input.color), template: "bold", stamp: "icon", icon: input.icon });
      const saved = await saveCard({
        name: input.name.trim(),
        description: "",
        stamps_required: input.goal,
        reward_name: input.reward.trim(),
        reward_description: "",
        color: legacyColor(input.color),
        cooldown_minutes: 60,
        valid_days: 0,
        levels: input.system === "levels" ? input.levels : [],
        design,
      });
      if (!saved.ok) return { ok: false, message: saved.message };
    }
  } finally {
    await supabase.rpc("admin_stop_acting");
  }
  revalidatePath("/admin", "layout");
  return { ok: true, businessId: made.businessId, phone: made.phone, password: input.password };
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

/** «ادخل كمحل»: the founder works inside a shop with the owner's powers (0013). */
export async function actAsBusiness(id: string) {
  await requireAdmin();
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_act_as", { p_business: id });
  if (!(data as { ok?: boolean } | null)?.ok) redirect(`/admin/businesses/${id}`);
  revalidatePath("/", "layout");
  redirect("/dashboard");
}

/** Out of the shop, back to its page in the console. */
export async function stopActing() {
  const supabase = await createClient();
  const { data } = await supabase.rpc("admin_stop_acting");
  const back = (data as { business_id?: string | null } | null)?.business_id;
  revalidatePath("/", "layout");
  redirect(back ? `/admin/businesses/${back}` : "/admin");
}
