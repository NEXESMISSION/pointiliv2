/**
 * SQL files laid onto this computer's database while it runs (what db.mjs does for the live one):
 *   node apply.mjs ../v2/supabase/packs-2026-11-09.sql [more files…]
 */
import { readFileSync } from "node:fs";
import { SERVICE_KEY } from "./keys.mjs";

const URL_ = `http://127.0.0.1:${process.env.LOCALBASE_PORT || 54321}/local/sql`;
for (const f of process.argv.slice(2)) {
  const t0 = Date.now();
  const res = await fetch(URL_, { method: "POST", headers: { Authorization: `Bearer ${SERVICE_KEY}`, "Content-Type": "application/json" }, body: JSON.stringify({ query: readFileSync(f, "utf8") }) });
  const text = await res.text();
  if (!res.ok) {
    console.error(`✗ ${f}: ${text.slice(0, 800)}`);
    process.exit(1);
  }
  console.log(`✓ ${f} (${Date.now() - t0} ms)`);
}
