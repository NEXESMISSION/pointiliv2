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

/**
 * What the founder and the owners set by hand, shop by shop: the switches and
 * the subscription. Applying the schema must never change any of it — on
 * 15 Oct 2026 a forgotten line in it turned every «شنوّة يبيع» off, and a
 * perfume shop's counter stopped asking which perfume. So: read before,
 * read after, and anything that moved is put back and said loudly.
 */
const KEPT = ["items_on", "store_on", "wheel_on", "paused", "paid_until", "trial_days", "trial_first"];
const keptNow = async () => new Map((await sql(`select id, name, ${KEPT.join(", ")} from public.shops`)).map((r) => [r.id, r]));
const lit = (v) => (v === null ? "null" : typeof v === "boolean" || typeof v === "number" ? String(v) : `'${String(v).replace(/'/g, "''")}'`);

if (import.meta.url === pathToFileURL(process.argv[1]).href) {
  const t0 = Date.now();
  // trial_first is new on 14 Oct: on a database from before it, the snapshot simply goes without it
  const before = await keptNow().catch(async () => new Map((await sql("select id, name, items_on, store_on, wheel_on, paused, paid_until, trial_days from public.shops")).map((r) => [r.id, r])));
  await sql(readFileSync(process.env.SCHEMA || "supabase/schema.sql", "utf8"));
  const after = await keptNow();
  const moved = [];
  for (const [id, was] of before) {
    const now = after.get(id);
    if (!now) continue;
    const fields = KEPT.filter((k) => k in was && String(was[k]) !== String(now[k]));
    if (fields.length) moved.push({ id, name: was.name, fields, was });
  }
  for (const m of moved) await sql(`update public.shops set ${m.fields.map((k) => `${k} = ${lit(m.was[k])}`).join(", ")} where id = '${m.id}'`);
  if (moved.length) {
    console.log(`\n!!! schema.sql changed what the founder and the owners set, in ${moved.length} shop(s) — put back as it was:`);
    for (const m of moved) console.log(`    ${m.name}: ${m.fields.join(", ")}`);
    console.log("!!! find the top-level UPDATE in schema.sql that did it and remove it\n");
  }
  // a brand-new function is in the database but not yet in the API's own list
  // of what it will serve: without this, the app gets a 404 from it for a while
  await sql("select pg_notify('pgrst', 'reload schema')");
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
