"use server";

import { call } from "@/lib/supabase";
import { tunisMoment, type CardDraw, type DrawGift, type DrawRule } from "@/lib/draw";

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
type Res = { ok: true } | { ok: false; error: string };

/**
 * A new golden ticket draw (supabase/systems-2026-11-08.sql, draw_new): its gifts, its moment — the
 * day and the hour as the owner typed them, in Tunis — and who is in it. Why not, when not:
 * bad_time, bad_gifts, one_open, paused, no_card, not_allowed, too_many, network.
 */
export async function drawNew(input: { title: string; date: string; time: string; rule: DrawRule; gifts: DrawGift[] }): Promise<Res> {
  const at = tunisMoment(String(input?.date ?? ""), String(input?.time ?? ""));
  if (!at) return { ok: false, error: "bad_time" };
  const rule: DrawRule = input?.rule === "cards" ? "cards" : "stamps";
  const gifts = (Array.isArray(input?.gifts) ? input.gifts : [])
    .slice(0, 10)
    .map((g) => ({ name: String(g?.name ?? "").trim().slice(0, 40), n: Math.round(Number(g?.n)) }))
    .filter((g) => g.name);
  if (!gifts.length || gifts.some((g) => !Number.isInteger(g.n) || g.n < 1 || g.n > 50)) return { ok: false, error: "bad_gifts" };
  const res = await call<{ ok: boolean; error?: string }>("draw_new", { p_title: String(input?.title ?? "").trim().slice(0, 40), p_at: at, p_rule: rule, p_gifts: gifts });
  if (!res) return { ok: false, error: "network" };
  return res.ok ? { ok: true } : { ok: false, error: res.error ?? "network" };
}

/** The draw waiting, called off by its owner. */
export async function drawCancel(id: string): Promise<boolean> {
  if (!UUID.test(String(id ?? ""))) return false;
  return !!(await call<{ ok: boolean }>("draw_cancel", { p_id: id }))?.ok;
}

/** A prize handed over to its winner. */
export async function drawGive(win: number): Promise<boolean> {
  if (!Number.isSafeInteger(win) || win < 1) return false;
  return !!(await call<{ ok: boolean }>("draw_give", { p_win: win }))?.ok;
}

/** One card's golden ticket, for the screen right after a tampon (null: a shop that never made a draw). */
export async function myCardDraw(cardId: string): Promise<CardDraw> {
  if (!UUID.test(String(cardId ?? ""))) return null;
  return call<CardDraw>("card_draw", { p_card: cardId });
}

/** The golden prizes this customer (a code or a number, as the counter read it) won here and has not taken. */
export async function drawWinsAt(who: string): Promise<{ id: number; gift: string }[]> {
  const res = await call<{ ok: boolean; wins?: { id: number; gift: string }[] }>("draw_wins_at", { p_who: String(who ?? "").slice(0, 20) });
  return res?.ok ? (res.wins ?? []) : [];
}

/** the founder's view of a shop's new systems (the link, the golden ticket) */
export type AdminSystems = { ok: boolean; links: boolean; draw: boolean; links_made: number; draw_open: string | null; draws: number; pack?: "old" | "base" | "pro"; store_allowed?: boolean; store_on?: boolean; staff_max?: number; staff?: number };

export async function adminSystems(shopId: string): Promise<AdminSystems | null> {
  if (!UUID.test(String(shopId ?? ""))) return null;
  const res = await call<AdminSystems>("admin_systems", { p_id: shopId });
  return res?.ok ? res : null;
}

/** The founder turns a shop's link or golden ticket on or off (the database checks he is an admin). */
export async function adminSetSystem(shopId: string, key: "links" | "draw", on: boolean): Promise<boolean> {
  if (!UUID.test(String(shopId ?? "")) || (key !== "links" && key !== "draw")) return false;
  return !!(await call<{ ok: boolean }>("admin_set_system", { p_id: shopId, p_key: key, p_on: !!on }))?.ok;
}
