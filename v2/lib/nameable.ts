import "server-only";
import { service } from "@/lib/supabase";

/**
 * The cards of this shop whose customer it may still name (app/actions-customers.ts, nameCustomer): the numbers it
 * gave a tampon to at the counter, whose person has not signed up yet. Server-only: read with the service key.
 */
export async function nameableCards(shop: string): Promise<Set<string>> {
  const admin = service();
  const { data: people } = await admin.from("people").select("id").eq("made_by_shop", shop).eq("password_set", false).limit(2000);
  const ids = (people ?? []).map((p) => p.id);
  if (!ids.length) return new Set();
  const { data: cards } = await admin.from("cards").select("id").eq("shop_id", shop).in("user_id", ids);
  return new Set((cards ?? []).map((x) => x.id));
}
