import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/url";

export default function robots(): MetadataRoute.Robots {
  return {
    rules: {
      userAgent: "*",
      allow: ["/", "/how-it-works", "/pricing", "/fr", "/fr/how-it-works", "/fr/pricing", "/register", "/customer/register"],
      disallow: ["/app", "/api/", "/customer/", "/dashboard", "/admin", "/scan/", "/qr", "/customers", "/loyalty", "/rewards", "/redeem", "/billing", "/settings", "/activity", "/analytics", "/more", "/offline.html"],
    },
    sitemap: `${siteUrl()}/sitemap.xml`,
  };
}
