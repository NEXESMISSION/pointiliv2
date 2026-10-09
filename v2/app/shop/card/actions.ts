"use server";

import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";

/** The stamps on the card: the tick, or the shop's own logo (only with a logo to draw). */
export async function setStampLogo(on: boolean): Promise<{ ok: boolean; error?: string }> {
  const res = await call<{ ok: boolean; error?: string }>("set_stamp_logo", { p_on: !!on });
  if (!res?.ok) return { ok: false, error: res?.error ?? "network" };
  revalidatePath("/", "layout");
  return { ok: true };
}
