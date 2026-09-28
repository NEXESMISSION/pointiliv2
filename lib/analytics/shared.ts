/**
 * What the tracker in the browser and the endpoint that stores its events agree
 * on. A path never carries a secret: a scan token or a join code is a key, and
 * an id tells the founder nothing — both collapse to a placeholder.
 */

export const ANALYTICS_ENDPOINT = "/api/ev";
export const VISITOR_COOKIE = "pl_vid";
export const SESSION_COOKIE = "pl_sid";
export const ANALYTICS_ID_RE = /^[A-Za-z0-9_-]{8,40}$/;
export const PAGE_VIEW_ID_RE = /^[A-Za-z0-9_-]{6,20}$/;

const DYNAMIC: [RegExp, string][] = [
  [/^\/scan\/[^/]+/, "/scan/:token"],
  [/^\/join\/[^/]+/, "/join/:code"],
  [/^\/customer\/cards\/[^/]+/, "/customer/cards/:id"],
  [/^\/customer\/rewards\/use\/[^/]+/, "/customer/rewards/use/:id"],
  [/^\/customers\/[^/]+/, "/customers/:id"],
  [/^\/rewards\/(?!new(?:\/|$))[^/]+/, "/rewards/:id"],
  [/^\/admin\/businesses\/(?!new(?:\/|$))[^/]+/, "/admin/businesses/:id"],
];

/** Anything else that looks like an id or a token. */
const ID_LIKE = (s: string) => /^[0-9a-f-]{32,36}$/i.test(s) || (/^[A-Za-z0-9_-]{16,}$/.test(s) && /\d/.test(s));

/** "/scan/Xy7…?utm=…" → "/scan/:token"; never longer than the column allows. */
export function cleanPath(raw: string): string {
  let p = String(raw || "/").split(/[?#]/)[0] || "/";
  if (!p.startsWith("/")) p = `/${p}`;
  p = p.replace(/\/{2,}/g, "/");
  if (p.length > 1) p = p.replace(/\/+$/, "");
  for (const [re, to] of DYNAMIC) if (re.test(p)) return p.replace(re, to).slice(0, 200);
  return p
    .split("/")
    .map((s) => (ID_LIKE(s) ? ":id" : s))
    .join("/")
    .slice(0, 200);
}
