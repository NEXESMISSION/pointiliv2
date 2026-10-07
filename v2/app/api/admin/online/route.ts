import { NextResponse } from "next/server";
import { getMe } from "@/lib/session";
import { call } from "@/lib/supabase";

export const dynamic = "force-dynamic";

/** Who is on the site right now, for the console's live dots (the founder only). */
export async function GET() {
  const me = await getMe().catch(() => null);
  if (!me?.admin) return NextResponse.json({ error: "forbidden" }, { status: 403, headers: { "Cache-Control": "no-store" } });
  const data = await call<unknown>("admin_online");
  if (!data) return NextResponse.json({ error: "network" }, { status: 502, headers: { "Cache-Control": "no-store" } });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
