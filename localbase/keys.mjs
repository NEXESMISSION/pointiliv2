/**
 * The keys of the database on this computer (localbase/server.mjs): signed with a secret that opens
 * nothing anywhere else. `node keys.mjs` prints the .env.local lines that point the app and the scripts
 * at it — and at it only: no key of the live database is among them.
 */
import { createHmac, timingSafeEqual } from "node:crypto";
import { pathToFileURL } from "node:url";

export const SECRET = "pointili-localbase-not-a-real-secret-0123456789";
const b64u = (b) => Buffer.from(b).toString("base64url");
export function sign(claims) {
  const head = b64u(JSON.stringify({ alg: "HS256", typ: "JWT" }));
  const body = b64u(JSON.stringify(claims));
  return `${head}.${body}.${createHmac("sha256", SECRET).update(`${head}.${body}`).digest("base64url")}`;
}
export function verify(token) {
  const [h, b, s] = String(token ?? "").split(".");
  if (!h || !b || !s) return null;
  const want = createHmac("sha256", SECRET).update(`${h}.${b}`).digest("base64url");
  if (want.length !== s.length || !timingSafeEqual(Buffer.from(want), Buffer.from(s))) return null;
  try {
    const claims = JSON.parse(Buffer.from(b, "base64url").toString("utf8"));
    if (claims.exp && claims.exp < Math.floor(Date.now() / 1000)) return null;
    return claims;
  } catch {
    return null;
  }
}
export const ANON_KEY = sign({ iss: "localbase", role: "anon", iat: 1762560000, exp: 4102444800 });
export const SERVICE_KEY = sign({ iss: "localbase", role: "service_role", iat: 1762560000, exp: 4102444800 });

if (process.argv[1] && import.meta.url === pathToFileURL(process.argv[1]).href) {
  const port = process.env.LOCALBASE_PORT || 54321;
  console.log(`# Pointili on this computer only (localbase): no live key here, so nothing can reach the live database
NEXT_PUBLIC_SUPABASE_URL=http://127.0.0.1:${port}
NEXT_PUBLIC_SUPABASE_ANON_KEY=${ANON_KEY}
SUPABASE_SERVICE_ROLE_KEY=${SERVICE_KEY}
SUPABASE_PROJECT_REF=localbase
LOCAL_SQL_URL=http://127.0.0.1:${port}/local/sql
NEXT_PUBLIC_SITE_URL=http://localhost:3302
ADMIN_PHONES=
CRON_SECRET=local-cron-secret`);
}
