"use server";

/**
 * Every write Abonili makes. Each one goes through a public.ab_* function that
 * re-checks, in the database, that the caller owns the club — the checks here
 * are only there to give a clear sentence before the round trip.
 */
import { cookies, headers } from "next/headers";
import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { createClient } from "@/lib/supabase/server";
import { normalizePhone, phoneAuthEmail } from "@/lib/phone";
import { clientIp, safeNext } from "@/lib/url";
import { allow } from "@/lib/limit";
import { LOCALE_COOKIE, LOCALE_MAX_AGE, isLocale } from "@/lib/i18n/config";
import { abRpc, getAb } from "@/lib/abonili/server";
import type { AbCheckin, AbDoor, AbResult } from "@/lib/abonili/types";

export type AbForm = {
  ok?: boolean;
  error?: string;
  message?: string;
  /** the error code, for the screens that react to one in particular */
  code?: string;
  values?: Record<string, string>;
  data?: Record<string, unknown>;
  at?: number;
} | null;

const now = () => Date.now();
const str = (fd: FormData, k: string) => String(fd.get(k) ?? "").trim();
/** "60", "60.5", "60,5" → 60.5; empty → null */
const num = (fd: FormData, k: string): number | null => {
  const v = str(fd, k).replace(",", ".");
  if (v === "") return null;
  const n = Number(v);
  return Number.isFinite(n) ? n : NaN;
};
const int = (fd: FormData, k: string): number | null => {
  const n = num(fd, k);
  return n === null ? null : Number.isInteger(n) ? n : NaN;
};

async function fail(code: string | undefined, extra?: Partial<NonNullable<AbForm>>): Promise<AbForm> {
  const { err } = await getAb();
  return { ok: false, error: err(code), code, at: now(), ...extra };
}

function done(message?: string, data?: Record<string, unknown>): AbForm {
  revalidatePath("/abonili", "layout");
  return { ok: true, message, data, at: now() };
}

// ── signing in and out ────────────────────────────────────────────────────

export async function abLogin(_: AbForm, fd: FormData): Promise<AbForm> {
  const { a } = await getAb();
  const raw = str(fd, "phone");
  const values = { phone: raw };
  const phone = normalizePhone(raw);
  const password = String(fd.get("password") ?? "");
  if (!phone) return { error: a.login.invalidPhone, values, at: now() };
  if (!password) return { error: a.login.wrong, values, at: now() };

  const ip = clientIp(await headers()) ?? "unknown";
  if (!(await allow(`ablogin:${phone}`, 8, 900)) || !(await allow(`ablogin:ip:${ip}`, 60, 900))) {
    return { error: a.login.rateLimited, values, at: now() };
  }

  const supabase = await createClient();
  const { error } = await supabase.auth.signInWithPassword({ email: phoneAuthEmail(phone), password });
  if (error) return { error: a.login.wrong, values, at: now() };

  // A Pointili shop owner can sign in fine — and still have nothing here.
  const { data: ctx } = await supabase.rpc("ab_context");
  if (!ctx) return { code: "no_club", error: a.login.noClub, values, at: now() };

  const next = safeNext(fd.get("next"), "/abonili");
  redirect(next.startsWith("/abonili") ? next : "/abonili");
}

export async function abLogout() {
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect("/abonili/login");
}

// ── the door ──────────────────────────────────────────────────────────────

export async function abDoorLookup(q: string): Promise<AbDoor | { ok: false; error: string }> {
  const query = String(q ?? "").slice(0, 200);
  try {
    return await abRpc<AbDoor>("ab_door", { p_q: query });
  } catch {
    const { err } = await getAb();
    return { ok: false, error: err("network") };
  }
}

export async function abCheckin(memberId: string, force = false): Promise<AbCheckin> {
  try {
    const r = await abRpc<AbCheckin>("ab_checkin", { p_member: memberId, p_force: force });
    if (r.ok) revalidatePath("/abonili", "layout");
    return r;
  } catch {
    return { ok: false, error: "network" };
  }
}

// ── members ───────────────────────────────────────────────────────────────

