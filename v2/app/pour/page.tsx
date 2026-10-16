import type { Metadata } from "next";
import Link from "next/link";
import { JsonLd, SiteFrame } from "@/components/SiteFrame";
import { groupOf, NICHES, orgJsonLd, PRICE, SITE } from "@/lib/seo";
import { getSettings } from "@/lib/settings";
import { KIND_GROUPS, t } from "@/lib/t";

export const metadata: Metadata = {
  title: "Carte de fidélité par type de commerce en Tunisie — كارط فيديليتي لكل محل",
  description: `Café, barbier, boulangerie, restaurant, parfumerie, boutique, lavage auto… la carte de fidélité digitale Pointili pour chaque type de commerce en Tunisie, ${PRICE} DT par an. — كارط فيديليتي لكل نوع محل في تونس.`,
  alternates: { canonical: `${SITE}/pour` },
};

/** Every kind of shop with its own page, by family: the way in for a search on one kind. */
export default async function Kinds() {
  const { supportPhone, social } = await getSettings();
  const groups = KIND_GROUPS.map((g) => ({ ...g, niches: NICHES.filter((n) => groupOf(n.kind)?.id === g.id) })).filter((g) => g.niches.length);
  return (
    <SiteFrame support={supportPhone} social={social}>
      <JsonLd data={orgJsonLd(supportPhone, social)} />
      <h1 className="text-balance text-[2rem] font-bold leading-tight">كارط فيديليتي لكل محل</h1>
      <p className="mt-1 text-[1rem] font-semibold text-muted" dir="ltr" lang="fr">
        La carte de fidélité digitale, pour chaque type de commerce en Tunisie
      </p>
      <p className="mt-5 text-[1.0625rem] leading-relaxed text-body">
        كل محل وحريفو: القهوة يرجعلها كل نهار، والحجّام مرّتين في الشهر، والبوتيك من وقت لوقت. اختار نوع المحل متاعك وشوف الكارط اللي تمشيلو، والكادوات اللي يحبّوهم الحرفاء.
      </p>
      <p className="mt-2 text-[0.9375rem] leading-relaxed text-muted" dir="ltr" lang="fr">
        Chaque commerce a son rythme : on revient au café chaque jour, chez le barbier deux fois par mois, à la boutique de temps en temps. Choisissez votre type de commerce pour voir la carte qui lui convient et les récompenses que les clients aiment.
      </p>
      {groups.map((g) => (
        <section key={g.id} className="mt-7">
          <h2 className="text-[1.125rem] font-bold">{g.label}</h2>
          <div className="mt-3 flex flex-wrap gap-2">
            {g.niches.map((n) => (
              <Link key={n.slug} href={`/pour/${n.slug}`} className="press rounded-full bg-surface px-3.5 py-2 text-[0.875rem] font-semibold text-body shadow-card hover:text-brand">
                {t.kinds[n.kind as keyof typeof t.kinds] ?? n.fr} · <bdi className="text-muted">{n.fr}</bdi>
              </Link>
            ))}
          </div>
        </section>
      ))}
      <p className="mt-8 text-[0.9375rem] leading-relaxed text-muted">
        نوع المحل متاعك موش هوني؟ Pointili يخدم لأكثر من 100 نوع محل.{" "}
        <Link href="/shop/new" className="font-bold text-brand">
          حلّ محلّك
        </Link>
      </p>
    </SiteFrame>
  );
}
