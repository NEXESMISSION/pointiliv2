import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";
import {
  DEFAULT_LOCALE,
  LOCALE_COOKIE,
  LOCALE_HEADER,
  LOCALE_MAX_AGE,
  isLocale,
  isMarketingPath,
  localePath,
  splitLocalePath,
  type Locale,
} from "@/lib/i18n/config";
import { SYSTEM_COOKIE, SYSTEM_HEADER, isSystem, systemForPath } from "@/lib/systems";

/**
 * Two jobs before the page renders:
 *
 *  1. Language. Tunisian, unless /fr/... or the cookie says otherwise —
 *     phones sold here are often set to French, so the browser's own
 *     preference is deliberately ignored. Public pages redirect to the
 *     address of that language so each one has its own URL; every render
 *     reads it from a request header.
 *  2. Session. Server Components cannot write cookies, so a token refreshed
 *     during a render would be lost — and with refresh-token rotation, lost
 *     means logged out. The refresh happens here, only when the access token
 *     is close to expiry (most requests skip it).
 */
export async function proxy(request: NextRequest) {
  const { pathname } = request.nextUrl;
  const { locale: fromPath } = splitLocalePath(pathname);
  const cookieLocale = request.cookies.get(LOCALE_COOKIE)?.value;
  const locale: Locale = fromPath ?? (isLocale(cookieLocale) ? cookieLocale : DEFAULT_LOCALE);

  if (!fromPath && isMarketingPath(pathname) && locale !== DEFAULT_LOCALE) {
    const url = request.nextUrl.clone();
    url.pathname = localePath(pathname, locale) || "/";
    const redirect = NextResponse.redirect(url);
    redirect.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: LOCALE_MAX_AGE, sameSite: "lax" });
    return redirect;
  }

  /* Which of the two systems this page belongs to. A shared page (the QR, the
     settings) says nothing, and then the last door wins — otherwise the menu
     would rearrange itself under the owner halfway through a task. */
  const cookieSystem = request.cookies.get(SYSTEM_COOKIE)?.value;
  const system = systemForPath(pathname) ?? (isSystem(cookieSystem) ? cookieSystem : null);

  const requestHeaders = new Headers(request.headers);
  requestHeaders.set(LOCALE_HEADER, locale);
  if (system) requestHeaders.set(SYSTEM_HEADER, system);

  const fresh = () => {
    const res = NextResponse.next({ request: { headers: requestHeaders } });
    if (cookieLocale !== locale) res.cookies.set(LOCALE_COOKIE, locale, { path: "/", maxAge: LOCALE_MAX_AGE, sameSite: "lax" });
    if (system && cookieSystem !== system) res.cookies.set(SYSTEM_COOKIE, system, { path: "/", maxAge: LOCALE_MAX_AGE, sameSite: "lax" });
    return res;
  };

  if (!needsRefresh(request)) return fresh();

  let response = fresh();
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: ip ? { "Sb-Forwarded-For": ip } : {} },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        // requestHeaders is a copy made before the refresh: without this the page
        // renders with the expired token and refreshes a second time on its own.
        requestHeaders.set("cookie", request.cookies.toString());
        response = fresh();
        for (const { name, value, options } of cookiesToSet) {
          // A deletion must carry an explicit past expiry or Next re-emits it as a live session cookie.
          if (value === "") response.cookies.set(name, "", { ...options, maxAge: 0, expires: new Date(0) });
          else response.cookies.set(name, value, options);
        }
      },
    },
  });

  // Performs the refresh when needed (and validates the session).
  await supabase.auth.getUser();
  return response;
}

/**
 * Access tokens live a week. Refreshing a day early means the rotation happens
 * while the person is using the app on a working connection — not at the
 * moment a PWA wakes up after days on a weak one, where a lost response leaves
 * the phone holding a spent refresh token and the next open logs them out.
 */
const REFRESH_WINDOW_S = 86_400;

function needsRefresh(request: NextRequest): boolean {
  const parts = request.cookies
    .getAll()
    .filter((c) => c.name.startsWith("sb-") && c.name.includes("auth-token") && !c.name.includes("code-verifier") && c.value)
    .sort((a, b) => a.name.localeCompare(b.name, "en", { numeric: true }));
  if (parts.length === 0) return false;
  try {
    const raw = parts.map((c) => c.value).join("");
    const json = raw.startsWith("base64-") ? Buffer.from(raw.slice(7), "base64").toString("utf8") : decodeURIComponent(raw);
    const token = JSON.parse(json)?.access_token as string;
    const claims = JSON.parse(Buffer.from(token.split(".")[1]!, "base64url").toString("utf8"));
    const left = Number(claims.exp) - Math.floor(Date.now() / 1000);
    return !Number.isFinite(left) || left < REFRESH_WINDOW_S;
  } catch {
    return true;
  }
}

export const config = {
  matcher: ["/((?!_next/static|_next/image|api/qr|sw\\.js|manifest\\.webmanifest|.*\\.(?:png|svg|ico|jpg|jpeg|webp|html|txt|js)$).*)"],
};
