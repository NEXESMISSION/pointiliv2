"use server";

import { getMe } from "@/lib/session";
import { service } from "@/lib/supabase";

const VISITOR = /^[A-Za-z0-9_-]{8,64}$/;

/**
 * Pointili already on this phone, from this very browser: the installed app shares the storage of
 * the browser that installed it (Android), so it carries the same visitor id (lib/track: pt_v) —
 * and the traffic has a visit opened as the app with it. Chrome never offers an app it already has,
 * and its own check (getInstalledRelatedApps) can miss an install from before the manifest named it.
 *
 * The visitor, not the account or the screen: an owner can be signed in on several phones of the
 * same model (the owner of «سلطان العطور», 6 Nov 2026: two Androids of 360×820, the app installed on
 * one, never offered on the other) — and a «same account, same screen» guess told the other phone it
 * had the app. Asked only by a tap the browser has not answered (lib/pwa: tapInstall), never on a
 * page's load. It says yes or no, nothing about the visit.
 */
export async function appOnThisPhone(visitor: string): Promise<boolean> {
  if (!VISITOR.test(String(visitor ?? ""))) return false;
  const { count, error } = await service().from("visits").select("id", { count: "exact", head: true }).eq("visitor", visitor).eq("standalone", true);
  return !error && (count ?? 0) > 0;
}

/**
 * This account already opened Pointili as the installed app on this kind of phone ("iOS" or "Android"): the
 * customers' ask then never comes (components/InstallApp: CustomerAsk). On an iPhone the app keeps its own
 * storage, apart from Safari's, and a scanned code always opens in Safari: only the account's own visits can
 * tell Safari that the app is already there. Signed out, or anything wrong: no.
 */
export async function appOnAccount(os: string): Promise<boolean> {
  if (os !== "iOS" && os !== "Android") return false;
  const me = await getMe().catch(() => null);
  if (!me) return false;
  const { count, error } = await service().from("visits").select("id", { count: "exact", head: true }).eq("user_id", me.id).eq("standalone", true).eq("os", os);
  return !error && (count ?? 0) > 0;
}
