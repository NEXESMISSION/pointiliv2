"use client";

import { usePathname } from "next/navigation";
import { Languages } from "lucide-react";
import { useT } from "./Provider";
import { LOCALES, LOCALE_COOKIE, LOCALE_MAX_AGE, LOCALE_NAME, LOCALE_SHORT, isMarketingPath, localePath, splitLocalePath, type Locale } from "@/lib/i18n/config";

function apply(locale: Locale, pathname: string) {
  try {
    document.cookie = `${LOCALE_COOKIE}=${locale}; path=/; max-age=${LOCALE_MAX_AGE}; samesite=lax`;
  } catch {
    /* private mode */
  }
  const { path } = splitLocalePath(pathname);
  // Public pages live at their own address per language; app screens follow the cookie.
  const target = isMarketingPath(path) ? localePath(path, locale) || "/" : pathname;
  window.location.assign(target);
}

/** FR / تونسي, as a small segmented control. */
export function LanguageSwitcher({ className = "" }: { className?: string }) {
  const { locale, t } = useT();
  const pathname = usePathname();
  return (
    <div className={`inline-flex gap-0.5 rounded-lg bg-black/[0.045] p-0.5 ${className}`} role="group" aria-label={t.common.language}>
      {LOCALES.map((code) => (
        <button
          key={code}
          type="button"
          onClick={() => code !== locale && apply(code, pathname)}
          aria-current={code === locale ? "true" : undefined}
          className={`h-7 rounded-md px-2.5 text-xs font-semibold transition-colors ${code === locale ? "bg-white text-ink shadow-card" : "text-muted hover:text-ink"}`}
        >
          {LOCALE_SHORT[code]}
        </button>
      ))}
    </div>
  );
}

/** One small button showing the other language — for tight headers. */
export function LanguageToggle({ className = "" }: { className?: string }) {
  const { locale, t } = useT();
  const pathname = usePathname();
  const other = LOCALES.find((l) => l !== locale)!;
  return (
    <button
      type="button"
      onClick={() => apply(other, pathname)}
      title={`${t.common.language}: ${LOCALE_NAME[other]}`}
      className={`inline-flex h-8 shrink-0 items-center gap-1 rounded-lg px-2 text-xs font-semibold text-muted transition-colors hover:bg-black/[0.045] hover:text-ink ${className}`}
    >
      <Languages className="size-4" aria-hidden />
      {LOCALE_SHORT[other]}
    </button>
  );
}

/** A settings-list row that switches language. */
export function LanguageRow() {
  const { locale, t } = useT();
  const pathname = usePathname();
  const other = LOCALES.find((l) => l !== locale)!;
  return (
    <button type="button" onClick={() => apply(other, pathname)} className="flex min-h-14 w-full items-center gap-3 px-4 py-2.5 text-start transition-colors hover:bg-canvas/60">
      <span className="grid size-9 shrink-0 place-items-center rounded-xl bg-canvas text-body">
        <Languages className="size-[18px]" />
      </span>
      <span className="min-w-0 flex-1">
        <span className="block text-[15px] font-medium text-ink">{t.common.language}</span>
        <span className="block truncate text-[13px] text-muted">{LOCALE_NAME[locale]}</span>
      </span>
      <span className="shrink-0 text-[13px] font-semibold text-brand-600">{LOCALE_NAME[other]}</span>
    </button>
  );
}
