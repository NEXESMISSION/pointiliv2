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
  iAmCustomer: "نلمّ التامبونات",
  iAmCustomerHint: "كارطات المحلات اللي تحبّهم، في تليفونك",
  iAmShop: "نعطي التامبونات",
  iAmShopHint: "حلّ كارط فيديليتي لمحلّك في دقيقتين",
  haveAccountLogin: "عندك كونت؟ ادخل",
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
  errPaused: "المحل هذا موقّف التامبونات توّا",
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
    juice: "عصير وجلاطي",
    bakery: "مخبزة",
    pastry: "حلويات",
    viennoiserie: "فطاير وكرواسون",
    restaurant: "ريستو",
    fastfood: "فاست فود",
    pizza: "بيتزا",
    grill: "مشوي",
    barber: "حلّاق",
    hair: "كوافير",
    beauty: "تجميل",
    nails: "أظافر",
    clothes: "ملابس",
    phones: "تليفونات",
    grocery: "عطّار",
    gym: "رياضة",
    games: "ألعاب",
    events: "حفلات",
    carwash: "لافاج",
    gifts: "كادوات",
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
    juice: ["عصير بلاش", "جلاطي بلاش", "ميلك شيك بلاش"],
    bakery: ["خبزة بلاش", "كرواسون بلاش", "قطعة قاتو بلاش"],
    pastry: ["قطعة قاتو بلاش", "كيلو حلويات بريميز", "ميلفاي بلاش"],
    viennoiserie: ["كرواسون بلاش", "فطيرة بلاش", "قهوة وكرواسون"],
    restaurant: ["ديسار بلاش", "مشروب بلاش", "صحن بلاش"],
    fastfood: ["سندويتش بلاش", "فريت ومشروب بلاش", "مشروب بلاش"],
    pizza: ["بيتزا صغيرة بلاش", "مشروب بلاش", "ديسار بلاش"],
    grill: ["صحن مشوي بلاش", "مشروب بلاش", "سلطة بلاش"],
    barber: ["حجامة بلاش", "تعديل اللحية بلاش", "ريميز 10 د"],
    hair: ["بروشينغ بلاش", "سوان شعر بلاش", "ريميز 20%"],
    beauty: ["سوان وجه بلاش", "ريميز 20%", "كادو مفاجأة"],
    nails: ["مانيكير بلاش", "فارني بلاش", "ريميز 20%"],
    clothes: ["ريميز 10%", "ريميز 20 د", "كادو مفاجأة"],
    phones: ["كوك بلاش", "شارجور بلاش", "ريميز 10%"],
    grocery: ["ريميز 5 د", "كادو مفاجأة", "قهوة بلاش"],
    gym: ["سيانس بلاش", "شهر بريميز", "مشروب بروتين بلاش"],
    games: ["بارتية بلاش", "ساعة بلاش", "كادو مفاجأة"],
    events: ["ريميز 10%", "كادو مفاجأة", "صورة بلاش"],
    carwash: ["لافاج بلاش", "تنظيف داخل بلاش", "ريميز 50%"],
    gifts: ["ريميز 10%", "تغليف بلاش", "كادو مفاجأة"],
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

  // the owner's home
  showCode: "ورّي الكود",
  showCodeHint: "الحريف يسكاني ويخوذ تامبون",
  todayTitle: "اليوم",
  numVisitors: "حريف جا",
  waitingTitle: "كوادو يستنّاو",
  lately: "آخر حركة",
  lateStamp: "{who} خذا تامبون",
  lateGift: "{who} ربح {gift}",
  lateGiven: "{who} خذا {gift}",
  options: "الخيارات",
  customersTitle: "الحرفاء",
  customersEmpty: "مازال حتى حريف",
  customersEmptyBody: "ورّي الكود للحرفاء وكل واحد يسكاني يولّي هوني",
  never: "مازال",
  pausedBanner: "المحل موقّف من Pointili. كلّمنا.",
  ago: "قبل {n}",

  // the owner's settings
  settings: "المحل",
  numCustomers: "حريف",
  numToday: "تامبون اليوم",
  numGifts: "كادو تعطى",
  editCard: "بدّل الكارط",
  editShop: "بدّل المحل",
  openCounter: "حلّ الكود",

  // the founder's console
  admin: "الأدمين",
  aShops: "المحلات",
  aPeople: "الناس",
  aPaused: "موقّف",
  aCustomers: "حرفاء",
  aStamps: "تامبون في الكل",
  aToday: "تامبون اليوم",
  aGiven: "كادو تعطى",
  aWeek: "التامبونات، آخر 7 أيّام",
  aAllLive: "الكل يخدمو",
  aInAll: "في الكل",
  aNoneWaiting: "حتى كادو ما يستنّى",
  aCall: "كلّمو",
  aSearch: "لوّج بالاسم ولا النومرو",
  aNoCard: "ما عملش الكارط",
  aOwner: "المولى",
  aCreated: "تحلّ",
  aLast: "آخر حركة",
  aPause: "وقّف المحل",
  aResume: "رجّع المحل يخدم",
  aDelete: "امسح المحل",
  aDeleteConfirm: "متأكد؟ المحل والكارطات متاعو يتمسحو ما يرجعوش.",
  aTop: "أكثر الحرفاء",
  aRecent: "آخر الحركة",
  aCards: "كارطات",
  aShopOf: "محل",
  aAdminBadge: "أدمين",
  aNothing: "ما فمّا شي",
};

