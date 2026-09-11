import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * Keeps the Supabase session alive so customers never have to log in again.
 *
 * Server Components cannot write cookies, so a token refreshed during a render
 * would be lost — and with refresh-token rotation, lost means logged out. The
 * proxy refreshes BEFORE the render, only when the access token is close to
 * expiry (a refresh is a network call; most requests skip it).
 */
export async function proxy(request: NextRequest) {
  if (!needsRefresh(request)) return NextResponse.next({ request });

  let response = NextResponse.next({ request });
  const ip = request.headers.get("x-forwarded-for")?.split(",")[0]?.trim();
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    global: { headers: ip ? { "Sb-Forwarded-For": ip } : {} },
    cookies: {
      getAll() {
        return request.cookies.getAll();
      },
      setAll(cookiesToSet) {
        for (const { name, value } of cookiesToSet) request.cookies.set(name, value);
        response = NextResponse.next({ request });
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

const REFRESH_WINDOW_S = 300;

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
