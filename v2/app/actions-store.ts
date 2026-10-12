"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";
import type { CardStore, StoreItem } from "@/lib/types";

/**
 * The store of a shop the founder switched to it: the customer buys with the
 * tampons on their card, the owner fills it and hands the orders over. Every
 * rule lives in the database (supabase/schema.sql, «the store»); these only
 * carry the words across and refresh the pages.
 */
const UUID = /^[0-9a-f-]{36}$/i;

/** The customer buys several things at once ([{id, qty}]): the tampons leave the card, an order waits. */
export async function storeBuy(card: string, lines: { id: number; qty: number }[]): Promise<CardStore> {
  if (!UUID.test(card)) return { ok: false, error: "invalid", balance: 0, items: [], waiting: [] };
  const clean = lines.filter((l) => Number.isSafeInteger(l.id) && Number.isSafeInteger(l.qty) && l.qty > 0).slice(0, 20).map((l) => ({ id: l.id, qty: Math.min(l.qty, 20) }));
  const res = await call<CardStore>("store_buy", { p_card: card, p_lines: clean });
  revalidatePath(`/c/${card}`);
  return res ?? { ok: false, error: "network", balance: 0, items: [], waiting: [] };
}

/** The customer takes an order back before it is handed over: the tampons come back. */
export async function storeCancel(card: string, batch: string): Promise<CardStore> {
  if (!UUID.test(card) || !UUID.test(batch)) return { ok: false, error: "invalid", balance: 0, items: [], waiting: [] };
  const res = await call<CardStore>("store_cancel", { p_card: card, p_batch: batch });
  revalidatePath(`/c/${card}`);
  return res ?? { ok: false, error: "network", balance: 0, items: [], waiting: [] };
}

/** The owner writes the whole store, in their order (a thing left out goes off sale). */
export async function storeSave(items: { id?: number; name: string; cost: number }[]): Promise<{ ok: boolean; error?: string; items?: StoreItem[] }> {
  const clean = items
    .map((x) => ({ id: Number.isSafeInteger(x.id) ? x.id : null, name: String(x.name ?? "").trim().slice(0, 40), cost: Math.round(Number(x.cost)) }))
    .filter((x) => x.name.length > 0 && x.cost >= 1 && x.cost <= 9999)
    .slice(0, 40);
  const res = await call<{ ok: boolean; error?: string; items?: StoreItem[] }>("store_save", { p_items: clean });
  revalidatePath("/shop/store");
  return res ?? { ok: false, error: "network" };
}

/** The owner hands over what a customer ordered: every order on the card, or one. */
export async function storeGive(card: string, batch?: string): Promise<boolean> {
  if (!UUID.test(card) || (batch && !UUID.test(batch))) return false;
  const res = await call<{ ok: boolean }>("store_give", { p_card: card, p_batch: batch ?? null });
  revalidatePath("/shop/store");
  return !!res?.ok;
}

/** The founder switches a shop to the store, or back to its card. */
export async function adminSetStore(id: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(id)) return { ok: false };
  const res = await call<{ ok: boolean; error?: string }>("admin_set_store", { p_id: id, p_on: on });
  revalidatePath("/admin", "layout");
  return res ?? { ok: false, error: "network" };
}
