/**
 * Every word of Pointili v2, in Tunisian. One file, so the whole app can be
 * read (and checked) in one sitting. {name} placeholders are filled by fill().
 */
export const t = {
  brand: "Pointili",
  tagline: "كارطات الفيدليتي متاعك، في تليفونك",
  createAccount: "اعمل كونت",
  haveAccount: "عندي كونت",
  shopLink: "عندك محل؟",
  shopLinkCta: "ابدا من هوني",
  back: "ارجع",
  next: "كمّل",
  ok: "باهي",
  logout: "اخرج",

  // auth
  joinTitle: "اعمل كونت",
  joinHint: "بنومرو التليفون وخلاص",
  loginTitle: "مرحبا بيك",
  loginHint: "ادخل بنومرو التليفون",
  name: "إسمك",
  namePh: "مثلا: سامي",
  phone: "نومرو التليفون",
  password: "كلمة السر",
  passwordPh: "6 حروف على الأقل",
  join: "اعمل الكونت",
  login: "ادخل",
  toLogin: "عندك كونت؟ ادخل",
  toJoin: "ما عندكش كونت؟ اعمل واحد",
  errPhone: "النومرو لازمو 8 أرقام",
  errPassword: "كلمة السر لازمها 6 حروف على الأقل",
  errName: "اكتب إسمك",
  errLogin: "النومرو ولا كلمة السر غالطين",
  errTaken: "النومرو هذا عندو كونت. ادخل بيه",
  errNetwork: "صار مشكل. عاود جرّب",

  // the scan
  checking: "لحظة…",
  newStamp: "تامبون جديد!",
  reserved: "حجزنالك التامبون",
  reservedBody: "اعمل كونت باش يولّي متاعك",
  reservedClock: "عندك 20 دقيقة",
  toGo: "مازالولك {n} باش تربح {gift}",
  toGoOne: "مازالك تامبون واحد باش تربح {gift}",
  won: "ربحت {gift}!",
  wonBody: "ورّي الشاشة هذي للمحل",
  seeCard: "شوف الكارط",
  done: "باهي",
  errUsed: "الكود هذا تاخذ",
  errUsedBody: "سكاني الكود اللي على الشاشة توّا",
  errExpired: "الكود وفى",
  errExpiredBody: "سكاني الكود اللي على الشاشة توّا",
  errSoon: "خذيت تامبون هوني قبل شوية",
  errSoonBody: "نتلاقاو المرّة الجاية! التامبون الجاي من {time}",
  errDone: "التامبون هذا خذيتو",
  errOwn: "هذا المحل متاعك 🙂",
  errOwnBody: "الكود هذا للحرفاء",
  errInvalid: "الكود هذا موش صحيح",
  scanAgain: "سكاني من جديد",

  // the wallet
  hello: "نهارك طيّب",
  myCards: "الكارطات متاعي",
  noCards: "ما عندكش كارطات مازال",
  noCardsBody: "سكاني الكود في المحل وخوذ أول تامبون",
  scan: "سكاني",
  giftWaiting: "عندك كادو يستنّى فيك",
  giftAt: "{gift} في {shop}",
  stamps: "{n} تامبونات",

  // a card
  ready: "الكادو متاعك حاضر!",
  readyBody: "ورّي الشاشة هذي للمحل",
  history: "شنوّة صار",
  hStamp: "تامبون",
  hGift: "خذيت {gift}",
  hGiftWaiting: "كادو يستنّى",
  nothingYet: "مازال ما صار شي",

  // the camera
  scanTitle: "سكاني الكود",
  scanHint: "حط الكود متاع المحل في الإطار",
  cameraOff: "الكاميرا ما خدمتش",
  cameraOffBody: "خلّي الكاميرا تخدم، ولا سكاني بكاميرا التليفون",
  photo: "صوّر الكود",

  // the account
  account: "الكونت",
  save: "سجّل",
  saved: "تسجّل",

  // the owner: open the shop
  shopNewTitle: "حلّ محلّك في Pointili",
  shopNewHint: "دقيقتين وتبدا تعطي تامبونات",
  ownerName: "إسمك",
  shopTitle: "المحل",
  shopName: "إسم المحل",
  shopNamePh: "مثلا: Café Yasmine",
  shopKind: "شنوّة يبيع؟",
  kinds: {
    cafe: "قهوة",
    bakery: "مخبزة",
    restaurant: "ريستو",
    pizza: "بيتزا",
    salon: "حلّاق",
    beauty: "تجميل",
    shop: "حانوت",
    other: "آخر",
  } as Record<string, string>,
  cardTitle: "الكارط",
  cardGoal: "قدّاش من تامبون؟",
  cardGift: "شنوّة الكادو؟",
  cardGiftPh: "مثلا: قهوة بلاش",
  cardColor: "اللون",
  cardDone: "حلّ الكود",
  ideas: {
    cafe: ["قهوة بلاش", "كابوسان بلاش", "كرواسون بلاش"],
    bakery: ["كرواسون بلاش", "خبزة بلاش", "قطعة قاتو بلاش"],
    restaurant: ["ديسار بلاش", "مشروب بلاش", "صحن بلاش"],
    pizza: ["بيتزا صغيرة بلاش", "مشروب بلاش", "ديسار بلاش"],
    salon: ["حجامة بلاش", "تعديل اللحية بلاش", "ريميز 10 د"],
    beauty: ["سوان بلاش", "مانيكير بلاش", "ريميز 10 د"],
    shop: ["ريميز 10 د", "كادو مفاجأة", "ريميز 5 د"],
    other: ["كادو بلاش", "ريميز 10 د", "كادو مفاجأة"],
  } as Record<string, string[]>,
  preview: "هكّا يشوفها الحريف",

  // the counter
  counterTitle: "سكاني وخوذ تامبون",
  counterHint: "الكود يتبدّل وحدو، ويخدم مرّة برك",
  someone: "حريف",
  giftFor: "{who} ربح {gift}",
  giveNow: "اعطيه الكادو، وبعد اضغط",
  given: "عطيتو ✓",
  noCardYet: "اعمل الكارط قبل",
  reconnecting: "نعاود نتصل…",

  // the owner's settings
  settings: "المحل",
  numCustomers: "حريف",
  numToday: "تامبون اليوم",
  numGifts: "كادو تعطى",
  editCard: "بدّل الكارط",
  editShop: "بدّل المحل",
  openCounter: "حلّ الكود",
};

/** "مازالولك {n}" + { n: 3 } → "مازالولك 3" */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** The 3D picture of a kind of shop. */
export function kindIcon(kind: string | null | undefined): string {
  return ({ cafe: "coffee", bakery: "croissant", restaurant: "burger", pizza: "pizza", salon: "scissors", beauty: "gem", shop: "shop" } as Record<string, string>)[kind ?? ""] ?? "star";
}
