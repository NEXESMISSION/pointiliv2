/**
 * The packs (supabase/packs-2026-11-09.sql): a shop opened now starts on Pointili, a shop already open is
 * «old» and nothing moves it but the founder; the founder's pack sets the switches all at once (said
 * before, refused when the shop is on the store); the owner's own store switch with what it does to the
 * customers (the promise kept: points become tampons, full cards become gifts at once); a payment for a
 * pack, and the founder's word that sets it; staff phones — invited by a link, giving tampons for the
 * shop and nothing else, signed out by the owner or by the pack going down.
 *
 * Its own throwaway accounts, robots, removed at the end. Meant for the database on this computer
 * (localbase/): it refuses to run against any other.
 *
 *   node scripts/packs.mjs          (from v2/)
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sql } from "./db.mjs";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
if (!/^http:\/\/(127\.0\.0\.1|localhost)(:\d+)?$/.test(URL_ ?? "")) throw new Error(`packs.mjs runs on this computer's database only (localbase/), not ${URL_}`);
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
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  await client.rpc("me");
  await client.rpc("set_name", { p_name: name });
  return { id: data.user.id, client, digits };
}
const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  return error ? { error: error.message } : data;
};
const tampon = async (owner, customer) => rpc(customer, "stamp", { p_token: (await rpc(owner, "new_code")).token });
const shopOf = async (id) => (await sql(`select pack, wheel_allowed, links_allowed, draw_allowed, store_allowed, export_allowed, staff_max, store_on, wheel_on, items_on from public.shops where id = '${id}'`))[0];

try {
  console.log("\nA shop opened now, and a shop that was already open");
  const boss = await person("Pack Boss");
  await admin.from("people").update({ is_admin: true }).eq("id", boss.id);
  const nova = await person("New Owner");
  await rpc(nova, "open_shop", { p_name: "Nova Café", p_kind: "cafe" });
  await rpc(nova, "save_card", { p_goal: 5, p_gift: "قهوة بلاش", p_color: "#6c47ff", p_gap: 0 });
  const novaShop = (await rpc(nova, "me")).shop;
  check("a shop opened from now on starts on Pointili", (await shopOf(novaShop.id)).pack === "base");
  const old = await person("Old Owner");
  await rpc(old, "open_shop", { p_name: "Old Bakery", p_kind: "bakery" });
  await rpc(old, "save_card", { p_goal: 8, p_gift: "خبزة بلاش", p_color: "#e11d48", p_gap: 0 });
  const oldShop = (await rpc(old, "me")).shop;
  // a shop already open the day the packs came: old, its export on by the founder's hand, its link and wheel as they were
  await sql(`update public.shops set pack = 'old', export_allowed = true, wheel_allowed = false where id = '${oldShop.id}'`);
  const oldBefore = await shopOf(oldShop.id);
  check("…the old shop says so to its owner", (await rpc(old, "my_systems")).pack === "old");
  check("an owner cannot choose a pack", !!(await rpc(nova, "admin_set_pack", { p_id: novaShop.id, p_pack: "pro" })).error);

  console.log("\nThe founder moves a shop");
  const prev = await rpc(boss, "admin_pack_preview", { p_id: oldShop.id, p_pack: "base" });
  check("before moving the old shop to Pointili, what it changes: the wheel allowed, the export taken away", prev.ok && prev.changes.includes("wheel_on") && prev.changes.includes("export_off") && !prev.blocked, prev);
  check("'old' changes nothing", (await rpc(boss, "admin_pack_preview", { p_id: oldShop.id, p_pack: "old" })).changes.length === 0);
  check("a pack that does not exist is refused", (await rpc(boss, "admin_set_pack", { p_id: novaShop.id, p_pack: "gold" })).error === "invalid");
  check("Nova to Pro", (await rpc(boss, "admin_set_pack", { p_id: novaShop.id, p_pack: "pro" })).ok);
  const pro = await shopOf(novaShop.id);
  check("…the golden ticket, the store as a choice, the file, 3 staff phones — all on", pro.pack === "pro" && pro.draw_allowed && pro.store_allowed && pro.export_allowed && pro.staff_max === 3 && pro.links_allowed && pro.wheel_allowed, pro);
  check("…and its owner's screens know it", (await rpc(nova, "my_systems")).pack === "pro" && (await rpc(nova, "my_systems")).staff_max === 3);
  check("the old shop named 'old' again: only the name, every switch where it was", (await rpc(boss, "admin_set_pack", { p_id: oldShop.id, p_pack: "old" })).ok
    && JSON.stringify(await shopOf(oldShop.id)) === JSON.stringify(oldBefore), await shopOf(oldShop.id));

  console.log("\nThe store, as the owner's own choice (Pro)");
  const amira = await person("Amira");
  const sami = await person("Sami");
  for (let i = 0; i < 3; i++) await tampon(nova, amira);
  check("Pointili refuses the store", (await rpc(old, "set_store", { p_on: true })).error === "not_allowed");
  const toStore = await rpc(nova, "store_preview");
  check("before the store: 1 customer, 3 tampons that become 3 points", toStore.to === "store" && toStore.customers === 1 && toStore.points === 3 && toStore.allowed === true, toStore);
  check("to the store", (await rpc(nova, "set_store", { p_on: true })).ok && (await shopOf(novaShop.id)).store_on === true);
  for (let i = 0; i < 9; i++) await tampon(nova, amira);
  for (let i = 0; i < 4; i++) await tampon(nova, sami);
  const amiraCard = (await rpc(amira, "wallet")).find((c) => c.shop.id === novaShop.id);
  check("on the store a full card is no gift: Amira keeps 12 points", amiraCard.stamps === 12 && !amiraCard.ready, { stamps: amiraCard.stamps, ready: amiraCard.ready });
  const toCard = await rpc(nova, "store_preview");
  check("before going back to the card (5 a gift): 2 customers, 1 past a full card, 2 gifts at once", toCard.to === "card" && toCard.customers === 2 && toCard.over === 1 && toCard.gifts === 2, toCard);
  check("a shop on the store cannot go down to Pointili before it leaves the store", (await rpc(boss, "admin_set_pack", { p_id: novaShop.id, p_pack: "base" })).error === "store_on");
  const back = await rpc(nova, "set_store", { p_on: false });
  check("back to the card: the 2 gifts written now", back.ok && back.gifts === 2, back);
  const after = (await rpc(amira, "wallet")).find((c) => c.shop.id === novaShop.id);
  check("…Amira: 2 gifts waiting, 2 tampons on her new card — nothing lost", after.waiting_n === 2 && after.stamps === 2, { waiting_n: after.waiting_n, stamps: after.stamps });
  const samiAfter = (await rpc(sami, "wallet")).find((c) => c.shop.id === novaShop.id);
  check("…Sami: his 4 tampons on the card, no gift yet", samiAfter.stamps === 4 && !samiAfter.ready, { stamps: samiAfter.stamps });

  console.log("\nPaying for a pack");
  check("an old shop pays as it always did: the pack's way refuses it", (await rpc(old, "pay_request_pack", { p_pack: "pro", p_method: "d17", p_months: 12 })).error === "old");
  const plain = await person("Plain Owner");
  await rpc(plain, "open_shop", { p_name: "Plain Shop", p_kind: "grocery" });
  await rpc(plain, "save_card", { p_goal: 6, p_gift: "x x", p_color: "#0e9f6e" });
  const plainShop = (await rpc(plain, "me")).shop;
  // its first customer: the trial's clock starts, and with it the offer's 3 days (offer_end, as for pay_request)
  await tampon(plain, sami);
  check("a price that is not on the list is refused", (await rpc(plain, "pay_request_pack", { p_pack: "pro", p_method: "d17", p_months: 3 })).error === "invalid");
  const ask = await rpc(plain, "pay_request_pack", { p_pack: "pro", p_method: "d17", p_months: 12 });
  check("Pro for a year: 300, and the 2 months of the trial's first days", ask.ok && ask.amount === 300 && ask.months === 14 && ask.pack === "pro", ask);
  const base6 = await rpc(plain, "pay_request_pack", { p_pack: "base", p_method: "d17", p_months: 6 });
  check("changed to Pointili for six months: 120, the same payment asked (one at a time)", base6.ok && base6.amount === 120 && base6.id === ask.id, base6);
  await rpc(plain, "pay_request_pack", { p_pack: "pro", p_method: "virement", p_months: 1 });
  check("…and to Pro for a month: 55", (await sql(`select amount, pack from public.payments where id = '${ask.id}'`))[0].amount === 55);
  check("the founder sees which pack each payment asks", (await rpc(boss, "admin_payment_packs"))[ask.id] === "pro");
  check("the owner's screens see it waiting", (await rpc(plain, "my_systems")).pending_pack === "pro");
  const decided = await rpc(boss, "admin_payment_decide_pack", { p_id: ask.id, p_paid: true });
  check("the founder says it is paid: the month runs and the shop is on Pro", decided.ok && decided.pack?.pack === "pro" && (await shopOf(plainShop.id)).pack === "pro", decided);
  check("a payment of before the packs is decided exactly as before (no pack touched)", (await (async () => {
    const r = await rpc(old, "pay_request", { p_method: "d17", p_months: 12 });
    const d = await rpc(boss, "admin_payment_decide_pack", { p_id: r.id, p_paid: true });
    return d.ok && !d.pack && (await shopOf(oldShop.id)).pack === "old";
  })()));

  console.log("\nStaff phones (Pro)");
  check("Pointili has no staff phones", (await rpc(old, "staff_invite")).error === "not_allowed");
  const inv = await rpc(nova, "staff_invite");
  check("the owner makes an invite: one link", inv.ok && /^[A-Za-z0-9_-]{32}$/.test(inv.token), inv);
  const yassine = await person("Yassine Staff");
  check("a person not signed in cannot use it", !!(await createClient(URL_, ANON, { auth: { persistSession: false } }).rpc("staff_join", { p_token: inv.token })).error);
  check("an owner of another shop cannot be staff", (await rpc(plain, "staff_join", { p_token: inv.token })).error === "owner");
  check("Yassine joins with it", (await rpc(yassine, "staff_join", { p_token: inv.token })).ok);
  check("…opening it again: he is in already", (await rpc(yassine, "staff_join", { p_token: inv.token })).already === true);
  check("…nobody else can use it", (await rpc(sami, "staff_join", { p_token: inv.token })).error === "used");
  check("a made-up invite: invalid", (await rpc(sami, "staff_join", { p_token: "A".repeat(32) })).error === "invalid");
  const ys = await rpc(yassine, "my_staff_shop");
  check("his phone knows the shop it works at, and nothing about the owner but a first name", ys?.name === "Nova Café" && ys.owner === "New" && ys.signal && !("owner_id" in ys), ys);
  check("the owner sees his staff, numbers masked", (await rpc(nova, "my_staff")).staff.some((x) => x.name === "Yassine Staff" && /•••/.test(x.phone)));
  check("as himself, the owner's counter is closed to him (no shop)", (await rpc(yassine, "new_code")).error === "no_shop");
  const code = await rpc(yassine, "staff_act", { p_fn: "new_code", p_args: {} });
  check("through staff_act: the shop's code", code.ok && !!code.token, code);
  const scanned = await rpc(sami, "stamp", { p_token: code.token });
  check("…which gives Sami a tampon at the shop", scanned.ok && scanned.card.shop.id === novaShop.id, scanned);
  check("the counter's heartbeat sees it", (await rpc(yassine, "staff_act", { p_fn: "counter", p_args: { p_code: code.id, p_since: null } })).taken === true);
  const samiCode = (await rpc(sami, "me")).code;
  const at = await rpc(yassine, "staff_act", { p_fn: "customer_at", p_args: { p_who: samiCode } });
  check("he reads a customer's code: who, and their card here", at.ok && at.name === "Sami" && at.card.shop.id === novaShop.id, at);
  check("…and his own code: refused (never a tampon to the hand that gives it)", (await rpc(yassine, "staff_act", { p_fn: "give_stamp", p_args: { p_who: (await rpc(yassine, "me")).code } })).error === "own_shop");
  const amiraCode = (await rpc(amira, "me")).code;
  const given = await rpc(yassine, "staff_act", { p_fn: "give_stamp", p_args: { p_who: amiraCode } });
  check("he gives Amira a tampon by her code", given.ok && given.card.shop.id === novaShop.id, given);
  const waiting = (await rpc(nova, "shop_home")).waiting ?? [];
  check("he hands over one of Amira's gifts", waiting.length > 0 && (await rpc(yassine, "staff_act", { p_fn: "give", p_args: { p_moment: waiting[0].id } })).ok);
  check("the shop's settings are not his: refused", (await rpc(yassine, "staff_act", { p_fn: "save_card", p_args: {} })).error === "invalid");
  check("the customers' list is not his either", (await rpc(yassine, "staff_act", { p_fn: "shop_customers", p_args: {} })).error === "invalid");
  check("a customer who is not staff: not_staff", (await rpc(sami, "staff_act", { p_fn: "new_code", p_args: {} })).error === "not_staff");
  check("the owner himself through staff_act: not_staff (his own counter is his)", (await rpc(nova, "staff_act", { p_fn: "new_code", p_args: {} })).error === "not_staff");
  for (let i = 0; i < 2; i++) {
    const p = await person(`Staff ${i}`);
    await rpc(p, "staff_join", { p_token: (await rpc(nova, "staff_invite")).token });
  }
  check("three staff phones: a fourth invite is refused", (await rpc(nova, "staff_invite")).error === "full");
  const yId = (await rpc(nova, "my_staff")).staff.find((x) => x.name === "Yassine Staff").id;
  check("the owner signs Yassine out", (await rpc(nova, "staff_remove", { p_id: yId })).ok);
  check("…his phone gives no more tampons", (await rpc(yassine, "staff_act", { p_fn: "new_code", p_args: {} })).error === "not_staff" && (await rpc(yassine, "my_staff_shop")) === null);
  check("Nova down to Pointili: its staff signed out, the golden ticket off", (await rpc(boss, "admin_set_pack", { p_id: novaShop.id, p_pack: "base" })).ok
    && (await rpc(nova, "my_staff")).staff.length === 0 && (await shopOf(novaShop.id)).draw_allowed === false);

  console.log("\nThe old shop, through all of it");
  check("every switch exactly where it was", JSON.stringify(await shopOf(oldShop.id)) === JSON.stringify(oldBefore), await shopOf(oldShop.id));
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  check("a visitor without an account calls none of it", !!(await anon.rpc("my_systems")).error && !!(await anon.rpc("staff_act", { p_fn: "new_code" })).error && !!(await anon.rpc("pack_price", { p_pack: "pro", p_months: 12 })).error);
} finally {
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${users.length} accounts)`);
  if (failed.length) process.exit(1);
}
