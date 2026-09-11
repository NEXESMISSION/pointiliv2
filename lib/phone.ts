/**
 * Tunisian mobile/landline numbers: 8 digits, first digit 2–9, country code +216.
 * Stored everywhere as E.164: "+21612345678".
 */
export function normalizePhone(input: string | null | undefined): string | null {
  if (!input) return null;
  let digits = String(input).replace(/\D/g, "");
  if (digits.startsWith("00216")) digits = digits.slice(5);
  else if (digits.startsWith("216") && digits.length === 11) digits = digits.slice(3);
  if (!/^[2-9]\d{7}$/.test(digits)) return null;
  return `+216${digits}`;
}

/** "+21612345678" → "+216 12 345 678" */
export function formatPhone(e164: string | null | undefined): string {
  if (!e164) return "";
  const d = e164.replace(/^\+216/, "");
  if (d.length !== 8) return e164;
  return `+216 ${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

/** Digits typed so far → "12 345 678" as the user types. */
export function formatLocalDigits(raw: string): string {
  const d = raw.replace(/\D/g, "").slice(0, 8);
  if (d.length <= 2) return d;
  if (d.length <= 5) return `${d.slice(0, 2)} ${d.slice(2)}`;
  return `${d.slice(0, 2)} ${d.slice(2, 5)} ${d.slice(5)}`;
}

/**
 * Supabase Auth needs an email or a phone provider. Phone sign-in would need an
 * SMS provider just to create accounts, so the auth identity of a phone account
 * is a synthetic, never-mailed address derived from the number.
 */
export function phoneAuthEmail(e164: string): string {
  return `${e164.replace(/^\+/, "")}@phone.pointidi.app`;
}
