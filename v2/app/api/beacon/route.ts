import { after, NextResponse, type NextRequest } from "next/server";
import { getMe, sessionId } from "@/lib/session";
import { service } from "@/lib/supabase";
import { alertApp, alertCall, appWay, newToApp } from "@/lib/telegram";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;
/**
 * The people this server has already asked about (lib/telegram: newToApp): their next batches, every half-minute
 * while the app is open, ask the database nothing more. Kept while the instance lives; the «once» itself is kept
 * on the person (alertApp), so another instance asking again never rings twice.
 */
const knownInApp = new Set<string>();

/** The phone, its system and browser — Facebook's and Instagram's own browsers named, since the ads open in them. */
function client(ua: string) {
  const device = /iPad|Tablet|Android(?!.*Mobile)/i.test(ua) ? "tablet" : /Mobi|iPhone|Android/i.test(ua) ? "phone" : "computer";
  const os = /iPhone|iPad|iOS/i.test(ua) ? "iOS" : /Android/i.test(ua) ? "Android" : /Windows/i.test(ua) ? "Windows" : /Mac OS/i.test(ua) ? "macOS" : /Linux/i.test(ua) ? "Linux" : "?";
  const browser = /FBAN|FBAV|FB_IAB/i.test(ua)
    ? "Facebook"
    : /Instagram/i.test(ua)
      ? "Instagram"
      : /TikTok|musical_ly|BytedanceWebview/i.test(ua)
        ? "TikTok"
        : /SamsungBrowser/i.test(ua)
          ? "Samsung"
          : /Edg\//i.test(ua)
            ? "Edge"
            : /OPR\/|Opera/i.test(ua)
              ? "Opera"
              : /CriOS|Chrome\//i.test(ua)
                ? "Chrome"
                : /FxiOS|Firefox/i.test(ua)
                  ? "Firefox"
                  : /Safari/i.test(ua)
                    ? "Safari"
                    : "?";
  // crawlers name themselves (Googlebot/2.1, AhrefsBot/7) — a phone called CUBOT is not one
  const bot = /[a-z]bot\/|\bbot\b|crawler|spider|slurp|HeadlessChrome|Playwright|Puppeteer|Lighthouse|facebookexternalhit|meta-externalagent|curl\/|wget\/|python|node-fetch|axios|undici|okhttp|go-http-client/i.test(ua);
  return { device, os, browser, bot };
}

/** An ad's words as written: a few of its links come encoded twice («POINTILI+TEST2+%7C+Site»). */
function said(x: unknown): string | undefined {
  if (typeof x !== "string" || !x) return undefined;
  if (!/%[0-9a-f]{2}/i.test(x)) return x;
  try {
    return decodeURIComponent(x.replace(/\+/g, " "));
  } catch {
    return x;
  }
}

/** Where a visit came from: the ad's utm_source, else the site that sent it, else nothing (direct). */
function source(utm: string | undefined, referrer: string | undefined, fbclid: boolean, host: string): string {
  if (utm) return utm.toLowerCase().slice(0, 60);
  let from = "";
  try {
    from = referrer ? new URL(referrer).hostname.replace(/^www\./, "") : "";
  } catch {
    from = "";
  }
  // the site itself, with or without its www, is not a source
  if (from && from === host.replace(/^www\./, "")) from = "";
  if (/(^|\.)facebook\.com$|(^|\.)fb\.com$|^l\.facebook\.com$|^lm\.facebook\.com$/.test(from) || fbclid) return "facebook";
  if (/instagram\.com$/.test(from)) return "instagram";
  if (/google\./.test(from)) return "google";
  if (/tiktok\.com$/.test(from)) return "tiktok";
  if (/^t\.co$|twitter\.com$|x\.com$/.test(from)) return "x";
  if (/wa\.me$|whatsapp\.com$/.test(from)) return "whatsapp";
  return from || "direct";
}

/**
 * The traffic beacon. The page sends what happened since the last time —
 * the visit (first touch: landing, referrer, ad parameters), its screens with
 * their times, the taps and the signals — and this adds what only the server
 * knows: the country and city, the phone and browser, whether it is a robot
 * (or the local test server), and who is signed in (the founder's own visits
 * are marked and left out of the numbers by default).
 */
