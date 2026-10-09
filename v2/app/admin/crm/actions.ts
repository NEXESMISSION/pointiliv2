"use server";

import { revalidatePath } from "next/cache";
import { KINDS, OUTCOMES, STAGES, type Kind, type Outcome, type Stage } from "@/lib/crm";
import { call } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;
const DAY = /^\d{4}-\d{2}-\d{2}$/;

/** the pages that show a shop's follow-up: the list, and the shop's own page */
const touched = (shop: string) => {
  revalidatePath("/admin/crm");
  revalidatePath(`/admin/shops/${shop}`);
};

/**
 * Where a shop stands, by the founder's hand: a stage, the day to come back
 * to it (null clears it), a note. Only what is given changes.
 */
export async function crmSet(shop: string, patch: { stage?: Stage; next?: string | null; note?: string }): Promise<{ ok: boolean; stage?: Stage }> {
  if (!UUID.test(shop)) return { ok: false };
  if (patch.stage !== undefined && !STAGES.some((s) => s.id === patch.stage)) return { ok: false };
  if (patch.next != null && !DAY.test(patch.next)) return { ok: false };
  if (patch.note !== undefined && patch.note.length > 2000) return { ok: false };
  const res = await call<{ ok: boolean; stage?: Stage }>("admin_crm_set", {
    p_shop: shop,
    p_stage: patch.stage ?? null,
    p_next: patch.next ?? null,
    p_clear_next: patch.next === null,
    p_note: patch.note ?? null,
  });
  if (res?.ok) touched(shop);
  return { ok: !!res?.ok, stage: res?.stage };
}

/** A word with the owner written down: a call, a WhatsApp, a visit or a note — with what came of it. */
export async function crmLog(shop: string, kind: Kind, outcome: Outcome | null, text: string): Promise<{ ok: boolean; stage?: Stage }> {
  if (!UUID.test(shop) || !KINDS.some((k) => k.id === kind)) return { ok: false };
  if (outcome !== null && !OUTCOMES[kind].some((o) => o.id === outcome)) return { ok: false };
  const what = text.trim().slice(0, 2000);
  if (kind === "note" && what.length < 1) return { ok: false };
  const res = await call<{ ok: boolean; stage?: Stage }>("admin_crm_log", { p_shop: shop, p_kind: kind, p_outcome: outcome, p_text: what });
  if (res?.ok) touched(shop);
  return { ok: !!res?.ok, stage: res?.stage };
}

/** A line of the log taken back (a slip of the finger). */
export async function crmUnlog(shop: string, id: number): Promise<boolean> {
  if (!UUID.test(shop) || !Number.isInteger(id) || id <= 0) return false;
  const res = await call<{ ok: boolean }>("admin_crm_unlog", { p_id: id });
  if (res?.ok) touched(shop);
  return !!res?.ok;
}
