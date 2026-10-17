import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { orgJsonLd, PRICE, PRICE_MONTH, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "À propos de Pointili Tunisie — شكون Pointili؟",
  description: `Pointili (pointili.online) est une carte de fidélité digitale conçue en Tunisie pour les commerces tunisiens : cafés, restaurants, barbiers, boutiques… ${PRICE} DT par an. À ne pas confondre avec Pointili, l'application algérienne de pointage.`,
  alternates: { canonical: `${SITE}/a-propos` },
};

/**
 * Who Pointili is, said once and plainly, for the people and the machines
 * that confuse it with Pointili the Algerian attendance app (pointili.com):
 * what it is, for whom, where, the price, how to reach it, and what it is
 * not. Every page links here; the Organization's JSON-LD points its `url`
 * and description at it.
 */
export default async function About() {
  const { supportPhone, social } = await getSettings();
  const about = {
    "@context": "https://schema.org",
    "@type": "AboutPage",
    "@id": `${SITE}/a-propos#page`,
    url: `${SITE}/a-propos`,
    name: "À propos de Pointili Tunisie",
    inLanguage: ["fr-TN", "ar-TN"],
    about: { "@id": `${SITE}/#org` },
    mainEntity: { "@id": `${SITE}/#org` },
  };
  return (
    <SiteFrame support={supportPhone} social={social}>
      <JsonLd data={orgJsonLd(supportPhone, social)} />
      <JsonLd data={about} />
      <div dir="ltr" lang="fr">
        <h1 className="text-balance text-[2rem] font-bold leading-tight">Pointili, la carte de fidélité digitale tunisienne</h1>
        <p className="mt-1 text-[1rem] font-semibold text-muted" dir="rtl" lang="ar-TN">
          Pointili: كارط فيديليتي ديجيتال مصنوعة في تونس للمحلات التونسية
        </p>

        <p className="mt-5 text-[1.0625rem] leading-relaxed text-body">
          Pointili (pointili.online) aide les commerces tunisiens à faire revenir leurs clients. Le commerce choisit sa carte — le nombre de tampons et le cadeau — et le client cumule ses tampons sur son propre téléphone en scannant le QR code du commerce, sans application à installer. Quand la carte est complète, le cadeau l&apos;attend dans son téléphone.
        </p>

        <section className="mt-6 rounded-[1.25rem] bg-surface p-5 shadow-card">
          <h2 className="text-[1.25rem] font-bold">L&apos;essentiel</h2>
          <dl className="mt-3 grid gap-x-4 gap-y-2 text-[0.9688rem] leading-relaxed sm:grid-cols-[10rem_1fr]">
            <dt className="font-semibold text-muted">Ce que c&apos;est</dt>
            <dd className="text-body">Une carte de fidélité digitale à tampons pour les commerces</dd>
            <dt className="font-semibold text-muted">Pour qui</dt>
            <dd className="text-body">
              Cafés, restaurants, fast-foods, barbiers, salons, parfumeries, boutiques, lavages auto… <Link href="/pour" className="font-semibold text-brand">plus de 100 types de commerces</Link>
            </dd>
            <dt className="font-semibold text-muted">Où</dt>
            <dd className="text-body">Partout en Tunisie : Tunis, Sfax, Sousse, Nabeul, Bizerte, Monastir, Kairouan, Gabès…</dd>
            <dt className="font-semibold text-muted">Prix</dt>
            <dd className="text-body">
              {PRICE} DT par an et par commerce ({PRICE_MONTH} DT par mois), tout compris — <Link href="/prix" className="font-semibold text-brand">les détails</Link>
            </dd>
            <dt className="font-semibold text-muted">Langues</dt>
            <dd className="text-body">L&apos;application en tunisien ; l&apos;accompagnement en tunisien et en français</dd>
            {supportPhone && (
              <>
                <dt className="font-semibold text-muted">Contact</dt>
                <dd className="text-body">
                  <a href={`https://wa.me/${supportPhone}`} className="font-semibold text-brand">
                    +{supportPhone}
                  </a>{" "}
                  (téléphone et WhatsApp)
                </dd>
              </>
            )}
          </dl>
        </section>

        <section className="mt-6 rounded-[1.25rem] border-2 border-dashed border-line p-5">
          <h2 className="text-[1.125rem] font-bold">À ne pas confondre</h2>
          <p className="mt-2 text-[0.9688rem] leading-relaxed text-body">
            Pointili (pointili.online) est une carte de fidélité pour les commerces en Tunisie. Il n&apos;a aucun lien avec Pointili, l&apos;application algérienne de pointage et de gestion des présences (pointili.com, pointili.dz), qui est une autre entreprise et un autre produit.
          </p>
          <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted" dir="rtl" lang="ar-TN">
            Pointili (pointili.online) كارط فيديليتي للمحلات في تونس. ما عندو حتى علاقة بـ Pointili متاع البوانتاج في الجزائر (pointili.com).
          </p>
        </section>

        <p className="mt-6 text-[0.9688rem] leading-relaxed text-body">
          Pour comparer avec les autres solutions de fidélité en Tunisie, voir <Link href="/comparatif" className="font-semibold text-brand">le comparatif</Link> ; pour les questions fréquentes, <Link href="/faq" className="font-semibold text-brand">la FAQ</Link>.
        </p>
      </div>

      <p className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/shop/new" className="press inline-flex h-12 items-center rounded-[1rem] bg-brand px-6 text-[1rem] font-bold text-white">
          حلّ محلّك في دقيقتين
        </Link>
      </p>
    </SiteFrame>
  );
}
