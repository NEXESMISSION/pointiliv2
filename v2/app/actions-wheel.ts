"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";
import type { Prize, SpinResult } from "@/components/Wheel";

/**
 * The wheel of a shop the founder allowed it and its owner turned it on: a
 * full card is a turn («دورة») of the owner's wheel. Every rule lives in the database (supabase/schema.sql,
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

/** The owner turns the wheel on for his customers, or off (a shop the founder allowed it). */
export async function setWheel(on: boolean): Promise<{ ok: boolean; error?: string }> {
  const res = await call<{ ok: boolean; error?: string }>("set_wheel", { p_on: !!on });
  revalidatePath("/", "layout");
  return res ?? { ok: false, error: "network" };
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

/** The founder switches a shop to the wheel, or back to its gift. */
export async function adminSetWheel(id: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(id)) return { ok: false };
  const res = await call<{ ok: boolean; error?: string }>("admin_set_wheel", { p_id: id, p_on: on });
  revalidatePath("/admin", "layout");
  return res ?? { ok: false, error: "network" };
}
