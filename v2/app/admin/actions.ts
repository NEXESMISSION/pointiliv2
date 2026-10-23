"use server";

import { call } from "@/lib/supabase";

const UUID = /^[0-9a-f-]{36}$/i;

/** One shop of the board, opened: its switches, what happened lately, the money and the signs of interest. */
export type BoardMore = {
  id: string;
  goal: number | null;
  gift: string | null;
  paused: boolean;
  wheel_allowed: boolean;
  wheel_on: boolean;
  store_on: boolean;
  items_on: boolean;
  owner_id: string;
  /** customers who came back on another day */
  returning: number;
  /** gifts handed over */
  gifts: number;
  recent: { kind: "stamp" | "gift"; at: string; given: boolean; who: string | null }[];
  /** the owner opened the pay page, last; tapped a WhatsApp to pay (or the trial's), last */
  pay_seen: string | null;
  wa_at: string | null;
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
