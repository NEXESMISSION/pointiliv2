import type { MetadataRoute } from "next";
import { NICHES, SITE } from "@/lib/seo";

/** The public pages, the front door first; one page per kind of shop. */
export default function sitemap(): MetadataRoute.Sitemap {
  const now = new Date();
  return [
    { url: SITE, lastModified: now, changeFrequency: "weekly", priority: 1 },
    { url: `${SITE}/shop/new`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/prix`, lastModified: now, changeFrequency: "monthly", priority: 0.9 },
    { url: `${SITE}/faq`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/guide`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/comparatif`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/a-propos`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    { url: `${SITE}/pour`, lastModified: now, changeFrequency: "monthly", priority: 0.8 },
    ...NICHES.map((n) => ({ url: `${SITE}/pour/${n.slug}`, lastModified: now, changeFrequency: "monthly" as const, priority: 0.7 })),
    { url: `${SITE}/privacy`, lastModified: now, changeFrequency: "yearly", priority: 0.3 },
  ];
}
