import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { FAQ, faqJsonLd, orgJsonLd, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Questions sur Pointili — أسئلة على Pointili",
  description: "Tout sur Pointili, la carte de fidélité digitale en Tunisie : prix, fonctionnement, paiement, sécurité. — كل شي على Pointili: السوم، كيفاش تخدم، الخلاص.",
  alternates: { canonical: `${SITE}/faq` },
};

/** The questions owners ask, answered in Tunisian, then the same in French. */
export default async function Faq() {
  const { supportPhone, social } = await getSettings();
  const all = FAQ.flatMap((f) => [{ q: f.q, a: f.a }, f.fr]);
  return (
    <SiteFrame support={supportPhone} social={social}>
      <JsonLd data={faqJsonLd(all)} />
      <JsonLd data={orgJsonLd(supportPhone, social)} />
      <h1 className="text-[2rem] font-bold leading-tight">أسئلة على Pointili</h1>
      <p className="mt-1 text-[1rem] font-semibold text-muted" dir="ltr">
        Questions fréquentes
      </p>
      <div className="mt-6 divide-y divide-line rounded-[1.25rem] bg-surface shadow-card">
        {FAQ.map((f) => (
          <details key={f.q} className="px-4 py-4">
            <summary className="cursor-pointer list-none text-[1.0625rem] font-bold">{f.q}</summary>
            <p className="mt-2 text-[0.9688rem] leading-relaxed text-body">{f.a}</p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-muted" dir="ltr" lang="fr">
              <b>{f.fr.q}</b> {f.fr.a}
            </p>
          </details>
        ))}
      </div>
      <p className="mt-8 text-center">
        <Link href="/shop/new" className="press inline-flex h-12 items-center rounded-[1rem] bg-brand px-6 text-[1rem] font-bold text-white">
          حلّ محلّك في دقيقتين
        </Link>
      </p>
    </SiteFrame>
  );
}
