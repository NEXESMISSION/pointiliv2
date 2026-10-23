/** One step of a small tour: a picture, a title, a few words — and `pic`, the screen itself (public/news/…). */
export type NewsStep = { icon: string; title: string; body: string; pic?: string | null };
/** A piece of news for the owners, as the popup shows it (v2.news_next); `steps` make it a small tour. */
export type News = { id: string; title: string; body: string; icon: string; cta_label: string | null; cta_href: string | null; steps?: NewsStep[] | null; pic?: string | null };
