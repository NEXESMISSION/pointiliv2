"use server";

import type { Pay } from "@/components/Pay";
import { call } from "@/lib/supabase";

/**
 * Right after the shop's first customer, on the counter: when its 48-hour offer
 * ends, or null when there is nothing to show (paid already, the founder's or a
 * test shop, or no offer running). Asking is what starts the offer's clock: it
 * waits for the shop's first customer (v2.my_payment). The founder, 23 Oct
 * 2026: owners did not understand Pointili is paid until the trial stopped.
 */
export async function firstScanOffer(): Promise<string | null> {
  const pay = await call<Pay | null>("my_payment");
  if (!pay || pay.paid || pay.exempt || !pay.offer || !pay.offer_until) return null;
  return pay.offer_until;
}
