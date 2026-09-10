// Replay supabase/migrations/*.sql in sorted order, then seed the super-admin
// list. Idempotent: every file is written to be re-run, so running this twice
// is a no-op and the ship gate relies on that.
//
//   node scripts/migrate.mjs                    tampon-test (DATABASE_URL)
//   node scripts/migrate.mjs --prod --i-know    tampon-prod (DATABASE_URL_PROD)
//   node scripts/migrate.mjs --reset [--i-know] drop schema public first (test only)
import { connect, dbHost, dbUrl, env, PROD } from "./db.mjs";
import { readFileSync, readdirSync } from "node:fs";

const c = await connect();
console.log(`target: ${dbHost(dbUrl())}${PROD ? "  (PRODUCTION)" : "  (test)"}`);

const reset = process.argv.includes("--reset");

if (reset) {
  /*
    --reset is `drop schema public cascade`. Unrecoverable. In v1 it ate a real
    café that someone had created through the UI. Never on production, and
    never on a database with shops in it without --i-know.
  */
  if (PROD) {
    console.error("\nREFUSING: --reset on the production database is not a thing this script does.\n");
    await c.end();
    process.exit(1);
  }
  const { rows } = await c
    .query(`select name, slug from shops order by created_at`)
    .catch(() => ({ rows: [] }));

  if (rows.length && !process.argv.includes("--i-know")) {
    console.error(`\nREFUSING TO RESET — ${rows.length} shop(s) live in this database:`);
    for (const r of rows) console.error(`  · ${r.name} (/${r.slug})`);
    console.error("\nThis DESTROYS them. If you really mean it:");
    console.error("  node scripts/migrate.mjs --reset --i-know\n");
    await c.end();
    process.exit(1);
  }

  console.log("dropping public schema…");
  await c.query(`drop schema public cascade; create schema public;`);
  await c.query(`
    grant usage on schema public to anon, authenticated, service_role;
    grant all on schema public to postgres;
    alter default privileges in schema public grant all on tables to postgres, service_role;
    alter default privileges in schema public grant all on sequences to postgres, service_role;
  `);
  console.log("public schema reset");
}

for (const f of readdirSync("supabase/migrations").filter((f) => f.endsWith(".sql")).sort()) {
  process.stdout.write(`applying ${f} … `);
  try {
    await c.query(readFileSync(`supabase/migrations/${f}`, "utf8"));
    console.log("ok");
  } catch (e) {
    console.log("FAILED");
    console.error(`  ${e.message}`);
    await c.end();
    process.exit(1);
  }
}

/*
  The super-admin list lives in platform_settings.super_admin_emails and is
  read by handle_new_user() at signup. The database cannot read an env var,
  so the migration seeds it from SUPER_ADMIN_EMAILS here, every run: the row
  always mirrors .env.local of the machine that last migrated. An empty or
  missing variable is left alone rather than wiping the list.
*/
const admins = (env.SUPER_ADMIN_EMAILS ?? "")
  .split(",")
  .map((s) => s.trim().toLowerCase())
  .filter(Boolean);
if (admins.length) {
  await c.query(
    `update platform_settings set super_admin_emails = $1::text[], updated_at = now() where id`,
    [admins],
  );
  /* Already-existing accounts on the list get the role too: the trigger only
     fires on INSERT, and the founder signs up before the list is seeded. */
  const { rowCount } = await c.query(
    `update profiles set role = 'super_admin'
      where lower(email) = any($1::text[]) and role <> 'super_admin'`,
    [admins],
  );
  console.log(`super_admin_emails: ${admins.length} address(es) seeded${rowCount ? `, ${rowCount} profile(s) promoted` : ""}`);
} else {
  console.log("super_admin_emails: SUPER_ADMIN_EMAILS not set — list left as is");
}

await c.end();
console.log("migrations applied");
