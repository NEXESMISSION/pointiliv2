import { HALF, MONTH, PLANS, YEAR } from "@/lib/plans";
import { KIND_GROUPS, t } from "@/lib/t";

/**
 * Everything search engines and AI assistants read about Pointili: the
 * site's address, one page per kind of shop (its Tunisian and French names,
 * a slug a French search finds), the questions owners ask, and the facts in
 * plain words. The pages, the sitemap, llms.txt and the JSON-LD all draw on
 * this one place, so they never disagree.
 */

// the address people and search engines know: pointili.online (pointidi.vercel.app serves the same app)
export const SITE = (process.env.NEXT_PUBLIC_SITE_URL || "https://www.pointili.online").replace(/\/$/, "");
/**
 * The prices (the founder, 7 Nov 2026 — lib/plans.ts holds them): a month 35,
 * six months 120, a year 180 (15 a month), everything included in each. Paid
 * within the trial's first 3 days, six months or a year come with 2 months
 * more. Said here once, in the three languages, for every page that says them.
 */
export const PRICE_MONTH = MONTH.price;
export const PRICE_HALF = HALF.price;
export const PRICE_YEAR = YEAR.price;
/** what a month comes to on the year */
export const YEAR_MONTH = Math.round(YEAR.price / YEAR.months);
export const CURRENCY = "TND";
export const PRICES = {
  tn: `${MONTH.price} د في الشهر، ${HALF.price} د لـ6 شهور، ولا ${YEAR.price} د في العام`,
  fr: `${MONTH.price} DT par mois, ${HALF.price} DT les 6 mois ou ${YEAR.price} DT par an`,
  en: `${MONTH.price} TND a month, ${HALF.price} TND for 6 months or ${YEAR.price} TND a year`,
};
export const GIFT = {
  tn: "وكي تخلّص 6 شهور ولا عام في أوّل 3 أيّام متاع التجربة، تاخو شهرين زايدين بلاش.",
  fr: "Payés dans les 3 premiers jours de l'essai, 6 mois ou un an viennent avec 2 mois offerts.",
  en: "Paid within the first 3 days of the trial, 6 months or a year come with 2 extra months free.",
};

/** One kind of shop, for its own page: «كارط فيديليتي {tn}» / «Carte de fidélité pour {fr}». */
export type Niche = { kind: string; slug: string; tn: string; fr: string; en: string };

