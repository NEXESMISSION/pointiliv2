import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@supabase/supabase-js";
import { createAdminClient } from "@/lib/supabase/admin";
import { ANALYTICS_ID_RE, PAGE_VIEW_ID_RE, cleanPath } from "@/lib/analytics/shared";
import { geo, isTest, parseAgent, refName, tag } from "@/lib/analytics/server";
import { clientIp } from "@/lib/url";

/**
 * Where components/analytics/Beacon.tsx sends its batches. It answers 204 to
 * everything — a tracker has nothing to do with an error — and keeps out of
 * the session: proxy.ts does not run here, so a batch sent while a page closes
 * can never be the request that rotates a refresh token and loses it.
 */
export const dynamic = "force-dynamic";

const MAX_BODY = 24_000;
const MAX_EVENTS = 40;
const KINDS = new Set(["view", "time", "click"]);

const done = () => new NextResponse(null, { status: 204, headers: { "Cache-Control": "no-store" } });

export async function POST(request: NextRequest) {
  try {
    await ingest(request);
  } catch (e) {
    console.error("[ev]", e instanceof Error ? e.message : e);
  }
  return done();
}

type Incoming = {
  k?: unknown; // kind
  p?: unknown; // path
  pv?: unknown; // page-view id
  a?: unknown; // age in ms when the batch left
  r?: unknown; // referrer (first view of a page load)
  us?: unknown; // utm_source
  um?: unknown; // utm_medium
  uc?: unknown; // utm_campaign
  ms?: unknown; // engaged ms
  x?: unknown;
  y?: unknown;
  dh?: unknown;
  tg?: unknown; // what was tapped
};

const num = (v: unknown, lo: number, hi: number) => {
  const n = typeof v === "number" ? v : Number(v);
  return Number.isFinite(n) ? Math.min(hi, Math.max(lo, n)) : null;
};

async function ingest(request: NextRequest) {
  const text = await request.text();
  if (!text || text.length > MAX_BODY) return;
  if (tooMany(clientIp(request.headers) ?? "?")) return;

  let body: { v?: unknown; s?: unknown; e?: unknown; l?: unknown; w?: unknown; h?: unknown; tp?: unknown; wd?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return;
  }
  const visitor = typeof body.v === "string" && ANALYTICS_ID_RE.test(body.v) ? body.v : null;
  const session = typeof body.s === "string" && ANALYTICS_ID_RE.test(body.s) ? body.s : null;
  if (!visitor || !session || !Array.isArray(body.e) || body.e.length === 0) return;

  const h = request.headers;
  const host = (h.get("host") ?? "").slice(0, 100);
  const agent = parseAgent(h.get("user-agent") ?? "", Number(body.tp) || 0);
  const base = {
    host,
    visitor,
    session,
    user_id: await userOf(request),
    ...geo(h),
    device: agent.device,
    os: agent.os,
    browser: agent.browser,
    in_app: agent.in_app,
    lang: typeof body.l === "string" ? body.l.slice(0, 12) : null,
    vw: num(body.w, 0, 10_000),
    vh: num(body.h, 0, 10_000),
    bot: agent.bot || body.wd === 1,
    test: isTest(host),
  };

  const now = Date.now();
  const rows = (body.e as Incoming[]).slice(0, MAX_EVENTS).flatMap((ev) => {
    if (!ev || typeof ev !== "object" || typeof ev.k !== "string" || !KINDS.has(ev.k) || typeof ev.p !== "string") return [];
    const kind = ev.k;
    const pv = typeof ev.pv === "string" && PAGE_VIEW_ID_RE.test(ev.pv) ? ev.pv : null;
    const age = num(ev.a, 0, 10 * 60_000) ?? 0;
    const view = kind === "view";
    const click = kind === "click";
    const target = click && typeof ev.tg === "string" ? ev.tg.replace(/\s+/g, " ").trim().slice(0, 120) || null : null;
    const y = click ? num(ev.y, 0, 200_000) : null;
    const dh = click ? num(ev.dh, 0, 200_000) : null;
    return [
      {
        ...base,
        kind,
        at: new Date(now - age).toISOString(),
        path: cleanPath(ev.p),
        pv,
        referrer: view ? refName(ev.r, host) : null,
        utm_source: view ? tag(ev.us, 80) : null,
        utm_medium: view ? tag(ev.um, 80) : null,
        utm_campaign: view && typeof ev.uc === "string" ? ev.uc.trim().slice(0, 120) || null : null,
        ms: kind === "time" ? Math.round(num(ev.ms, 0, 3_600_000) ?? 0) : null,
        x: click ? num(ev.x, 0, 1) : null,
        y: y == null ? null : Math.round(y),
        dh: dh == null ? null : Math.round(dh),
        target,
      },
    ];
  });
  if (!rows.length) return;

  const { error } = await createAdminClient().from("analytics_events").insert(rows);
  if (error) console.error("[ev] insert", error.message);
}

/* ── who, if anyone, is signed in ──────────────────────────────────────────── */

const verified = new Map<string, { uid: string | null; until: number }>();

/**
 * The access token from the auth cookie, verified — never just decoded, or
 * anyone could put a name on their visits. Nothing is refreshed here.
 */
async function userOf(request: NextRequest): Promise<string | null> {
  const token = accessToken(request);
  if (!token) return null;
  const hit = verified.get(token);
  if (hit && hit.until > Date.now()) return hit.uid;

  const client = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    auth: { autoRefreshToken: false, persistSession: false },
  });
  const { data } = await client.auth.getClaims(token);
  const uid = typeof data?.claims?.sub === "string" ? data.claims.sub : null;
  const exp = Number(data?.claims?.exp) * 1000;
  if (verified.size > 500) verified.clear();
  verified.set(token, { uid, until: Math.min(Number.isFinite(exp) ? exp : 0, Date.now() + 10 * 60_000) });
  return uid;
}

function accessToken(request: NextRequest): string | null {
  const parts = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token") && !c.name.includes("code-verifier") && c.value)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  if (!parts.length) return null;
  try {
    const raw = parts.map((c) => c.value).join("");
    const json = raw.startsWith("base64-") ? Buffer.from(raw.slice(7), "base64").toString("utf8") : decodeURIComponent(raw);
    const token = JSON.parse(json)?.access_token;
    return typeof token === "string" && token.split(".").length === 3 ? token : null;
  } catch {
    return null;
  }
}

/* ── a flood from one address is dropped, not stored ───────────────────────── */

const hits = new Map<string, { n: number; since: number }>();

function tooMany(ip: string): boolean {
  const now = Date.now();
  const h = hits.get(ip);
  if (!h || now - h.since > 60_000) {
    if (hits.size > 5_000) hits.clear();
    hits.set(ip, { n: 1, since: now });
    return false;
  }
  h.n += 1;
  return h.n > 60;
}
