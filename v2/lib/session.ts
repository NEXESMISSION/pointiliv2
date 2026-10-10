import "server-only";
import { cookies } from "next/headers";
import { call } from "@/lib/supabase";

export type Shop = { id: string; name: string; kind: string; goal: number | null; gift: string | null; color: string; paused?: boolean; signal?: string; logo?: string | null; stamp_logo?: boolean; stamp_gap?: number; items_on?: boolean };
export type Me = { id: string; name: string; phone: string | null; admin?: boolean; shop: Shop | null; seen?: string[]; code?: string | null; tester?: boolean };

/** Who is here: null when nobody is signed in (no network call without a session cookie). */
export async function getMe(): Promise<Me | null> {
  const jar = await cookies();
  if (!jar.getAll().some((c) => c.name.startsWith("sb-") && c.name.includes("auth-token") && c.value)) return null;
  return call<Me>("me");
}

/** Where a signed-in person belongs: the founder at the console, an owner at home (or finishing the setup), a customer at the wallet. */
export function homeOf(me: Me): string {
  if (me.admin) return "/admin";
  if (!me.shop) return "/";
  if (!me.shop.goal) return "/shop/card";
  return "/shop";
}
