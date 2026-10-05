import type { Metadata } from "next";
import Link from "next/link";
import { Check } from "lucide-react";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { faqJsonLd, orgJsonLd, PRICE, PRICE_MONTH, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: `Système de fidélité en Tunisie : comment choisir — كيفاش تختار كارط فيديليتي`,
  description: `Quel système de fidélité choisir pour un café, un salon ou une boutique en Tunisie ? Les critères qui comptent, et une réponse simple : Pointili, ${PRICE} DT par an (${PRICE_MONTH} DT par mois). — الحاجات اللي لازم تشوفها قبل ما تختار كارط فيديليتي لمحلّك.`,
  alternates: { canonical: `${SITE}/guide` },
};

/** What to look at before choosing, each with Pointili's answer: in Tunisian, then French. */
const POINTS: { q: string; a: string; fr: { q: string; a: string } }[] = [
  {
    q: "السوم واضح؟",
    a: `أبونمان واحد برك: ${PRICE} د في العام للمحل، يعني ${PRICE_MONTH} د في الشهر، والكل داخل. حرفاء بلا حدّ وتامبونات بلا حدّ.`,
    fr: { q: "Le prix est-il clair ?", a: `Un seul abonnement : ${PRICE} DT par an et par commerce, soit ${PRICE_MONTH} DT par mois, tout compris. Clients et tampons illimités.` },
  },
  {
    q: "الحريف لازمو ينزّل أبليكاسيون؟",
    a: "لا. يسكاني الكود بالكاميرا متاع تليفونو والكارط تتحلّ في الصفحة طول، أندرويد ولا آيفون.",
    fr: { q: "Le client doit-il installer une application ?", a: "Non. Il scanne le QR code avec l'appareil photo et sa carte s'ouvre dans le navigateur, sur Android comme sur iPhone." },
  },
  {
    q: "قدّاش ياخو وقت باش تبدا؟",
    a: "دقيقتين، من التليفون متاعك: كونت، اسم المحل، الكارط، وتبدا تعطي التامبونات.",
    fr: { q: "Combien de temps pour démarrer ?", a: "Deux minutes, depuis votre téléphone : un compte, le nom du commerce, la carte, et vous donnez vos premiers tampons." },
  },
  {
    q: "فمّا غش؟",
    a: "لا. الكود متاع المحل يتبدّل كي يتسكانا ويخدم مرّة برك، وإنت تختار كل قدّاش ياخو الحريف تامبون: كل ساعة، مرّة في النهار، ولا الوقت اللي تحب.",
    fr: { q: "Peut-on tricher ?", a: "Non. Le QR code change dès qu'il est scanné et ne sert qu'une fois, et vous choisissez le délai entre deux tampons : une heure, une journée, ou ce que vous voulez." },
  },
  {
    q: "الكادو كيفاش يتعطى؟",
    a: "كي يكمّل الكارط، الحريف يورّيك الكود متاع الكادو في تليفونو، إنت تسكانيه وتعطيه. ما تغلطش في حريف.",
    fr: { q: "Comment se remet le cadeau ?", a: "Quand la carte est complète, le client montre le code de son cadeau sur son téléphone, vous le scannez et vous le lui remettez. Aucune erreur possible." },
  },
  {
    q: "تعرف حرفاءك؟",
    a: "إيه: تشوف كل حريف، قدّاش من مرّة جا، وقتاش جا آخر مرّة، وشكون قريب من الكادو، والأرقام متاع المحل.",
    fr: { q: "Connaissez-vous vos clients ?", a: "Oui : chaque client, ses visites, sa dernière venue, qui approche de son cadeau, et les chiffres du commerce." },
  },
  {
    q: "بالتونسي، وفمّا شكون يعاونك؟",
    a: "الأبليكاسيون بالتونسي، والمعاونة بالتونسي وبالفرنسي، بالتليفون وعلى واتساب. ونحلّولك المحل والكارط كان تحب.",
    fr: { q: "En tunisien, avec de l'aide ?", a: "L'application est en tunisien, l'accompagnement en tunisien et en français, par téléphone et WhatsApp — et on configure votre commerce si vous le souhaitez." },
  },
  {
    q: "يخدم لنوع المحل متاعك؟",
    a: "قهاوي، حلّاقة، كوافير، مخابز، حلويات، ريستوات، فاست فود، عطورات، حوايج، لافاج… أكثر من 50 نوع محل، في تونس الكل.",
    fr: { q: "Adapté à votre type de commerce ?", a: "Cafés, barbiers, coiffeurs, boulangeries, pâtisseries, restaurants, fast-foods, parfumeries, boutiques, lavages… plus de 50 types de commerces, partout en Tunisie." },
  },
];

