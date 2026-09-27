"use server";

import { randomBytes } from "node:crypto";
import { cookies } from "next/headers";
import { createClient } from "@/lib/supabase/server";
import { createAdminClient } from "@/lib/supabase/admin";
import { getContext } from "@/lib/session";
import { TOKEN_RE } from "@/lib/url";
import type { StampResult } from "@/lib/types";

export type ScanOutcome =
  | { kind: "stamped"; result: Extract<StampResult, { ok: true }> }
  | { kind: "error"; code: string; result?: StampResult }
  | { kind: "auth"; businessName: string | null };

const CLAIM_COOKIE = "pd_claim";

/**
 * The whole scan, server-side:
 *  · signed in  → collect_stamp (atomic, replay-proof) and return the card.
 *  · signed out → reserve the token for THIS browser (httpOnly claim cookie) so
 *    the stamp survives registration, then ask the person to sign up / log in.
 * Invoked by the scan page with POST (never on GET), so link previews and
 * prefetchers cannot consume a token.
 */
export async function processScan(token: string): Promise<ScanOutcome> {
  if (typeof token !== "string" || !TOKEN_RE.test(token)) return { kind: "error", code: "invalid" };

  const jar = await cookies();
  const stored = jar.get(CLAIM_COOKIE)?.value ?? "";
  const dot = stored.lastIndexOf(".");
  const storedToken = dot > 0 ? stored.slice(0, dot) : "";
  const storedClaim = dot > 0 ? stored.slice(dot + 1) : "";
  const claim = storedToken === token ? storedClaim : null;

  const ctx = await getContext();
  if (ctx) {
    const supabase = await createClient();
    const { data, error } = await supabase.rpc("collect_stamp", { p_token: token, p_claim: claim });
    if (error || !data) {
      console.error("[scan] collect_stamp", error?.message);
      return { kind: "error", code: "network" };
    }
    const result = data as StampResult;
    if (claim && result.ok !== undefined && !(result.ok === false && result.error === "rate_limited")) {
      jar.delete(CLAIM_COOKIE);
    }
    if (result.ok) return { kind: "stamped", result };
    return { kind: "error", code: result.error, result };
  }

  const newClaim = claim ?? randomBytes(32).toString("base64url");
  const { data, error } = await createAdminClient().rpc("claim_qr_token", { p_token: token, p_claim: newClaim });
  if (error || !data) {
    console.error("[scan] claim", error?.message);
    return { kind: "error", code: "network" };
  }
  const res = data as { ok: boolean; error?: string; business_name?: string };
  if (!res.ok) return { kind: "error", code: res.error ?? "invalid" };

  jar.set(CLAIM_COOKIE, `${token}.${newClaim}`, {
    httpOnly: true,
    secure: process.env.NODE_ENV === "production",
    sameSite: "lax",
    path: "/",
    maxAge: 20 * 60,
  });
  return { kind: "auth", businessName: res.business_name ?? null };
}
