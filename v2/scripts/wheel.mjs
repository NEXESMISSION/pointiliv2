/**
 * The wheel's two switches (since 17 Oct 2026), against the real database:
 * the founder allows a shop the wheel, its owner turns it on for his
 * customers (with two prizes at least), a full card is then a turn («دورة»)
 * — several wait side by side — and off again, a full card is the card's
 * gift while the turns already won can still be spun. Its own throwaway
 * accounts, on the robots list first, removed at the end.
 *
 *   node scripts/wheel.mjs          (from v2/)
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) passed++, console.log(`  ✓ ${name}`);
  else failed.push(name), console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
};
const users = [];
const phones = [];
async function person(name) {
  const digits = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(digits);
  const password = randomBytes(12).toString("base64url");
  const email = `216${digits}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${digits}` } });
  if (error) throw error;
  users.push(data.user.id);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  await client.rpc("set_name", { p_name: name });
  return { id: data.user.id, client };
}
const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  return error ? { error: error.message } : data;
};

let shopId = null;
try {
  console.log("\nThe wheel: allowed by the founder, turned on by the owner");
  const boss = await person("Boss");
  await admin.from("people").update({ is_admin: true }).eq("id", boss.id);
  const owner = await person("Owner");
  const sami = await person("Sami");
  await rpc(owner, "open_shop", { p_name: "Wheel Test", p_kind: "pizza" });
  await rpc(owner, "save_card", { p_goal: 3, p_gift: "بيتزا بلاش", p_color: "#D7141A" });
  shopId = (await rpc(owner, "me")).shop.id;
  // tampons one after another, for the test: no wait between two
  await admin.from("shops").update({ stamp_gap: 0 }).eq("id", shopId);
  const code = (await rpc(sami, "me")).code;
  const give = async (n) => {
    for (let i = 0; i < n; i++) await rpc(owner, "give_stamp", { p_who: code });
  };
  const view = async () => {
    const w = await rpc(sami, "wallet");
    const c = (w?.cards ?? w ?? []).find?.((x) => x.shop?.id === shopId);
    return c ? await rpc(sami, "card", { p_id: c.id }) : null;
  };

  check("an owner cannot turn the wheel on before the founder allows it", (await rpc(owner, "set_wheel", { p_on: true })).error === "not_allowed");
  check("nor use the founder's switch", !!(await rpc(owner, "admin_set_wheel", { p_id: shopId, p_on: true })).error);
  check("the founder allows it", (await rpc(boss, "admin_set_wheel", { p_id: shopId, p_on: true })).ok);
  const me1 = (await rpc(owner, "me")).shop;
  check("allowed, and still off: the owner's choice", me1.wheel_allowed === true && me1.wheel_on === false, me1);
  check("not on without prizes", (await rpc(owner, "set_wheel", { p_on: true })).error === "no_prizes");
  check("the prizes are written while it is off", (await rpc(owner, "wheel_save", { p_prizes: [{ name: "بيتزا", chance: 50 }, { name: "كوكا", chance: 50 }] })).ok);
  check("the owner turns it on", (await rpc(owner, "set_wheel", { p_on: true })).ok && (await rpc(owner, "me")).shop.wheel_on === true);

  await give(3);
  let c = await view();
  check("a full card is a turn («دورة»), the card back at zero", c?.spins_n === 1 && !!c?.spin && c?.stamps === 0, c && { spins_n: c.spins_n, spin: c.spin, stamps: c.stamps });
  await give(3);
  c = await view();
  check("turns wait side by side", c?.spins_n === 2, c?.spins_n);

  check("the owner turns it off", (await rpc(owner, "set_wheel", { p_on: false })).ok && (await rpc(owner, "me")).shop.wheel_on === false);
  c = await view();
  check("off, the turns won are still there, with the prizes to spin them", c?.spins_n === 2 && (c?.prizes ?? []).length === 2, c && { spins_n: c.spins_n, prizes: c.prizes });
  const spun = await rpc(sami, "spin", { p_moment: c.spin });
  check("…and one can be spun", spun?.ok === true && ["بيتزا", "كوكا"].includes(spun.prize), spun);
  await give(3);
  const { data: last } = await admin.from("moments").select("wheel, gift").eq("shop_id", shopId).eq("kind", "gift").order("id", { ascending: false }).limit(1).single();
  check("off, a full card is the card's own gift again", last?.wheel === false && last?.gift === "بيتزا بلاش", last);
  c = await view();
  check("one turn left to spin, beside the gift", c?.spins_n === 1, c?.spins_n);

  check("the founder takes it away", (await rpc(boss, "admin_set_wheel", { p_id: shopId, p_on: false })).ok);
  const me2 = (await rpc(owner, "me")).shop;
  check("taken away: not allowed, and off", me2.wheel_allowed === false && me2.wheel_on === false, me2);
  check("the owner cannot turn it back on", (await rpc(owner, "set_wheel", { p_on: true })).error === "not_allowed");
} catch (e) {
  failed.push(String(e?.message ?? e));
  console.log("  ✗", e);
} finally {
  if (shopId) await admin.from("shops").delete().eq("id", shopId);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed`);
  if (failed.length) process.exit(1);
}
