import manifest from "@/app/manifest";

export const dynamic = "force-dynamic";

/**
 * The app's manifest, opening signed in. An iPhone's app on the home screen
 * keeps its own cookies, apart from Safari's: whoever added Pointili from
 * Safari opened it signed out, and had to find their phone and password
 * again. While the iPhone's install guide is up, the page points its
 * manifest here with a one-time sign-in (handoffPath) as the address the app
 * first opens: iOS reads it when «Ajouter» is tapped, and the app's first
 * launch signs in by itself. Anything else asked for: the manifest as it is.
 */
export function GET(request: Request) {
  const start = new URL(request.url).searchParams.get("start") ?? "";
  const ok = /^\/auth\/handoff\?th=[A-Za-z0-9_-]{20,200}&next=%2F$/.test(start);
  return new Response(JSON.stringify({ ...manifest(), ...(ok ? { start_url: start } : {}) }), {
    headers: { "Content-Type": "application/manifest+json; charset=utf-8", "Cache-Control": "no-store" },
  });
}