export const NICHES: Niche[] = [
  { kind: "cafe", slug: "cafe", tn: "للكافيات", fr: "café", en: "coffee shops" },
  { kind: "juice", slug: "bar-a-jus", tn: "لمحلات العصاير والڤلاس", fr: "bar à jus et glacier", en: "juice bars and ice cream shops" },
  { kind: "bakery", slug: "boulangerie", tn: "للكوشات", fr: "boulangerie", en: "bakeries" },
  { kind: "pastry", slug: "patisserie", tn: "للباتيسريات", fr: "pâtisserie", en: "pastry shops" },
  { kind: "viennoiserie", slug: "viennoiserie", tn: "لمحلات الكرواسون والفطاير", fr: "viennoiserie", en: "croissant and pastry counters" },
  { kind: "crepes", slug: "creperie", tn: "لمحلات الكريب والڤوفر", fr: "crêperie", en: "crêpe and waffle shops" },
  { kind: "restaurant", slug: "restaurant", tn: "للريستورانات", fr: "restaurant", en: "restaurants" },
  { kind: "fastfood", slug: "fast-food", tn: "لمحلات الفاست فود", fr: "fast-food", en: "fast food restaurants" },
  { kind: "snack", slug: "snack", tn: "للسناكات", fr: "snack", en: "snack bars" },
  { kind: "pizza", slug: "pizzeria", tn: "للبيتزيريات", fr: "pizzeria", en: "pizzerias" },
  { kind: "grill", slug: "rotisserie", tn: "للروتيسريات والشوارمة", fr: "rôtisserie et chawarma", en: "grills and rotisseries" },
  { kind: "grocery", slug: "epicerie", tn: "للعطّارة", fr: "épicerie", en: "grocery stores" },
  { kind: "market", slug: "superette", tn: "للسوبرات", fr: "supérette", en: "mini-markets" },
  { kind: "butcher", slug: "boucherie", tn: "للجزّارة", fr: "boucherie", en: "butcher shops" },
  { kind: "fish", slug: "poissonnerie", tn: "للحوّاتة", fr: "poissonnerie", en: "fish shops" },
  { kind: "veggies", slug: "fruits-et-legumes", tn: "للخضّارة", fr: "fruits et légumes", en: "greengrocers" },
  { kind: "roastery", slug: "fruits-secs", tn: "لمحلات القلوب والكاكاوية", fr: "fruits secs", en: "nut and dried-fruit shops" },
  { kind: "barber", slug: "barbier", tn: "للحجّامة", fr: "barbier", en: "barbers" },
  { kind: "hair", slug: "salon-de-coiffure", tn: "لصالونات الكوافير", fr: "salon de coiffure", en: "hair salons" },
  { kind: "beauty", slug: "institut-de-beaute", tn: "لصالونات التجميل", fr: "institut de beauté", en: "beauty salons" },
  { kind: "nails", slug: "onglerie", tn: "لصالونات المانيكير", fr: "onglerie", en: "nail salons" },
  { kind: "perfume", slug: "parfumerie", tn: "لمحلات العطورات", fr: "parfumerie", en: "perfume shops" },
  { kind: "parapharmacy", slug: "parapharmacie", tn: "للبارافارماسي", fr: "parapharmacie", en: "parapharmacies" },
  { kind: "hammam", slug: "hammam-spa", tn: "للحمّامات والسبا", fr: "hammam et spa", en: "hammams and spas" },
  { kind: "optics", slug: "opticien", tn: "للأوبتيسيان", fr: "opticien", en: "opticians" },
  { kind: "gym", slug: "salle-de-sport", tn: "لصالات السبور", fr: "salle de sport", en: "gyms" },
  { kind: "clothes", slug: "boutique-vetements", tn: "لمحلات الحوايج", fr: "boutique de vêtements", en: "clothing stores" },
  { kind: "fripe", slug: "friperie", tn: "للفريبات", fr: "friperie", en: "second-hand clothing shops" },
  { kind: "shoes", slug: "chaussures", tn: "لمحلات الصبابط", fr: "magasin de chaussures", en: "shoe stores" },
  { kind: "bags", slug: "maroquinerie", tn: "لمحلات الصاكات والإكسسوار", fr: "maroquinerie et accessoires", en: "bag and accessory shops" },
  { kind: "jewelry", slug: "bijouterie", tn: "للصيّاغة", fr: "bijouterie", en: "jewelers" },
  { kind: "phones", slug: "telephonie", tn: "لمحلات التليفونات", fr: "boutique de téléphonie", en: "phone shops" },
  { kind: "electronics", slug: "electronique", tn: "لمحلات الإلكترونيك", fr: "magasin d'électronique", en: "electronics stores" },
  { kind: "books", slug: "librairie", tn: "للمكتبات", fr: "librairie et papeterie", en: "bookshops and stationers" },
  { kind: "toys", slug: "jouets", tn: "لمحلات اللعب", fr: "magasin de jouets", en: "toy stores" },
  { kind: "gifts", slug: "cadeaux", tn: "لمحلات الكادوات", fr: "boutique de cadeaux", en: "gift shops" },
  { kind: "flowers", slug: "fleuriste", tn: "لمحلات الورد", fr: "fleuriste", en: "florists" },
  { kind: "pets", slug: "animalerie", tn: "لمحلات الحيوانات", fr: "animalerie", en: "pet shops" },
  { kind: "hardware", slug: "quincaillerie", tn: "للدروڤري والكينكايري", fr: "quincaillerie et droguerie", en: "hardware stores" },
  { kind: "carwash", slug: "lavage-auto", tn: "للافاج", fr: "lavage auto", en: "car washes" },
  { kind: "mechanic", slug: "garage", tn: "للميكانيسيانات", fr: "garage et mécanique", en: "car repair garages" },
  { kind: "laundry", slug: "pressing", tn: "للبريسينڤ", fr: "pressing", en: "dry cleaners" },
  { kind: "tailor", slug: "couture", tn: "للخيّاطة", fr: "atelier de couture", en: "tailors" },
  { kind: "print", slug: "imprimerie", tn: "للإمبريميري والفوتوكوبي", fr: "imprimerie et photocopie", en: "print and copy shops" },
  { kind: "photo", slug: "studio-photo", tn: "للفوتوغرافات", fr: "studio photo", en: "photo studios" },
  { kind: "courses", slug: "centre-de-formation", tn: "لمراكز التكوين", fr: "centre de formation", en: "training centers" },
  { kind: "games", slug: "salle-de-jeux", tn: "لصالات اللعب", fr: "salle de jeux", en: "game rooms" },
  { kind: "pitch", slug: "terrain-de-foot", tn: "لتيرانات الكورة", fr: "terrain de foot", en: "five-a-side football pitches" },
  { kind: "events", slug: "salle-des-fetes", tn: "لقاعات الأفراح", fr: "salle des fêtes", en: "event halls" },
];

