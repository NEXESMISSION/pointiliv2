"use client";

import { Gift } from "lucide-react";
import { CardIcon } from "@/components/CardIcon";
import { useT } from "@/components/i18n/Provider";
import { patternImage, rgba, surface, type CardDesign } from "@/lib/card-design";

type Props = {
  design: CardDesign;
  business: { name: string; logo_url: string | null; cover_url?: string | null };
  /** the rule, «كل دينار = نقطة» */
  subtitle?: string | null;
  balance: number;
  /** where the meter ends: the next gift's price, or the dearest once all are within reach */
  goal: number;
  /** the next gift and the points left to it */
  next?: { name: string; remaining: number } | null;
  /** a gift already within reach */
  ready?: string | null;
  /** stack = behind others in the wallet (top line only); tile = the wallet's front card; full = the card page */
  size?: "stack" | "tile" | "full";
  className?: string;
};

/**
 * A points card (board 2, P1), in the owner's own design like a stamps card:
 * the big number is everything, the meter runs to the next gift, one line
 * says how far it is — or that a gift is ready.
 */
export function PointsPass({ design, business, subtitle, balance, goal, next, ready, size = "full", className = "" }: Props) {
  const { t, count, fill } = useT();
  const w = t.points;
  const s = surface(design, !!business.cover_url);
  const tile = size !== "full";
  const stack = size === "stack";
  const pct = goal > 0 ? Math.min(100, Math.round((balance / goal) * 100)) : 0;

  return (
    <div
      className={`pass-shine relative overflow-hidden rounded-[26px] ${className}`}
      style={{ background: s.background, color: s.fg, border: s.border, boxShadow: `0 18px 40px -16px ${s.photo ? "rgba(0,0,0,0.55)" : rgba(design.bg2 ?? design.bg, 0.55)}` }}
      role="img"
      aria-label={`${business.name} · ${count(w.count, balance)}`}
    >
      {s.photo && business.cover_url && (
        <>
          {/* eslint-disable-next-line @next/next/no-img-element */}
          <img src={business.cover_url} alt="" className="absolute inset-0 size-full object-cover" />
          <div className="absolute inset-0" style={{ background: "linear-gradient(180deg, rgba(0,0,0,0.35) 0%, rgba(0,0,0,0.68) 100%)" }} />
        </>
      )}
      {design.pattern !== "none" && <div className="absolute inset-0" style={{ backgroundImage: patternImage(design.pattern, s.light) }} aria-hidden />}

      <div className={`relative ${stack ? "px-4 pb-6 pt-3.5" : tile ? "p-4" : "p-5"}`}>
        <div className="flex items-center gap-3">
          <span className="grid shrink-0 place-items-center overflow-hidden rounded-[14px] backdrop-blur-sm" style={{ width: tile ? 42 : 50, height: tile ? 42 : 50, background: s.chip }}>
            {business.logo_url ? (
              // eslint-disable-next-line @next/next/no-img-element
              <img src={business.logo_url} alt="" className="size-full object-cover" />
            ) : (
              <CardIcon name={design.icon} className="size-[52%]" />
            )}
          </span>
          <span className="min-w-0 flex-1">
            <span className={`block truncate font-semibold leading-tight ${tile ? "text-base" : "text-lg"}`}>{business.name}</span>
            {subtitle && (
              <span className="block truncate text-sm" style={{ color: s.muted }}>
                {subtitle}
              </span>
            )}
          </span>
          {tile && (
            <span className="shrink-0 text-end leading-none">
              <span className="num block text-[30px] font-bold">{balance}</span>
              <span className="mt-0.5 block text-[12px] font-medium" style={{ color: s.muted }}>
                {count(w.unit, balance)}
              </span>
            </span>
          )}
        </div>

        {!tile && (
          <div className="mt-5 flex items-baseline gap-2">
            <span className="num text-[54px] font-bold leading-none">{balance}</span>
            <span className="text-lg font-semibold" style={{ color: s.muted }}>
              {count(w.unit, balance)}
            </span>
          </div>
        )}

        {!stack && (
          <div className={`${tile ? "mt-3.5" : "mt-4"} h-2 overflow-hidden rounded-full`} style={{ background: s.chip }}>
            <div className="h-full rounded-full transition-[width] duration-700" style={{ width: `${pct}%`, background: design.accent }} />
          </div>
        )}

        {!stack && (ready || next) && (
          <div className={`flex items-center gap-2 rounded-2xl font-semibold ${tile ? "mt-3 px-3 py-2 text-[13px]" : "mt-4 px-3.5 py-2.5 text-sm"}`} style={{ background: s.chip }}>
            <Gift className="size-4 shrink-0" />
            <span className="min-w-0 flex-1 truncate">{ready ? fill(w.readyGift, { reward: ready }) : count(w.toGo, next!.remaining, { reward: next!.name })}</span>
          </div>
        )}
      </div>
    </div>
  );
}
