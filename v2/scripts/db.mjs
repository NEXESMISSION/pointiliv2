/**
 * Apply v2/supabase/schema.sql to the Supabase project, over the Management
 * API (HTTPS), and make sure the API serves the v2 schema.
 *
 *   node scripts/db.mjs          (from v2/, reads .env.local)
 */
import { readFileSync } from "node:fs";
import { pathToFileURL } from "node:url";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const REF = process.env.SUPABASE_PROJECT_REF;
const TOKEN = process.env.SUPABASE_ACCESS_TOKEN;
if (!REF || !TOKEN) throw new Error("SUPABASE_PROJECT_REF / SUPABASE_ACCESS_TOKEN missing in v2/.env.local");

async function api(path, { method = "GET", body } = {}) {
  for (let attempt = 1; ; attempt++) {
    try {
      const res = await fetch(`https://api.supabase.com/v1/projects/${REF}${path}`, {
        method,
        headers: { Authorization: `Bearer ${TOKEN}`, "Content-Type": "application/json" },
        body: body ? JSON.stringify(body) : undefined,
      });
      const text = await res.text();
      if (!res.ok) throw new Error(`${method} ${path}: HTTP ${res.status} — ${text.slice(0, 600)}`);
      return text ? JSON.parse(text) : null;
    } catch (e) {
      if (attempt >= 3 || String(e.message).includes("HTTP 4")) throw e;
      await new Promise((r) => setTimeout(r, 2000 * attempt));
    }
  }
}

export const sql = (query) => api("/database/query", { method: "POST", body: { query } });

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = Date.now();
  await sql(readFileSync("supabase/schema.sql", "utf8"));
  console.log(`✓ schema.sql (${Date.now() - t0} ms)`);
  const rest = await api("/postgrest");
  const schemas = String(rest.db_schema || "public").split(",").map((s) => s.trim()).filter(Boolean);
  if (!schemas.includes("v2")) {
    await api("/postgrest", { method: "PATCH", body: { db_schema: [...schemas, "v2"].join(",") } });
    console.log(`✓ API now serves: ${[...schemas, "v2"].join(", ")}`);
  } else console.log(`✓ API serves v2 (${schemas.join(", ")})`);
}
