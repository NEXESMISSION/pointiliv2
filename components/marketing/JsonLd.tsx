import { PLANS } from "@/lib/constants";
import { siteUrl } from "@/lib/url";

/** Structured data so search engines understand what Pointili is and what it costs. */
export function JsonLd() {
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
        description: "Digital loyalty cards for cafés, restaurants, salons and local businesses. Customers scan a rotating QR, collect stamps and earn rewards.",
        publisher: { "@id": `${url}/#org` },
        offers: [PLANS.six_month, PLANS.yearly].map((p) => ({
          "@type": "Offer",
          name: `${p.name} plan`,
          price: p.price,
          priceCurrency: "TND",
        })),
      },
    ],
  };
  return <script type="application/ld+json" dangerouslySetInnerHTML={{ __html: JSON.stringify(data).replace(/</g, "\\u003c") }} />;
}