export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > 120_000) return new NextResponse(null, { status: 413 });
  let body: { visit?: Record<string, unknown>; views?: unknown[]; taps?: unknown[]; signals?: unknown[]; here?: { state?: unknown; path?: unknown } | null };
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const v = body.visit ?? {};
  if (!UUID.test(String(v.id ?? "")) || !/^[A-Za-z0-9_-]{8,64}$/.test(String(v.visitor ?? ""))) return new NextResponse(null, { status: 400 });

  const ua = request.headers.get("user-agent") ?? "";
  const host = (request.headers.get("x-forwarded-host") ?? request.headers.get("host") ?? "").replace(/:\d+$/, "");
  const who = client(ua);
  const me = await getMe().catch(() => null);
  // which of the person's phones this is (only once the token has passed, through getMe)
  const session = me ? await sessionId() : null;
  const city = request.headers.get("x-vercel-ip-city");
  const fbclid = !!v.fbclid;
  const visit = {
    id: v.id,
    visitor: v.visitor,
    user_id: me?.id ?? null,
    session_id: session,
    landing: v.landing ?? null,
    referrer: v.referrer ?? null,
    source: source(said(v.utm_source), typeof v.referrer === "string" ? v.referrer : undefined, fbclid, host),
    medium: said(v.utm_medium) ?? null,
    campaign: said(v.utm_campaign) ?? null,
    content: said(v.utm_content) ?? null,
    term: said(v.utm_term) ?? null,
    fbclid,
    device: who.device,
    os: who.os,
    browser: who.browser,
    standalone: v.standalone === true,
    screen: v.screen ?? null,
    lang: v.lang ?? null,
    country: request.headers.get("x-vercel-ip-country"),
    city: city ? decodeURIComponent(city) : null,
    is_admin: !!me?.admin,
    is_bot: who.bot || /^(localhost|127\.0\.0\.1|\[::1\])$/.test(host),
  };

  // where the person is right now (the console's «متّصل توّا»): only the three words, and a path of the site
  const here =
    body.here && ["here", "idle", "away"].includes(String(body.here.state))
      ? { state: String(body.here.state), path: typeof body.here.path === "string" && body.here.path.startsWith("/") ? body.here.path.slice(0, 300) : "" }
      : null;
  // Pointili put on an owner's phone: the founder's Telegram rings once per owner (lib/telegram: alertApp) — their
  // first visit opened as the app, or Android's Chrome saying it just installed, whichever comes first. A
  // customer's phone rings nothing: the morning's digest says them, a line a shop (16 Nov 2026: four of one
  // shop's new customers rang the founder in half an hour, «each time he enters, it's wrong»).
  // Asked before this batch is written (once written, it is no longer the first), and the person marked asked
  // before the answer comes: the same person's next batch, a moment later, asks nothing
  const installed = (body.signals ?? []).some((g) => (g as { name?: unknown })?.name === "pwa_installed");
  let ring: (() => Promise<void>) | null = null;
  if (me?.shop && !visit.is_bot && !me.admin && !me.tester && (visit.standalone || installed) && !knownInApp.has(me.id)) {
    const user = me.id;
    if (knownInApp.size > 5000) knownInApp.clear();
    knownInApp.add(user);
    const fresh = await newToApp(user);
    // no answer: asked again with the next batch
    if (fresh === "unknown") knownInApp.delete(user);
    if (fresh === "yes") {
      const way = appWay(ua);
      const opened = visit.standalone;
      ring = () => alertApp(user, way, opened);
    }
  }
  const { error } = await service().rpc("track", { p: { visit, views: body.views ?? [], taps: body.taps ?? [], signals: body.signals ?? [], here } });
  if (error) {
    console.error("[track]", error.message);
    // the batch is lost, and the first visit as the app with it: the next batch is the first again
    if (ring && me) knownInApp.delete(me.id);
    return new NextResponse(null, { status: 400 });
  }
  if (ring) after(ring);
  // an owner tapped «كلّمنا» on the trial's line, or its WhatsApp once the trial is over: the founder's Telegram rings
  // (not a robot's, not on the local server)
  const tap = (body.signals ?? []).find((g) => (g as { name?: unknown })?.name === "trial_call") as { detail?: unknown } | undefined;
  if (me?.shop && !visit.is_bot && tap) {
    const owner = me.id;
    const whatsapp = String(tap.detail ?? "").includes("whatsapp");
    after(() => alertCall(owner, whatsapp));
  }
  return new NextResponse(null, { status: 204 });
}
