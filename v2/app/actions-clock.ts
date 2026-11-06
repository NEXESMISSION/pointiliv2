"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";

/**
 * The card's clock and its safeguards (supabase/schema.sql, «the card's clock»; the founder, 7 Nov 2026:
 * «off by default for all first, a way to pause it so he does not mess it up, and safeguards for the
 * owner and his customers»). Every rule lives in the database; these only ask it.
 */
const UUID = /^[0-9a-f-]{36}$/i;
type Res = { ok: boolean; error?: string; n?: number };

/** The founder's switch, for every shop at once: off, no owner sees the clock and no card goes back to zero. */
export async function adminSetClock(on: boolean): Promise<Res> {
  const res = await call<Res>("admin_set_clock", { p_on: on });
  revalidatePath("/", "layout");
  return res ?? { ok: false, error: "network" };
}

/** The owner's pause («وقّف العدّاد»): on, no card goes back to zero; off, it counts from today for everyone. */
export async function setClockPaused(on: boolean): Promise<Res> {
  const res = await call<Res>("set_reset_paused", { p_on: on });
  revalidatePath("/shop", "layout");
  return res ?? { ok: false, error: "network" };
}

/** What the clock took, given back (within 14 days): one customer's card, or every card it took (no card). */
export async function restoreReset(card?: string): Promise<Res> {
  if (card !== undefined && !UUID.test(card)) return { ok: false };
  const res = await call<Res>("restore_reset", card ? { p_card: card } : {});
  revalidatePath("/shop", "layout");
  return res ?? { ok: false, error: "network" };
}

/**
 * The owner turns the clock on, or changes its days, from its own page (the founder, 7 Nov 2026: «off on the
 * owner's side by default — they need to turn it on so it works for them»). 7 to 365 days; it counts from today
 * for everyone (set_reset_days writes reset_since).
 */
export async function setClockDays(days: number): Promise<Res> {
  if (!Number.isInteger(days) || days < 7 || days > 365) return { ok: false, error: "bad_days" };
  const res = await call<Res>("set_reset_days", { p_days: days });
  revalidatePath("/shop", "layout");
  return res ?? { ok: false, error: "network" };
}

/** The clock taken off altogether (the owner's own «نحّي العدّاد»): no card goes back to zero any more. */
export async function clockOff(): Promise<Res> {
  const res = await call<Res>("set_reset_days", { p_days: null });
  revalidatePath("/shop", "layout");
  return res ?? { ok: false, error: "network" };
}
