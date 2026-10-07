import { NextResponse, type NextRequest } from "next/server";
import { getMe } from "@/lib/session";
import { service } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;
const STATES = new Set(["here", "idle", "away"]);

/**
 * The presence ping (lib/track.ts): this visit's page is on a screen right
 * now — touched lately («here») or open and left alone («idle») — or it was
 * just hidden or closed («away»). Only the visit's presence changes, at the
 * server's own time; the visit's times stay as they were. Who is signed in
 * comes from the session, never from the page; the founder is not followed.
 */
export async function POST(request: NextRequest) {
  const text = await request.text();
  if (text.length > 1000) return new NextResponse(null, { status: 413 });
  let body: { visit?: unknown; state?: unknown; path?: unknown };
  try {
    body = JSON.parse(text);
  } catch {
    return new NextResponse(null, { status: 400 });
  }
  const visit = String(body.visit ?? "");
  const state = String(body.state ?? "");
  const path = typeof body.path === "string" && body.path.startsWith("/") ? body.path.slice(0, 300) : "";
  if (!UUID.test(visit) || !STATES.has(state)) return new NextResponse(null, { status: 400 });

  const me = await getMe().catch(() => null);
  if (me?.admin) return new NextResponse(null, { status: 204 });
  const { error } = await service().rpc("here", { p_visit: visit, p_state: state, p_path: path, p_user: me?.id ?? null });
  if (error) {
    console.error("[here]", error.message);
    return new NextResponse(null, { status: 400 });
  }
  return new NextResponse(null, { status: 204 });
}
