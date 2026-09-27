"use client";

import { createContext, useContext, useMemo, type ReactNode } from "react";
import type { Locale } from "@/lib/i18n/config";
import { abI18n, type AbI18n } from "@/lib/abonili/i18n";

const Ctx = createContext<AbI18n>(abI18n("tn"));

/** Mounted once, in app/abonili/layout.tsx. Pointili's pages never load it. */
export function AbProvider({ locale, children }: { locale: Locale; children: ReactNode }) {
  const value = useMemo(() => abI18n(locale), [locale]);
  return <Ctx.Provider value={value}>{children}</Ctx.Provider>;
}

/** `const { a, count, intl } = useAb();` in any Abonili client component. */
export function useAb(): AbI18n {
  return useContext(Ctx);
}
