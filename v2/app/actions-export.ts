"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";

/**
 * «تحميل البيانات»: an owner downloads their customers as a file (app/api/export) — only a shop the
 * founder allowed it, by hand, from the console (the founder, 5 Nov 2026: «off by default, I turn it
 * on for them manually»). The database checks he is an admin (supabase/schema.sql, «تحميل البيانات»).
 */
const UUID = /^[0-9a-f-]{36}$/i;

export async function adminSetExport(id: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(id)) return { ok: false };
  const res = await call<{ ok: boolean; error?: string }>("admin_set_export", { p_id: id, p_on: on });
  revalidatePath("/admin", "layout");
  return res ?? { ok: false, error: "network" };
}

/** Whether the founder allowed this shop (its switch on the console), and when its owner last took the file; null when it could not be read. */
export async function adminExportState(id: string): Promise<{ on: boolean; last: string | null } | null> {
  if (!UUID.test(id)) return null;
  const res = await call<{ ok: boolean; on?: boolean; last?: string | null }>("admin_export_state", { p_id: id });
  return res?.ok ? { on: !!res.on, last: res.last ?? null } : null;
}
