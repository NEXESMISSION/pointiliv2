"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";

/**
 * The customer chooses the gift (13 Nov 2026, supabase/choice-2026-11-13.sql): the owner lists the options — the
 * card's one gift text becomes «قهوة · كرواسون · عصير» — and the customer picks one when the card is full.
 */

/** The owner lists 2 to 4 gifts the customer chooses from, or takes the choice away (null). */
export async function setGiftChoices(options: string[] | null): Promise<{ ok: boolean; error?: string; gift?: string }> {
  const clean = options === null ? null : options.map((o) => String(o ?? "").replace(/·/g, " ").trim()).filter(Boolean).slice(0, 4);
  const res = await call<{ ok: boolean; error?: string; gift?: string }>("set_gift_choices", { p_options: clean });
  revalidatePath("/shop", "layout");
  return res ?? { ok: false, error: "network" };
}

/** One of the voucher's options becomes its gift: the customer on their card, or the counter handing it over. */
export async function chooseGift(moment: number, option: string): Promise<boolean> {
  if (!Number.isSafeInteger(moment)) return false;
  const res = await call<{ ok: boolean }>("choose_gift", { p_moment: moment, p_option: String(option ?? "").slice(0, 40) });
  return !!res?.ok;
}
