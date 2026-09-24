import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/url";

/** Public pages only — the app itself (cards, dashboard, admin) is private and noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  /** Every public page exists in Tunisian (no prefix) and French (/fr), each pointing at the other. */
  const pair = (path: string, priority: number, changeFrequency: "weekly" | "monthly") => {
    const tn = `${base}${path || "/"}`;
    const fr = `${base}/fr${path}`;
    const languages = { fr, "ar-TN": tn };
    return [
      { url: tn, lastModified: now, changeFrequency, priority, alternates: { languages } },
      { url: fr, lastModified: now, changeFrequency, priority, alternates: { languages } },
    ];
  };

  return [
    ...pair("", 1, "weekly"),
    { url: `${base}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/customer/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
