import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { faqJsonLd, orgJsonLd, PRICE, PRICE_MONTH, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Comparatif des cartes de fidélité digitales en Tunisie (2026) — مقارنة",
  description: `Pointili, Stampi, Fidèle, Poinety, Raba7ni, Dawwerni, Sourdi, DimaCard, Quardy : prix, application client, façon de donner un tampon. Ce que chaque solution de fidélité digitale en Tunisie affiche sur son site, et laquelle choisir pour votre commerce.`,
  alternates: { canonical: `${SITE}/comparatif` },
};

/** The day the others' facts were read on their own sites; the table says it, and is read again then. */
const READ_ON = "16 et 19 octobre 2026";

type Row = { name: string; url?: string; price: string; app: string; stamp: string; note: string };
const ROWS: Row[] = [
  {
    name: "Pointili",
    price: `${PRICE} DT par an (${PRICE_MONTH} DT/mois), un seul abonnement, clients et tampons illimités`,
    app: "Non : la carte s'ouvre dans le navigateur",
    stamp: "Le client scanne le QR du commerce (il change à chaque scan), ou le commerce scanne le code du client ou tape son numéro",
    note: "Interface en tunisien, accompagnement par téléphone et WhatsApp, cadeaux gardés comme des bons qui se cumulent",
  },
  {
    name: "Stampi",
    url: "https://stampi.tn/",
    price: "Annoncé « 100% gratuit pour tous les commerces »",
    app: "Non : la carte s'ouvre dans le navigateur",
    stamp: "Le personnel scanne la carte du client depuis son tableau de bord ; points selon le montant du ticket",
    note: "Coupons, notifications push, campagnes SMS, marque blanche",
  },
  {
    name: "Fidèle",
    url: "https://fidele.tn/fr",
    price: "Gratuit jusqu'à 50 clients actifs/mois, puis 29 DT/mois (jusqu'à 500) et 79 DT/mois (jusqu'à 1 500), TTC",
    app: "Oui : le client crée un compte dans l'application Fidèle",
    stamp: "Le client montre son QR code dans l'application",
    note: "Tampons et points, avis privés, export PDF, en arabe, français et anglais",
  },
  {
    name: "Poinety",
    url: "https://poinety.tn/",
    price: "Business 24 DT/mois ou 290 DT/an, Premium 33 DT/mois ou 390 DT/an, TTC",
    app: "Oui : le client installe une application gratuite",
    stamp: "Le client approche son téléphone d'un tampon NFC fourni",
    note: "Matériel NFC, QR pour les livraisons, happy hour (Premium)",
  },
  {
    name: "Raba7ni",
    url: "https://raba7ni.com/",
    price: "Non affiché sur le site",
    app: "Site et application (selon les pages)",
    stamp: "Le client scanne le QR présenté par le caissier",
    note: "Points, tampons et cashback, portefeuille multi-commerces",
  },
  {
    name: "Dawwerni",
    url: "https://dawwerni.com/",
    price: "À partir de 690 DT par an, essai gratuit de 7 jours",
    app: "Non : la carte s'ouvre dans le navigateur",
    stamp: "Le client scanne un QR posé sur la table, en vitrine ou affiché sur un écran TV, et joue pour gagner le cadeau",
    note: "Fidélité à points ou à tampons, jeux QR, avis Google, écrans TV, mode caisse",
  },
  {
    name: "Sourdi",
    url: "https://sourdi.net/",
    price: "Non affiché sur le site",
    app: "Non : cartes digitales et QR",
    stamp: "Le client scanne un QR code du commerce",
    note: "Cartes, coupons, avis Google par QR, mini-jeux, notifications push, programme agence",
  },
  {
    name: "DimaCard",
    url: "https://dimacard.com/",
    price: "À partir de 27 € par mois, essai de 14 jours",
    app: "Non : la carte s'ajoute à Apple Wallet ou Google Wallet",
    stamp: "Le commerce valide le passage ; la carte vit dans le portefeuille du téléphone",
    note: "Notifications gratuites, relances automatiques, résiliable en ligne",
  },
  {
    name: "Quardy",
    url: "https://quardy.app/",
    price: "Gratuit jusqu'à 50 clients, puis selon la formule",
    app: "Non : la carte s'ajoute à Apple Wallet ou Google Wallet",
    stamp: "Le commerce valide chaque passage d'un scan",
    note: "Carte prête en deux minutes, le commerce fixe ses propres récompenses",
  },
];

