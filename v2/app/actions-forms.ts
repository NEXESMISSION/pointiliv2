"use server";

import { call } from "@/lib/supabase";

/**
 * Forms of identification: a shop's form (its fields, a QR of its own) is
 * filled by the customer, and the owner's counter shows who it is at every
 * tampon. Every rule is in the database (schema.sql, «forms of
 * identification»). (The console's editor for them went with the old
 * console on 23 Oct 2026: none had been made.)
 */
export type FormField = { key: string; label: string; kind: "text" | "number" | "phone" | "date" | "choice"; required: boolean; options?: string[] };

/** The customer fills the form they scanned. */
export async function formFill(token: string, data: Record<string, string>): Promise<{ ok: boolean; error?: string; field?: string }> {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return { ok: false, error: "invalid" };
  const clean = Object.fromEntries(Object.entries(data).slice(0, 15).map(([k, v]) => [k.slice(0, 24), String(v ?? "").slice(0, 120)]));
  const res = await call<{ ok: boolean; error?: string; field?: string }>("form_fill", { p_token: token, p_data: clean });
  return res ?? { ok: false, error: "network" };
}
