"use client";

import { useEffect } from "react";
import { ChevronLeft } from "lucide-react";
import Link from "@/components/Link";
import { Icon3D } from "@/components/ui";
import { bellRead } from "@/app/actions-bell";
import { B, type InboxItem } from "@/lib/bell";
import { agoSaid } from "@/lib/t";

/**
 * The bell's page: every piece of news for this owner, the newest on top. What was new when the page
 * opened keeps its coral dot while it is open; the bell itself is quiet from now on (bell_read).
 */
export function Inbox({ items, now }: { items: InboxItem[]; now: number }) {
  const fresh = items.some((x) => x.new);
  useEffect(() => {
    if (fresh) void bellRead().catch(() => {});
  }, [fresh]);

  if (!items.length) {
    return (
      <div className="m-auto flex max-w-[18rem] flex-col items-center pb-[8dvh] text-center">
        <Icon3D name="bell" size={84} className="animate-float" />
        <h2 className="mt-4 text-[1.1875rem] font-bold">{B.empty}</h2>
        <p className="mt-1 text-[0.9375rem] text-muted">{B.emptySub}</p>
      </div>
    );
  }

  return (
    <ul className="mt-[2dvh] flex min-h-0 flex-1 flex-col gap-2 overflow-y-auto pb-4 [scrollbar-width:none]">
      {items.map((x, i) => (
        <li
          key={x.id}
          className={`relative shrink-0 rounded-[1.25rem] p-3.5 shadow-card ${x.new ? "bg-surface ring-1 ring-brand/15" : "bg-surface/80"}`}
          style={{ animation: `rise 420ms cubic-bezier(0.2,0.8,0.2,1) ${Math.min(i, 6) * 55}ms both` }}
        >
          <div className="flex items-start gap-3">
            <span className={`grid size-11 shrink-0 place-items-center rounded-[0.875rem] ${x.new ? "bg-brand-soft" : "bg-canvas"}`}>
              <Icon3D name={x.icon || "sparkles"} size={28} lazy={i > 5} />
            </span>
            <div className="min-w-0 flex-1">
              <div className="flex items-baseline gap-2">
                <h2 className="min-w-0 flex-1 text-[0.9688rem] font-bold leading-snug">
                  <bdi>{x.title}</bdi>
                </h2>
                {x.new && <span className="shrink-0 rounded-full bg-coral px-1.5 py-px text-[0.6875rem] font-bold text-white">{B.isNew}</span>}
              </div>
              {x.body && (
                <p className="mt-0.5 whitespace-pre-line text-[0.875rem] leading-relaxed text-body">
                  <bdi>{x.body}</bdi>
                </p>
              )}
              <div className="mt-2 flex items-center gap-2">
                <span className="text-[0.75rem] text-faint">{agoSaid(now - Date.parse(x.at))}</span>
                {x.cta_label && x.cta_href && (
                  x.cta_href.startsWith("https://") ? (
                    <a href={x.cta_href} target="_blank" rel="noopener noreferrer" className="press ms-auto flex h-8 items-center gap-0.5 rounded-full bg-brand-soft ps-3 pe-2 text-[0.8125rem] font-bold text-brand">
                      {x.cta_label} <ChevronLeft className="size-4" />
                    </a>
                  ) : (
                    <Link href={x.cta_href} className="press ms-auto flex h-8 items-center gap-0.5 rounded-full bg-brand-soft ps-3 pe-2 text-[0.8125rem] font-bold text-brand">
                      {x.cta_label} <ChevronLeft className="size-4" />
                    </Link>
                  )
                )}
              </div>
            </div>
          </div>
        </li>
      ))}
    </ul>
  );
}
