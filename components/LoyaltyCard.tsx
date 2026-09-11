import { Check, Gift } from "lucide-react";
import { cardColor } from "@/lib/constants";
import { CardIcon } from "./CardIcon";

/** Compact single row of stamp dots (home list). */
export function StampDots({ filled, total, color, max = 12 }: { filled: number; total: number; color: string; max?: number }) {
  const c = cardColor(color);
  const shown = Math.min(total, max);
  const on = Math.min(filled, shown);
  return (
    <div className="flex flex-wrap items-center gap-1.5" aria-label={`${Math.min(filled, total)} of ${total} stamps`}>
      {Array.from({ length: shown }, (_, i) => (
        <span
          key={i}
          className="grid size-5 place-items-center rounded-full border-2"
          style={i < on ? { background: c.accent, borderColor: c.accent } : { borderColor: c.soft, background: "#fff" }}
        >
          {i < on && <span className="size-1.5 rounded-full bg-white" />}
        </span>
      ))}
      {total > max && <span className="text-xs text-muted">+{total - max}</span>}
    </div>
  );
}

/** Full stamp grid (card detail). The last slot shows the reward gift. Newest stamp can animate in. */
export function StampGrid({ filled, total, color, icon, animateIndex }: { filled: number; total: number; color: string; icon: string; animateIndex?: number }) {
  const c = cardColor(color);
  const cols = total <= 5 ? total : total <= 10 ? 5 : total <= 12 ? 6 : total <= 20 ? 5 : 6;
  return (
    <div className="grid gap-2.5" style={{ gridTemplateColumns: `repeat(${cols}, minmax(0, 1fr))` }} role="img" aria-label={`${Math.min(filled, total)} of ${total} stamps collected`}>
      {Array.from({ length: total }, (_, i) => {
        const on = i < filled;
        const last = i === total - 1;
        return (
          <span
            key={i}
            className={`relative grid aspect-square place-items-center rounded-full border-2 ${on && i === animateIndex ? "animate-stamp" : ""}`}
            style={on ? { background: c.accent, borderColor: c.accent, color: "#fff" } : { borderColor: c.soft, background: "rgba(255,255,255,0.85)", color: c.accent, borderStyle: last ? "solid" : "dashed" }}
          >
            {on ? last ? <Gift className="size-[46%]" /> : <Check className="size-[46%]" strokeWidth={3} /> : last ? <Gift className="size-[42%] opacity-60" /> : <CardIcon name={icon} className="size-[38%] opacity-25" />}
          </span>
        );
      })}
    </div>
  );
}
