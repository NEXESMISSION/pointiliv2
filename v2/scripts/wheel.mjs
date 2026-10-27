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

  // since 18 Oct 2026 a shop is allowed the wheel from the day it opens (shops.wheel_allowed's own
  // default, schema.sql): what stops an owner here is the prizes, not permission
  check("a shop is allowed the wheel from the day it opens", (await rpc(owner, "me")).shop.wheel_allowed === true);
  check("  → and what stops it is the prizes, not permission", (await rpc(owner, "set_wheel", { p_on: true })).error === "no_prizes");
  check("nor use the founder's switch", !!(await rpc(owner, "admin_set_wheel", { p_id: shopId, p_on: true })).error);
  check("the founder's switch says the same", (await rpc(boss, "admin_set_wheel", { p_id: shopId, p_on: true })).ok);
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

  // since 27 Oct 2026: how many of each prize the owner has to give
  console.log("\nA number per prize: how many of it the owner has to give");
  const mine = async () => (await rpc(owner, "my_wheel"))?.prizes ?? [];
  const [pz, ko] = await mine();
  check("a prize with no number has no limit", pz?.stock === null && ko?.stock === null, [pz, ko]);
  check("one prize at least keeps no limit, or the wheel would run dry", (await rpc(owner, "wheel_save", { p_prizes: [{ id: pz.id, name: "بيتزا", chance: 99, stock: 2 }, { id: ko.id, name: "كوكا", chance: 1, stock: 5 }] })).error === "need_open");
  const saved = await rpc(owner, "wheel_save", { p_prizes: [{ id: pz.id, name: "بيتزا", chance: 99, stock: 2 }, { id: ko.id, name: "كوكا", chance: 1, stock: null }] });
  check("two pizzas to give, the cola with no limit", saved?.ok && saved.prizes?.[0]?.stock === 2 && saved.prizes?.[1]?.stock === null, saved);
  const kept = await rpc(owner, "wheel_save", { p_prizes: [{ id: pz.id, name: "بيتزا", chance: 99 }, { id: ko.id, name: "كوكا", chance: 1 }] });
  check("saved again without numbers (the card's own question), the numbers stay", kept?.prizes?.[0]?.stock === 2, kept);
  check("on again", (await rpc(owner, "set_wheel", { p_on: true })).ok);
  // four turns: the one still waiting and three more
  await give(9);
  const fell = [];
  for (let i = 0; i < 4; i++) {
    c = await view();
    if (!c?.spin) break;
    fell.push((await rpc(sami, "spin", { p_moment: c.spin }))?.prize);
  }
  let left = (await mine())[0]?.stock;
  const pizzas = fell.filter((x) => x === "بيتزا").length;
  check("four turns spun", fell.length === 4, fell);
  check("each pizza that fell took one off, never below zero", pizzas + left === 2 && left >= 0, { fell, left });
  check("  → both pizzas went (99% each), then only cola", pizzas === 2 && left === 0, { fell, left });
  c = await view();
  check("a prize run out is off the customer's wheel", (c?.prizes ?? []).map((p) => p.name).join() === "كوكا", c?.prizes);
  check("…and still on the owner's, at 0, to fill again", (await mine())[0]?.stock === 0);
  // the last pizza, wanted by two turns at the very same moment: one of them at most gets it
  check("filled again: one pizza", (await rpc(owner, "wheel_save", { p_prizes: [{ id: pz.id, name: "بيتزا", chance: 99, stock: 1 }, { id: ko.id, name: "كوكا", chance: 1 }] }))?.ok);
  c = await view();
  check("  → back on the customer's wheel", (c?.prizes ?? []).length === 2, c?.prizes);
  await give(6);
  const { data: waiting } = await admin.from("moments").select("id").eq("shop_id", shopId).eq("wheel", true).is("spun_at", null).order("id");
  const both = await Promise.all((waiting ?? []).slice(0, 2).map((m) => rpc(sami, "spin", { p_moment: m.id })));
  left = (await mine())[0]?.stock;
  const got = both.filter((r) => r?.prize === "بيتزا").length;
  check("two turns at once for the last pizza: it goes once, never twice", both.length === 2 && both.every((r) => r?.ok) && got + left === 1 && got <= 1, { both: both.map((r) => r?.prize ?? r), left });
  // (the pizza gone, one prize is left that can fall: a wheel of one is no wheel)
  if (left === 0) check("the owner cannot turn it on with one prize left to fall", (await rpc(owner, "set_wheel", { p_on: false })).ok && (await rpc(owner, "set_wheel", { p_on: true })).error === "no_prizes");

  check("the founder takes it away", (await rpc(boss, "admin_set_wheel", { p_id: shopId, p_on: false })).ok);
  const me2 = (await rpc(owner, "me")).shop;
  check("taken away: not allowed, and off", me2.wheel_allowed === false && me2.wheel_on === false, me2);
  // and a shop that HAS customers cannot grant itself the wheel back: only the founder
  check("the owner cannot turn it back on, customers being on their way", (await rpc(owner, "set_wheel", { p_on: true })).error === "not_allowed");
  check("  → still not allowed, nothing granted behind the founder's back", (await rpc(owner, "me")).shop.wheel_allowed === false);
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
