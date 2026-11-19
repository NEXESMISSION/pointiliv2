"use server";

import { revalidatePath } from "next/cache";
import { STAGE_KEYS } from "@/lib/board";
import { call } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

/** One shop of the board, opened: its card, its switches, what happened lately, and its access's story. */
export type BoardMore = {
  id: string;
  goal: number | null;
  gift: string | null;
  paused: boolean;
  wheel_allowed: boolean;
  wheel_on: boolean;
  store_on: boolean;
  items_on: boolean;
  /** the sign-up code: on, and how many customers it brought */
  join_on: boolean;
  joined: number;
  owner_id: string;
  recent: { kind: "stamp" | "gift"; at: string; given: boolean; who: string | null }[];
  plan: { kind: "paid" | "until" | "end" | "trial"; months: number | null; until: string | null; amount: number | null; at: string }[];
};

/** The rest of a shop, read when the founder opens it on the board (never for the whole list at once). */
export async function adminBoardShop(id: string): Promise<BoardMore | null> {
  if (!UUID.test(id)) return null;
  return call<BoardMore | null>("admin_board_shop", { p_id: id });
}

/**
 * The founder's one line about a shop, written on the board itself (crm.note;
 * an empty line clears it). No page refresh: the line is already on his screen.
 */
export async function adminShopNote(shopId: string, note: string): Promise<boolean> {
  if (!UUID.test(shopId)) return false;
  const text = String(note ?? "").trim().slice(0, 300);
  const res = await call<{ ok: boolean }>("admin_crm_set", { p_shop: shopId, p_note: text });
  return !!res?.ok;
}

/** a voice note on a shop: how long, and when (the sound itself only ever comes through /api/admin/voice/[id]) */
export type Voice = { id: string; secs: number; at: string };

/** A shop's voice notes, the newest first: read when the founder opens them on its line (the database checks he is an admin). */
export async function adminVoices(shopId: string): Promise<Voice[]> {
  if (!UUID.test(shopId)) return [];
  return (await call<Voice[]>("admin_voices", { p_shop: shopId })) ?? [];
}

/** The founder turns a shop's sign-up code on or off (/shop/join: a static QR that only makes accounts). */
export async function adminSetJoin(shopId: string, on: boolean): Promise<{ ok: boolean; error?: string }> {
  if (!UUID.test(shopId)) return { ok: false };
  return (await call<{ ok: boolean; error?: string }>("admin_set_join", { p_id: shopId, p_on: !!on })) ?? { ok: false, error: "network" };
}

/** The founder tapped his help message for a shop (components/HelpMsg): kept, so its button says so on any phone. When, or null. */
export async function adminHelpSent(shopId: string): Promise<string | null> {
  if (!UUID.test(shopId)) return null;
  const res = await call<{ ok: boolean; at?: string }>("admin_help_sent", { p_shop: shopId });
  return res?.ok && res.at ? res.at : null;
}

/** The founder tapped his reminder of the trial's end for a shop (components/HelpMsg: RemindMsg): kept the same way. When, or null. */
export async function adminRemindSent(shopId: string): Promise<string | null> {
  if (!UUID.test(shopId)) return null;
  const res = await call<{ ok: boolean; at?: string }>("admin_remind_sent", { p_shop: shopId });
  return res?.ok && res.at ? res.at : null;
}

/** The founder's follow-up of a shop, picked next to his note (lib/board STAGES): kept with when it was picked. */
export async function adminShopStage(shopId: string, stage: string): Promise<boolean> {
  if (!UUID.test(shopId) || !STAGE_KEYS.includes(stage)) return false;
  const res = await call<{ ok: boolean }>("admin_crm_set", { p_shop: shopId, p_stage: stage });
  return !!res?.ok;
}

/** an account found by its name or its number */
export type Found = { id: string; name: string; phone: string | null; admin: boolean; shop: string | null; cards: number; stamps: number };

/** Someone who forgot their password: found by a name or a number (spaces and +216 do not matter). Real accounts only. */
export async function adminFind(q: string): Promise<Found[]> {
  let text = String(q ?? "").trim().slice(0, 40);
  // a number however it is typed: «58 415 521», «+216 58415521»
  if (/^[\d\s+()-]+$/.test(text)) text = text.replace(/\D/g, "").replace(/^216(?=\d{8}$)/, "");
  if (text.length < 2) return [];
  const list = await call<Found[]>("admin_people", { p_q: text, p_tests: false });
  return (list ?? []).slice(0, 12);
}

/** A fixed cost written (no id) or changed (lib/money: the founder's bills that come back). */
export async function adminFixedSave(f: { id?: number | null; what: string; kind: string; amount: number; usd?: number | null; every: number; next: string }): Promise<boolean> {
  const amount = Number(f.amount);
  const usd = f.usd == null ? null : Number(f.usd);
  if (!Number.isFinite(amount) || amount <= 0 || (usd !== null && (!Number.isFinite(usd) || usd <= 0)) || !/^\d{4}-\d{2}-\d{2}$/.test(String(f.next ?? ""))) return false;
  const res = await call<{ ok: boolean }>("admin_fixed_save", {
    p_id: f.id && Number.isInteger(f.id) ? f.id : null,
    p_what: String(f.what ?? "").trim().slice(0, 80),
    p_kind: String(f.kind ?? "tools"),
    p_amount: Math.round(amount * 1000) / 1000,
    p_usd: usd === null ? null : Math.round(usd * 100) / 100,
    p_every: Math.max(1, Math.min(12, Math.round(Number(f.every) || 1))),
    p_next: f.next,
  });
  revalidatePath("/admin/money");
  return !!res?.ok;
}

/** A fixed cost given up (its lines in the books stay). */
export async function adminFixedDrop(id: number): Promise<boolean> {
  if (!Number.isInteger(id) || id <= 0) return false;
  const res = await call<{ ok: boolean }>("admin_fixed_drop", { p_id: id });
  revalidatePath("/admin/money");
  return !!res?.ok;
}

/** A fixed cost paid: its line in the books, and its next day a period on. The next day, or null. */
export async function adminFixedPay(id: number, amount: number, on: string | null): Promise<string | null> {
  const sum = Number(amount);
  if (!Number.isInteger(id) || id <= 0 || !Number.isFinite(sum) || sum <= 0 || sum > 1_000_000) return null;
  const res = await call<{ ok: boolean; next_on?: string }>("admin_fixed_pay", { p_id: id, p_amount: Math.round(sum * 1000) / 1000, p_on: on && /^\d{4}-\d{2}-\d{2}$/.test(on) ? on : null });
  revalidatePath("/admin/money");
  return res?.ok ? (res.next_on ?? null) : null;
}
