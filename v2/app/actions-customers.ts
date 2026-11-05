"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

/**
 * The owner takes a customer off the shop's list (the founder, 6 Nov 2026: «add a remove client
 * button for the owner»): their card here and everything on it, for good. Only a card of the owner's
 * own shop — the database checks it (supabase/schema.sql, remove_customer). Their account stays.
 */
export async function removeCustomer(card: string): Promise<boolean> {
  if (!UUID.test(card)) return false;
  const res = await call<{ ok: boolean }>("remove_customer", { p_card: card });
  if (res?.ok) revalidatePath("/shop", "layout");
  return !!res?.ok;
}
