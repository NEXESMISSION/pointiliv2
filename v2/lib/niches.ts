import { cardDefaults } from "@/lib/card-defaults";
import { giftsOf, groupOf, NICHES, type Niche } from "@/lib/seo";

/**
 * What a page for one kind of shop says, beyond its name: why its customers
 * come back, how often, the card that suits it and the wait between two
 * tampons — by family of shop, in Tunisian and in French. A café's customer
 * comes every day, a barber's twice a month, a boutique's now and then: the
 * card, the gift and the wait follow.
 */
type Copy = { why: string; whyFr: string; rhythm: string; rhythmFr: string; wait: string; waitFr: string; giftsFr: string[] };

const COPY: Record<string, Copy> = {
  food: {
    why: "الحريف متاع الماكلة والقهوة يجي برشا، وما يبدّلش المحل كان ما عندوش علاش. كارط فيديليتي تعطيه سبب باش يرجع لعندك إنت، موش للي بحذاك.",
    whyFr: "Dans la restauration et les cafés, le client revient souvent et change d'adresse sans raison particulière. Une carte de fidélité lui donne une raison de revenir chez vous plutôt que chez le voisin.",
    rhythm: "الحريف يرجع كل نهار ولا كل جمعة: كارط قصيرة والكادو يجي بالخف، باش يحسّ بيه.",
    rhythmFr: "Le client revient chaque jour ou chaque semaine : une carte courte, une récompense qui arrive vite et se remarque.",
    wait: "تامبون كل ساعة ولا مرّة في النهار، باش حتى حد ما يلمّ زوز في دقيقة.",
    waitFr: "Un tampon par heure ou un par jour, pour qu'on ne puisse pas en cumuler deux d'un coup.",
    giftsFr: ["un café offert", "une boisson offerte", "un sandwich ou une part offerte", "une réduction sur la prochaine commande"],
  },
  house: {
    why: "قضية الدار يقضيها الحريف كل جمعة، ويقضيها من المحل اللي يعرفو ويحسّ روحو مربوح فيه. الكارط تخلّي القضية الصغيرة ترجع ديما لعندك.",
    whyFr: "Les courses de la maison se font chaque semaine, chez le commerçant qu'on connaît et où l'on se sent gagnant. La carte ramène les petits achats réguliers chez vous.",
    rhythm: "الحريف يجي مرّة ولا زوز في الجمعة: كارط متاع 8 لـ 10 تامبونات تمشي مليح.",
    rhythmFr: "Le client passe une ou deux fois par semaine : une carte de 8 à 10 tampons fonctionne bien.",
    wait: "تامبون مرّة في النهار يكفي.",
    waitFr: "Un tampon par jour suffit.",
    giftsFr: ["un produit offert", "une réduction sur le panier", "un kilo offert", "un cadeau de saison"],
  },
  beauty: {
    why: "في الجمال والحجامة، الحريف يرجع للي يثق فيه. الكارط تشكرو على اللي يرجعلك ديما وتخلّيه ما يمشيش يجرّب غيرك.",
    whyFr: "En coiffure et en beauté, le client revient vers la personne en qui il a confiance. La carte le remercie de sa régularité et lui évite d'aller essayer ailleurs.",
    rhythm: "الحريف يجي مرّة ولا زوز في الشهر: كارط متاع 5 لـ 6 تامبونات، والكادو خدمة.",
    rhythmFr: "Le client vient une à deux fois par mois : une carte de 5 à 6 tampons, et une prestation en récompense.",
    wait: "تامبون مرّة في النهار.",
    waitFr: "Un tampon par jour.",
    giftsFr: ["une coupe ou un brushing offert", "un soin offert", "une réduction sur la prestation", "un produit offert"],
  },
  health: {
    why: "الحريف اللي يرجع لنفس البارا ولا نفس الأوبتيسيان يستاهل كلمة شكر. الكارط تعطيهالو، بلا ما تبدّل الخدمة متاعك.",
    whyFr: "Le client qui revient dans la même parapharmacie ou chez le même opticien mérite un merci. La carte le lui offre, sans rien changer à votre service.",
    rhythm: "الحريف يجي من وقت لوقت: كارط متاع 5 لـ 8 تامبونات.",
    rhythmFr: "Le client vient de temps en temps : une carte de 5 à 8 tampons.",
    wait: "تامبون مرّة في النهار.",
    waitFr: "Un tampon par jour.",
    giftsFr: ["un produit offert", "une réduction sur le prochain achat", "un échantillon offert"],
  },
  sport: {
    why: "في السبور والتفرهيد، الحريف اللي يولّي يجي بانتظام ما يحبّش يقطع. الكارط تخلّيه يكمّل، وتجيب صحابو معاه.",
    whyFr: "Dans le sport et les loisirs, le client régulier n'aime pas casser sa série. La carte l'aide à continuer et lui donne envie d'amener ses amis.",
    rhythm: "الحريف يجي برشا في الجمعة: كارط متاع 8 لـ 10 تامبونات.",
    rhythmFr: "Le client vient plusieurs fois par semaine : une carte de 8 à 10 tampons.",
    wait: "تامبون مرّة في النهار.",
    waitFr: "Un tampon par jour.",
    giftsFr: ["une séance offerte", "une heure de jeu offerte", "une boisson offerte", "une réduction sur l'abonnement"],
  },
  wear: {
    why: "الحوايج والصبابط الحريف يشريهم من وقت لوقت، وينسى وين شرى. الكارط تفكّرو بيك وتخلّيه يرجعلك في الشرية الجاية.",
    whyFr: "Vêtements et chaussures s'achètent de temps en temps, et l'on oublie vite où. La carte rappelle votre boutique au client pour son prochain achat.",
    rhythm: "الحريف يجي كل شهر ولا أقل: كارط قصيرة، 5 تامبونات، والكادو ريميز.",
    rhythmFr: "Le client vient une fois par mois ou moins : une carte courte, 5 tampons, et une remise en récompense.",
    wait: "تامبون مرّة في النهار.",
    waitFr: "Un tampon par jour.",
    giftsFr: ["une remise sur le prochain achat", "un accessoire offert", "une pièce offerte"],
  },
  things: {
    why: "الحريف يشري من عندك من وقت لوقت، والكارط تخلّي إسمك أوّل حاجة يتفكّرها كي يستحقّ.",
    whyFr: "Le client achète chez vous de temps en temps : la carte fait de votre boutique la première à laquelle il pense quand il en a besoin.",
    rhythm: "كارط متاع 5 لـ 8 تامبونات، والكادو ريميز ولا حاجة صغيرة.",
    rhythmFr: "Une carte de 5 à 8 tampons, avec une remise ou un petit article en récompense.",
    wait: "تامبون مرّة في النهار.",
    waitFr: "Un tampon par jour.",
    giftsFr: ["une remise sur le prochain achat", "un petit article offert", "un service offert"],
  },
  services: {
    why: "في الخدمات، الحريف اللي يرجع هو اللي يعمل الخدمة. الكارط تعطيه سبب باش ما يمشيش لغيرك المرّة الجاية.",
    whyFr: "Dans les services, c'est le client qui revient qui fait vivre le commerce. La carte lui donne une raison de ne pas aller ailleurs la prochaine fois.",
    rhythm: "الحريف يرجع كل جمعة ولا كل شهر: كارط متاع 6 لـ 8 تامبونات، والكادو خدمة بلاش.",
    rhythmFr: "Le client revient chaque semaine ou chaque mois : une carte de 6 à 8 tampons, et une prestation offerte.",
    wait: "تامبون مرّة في النهار.",
    waitFr: "Un tampon par jour.",
    giftsFr: ["une prestation offerte", "une réduction sur la prochaine visite", "un service en plus offert"],
  },
};

export type NicheFacts = Niche & Copy & { group: string; groupLabel: string; goal: number; gifts: string[]; neighbours: Niche[] };

/** Everything the page of one kind of shop says. */
export function nicheFacts(n: Niche): NicheFacts {
  const g = groupOf(n.kind);
  const copy = COPY[g?.id ?? "services"] ?? COPY.services!;
  const neighbours = NICHES.filter((x) => x.slug !== n.slug && groupOf(x.kind)?.id === g?.id);
  return { ...n, ...copy, group: g?.id ?? "services", groupLabel: g?.label ?? "", goal: cardDefaults(n.kind).goal, gifts: giftsOf(n.kind).slice(0, 4), neighbours };
}
