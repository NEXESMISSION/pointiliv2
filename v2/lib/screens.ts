/**
 * Every page and every step inside one, by the name the founder knows it by —
 * the traffic page and a shop's own visits in the console read them alike.
 */
export const ROUTES: Record<string, string> = {
  "/": "الصفحة الأولى",
  "/shop/new": "تسجيل محل",
  "/shop/setup": "المحل (الاسم والنوع)",
  "/shop/card": "الكارط",
  "/shop/qr": "الكود",
  "/shop": "دار المحل",
  "/shop/customers": "الحرفاء",
  "/s/[token]": "سكان",
  "/join": "تسجيل حريف",
  "/login": "الدخول",
  "/forgot": "نسيت كلمة السر",
  "/me": "الكونت",
  "/me/cards": "كارطاتي",
  "/c/[id]": "كارط حريف",
  "/scan": "السكانر",
  "/wallet": "كارطات الحريف",
  "/u/[code]": "كود حريف",
  "/shop/collect": "زيد تامبون",
  "/shop/items": "شنوّة تبيع",
  "/shop/stats": "الأرقام",
  "/shop/settings": "الإعدادات",
  "/shop/pay": "الخلاص",
  "/shop/store": "الماغازة",
  "/shop/wheel": "الروليت",
  "/faq": "الأسئلة",
  "/guide": "الدليل",
  "/prix": "الأسوام",
  "/privacy": "الخصوصية",
};
export const SCREENS: Record<string, string> = {
  welcome: "الصفحة الأولى",
  wallet: "كارطات الحريف",
  hello: "مرحبا",
  goal: "قدّاش من تامبون",
  wait: "كل قدّاش",
  gift: "الكادو",
  color: "اللون",
  ready: "حاضرة",
  bravo: "برافو",
  tip: "النصيحة",
  code: "الكود",
  checking: "يثبّت",
  stamped: "خذا تامبون",
  held: "بلا كونت (محجوز)",
  store: "الماغازة",
  wheel: "الروليت",
  "shop-items": "",
  "counter-pick": "على شنوّة",
  "shop-welcome": "مرحبا",
};
export const FAILS: Record<string, string> = { used: "كود مستعمل", expired: "كود فات وقتو", too_soon: "بكري برشا", done: "كمّل الكارط", own_shop: "محلّو هو", paused: "محل موقوف", network: "مشكل إنترنت", invalid: "كود غالط" };
export function screenName(route: string, screen: string | null): string {
  if (route === "/" && screen) return SCREENS[screen] ?? screen;
  const base = ROUTES[route] ?? route;
  if (!screen) return base;
  if (screen.startsWith("failed:")) return `${base} · ${FAILS[screen.slice(7)] ?? screen.slice(7)}`;
  if (screen.startsWith("edit-")) return `تبديل الكارط · ${SCREENS[screen.slice(5)] ?? screen.slice(5)}`;
  // a page whose one screen bears its own name (or none of its own): said once
  if (SCREENS[screen] === base || SCREENS[screen] === "") return base;
  return `${base} · ${SCREENS[screen] ?? screen}`;
}
