/**
 * Tunisian strings for identity-api (proxy pre-issue, /api/stamp, /api/recovery, /api/lang).
 * FRENCH IS THE KEY; the value is derja (see the rules at the top of
 * lib/dict.ts). Spread into the shared dictionary by lib/dict.ts — never
 * import this file directly, and never edit lib/dict.ts to add a string.
 *
 * THE TRAP: a key that another fragment also defines is silently overridden.
 */
export const identityDict: Record<string, string> = {};
