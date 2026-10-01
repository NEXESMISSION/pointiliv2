/** A Tunisian mobile number: 8 digits, with or without +216. */
export function digits(raw: string): string {
  return String(raw ?? "").replace(/\D/g, "").replace(/^216(?=\d{8}$)/, "").slice(0, 8);
}

export const validPhone = (raw: string) => /^[2-9]\d{7}$/.test(digits(raw));

/** The login behind a phone number (no SMS: the number is the name of the account). */
export const phoneEmail = (raw: string) => `216${digits(raw)}@phone.pointidi.app`;

/** 22 123 456 */
export const spaced = (raw: string) => digits(raw).replace(/^(\d{2})(\d{3})(\d{3})$/, "$1 $2 $3");
