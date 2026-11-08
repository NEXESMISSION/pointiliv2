"use server";

import { headers } from "next/headers";
import { revalidatePath } from "next/cache";
import { call } from "@/lib/supabase";
import { SITE } from "@/lib/seo";
import type { MyStaff, StorePreview } from "@/lib/packs";
import type { Pack } from "@/lib/plans";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/** The site's own address in production; on a computer trying it, the address it is opened at. */
async function origin(): Promise<string> {
  if (process.env.NODE_ENV === "production" && !process.env.NEXT_PUBLIC_SUPABASE_URL?.startsWith("http://127.0.0.1")) return SITE;
  const h = await headers();
  const host = h.get("host");
  return host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ? `http://${host}` : SITE;
}

// ─── the founder ───────────────────────────────────────────────────────────

/** what moving a shop to a pack changes, said before (admin_pack_preview) */
export async function adminPackPreview(shopId: string, pack: Pack): Promise<{ changes: string[]; blocked: string | null } | null> {
  if (!UUID.test(String(shopId ?? ""))) return null;
  const res = await call<{ ok: boolean; changes: string[]; blocked?: string | null }>("admin_pack_preview", { p_id: shopId, p_pack: pack });
  return res?.ok ? { changes: res.changes ?? [], blocked: res.blocked ?? null } : null;
}

/** The founder puts a shop on a pack (its switches follow), or names it «old» (nothing moves). */
export async function adminSetPack(shopId: string, pack: Pack): Promise<{ ok: true } | { ok: false; error: string }> {
  if (!UUID.test(String(shopId ?? "")) || !["old", "base", "pro"].includes(pack)) return { ok: false, error: "invalid" };
  const res = await call<{ ok: boolean; error?: string }>("admin_set_pack", { p_id: shopId, p_pack: pack });
  if (!res) return { ok: false, error: "network" };
  return res.ok ? { ok: true } : { ok: false, error: res.error ?? "network" };
}

// ─── the owner: the reward ──────────────────────────────────────────────────

/** what switching to or from the store would do to the customers */
export async function storePreview(): Promise<StorePreview | null> {
  const res = await call<StorePreview | { ok: false }>("store_preview");
  return res && res.ok ? (res as StorePreview) : null;
}

/** The owner switches the reward to the store (Pro) or back to the card: how many gifts it wrote. */
export async function setStore(on: boolean): Promise<{ ok: true; gifts: number } | { ok: false; error: string }> {
  const res = await call<{ ok: boolean; error?: string; gifts?: number }>("set_store", { p_on: !!on });
  if (!res) return { ok: false, error: "network" };
  if (!res.ok) return { ok: false, error: res.error ?? "network" };
  revalidatePath("/shop", "layout");
  return { ok: true, gifts: res.gifts ?? 0 };
}

// ─── the owner: staff phones (Pro) ──────────────────────────────────────────

export async function myStaff(): Promise<MyStaff | null> {
  const res = await call<MyStaff>("my_staff");
  return res?.ok ? res : null;
}

/** A link for one more staff phone: the whole address, shown once (only its SHA-256 is kept). */
export async function staffInvite(): Promise<{ ok: true; url: string } | { ok: false; error: string }> {
  const res = await call<{ ok: boolean; error?: string; token?: string }>("staff_invite");
  if (!res) return { ok: false, error: "network" };
  if (!res.ok || !res.token || !TOKEN.test(res.token)) return { ok: false, error: res.error ?? "network" };
  return { ok: true, url: `${await origin()}/staff/join/${res.token}` };
}

/** The invites sent and not used yet, called off: how many (null: not done). */
export async function staffInviteCancel(): Promise<number | null> {
  const res = await call<{ ok: boolean; n?: number }>("staff_invite_cancel");
  return res?.ok ? (res.n ?? 0) : null;
}

export async function staffRemove(id: number): Promise<boolean> {
  if (!Number.isSafeInteger(id) || id < 1) return false;
  return !!(await call<{ ok: boolean }>("staff_remove", { p_id: id }))?.ok;
}

// ─── the staff phone ────────────────────────────────────────────────────────

/** The invite opened, signed in: in the shop's staff, or why not (invalid, used, expired, owner, elsewhere, full). */
export async function staffJoin(token: string): Promise<{ ok: true; shop: string } | { ok: false; error: string }> {
  if (!TOKEN.test(String(token ?? ""))) return { ok: false, error: "invalid" };
  const res = await call<{ ok: boolean; error?: string; shop?: string }>("staff_join", { p_token: token });
  if (!res) return { ok: false, error: "network" };
  return res.ok ? { ok: true, shop: res.shop ?? "" } : { ok: false, error: res.error ?? "network" };
}

export async function staffLeave(): Promise<boolean> {
  const ok = !!(await call<{ ok: boolean }>("staff_leave"))?.ok;
  revalidatePath("/", "layout");
  return ok;
}
