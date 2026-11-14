"use server";

import { revalidatePath } from "next/cache";
import { cleanName } from "@/lib/names";
import { getMe } from "@/lib/session";
import { call, service } from "@/lib/supabase";

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

/**
 * The owner writes the name of a customer who has no account yet (14 Nov 2026, a client asked for it): a number
 * the shop gave a tampon to at the counter (people.made_by_shop = this shop, no password set). Until that person
 * signs up with the number, the name is the shop's; signing up, they write their own (actions.ts, claim). Any other
 * customer chose their name themselves: never changed from here.
 */
export async function nameCustomer(card: string, raw: string): Promise<{ ok: boolean; name?: string; error?: "invalid" | "own_account" | "not_found" | "network" }> {
  if (!UUID.test(card)) return { ok: false, error: "not_found" };
  const name = cleanName(raw);
  if (!name) return { ok: false, error: "invalid" };
  const me = await getMe();
  if (!me?.shop) return { ok: false, error: "not_found" };
  const admin = service();
  const { data: c } = await admin.from("cards").select("user_id").eq("id", card).eq("shop_id", me.shop.id).maybeSingle();
  if (!c) return { ok: false, error: "not_found" };
  const { data: p } = await admin.from("people").select("made_by_shop, password_set").eq("id", c.user_id).maybeSingle();
  if (!p || p.made_by_shop !== me.shop.id || p.password_set) return { ok: false, error: "own_account" };
  const { error } = await admin.from("people").update({ name }).eq("id", c.user_id).eq("made_by_shop", me.shop.id).eq("password_set", false);
  if (error) return { ok: false, error: "network" };
  revalidatePath("/shop", "layout");
  return { ok: true, name };
}
