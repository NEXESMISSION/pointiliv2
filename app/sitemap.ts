import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/url";

/** Public pages only — the app itself (cards, dashboard, admin) is private and noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();
  return [
    { url: `${base}/`, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${base}/how-it-works`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/pricing`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${base}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/customer/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
