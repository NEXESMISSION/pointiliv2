"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

/** The founder's one line about a shop, written in the shop list itself (crm.note; an empty line clears it). */
export async function adminShopNote(shopId: string, note: string): Promise<boolean> {
  if (!UUID.test(shopId)) return false;
  const text = String(note ?? "").trim().slice(0, 300);
  const res = await call<{ ok: boolean }>("admin_crm_set", { p_shop: shopId, p_note: text });
  if (res?.ok) revalidatePath("/admin/shops");
  return !!res?.ok;
}
