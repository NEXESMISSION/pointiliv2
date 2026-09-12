import { DEFAULT_LOCALE, type Locale } from "@/lib/i18n/config";
import { messagesFor } from "@/lib/i18n/messages";

/** Error codes returned by the database functions → words a person reads. */
export function message(code: string | null | undefined, locale: Locale = DEFAULT_LOCALE, fallback?: string): string {
  const table = messagesFor(locale).errors as Record<string, string>;
  return (code && table[code]) || fallback || table.network!;
}
