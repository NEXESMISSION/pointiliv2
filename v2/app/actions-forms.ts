"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";

/**
 * Forms of identification: the founder makes them for a shop (its fields, a
 * QR each), the customer fills one, and the owner's counter shows who it is
 * at every tampon. Every rule is in the database (schema.sql, «forms of
 * identification»).
 */
const UUID = /^[0-9a-f-]{36}$/i;
export type FormField = { key: string; label: string; kind: "text" | "number" | "phone" | "date" | "choice"; required: boolean; options?: string[] };

/** The founder writes a form (new when id is null). */
export async function adminFormSave(shop: string, id: string | null, name: string, fields: FormField[], active = true): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(shop) || (id && !UUID.test(id))) return { ok: false, error: "invalid" };
  const clean = fields.slice(0, 15).map((f, i) => ({
    key: /^[a-z0-9_]{1,24}$/.test(f.key) ? f.key : `f${i + 1}`,
    label: String(f.label ?? "").trim().slice(0, 60),
    kind: f.kind,
    required: !!f.required,
    ...(f.kind === "choice" ? { options: (f.options ?? []).map((o) => String(o).trim().slice(0, 40)).filter(Boolean).slice(0, 20) } : {}),
  }));
  const res = await call<{ ok: boolean; error?: string }>("admin_form_save", { p_shop: shop, p_id: id, p_name: String(name ?? "").trim().slice(0, 60), p_fields: clean, p_active: active });
  revalidatePath(`/admin/shops/${shop}`);
  return res ?? { ok: false, error: "network" };
}

/** The founder takes a form away, with what was filled in it. */
export async function adminFormDelete(shop: string, id: string): Promise<boolean> {
  if (!UUID.test(shop) || !UUID.test(id)) return false;
  const res = await call<{ ok: boolean }>("admin_form_delete", { p_id: id });
  revalidatePath(`/admin/shops/${shop}`);
  return !!res?.ok;
}

/** What was filled in a form, for the founder. */
export async function adminFormEntries(id: string): Promise<{ name: string | null; phone: string | null; data: Record<string, string>; at: string }[]> {
  if (!UUID.test(id)) return [];
  return (await call<{ name: string | null; phone: string | null; data: Record<string, string>; at: string }[]>("admin_form_entries", { p_id: id })) ?? [];
}

/** The customer fills the form they scanned. */
export async function formFill(token: string, data: Record<string, string>): Promise<{ ok: boolean; error?: string; field?: string }> {
  if (!/^[A-Za-z0-9_-]{8,40}$/.test(token)) return { ok: false, error: "invalid" };
  const clean = Object.fromEntries(Object.entries(data).slice(0, 15).map(([k, v]) => [k.slice(0, 24), String(v ?? "").slice(0, 120)]));
  const res = await call<{ ok: boolean; error?: string; field?: string }>("form_fill", { p_token: token, p_data: clean });
  return res ?? { ok: false, error: "network" };
}
