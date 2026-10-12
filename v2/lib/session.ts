import "server-only";
import { cache } from "react";
import { cookies } from "next/headers";
import { call } from "@/lib/supabase";

export type Shop = { id: string; name: string; kind: string; goal: number | null; gift: string | null; color: string; paused?: boolean; signal?: string; logo?: string | null; stamp_logo?: boolean; stamp_gap?: number; items_on?: boolean; store_on?: boolean; wheel_on?: boolean };
export type Me = { id: string; name: string; phone: string | null; admin?: boolean; shop: Shop | null; seen?: string[]; code?: string | null; tester?: boolean; phone_check?: "ask" | "sent" | null };

/** Who is here: null when nobody is signed in (no network call without a session cookie). */
// once per request: the owner's layout and its page both ask
export const getMe = cache(async (): Promise<Me | null> => {
  const jar = await cookies();
  if (!jar.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token") && c.value)) return null;
  return call<Me>("me");
});

/**
 * The sign-in this browser is under (the access token's session_id claim): one
 * per phone, so the console can tell an owner's phones apart. Read off the
 * cookie without a call; trust it only once the token has passed (getMe).
 */
export async function sessionId(): Promise<string | null> {
  const parts = (await cookies())
    .getAll()
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token") && !c.name.includes("code-verifier") && c.value)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  if (!parts.length) return null;
  try {
    const raw = parts.map((c) => c.value).join("");
    const json = raw.startsWith("base64-") ? Buffer.from(raw.slice(7), "base64").toString("utf8") : decodeURIComponent(raw);
    const token = JSON.parse(json)?.access_token as string;
    const id = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"))?.session_id;
    return typeof id === "string" && /^[0-9a-f-]{36}$/i.test(id) ? id : null;
  } catch {
    return null;
  }
}

/** Where a signed-in person belongs: the founder at the console, an owner at home (or finishing the setup), a customer at the wallet. */
export function homeOf(me: Me): string {
  if (me.admin) return "/admin";
  if (!me.shop) return "/";
  if (!me.shop.goal) return "/shop/card";
  return "/shop";
}
