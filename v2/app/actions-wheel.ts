"use server";

import { revalidatePath } from "next/cache";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";
import type { Prize, SpinResult } from "@/components/Wheel";

/**
 * The wheel of a shop the founder switched to it: a full card is a turn of
 * the owner's wheel. Every rule lives in the database (supabase/schema.sql,
 * «the wheel»): the prize is drawn there, by each one's chance.
 */
const UUID = /^[0-9a-f-]{36}$/i;
type Spun = { ok: boolean; error?: string; prize?: string; index?: number | null };

/** The customer spins the turn waiting on their card. */
export async function spin(moment: number, card: string): Promise<SpinResult> {
  if (!Number.isSafeInteger(moment) || !UUID.test(card)) return null;
  // no refresh here: the page would come back before the wheel has turned (CardWheel refreshes once it stops)
  const res = await call<Spun>("spin", { p_moment: moment });
  return res?.ok && res.prize ? { prize: res.prize, index: res.index ?? null } : null;
}

/** The owner spins it at the counter, for a customer who did not yet. */
export async function spinAtCounter(moment: number): Promise<SpinResult> {
  if (!Number.isSafeInteger(moment)) return null;
  const res = await call<Spun>("spin_at_counter", { p_moment: moment });
  return res?.ok && res.prize ? { prize: res.prize, index: res.index ?? null } : null;
}

/** The owner writes the wheel: 2 to 12 prizes, 100% in all. */
export async function wheelSave(prizes: Prize[]): Promise<{ ok: boolean; error?: string; prizes?: Prize[] }> {
  const clean = prizes
    .map((p) => ({ id: Number.isSafeInteger(p.id) ? p.id : null, name: String(p.name ?? "").trim().slice(0, 40), chance: Math.round(Number(p.chance)) }))
    .filter((p) => p.name)
    .slice(0, 12);
  const res = await call<{ ok: boolean; error?: string; prizes?: Prize[] }>("wheel_save", { p_prizes: clean });
  revalidatePath("/shop/wheel");
  return res ?? { ok: false, error: "network" };
}

/**
 * A wheel shop's card, in one question: how many tampons for a turn. The gift
 * is the wheel itself, the wait and the colour stay as they are; the customers
 * on their way keep the card they started.
 */
export async function saveWheelGoal(goal: number): Promise<boolean> {
  if (!Number.isInteger(goal) || goal < 3 || goal > 30) return false;
  const me = await getMe();
  if (!me?.shop?.wheel_on) return false;
  const res = await call<{ ok: boolean }>("save_card", { p_goal: goal, p_gift: "الروليت", p_color: me.shop.color, p_gap: null, p_move: false });
  revalidatePath("/", "layout");
  return !!res?.ok;
}

/** The founder switches a shop to the wheel, or back to its gift. */
export async function adminSetWheel(id: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(id)) return { ok: false };
  const res = await call<{ ok: boolean; error?: string }>("admin_set_wheel", { p_id: id, p_on: on });
  revalidatePath("/admin", "layout");
  return res ?? { ok: false, error: "network" };
}
