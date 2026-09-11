import QRCode from "qrcode";
import { NextResponse } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { requestOrigin } from "@/lib/origin";

export const dynamic = "force-dynamic";

/** A fresh single-use QR for the merchant screen, rendered to SVG on the server (no QR library in the browser). */
export async function POST() {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mint_qr_token");
  if (error) {
    const status = error.code === "42501" ? 401 : 500;
    return NextResponse.json({ ok: false, error: status === 401 ? "not_merchant" : "network" }, { status, headers: noStore });
  }
  const res = data as { ok: boolean; error?: string; id?: string; token?: string; expires_at?: string; ttl_seconds?: number };
  if (!res.ok || !res.token) return NextResponse.json({ ok: false, error: res.error ?? "network" }, { headers: noStore });

  const url = `${await requestOrigin()}/scan/${res.token}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F1222", light: "#FFFFFF" } });

  return NextResponse.json(
    { ok: true, id: res.id, url, svg, expires_at: res.expires_at, ttl_seconds: res.ttl_seconds, server_now: new Date().toISOString() },
    { headers: noStore },
  );
}

const noStore = { "Cache-Control": "no-store" };
