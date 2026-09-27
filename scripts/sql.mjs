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

/** A string as a SQL literal. */
export const sqlText = (s) => `'${String(s ?? "").replace(/'/g, "''")}'`;

/**
 * Run SQL as the founder — the first admin account — the way the console does:
 * the admin's identity on the session, then an admin_* function. Owners never
 * open a shop or take a plan themselves; scripts that need one come through here.
 * Returns the `r` column of the last statement.
 */
let founderId = null;
export async function asFounder(sql) {
  if (!founderId) {
    const rows = await runSql(`select id from public.profiles where role = 'admin' limit 1`);
    founderId = rows?.[0]?.id;
    if (!founderId) throw new Error("no admin account to act as the founder");
  }
  const out = await runSql(`select set_config('request.jwt.claims', '{"sub":"${founderId}","role":"authenticated"}', true); ${sql}`);
  return out?.[0]?.r;
}

/** Open a shop for an existing account, as the founder does from the console. */
export function openShop(ownerId, name, category = "cafe", ownerName = "") {
  return asFounder(`select public.admin_create_business(${sqlText(ownerId)}::uuid, ${sqlText(name)}, ${sqlText(category)}, ${sqlText(ownerName)}) as r`);
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
