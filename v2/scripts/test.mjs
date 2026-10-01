/**
 * Every rule of v2/supabase/schema.sql, through the same functions the app
 * calls, with throwaway accounts that are deleted at the end, pass or fail.
 *
 *   node scripts/test.mjs        (from v2/)
 */
import { randomBytes } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
};
const users = [];

async function person(name) {
  const digits = `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const password = randomBytes(12).toString("base64url");
  const email = `216${digits}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${digits}` } });
  if (error) throw error;
  users.push(data.user.id);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  if (name) await client.rpc("set_name", { p_name: name });
  return { id: data.user.id, client };
}
const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  return error ? { error: error.message } : data;
};
const ago = (minutes) => new Date(Date.now() - minutes * 60_000).toISOString();

try {
  console.log("\nThe owner: a shop, then its card");
  const owner = await person("Yasmine");
  check("a new account has no shop", (await rpc(owner, "me")).shop === null);
  check("opening the shop", (await rpc(owner, "open_shop", { p_name: "Café Test", p_kind: "cafe" })).ok);
  check("no code before the card", (await rpc(owner, "new_code")).error === "no_card");
  check("a card: 5 stamps = a free coffee", (await rpc(owner, "save_card", { p_goal: 5, p_gift: "قهوة بلاش", p_color: "#6c47ff" })).ok);
  const me = await rpc(owner, "me");
  check("the session knows the shop and its card", me.shop?.goal === 5 && me.shop.gift === "قهوة بلاش" && me.shop.color === "#6C47FF", me.shop);
  check("a goal outside 3–30 is refused", (await rpc(owner, "save_card", { p_goal: 2, p_gift: "x x", p_color: "#000000" })).error === "invalid_goal");

  console.log("\nThe customer: a code works once");
  const sami = await person("سامي بن علي");
  const c1 = await rpc(owner, "new_code");
  check("the counter makes a code", c1.ok && /^[A-Za-z0-9_-]{32}$/.test(c1.token), c1);
  const s1 = await rpc(sami, "stamp", { p_token: c1.token });
  check("scanned: +1 stamp, on a new card", s1.ok && s1.card.stamps === 1 && s1.card.shop.goal === 5 && !s1.gift, s1);
  check("the same code again: already done, no second stamp", (await rpc(sami, "stamp", { p_token: c1.token })).error === "done");
  const other = await person("Ines");
  check("someone else with a used code: used", (await rpc(other, "stamp", { p_token: c1.token })).error === "used");
  const st = await rpc(owner, "counter", { p_code: c1.id, p_since: ago(5) });
  check("the counter sees the code taken and who came", st.taken && st.stamps.length === 1 && st.stamps[0].name === "سامي", st);
  const c2 = await rpc(owner, "new_code");
  const soon = await rpc(sami, "stamp", { p_token: c2.token });
  check("a second stamp within the hour is refused, with the time it opens", soon.error === "too_soon" && !!soon.next_at, soon);
  check("the owner never stamps his own card", (await rpc(owner, "stamp", { p_token: c2.token })).error === "own_shop");
  await admin.from("codes").update({ expires_at: ago(1) }).eq("id", c2.id);
  check("an expired code: expired", (await rpc(other, "stamp", { p_token: c2.token })).error === "expired");
  check("a made-up code: invalid", (await rpc(other, "stamp", { p_token: "A".repeat(32) })).error === "invalid");

  console.log("\nA phone without an account holds the code");
  const c3 = await rpc(owner, "new_code");
  const hold = randomBytes(32).toString("base64url");
  const held = await admin.rpc("hold", { p_token: c3.token, p_hold: hold });
  check("held for 20 minutes, the shop named", held.data?.ok && held.data.shop === "Café Test", held);
  check("the counter sees the code taken while held", (await rpc(owner, "counter", { p_code: c3.id, p_since: null })).taken);
  check("another phone cannot take a held code", (await rpc(other, "stamp", { p_token: c3.token })).error === "used");
  const newbie = await person("Amel");
  const s3 = await rpc(newbie, "stamp", { p_token: c3.token, p_hold: hold });
  check("the same phone, back with an account, gets its stamp", s3.ok && s3.card.stamps === 1, s3);
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  const anonHold = await anon.rpc("hold", { p_token: c3.token, p_hold: hold });
  check("a browser cannot call hold itself (server only)", !!anonHold.error);
  const anonStamp = await anon.rpc("stamp", { p_token: c3.token });
  check("no account, no stamp", !!anonStamp.error || anonStamp.data?.error === "not_signed_in");

  console.log("\nThe gift: waits until the shop hands it over");
  let last;
  for (let i = 0; i < 4; i++) {
    await admin.from("cards").update({ last_at: ago(61) }).eq("id", s1.card.id);
    const c = await rpc(owner, "new_code");
    last = await rpc(sami, "stamp", { p_token: c.token });
  }
  check("the fifth stamp fills the card: a gift waits", last.ok && last.card.stamps === 5 && last.gift && last.card.ready && last.card.waiting, last);
  const waiting = (await rpc(owner, "counter", { p_code: c1.id, p_since: null })).gifts;
  check("the counter shows the waiting gift", waiting.length === 1 && waiting[0].gift === "قهوة بلاش" && waiting[0].name === "سامي", waiting);
  await admin.from("cards").update({ last_at: ago(61) }).eq("id", s1.card.id);
  const c6 = await rpc(owner, "new_code");
  const extra = await rpc(sami, "stamp", { p_token: c6.token });
  check("a stamp while the gift waits carries over (6), no second gift", extra.ok && extra.card.stamps === 6 && !extra.gift, extra);
  check("handing it over", (await rpc(owner, "give", { p_moment: waiting[0].id })).ok);
  const after = await rpc(sami, "card", { p_id: s1.card.id });
  check("the goal's stamps leave the card, the rest stays (6 → 1), one gift received", after.stamps === 1 && after.gifts === 1 && !after.waiting, after);
  check("handing it twice does nothing more", (await rpc(owner, "give", { p_moment: waiting[0].id })).already === true);
  check("another shop cannot hand it over", (await rpc(other, "give", { p_moment: waiting[0].id })).error === "no_shop");
  check("the card keeps its story", after.history.some((h) => h.kind === "gift" && h.given) && after.history.filter((h) => h.kind === "stamp").length === 6, after.history);

  console.log("\nA lower goal fills cards at once");
  await rpc(owner, "save_card", { p_goal: 3, p_gift: "قهوة بلاش", p_color: "#6C47FF" });
  await admin.from("cards").update({ stamps: 3 }).eq("id", s3.card.id);
  await rpc(owner, "save_card", { p_goal: 3, p_gift: "قهوة بلاش", p_color: "#6C47FF" });
  const gifts = (await rpc(owner, "counter", { p_code: c1.id, p_since: null })).gifts;
  check("a card already at the new goal gets its gift waiting", gifts.some((g) => g.name === "Amel"), gifts);

  console.log("\nThe wallet and the owner's numbers");
  const wallet = await rpc(sami, "wallet");
  check("the wallet lists the card with its shop", wallet.length === 1 && wallet[0].shop.name === "Café Test", wallet);
  check("nobody reads another person's card", (await rpc(other, "card", { p_id: s1.card.id })) === null);
  const nums = await rpc(owner, "shop_numbers");
  check("the owner's numbers", nums.ok && nums.customers === 2 && nums.gifts === 1 && nums.today >= 7, nums);
  const direct = await sami.client.from("cards").select("*");
  check("tables are closed to the app (functions only)", !!direct.error || (direct.data ?? []).length === 0, direct.error?.message);

  console.log("\nThe owner's home");
  const home = await rpc(owner, "shop_home");
  check("the owner's home: numbers, waiting gifts, the latest moments", home.ok && home.customers === 2 && home.recent.length > 0 && Array.isArray(home.waiting), home);
  const cust = await rpc(owner, "shop_customers");
  check("the owner's customers, latest first, with masked phones", cust.ok && cust.items.length === 2 && cust.items.every((c) => !c.phone || c.phone.includes("•••")), cust.items);
  const odd = await person("Odd");
  check("a kind of shop outside the list becomes «other»", (await rpc(odd, "open_shop", { p_name: "Mystery", p_kind: "spaceship" })).ok && (await rpc(odd, "me")).shop.kind === "other");
  check("a new kind from the list is kept", (await rpc(odd, "open_shop", { p_name: "Mystery", p_kind: "barber" })).ok && (await rpc(odd, "me")).shop.kind === "barber");

  console.log("\nThe founder's console");
  const boss = await person("Boss");
  await admin.from("people").update({ is_admin: true }).eq("id", boss.id);
  check("the founder is an admin in the session", (await rpc(boss, "me")).admin === true);
  const ov = await rpc(boss, "admin_overview");
  check("the founder sees the totals and the week", ov.shops >= 2 && ov.customers >= 2 && ov.week.length === 7, ov);
  check("a customer cannot open the console", !!(await rpc(sami, "admin_overview")).error);
  check("an owner cannot open the console", !!(await rpc(owner, "admin_shops", { p_q: null })).error);
  const found = await rpc(boss, "admin_shops", { p_q: "Café Test" });
  check("the founder finds a shop by its name", found.length === 1 && found[0].customers === 2 && found[0].owner.name === "Yasmine", found);
  const page = await rpc(boss, "admin_shop", { p_id: found[0].id });
  check("a shop's page: the owner, the numbers, the best customers", page.owner?.name === "Yasmine" && page.top.length === 2 && page.stamps >= 7, page);
  check("pausing a shop", (await rpc(boss, "admin_set_paused", { p_id: found[0].id, p_paused: true })).ok);
  check("a paused shop makes no code", (await rpc(owner, "new_code")).error === "paused");
  check("the owner sees it paused", (await rpc(owner, "me")).shop.paused === true);
  await rpc(boss, "admin_set_paused", { p_id: found[0].id, p_paused: false });
  check("resumed, it makes codes again", (await rpc(owner, "new_code")).ok === true);
  check("the founder lists people, admins marked", (await rpc(boss, "admin_people", { p_q: "Boss" })).some((p) => p.admin));
  const mystery = (await rpc(boss, "admin_shops", { p_q: "Mystery" }))[0];
  check("the founder deletes a shop", (await rpc(boss, "admin_delete_shop", { p_id: mystery.id })).ok && (await rpc(odd, "me")).shop === null);
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
} finally {
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${users.length} accounts)`);
  if (failed.length) process.exit(1);
}
