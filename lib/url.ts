/** Only same-site relative paths survive as a post-login destination. */
export function safeNext(next: unknown, fallback = "/customer"): string {
  if (typeof next !== "string") return fallback;
  if (!next.startsWith("/") || next.startsWith("//") || next.startsWith("/\\")) return fallback;
  return next;
}

/** Canonical origin for metadata, sitemap and share links. On Vercel, falls back to the project's production domain. */
export function siteUrl(): string {
  const explicit = process.env.NEXT_PUBLIC_SITE_URL;
  const vercel = process.env.VERCEL_PROJECT_PRODUCTION_URL;
  const url = explicit && !(process.env.VERCEL && explicit.includes("localhost")) ? explicit : vercel ? `https://${vercel}` : explicit || "http://localhost:3100";
  return url.replace(/\/+$/, "");
}

export function clientIp(h: Headers): string | null {
  const fwd = h.get("x-forwarded-for");
  if (fwd) return fwd.split(",")[0]!.trim() || null;
  return h.get("x-real-ip");
}

export const TOKEN_RE = /^[A-Za-z0-9_-]{20,64}$/;

/** Reward QR on the customer's phone encodes `<origin>/redeem?code=123456`; staff may also type the 6 digits. */
export function rewardCodeFromScan(text: string): string | null {
  const trimmed = text.trim();
  const url = trimmed.match(/\/redeem\?(?:[^#]*&)?code=(\d{6})(?:[&#]|$)/);
  if (url) return url[1]!;
  const digits = trimmed.replace(/\s/g, "");
  return /^\d{6}$/.test(digits) ? digits : null;
}

/** Pull a Pointili scan token out of whatever a QR decoded to. */
export function tokenFromScan(text: string): string | null {
  const trimmed = text.trim();
  if (TOKEN_RE.test(trimmed)) return trimmed;
  const m = trimmed.match(/\/scan\/([A-Za-z0-9_-]{20,64})(?:[/?#]|$)/);
  return m ? m[1]! : null;
}