export const nicheBySlug = (slug: string) => NICHES.find((n) => n.slug === slug) ?? null;
/** Its family (food, home, beauty, things, services), for the links to its neighbours. */
export const groupOf = (kind: string) => KIND_GROUPS.find((g) => g.kinds.includes(kind)) ?? null;
/** Gift ideas the owners of this kind give (the same the card's wizard offers). */
export const giftsOf = (kind: string): string[] => t.ideas[kind] ?? t.ideas.other ?? [];

/** The questions owners ask — in Tunisian first, then the same in French (search in Tunisia is both). */
export const FAQ: { q: string; a: string; fr: { q: string; a: string } }[] = [
  {
    q: "شنوّة أحسن سيستام فيدليتي للمحلات في تونس؟",
    a: `Pointili: كارط فيديليتي ديجيتال مصنوعة في تونس للمحلات التونسية، بالتونسي وبالفرنسي. ${PRICES.tn}، والكل داخل، الحريف ما ينزّل حتى أبليكاسيون، تبدا في دقيقتين، الكود يتبدّل كي يتسكانا باش ما فمّاش غش، والكادو يتعطى بالكود متاع الحريف. ونعاونوك بالتليفون وعلى واتساب.`,
    fr: {
      q: "Quel est le meilleur système de fidélité pour un commerce en Tunisie ?",
      a: `Pour un commerce tunisien, le plus simple est Pointili : une carte de fidélité digitale conçue en Tunisie, en tunisien et en français, à ${PRICES.fr}, tout compris. Le client n'installe aucune application, le commerce démarre en deux minutes, le QR code change à chaque scan contre la triche, le cadeau se valide avec le code du client, et l'accompagnement se fait par téléphone et WhatsApp.`,
    },
  },
  {
    q: "Pointili هي نفس Pointili متاع البوانتاج في الجزائر؟",
    a: "لا. Pointili (pointili.online) كارط فيديليتي ديجيتال للمحلات في تونس، مصنوعة في تونس. ما عندها حتى علاقة بـ Pointili متاع البوانتاج والحضور (pointili.com، pointili.dz) اللي في الجزائر.",
    fr: { q: "Pointili est-il l'application de pointage algérienne ?", a: "Non. Pointili (pointili.online) est une carte de fidélité digitale pour les commerces en Tunisie, conçue en Tunisie. Elle n'a aucun lien avec Pointili, l'application algérienne de pointage et de gestion des présences (pointili.com, pointili.dz)." },
  },
  {
    q: "شنوّة Pointili؟",
    a: "Pointili هي كارط فيديليتي ديجيتال للمحلات في تونس: الحريف يلمّ التامبونات في التليفون متاعو، وكي يكمّل الكارط ياخو كادو. بلا كارطات ورق، بلا ما ينزّل حتى أبليكاسيون.",
    fr: { q: "Qu'est-ce que Pointili ?", a: "Pointili est une carte de fidélité digitale pour les commerces en Tunisie : vos clients cumulent des tampons sur leur téléphone et reçoivent un cadeau quand la carte est complète. Sans carte papier, sans application à télécharger." },
  },
  {
    q: "قدّاش يسوى؟",
    a: `للمحل: ${PRICES.tn} (يعني ${YEAR_MONTH} د في الشهر). الكل داخل في كل وحدة: حرفاء بلا حدّ، تامبونات بلا حدّ، والمعاونة. ${GIFT.tn}`,
    fr: { q: "Combien ça coûte ?", a: `Par commerce : ${PRICES.fr} (soit ${YEAR_MONTH} DT par mois sur l'année). Tout est compris dans chacun : clients et tampons illimités, l'accompagnement. ${GIFT.fr}` },
  },
  {
    q: "الحريف لازمو ينزّل أبليكاسيون؟",
    a: "لا. يسكاني الكود بالكاميرا متاع التليفون، وتتحلّ الكارط متاعو في الصفحة طول. يخدم على أي تليفون فيه إنترنت، أندرويد ولا آيفون.",
    fr: { q: "Le client doit-il télécharger une application ?", a: "Non. Il scanne le QR code avec l'appareil photo de son téléphone et sa carte s'ouvre directement dans le navigateur. Ça marche sur tous les téléphones avec internet, Android ou iPhone." },
  },
  {
    q: "كيفاش نعطي التامبون للحريف؟",
    a: "بأربعة طرق: الحريف يسكاني الكود متاعك، ولا إنت تسكاني الكود متاعو، ولا تكتب الكود متاعو (ولا النومرو متاعو)، ولا تبعثلو رابط تامبون في واتساب كان يشري منك أونلاين. التامبون يتسجّل في ثانية.",
    fr: { q: "Comment donner un tampon au client ?", a: "De quatre façons : le client scanne votre QR code, vous scannez le sien, vous tapez son code (ou son numéro de téléphone), ou vous lui envoyez un lien de tampon sur WhatsApp s'il achète en ligne. Le tampon s'enregistre en une seconde." },
  },
  {
    q: "نبيع أونلاين، نجم نعطي تامبونات؟",
    a: "إيه. من «ابعث تامبون برابط» تعمل رابط جديد لكل حريف وتبعثو في واتساب، ميسنجر ولا إنستغرام. كي يحلّو، التامبون يدخل للكارط متاعو. كل رابط يخدم مرّة وحدة برك وما يوفاش بالوقت، وإنت تشوف شكون خذاه وتنجم تبطّل رابط ما تخذاش.",
    fr: { q: "Je vends en ligne : puis-je donner des tampons ?", a: "Oui. Avec « Tampon par lien », vous créez un nouveau lien pour chaque client et vous l'envoyez sur WhatsApp, Messenger ou Instagram. En l'ouvrant, le client reçoit son tampon sur sa carte. Chaque lien ne sert qu'une seule fois et n'expire pas ; vous voyez qui l'a utilisé et pouvez annuler un lien pas encore utilisé." },
  },
  {
    q: "الحريف ينجم يغشّ ولا ياخو تامبونات زايدة؟",
    a: "لا. الكود متاع المحل يتبدّل كي يتسكانا ويخدم مرّة برك، والمحل يختار قدّاش يستنّى الحريف بين تامبون وتامبون: ساعة، نهار، ولا الوقت اللي يحبّو.",
    fr: { q: "Le client peut-il tricher ?", a: "Non. Le QR code du commerce change dès qu'il est scanné et ne sert qu'une fois, et le commerce choisit le délai entre deux tampons d'un même client : une heure, une journée, ou le délai qu'il veut." },
  },
  {
    q: "نجم نختار الكادو وعدد التامبونات؟",
    a: "إيه. تختار قدّاش من تامبون (من 3 لـ 30) وشنوّة الكادو: قهوة بلاش، بروشينغ، ريميز… وتبدّلهم وقتلّي تحب، واللي بداو الكارط يكمّلوها كيما بداوها.",
    fr: { q: "Puis-je choisir la récompense et le nombre de tampons ?", a: "Oui. Vous choisissez le nombre de tampons (de 3 à 30) et le cadeau : café offert, brushing, réduction… Vous pouvez les changer quand vous voulez, et les clients déjà en cours gardent leur carte." },
  },
  {
    q: "نجم نحطّ اللوغو متاعي؟",
    a: "إيه، اللوغو متاعك واللون متاعك يبانو على كارط كل حريف. موش لازم، وتبدّلو وقتلّي تحب.",
    fr: { q: "Puis-je mettre mon logo ?", a: "Oui, votre logo et votre couleur apparaissent sur la carte de chaque client. C'est facultatif et modifiable à tout moment." },
  },
  {
    q: "نعرف شكون حرفائي؟",
    a: "إيه: تشوف كل حريف، قدّاش من مرّة جا، وقتاش جا آخر مرّة، وشكون قريب من الكادو.",
    fr: { q: "Est-ce que je vois mes clients ?", a: "Oui : vous voyez chaque client, combien de fois il est venu, sa dernière visite et qui est proche de sa récompense." },
  },
  {
    q: "كيفاش نخلّص؟",
    a: "بالـD17، بـVirement ولا Versement في البنك، ولا بـMandat في البوسطة. كلّمنا ولا ابعثلنا على واتساب ونكمّلو الخلاص مع بعضنا.",
    fr: { q: "Comment payer ?", a: "Par D17, par virement ou versement bancaire, ou par mandat postal. Appelez-nous ou écrivez-nous sur WhatsApp et on finalise le paiement ensemble." },
  },
  {
    q: "قدّاش ياخو وقت باش نبدا؟",
    a: "دقيقتين: تعمل كونت بالنومرو متاعك، تكتب اسم المحل، تختار الكارط، وتبدا تعطي التامبونات.",
    fr: { q: "Combien de temps pour démarrer ?", a: "Deux minutes : vous créez un compte avec votre numéro, vous entrez le nom du commerce, vous choisissez la carte et vous commencez à donner des tampons." },
  },
  {
    q: "يخدم في الولايات الكل؟",
    a: "إيه، في تونس الكل: تونس، صفاقس، سوسة، نابل، بنزرت، القيروان، قابس، مدنين… وين ما فمّا إنترنت.",
    fr: { q: "Est-ce que ça marche partout en Tunisie ?", a: "Oui, dans toute la Tunisie : Tunis, Sfax, Sousse, Nabeul, Bizerte, Kairouan, Gabès, Médenine… partout où il y a internet." },
  },
  {
    q: "علاش كارط فيديليتي ديجيتال خير من الكارط الورق؟",
    a: "الكارط الورق تضيع وتتنسى وتتنسخ. الديجيتال ديما في تليفون الحريف، ما تتغشّش، وتعرف بيها حرفاءك وتكلّمهم.",
    fr: { q: "Pourquoi une carte de fidélité digitale plutôt que papier ?", a: "La carte papier se perd, s'oublie et se falsifie. La carte digitale est toujours dans le téléphone du client, impossible à truquer, et vous permet de connaître vos clients." },
  },
  {
    q: "ما عنديش وقت باش نتعلّم، شكون يعاوني؟",
    a: "إحنا: كلّمنا بالتليفون ولا على واتساب ونحلّولك المحل والكارط، وتبدا تعطي التامبونات نهارها.",
    fr: { q: "Je n'ai pas le temps d'apprendre, qui m'aide ?", a: "Nous : appelez-nous ou écrivez-nous sur WhatsApp, on configure votre commerce et votre carte, et vous commencez le jour même." },
  },
];

