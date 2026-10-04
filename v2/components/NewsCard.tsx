import { Icon3D } from "@/components/ui";
import type { News } from "@/lib/news";
import { t } from "@/lib/t";

/**
 * A piece of news as an owner sees it: its picture floating over the card,
 * «جديد في Pointili», the title, a few words, and its button (when it leads
 * somewhere) above «فهمت». The console shows the same card as a preview.
 */
export function NewsCard({ news, onAction, onClose }: { news: Pick<News, "title" | "body" | "icon" | "cta_label" | "cta_href">; onAction?: () => void; onClose?: () => void }) {
  const lead = !!(news.cta_label && news.cta_href);
  return (
    <div className="relative w-full rounded-[1.75rem] bg-surface px-5 pb-5 pt-[3.25rem] text-center text-ink shadow-[0_30px_70px_-24px_rgb(20_16_40/0.55)]">
      <span className="absolute -top-10 left-1/2 grid size-20 -translate-x-1/2 place-items-center rounded-[1.5rem] bg-[linear-gradient(150deg,#ffffff,#efe9ff)] shadow-[0_16px_34px_-14px_rgb(108_71_255/0.55)] ring-1 ring-brand/10">
        <Icon3D name={news.icon || "sparkles"} size={52} className="animate-float" />
      </span>
      <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-[0.75rem] font-bold text-brand">✨ {t.newsBadge}</span>
      <h2 className="mt-2.5 text-[1.3125rem] font-bold leading-snug">{news.title || "…"}</h2>
      {news.body && <p className="mt-1.5 whitespace-pre-line text-[0.9375rem] leading-relaxed text-body">{news.body}</p>}
      <div className="mt-[1.125rem] space-y-2">
        {lead && (
          <button type="button" onClick={onAction} className="press h-[3.25rem] w-full rounded-[1.125rem] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-[1rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]">
            {news.cta_label}
          </button>
        )}
        <button type="button" onClick={onClose} className={`press w-full rounded-[1.125rem] font-bold ${lead ? "h-11 text-[0.9375rem] text-muted" : "h-[3.25rem] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-[1rem] text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]"}`}>
          {t.newsOk}
        </button>
      </div>
    </div>
  );
}
