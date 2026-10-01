import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

/** The counter closes a code nobody scanned (the amount changed, the screen closed). Sent with sendBeacon too. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { id?: unknown };
  if (typeof body.id !== "string" || !UUID.test(body.id)) return NextResponse.json({ ok: false }, { status: 400 });
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("void_qr_token", { p_id: body.id });
  if (error) return NextResponse.json({ ok: false }, { status: error.code === "42501" ? 401 : 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
