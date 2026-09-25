/** Digits only, country code first — what wa.me expects. */
export function whatsappNumber(): string | null {
  const raw = process.env.SUPPORT_WHATSAPP || process.env.ADMIN_PHONES?.split(",")[0] || "";
  const digits = raw.replace(/\D/g, "");
  return digits.length >= 8 ? digits : null;
}