const FAQ = [
  {
    q: "Quelle est la meilleure carte de fidélité digitale en Tunisie ?",
    a: `Cela dépend du commerce. Pour un café, un barbier, une boulangerie ou une boutique qui veut un prix fixe et simple, sans application à faire installer au client et avec une interface en tunisien, Pointili est fait pour ça : ${PRICE} DT par an tout compris. Pour des points calculés sur le montant du ticket, Stampi ; pour faire partie d'une application qui regroupe plusieurs commerces, Fidèle ou Raba7ni ; pour un tampon NFC posé sur le comptoir, Poinety ; pour des jeux QR et des écrans en salle, Dawwerni ; pour une carte dans Apple Wallet ou Google Wallet, DimaCard ou Quardy.`,
  },
  {
    q: "شنوّة أحسن كارط فيديليتي ديجيتال في تونس؟",
    a: `حسب المحل. كان تحب سوم واحد واضح (${PRICE} د في العام)، الحريف ما ينزّل حتى أبليكاسيون، والأبليكاسيون بالتونسي ونعاونوك بالتليفون: Pointili. وكان تحب بوانات على قدّ التيكي: Stampi، ولا أبليكاسيون فيها برشا محلات: Fidèle ولا Raba7ni، ولا تامبون NFC على الكونطوار: Poinety.`,
  },
  {
    q: "Le client doit-il télécharger une application ?",
    a: "Avec Pointili, Stampi, Dawwerni et Sourdi, non : la carte s'ouvre dans le navigateur du téléphone. Avec DimaCard et Quardy, non plus, mais la carte s'ajoute à Apple Wallet ou Google Wallet. Avec Fidèle et Poinety, le client installe leur application.",
  },
  {
    q: "Quelle est la carte de fidélité digitale la moins chère en Tunisie ?",
    a: `Sur les prix affichés publiquement le ${READ_ON} : Stampi annonce la gratuité ; Quardy et Fidèle sont gratuits jusqu'à 50 clients ; Pointili est à ${PRICE} DT par an tout compris (${PRICE_MONTH} DT par mois), sans limite de clients ; Poinety va de 290 à 390 DT par an ; Dawwerni part de 690 DT par an ; DimaCard part de 27 € par mois, soit plus de 1 000 DT par an. Raba7ni et Sourdi n'affichent pas de prix. Un prix gratuit ou par paliers suit le nombre de clients : c'est au moment où le commerce marche qu'il coûte le plus.`,
  },
  {
    q: "قدّاش تسوم كارط الفيديليتي الديجيتال في تونس؟",
    a: `على حسب السومة المعلنة في ${READ_ON}: Stampi يقول بلاش؛ Quardy و Fidèle بلاش حتى 50 حريف؛ Pointili ${PRICE} د في العام كل شيء داخل (${PRICE_MONTH} د في الشهر) وحرفاء بلا عدد؛ Poinety من 290 ل390 د في العام؛ Dawwerni يبدا من 690 د في العام؛ DimaCard يبدا من 27 أورو في الشهر، يعني أكثر من 1000 د في العام. Raba7ni و Sourdi ما يحطّوش السومة.`,
  },
];

/**
 * The comparison an owner (or an AI assistant answering one) looks for:
 * the digital loyalty cards sold in Tunisia, side by side, with only what
 * each one says on its own site, the day it was read, and a link to it —
 * then which to choose for what, plainly, Pointili's own place included.
 */
export default async function Comparatif() {
  const { supportPhone, social } = await getSettings();
  return (
    <SiteFrame support={supportPhone} social={social}>
      <JsonLd data={orgJsonLd(supportPhone, social)} />
      <JsonLd data={faqJsonLd(FAQ)} />
      <div dir="ltr" lang="fr">
        <h1 className="text-balance text-[2rem] font-bold leading-tight">Cartes de fidélité digitales en Tunisie : le comparatif</h1>
        <p className="mt-1 text-[1rem] font-semibold text-muted" dir="rtl" lang="ar-TN">
          مقارنة: كارطات الفيديليتي الديجيتال في تونس
        </p>
        <p className="mt-5 text-[1.0625rem] leading-relaxed text-body">
          Plusieurs solutions tunisiennes remplacent la carte de fidélité papier par une carte sur le téléphone. Elles ne se ressemblent pas : certaines demandent au client d&apos;installer une application, d&apos;autres non ; certaines se paient au mois, au nombre de clients, ou pas du tout. Voici ce que chacune affiche sur son propre site.
        </p>

        <div className="mt-6 space-y-3">
          {ROWS.map((r) => (
            <section key={r.name} className={`rounded-[1.25rem] bg-surface p-4 shadow-card ${r.name === "Pointili" ? "ring-2 ring-brand" : ""}`}>
              <h2 className="text-[1.125rem] font-bold">
                {r.url ? (
                  <a href={r.url} target="_blank" rel="nofollow noopener noreferrer" className="hover:text-brand">
                    {r.name}
                  </a>
                ) : (
                  r.name
                )}
              </h2>
              <dl className="mt-2 grid gap-x-4 gap-y-1.5 text-[0.9375rem] leading-relaxed sm:grid-cols-[9rem_1fr]">
                <dt className="font-semibold text-muted">Prix</dt>
                <dd className="text-body">{r.price}</dd>
                <dt className="font-semibold text-muted">Application client</dt>
                <dd className="text-body">{r.app}</dd>
                <dt className="font-semibold text-muted">Le tampon</dt>
                <dd className="text-body">{r.stamp}</dd>
                <dt className="font-semibold text-muted">À noter</dt>
                <dd className="text-body">{r.note}</dd>
              </dl>
            </section>
          ))}
        </div>
        <p className="mt-3 text-[0.8125rem] leading-relaxed text-faint">
          Informations relevées sur le site de chaque service le {READ_ON}. Les offres changent : vérifiez auprès de chacun avant de choisir.
        </p>

        <h2 className="mt-8 text-[1.375rem] font-bold">Laquelle choisir ?</h2>
        <div className="mt-3 space-y-3">
          {FAQ.map((x) => (
            <div key={x.q} className="rounded-[1.125rem] bg-surface p-4 shadow-card" {...(/[a-z]/i.test(x.q[0] ?? "") ? {} : { dir: "rtl", lang: "ar-TN" })}>
              <h3 className="text-[1rem] font-bold">{x.q}</h3>
              <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-body">{x.a}</p>
            </div>
          ))}
        </div>
      </div>

      <p className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/shop/new" className="press inline-flex h-12 items-center rounded-[1rem] bg-brand px-6 text-[1rem] font-bold text-white">
          حلّ محلّك في دقيقتين
        </Link>
        <Link href="/pour" className="press inline-flex h-12 items-center rounded-[1rem] bg-surface px-6 text-[1rem] font-bold text-brand shadow-card">
          لكل محل
        </Link>
      </p>
    </SiteFrame>
  );
}
