/**
 * A golden ticket to look at, on a computer trying the branch: a shop with the golden ticket on, a
 * draw already drawn (Amira won), a new one waiting with its countdown, two customers with tickets,
 * and a founder's account — all robots. `make` writes who is who (numbers and passwords) to the file
 * given; `clean` removes every account it made. DEMO_SOON=12: the draw waiting is drawn in 12 minutes
 * (10 at the least), to watch it happen.
 *
 *   node scripts/draw-demo.mjs make  <state.json>
 *   node scripts/draw-demo.mjs clean <state.json>
 */
import { randomBytes } from "node:crypto";
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sql } from "./db.mjs";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const [mode, file] = process.argv.slice(2);
if (!file || !["make", "clean"].includes(mode)) throw new Error("usage: draw-demo.mjs make|clean <state.json>");

if (mode === "clean") {
  const st = JSON.parse(readFileSync(file, "utf8"));
  for (const p of st.people) await admin.from("shops").delete().eq("owner_id", p.id);
  for (const p of st.people) await admin.auth.admin.deleteUser(p.id);
  await unrobot(admin, st.people.map((p) => p.digits));
  console.log(`removed ${st.people.length} accounts`);
  process.exit(0);
}

const people = [];
const save = () => writeFileSync(file, JSON.stringify({ people }, null, 2));
async function person(name, role) {
  const digits = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  const password = randomBytes(9).toString("base64url");
  const email = `216${digits}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${digits}` } });
  if (error) throw error;
  people.push({ id: data.user.id, digits, password, name, role });
  save();
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  await client.rpc("me");
  await client.rpc("set_name", { p_name: name });
  // every one-time note seen: the screens as they are every day
  for (const k of ["coach", "logo_tip", "card_hello", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"]) await client.rpc("see", { p_key: k });
  return { id: data.user.id, client };
}
const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
};
const tampon = async (owner, c) => rpc(c, "stamp", { p_token: (await rpc(owner, "new_code")).token });
const later = (h) => new Date(Date.now() + h * 3600_000).toISOString();

const owner = await person("Karim", "owner");
await rpc(owner, "open_shop", { p_name: "Café El Wafa", p_kind: "cafe" });
await rpc(owner, "save_card", { p_goal: 8, p_gift: "قهوة بلاش", p_color: "#6c47ff", p_gap: 0 });
const shop = (await rpc(owner, "me")).shop;
await admin.from("shops").update({ draw_allowed: true }).eq("id", shop.id);
const amira = await person("Amira", "customer");
const yassine = await person("Yassine", "customer");
const boss = await person("Founder Demo", "admin");
await admin.from("people").update({ is_admin: true }).eq("id", boss.id);

// the draw already done: Amira alone in it, so she won
const d1 = await rpc(owner, "draw_new", { p_title: "سحب الويكاند", p_at: later(1), p_rule: "stamps", p_gifts: [{ name: "قهوة بلاش لمدّة جمعة", n: 1 }] });
for (let i = 0; i < 2; i++) await tampon(owner, amira);
await sql(`update public.draws set draw_at = greatest(now(), starts_at + interval '1 millisecond') where id = '${d1.id}'`);
await rpc(owner, "my_draw");
// the one waiting: two days away, two gifts
const soon = Number(process.env.DEMO_SOON) >= 10 ? Number(process.env.DEMO_SOON) / 60 : 49.3;
await rpc(owner, "draw_new", { p_title: "التذكرة الذهبية متاع نوفمبر", p_at: later(soon), p_rule: "stamps", p_gifts: [{ name: "كاس عصير + كرواسون", n: 1 }, { name: "قهوة بلاش", n: 3 }] });
for (let i = 0; i < 3; i++) await tampon(owner, amira);
await tampon(owner, yassine);
const card = (await rpc(amira, "wallet")).find((c) => c.shop.id === shop.id).id;
people.find((p) => p.name === "Amira").card = card;
people.find((p) => p.role === "owner").shop = shop.id;
save();
console.log(`made ${people.length} accounts; shop ${shop.id}; Amira's card ${card}`);
