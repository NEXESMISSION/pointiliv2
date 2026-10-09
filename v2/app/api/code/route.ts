import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

/** A fresh one-use code for the counter, drawn as SVG here so the browser needs no QR library. */
export async function POST(request: NextRequest) {
  // a shop that counts points says how many first: the amount rides on the code
  const body = (await request.json().catch(() => ({}))) as { points?: unknown };
  const n = Math.floor(Number(body.points));
  const { data, error } = await (await db()).rpc("new_code", { p_points: Number.isFinite(n) && n > 0 ? n : null });
  if (error) return NextResponse.json({ ok: false, error: "network" }, { status: 500, headers: noStore });
  const res = data as { ok: boolean; error?: string; id?: string; token?: string; expires_at?: string };
  if (!res.ok || !res.token) return NextResponse.json({ ok: false, error: res.error ?? "network" }, { headers: noStore });

  const origin = request.headers.get("x-forwarded-host") ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}` : new URL(request.url).origin;
  const svg = await QRCode.toString(`${origin}/s/${res.token}`, { type: "svg", width: 512, margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } });
  return NextResponse.json({ ok: true, id: res.id, svg, expires_at: res.expires_at, server_now: new Date().toISOString() }, { headers: noStore });
}
