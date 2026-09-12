"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { makeI18n, type I18n } from "@/lib/i18n";

const Ctx = createContext<I18n>(makeI18n(DEFAULT_LOCALE));

/** Mounted once in the root layout with the language of the request. */
export function I18nProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => makeI18n(locale), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** `const { t, count, locale } = useT();` in any client component. */
export function useT(): I18n {
  return useContext(Ctx);
}
