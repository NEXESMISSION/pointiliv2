/**
 * The bell at the top of the owner's pages (13 Nov 2026): what the founder writes from the console,
 * kept — the newest first, what is not read yet marked (supabase/bell-2026-11-13.sql). The same news
 * the popup shows once on the home; a piece read in one is read in the other.
 */
export type InboxItem = {
  id: string;
  title: string;
  body: string;
  icon: string;
  cta_label: string | null;
  cta_href: string | null;
  pic: string | null;
  at: string;
  new: boolean;
};

/** a piece of news as the console lists it (admin_news_list) */
export type SentNews = {
  id: string;
  title: string;
  body: string;
  icon: string;
  cta_label: string | null;
  cta_href: string | null;
  active: boolean;
  published_at: string;
  only: boolean;
  audience: number;
  seen: number;
  clicked: number;
};

/** the pictures a piece of news may carry (public/3d) — the console offers these */
export const BELL_ICONS = ["sparkles", "bell", "gift", "party", "crown", "star", "phone", "chart"] as const;

export const B = {
  // the owner's side
  aria: "الإشعارات",
  title: "الإشعارات",
  empty: "ما فما حتى إشعار توّا",
  emptySub: "كل جديد من Pointili يوصلك هوني.",
  isNew: "جديد",
  // the console
  aTab: "الإشعارات",
  aTitle: "الإشعارات",
  aHint: "يطلع لمولى المحل في 🔔 فوق الصفحة متاعو، وكـ popup مرّة وحدة.",
  aNew: "إشعار جديد",
  aFor: "لشكون",
  aAll: "المحلات الكل",
  aOne: "{shop} برك",
  aToAll: "رجّعو للكل",
  aHead: "العنوان",
  aHeadPh: "مثلا: زدنا حاجة جديدة",
  aBody: "الكلام",
  aBodyPh: "جملة ولا زوز، بالتونسي",
  aIcon: "التصويرة",
  aCta: "زرّ (موش لازم)",
  aCtaLabel: "شنوّة مكتوب عليه",
  aCtaLabelPh: "مثلا: شوف",
  aCtaHref: "وين يهزّ",
  aPush: "ابعثو زادة للتليفونات (اللي قبلو الإشعارات)",
  aSend: "ابعث",
  aSending: "قاعد يبعث…",
  aSent: "تبعث ✓",
  aSentPush: "تبعث ✓ · وصل لـ{n} تليفون",
  aBad: "العنوان لازم بين 2 و80 حرف، والكلام أقل من 400.",
  aList: "اللي بعثتهم",
  aNone: "مازلت ما بعثت حتى إشعار.",
  aStats: "لـ{a} · شافوه {s} · ضغطو {c}",
  aOneShop: "لمحل واحد",
  aOff: "موقوف",
  aStop: "وقّفو",
  aResume: "رجّعو",
  aDelete: "امسحو",
  aSure: "متأكّد؟",
  aWrite: "ابعثلو إشعار",
};
