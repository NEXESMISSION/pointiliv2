/**
 * Replay every supabase/migrations/*.sql in order over HTTPS (see sql-http.mjs).
 *
 * Same contract as migrate.mjs: the folder is replayed in full every run and every
 * file must be idempotent (if not exists / or replace / drop if exists), so a
 * second run is a no-op. Refuses to touch a production ref unless told twice.
 *
 *   node scripts/migrate-http.mjs            # all files, in name order
 *   node scripts/migrate-http.mjs 0003       # only files whose name starts with 0003
 *   node scripts/migrate-http.mjs --prod --i-know
 */
import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import { runSql } from "./sql-http.mjs";

config({ path: ".env.local", quiet: true });

const args = process.argv.slice(2);
const prodRef = process.env.SUPABASE_PROJECT_REF_PROD;
if (prodRef && process.env.SUPABASE_PROJECT_REF === prodRef && !(args.includes("--prod") && args.includes("--i-know"))) {
  console.error("This ref is production. Re-run with --prod --i-know if you really mean it.");
  process.exit(1);
}
const only = args.find((a) => !a.startsWith("--"));
const dir = join(process.cwd(), "supabase", "migrations");
const files = readdirSync(dir).filter((f) => f.endsWith(".sql") && (!only || f.startsWith(only))).sort();
if (!files.length) { console.error("no migration files matched"); process.exit(1); }

for (const f of files) {
  const sql = readFileSync(join(dir, f), "utf8");
  const t0 = Date.now();
  try {
    await runSql(sql, { label: f });
    console.log(`✓ ${f} (${Date.now() - t0} ms)`);
  } catch (e) {
    console.error(`✗ ${f}\n${e.message}`);
    process.exit(1);
  }
}
console.log(`${files.length} file(s) applied over HTTPS to ${process.env.SUPABASE_PROJECT_REF}`);
