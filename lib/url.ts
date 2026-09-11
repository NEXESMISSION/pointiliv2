/** Only same-site relative paths survive as a post-login destination. */
export function safeNext(next: unknown, fallback = "/customer"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

export function siteUrl(): string {
  return (process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100").replace(/\/+$/, "");
}

export function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || null;
  return h.get("x-real-ip");
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

/** Pull a Pointidi scan token out of whatever a QR decoded to. */
export function tokenFromScan(text: string): string | null {
  const trimmed = text.trim();
  if (TOKEN_RE.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/scan\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  return m ? m[1]! : null;
}