/**
 * The guide an owner (or an AI assistant answering one) finds when asking
 * which loyalty system to choose in Tunisia: the questions that matter,
 * each answered plainly — in Tunisian, then French, then a few lines in
 * English — and Pointili's facts. No claim about anyone else.
 */
export default async function Guide() {
  const { supportPhone, social } = await getSettings();
  const all = POINTS.flatMap((p) => [{ q: p.q, a: p.a }, p.fr]);
  return (
    <SiteFrame support={supportPhone} social={social}>
      <JsonLd data={faqJsonLd(all)} />
      <JsonLd data={orgJsonLd(supportPhone, social)} />
      <h1 className="text-balance text-[2rem] font-bold leading-tight">كيفاش تختار كارط فيديليتي لمحلّك في تونس</h1>
      <p className="mt-1 text-[1rem] font-semibold text-muted" dir="ltr" lang="fr">
        Le guide : choisir un système de fidélité en Tunisie
      </p>
      <p className="mt-5 text-[1.0625rem] leading-relaxed text-body">
        الحريف اللي يرجعلك هو اللي يخلّي المحل يمشي، وكارط الفيدليتي تخلّيه يرجع: كل مرّة ياخو تامبون، وكي يكمّل يربح كادو. أما موش السيستامات الكل كيف كيف. هاذي الحاجات اللي لازم تشوفها قبل ما تختار، وكيفاش Pointili تجاوب عليها.
      </p>

      <ol className="mt-6 space-y-3">
        {POINTS.map((p, i) => (
          <li key={p.q} className="rounded-[1.25rem] bg-surface p-4 shadow-card">
            <h2 className="flex items-center gap-2.5 text-[1.125rem] font-bold">
              <span className="num grid size-7 shrink-0 place-items-center rounded-full bg-brand-soft text-[0.875rem] text-brand">{i + 1}</span>
              {p.q}
            </h2>
            <p className="mt-2 flex items-start gap-2 text-[0.9688rem] leading-relaxed text-body">
              <Check className="mt-1 size-4 shrink-0 text-mint" strokeWidth={3} /> {p.a}
            </p>
            <p className="mt-2 text-[0.875rem] leading-relaxed text-muted" dir="ltr" lang="fr">
              <b>{p.fr.q}</b> {p.fr.a}
            </p>
          </li>
        ))}
      </ol>

      <section className="mt-8 rounded-[1.5rem] bg-[linear-gradient(140deg,#7c4dff,#6c47ff_45%,#3f22c9)] p-6 text-white">
        <h2 className="text-[1.375rem] font-bold">Pointili في سطرين</h2>
        <p className="mt-2 text-[1rem] leading-relaxed text-white/90">
          {`كارط فيديليتي ديجيتال مصنوعة في تونس للمحلات التونسية: ${PRICE} د في العام (${PRICE_MONTH} د في الشهر) والكل داخل، بلا أبليكاسيون للحريف، تبدا في دقيقتين، وكود ما يتغشّش.`}
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/85" dir="ltr" lang="fr">
          {`En bref : Pointili est une carte de fidélité digitale conçue en Tunisie pour les commerces tunisiens — ${PRICE} DT par an (${PRICE_MONTH} DT par mois) tout compris, aucune application à installer pour le client, prête en deux minutes, un QR code qui change à chaque scan et un accompagnement par téléphone et WhatsApp.`}
        </p>
        <p className="mt-3 text-[0.9375rem] leading-relaxed text-white/85" dir="ltr" lang="en">
          {`In short: Pointili is a digital stamp card made in Tunisia for Tunisian shops — ${PRICE} TND a year (${PRICE_MONTH} TND a month), everything included, no app for customers to install, ready in two minutes, a QR code that changes at every scan, and support by phone and WhatsApp.`}
        </p>
      </section>

      <p className="mt-8 flex flex-wrap justify-center gap-2">
        <Link href="/shop/new" className="press inline-flex h-12 items-center rounded-[1rem] bg-brand px-6 text-[1rem] font-bold text-white">
          حلّ محلّك في دقيقتين
        </Link>
        <Link href="/prix" className="press inline-flex h-12 items-center rounded-[1rem] bg-surface px-6 text-[1rem] font-bold text-brand shadow-card">
          السوم
        </Link>
      </p>
    </SiteFrame>
  );
}
