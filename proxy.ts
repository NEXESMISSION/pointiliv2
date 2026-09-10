import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import { CLIENT_COOKIE, clientCookieOptions } from "@/lib/auth/client";
import { sessionAge, signSession, verifySession } from "@/lib/auth/crypto";

/**
 * What runs before every page: a tidy URL, the owner's Supabase session kept
 * alive, the client cookie rolled — and, once identity-api lands, the client
 * cookie PRE-ISSUED on document GETs so identity exists on the phone before
 * any POST.
 *
 * Next 16: this file is proxy.ts, not middleware.ts, and it runs on Node.
 *
 * THE TRAP: a cookie DELETION must carry `expires: new Date(0)`. Next drops
 * falsy cookie fields (value "", maxAge 0) when it re-emits Set-Cookie on a
 * redirect, and the re-emitted copy RESURRECTS the cookie as a session cookie.
 * That is how v1 got "/" → /owner → /owner/login on every launch, forever.
 */
export async function proxy(request: NextRequest) {
  /* A URL that cannot match anything, but obviously means something. Cheap,
     and first: no point refreshing a session for a request we redirect. */
  const tidy = tidyUrl(request);
  if (tidy) return NextResponse.redirect(tidy, 308);

  /*
    ── PRE-ISSUE BRANCH: owned by identity-api ─────────────────────────────
    On a document GET (Sec-Fetch-Dest: document AND Accept includes text/html)
    to /s/*, /[slug], /moi or /r/* with no VALID pointili_client cookie:
      · sub = crypto.randomUUID(); token = signSession({sub, v: 1})
      · set it on the response with clientCookieOptions()
      · forward `x-pointili-client: <sub>` to the page as a REQUEST header
        (NextResponse.next({ request: { headers } })) so the Server Component
        renders the card for the identity the browser is about to receive.
    An existing valid cookie is forwarded the same way (sub from the payload).
    No row is created — that happens inside redeem_token. Bots and previews
    fail the Sec-Fetch-Dest/Accept test and get nothing.
    Until this lands, lib/auth/client.currentClient() is the only reader and
    it throws "not implemented".
  */

  const res = await withSession(request, (req) => NextResponse.next({ request: req }));
  rollClientCookie(request, res);
  return res;
}

/**
 * ── A 404 THAT IS REALLY A TYPO ───────────────────────────────────────────
 * Tokens, codes and slugs are lower case and free of punctuation, so a path
 * with a capital (iOS capitalises anything typed) or a full stop stuck to the
 * end (every messaging app linkifies "…/s/abc." WITH the stop) cannot match
 * anything real, and 404 would be a lie. Safe here because nothing this
 * product routes on is case-sensitive or punctuated. 308: the tidy URL is
 * canonical and a browser may remember it.
 */
function tidyUrl(request: NextRequest): URL | null {
  const { pathname } = request.nextUrl;
  if (pathname.startsWith("/_next") || pathname.startsWith("/api")) return null;

  let fixed = pathname.replace(/[.,;:!?)\]}'"«»]+$/g, "");
  if (fixed.length > 1) fixed = fixed.replace(/\/+$/, "");
  if (/[A-Z]/.test(fixed)) fixed = fixed.toLowerCase();

  if (fixed === pathname || fixed === "") return null;

  const url = request.nextUrl.clone();
  url.pathname = fixed;
  return url;
}

/**
 * KEEP A CUSTOMER'S IDENTITY FOR AS LONG AS THEY KEEP COMING BACK.
 *
 * The cookie is 400 days from signing. Re-signed once it is past a third of
 * that (133 days) — one HMAC, no database — so a regular's identity dies only
 * after 400 quiet days, never on a calendar accident. In the proxy because a
 * Server Component cannot write a cookie and this must happen on plain views.
 */
function rollClientCookie(request: NextRequest, response: NextResponse) {
  const token = request.cookies.get(CLIENT_COOKIE)?.value;
  if (!token) return;

  const payload = verifySession(token);
  if (!payload) return; // expired or forged — the page shows "Retrouver ma carte"

  const age = sessionAge(token);
  if (age === null || age < ROLL_AFTER_S) return;

  response.cookies.set(CLIENT_COOKIE, signSession({ sub: payload.sub, v: payload.v }), clientCookieOptions());
}

/** A third of the 400-day life. */
const ROLL_AFTER_S = 133 * 86400;

/**
 * Refresh the owner's Supabase cookies onto whatever response we already
 * chose. Takes a BUILDER: when Supabase rotates the token it must be written
 * onto the request too and the response rebuilt from it, so the render
 * downstream sees the new cookies rather than the ones being replaced.
 */
async function withSession(request: NextRequest, build: (req: NextRequest) => NextResponse) {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL;
  const key = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
  if (!url || !key) return build(request);

  /* DO NOT PAY FOR A REFRESH NOBODY NEEDS. getUser() is a network call
     (90–230 ms) and this runs on every customer screen, which has no owner
     session at all. No auth cookie → nothing to refresh. Plenty of life left
     → nothing to rotate yet. Anything unparseable falls through to the
     refresh, because guessing wrong throws an owner out of the till. */
  if (!needsRefresh(request)) return build(request);

  let response = build(request);
  const supabase = createServerClient(url, key, {
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) {
          request.cookies.set(name, value);
        }
        response = build(request);
        for (const { name, value, options } of cookiesToSet) {
          /* The deletion fix — see the trap at the top of this file. */
          if (value === "") {
            response.cookies.set(name, "", { ...options, maxAge: 0, expires: new Date(0) });
          } else {
            response.cookies.set(name, value, options);
          }
        }
      },
    },
  });

  // Do not remove: this call is what performs the refresh.
  await supabase.auth.getUser();

  return response;
}

/** How much life left in the access token still counts as "not yet". */
const REFRESH_WINDOW_S = 300;

/**
 * Is there a session here close enough to expiry to be worth a round trip?
 * Defaults to TRUE for anything it cannot read.
 */
function needsRefresh(request: NextRequest): boolean {
  /* @supabase/ssr chunks a long cookie as `<name>.0`, `<name>.1`, … and the
     value is the concatenation in index order. */
  const parts = request.cookies
    .getAll()
    .filter(
      (c) =>
        c.name.startsWith("sb-") &&
        c.name.includes("auth-token") &&
        !c.name.includes("code-verifier") &&
        c.value.length > 0,
    )
    .sort((a, b) => a.name.localeCompare(b.name));
  if (parts.length === 0) return false; // no session — the whole customer app

  try {
    const raw = parts.map((c) => c.value).join("");
    const json = raw.startsWith("base64-")
      ? Buffer.from(raw.slice(7), "base64").toString("utf8")
      : decodeURIComponent(raw);
    const token = JSON.parse(json)?.access_token;
    const claims = JSON.parse(Buffer.from(String(token).split(".")[1], "base64").toString("utf8"));
    const left = Number(claims.exp) - Math.floor(Date.now() / 1000);
    return !Number.isFinite(left) || left < REFRESH_WINDOW_S;
  } catch {
    return true;
  }
}

export const config = {
  /*
    Every navigation, so no owner screen renders on a stale token and every
    customer document GET can be pre-issued. Excluded: _next, /api/version
    (StayFresh polls it from an open tab) and files with an extension.
  */
  matcher: ["/((?!_next/static|_next/image|api/version|.*\\.[\\w]+$).*)"],
};
