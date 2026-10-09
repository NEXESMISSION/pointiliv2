"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";
import type { CardView } from "@/lib/types";

/**
 * The shop's store (see «the shop's store» in supabase/schema.sql): the owner
 * lists things priced in points; a customer picks one and shows his code; the
 * owner hands it over from «سكاني», and only then do the points leave the card.
 */

export type Reward = { id: number; name: string; cost: number };
export type Order = { id: string; name: string; cost: number; at: string };
export type StoreLog = {
  ok: boolean;
  spent: number;
  count: number;
  by_thing: { name: string; n: number; points: number }[];
  lines: { id: string; name: string; cost: number; at: string; who: string | null; phone: string | null }[];
};

// ── the owner ──────────────────────────────────────────────────────────────
export async function saveReward(id: number | null, name: string, cost: number): Promise<{ ok: boolean; error?: string }> {
  const res = await call<{ ok: boolean; error?: string }>("reward_save", { p_id: id, p_name: String(name).slice(0, 60), p_cost: Math.round(Number(cost)) });
  revalidatePath("/shop/store");
  return res ?? { ok: false, error: "network" };
}

export async function dropReward(id: number): Promise<boolean> {
  const res = await call<{ ok: boolean }>("reward_drop", { p_id: id });
  revalidatePath("/shop/store");
  return !!res?.ok;
}

/** The thing handed over at the counter: the points leave the card now. */
export async function serveOrder(id: string): Promise<{ ok: boolean; error?: string; name?: string; cost?: number; card?: CardView }> {
  const res = await call<{ ok: boolean; error?: string; name?: string; cost?: number; card?: CardView }>("serve_order", { p_order: id });
  revalidatePath("/shop/store");
  return res ?? { ok: false, error: "network" };
}

// ── the customer ───────────────────────────────────────────────────────────
export async function orderReward(card: string, reward: number): Promise<{ ok: boolean; error?: string; order?: Order | null }> {
  const res = await call<{ ok: boolean; error?: string; order?: Order | null }>("order_reward", { p_card: card, p_reward: reward });
  return res ?? { ok: false, error: "network" };
}

export async function cancelOrder(card: string): Promise<boolean> {
  const res = await call<{ ok: boolean }>("cancel_order", { p_card: card });
  return !!res?.ok;
}
