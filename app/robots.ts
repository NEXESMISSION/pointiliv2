import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/how-it-works", "/pricing"],
      disallow: [
        "/app",
        "/api/",
        "/customer",
        "/dashboard",
        "/admin",
        "/scan",
        "/qr",
        "/customers",
        "/loyalty",
        "/rewards",
        "/redeem",
        "/billing",
        "/settings",
        "/activity",
        "/offline.html",
      ],
    },
    host: siteUrl(),
  };
}
