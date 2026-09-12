import "server-only";
import { cache } from "react";
import { headers } from "next/headers";
import { DEFAULT_LOCALE, LOCALE_HEADER, isLocale, type Locale } from "./config";
import { makeI18n, type I18n } from "./index";

/** The language for this request, decided in proxy.ts (prefix → cookie → browser). */
export const getLocale = cache(async (): Promise<Locale> => {
  const value = (await headers()).get(LOCALE_HEADER);
  return isLocale(value) ? value : DEFAULT_LOCALE;
});

/** Everything a server component needs: `const { t, locale } = await getI18n();` */
export const getI18n = cache(async (): Promise<I18n> => makeI18n(await getLocale()));
