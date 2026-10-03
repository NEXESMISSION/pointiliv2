import { createServerClient } from "@supabase/ssr";
import { NextResponse, type NextRequest } from "next/server";

/**
 * One job: keep the session fresh. A page cannot write cookies, so a token
 * refreshed during a render would be lost — and with refresh-token rotation,
 * lost means logged out. The refresh happens here, in the token's last ten
 * minutes (it lives an hour): the other requests skip the round trip.
 */
export async function proxy(request: NextRequest) {
  if (!needsRefresh(request)) return NextResponse.next();
  let response = NextResponse.next({ request });
  const supabase = createServerClient(process.env.NEXT_PUBLIC_SUPABASE_URL!, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!, {
    cookies: {
      getAll: () => request.cookies.getAll(),
      setAll(list) {
        for (const { name, value } of list) request.cookies.set(name, value);
        response = NextResponse.next({ request });
        for (const { name, value, options } of list) {
          if (value === "") response.cookies.set(name, "", { ...options, maxAge: 0, expires: new Date(0) });
          else response.cookies.set(name, value, options);
        }
      },
    },
  });
  await supabase.auth.getUser();
  return response;
}

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
    return Number(claims.exp) - Math.floor(Date.now() / 1000) < 600;
  } catch {
    return true;
  }
}

export const config = {
  // the counter polls, the traffic beacon reports: neither ever refreshes a session
  matcher: ["/((?!_next/static|_next/image|api/counter|api/beacon|3d/|tn/|heat/|.*\.(?:png|svg|ico|webmanifest)$).*)"],
};
