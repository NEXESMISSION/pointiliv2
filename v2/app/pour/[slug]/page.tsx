import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { Check, Gift, QrCode, Stamp } from "lucide-react";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { nicheFacts } from "@/lib/niches";
import { faqJsonLd, nicheBySlug, NICHES, orgJsonLd, PRICE, PRICE_MONTH, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { t } from "@/lib/t";

export const generateStaticParams = () => NICHES.map((n) => ({ slug: n.slug }));

export async function generateMetadata({ params }: { params: Promise<{ slug: string }> }): Promise<Metadata> {
  const n = nicheBySlug((await params).slug);
  if (!n) return {};
  const f = nicheFacts(n);
  return {
    title: `Carte de fidélité pour ${n.fr} en Tunisie — كارط فيديليتي ${n.tn}`,
    description: `Carte de fidélité digitale pour ${n.fr} en Tunisie : vos clients cumulent des tampons sur leur téléphone, sans application, et reçoivent ${f.giftsFr[0]} après ${f.goal} visites. ${PRICE} DT par an. — كارط فيديليتي ${n.tn} في تونس.`,
    alternates: { canonical: `${SITE}/pour/${n.slug}` },
    openGraph: { title: `Carte de fidélité pour ${n.fr} — Pointili Tunisie`, url: `${SITE}/pour/${n.slug}`, images: [{ url: "/og.png", width: 1200, height: 630 }] },
  };
}

/**
 * One kind of shop's page: what an owner (or an AI assistant answering one)
 * finds when looking for a loyalty card for a café, a barber, a boutique in
 * Tunisia. Why its customers come back, the card that suits it, how a tampon
 * and a gift are given, the price, its own questions — in Tunisian, then in
 * French — and the shops of its family, one tap away.
 */
export default async function NichePage({ params }: { params: Promise<{ slug: string }> }) {
  const n = nicheBySlug((await params).slug);
  if (!n) notFound();
  const f = nicheFacts(n);
  const { supportPhone, social } = await getSettings();
  const name = t.kinds[n.kind as keyof typeof t.kinds] ?? n.fr;
  const faq = [
    { q: `يخدم Pointili ${n.tn}؟`, a: `إيه. Pointili كارط فيديليتي ديجيتال ${n.tn} في تونس الكل: الحريف يلمّ التامبونات في تليفونو بلا ما ينزّل حتى أبليكاسيون، وكي يكمّل الكارط ياخو الكادو.` },
    { q: `Pointili convient-il à un ${n.fr} ?`, a: `Oui. Pointili est une carte de fidélité digitale pour ${n.fr} partout en Tunisie : le client cumule ses tampons sur son téléphone, sans application, et reçoit sa récompense quand la carte est complète.` },
    { q: "قدّاش من تامبون نحطّ؟", a: `${f.rhythm} نقترحولك ${f.goal} تامبونات، وتبدّلها وقتلّي تحب (من 3 لـ 30).` },
    { q: "Combien de tampons faut-il prévoir ?", a: `${f.rhythmFr} Nous proposons ${f.goal} tampons, modifiables à tout moment (de 3 à 30).` },
    { q: "شنوّة الكادو؟", a: `اللي تحب: ${f.gifts.join("، ")}… وكي يكمّل الحريف الكارط، الكادو يستنّاه في تليفونو كيما بون، والكارط تبدا من جديد. ينجم يلمّ أكثر من كادو.` },
    { q: "Quelle récompense offrir ?", a: `Celle que vous voulez : ${f.giftsFr.join(", ")}… Quand la carte est complète, le cadeau attend dans le téléphone du client comme un bon, et la carte recommence à zéro. Il peut en cumuler plusieurs.` },
    { q: "قدّاش يسوى؟", a: `${PRICE} د في العام للمحل (${PRICE_MONTH} د في الشهر)، أبونمان واحد والكل داخل.` },
    { q: "Combien ça coûte ?", a: `${PRICE} DT par an et par commerce (${PRICE_MONTH} DT par mois), un seul abonnement, tout compris.` },
  ];
  const crumbs = {
    "@context": "https://schema.org",
    "@type": "BreadcrumbList",
    itemListElement: [
      { "@type": "ListItem", position: 1, name: "Pointili", item: SITE },
      { "@type": "ListItem", position: 2, name: "Carte de fidélité par commerce", item: `${SITE}/pour` },
      { "@type": "ListItem", position: 3, name: `Carte de fidélité pour ${n.fr}`, item: `${SITE}/pour/${n.slug}` },
    ],
  };
  const steps = [
    { icon: QrCode, tn: "الحريف يسكاني الكود متاعك بكاميرا تليفونو (ولا إنت تسكاني الكود متاعو، ولا تكتب النومرو متاعو).", fr: "Le client scanne votre QR code avec l'appareil photo de son téléphone (ou vous scannez le sien, ou vous tapez son numéro)." },
    { icon: Stamp, tn: "التامبون يتسجّل في ثانية، والكود يتبدّل وحدو باش ما فمّاش غش.", fr: "Le tampon s'enregistre en une seconde, et le QR code change aussitôt : pas de triche possible." },
    { icon: Gift, tn: `كي يكمّل ${f.goal} تامبونات، الكادو يستنّاه في تليفونو كيما بون، وإنت تسكانيه وتعطيهولو.`, fr: `Après ${f.goal} tampons, le cadeau attend dans son téléphone comme un bon : vous le scannez et vous le lui remettez.` },
  ];

  return (
    <SiteFrame support={supportPhone} social={social}>
      <JsonLd data={orgJsonLd(supportPhone, social)} />
      <JsonLd data={faqJsonLd(faq)} />
      <JsonLd data={crumbs} />
      <nav className="text-[0.8125rem] font-semibold text-muted">
        <Link href="/pour" className="hover:text-brand">
          لكل محل
        </Link>
        {" · "}
        <span>{f.groupLabel}</span>
      </nav>
      <h1 className="mt-2 text-balance text-[2rem] font-bold leading-tight">كارط فيديليتي {n.tn} في تونس</h1>
      <p className="mt-1 text-[1rem] font-semibold text-muted" dir="ltr" lang="fr">
        Carte de fidélité digitale pour {n.fr} en Tunisie
      </p>
      <p className="mt-5 text-[1.0625rem] leading-relaxed text-body">{f.why}</p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted" dir="ltr" lang="fr">
        {f.whyFr}
      </p>

      <section className="mt-6 rounded-[1.25rem] bg-surface p-5 shadow-card">
        <h2 className="text-[1.25rem] font-bold">الكارط اللي تمشي لـ{name}</h2>
        <p className="mt-0.5 text-[0.875rem] font-semibold text-muted" dir="ltr" lang="fr">
          La carte qui convient
        </p>
        <ul className="mt-3 space-y-2 text-[0.9688rem] leading-relaxed text-body">
          <li className="flex items-start gap-2">
            <Check className="mt-1 size-4 shrink-0 text-mint" strokeWidth={3} />
            <span>
              {f.rhythm}
              <span className="mt-1 block text-[0.875rem] text-muted" dir="ltr" lang="fr">
                {f.rhythmFr}
              </span>
            </span>
          </li>
          <li className="flex items-start gap-2">
            <Check className="mt-1 size-4 shrink-0 text-mint" strokeWidth={3} />
            <span>
              {f.wait}
              <span className="mt-1 block text-[0.875rem] text-muted" dir="ltr" lang="fr">
                {f.waitFr}
              </span>
            </span>
          </li>
        </ul>
        <div className="mt-4 flex flex-wrap gap-2">
          {f.gifts.map((g) => (
            <span key={g} className="flex items-center gap-1.5 rounded-full bg-brand-soft px-3 py-1.5 text-[0.875rem] font-bold text-brand">
              <Gift className="size-3.5" /> {g}
            </span>
          ))}
        </div>
      </section>

      <section className="mt-6">
        <h2 className="text-[1.25rem] font-bold">كيفاش تخدم</h2>
        <p className="mt-0.5 text-[0.875rem] font-semibold text-muted" dir="ltr" lang="fr">
          Comment ça marche
        </p>
        <ol className="mt-3 space-y-2.5">
          {steps.map((s, i) => (
            <li key={i} className="flex items-start gap-3 rounded-[1.125rem] bg-surface p-4 shadow-card">
              <span className="grid size-9 shrink-0 place-items-center rounded-full bg-brand-soft text-brand">
                <s.icon className="size-[1.125rem]" />
              </span>
              <span className="min-w-0">
                <span className="block text-[0.9688rem] leading-relaxed text-body">{s.tn}</span>
                <span className="mt-1 block text-[0.875rem] leading-relaxed text-muted" dir="ltr" lang="fr">
                  {s.fr}
                </span>
              </span>
            </li>
          ))}
        </ol>
      </section>

      <section className="mt-6 space-y-3">
        {faq.map((x) => (
          <div key={x.q} className="rounded-[1.125rem] bg-surface p-4 shadow-card" {...(/[a-z]/i.test(x.q[0] ?? "") ? { dir: "ltr", lang: "fr" } : {})}>
            <h3 className="text-[1rem] font-bold">{x.q}</h3>
            <p className="mt-1.5 text-[0.9375rem] leading-relaxed text-body">{x.a}</p>
          </div>
        ))}
      </section>

      {f.neighbours.length > 0 && (
        <section className="mt-8">
          <h2 className="text-[1.0625rem] font-bold">محلات أخرى · {f.groupLabel}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {f.neighbours.map((x) => (
              <Link key={x.slug} href={`/pour/${x.slug}`} className="press rounded-full bg-surface px-3.5 py-2 text-[0.875rem] font-semibold text-body shadow-card hover:text-brand">
                {t.kinds[x.kind as keyof typeof t.kinds] ?? x.fr} · <bdi className="text-muted">{x.fr}</bdi>
              </Link>
            ))}
          </div>
        </section>
      )}

      <p className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/shop/new" className="press inline-flex h-12 items-center rounded-[1rem] bg-brand px-6 text-[1rem] font-bold text-white">
          حلّ الكارط متاع {name}
        </Link>
        <Link href="/prix" className="press inline-flex h-12 items-center rounded-[1rem] bg-surface px-6 text-[1rem] font-bold text-brand shadow-card">
          السوم
        </Link>
      </p>
    </SiteFrame>
  );
}
