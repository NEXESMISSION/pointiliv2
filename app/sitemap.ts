import type { MetadataRoute } from "next";
import { siteUrl } from "@/lib/url";

/** Public pages only — the app itself (cards, dashboard, admin) is private and noindex. */
export default function sitemap(): MetadataRoute.Sitemap {
  const base = siteUrl();
  const now = new Date();

  /** Every public page exists in French (no prefix) and Tunisian (/tn), each pointing at the other. */
  const pair = (path: string, priority: number, changeFrequency: "weekly" | "monthly") => {
    const fr = `${base}${path || "/"}`;
    const tn = `${base}/tn${path}`;
    const languages = { fr, "ar-TN": tn };
    return [
      { url: fr, lastModified: now, changeFrequency, priority, alternates: { languages } },
      { url: tn, lastModified: now, changeFrequency, priority, alternates: { languages } },
    ];
  };

  return [
    ...pair("", 1, "weekly"),
    ...pair("/how-it-works", 0.8, "monthly"),
    ...pair("/pricing", 0.8, "monthly"),
    { url: `${base}/register`, lastModified: now, changeFrequency: "yearly", priority: 0.6 },
    { url: `${base}/customer/register`, lastModified: now, changeFrequency: "yearly", priority: 0.5 },
  ];
}
