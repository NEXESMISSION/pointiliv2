import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { cookies, headers } from "next/headers";
import { createClient, hasSessionCookie } from "@/lib/supabase/server";
import { SYSTEM_COOKIE, SYSTEM_HEADER, isSystem, type SystemKey } from "@/lib/systems";
import type { Role, SessionContext } from "@/lib/types";

const TRANSIENT = /fetch failed|network|ECONNRESET|ETIMEDOUT|timeout|502|503|504/i;

/**
 * Who is asking, in one round trip. The RPC runs as the user; PostgREST verifies
 * the JWT, so an absent/expired/forged session simply yields null.
 * Deduplicated per request (layout + page share one call).
 */
export const getContext = cache(async (): Promise<SessionContext | null> => {
  if (!(await hasSessionCookie())) return null;
  const supabase = await createClient();
  let { data, error } = await supabase.rpc("session_context");
  // A dropped connection is not a sign-out: bouncing to the login screen on a
  // blip is how a signed-in person comes to believe the app forgot them.
  if (error && TRANSIENT.test(error.message)) ({ data, error } = await supabase.rpc("session_context"));
  if (error && TRANSIENT.test(error.message)) throw new Error(`session_context: ${error.message}`);
  if (error || !data) return null;
  return data as SessionContext;
});

/**
 * Where someone lands after signing in or opening the installed app. A shop
 * opens straight on its counter QR — that is what the phone is picked up for —
 * unless there is no card yet, and then the home screen walks them through it.
 */
export function homeFor(ctx: Pick<SessionContext, "user" | "business" | "card" | "systems"> | null): string {
  if (!ctx) return "/";
  if (ctx.user.role === "admin") return "/admin";
  if (ctx.business) {
    // Two systems is a question worth asking; one is not, so the lobby only
    // exists for the owner who bought both.
    if (ctx.systems?.both) return "/lobby";
    if (ctx.systems?.memberships) return "/members";
    return ctx.card ? "/qr" : "/dashboard";
  }
  return "/customer";
}

/**
 * The door this render is behind. proxy.ts puts it on the request, so the very
 * first page of a system already knows — the cookie it also sets only matters
 * later, on the pages that serve both.
 */
export const currentSystem = cache(async (): Promise<SystemKey | null> => {
  const h = await headers();
  const fromHeader = h.get(SYSTEM_HEADER);
  if (isSystem(fromHeader)) return fromHeader;
  const c = (await cookies()).get(SYSTEM_COOKIE)?.value;
  return isSystem(c) ? c : null;
});

export async function requireUser(next = "/customer"): Promise<SessionContext> {
  const ctx = await getContext();
  if (!ctx) redirect(`/customer/login?next=${encodeURIComponent(next)}`);
  return ctx;
}

export async function requireMerchant(next = "/dashboard"): Promise<SessionContext & { business: NonNullable<SessionContext["business"]> }> {
  const ctx = await getContext();
  if (!ctx) redirect(`/login?next=${encodeURIComponent(next)}`);
  if (!ctx.business) redirect("/register");
  return ctx as SessionContext & { business: NonNullable<SessionContext["business"]> };
}

export async function requireAdmin(): Promise<SessionContext> {
  const ctx = await getContext();
  if (!ctx) redirect("/login?next=/admin");
  if (ctx.user.role !== ("admin" satisfies Role)) redirect(homeFor(ctx));
  return ctx;
}

/** Call an RPC as the current user. Retries once on a dropped connection; throws on other errors. */
export async function rpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  let { data, error } = await supabase.rpc(fn, args);
  if (error && TRANSIENT.test(error.message)) {
    ({ data, error } = await supabase.rpc(fn, args));
  }
  if (error) {
    if (error.code === "42501" || /not_authenticated|JWT/i.test(error.message)) {
      redirect("/customer/login");
    }
    throw new Error(`${fn}: ${error.message}`);
  }
  return data as T;
}
