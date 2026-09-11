import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";

export const dynamic = "force-dynamic";

/** Live list of reward requests waiting at the counter. */
export async function GET() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("merchant_pending_redemptions");
  if (error) return NextResponse.json({ error: error.code === "42501" ? "not_merchant" : "network" }, { status: error.code === "42501" ? 401 : 500 });
  return NextResponse.json(data ?? [], { headers: { "Cache-Control": "no-store" } });
}
