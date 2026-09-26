/**
 * WHICH DOOR THE OWNER CAME THROUGH.
 *
 * A shop can hold both systems, and mixing their menus into one sidebar was the
 * complaint: a gym owner opening Abonili does not want "كارط الفيدليتي" in his
 * nav, and a café owner does not want "abonnés" in his. So the shell follows
 * the door, exactly the way the language follows /fr.
 *
 * Most routes say which system they belong to by their own path. The few that
 * serve both — the counter QR, the settings, "more" — say nothing, and for
 * those the last answer is remembered in a cookie, so walking from /members to
 * /qr and back does not silently change the menu around you.
 *
 * Kept free of next/headers on purpose: proxy.ts imports this.
 */

export const SYSTEM_COOKIE = "pl_sys";
export const SYSTEM_HEADER = "x-pl-sys";

export type SystemKey = "fidelite" | "abonili";

export function isSystem(v: unknown): v is SystemKey {
  return v === "fidelite" || v === "abonili";
}

const ABONILI = ["/members", "/formules"];
const FIDELITE = ["/dashboard", "/customers", "/loyalty", "/rewards", "/redeem", "/analytics", "/activity"];

/** The system this path belongs to, or null when it serves both. */
export function systemForPath(pathname: string): SystemKey | null {
  const hit = (list: string[]) => list.some((p) => pathname === p || pathname.startsWith(`${p}/`));
  if (hit(ABONILI)) return "abonili";
  if (hit(FIDELITE)) return "fidelite";
  return null;
}

/** Where "home" is inside each system. */
export function systemHome(system: SystemKey): string {
  return system === "abonili" ? "/members" : "/dashboard";
}
