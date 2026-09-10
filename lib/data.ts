import "server-only";
import { cache } from "react";
import { createAdminClient } from "./supabase/admin";
import type { Shop } from "./types";

/**
 * The owner's own shop, read with the service role. lib/auth/owner.ts resolves
 * WHO is asking; this resolves WHAT they own. Nothing here takes a shop id from
 * a URL or a form.
 *
 * THE TRAP (v1, "null means two things"): "I could not ask" is NOT "you have
 * none". A dropped request that returned null here sent a working shop's owner
 * to "créez votre commerce" and, if they believed it, gave them a second shop.
 * An error THROWS and reaches error.tsx; null means the query succeeded and
 * found nothing.
 */

export const SHOP_COLS =
  "id, owner_id, slug, name, colour, stamps_required, reward_label, cooldown_seconds, daily_cap, hand_mode, active, plan, status, trial_ends_at, paid_until, created_at";

/** The shop owned by this Supabase user (MVP: one shop per owner, unique). */
export const ownedShop = cache(async (ownerId: string): Promise<Shop | null> => {
  const db = createAdminClient();
  const { data, error } = await db
    .from("shops")
    .select(SHOP_COLS)
    .eq("owner_id", ownerId)
    .maybeSingle();
  if (error) throw new Error(`ownedShop(${ownerId}): ${error.message}`);
  return (data as Shop | null) ?? null;
});

/**
 * The first shop there is — the dev bypass only (no Supabase configured, never
 * in production). Kept from v1 so the till can be exercised before auth exists.
 */
export const anyShop = cache(async (): Promise<Shop | null> => {
  const db = createAdminClient();
  const { data, error } = await db
    .from("shops")
    .select(SHOP_COLS)
    .order("created_at")
    .limit(1)
    .maybeSingle();
  if (error) throw new Error(`anyShop: ${error.message}`);
  return (data as Shop | null) ?? null;
});

/**
 * shop_is_open(shop): active AND (trial not over OR paid_until in the future).
 * The database owns the rule (0001); this only asks it, so the till, the
 * console and mint_token can never disagree about whether a shop is open.
 */
export async function shopIsOpen(shopId: string): Promise<boolean> {
  const db = createAdminClient();
  const { data, error } = await db.rpc("shop_is_open", { shop: shopId });
  if (error) throw new Error(`shopIsOpen(${shopId}): ${error.message}`);
  return Boolean(data);
}
