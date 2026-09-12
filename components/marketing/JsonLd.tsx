import { PLANS } from "@/lib/constants";
import { getI18n } from "@/lib/i18n/server";
import { siteUrl } from "@/lib/url";

/** Structured data so search engines understand what Pointili is and what it costs. */
export async function JsonLd() {
  const { t, fill } = await getI18n();
  const url = siteUrl();
  const data = {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${url}/#org`,
        name: "Pointili",
        url,
        logo: `${url}/icon-512.png`,
        areaServed: "TN",
      },
      {
        "@type": "SoftwareApplication",
        name: "Pointili",
        url,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS",
        description: t.marketing.meta.appDescription,
        publisher: { "@id": `${url}/#org` },
        offers: ([PLANS.six_month, PLANS.yearly] as const).map((p) => ({
          "@type": "Offer",
          name: fill(t.marketing.plans.offerName, { plan: t.data.plans[p.id] }),
          price: p.price,
          priceCurrency: "TND",
        })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
