/**
 * The packs (supabase/packs-2026-11-09.sql): a shop opened now starts on Pointili, a shop already open is
 * «old» and nothing moves it but the founder; the founder's pack sets the switches all at once (said
 * before, refused when the shop is on the store); the owner's own store switch with what it does to the
 * customers (the promise kept: points become tampons, full cards become gifts at once); staff phones —
 * invited by a link, giving tampons for the
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
  // a gift won before the vouchers, still holding its 5 tampons on Lina's card: those are no points to spend
  const lina = await person("Lina");
  for (let i = 0; i < 2; i++) await tampon(nova, lina);
  const linaCard = (await rpc(lina, "wallet")).find((c) => c.shop.id === novaShop.id);
  await sql(`update public.cards set stamps = stamps + 5 where id = '${linaCard.id}'`);
  await sql(`insert into public.moments (shop_id, card_id, kind, gift, banked) values ('${novaShop.id}', '${linaCard.id}', 'gift', 'قهوة بلاش', false)`);
  const toStore2 = await rpc(nova, "store_preview");
  check("…a gift from before holds 5 tampons on Lina's card: the points said are 3 + 2, not 3 + 7", toStore2.points === 5, toStore2);
  check("to the store", (await rpc(nova, "set_store", { p_on: true })).ok && (await shopOf(novaShop.id)).store_on === true);
  const linaStore = (await rpc(lina, "wallet")).find((c) => c.shop.id === novaShop.id);
  check("…Lina on the store: 2 points to spend, her gift still waiting", linaStore.stamps === 2 && linaStore.waiting_n === 1, { stamps: linaStore.stamps, waiting_n: linaStore.waiting_n });
  const linaGift = (await sql(`select id from public.moments where card_id = '${linaCard.id}' and kind = 'gift' and given_at is null`))[0]?.id;
  check("…her gift handed over: her 2 points stay (its tampons are never taken twice)",
    (await rpc(nova, "give", { p_moment: linaGift })).ok && (await rpc(lina, "wallet")).find((c) => c.shop.id === novaShop.id).stamps === 2);
  for (let i = 0; i < 9; i++) await tampon(nova, amira);
  for (let i = 0; i < 4; i++) await tampon(nova, sami);
  const amiraCard = (await rpc(amira, "wallet")).find((c) => c.shop.id === novaShop.id);
  check("on the store a full card is no gift: Amira keeps 12 points", amiraCard.stamps === 12 && !amiraCard.ready, { stamps: amiraCard.stamps, ready: amiraCard.ready });
  const toCard = await rpc(nova, "store_preview");
  check("before going back to the card (5 a gift): 3 customers, 1 past a full card, 2 gifts at once", toCard.to === "card" && toCard.customers === 3 && toCard.over === 1 && toCard.gifts === 2, toCard);
  check("a shop on the store cannot go down to Pointili before it leaves the store", (await rpc(boss, "admin_set_pack", { p_id: novaShop.id, p_pack: "base" })).error === "store_on");
  const back = await rpc(nova, "set_store", { p_on: false });
  check("back to the card: the 2 gifts written now", back.ok && back.gifts === 2, back);
  // the store opened with its first things to buy, in one go — or not at all: never an empty store for the customers
  check("opening the store with nothing in it: refused", (await rpc(nova, "store_open", { p_items: [] })).error === "no_items");
  const badOpen = await rpc(nova, "store_open", { p_items: [{ name: "قهوة", cost: 0 }] });
  check("…with a list that will not do: refused, and the store stays shut", !!badOpen.error && (await shopOf(novaShop.id)).store_on === false, badOpen);
  const opened = await rpc(nova, "store_open", { p_items: [{ name: "قهوة", cost: 5 }, { name: "كرواسون", cost: 4 }] });
  check("…with its list: the store opens with its 2 things", opened.ok && opened.on === true && opened.items?.length === 2 && (await shopOf(novaShop.id)).store_on === true, opened);
  check("…and back to the card again (the rest goes on from there)", (await rpc(nova, "set_store", { p_on: false })).ok && (await shopOf(novaShop.id)).store_on === false);
  const after = (await rpc(amira, "wallet")).find((c) => c.shop.id === novaShop.id);
  check("…Amira: 2 gifts waiting, 2 tampons on her new card — nothing lost", after.waiting_n === 2 && after.stamps === 2, { waiting_n: after.waiting_n, stamps: after.stamps });
  const samiAfter = (await rpc(sami, "wallet")).find((c) => c.shop.id === novaShop.id);
  check("…Sami: his 4 tampons on the card, no gift yet", samiAfter.stamps === 4 && !samiAfter.ready, { stamps: samiAfter.stamps });

  console.log("\nStaff phones (Pro)");
  // the owner of another shop, who could not be staff anywhere
  const plain = await person("Plain Owner");
  await rpc(plain, "open_shop", { p_name: "Plain Shop", p_kind: "grocery" });
  check("Pointili has no staff phones", (await rpc(old, "staff_invite")).error === "not_allowed");
  const inv = await rpc(nova, "staff_invite");
  check("the owner makes an invite: one link", inv.ok && /^[A-Za-z0-9_-]{32}$/.test(inv.token), inv);
  const yassine = await person("Yassine Staff");
  check("a person not signed in cannot use it", !!(await createClient(URL_, ANON, { auth: { persistSession: false } }).rpc("staff_join", { p_token: inv.token })).error);
  check("an owner of another shop cannot be staff", (await rpc(plain, "staff_join", { p_token: inv.token })).error === "owner");
  const before = (await admin.rpc("staff_invite_info", { p_token: inv.token })).data;
  check("a phone not signed in yet is told which shop invites (by the server's own key)", before?.ok && before.shop === "Nova Café" && before.state === "open", before);
  check("…a visitor cannot ask the database itself", !!(await createClient(URL_, ANON, { auth: { persistSession: false } }).rpc("staff_invite_info", { p_token: inv.token })).error);
  check("Yassine joins with it", (await rpc(yassine, "staff_join", { p_token: inv.token })).ok);
  check("…and the invite says it is used", (await admin.rpc("staff_invite_info", { p_token: inv.token })).data?.state === "used");
  check("…opening it again: he is in already", (await rpc(yassine, "staff_join", { p_token: inv.token })).already === true);
  check("…nobody else can use it", (await rpc(sami, "staff_join", { p_token: inv.token })).error === "used");
  const spare = await rpc(nova, "staff_invite");
  check("an invite sent and not used yet: the owner sees it open", (await rpc(nova, "my_staff")).invites === 1);
  check("…he calls it off", (await rpc(nova, "staff_invite_cancel")).n === 1 && (await rpc(nova, "my_staff")).invites === 0);
  check("…and it opens nothing any more", (await rpc(sami, "staff_join", { p_token: spare.token })).error === "expired");
  check("a made-up invite: invalid", (await rpc(sami, "staff_join", { p_token: "A".repeat(32) })).error === "invalid");
  const ys = await rpc(yassine, "my_staff_shop");
  check("his phone knows the shop it works at, and nothing about the owner but a first name", ys?.name === "Nova Café" && ys.owner === "New" && ys.signal && !("owner_id" in ys), ys);
  check("…and whether the shop is stopped (open: not)", ys?.shut === false && ys.paused === false, { shut: ys?.shut, paused: ys?.paused });
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
  const tries = async (key) => Number((await sql(`select count(*) as n from public.tries where key = '${key}'`))[0].n);
  check("his tries are his own (a look, a tampon by number): the owner's count is untouched",
    (await tries(`give:staff:${yassine.id}`)) === 1 && (await tries(`look:staff:${yassine.id}`)) === 1 && (await tries(`give:${nova.id}`)) === 0 && (await tries(`look:${nova.id}`)) === 0);
  const waiting = (await rpc(nova, "shop_home")).waiting ?? [];
  check("he hands over one of Amira's gifts", waiting.length > 0 && (await rpc(yassine, "staff_act", { p_fn: "give", p_args: { p_moment: waiting[0].id } })).ok);
  const did = (await rpc(nova, "my_staff")).staff.find((x) => x.name === "Yassine Staff");
  check("the owner sees what he did today: 1 tampon by number, 1 gift handed over", did?.today?.stamps === 1 && did.today.gifts === 1 && did.week?.stamps === 1 && !!did.last, did);
  check("…and the customers who scanned the code his phone showed: Sami, 1 today and this week", did?.today?.scans === 1 && did.week?.scans === 1, did);
  const tagged = (await sql(`select (select staff_id from public.codes where id = '${code.id}') as code_by, (select staff_id from public.moments where id = ${Number(given.moment)}) as stamp_by`))[0];
  check("who gave it, written down: the code his phone showed, the tampon he gave by number", tagged?.code_by === yassine.id && tagged?.stamp_by === yassine.id, tagged);
  const file = await rpc(nova, "my_export");
  const byHim = (file.stamps ?? []).filter((x) => x.staff);
  check("the owner's file says who gave each tampon: his two by name (the scan, the number), the owner's own unnamed", file.ok && byHim.length === 2 && byHim.every((x) => x.by === "Yassine Staff") && byHim.some((x) => x.via === "qr") && byHim.some((x) => x.via === "number") && (file.stamps ?? []).some((x) => !x.staff && x.by === null), { n: byHim.length, first: file.stamps?.slice(0, 3) });
  check("what the clock took: given back for one card only, never every card at once",
    (await rpc(yassine, "staff_act", { p_fn: "restore_reset", p_args: {} })).error === "invalid"
      && (await rpc(yassine, "staff_act", { p_fn: "restore_reset", p_args: { p_card: given.card.id } })).error === "not_found");
  check("what a tampon was for, changed afterwards: the owner's, not his", (await rpc(yassine, "staff_act", { p_fn: "set_moment_item", p_args: { p_moment: 1, p_item: 1 } })).error === "invalid");
  const wheel = await rpc(yassine, "staff_act", { p_fn: "my_wheel", p_args: {} });
  check("the wheel for his counter: its prizes, not its stock nor its month", wheel?.ok === true && Array.isArray(wheel.prizes) && !("fell" in wheel) && wheel.prizes.every((p) => !("stock" in p)), wheel);
  // a tampon two days old: on the owner's counter looking back to 2000, not on his (a working day back at most)
  const oldStamp = (await sql(`select id from public.moments where shop_id = '${novaShop.id}' and kind = 'stamp' order by created_at limit 1`))[0].id;
  await sql(`update public.moments set created_at = now() - interval '2 days' where id = ${oldStamp}`);
  const far = { p_code: code.id, p_since: "2000-01-01T00:00:00Z" };
  const ownerSees = (await rpc(nova, "counter", far)).stamps.some((m) => m.id === oldStamp);
  const staffSees = (await rpc(yassine, "staff_act", { p_fn: "counter", p_args: far })).stamps.some((m) => m.id === oldStamp);
  check("his counter looks back a working day, never the shop's whole past", ownerSees && !staffSees, { ownerSees, staffSees });
  check("the shop's settings are not his: refused", (await rpc(yassine, "staff_act", { p_fn: "save_card", p_args: {} })).error === "invalid");
  check("the customers' list is not his either", (await rpc(yassine, "staff_act", { p_fn: "shop_customers", p_args: {} })).error === "invalid");
  check("a customer who is not staff: not_staff", (await rpc(sami, "staff_act", { p_fn: "new_code", p_args: {} })).error === "not_staff");
  check("the owner himself through staff_act: not_staff (his own counter is his)", (await rpc(nova, "staff_act", { p_fn: "new_code", p_args: {} })).error === "not_staff");
  const crew = [];
  for (let i = 0; i < 2; i++) {
    const p = await person(`Staff ${i}`);
    await rpc(p, "staff_join", { p_token: (await rpc(nova, "staff_invite")).token });
    crew.push(p);
  }
  check("three staff phones: a fourth invite is refused", (await rpc(nova, "staff_invite")).error === "full");
  // the golden ticket: the hands that give the tampons are not in the shop's draw, as its owner is not
  await tampon(nova, crew[0]);
  const drawId = (await sql(`insert into public.draws (shop_id, rule, draw_at, starts_at) values ('${novaShop.id}', 'stamps', now() + interval '1 day', now() - interval '1 day') returning id`))[0].id;
  const pool = (await sql(`select p.user_id from public.draws d, public.draw_pool(d) p where d.id = '${drawId}'`)).map((r) => r.user_id);
  check("a staff phone's own tampons put it in no draw of the shop; its customers are in", !pool.includes(crew[0].id) && pool.includes(amira.id), pool.length);
  await sql(`update public.draws set status = 'cancelled', cancelled_at = now() where id = '${drawId}'`);
  // staff who open a shop of their own: that shop's owner, and staff nowhere (their counter is their own)
  await rpc(crew[1], "open_shop", { p_name: "Crew Shop", p_kind: "cafe" });
  check("a staff phone that opens its own shop is staff nowhere", (await rpc(crew[1], "my_staff_shop")) === null && (await rpc(crew[1], "staff_act", { p_fn: "new_code", p_args: {} })).error === "not_staff");
  const yId = (await rpc(nova, "my_staff")).staff.find((x) => x.name === "Yassine Staff").id;
  check("the owner signs Yassine out", (await rpc(nova, "staff_remove", { p_id: yId })).ok);
  check("…his phone gives no more tampons", (await rpc(yassine, "staff_act", { p_fn: "new_code", p_args: {} })).error === "not_staff" && (await rpc(yassine, "my_staff_shop")) === null);
  // a Pro shop named «old» again by the founder: an old shop has no page for its staff phones, so they go
  const two = await person("Second Owner");
  await rpc(two, "open_shop", { p_name: "Second Shop", p_kind: "cafe" });
  await rpc(two, "save_card", { p_goal: 5, p_gift: "قهوة", p_color: "#6c47ff", p_gap: 0 });
  const twoShop = (await rpc(two, "me")).shop;
  await rpc(boss, "admin_set_pack", { p_id: twoShop.id, p_pack: "pro" });
  const helper = await person("Second Helper");
  await rpc(helper, "staff_join", { p_token: (await rpc(two, "staff_invite")).token });
  const unused = await rpc(two, "staff_invite");
  const toOld = await rpc(boss, "admin_pack_preview", { p_id: twoShop.id, p_pack: "old" });
  check("a Pro shop named «old» again: the founder is told its staff phones go", toOld.changes?.includes("staff_off") && toOld.changes.includes("staff_signed_out"), toOld);
  check("…done: its staff signed out, no room for more, its invite not used yet dead",
    (await rpc(boss, "admin_set_pack", { p_id: twoShop.id, p_pack: "old" })).ok && (await shopOf(twoShop.id)).staff_max === 0
      && (await rpc(helper, "my_staff_shop")) === null && (await rpc(sami, "staff_join", { p_token: unused.token })).error === "expired");
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
