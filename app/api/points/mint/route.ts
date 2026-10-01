import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

const UUID = /^[0-9a-f-]{36}$/i;
const noStore = { "Cache-Control": "no-store" };

/** A one-use QR carrying the points of one purchase (board 2, P4). `replace` closes the code of a wrong amount. */
export async function POST(request: NextRequest) {
  const body = (await request.json().catch(() => ({}))) as { amount?: unknown; replace?: unknown };
  const amount = Number(body.amount);
  const replace = typeof body.replace === "string" && UUID.test(body.replace) ? body.replace : null;
  if (!Number.isFinite(amount) || amount <= 0) return NextResponse.json({ ok: false, error: "invalid_amount" }, { headers: noStore });

  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mint_points_token", { p_amount: amount, p_replace: replace });
  if (error) {
    const status = error.code === "42501" ? 401 : 500;
    return NextResponse.json({ ok: false, error: status === 401 ? "not_merchant" : "network" }, { status, headers: noStore });
  }
  const res = data as { ok: boolean; error?: string; id?: string; token?: string; expires_at?: string; ttl_seconds?: number; points?: number; amount?: number };
  if (!res.ok || !res.token) return NextResponse.json({ ok: false, error: res.error ?? "network" }, { headers: noStore });

  const url = `${await requestOrigin()}/scan/${res.token}`;
  const svg = await QRCode.toString(url, { type: "svg", width: 512, margin: 0, errorCorrectionLevel: "M", color: { dark: "#063F4F", light: "#FFFFFF" } });
  return NextResponse.json(
    { ok: true, id: res.id, svg, points: res.points, amount: res.amount, expires_at: res.expires_at, ttl_seconds: res.ttl_seconds, server_now: new Date().toISOString() },
    { headers: noStore },
  );
}
