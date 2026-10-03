/**
 * Lay supabase/schema.sql into the database (re-runnable), over the
 * Management API, then make the founder's phones (ADMIN_PHONES) admins.
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

export async function api(path, { method = "GET", body } = {}) {
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

/** The «logos» box: public to read (a logo shows on every customer's card), written by the server only; small WebP only. */
async function logosBucket() {
  const url = `${process.env.NEXT_PUBLIC_SUPABASE_URL}/storage/v1/bucket`;
  const headers = { apikey: process.env.SUPABASE_SERVICE_ROLE_KEY, Authorization: `Bearer ${process.env.SUPABASE_SERVICE_ROLE_KEY}`, "Content-Type": "application/json" };
  const shape = { public: true, file_size_limit: 524288, allowed_mime_types: ["image/webp"] };
  const have = await fetch(`${url}/logos`, { headers });
  const res = have.ok
    ? await fetch(`${url}/logos`, { method: "PUT", headers, body: JSON.stringify(shape) })
    : await fetch(url, { method: "POST", headers, body: JSON.stringify({ id: "logos", name: "logos", ...shape }) });
  if (!res.ok) throw new Error(`logos bucket: HTTP ${res.status} — ${(await res.text()).slice(0, 300)}`);
  console.log(`✓ logos bucket (${have.ok ? "kept" : "made"})`);
}

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = Date.now();
  await sql(readFileSync("supabase/schema.sql", "utf8"));
  console.log(`✓ schema.sql (${Date.now() - t0} ms)`);
  await logosBucket();

  const phones = String(process.env.ADMIN_PHONES ?? "")
    .split(",")
    .map((p) => p.replace(/\D/g, "").replace(/^216(?=\d{8}$)/, ""))
    .filter((p) => /^\d{8}$/.test(p));
  if (phones.length) {
    const emails = phones.map((p) => `'216${p}@phone.pointidi.app'`).join(", ");
    const rows = await sql(`
      insert into public.people (id, phone, is_admin)
      select u.id, '+' || split_part(u.email, '@', 1), true from auth.users u where u.email in (${emails})
      on conflict (id) do update set is_admin = true
      returning id`);
    console.log(`✓ admins: ${rows.length} of ${phones.length} phones have an account`);
  }
}