export async function abAddMember(_: AbForm, fd: FormData): Promise<AbForm> {
  const plan = str(fd, "plan") || null;
  const amount = num(fd, "amount");
  const values = Object.fromEntries(["name", "phone", "plan", "amount", "method", "starts", "note"].map((k) => [k, str(fd, k)]));
  if (plan && (amount === null || Number.isNaN(amount))) return fail("invalid_amount", { values });

  const r = await abRpc<AbResult>("ab_add_member", {
    p_name: str(fd, "name"),
    p_phone: str(fd, "phone") || null,
    p_plan: plan,
    p_amount: plan ? amount : 0,
    p_method: str(fd, "method") || "cash",
    p_starts: str(fd, "starts") || null,
    p_note: str(fd, "note") || null,
  });
  if (!r.ok) {
    return fail(r.error, { values, data: "member_id" in r ? { member_id: r.member_id as string } : undefined });
  }
  revalidatePath("/abonili", "layout");
  redirect(`/abonili/members/${r.id as string}?new=1`);
}

export async function abUpdateMember(id: string, _: AbForm, fd: FormData): Promise<AbForm> {
  const { a } = await getAb();
  const r = await abRpc<AbResult>("ab_update_member", {
    p_id: id, p_name: str(fd, "name"), p_phone: str(fd, "phone") || null, p_note: str(fd, "note") || null,
  });
  return r.ok ? done(a.settings.saved) : fail(r.error);
}

export async function abRenew(memberId: string, _: AbForm, fd: FormData): Promise<AbForm> {
  const amount = num(fd, "amount");
  if (amount === null || Number.isNaN(amount)) return fail("invalid_amount");
  const r = await abRpc<AbResult>("ab_renew", {
    p_member: memberId, p_plan: str(fd, "plan"), p_amount: amount, p_method: str(fd, "method") || "cash",
  });
  return r.ok ? done() : fail(r.error);
}

export async function abAddDays(memberId: string, _: AbForm, fd: FormData): Promise<AbForm> {
  const days = int(fd, "days");
  if (days === null || Number.isNaN(days)) return fail("invalid_days");
  const r = await abRpc<AbResult>("ab_add_days", { p_member: memberId, p_days: days });
  return r.ok ? done() : fail(r.error);
}

export async function abCancelPeriod(periodId: string): Promise<AbForm> {
  const r = await abRpc<AbResult>("ab_cancel_period", { p_period: periodId });
  return r.ok ? done() : fail(r.error);
}

// ── formules ──────────────────────────────────────────────────────────────

export async function abSavePlan(_: AbForm, fd: FormData): Promise<AbForm> {
  const { a } = await getAb();
  const price = num(fd, "price");
  const days = int(fd, "days");
  const sessions = int(fd, "sessions");
  if (price === null || Number.isNaN(price)) return fail("invalid_price");
  if (Number.isNaN(days)) return fail("invalid_days");
  if (Number.isNaN(sessions)) return fail("invalid_sessions");
  const r = await abRpc<AbResult>("ab_save_plan", {
    p_id: str(fd, "id") || null,
    p_name: str(fd, "name"),
    p_price: price,
    p_days: days,
    p_sessions: sessions,
    p_active: fd.get("active") !== "false",
  });
  return r.ok ? done(a.settings.saved) : fail(r.error);
}

// ── the club and the account ──────────────────────────────────────────────

export async function abUpdateClub(_: AbForm, fd: FormData): Promise<AbForm> {
  const { a } = await getAb();
  const r = await abRpc<AbResult>("ab_update_club", {
    p_name: str(fd, "name"), p_phone: str(fd, "phone") || null, p_address: str(fd, "address") || null, p_kind: str(fd, "kind"),
  });
  return r.ok ? done(a.settings.saved) : fail(r.error);
}

export async function abChangePassword(_: AbForm, fd: FormData): Promise<AbForm> {
  const { a, locale } = await getAb();
  const supabase = await createClient();
  const { data: u } = await supabase.auth.getUser();
  if (!u.user?.email) redirect("/abonili/login");

  const current = String(fd.get("current") ?? "");
  const password = String(fd.get("password") ?? "");
  const short = locale === "fr" ? "8 caractères minimum." : "8 حروف على الأقل.";
  if (password.length < 8 || password.length > 72) return { ok: false, error: short, at: now() };
  if (!(await allow(`abpw:${u.user.id}`, 5, 900))) return fail("rate_limited");

  const { error: wrong } = await supabase.auth.signInWithPassword({ email: u.user.email, password: current });
  if (wrong) return { ok: false, error: a.login.wrong, at: now() };
  const { error } = await supabase.auth.updateUser({ password });
  if (error) return fail("network");
  return { ok: true, message: a.settings.passwordChanged, at: now() };
}

export async function abSetLanguage(locale: string) {
  if (!isLocale(locale)) return;
  (await cookies()).set(LOCALE_COOKIE, locale, { path: "/", maxAge: LOCALE_MAX_AGE, sameSite: "lax" });
  revalidatePath("/abonili", "layout");
}
