"use client";

import { useRouter } from "next/navigation";
import { useEffect, useState } from "react";
import { newsClicked, newsSeen } from "@/app/actions";
import { NewsCard } from "@/components/NewsCard";
import { Icon3D } from "@/components/ui";
import type { News } from "@/lib/news";
import { newsSeenHere, newsShownHere } from "@/lib/once";
import { signal } from "@/lib/track";

/**
 * A piece of news on the owner's home, once in their life: it rises gently a
 * moment after the page, is written on the owner the moment it shows (who
 * saw it, and when — any phone after this one never shows it), and its
 * button leads straight to the thing (written too: who tapped it). A tap
 * outside, or «فهمت», lets it go.
 */
export function NewsPopup({ news, who }: { news: News | null; who: string }) {
  const router = useRouter();
  const [open, setOpen] = useState(false);
  const [leaving, setLeaving] = useState(false);
  const [at, setAt] = useState(0);

  useEffect(() => {
    if (!news || newsSeenHere(news.id, who)) return;
    const id = setTimeout(() => {
      if (newsSeenHere(news.id, who)) return;
      newsShownHere(news.id, who);
      void newsSeen(news.id).catch(() => {});
      signal("news", news.title);
      setOpen(true);
    }, 900);
    return () => clearTimeout(id);
  }, [news, who]);

  if (!news || !open) return null;

  const close = () => {
    setLeaving(true);
    signal("news_close", news.title);
    setTimeout(() => setOpen(false), 220);
  };
  const go = () => {
    const href = news.cta_href;
    if (!href) return close();
    void newsClicked(news.id).catch(() => {});
    signal("news_click", news.title);
    if (href.startsWith("https://")) {
      window.open(href, "_blank", "noopener");
      close();
    } else {
      setOpen(false);
      router.push(href);
    }
  };

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-[rgb(20_16_40/0.5)] px-6 pt-10 backdrop-blur-[2px] transition-opacity duration-200 ${leaving ? "opacity-0" : "animate-fade"}`}
      role="dialog"
      aria-modal="true"
      aria-label={news.title}
      onClick={close}
    >
      <style>{`@keyframes news-in { from { opacity: 0; transform: translateY(22px) scale(0.96); } to { opacity: 1; transform: none; } }`}</style>
      <div className="w-full max-w-sm" style={{ animation: "news-in 480ms cubic-bezier(0.2,0.8,0.2,1) both" }} onClick={(e) => e.stopPropagation()}>
        <span className="hidden" aria-hidden>
          {(news.steps ?? []).map((s, i) => (
            <Icon3D key={i} name={s.icon} size={52} />
          ))}
        </span>
        {(() => {
          // a small tour: the news itself first, then its steps; the button comes on the last
          const slides = [{ icon: news.icon, title: news.title, body: news.body }, ...(news.steps ?? [])];
          const slide = slides[Math.min(at, slides.length - 1)]!;
          return (
            <NewsCard
              news={{ ...slide, cta_label: news.cta_label, cta_href: news.cta_href }}
              step={slides.length > 1 ? { index: at, total: slides.length } : undefined}
              onNext={() => setAt((i) => Math.min(i + 1, slides.length - 1))}
              onAction={go}
              onClose={close}
            />
          );
        })()}
      </div>
    </div>
  );
}
