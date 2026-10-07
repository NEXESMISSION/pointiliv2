import type { Metadata } from "next";
import { SiteFrame } from "@/components/SiteFrame";
import { SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";

export const metadata: Metadata = {
  title: "Confidentialité — الخصوصية",
  description: "Ce que Pointili garde, pourquoi, la mesure des visites et le pixel de Facebook pour les publicités, et comment tout effacer. — شنوّة تلمّ Pointili، علاش، وكيفاش تمسح الكل.",
  alternates: { canonical: `${SITE}/privacy` },
};

/** What Pointili keeps and why, in Tunisian, then French. */
const PARTS: { title: string; body: string[]; fr: string }[] = [
  {
    title: "شنوّة نلمّو",
    body: [
      "للحريف: النومرو متاع التليفون، الاسم كان حطّيتو، والتامبونات والكادوات متاعك في كل محل.",
      "للمولى: النومرو، الاسم، اسم المحل ونوعو، الكارط متاعو، والخلاص متاع الأبونمان.",
    ],
    fr: "Pour un client : son numéro de téléphone, son prénom s'il l'a donné, ses tampons et ses cadeaux dans chaque commerce. Pour un commerçant : son numéro, son nom, le nom et le type du commerce, sa carte et le paiement de l'abonnement.",
  },
  {
    title: "علاش",
    body: ["باش الكارط تخدم: نعرفو قدّاش عندك من تامبون ووين، والمولى يشوف الحرفاء متاعو. ما نبيعو حتى معلومة لحتى حد."],
    fr: "Pour que la carte fonctionne : savoir combien de tampons vous avez et où, et montrer au commerçant ses clients. Nous ne vendons aucune donnée.",
  },
  {
    title: "الزيارات",
    body: ["نحسبو الزيارات في السيت متاعنا: أنهي صفحة، قدّاش من وقت، ومنين جيت (إعلان ولا Google مثلا)، باش نحسّنو Pointili. ما نسجّلوش شنوّة تكتب."],
    fr: "Nous mesurons les visites de notre site (pages vues, durée, provenance comme une publicité ou Google) pour améliorer Pointili. Nous n'enregistrons jamais ce que vous tapez.",
  },
  {
    title: "فيسبوك والإعلانات",
    body: [
      "كي تجي من إعلان متاعنا على فيسبوك ولا إنستغرام، السيت يقول لفيسبوك اللي جيت وشنوّة عملت: حلّيت صفحة، عملت كونت، عملت كارط. فيسبوك يستعمل هذا باش يقيس الإعلانات متاعنا ويورّيها لناس كيفك، ويحطّ cookies متاعو.",
      "هذا يصير كان في صفحات Pointili العامّة وصفحات المحل، عمرو ما يصير كي تلمّ التامبونات. تنجم توقّفو من الإعدادات متاع الإعلانات في فيسبوك.",
    ],
    fr: "Quand vous venez d'une de nos publicités Facebook ou Instagram, le site indique à Facebook (pixel Meta) les étapes accomplies : page vue, compte créé, carte créée. Facebook s'en sert pour mesurer nos publicités et les montrer à des personnes semblables, et dépose ses propres cookies. Cela ne concerne que les pages publiques et l'espace commerçant, jamais la collecte de tampons. Vous pouvez le refuser dans les paramètres publicitaires de Facebook.",
  },
  {
    title: "فيديو الزيارة",
    body: [
      "باش نفهمو وين الناس تتلفّت في السيت، Microsoft Clarity يسجّل الزيارة كيما فيديو: وين نزلت، قدّاش هبطت، وين وقفت. اللي تكتبو والنوامر والأسامي ما يتسجّلوش. نستعملو كان باش نحسّنو Pointili.",
    ],
    fr: "Pour comprendre où les visiteurs bloquent, Microsoft Clarity enregistre la visite comme une vidéo : touches, défilement, arrêts. Ce que vous tapez, les numéros et les noms sont masqués. Nous l'utilisons uniquement pour améliorer Pointili.",
  },
  {
    title: "تمسح الكونت",
    body: ["ابعثلنا على واتساب ونمسحولك الكونت والمعلومات متاعك الكل."],
    fr: "Écrivez-nous sur WhatsApp et nous effaçons votre compte et toutes vos données.",
  },
];

export default async function Privacy() {
  const { supportPhone, social } = await getSettings();
  return (
    <SiteFrame support={supportPhone} social={social}>
      <h1 className="text-balance text-[2rem] font-bold leading-tight">الخصوصية</h1>
      <p className="mt-1 text-[1rem] font-semibold text-muted" dir="ltr" lang="fr">
        Confidentialité
      </p>
      <div className="mt-6 space-y-3">
        {PARTS.map((p) => (
          <section key={p.title} className="rounded-[1.25rem] bg-surface p-4 shadow-card">
            <h2 className="text-[1.125rem] font-bold">{p.title}</h2>
            {p.body.map((b) => (
              <p key={b} className="mt-2 text-[0.9688rem] leading-relaxed text-body">
                {b}
              </p>
            ))}
            <p className="mt-2 text-[0.875rem] leading-relaxed text-muted" dir="ltr" lang="fr">
              {p.fr}
            </p>
          </section>
        ))}
      </div>
      {supportPhone && (
        <a
          href={`https://wa.me/${supportPhone}?text=${encodeURIComponent("سلام، نحب نمسح الكونت متاعي من Pointili")}`}
          target="_blank"
          rel="noreferrer"
          className="press mt-6 inline-flex h-11 items-center rounded-full bg-[#25D366] px-5 text-[0.9375rem] font-bold text-white"
        >
          واتساب
        </a>
      )}
    </SiteFrame>
  );
}
