import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;

export async function GET(request: NextRequest) {
  const id = request.nextUrl.searchParams.get("id") ?? "";
  const since = request.nextUrl.searchParams.get("since");
  if (!UUID.test(id)) return NextResponse.json({ error: "invalid" }, { status: 400 });
  const sinceIso = since && !Number.isNaN(Date.parse(since)) ? new Date(since).toISOString() : null;

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("qr_token_state", { p_id: id, p_since: sinceIso });
  if (error) return NextResponse.json({ error: error.code === "42501" ? "not_merchant" : "network" }, { status: error.code === "42501" ? 401 : 500 });
  return NextResponse.json(data, { headers: { "Cache-Control": "no-store" } });
}
