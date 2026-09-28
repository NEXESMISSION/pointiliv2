import "server-only";
import { createAdminClient } from "@/lib/supabase/admin";
import { SESSION_COOKIE, VISITOR_COOKIE, ANALYTICS_ID_RE, cleanPath } from "./shared";

/** What a user-agent string says about the phone or computer behind it. */
export type Agent = {
  device: "mobile" | "tablet" | "desktop";
  os: string | null;
  browser: string | null;
  in_app: string | null;
  bot: boolean;
};

const BOT =
  /bot|crawl|spider|slurp|facebookexternalhit|facebookcatalog|meta-externalagent|whatsapp|telegram|preview|headless|lighthouse|pagespeed|gtmetrix|playwright|puppeteer|phantom|selenium|curl|wget|python|node-fetch|undici|axios|go-http|okhttp|java\//i;

/** `touchPoints` comes from the browser: an iPad asks for the desktop site and says "Macintosh". */
export function parseAgent(ua: string, touchPoints = 0): Agent {
  const s = ua || "";
  const in_app = /Instagram/i.test(s)
    ? "instagram"
    : /FBAN\/Messenger|FB_IAB\/(?:Orca|Messenger)|MessengerLite|MessengerForiOS/i.test(s)
      ? "messenger"
      : /FBAN|FBAV|FB_IAB|FB4A|FBIOS/i.test(s)
        ? "facebook"
        : /musical_ly|BytedanceWebview|TikTok/i.test(s)
          ? "tiktok"
          : /Snapchat/i.test(s)
            ? "snapchat"
            : /LinkedInApp/i.test(s)
              ? "linkedin"
              : null;
  const ipadAsMac = /Macintosh/i.test(s) && touchPoints > 1;
  const os = /iPhone|iPad|iPod/i.test(s) || ipadAsMac
    ? "iOS"
    : /Android/i.test(s)
      ? "Android"
      : /Windows/i.test(s)
        ? "Windows"
        : /CrOS/i.test(s)
          ? "ChromeOS"
          : /Mac OS X|Macintosh/i.test(s)
            ? "macOS"
            : /Linux/i.test(s)
              ? "Linux"
              : null;
  const tablet = ipadAsMac || /iPad|Tablet|PlayBook|Silk/i.test(s) || (/Android/i.test(s) && !/Mobile/i.test(s));
  const mobile = !tablet && /Mobi|iPhone|iPod|Android|Windows Phone/i.test(s);
  const browser = /SamsungBrowser/i.test(s)
    ? "Samsung Internet"
    : /OPR\/|Opera/i.test(s)
      ? "Opera"
      : /Edg(?:e|A|iOS)?\//i.test(s)
        ? "Edge"
        : /Firefox|FxiOS/i.test(s)
          ? "Firefox"
          : /CriOS|Chrome\//i.test(s)
            ? "Chrome"
            : /Safari/i.test(s)
              ? "Safari"
              : null;
  return { device: tablet ? "tablet" : mobile ? "mobile" : "desktop", os, browser, in_app, bot: !s || BOT.test(s) };
}

/** Vercel tells the function where the request came from; there is nothing locally. */
export function geo(h: Headers): { country: string | null; city: string | null } {
  const country = h.get("x-vercel-ip-country")?.slice(0, 8) || null;
  let city: string | null = null;
  try {
    const raw = h.get("x-vercel-ip-city");
    city = raw ? decodeURIComponent(raw).slice(0, 80) : null;
  } catch {
    city = null;
  }
  return { country, city };
}

/** Local runs and preview deployments are tests; only production traffic is real. */
export function isTest(host: string): boolean {
  if (process.env.VERCEL_ENV) return process.env.VERCEL_ENV !== "production";
  return /^(localhost|127\.|\[::1\]|.*\.localhost)(:|$)/.test(host) || process.env.NODE_ENV !== "production";
}

/** An outside referrer as a short, stable name: "facebook", "google", "sousse-news.tn". */
export function refName(raw: unknown, ownHost: string): string | null {
  if (typeof raw !== "string" || !raw) return null;
  let host = raw.trim().toLowerCase();
  try {
    if (host.includes("/")) host = new URL(host.includes("://") ? host : `https://${host}`).hostname;
  } catch {
    return null;
  }
  host = host.replace(/:\d+$/, "").replace(/^(?:www|m|l|lm|mobile|mbasic|web|out)\./, "");
  const own = ownHost.toLowerCase().replace(/:\d+$/, "").replace(/^www\./, "");
  if (!host || host === own || !host.includes(".")) return null;
  if (/(^|\.)google\.[a-z.]+$/.test(host)) return "google";
  if (/(^|\.)(facebook\.com|fb\.com|fb\.me)$/.test(host)) return "facebook";
  if (/(^|\.)messenger\.com$/.test(host)) return "messenger";
  if (/(^|\.)instagram\.com$/.test(host)) return "instagram";
  if (/(^|\.)(wa\.me|whatsapp\.com)$/.test(host)) return "whatsapp";
  if (/(^|\.)(t\.co|twitter\.com|x\.com)$/.test(host)) return "x";
  if (/(^|\.)tiktok\.com$/.test(host)) return "tiktok";
  if (/(^|\.)linkedin\.com$/.test(host)) return "linkedin";
  if (/(^|\.)bing\.com$/.test(host)) return "bing";
  return host.slice(0, 120);
}

/** An ad tag, tidied: "FB" and "Facebook" are the same source. */
export function tag(raw: unknown, max: number): string | null {
  if (typeof raw !== "string") return null;
  const v = raw.trim().toLowerCase().slice(0, max);
  if (!v) return null;
  if (v === "fb" || v === "facebook.com") return "facebook";
  if (v === "ig" || v === "instagram.com") return "instagram";
  return v;
}

type CookieJar = { get(name: string): { value: string } | undefined };

/**
 * A sign-in or a sign-up, recorded by the server where it happens — the
 * browser's own events only show that someone moved from one page to another.
 * Best effort: analytics never costs anybody their sign-in.
 */
export async function recordAuthEvent(kind: "login" | "signup", userId: string, path: string, jar: CookieJar, h: Headers) {
  try {
    const visitor = jar.get(VISITOR_COOKIE)?.value;
    const session = jar.get(SESSION_COOKIE)?.value;
    const host = (h.get("host") ?? "").slice(0, 100);
    const agent = parseAgent(h.get("user-agent") ?? "");
    const { error } = await createAdminClient()
      .from("analytics_events")
      .insert({
        kind,
        host,
        path: cleanPath(path),
        visitor: visitor && ANALYTICS_ID_RE.test(visitor) ? visitor : null,
        session: session && ANALYTICS_ID_RE.test(session) ? session : null,
        user_id: userId,
        ...geo(h),
        device: agent.device,
        os: agent.os,
        browser: agent.browser,
        in_app: agent.in_app,
        bot: agent.bot,
        test: isTest(host),
      });
    if (error) console.error("[analytics]", kind, error.message);
  } catch (e) {
    console.error("[analytics]", kind, e instanceof Error ? e.message : e);
  }
}