/** "مازالولك {n}" + { n: 3 } → "مازالولك 3" */
export function fill(template: string, vars: Record<string, string | number>): string {
  return template.replace(/\{(\w+)\}/g, (_, k: string) => (k in vars ? String(vars[k]) : `{${k}}`));
}

/** The 3D picture of a kind of shop. */
export function kindIcon(kind: string | null | undefined): string {
  return (
    {
      cafe: "coffee",
      juice: "juice",
      bakery: "bread",
      pastry: "cake",
      viennoiserie: "croissant",
      restaurant: "bell",
      fastfood: "burger",
      pizza: "pizza",
      grill: "fire",
      barber: "barber",
      hair: "scissors",
      beauty: "gem",
      nails: "sparkles",
      clothes: "crown",
      phones: "phone",
      grocery: "shop",
      gym: "trophy",
      games: "ticket",
      events: "party",
      carwash: "star",
      gifts: "gift",
      // the first app's kinds, should one ever come back
      salon: "scissors",
      shop: "shop",
    } as Record<string, string>
  )[kind ?? ""] ?? "pin";
}

/** Every kind of shop, in the order the owner sees them. */
export const KINDS = Object.keys(t.kinds);

/** Counting the Tunisian way: حريف واحد, زوز حرفاء, 5 حرفاء, 12 حريف. */
export function counted(n: number, one: string, two: string, few: string, many: string): string {
  if (n === 1) return one;
  if (n === 2) return two;
  const r = n % 100;
  return r >= 3 && r <= 10 ? `${n} ${few}` : `${n} ${many}`;
}
export const stampsN = (n: number) => counted(n, "تامبون واحد", "زوز تامبونات", "تامبونات", "تامبون");
export const customersN = (n: number) => counted(n, "حريف واحد", "زوز حرفاء", "حرفاء", "حريف");
export const giftsN = (n: number) => counted(n, "كادو واحد", "زوز كادوات", "كادوات", "كادو");
export const accountsN = (n: number) => counted(n, "كونت واحد", "زوز كونتات", "كونتات", "كونت");
export const liveN = (n: number) => counted(n, "واحد يخدم", "زوز يخدمو", "يخدمو", "يخدمو");
export const pausedN = (n: number) => counted(n, "واحد موقّف", "زوز موقّفين", "موقّفين", "موقّفين");
/** كادو واحد يستنّى, زوز كادوات يستنّاو */
export const waitingN = (n: number) => (n === 0 ? t.aNoneWaiting : n === 1 ? `${giftsN(1)} يستنّى` : `${giftsN(n)} يستنّاو`);
