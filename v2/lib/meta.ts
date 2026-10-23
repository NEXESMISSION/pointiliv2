import "server-only";
import { createHash, randomUUID } from "node:crypto";
import { cookies, headers } from "next/headers";
import { getSettings } from "@/lib/settings";
import { service } from "@/lib/supabase";
import { shopFacts } from "@/lib/telegram";

/**
 * Facebook's Conversions API: the steps of an owner's way in, told to Meta
 * from our server as well as from the browser's pixel (lib/pixel), so a
 * sign-up the browser could not send (a blocker, the in-app browser closed
 * too soon) still counts, and Meta also learns what came after it — the shop
 * really used, the subscription paid — which the browser never sees.
 *
 * - CompleteRegistration: the account and the shop made (the owner's own request:
 *   his address, his browser, Facebook's _fbp/_fbc cookies). The same event_id
 *   goes to the browser in the `pl-reg` cookie, so Meta counts the pair once.
 * - ShopActivated (custom): the shop's first real customer, an hour or more after
 *   it opened (the first hour is the owner trying it, as the console's board counts it).
 * - Purchase: the founder turned the subscription on, with what was paid; the
 *   owner's popup sends the same event_id from the browser (PlanOn).
 *
 * The person is matched by the owner's phone and account id, hashed (SHA-256),
 * never sent in clear. META_CAPI_TOKEN (Events Manager → the dataset → Settings →
 * Conversions API → Generate access token) in the environment; without it, or
 * without a pixel number in the console's settings, nothing is sent. Robots,
 * testers and the founder's own accounts are never sent (shopFacts).
 */

const API = "https://graph.facebook.com/v21.0";
const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pointili.online").replace(/\/$/, "");
/** the cookie the browser's CompleteRegistration takes its event_id from (components/MetaPixel) */
export const REG_COOKIE = "pl-reg";

const sha = (s: string) => createHash("sha256").update(s.trim().toLowerCase()).digest("hex");

/** What the owner's own request says about him: kept before after(), which may run once the answer has left. */
export type MetaRequest = { ip: string | null; ua: string | null; fbp: string | null; fbc: string | null; eventId: string };

/** Read in a server action, on the owner's own request; also hands the browser the event_id to send with its pixel. */
export async function metaRequest(): Promise<MetaRequest> {
  const [h, c] = await Promise.all([headers(), cookies()]);
  const eventId = randomUUID();
  // not httpOnly: the pixel in the browser reads it once, for the same sign-up
  c.set(REG_COOKIE, eventId, { maxAge: 3600, sameSite: "lax", path: "/" });
  return {
    ip: h.get("x-forwarded-for")?.split(",")[0]?.trim() || h.get("x-real-ip"),
    ua: h.get("user-agent"),
    fbp: c.get("_fbp")?.value ?? null,
    fbc: c.get("_fbc")?.value ?? null,
    eventId,
  };
}

/** One event for a shop's owner. Never throws; false when nothing was sent. */
async function send(owner: string, event: string, opts: { req?: MetaRequest; eventId: string; url?: string; custom?: Record<string, string | number> }): Promise<boolean> {
  const token = process.env.META_CAPI_TOKEN;
  if (!token) return false;
  try {
    const [{ meta }, f] = await Promise.all([getSettings(), shopFacts({ owner })]);
    if (!meta.pixel || !f) return false;
    const digits = (f.owner.phone ?? "").replace(/\D/g, "");
    const user_data: Record<string, string | string[]> = { external_id: [sha(owner)], country: [sha("tn")] };
    if (/^216\d{8}$/.test(digits)) user_data.ph = [sha(digits)];
    if (opts.req?.ip) user_data.client_ip_address = opts.req.ip;
    if (opts.req?.ua) user_data.client_user_agent = opts.req.ua;
    if (opts.req?.fbp) user_data.fbp = opts.req.fbp;
    if (opts.req?.fbc) user_data.fbc = opts.req.fbc;
    const body = {
      data: [
        {
          event_name: event,
          event_time: Math.floor(Date.now() / 1000),
          event_id: opts.eventId,
          // a step the owner took on the site; the ones after (a customer's tampon, the founder's hand) happen elsewhere
          action_source: opts.req ? "website" : "system_generated",
          ...(opts.req ? { event_source_url: opts.url ?? `${SITE}/shop/card?new=1` } : {}),
          user_data,
          ...(opts.custom ? { custom_data: opts.custom } : {}),
        },
      ],
      ...(process.env.META_TEST_EVENT_CODE ? { test_event_code: process.env.META_TEST_EVENT_CODE } : {}),
    };
    const res = await fetch(`${API}/${meta.pixel}/events?access_token=${encodeURIComponent(token)}`, {
      method: "POST",
      headers: { "content-type": "application/json" },
      body: JSON.stringify(body),
      signal: AbortSignal.timeout(8000),
    });
    if (!res.ok) console.error("[meta]", event, res.status, (await res.text()).slice(0, 300));
    return res.ok;
  } catch (e) {
    console.error("[meta]", event, (e as Error).message);
    return false;
  }
}

/** The account and the shop made, from the owner's own request (metaRequest, read before after()). */
export function metaRegistration(owner: string, req: MetaRequest): Promise<boolean> {
  return send(owner, "CompleteRegistration", { req, eventId: req.eventId });
}

/** A customer's first tampon at a shop: when it is the shop's first real customer, an hour or more after it opened. */
export async function metaActivated(shopId: string, firstReal: boolean, hoursOpen: number): Promise<boolean> {
  if (!firstReal || hoursOpen < 1) return false;
  const { data: shop } = await service().from("shops").select("owner_id").eq("id", shopId).maybeSingle();
  return shop ? send(shop.owner_id, "ShopActivated", { eventId: `activated-${shopId}` }) : false;
}

/** The founder turned the subscription on: the payment it records (its plan_log line is the event_id the owner's popup sends too). */
export async function metaPurchase(shopId: string): Promise<boolean> {
  const db = service();
  const { data: line } = await db.from("plan_log").select("id, kind, amount").eq("shop_id", shopId).order("created_at", { ascending: false }).limit(1).maybeSingle();
  if (!line || !line.amount || line.kind === "end" || line.kind === "trial") return false;
  const { data: shop } = await db.from("shops").select("owner_id").eq("id", shopId).maybeSingle();
  return shop ? send(shop.owner_id, "Purchase", { eventId: `plan-${line.id}`, custom: { value: line.amount, currency: "TND", content_name: "abonnement" } }) : false;
}
