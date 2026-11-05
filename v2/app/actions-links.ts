"use server";

import { headers } from "next/headers";
import { call } from "@/lib/supabase";
import { SITE } from "@/lib/seo";

/** The site's own address in production; on a computer trying it, the address it is opened at. */
async function origin(): Promise<string> {
  if (process.env.NODE_ENV === "production") return SITE;
  const h = await headers();
  const host = h.get("host");
  return host && /^(localhost|127\.0\.0\.1|\[::1\])(:\d+)?$/.test(host) ? `http://${host}` : SITE;
}

/**
 * A tampon sent as a link, for an owner who sells online (supabase/schema.sql,
 * «links»): each link is new, one use, no clock. The token comes back once,
 * here, as the whole address; the database keeps only its SHA-256, so a link
 * lost is cancelled and another made.
 */
export type LinkState = "waiting" | "opened" | "soon" | "used" | "cancelled";
export type LinkRow = { id: string; at: string; label: string | null; state: LinkState; used_at: string | null; name: string | null; item: string | null };
export type Links = { waiting: number; used: number; links: LinkRow[] };

const UUID = /^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$/i;
const TOKEN = /^[A-Za-z0-9_-]{20,64}$/;

/** A new link: the address to send, or why not (no_card, paused, shut, pick_item, slow_down, too_many, network). */
export async function newLink(label: string, item: number | null): Promise<{ ok: true; url: string; id: string } | { ok: false; error: string }> {
  const name = String(label ?? "").slice(0, 80);
  if (item !== null && !Number.isSafeInteger(item)) return { ok: false, error: "pick_item" };
  const res = await call<{ ok: boolean; error?: string; id?: string; token?: string }>("link_new", { p_label: name, p_item: item });
  if (!res) return { ok: false, error: "network" };
  if (!res.ok || !res.token || !TOKEN.test(res.token) || !res.id) return { ok: false, error: res.error ?? "network" };
  return { ok: true, url: `${await origin()}/s/${res.token}`, id: res.id };
}

/** The owner's links, the latest first, and how many wait and were used. */
export async function myLinks(): Promise<Links | null> {
  const res = await call<{ ok: boolean } & Links>("my_links");
  if (!res?.ok) return null;
  return { waiting: res.waiting ?? 0, used: res.used ?? 0, links: res.links ?? [] };
}

/** A link that waits, cancelled: it gives nothing from now on. */
export async function cancelLink(id: string): Promise<boolean> {
  if (!UUID.test(String(id ?? ""))) return false;
  const res = await call<{ ok: boolean }>("link_cancel", { p_id: id });
  return !!res?.ok;
}
