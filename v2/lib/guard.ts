import "server-only";
import { headers } from "next/headers";
import { after } from "next/server";
import { service } from "@/lib/supabase";
import { esc, tg } from "@/lib/telegram";

/**
 * The guard at the doors that make or open an account (public.guard): every
 * knock written down with its address and number (guard_log), and stopped
 * when the address or the number is blocked, or knocks too often. When the
 * count cannot be kept (the network), the door
 * stays open: a customer at the counter never waits on the guard. The
 * machine's own addresses (the test scripts, dozens of accounts a run) pass
 * unwritten.
 */

const LOCAL = new Set(["local", "::1", "127.0.0.1", "::ffff:127.0.0.1"]);

/** The caller's address, as Vercel saw it. */
export async function address(): Promise<string> {
  const h = await headers();
  return h.get("x-real-ip") ?? h.get("x-forwarded-for")?.split(",")[0]?.trim() ?? "local";
}

const DOORS: Record<string, string> = { join: "كونت جديد", login: "الدخول", form: "فورم" };

/** One knock: true to let it through. `max` in `minutes` from one address, and `day` in a day. */
export async function gate(door: string, phone: string | null, max: number, minutes: number, day: number | null = null): Promise<boolean> {
  const ip = await address();
  if (LOCAL.has(ip)) return true;
  const { data, error } = await service().rpc("guard", { p_door: door, p_ip: ip, p_phone: phone ? `+216${phone}` : null, p_max: max, p_minutes: minutes, p_day: day });
  if (error || typeof data !== "string") return true;
  // the first stop of an address in an hour: a word to the founder, once
  if (data.endsWith("!")) {
    after(() =>
      tg(`🛡 <b>تسكّر الباب</b> · ${esc(DOORS[door] ?? door)}\nبرشا محاولات من نفس الأدرسة: <code>${esc(ip)}</code>${phone ? `\nآخر نومرو: ${esc(`+216${phone}`)}` : ""}`),
    );
  }
  return data === "ok";
}

/** A knock that went wrong after the door — a wrong password, a bot's trap — written down. */
export async function note(door: string, phone: string | null, why: "wrong" | "trap"): Promise<void> {
  const ip = await address();
  if (LOCAL.has(ip)) return;
  after(async () => {
    await service().rpc("guard_note", { p_door: door, p_ip: ip, p_phone: phone ? `+216${phone}` : null, p_why: why });
  });
}

/**
 * The bots' trap: a field no person sees, out of the tab order and of
 * autofill (components/Trap.tsx). A bot that fills every field it finds
 * fills it too.
 */
export const TRAP = "pl_site";
export const trapped = (v: unknown) => typeof v === "string" && v.trim() !== "";
