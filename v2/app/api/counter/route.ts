import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const UUID = /^[0-9a-f-]{36}$/i;

/** The counter's heartbeat: was the code taken, who came, which gifts wait. */
export async function GET(request: NextRequest) {
  const code = request.nextUrl.searchParams.get("code") ?? "";
  const since = request.nextUrl.searchParams.get("since");
  if (!UUID.test(code)) return NextResponse.json({ ok: false }, { status: 400 });
  const { data, error } = await (await db()).rpc("counter", { p_code: code, p_since: since && !Number.isNaN(Date.parse(since)) ? since : null });
  if (error) return NextResponse.json({ ok: false }, { status: error.code === "42501" ? 401 : 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
