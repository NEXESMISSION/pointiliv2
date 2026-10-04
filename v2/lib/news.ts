import { t } from "@/lib/t";

/** A piece of news for the owners, as the popup shows it (v2.news_next). */
export type News = { id: string; title: string; body: string; icon: string; cta_label: string | null; cta_href: string | null };

/** The pictures a piece of news can wear (Fluent 3D, in public/3d). */
export const NEWS_ICONS = ["sparkles", "gift", "camera", "ticket", "star", "bell", "trophy", "party", "chart", "people", "phone", "crown"] as const;

/** Where its button can lead: the owner's own places, by name — or a web address. */
export const NEWS_TARGETS = [
  { href: "/shop/setup?edit=1", label: t.aNewsToShop },
  { href: "/shop/card", label: t.aNewsToCard },
  { href: "/shop/customers", label: t.aNewsToCustomers },
  { href: "/shop/qr", label: t.aNewsToCode },
  { href: "/me", label: t.aNewsToAccount },
] as const;

/** A place in the app ("/…", never "//…") or an https address; anything else is refused (null). */
export function newsHref(h: string): string | null {
  if (!h) return "";
  if (/^\/([^/\\]|$)/.test(h) && h.length <= 300) return h;
  if (/^https:\/\/[^\s]+$/.test(h) && h.length <= 300) return h;
  return null;
}
