/**
 * Pointili with the packs, to look at on this computer (localbase/ only — it refuses any other database):
 *   · «Café El Wafa», on Pointili Pro — its golden ticket (a draw done: Amira won; one waiting), a staff
 *     phone (Yassine), customers on their way;
 *   · «Nova Market», opened now — on Pointili;
 *   · «Old Bakery», a shop that was open before the packs — «old», on the roulette, exactly as today.
 * Who is who (numbers and passwords, this computer's only) goes to the file given.
 *
 *   node scripts/packs-demo.mjs <logins.txt>      (from v2/, with localbase running)
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sql } from "./db.mjs";

config({ path: ".env.local", quiet: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_ ?? "")) throw new Error(`packs-demo.mjs runs on this computer's database only (localbase/), not ${URL_}`);
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const out = process.argv[2];
if (!out) throw new Error("usage: node scripts/packs-demo.mjs <logins.txt>");

const lines = [];
async function person(name, phone, role) {
  const password = randomBytes(6).toString("base64url");
  const email = `216${phone}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${phone}` } });
  if (error) throw error;
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  await client.rpc("me");
  await client.rpc("set_name", { p_name: name });
  // the screens as they are every day: the one-time notes seen
  for (const k of ["coach", "logo_tip", "card_hello", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"]) await client.rpc("see", { p_key: k });
  lines.push(`${role.padEnd(30)} ${phone}   ${password}`);
  return { id: data.user.id, client };
}
const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
};
const tampon = async (owner, c) => rpc(c, "stamp", { p_token: (await rpc(owner, "new_code")).token });
const later = (h) => new Date(Date.now() + h * 3600_000).toISOString();

const boss = await person("Founder Demo", "20000002", "founder (admin)");
await admin.from("people").update({ is_admin: true }).eq("id", boss.id);

// the Pro café
const karim = await person("Karim", "20000010", "owner · Café El Wafa (Pro)");
await rpc(karim, "open_shop", { p_name: "Café El Wafa", p_kind: "cafe" });
await rpc(karim, "save_card", { p_goal: 8, p_gift: "قهوة بلاش", p_color: "#6c47ff", p_gap: 0 });
const wafa = (await rpc(karim, "me")).shop;
await rpc(boss, "admin_set_pack", { p_id: wafa.id, p_pack: "pro" });
// the new Pointili shop
const nour = await person("Nour", "20000020", "owner · Nova Market (Pointili)");
await rpc(nour, "open_shop", { p_name: "Nova Market", p_kind: "grocery" });
await rpc(nour, "save_card", { p_goal: 10, p_gift: "خبزة بلاش", p_color: "#0e9f6e", p_gap: 0 });
// the old shop, on the roulette, as a shop open before the packs
const hedi = await person("Hedi", "20000030", "owner · Old Bakery (old)");
await rpc(hedi, "open_shop", { p_name: "Old Bakery", p_kind: "bakery" });
await rpc(hedi, "save_card", { p_goal: 6, p_gift: "الروليت", p_color: "#e11d48", p_gap: 0 });
await rpc(hedi, "wheel_save", { p_prizes: [{ name: "كرواسون", chance: 50 }, { name: "خبزة", chance: 30 }, { name: "كيك", chance: 20 }] });
await rpc(hedi, "set_wheel", { p_on: true });
const bakery = (await rpc(hedi, "me")).shop;
await sql(`update public.shops set pack = 'old' where id = '${bakery.id}'`);

// customers
const amira = await person("Amira", "20000040", "customer · Amira");
const sami = await person("Sami", "20000050", "customer · Sami");
const yassine = await person("Yassine", "20000060", "staff phone · Yassine (Café El Wafa)");

// the golden ticket at the café: a draw done (Amira alone in it: she won), then one waiting
const d1 = await rpc(karim, "draw_new", { p_title: "سحب الويكاند", p_at: later(1), p_rule: "stamps", p_gifts: [{ name: "قهوة بلاش لمدّة جمعة", n: 1 }] });
for (let i = 0; i < 2; i++) await tampon(karim, amira);
await sql(`update public.draws set draw_at = greatest(now(), starts_at + interval '1 millisecond') where id = '${d1.id}'`);
await rpc(karim, "my_draw");
await rpc(karim, "draw_new", { p_title: "التذكرة الذهبية متاع نوفمبر", p_at: later(49), p_rule: "stamps", p_gifts: [{ name: "كاس عصير + كرواسون", n: 1 }, { name: "قهوة بلاش", n: 3 }] });
for (let i = 0; i < 3; i++) await tampon(karim, amira);
await tampon(karim, sami);
// Yassine, the café's staff phone
await rpc(yassine, "staff_join", { p_token: (await rpc(karim, "staff_invite")).token });
// at the others
for (let i = 0; i < 3; i++) await tampon(nour, amira);
for (let i = 0; i < 3; i++) await tampon(hedi, sami);

writeFileSync(out, `Pointili on this computer (localbase) — the demo's accounts. Sign in with the number and the password.\n\n${lines.join("\n")}\n`);
console.log(lines.join("\n"));
