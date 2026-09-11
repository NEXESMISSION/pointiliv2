import "server-only";
import { headers } from "next/headers";
import { siteUrl } from "@/lib/url";

/**
 * The origin the person is actually using — so a QR generated while testing on a
 * LAN IP, a preview deploy or production always points back to the same site.
 */
export async function requestOrigin(): Promise<string> {
  const h = await headers();
  const host = h.get("x-forwarded-host") ?? h.get("host");
  if (!host) return siteUrl();
  const proto = h.get("x-forwarded-proto")?.split(",")[0]?.trim() ?? (/^(localhost|127\.|192\.168\.|10\.)/.test(host) ? "http" : "https");
  return `${proto}://${host}`;
}
