/**
 * Run SQL against the project over Supabase's Management API (HTTPS), not port 5432.
 *
 * Why this exists: from some networks the pooler's TCP ports (5432/6543) never
 * answer — the first day on this project every psql attempt timed out while the
 * dashboard worked fine. api.supabase.com/v1/projects/<ref>/database/query is
 * plain HTTPS and runs the same statements as the SQL editor, so migrations and
 * checks stay possible anywhere the dashboard is. Vercel reaches the pooler
 * directly; this is the developer's road, not the app's.
 *
 *   node scripts/sql-http.mjs "select now()"
 *   node scripts/sql-http.mjs --file supabase/migrations/0001_tables.sql
 *   import { runSql } from "./sql-http.mjs"
 *
 * Needs SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN in .env.local.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

export async function runSql(query, { label = "sql" } = {}) {
  if (!REF || !TOKEN) throw new Error("SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN missing in .env.local");
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}/database/query`, {
    method: "POST",
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: JSON.stringify({ query }),
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${label}: HTTP ${res.status} — ${text.slice(0, 600)}`);
  try { return JSON.parse(text); } catch { return text; }
}

if ((process.argv[1] || "").endsWith("sql-http.mjs")) {
  const args = process.argv.slice(2);
  const query = args[0] === "--file" ? readFileSync(args[1], "utf8") : args.join(" ");
  if (!query.trim()) { console.error("usage: node scripts/sql-http.mjs <sql> | --file <path>"); process.exit(2); }
  const out = await runSql(query, { label: args[0] === "--file" ? args[1] : "inline" });
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 1));
}
