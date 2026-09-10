import type { MetadataRoute } from "next";
import { SITE_URL } from "@/lib/seo";

/**
 * robots.txt for the product host. There is nothing to sell here — the pitch
 * lives on www.pointili.online — so almost everything is closed.
 *
 * THE TRAP: /s and /r are the two paths a QR or a WhatsApp link lands on. A
 * crawler that follows one gets a cookie and a page; it can never spend a
 * token (GET never writes), but a token URL in an index is still a token URL
 * in an index. Both are noindex here AND carry X-Robots-Tag on the response.
 */
export default function robots(): MetadataRoute.Robots {
  const off = [
    "/s/", // the scanned QR landing — single-use tokens
    "/r/", // recovery links
    "/moi", // a customer's own wallet
    "/owner", // the till and everything under it
    "/owner/",
    "/admin", // the console
    "/admin/",
    "/app", // the switchboard
    "/api/",
    "/auth/",
  ];

  return {
    rules: [{ userAgent: "*", allow: "/", disallow: off }],
    host: SITE_URL,
  };
}
