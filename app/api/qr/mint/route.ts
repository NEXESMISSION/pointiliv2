import QRCode from "qrcode";
import { NextResponse, type NextRequest } from "next/server";
import { createClient } from "@/lib/supabase/server";
import { siteUrl } from "@/lib/url";

export const dynamic = "force-dynamic";

/** A fresh single-use QR for the merchant screen, rendered to SVG on the server (no QR library in the browser). */
export async function POST(request: NextRequest) {
  const supabase = await createClient();
  const { data, error } = await supabase.rpc("mint_qr_token");
  if (error) {
    const status = error.code === "42501" ? 401 : 500;
    return NextResponse.json({ ok: false, error: status === 401 ? "not_merchant" : "network" }, { status, headers: noStore });
  }
  const res = data as { ok: boolean; error?: string; id?: string; token?: string; expires_at?: string; ttl_seconds?: number };
  if (!res.ok || !res.token) return NextResponse.json({ ok: false, error: res.error ?? "network" }, { headers: noStore });

  // The origin the merchant is actually using (works on a LAN IP in dev and on any deploy URL).
  const origin = request.headers.get("x-forwarded-host")
    ? `${request.headers.get("x-forwarded-proto") ?? "https"}://${request.headers.get("x-forwarded-host")}`
    : process.env.NEXT_PUBLIC_SITE_URL
      ? siteUrl()
      : request.nextUrl.origin;
  const url = `${origin}/scan/${res.token}`;
  const svg = await QRCode.toString(url, { type: "svg", margin: 0, errorCorrectionLevel: "M", color: { dark: "#0F1222", light: "#FFFFFF" } });

  return NextResponse.json(
    { ok: true, id: res.id, url, svg, expires_at: res.expires_at, ttl_seconds: res.ttl_seconds, server_now: new Date().toISOString() },
    { headers: noStore },
  );
}

const noStore = { "Cache-Control": "no-store" };
