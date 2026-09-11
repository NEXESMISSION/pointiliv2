/**
 * Apply supabase/migrations/*.sql in name order (every file is idempotent, so a
 * second run is a no-op), promote ADMIN_PHONES / ADMIN_EMAILS to admin, and put
 * the auth settings Pointidi depends on in place.
 *
 *   npm run migrate              # everything
 *   npm run migrate -- 0002      # only files starting with 0002 (still promotes admins + auth config)
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { management, runSql } from "./sql.mjs";

const only = process.argv.slice(2).find((a) => !a.startsWith("--"));
const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir)
  .filter((f) => f.endsWith(".sql") && (!only || f.startsWith(only)))
  .sort();

for (const f of files) {
  const t0 = Date.now();
  try {
    await runSql(readFileSync(join(dir, f), "utf8"));
    console.log(`✓ ${f} (${Date.now() - t0} ms)`);
  } catch (e) {
    console.error(`✗ ${f}\n${e.message}`);
    process.exit(1);
  }
}

// ── admins ─────────────────────────────────────────────────────────────────
const quote = (s) => `'${String(s).replace(/'/g, "''")}'`;
const phones = (process.env.ADMIN_PHONES || "").split(",").map((s) => s.trim()).filter(Boolean);
const emails = (process.env.ADMIN_EMAILS || "").split(",").map((s) => s.trim().toLowerCase()).filter(Boolean);
if (phones.length || emails.length) {
  const conds = [];
  if (phones.length) conds.push(`phone in (${phones.map(quote).join(",")})`);
  if (emails.length) {
    conds.push(`lower(email) in (${emails.map(quote).join(",")})`);
    conds.push(`id in (select id from auth.users where lower(email) in (${emails.map(quote).join(",")}))`);
  }
  const out = await runSql(`update public.profiles set role = 'admin' where role <> 'admin' and (${conds.join(" or ")}) returning id;`);
  console.log(`✓ admins promoted: ${Array.isArray(out) ? out.length : 0}`);
}

// ── auth settings ──────────────────────────────────────────────────────────
// Public sign-up is closed: every account is created by the server (validated
// phone, rate-limited), never by a direct call to the auth API with the anon key.
const site = process.env.NEXT_PUBLIC_SITE_URL || "http://localhost:3100";
await management("/config/auth", {
  method: "PATCH",
  body: {
    disable_signup: true,
    mailer_autoconfirm: true,
    password_min_length: 8,
    site_url: site,
    uri_allow_list: [site, "http://localhost:3100"].map((u) => `${u}/**`).join(","),
    security_sb_forwarded_for_enabled: true,
    rate_limit_token_refresh: 1800,
    rate_limit_verify: 300,
    jwt_exp: 3600,
    refresh_token_rotation_enabled: true,
  },
});
console.log("✓ auth config");
