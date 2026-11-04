import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { db } from "@/lib/supabase";

export const dynamic = "force-dynamic";
const noStore = { "Cache-Control": "no-store" };

type NewCode = { ok: boolean; error?: string; id?: string; token?: string; expires_at?: string };

/**
 * A fresh one-use code for the counter, drawn as SVG here so the browser needs no QR library.
 * `spare: true` brings the counter's next code in the same answer: it always keeps one ready
 * (components/Counter), and one request for the two halves the server functions it costs.
 */
export async function POST(request: NextRequest) {
  // a shop that says what it sells answers first: the thing rides on the code
  const body = (await request.json().catch(() => ({}))) as { item?: unknown; spare?: unknown };
  const item = Number(body.item);
  const p_item = Number.isFinite(item) && item > 0 ? item : null;
  const sb = await db();
  const { data, error } = await sb.rpc("new_code", { p_item });
  if (error) return NextResponse.json({ ok: false, error: "network" }, { status: 500, headers: noStore });
  const res = data as NewCode;
  if (!res.ok || !res.token) return NextResponse.json({ ok: false, error: res.error ?? "network" }, { headers: noStore });

  const origin = request.headers.get("x-forwarded-host") ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}` : new URL(request.url).origin;
  const draw = (token: string) => QRCode.toString(`${origin}/s/${token}`, { type: "svg", width: 512, margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F0E17", light: "#FFFFFF" } });

  // the spare is a bonus: if it fails, the counter asks for it on its own later
  let spare: { id: string; svg: string; expires_at: string } | null = null;
  if (body.spare === true) {
    const next = await sb.rpc("new_code", { p_item });
    const r = next.data as NewCode | null;
    if (!next.error && r?.ok && r.token && r.id && r.expires_at) spare = { id: r.id, svg: await draw(r.token), expires_at: r.expires_at };
  }

  return NextResponse.json({ ok: true, id: res.id, svg: await draw(res.token), expires_at: res.expires_at, spare, server_now: new Date().toISOString() }, { headers: noStore });
}
