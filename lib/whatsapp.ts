/**
 * The one number every ask on the site leads to. Digits only, country code
 * first — what wa.me expects — from SUPPORT_WHATSAPP, else the first admin
 * phone. A bare Tunisian number gets its 216.
 */
export function supportWhatsApp(): string | null {
  const raw = process.env.SUPPORT_WHATSAPP || process.env.ADMIN_PHONES?.split(",")[0] || "";
  const digits = raw.replace(/\D/g, "");
  if (digits.length < 8) return null;
  return digits.length === 8 ? `216${digits}` : digits;
}

/** A wa.me link that opens the chat with the message already typed. */
export function whatsappLink(message: string): string | null {
  const number = supportWhatsApp();
  return number ? `https://wa.me/${number}?text=${encodeURIComponent(message)}` : null;
}