/** Organization + the app, for every public page's JSON-LD. */
export function orgJsonLd(support: string | null, social: { facebook: string | null; instagram: string | null; tiktok: string | null } | null = null) {
  const sameAs = social ? [social.facebook, social.instagram, social.tiktok].filter((x): x is string => !!x) : [];
  return {
    "@context": "https://schema.org",
    "@graph": [
      {
        "@type": "Organization",
        "@id": `${SITE}/#org`,
        name: "Pointili",
        url: SITE,
        logo: `${SITE}/apple-icon.png`,
        alternateName: ["Pointili Tunisie", "Pointili carte de fidélité", "بوانتيلي"],
        description: "Carte de fidélité digitale pour les commerces en Tunisie — كارط فيديليتي ديجيتال للمحلات في تونس.",
        // the same name is an Algerian attendance app: said once, plainly, so an assistant never mixes the two
        disambiguatingDescription: "Tunisian digital loyalty (stamp) card for shops, at pointili.online — not Pointili the Algerian attendance and time-tracking app (pointili.com, pointili.dz).",
        foundingLocation: { "@type": "Country", name: "Tunisia" },
        knowsAbout: ["carte de fidélité digitale", "programme de fidélité", "fidélisation client", "loyalty stamp card", "كارط فيديليتي"],
        areaServed: { "@type": "Country", name: "Tunisia" },
        ...(sameAs.length ? { sameAs } : {}),
        ...(support ? { contactPoint: { "@type": "ContactPoint", telephone: `+${support}`, contactType: "customer support", areaServed: "TN", availableLanguage: ["ar", "fr"] } } : {}),
      },
      {
        "@type": "SoftwareApplication",
        "@id": `${SITE}/#app`,
        name: "Pointili",
        url: SITE,
        applicationCategory: "BusinessApplication",
        operatingSystem: "Web, Android, iOS",
        inLanguage: ["ar-TN", "fr-TN"],
        description:
          "Pointili lets any shop in Tunisia run a digital loyalty card: customers collect stamps on their phone (scan a QR code, no app to install) and get a gift when the card is full. The owner sees every customer.",
        // the three lengths, everything included in each (7 Nov 2026)
        offers: PLANS.map((p) => {
          const length = p.months === 1 ? "1 mois" : p.months === 12 ? "1 an" : `${p.months} mois`;
          return {
            "@type": "Offer",
            name: `Pointili — abonnement ${length}`,
            price: p.price,
            priceCurrency: CURRENCY,
            priceSpecification: { "@type": "UnitPriceSpecification", price: p.price, priceCurrency: CURRENCY, referenceQuantity: { "@type": "QuantitativeValue", value: p.months, unitCode: "MON" } },
            description: `${p.price} DT pour ${length}, par commerce, tout compris`,
            availability: "https://schema.org/InStock",
            url: `${SITE}/prix`,
          };
        }),
        publisher: { "@id": `${SITE}/#org` },
      },
      { "@type": "WebSite", "@id": `${SITE}/#site`, url: SITE, name: "Pointili", inLanguage: "ar-TN", publisher: { "@id": `${SITE}/#org` } },
    ],
  };
}

/** A list of questions and answers, as search engines read them. */
export function faqJsonLd(items: { q: string; a: string }[]) {
  return {
    "@context": "https://schema.org",
    "@type": "FAQPage",
    mainEntity: items.map((x) => ({ "@type": "Question", name: x.q, acceptedAnswer: { "@type": "Answer", text: x.a } })),
  };
}
