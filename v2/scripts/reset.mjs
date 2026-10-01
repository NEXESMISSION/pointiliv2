/**
 * THE FULL RESET (2026-10-01, asked for by the founder): the first version's
 * tables, functions and triggers go, the test schema v2 goes, every account
 * goes except the founder's (the phones in ADMIN_PHONES), the old logo files
 * go. Then `node scripts/db.mjs` lays the new database into a clean public
 * schema. A backup of the old rows was written to the Desktop first.
 *
 *   node scripts/reset.mjs --yes
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sql, api } from "./db.mjs";

config({ path: ".env.local", quiet: true });
if (!process.argv.includes("--yes")) {
  console.log("This erases the database. Run with --yes to mean it.");
  process.exit(1);
}
const admins = String(process.env.ADMIN_PHONES ?? "")
  .split(",")
  .map((p) => p.replace(/\D/g, "").replace(/^216(?=\d{8}$)/, ""))
  .filter((p) => /^\d{8}$/.test(p));
if (admins.length === 0) throw new Error("ADMIN_PHONES is empty: refusing to delete every account");
const keep = admins.map((p) => `'216${p}@phone.pointidi.app'`).join(", ");

// 1. the schemas: the old one and the test one go, a clean public comes back
await sql(`
  drop schema if exists v2 cascade;
  drop schema if exists public cascade;
  create schema public;
  grant usage on schema public to anon, authenticated, service_role;
  grant all on schema public to postgres, service_role;
  alter default privileges in schema public revoke all on tables from anon, authenticated, public;
  alter default privileges in schema public revoke all on sequences from anon, authenticated, public;
  alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
  alter default privileges in schema public grant all on tables to service_role;
  alter default privileges in schema public grant all on sequences to service_role;
  alter default privileges in schema public grant execute on functions to service_role;
  comment on schema public is 'Pointili';
`);
console.log("✓ old schema and test schema dropped, public is clean");

// 2. the accounts: only the founder's phones stay
const before = (await sql("select count(*)::int as n from auth.users"))[0].n;
await sql(`delete from auth.users where coalesce(email, '') not in (${keep})`);
const after = (await sql("select count(*)::int as n from auth.users"))[0].n;
console.log(`✓ accounts: ${before} → ${after} (kept the ${admins.length} admin phones that exist)`);

// 3. the old logo files and their bucket
const storage = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } }).storage;
const { data: buckets } = await storage.listBuckets();
for (const b of buckets ?? []) {
  const { error } = await storage.emptyBucket(b.id);
  if (error) console.log(`  ! empty ${b.id}: ${error.message}`);
  const { error: e2 } = await storage.deleteBucket(b.id);
  console.log(e2 ? `  ! delete ${b.id}: ${e2.message}` : `✓ storage bucket "${b.id}" emptied and removed`);
}

// 4. the API serves the public schema only
const rest = await api("/postgrest");
const schemas = String(rest.db_schema || "public").split(",").map((s) => s.trim()).filter((s) => s && s !== "v2");
await api("/postgrest", { method: "PATCH", body: { db_schema: schemas.join(",") } });
console.log(`✓ API serves: ${schemas.join(", ")}`);
console.log("\nNow: node scripts/db.mjs");
