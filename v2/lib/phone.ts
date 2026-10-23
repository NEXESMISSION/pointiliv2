/** ٠١٢٣٤٥٦٧٨٩ and ۰۱۲۳۴۵۶۷۸۹ (some Arabic keyboards type them) → 0123456789. */
export const western = (raw: string) => String(raw ?? "").replace(/[٠-٩۰-۹]/g, (d) => String(d.charCodeAt(0) & 0xf));

/** A Tunisian mobile number: 8 digits, with or without +216. */
export function digits(raw: string): string {
  return western(raw).replace(/\D/g, "").replace(/^216(?=\d{8}$)/, "").slice(0, 8);
}

export const validPhone = (raw: string) => /^[2-9]\d{7}$/.test(digits(raw));

/** The login behind a phone number (no SMS: the number is the name of the account). */
export const phoneEmail = (raw: string) => `216${digits(raw)}@phone.pointidi.app`;

/** 22 123 456 */
export const spaced = (raw: string) => digits(raw).replace(/^(\d{2})(\d{3})(\d{3})$/, "$1 $2 $3");

/** +216 22 123 456 — a whole number, as the founder reads it. */
export const pretty = (raw: string) => `+216 ${spaced(raw)}`;

/**
 * A password as it is kept (since 23 Oct 2026): Arabic and Persian digits made the ones every
 * keyboard types — a phone's Arabic keyboard writes ٣, its French one 3, and the same password
 * must open with either — and no space around it (a keyboard's suggestion leaves one).
 */
export const passwordOf = (raw: string) => western(String(raw ?? "")).trim();

/**
 * The ways one typed password may have been kept, the likeliest first: as it is kept now, as it
 * was typed, with Arabic digits (an account made on an Arabic keyboard before), and with its
 * first letter's case turned (a keyboard that put a capital). Signing in tries them in turn.
 */
export function passwordTries(raw: string): string[] {
  const typed = String(raw ?? "");
  const kept = passwordOf(typed);
  const arabic = kept.replace(/[0-9]/g, (d) => "٠١٢٣٤٥٦٧٨٩"[Number(d)]);
  const first = kept.charAt(0);
  const turned = first.toLowerCase() !== first.toUpperCase() ? (first === first.toLowerCase() ? first.toUpperCase() : first.toLowerCase()) + kept.slice(1) : kept;
  return [...new Set([kept, typed, arabic, turned])].filter((p) => p.length > 0);
}
