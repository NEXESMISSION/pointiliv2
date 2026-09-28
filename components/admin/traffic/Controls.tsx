"use client";

import Link from "next/link";
import { useRouter } from "next/navigation";
import { useEffect } from "react";
import { Check } from "lucide-react";

/** Small link pills: the range, the device. State lives in the URL. */
export function Pills({ items, active }: { items: { key: string; label: string; href: string }[]; active: string }) {
  return (
    <div className="inline-flex shrink-0 gap-1 rounded-xl bg-black/[0.045] p-1">
      {items.map((it) => (
        <Link
          key={it.key}
          href={it.href}
          scroll={false}
          replace
          aria-current={it.key === active ? "true" : undefined}
          className={`h-7 whitespace-nowrap rounded-lg px-2.5 text-xs font-medium leading-7 transition-colors ${it.key === active ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink"}`}
        >
          {it.label}
        </Link>
      ))}
    </div>
  );
}

/** On/off pill: "with my own visits". */
export function TogglePill({ on, href, label, hint }: { on: boolean; href: string; label: string; hint: string }) {
  return (
    <Link
      href={href}
      scroll={false}
      replace
      title={hint}
      aria-pressed={on}
      className={`inline-flex h-9 shrink-0 items-center gap-1.5 rounded-xl px-2.5 text-xs font-medium transition-colors ${on ? "bg-brand-50 text-brand-700 ring-1 ring-inset ring-brand-500/20" : "text-muted ring-1 ring-inset ring-line hover:text-ink"}`}
    >
      <span className={`grid size-4 place-items-center rounded-[5px] ${on ? "bg-brand-600 text-white" : "bg-white ring-1 ring-inset ring-line"}`}>{on && <Check className="size-3" strokeWidth={3} />}</span>
      {label}
    </Link>
  );
}

/** Re-reads the page every `every` ms while it is on screen: "who is here now" stays true. */
export function AutoRefresh({ every = 20_000 }: { every?: number }) {
  const router = useRouter();
  useEffect(() => {
    const id = setInterval(() => {
      if (document.visibilityState === "visible") router.refresh();
    }, every);
    return () => clearInterval(id);
  }, [router, every]);
  return null;
}

/** The page whose taps are drawn. */
export function PagePicker({ value, options, hrefFor, label }: { value: string; options: { value: string; label: string }[]; hrefFor: Record<string, string>; label: string }) {
  const router = useRouter();
  return (
    <select
      aria-label={label}
      value={value}
      onChange={(e) => router.replace(hrefFor[e.target.value] ?? "#", { scroll: false })}
      className="h-9 min-w-0 flex-1 rounded-xl border border-line bg-white px-2.5 text-[13px] font-medium text-ink focus:border-brand-500 focus:outline-none focus:ring-4 focus:ring-brand-500/15"
    >
      {options.map((o) => (
        <option key={o.value} value={o.value}>
          {o.label}
        </option>
      ))}
    </select>
  );
}
