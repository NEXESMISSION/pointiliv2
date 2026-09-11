/**
 * Run SQL over Supabase's Management API (HTTPS). The Postgres pooler port does
 * not always answer from every network; this road works wherever the dashboard does.
 *
 *   node scripts/sql.mjs "select now()"
 *   node scripts/sql.mjs --file some.sql
 *   import { runSql, management } from "./sql.mjs"
 *
 * Needs SUPABASE_PROJECT_REF and SUPABASE_ACCESS_TOKEN in .env.local.
 */
import { readFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });

const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;

export async function management(path, { method = "GET", body } = {}) {
  if (!REF || !TOKEN) throw new Error("SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN missing in .env.local");
  const res = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
    method,
    headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
    body: body ? JSON.stringify(body) : undefined,
  });
  const text = await res.text();
  if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} — ${text.slice(0, 800)}`);
  try {
    return JSON.parse(text);
  } catch {
    return text;
  }
}

export function runSql(query) {
  return management("/database/query", { method: "POST", body: { query } });
}

if ((process.argv[1] || "").endsWith("sql.mjs")) {
  const args = process.argv.slice(2);
  const query = args[0] === "--file" ? readFileSync(args[1], "utf8") : args.join(" ");
  if (!query.trim()) {
    console.error("usage: node scripts/sql.mjs <sql> | --file <path>");
    process.exit(2);
  }
  const out = await runSql(query);
  console.log(typeof out === "string" ? out : JSON.stringify(out, null, 1));
}
