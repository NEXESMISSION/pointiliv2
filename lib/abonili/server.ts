import "server-only";
import { cache } from "react";
import { redirect } from "next/navigation";
import { createClient, hasSessionCookie } from "@/lib/supabase/server";
import { getLocale } from "@/lib/i18n/server";
import { abI18n, type AbI18n } from "./i18n";
import type { AbContext } from "./types";

const TRANSIENT = /fetch failed|network|ECONNRESET|ETIMEDOUT|timeout|502|503|504/i;

/** `const { a, fill, count, intl } = await getAb();` in any Abonili server component. */
export const getAb = cache(async (): Promise<AbI18n> => abI18n(await getLocale()));

/**
 * The signed-in owner and their club, once per request — or null. Null covers
 * both "not signed in" and "signed in, but this account has no club".
 */
export const getAbContext = cache(async (): Promise<AbContext | null> => {
  if (!(await hasSessionCookie())) return null;
  const supabase = await createClient();
  let { data, error } = await supabase.rpc("ab_context");
  if (error && TRANSIENT.test(error.message)) ({ data, error } = await supabase.rpc("ab_context"));
  if (error && TRANSIENT.test(error.message)) throw new Error(`ab_context: ${error.message}`);
  if (error || !data) return null;
  return data as AbContext;
});

/** Every page inside the club: signed in AND owning a club, or off to the login. */
export async function requireClub(next = "/abonili"): Promise<AbContext> {
  const ctx = await getAbContext();
  if (!ctx) redirect(`/abonili/login?next=${encodeURIComponent(next)}`);
  return ctx;
}

/** Call an ab_* function as the signed-in owner. Retries a dropped connection once. */
export async function abRpc<T>(fn: string, args?: Record<string, unknown>): Promise<T> {
  const supabase = await createClient();
  let { data, error } = await supabase.rpc(fn, args);
  if (error && TRANSIENT.test(error.message)) ({ data, error } = await supabase.rpc(fn, args));
  if (error) {
    if (error.code === "42501" || /not_authenticated|not_club|JWT/i.test(error.message)) redirect("/abonili/login");
    throw new Error(`${fn}: ${error.message}`);
  }
  return data as T;
}
