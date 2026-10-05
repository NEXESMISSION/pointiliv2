import { Icon3D } from "@/components/ui";
import type { News } from "@/lib/news";
import { t } from "@/lib/t";

/**
 * A piece of news as an owner sees it: «جديد في Pointili», the title, a few
 * words, and its button (when it leads somewhere) above «فهمت». A tour is
 * slides: each can show the screen itself (`pic`, a real screenshot with the
 * place to tap lit up), so the owner sees how it is done without leaving;
 * a slide without one wears its 3D picture over the card. The console shows
 * the same card as a preview.
 */
export function NewsCard({
  news,
  onAction,
  onClose,
  step,
  onNext,
}: {
  news: Pick<News, "title" | "body" | "icon" | "cta_label" | "cta_href"> & { pic?: string | null };
  onAction?: () => void;
  onClose?: () => void;
  /** a tour: which slide of how many (the button says «كمّل» until the last) */
  step?: { index: number; total: number };
  onNext?: () => void;
}) {
  const lead = !!(news.cta_label && news.cta_href);
  const more = !!step && step.index < step.total - 1;
  const pic = news.pic || null;
  return (
    <div className={`relative w-full rounded-[1.75rem] bg-surface text-center text-ink shadow-[0_30px_70px_-24px_rgb(20_16_40/0.55)] ${pic ? "overflow-hidden" : "px-5 pb-5 pt-[3.25rem]"}`}>
      {pic ? (
        // the screen itself: a real screenshot, the place to tap lit up
        <div className="relative bg-[linear-gradient(160deg,#f5f2ff,#e9e4fb)] px-[clamp(1rem,5vw,1.25rem)] pb-0 pt-[clamp(0.875rem,2.4dvh,1.25rem)]">
          <span className="relative z-10 inline-flex items-center gap-1 rounded-full bg-white/80 px-3 py-1 text-[0.75rem] font-bold text-brand shadow-sm">✨ {t.newsBadge}</span>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img
            key={pic + (step?.index ?? 0)}
            src={pic}
            alt=""
            className="mx-auto mt-[1.4dvh] block max-h-[min(30dvh,17rem)] w-full animate-rise rounded-t-[1.25rem] object-cover object-center shadow-[0_-12px_30px_-20px_rgb(20_16_40/0.45)] ring-1 ring-ink/10"
          />
        </div>
      ) : (
        <>
          <span key={news.icon + (step?.index ?? 0)} className="absolute -top-10 left-1/2 grid size-20 -translate-x-1/2 animate-pop place-items-center rounded-[1.5rem] bg-[linear-gradient(150deg,#ffffff,#efe9ff)] shadow-[0_16px_34px_-14px_rgb(108_71_255/0.55)] ring-1 ring-brand/10">
            <Icon3D name={news.icon || "sparkles"} size={52} className="animate-float" />
          </span>
          <span className="inline-flex items-center gap-1 rounded-full bg-brand-soft px-3 py-1 text-[0.75rem] font-bold text-brand">✨ {t.newsBadge}</span>
        </>
      )}
      <div className={pic ? "px-5 pb-5" : ""}>
        <div key={step?.index ?? 0} className="animate-rise">
          <h2 className={`${pic ? "mt-[1.8dvh]" : "mt-2.5"} text-balance text-[1.3125rem] font-bold leading-snug`}>{news.title || "…"}</h2>
          {news.body && <p className="mt-1.5 whitespace-pre-line text-balance text-[0.9375rem] leading-relaxed text-body">{news.body}</p>}
        </div>
        {step && step.total > 1 && (
          <span className="mt-3.5 flex justify-center gap-1.5" aria-hidden>
            {Array.from({ length: step.total }, (_, i) => (
              <span key={i} className={`h-1.5 rounded-full transition-all duration-300 ${i === step.index ? "w-5 bg-brand" : "w-1.5 bg-line"}`} />
            ))}
          </span>
        )}
        <div className="mt-[1.125rem] space-y-2">
          {more ? (
            <>
              <button type="button" onClick={onNext} className="press h-[3.25rem] w-full rounded-[1.125rem] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-[1rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]">
                {t.tourNext}
              </button>
              <button type="button" onClick={onClose} className="press h-10 w-full rounded-[1.125rem] text-[0.875rem] font-semibold text-muted">
                {t.newsOk}
              </button>
            </>
          ) : (
            <>
              {lead && (
                <button type="button" onClick={onAction} className="press h-[3.25rem] w-full rounded-[1.125rem] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-[1rem] font-bold text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]">
                  {news.cta_label}
                </button>
              )}
              <button type="button" onClick={onClose} className={`press w-full rounded-[1.125rem] font-bold ${lead ? "h-11 text-[0.9375rem] text-muted" : "h-[3.25rem] bg-[linear-gradient(150deg,#9b7bff_-30%,#6c47ff_50%,#4a2ad6_130%)] text-[1rem] text-white shadow-[0_14px_30px_-12px_rgb(108_71_255/0.65)]"}`}>
                {t.newsOk}
              </button>
            </>
          )}
        </div>
      </div>
    </div>
  );
}
