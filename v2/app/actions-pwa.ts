"use server";

import { db, service } from "@/lib/supabase";

const SCREEN = /^\d{2,5}x\d{2,5}$/;

/**
 * Pointili already on this phone: the signed-in person has opened it as the installed app (a visit
 * in standalone mode) on an Android phone with this very screen. Chrome never offers an app it
 * already has, and Brave or another browser on the same phone cannot tell — the owner of «سلطان
 * العطور» installed it on 3 Nov 2026, then tapped install for days in vain (6 Nov). Asked only by
 * a tap Chrome has not answered (lib/pwa: tapInstall), never on a page's load.
 */
export async function appOnThisPhone(screen: string): Promise<boolean> {
  if (!SCREEN.test(String(screen ?? ""))) return false;
  const { data } = await (await db()).auth.getUser();
  if (!data.user) return false;
  const { count, error } = await service()
    .from("visits")
    .select("id", { count: "exact", head: true })
    .eq("user_id", data.user.id)
    .eq("standalone", true)
    .eq("os", "Android")
    .eq("screen", screen);
  return !error && (count ?? 0) > 0;
}
