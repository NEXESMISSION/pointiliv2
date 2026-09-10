/**
 * Tunisian strings for client-ui (/s/[token], /[slug], /moi, /r/[code]).
 * FRENCH IS THE KEY; the value is derja (see the rules at the top of
 * lib/dict.ts). Spread into the shared dictionary by lib/dict.ts — never
 * import this file directly, and never edit lib/dict.ts to add a string.
 *
 * THE TRAP: a key that another fragment also defines is silently overridden.
 */
export const clientDict: Record<string, string> = {};
