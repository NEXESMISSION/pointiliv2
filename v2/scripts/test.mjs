/**
 * Every rule of v2/supabase/schema.sql, through the same functions the app
 * calls, with throwaway accounts that are deleted at the end, pass or fail.
 *
 *   node scripts/test.mjs        (from v2/)
 */
import { randomBytes, randomUUID } from "node:crypto";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { sql } from "./db.mjs";
import { robot, unrobot } from "./robots.mjs";

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
// the founder's settings are real (production shares this database): put back as they were
let settingsBefore = null;
const visitsMade = [];
const newsMade = [];
const expensesMade = [];

const phones = [];
async function person(name) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
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
  check("a card of 30 stamps (typed by hand) is fine", (await rpc(owner, "save_card", { p_goal: 30, p_gift: "قهوة بلاش", p_color: "#6c47ff" })).ok && (await rpc(owner, "save_card", { p_goal: 5, p_gift: "قهوة بلاش", p_color: "#6c47ff" })).ok);
  check("a new shop has no logo", me.shop.logo === null, me.shop);
  check("a new owner has seen no one-time note yet", Array.isArray(me.seen) && me.seen.length === 0, me.seen);
  check("the logo tip, seen: written on the person", (await rpc(owner, "see", { p_key: "logo_tip" })).ok && (await rpc(owner, "me")).seen.join() === "logo_tip");
  await rpc(owner, "see", { p_key: "logo_tip" });
  check("…once, however often it is said", (await rpc(owner, "me")).seen.length === 1);
  check("a note that does not exist is refused", (await rpc(owner, "see", { p_key: "popup" })).error === "invalid");
  const nobody = createClient(URL_, ANON, { auth: { persistSession: false } });
  check("nobody signed in cannot mark notes", !!(await nobody.rpc("see", { p_key: "coach" })).error);
  const logoUrl = `${URL_}/storage/v1/object/public/logos/${owner.id}/test.webp`;
  await owner.client.from("shops").update({ logo: "https://evil.example/x.png" }).eq("owner_id", owner.id);
  check("a browser cannot set a logo itself", (await rpc(owner, "me")).shop.logo === null);
  await admin.from("shops").update({ logo: logoUrl }).eq("owner_id", owner.id);
  check("the logo the server saved is in the session", (await rpc(owner, "me")).shop.logo === logoUrl);
  check("a logo must be a web address", !!(await admin.from("shops").update({ logo: "javascript:alert(1)" }).eq("owner_id", owner.id)).error);

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
  check("…and the shop's logo on the card", wallet[0].shop.logo?.endsWith("/test.webp"), wallet[0].shop);
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

  console.log("\nChanging the card: a card is a promise");
  const shop2 = await person("Hedi");
  await rpc(shop2, "open_shop", { p_name: "Promise Café", p_kind: "perfume" });
  check("a new kind (perfume) is kept", (await rpc(shop2, "me")).shop.kind === "perfume");
  await rpc(shop2, "save_card", { p_goal: 5, p_gift: "قهوة بلاش", p_color: "#6C47FF" });
  const signal = (await rpc(shop2, "me")).shop.signal;
  check("the shop has a secret radio topic for its counter", /^[0-9a-f]{32}$/.test(signal ?? ""), signal);
  const p1 = await person("Rania");
  const p2 = await person("Karim");
  const stampAt = async (who) => {
    const c = await rpc(shop2, "new_code");
    const r = await rpc(who, "stamp", { p_token: c.token });
    if (r.card) await admin.from("cards").update({ last_at: ago(61) }).eq("id", r.card.id);
    return r;
  };
  await stampAt(p1);
  const p1b = await stampAt(p1);
  check("Rania is on her way: 2 of 5 for a coffee", p1b.card.stamps === 2 && p1b.card.shop.goal === 5, p1b.card);
  check("one customer on the way, as the card page tells the owner", (await rpc(shop2, "in_progress")).n === 1);
  const raised = await rpc(shop2, "save_card", { p_goal: 8, p_gift: "قهوة بلاش", p_color: "#6C47FF" });
  check("more stamps for the same gift: the owner is told one customer keeps her card", raised.ok && raised.kept === 1 && raised.eased === 0, raised);
  let v1 = await rpc(p1, "card", { p_id: p1b.card.id });
  check("Rania keeps 5 for her coffee, and sees the new card coming after it", v1.shop.goal === 5 && v1.shop.gift === "قهوة بلاش" && v1.next?.goal === 8, v1);
  const k1 = await stampAt(p2);
  check("Karim, new, gets the card of today: 8", k1.card.shop.goal === 8 && !k1.card.next, k1.card);
  const regift = await rpc(shop2, "save_card", { p_goal: 8, p_gift: "كرواسون بلاش", p_color: "#6C47FF" });
  check("another gift: both on the way keep theirs", regift.kept === 2, regift);
  v1 = await rpc(p1, "card", { p_id: p1b.card.id });
  check("Rania: still 5 for a coffee; next, a croissant", v1.shop.goal === 5 && v1.shop.gift === "قهوة بلاش" && v1.next?.gift === "كرواسون بلاش", v1);
  const eased = await rpc(shop2, "save_card", { p_goal: 3, p_gift: "  قهوة   بلاش ", p_color: "#6C47FF" });
  check("the same coffee for fewer stamps (spaces aside): both get the easier card at once", eased.eased === 2 && eased.filled === 0, eased);
  v1 = await rpc(p1, "card", { p_id: p1b.card.id });
  check("Rania: 2 of 3 now", v1.shop.goal === 3 && v1.stamps === 2 && !v1.waiting, v1);
  await admin.from("cards").update({ stamps: 4 }).eq("id", p1b.card.id);
  const fill1 = await rpc(shop2, "save_card", { p_goal: 3, p_gift: "قهوة بلاش", p_color: "#6C47FF" });
  check("a card that reaches its goal gets its gift waiting", fill1.filled === 1, fill1);
  await rpc(shop2, "save_card", { p_goal: 6, p_gift: "كرواسون بلاش", p_color: "#6C47FF" });
  const g2 = (await rpc(shop2, "shop_home")).waiting;
  check("the waiting gift stays the coffee she earned, whatever the card says now", g2.length === 1 && g2[0].gift === "قهوة بلاش", g2);
  check("handing it over", (await rpc(shop2, "give", { p_moment: g2[0].id })).ok);
  v1 = await rpc(p1, "card", { p_id: p1b.card.id });
  check("her card's own goal leaves it (4 − 3 = 1), and the next card is today's: 1 of 6 for a croissant", v1.stamps === 1 && v1.shop.goal === 6 && v1.shop.gift === "كرواسون بلاش" && !v1.next && v1.gifts === 1, v1);
  check("the story names the gift she got", v1.history.some((h) => h.kind === "gift" && h.given && h.gift === "قهوة بلاش"), v1.history);
  await admin.from("cards").update({ stamps: 0 }).eq("id", p1b.card.id);
  await rpc(shop2, "save_card", { p_goal: 7, p_gift: "عصير بلاش", p_color: "#6C47FF" });
  v1 = await rpc(p1, "card", { p_id: p1b.card.id });
  check("a card at rest (no stamps) takes the new card at once", v1.shop.goal === 7 && v1.shop.gift === "عصير بلاش" && !v1.next, v1);

  console.log("\nTwo phones, one code, the same instant");
  const twinA = await person("Twin A");
  const twinB = await person("Twin B");
  const cTwin = await rpc(shop2, "new_code");
  const [ra, rb] = await Promise.all([rpc(twinA, "stamp", { p_token: cTwin.token }), rpc(twinB, "stamp", { p_token: cTwin.token })]);
  check("exactly one of them gets the stamp, the other is told to scan the new code", [ra, rb].filter((r) => r.ok).length === 1 && [ra, rb].some((r) => r.error === "used"), [ra, rb]);

  console.log("\nThe counter's radio");
  const heard = await new Promise((resolve) => {
    const ear = createClient(URL_, ANON, { auth: { persistSession: false } });
    let ch = null;
    const timer = setTimeout(() => done(false), 15000);
    function done(v) {
      clearTimeout(timer);
      if (ch) void ear.removeChannel(ch);
      resolve(v);
    }
    ch = ear
      .channel(`pointili:${signal}`)
      .on("broadcast", { event: "ping" }, () => done(true))
      .subscribe(async (status) => {
        if (status === "SUBSCRIBED") setTimeout(() => void stampAt(p2), 1000);
      });
  });
  check("a scan pings the shop's counter over Realtime", heard === true);

  console.log("\nDoors that count");
  const door = `test:${randomBytes(6).toString("hex")}`;
  const opens = [];
  for (let i = 0; i < 9; i++) opens.push((await admin.rpc("try_once", { p_key: door, p_max: 8, p_minutes: 15 })).data);
  check("8 tries go through, the 9th waits", opens.slice(0, 8).every((x) => x === true) && opens[8] === false, opens);
  await admin.rpc("forget_tries", { p_key: door });
  check("a good sign-in forgets the tries", (await admin.rpc("try_once", { p_key: door, p_max: 8, p_minutes: 15 })).data === true);
  await admin.rpc("forget_tries", { p_key: door });
  check("a browser cannot count or clear tries", !!(await sami.client.rpc("try_once", { p_key: door, p_max: 1, p_minutes: 1 })).error && !!(await sami.client.rpc("forget_tries", { p_key: door })).error);
  check("a browser cannot sign anyone out", !!(await sami.client.rpc("end_sessions", { p_user: sami.id })).error);
  const gone = await person("Gone");
  await admin.auth.admin.deleteUser(gone.id);
  check("an account deleted while still signed in is nobody (no half-person)", (await rpc(gone, "me")) === null);

  console.log("\nThe founder's console");
  const boss = await person("Boss");
  await admin.from("people").update({ is_admin: true }).eq("id", boss.id);
  check("the founder is an admin in the session", (await rpc(boss, "me")).admin === true);
  const ov = await rpc(boss, "admin_overview");
  check("the founder sees the totals and the week", ov.shops >= 2 && ov.customers >= 2 && ov.week.length === 7, ov);
  check("a customer cannot open the console", !!(await rpc(sami, "admin_overview")).error);
  check("an owner cannot open the console", !!(await rpc(owner, "admin_shops", { p_q: null })).error);
  // (the founder's test account may hold a «Café Test» of its own: this run's is Yasmine's)
  const found = ((await rpc(boss, "admin_shops", { p_q: "Café Test" })) ?? []).filter((x) => x.owner?.name === "Yasmine");
  check("the founder finds a shop by its name", found.length === 1 && found[0].customers === 2, found);
  const page = await rpc(boss, "admin_shop", { p_id: found[0]?.id });
  check("a shop's page: the owner, the numbers, the best customers", page.owner?.name === "Yasmine" && page.top.length === 2 && page.stamps >= 7, page);
  check("pausing a shop", (await rpc(boss, "admin_set_paused", { p_id: found[0].id, p_paused: true })).ok);
  check("a paused shop makes no code", (await rpc(owner, "new_code")).error === "paused");
  check("the owner sees it paused", (await rpc(owner, "me")).shop.paused === true);
  await rpc(boss, "admin_set_paused", { p_id: found[0].id, p_paused: false });
  check("resumed, it makes codes again", (await rpc(owner, "new_code")).ok === true);
  check("the founder lists people, admins marked", (await rpc(boss, "admin_people", { p_q: "Boss" })).some((p) => p.admin));

  console.log("\nReal accounts, test accounts, and the machines' own");
  const myShop = (await rpc(owner, "me")).shop.id;
  // the console as the real founder's own login sees it: their id in the claims, nobody is made up for this
  const asFounder = async (fn, args) =>
    (await sql(`select set_config('request.jwt.claims', json_build_object('sub', (select id from public.people where is_admin and not public.is_robot(id) order by created_at limit 1), 'role', 'authenticated')::text, true); select public.${fn}(${args}) as r`))[0].r;
  const realShops = await asFounder("admin_shops", "null, false");
  const testShops = await asFounder("admin_shops", "null, true");
  check("a real founder's console never shows a robot's shop, among the real ones or the tests", ![...realShops, ...testShops].some((x) => x.id === myShop), realShops.length + testShops.length);
  const seenPeople = [...(await asFounder("admin_people", "null, false")), ...(await asFounder("admin_people", "null, true"))];
  check("…nor a robot's account", !seenPeople.some((p) => [owner.id, sami.id, boss.id].includes(p.id)));
  check("…and the real shops carry no test, the tests nothing else", realShops.every((x) => !x.test) && testShops.every((x) => x.test));
  // marking, seen through this run's own founder: a robot sees everything, each shop with its mark
  const mark = async () => (await rpc(boss, "admin_shops", { p_q: null })).find((x) => x.id === myShop)?.test;
  const unmarked = (await mark()) === false;
  const marked = (await rpc(boss, "admin_set_tester", { p_id: owner.id, p_on: true })).ok && (await mark()) === true;
  const back = (await rpc(boss, "admin_set_tester", { p_id: owner.id, p_on: false })).ok && (await mark()) === false;
  check("the founder marks an account as a test, and back", unmarked && marked && back, { unmarked, marked, back });
  check("a customer cannot mark an account", !!(await rpc(sami, "admin_set_tester", { p_id: owner.id, p_on: true })).error);
  const robots = await rpc(boss, "admin_robots");
  check("the founder sees how many robot accounts there are", robots.accounts >= 3 && robots.shops >= 1, robots);
  const rania = await rpc(boss, "admin_person", { p_id: p1.id });
  check("one person's page: the name, the cards", rania?.name === "Rania" && rania.cards.length === 1 && rania.cards[0].shop === "Promise Café", rania);
  check("a customer cannot open someone's page", !!(await rpc(sami, "admin_person", { p_id: p1.id })).error);
  const mystery = (await rpc(boss, "admin_shops", { p_q: "Mystery" }))[0];
  check("the founder deletes a shop", (await rpc(boss, "admin_delete_shop", { p_id: mystery.id })).ok && (await rpc(odd, "me")).shop === null);

  console.log("\nThe founder's settings: the help number and the videos");
  settingsBefore = (await admin.from("settings").select("key, value")).data ?? [];
  check("the founder saves the help number", (await rpc(boss, "admin_set_setting", { p_key: "support_phone", p_value: " +216 22 000 111 " })).ok);
  const saved = (await admin.from("settings").select("value").eq("key", "support_phone").single()).data;
  check("…trimmed", saved?.value === "+216 22 000 111", saved);
  check("a setting that does not exist is refused", (await rpc(boss, "admin_set_setting", { p_key: "colour", p_value: "red" })).error === "invalid");
  check("the ads' pixel and the domain's code are settings", (await rpc(boss, "admin_set_setting", { p_key: "meta_pixel", p_value: "123456789012345" })).ok && (await rpc(boss, "admin_set_setting", { p_key: "fb_domain_verify", p_value: "abcdefghij0123456789" })).ok);
  check("an owner cannot change the settings", !!(await rpc(owner, "admin_set_setting", { p_key: "support_phone", p_value: "1" })).error);
  check("a browser cannot read the settings table", ((await sami.client.from("settings").select("key")).data ?? []).length === 0);

  console.log("\nNews for the owners: once each, and who saw it");
  // only for this test's own accounts: no real owner ever sees it
  const piece = { p_title: "جديد: اللوغو على الكارط", p_body: "حطّ اللوغو متاعك ويبان عند كل حريف", p_icon: "camera", p_cta_label: "حطّو توّا", p_cta_href: "/shop/setup?edit=1", p_only: [owner.id, sami.id, shop2.id] };
  const news1 = await rpc(boss, "admin_news_save", piece);
  if (news1.id) newsMade.push(news1.id);
  check("the founder publishes a piece of news", news1.ok && !!news1.id, news1);
  check("an owner cannot publish news", !!(await rpc(owner, "admin_news_save", piece)).error);
  check("its button leads inside the app or to https only", (await rpc(boss, "admin_news_save", { ...piece, p_cta_href: "javascript:alert(1)" })).error === "invalid");
  const next = await rpc(owner, "news_next");
  check("an owner whose shop opened before it gets it", next?.id === news1.id && next.cta_href === "/shop/setup?edit=1" && next.icon === "camera", next);
  check("a customer gets no news", (await rpc(sami, "news_next")) === null);
  const late = await person("Late");
  await rpc(late, "open_shop", { p_name: "Late Shop", p_kind: "cafe" });
  check("a shop opened after it does not (no old news for new owners)", (await rpc(late, "news_next")) === null);
  check("shown: written on the owner", (await rpc(owner, "news_seen", { p_id: news1.id })).ok);
  check("…and never shown again", (await rpc(owner, "news_next")) === null);
  check("its button tapped: written too", (await rpc(owner, "news_clicked", { p_id: news1.id })).ok);
  const second = await rpc(boss, "admin_news_save", { ...piece, p_title: "خبر ثاني", p_only: [owner.id] });
  if (second.id) newsMade.push(second.id);
  check("one a day at the most: a second piece waits for tomorrow", (await rpc(owner, "news_next")) === null);
  const listed = ((await rpc(boss, "admin_news_list")) ?? []).find((n) => n.id === news1.id);
  check("the founder sees how many saw it and tapped it", listed?.audience === 2 && listed.seen === 1 && listed.clicked === 1, listed);
  const detail = await rpc(boss, "admin_news", { p_id: news1.id });
  check("…owner by owner: who saw it, who not yet", detail?.people?.some((p) => p.id === owner.id && p.seen_at && p.clicked_at) && detail.people.some((p) => p.id === shop2.id && !p.seen_at), detail?.people);
  check("a customer cannot read who saw it", !!(await rpc(sami, "admin_news_list")).error && !!(await rpc(sami, "admin_news", { p_id: news1.id })).error);
  check("a stopped piece goes to nobody new", (await rpc(boss, "admin_news_set_active", { p_id: news1.id, p_active: false })).ok && (await rpc(shop2, "news_next")) === null);
  check("the founder deletes a piece", (await rpc(boss, "admin_news_delete", { p_id: second.id })).ok && !((await rpc(boss, "admin_news_list")) ?? []).some((n) => n.id === second.id));
  const forTesters = await admin.from("news").insert({ title: "for the test account", only_testers: true }).select("id").single();
  if (forTesters.data?.id) newsMade.push(forTesters.data.id);
  check("a piece for test accounts never reaches a real owner", (await rpc(shop2, "news_next"))?.id !== forTesters.data?.id);

  console.log("\nThe shop gives the tampon itself: by the customer's code or number");
  const nour = await person("نور الهدى");
  const nourMe = await rpc(nour, "me");
  check("every person has a 6-digit code", /^\d{6}$/.test(nourMe.code ?? ""), nourMe.code);
  const look = await rpc(owner, "customer_at", { p_who: nourMe.code });
  check("the shop sees who a code is: the first name, no card yet", look.ok && look.name === "نور" && look.card === null, look);
  const given = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  check("the shop gives the tampon by the code", given.ok && given.card?.stamps === 1 && given.name === "نور", given);
  // the number on the sign-in (the people row of a test person may not carry it): give it to the row, as signing up does
  const nourPhone = (await admin.auth.admin.getUserById(nour.id)).data.user?.app_metadata?.phone ?? "";
  await admin.from("people").update({ phone: nourPhone }).eq("id", nour.id);
  const byPhone = await rpc(owner, "give_stamp", { p_who: nourPhone.replace("+216", "") });
  check("…once an hour, whatever way (here the phone number)", byPhone.error === "too_soon", byPhone);
  check("an unknown code is nobody", (await rpc(owner, "give_stamp", { p_who: "000000" === nourMe.code ? "000001" : "000000" })).error === "unknown");
  check("an owner cannot stamp their own card", (await rpc(owner, "give_stamp", { p_who: (await rpc(owner, "me")).code })).error === "own_shop");
  check("a customer (no shop) cannot give tampons", (await rpc(nour, "give_stamp", { p_who: (await rpc(sami, "me")).code })).error === "no_shop");
  check("the tampon shows in the customer's wallet", ((await rpc(nour, "wallet")) ?? []).some((c) => c.shop.name === "Café Test" && c.stamps === 1));
  // the card one stamp from its gift (an hour later): the last tampon by the code, then the gift handed over from the same screen
  const nourCard = (await admin.from("cards").select("id, goal").eq("user_id", nour.id).single()).data;
  await admin.from("cards").update({ stamps: (nourCard.goal ?? 0) - 1, last_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq("id", nourCard.id);
  const lastOne = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  check("the last tampon by the code wins the gift, and says which one waits", lastOne.ok && lastOne.gift === true && typeof lastOne.waiting?.id === "number" && !!lastOne.waiting.gift, lastOne);
  const lookGift = await rpc(owner, "customer_at", { p_who: nourMe.code });
  check("looking the customer up shows the gift waiting", lookGift.ok && lookGift.waiting?.id === lastOne.waiting?.id, lookGift);
  check("…and a tampon too soon still says the gift waits", (await rpc(owner, "give_stamp", { p_who: nourMe.code })).waiting?.id === lastOne.waiting?.id);
  check("another shop cannot hand this gift over", (await rpc(shop2, "give", { p_moment: lastOne.waiting?.id })).error === "not_found");
  check("the shop hands the gift over from the collect screen", (await rpc(owner, "give", { p_moment: lastOne.waiting?.id })).ok);
  const afterGift = await rpc(owner, "customer_at", { p_who: nourMe.code });
  check("…then nothing waits, and the card starts again", afterGift.ok && afterGift.waiting === null && afterGift.card?.stamps === 0, afterGift);

  console.log("\nA tampon given by hand, taken back");
  await admin.from("cards").update({ last_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq("id", nourCard.id);
  const slip = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  check("the tampon given says which one it is", slip.ok && typeof slip.moment === "number" && slip.card.stamps === 1, slip);
  check("another shop cannot take it back", (await rpc(shop2, "unstamp", { p_moment: slip.moment })).error === "not_found");
  check("nor the customer", !!(await rpc(nour, "unstamp", { p_moment: slip.moment })).error);
  const undone = await rpc(owner, "unstamp", { p_moment: slip.moment });
  check("the shop takes it back: the card as before, the visit forgotten", undone.ok && undone.card.stamps === 0 && !(await admin.from("moments").select("id").eq("id", slip.moment).maybeSingle()).data, undone);
  check("…and once gone, it is not found", (await rpc(owner, "unstamp", { p_moment: slip.moment })).error === "not_found");
  // the tampon that filled the card: taken back, the gift it made goes with it
  await admin.from("cards").update({ stamps: (nourCard.goal ?? 0) - 1, last_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq("id", nourCard.id);
  const filled = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  const unfilled = await rpc(owner, "unstamp", { p_moment: filled.moment });
  check("the tampon that won the gift, taken back: the gift waits no more", filled.gift === true && unfilled.ok && unfilled.card.stamps === (nourCard.goal ?? 0) - 1 && !unfilled.card.waiting, [filled.card?.stamps, unfilled]);
  // ten minutes gone: too late; and only the latest tampon goes back
  await admin.from("cards").update({ stamps: 0, last_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq("id", nourCard.id);
  const old = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  await admin.from("moments").update({ created_at: new Date(Date.now() - 11 * 60_000).toISOString() }).eq("id", old.moment);
  check("ten minutes later it is too late", (await rpc(owner, "unstamp", { p_moment: old.moment })).error === "too_late");
  await admin.from("cards").update({ last_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq("id", nourCard.id);
  const newer = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  await admin.from("moments").update({ created_at: new Date(Date.now() - 60_000).toISOString() }).eq("id", old.moment);
  check("an older tampon under a newer one stays", newer.ok && (await rpc(owner, "unstamp", { p_moment: old.moment })).error === "not_last");
  check("…the newer one goes back", (await rpc(owner, "unstamp", { p_moment: newer.moment })).ok);
  await admin.from("cards").update({ stamps: 0, last_at: null }).eq("id", nourCard.id);
  await admin.from("moments").delete().eq("card_id", nourCard.id).eq("kind", "stamp");

  console.log("\nA word to the customer's phone");
  const pzEnd = "https://push.example/phone/" + "x".repeat(40);
  const pzSub = { p_endpoint: pzEnd, p_p256dh: "p".repeat(40), p_auth: "a".repeat(16) };
  const pzPhones = async () => (await admin.from("push_subs").select("id").eq("user_id", nour.id)).data.length;
  check("the phone written down", (await rpc(nour, "push_subscribe", pzSub)).ok && (await pzPhones()) === 1);
  check("…the same phone again: still one line", (await rpc(nour, "push_subscribe", pzSub)).ok && (await pzPhones()) === 1);
  check("an address that is no address is refused", (await rpc(nour, "push_subscribe", { ...pzSub, p_endpoint: "http://push.example/plain" })).error === "invalid");
  const pzShop = (await rpc(owner, "me")).shop;
  const pzPaid = (await admin.from("shops").select("paid_until").eq("id", pzShop.id).single()).data.paid_until;
  await admin.from("shops").update({ paid_until: new Date(Date.now() + 30 * 86_400_000).toISOString() }).eq("id", pzShop.id);
  const pzAgo = (days) => new Date(Date.now() - days * 86_400_000).toISOString();
  const pzDue = async () => ((await admin.rpc("push_reminders")).data ?? []).filter((d) => d.card === nourCard.id);
  await admin.from("cards").update({ stamps: 2, last_at: pzAgo(20), reminded_at: null }).eq("id", nourCard.id);
  const pzNear = await pzDue();
  check("a card on its way, quiet for twenty days: reminded, with what is left", pzNear.length === 1 && pzNear[0].kind === "near" && pzNear[0].left === (nourCard.goal ?? 0) - 2 && pzNear[0].shop === pzShop.name && pzNear[0].user_id === nour.id, pzNear);
  check("…once reminded, not again this month", (await admin.rpc("push_remembered", { p_card: nourCard.id })).data?.ok === true && (await pzDue()).length === 0);
  await admin.from("cards").update({ last_at: pzAgo(3), reminded_at: null }).eq("id", nourCard.id);
  check("three days quiet: left alone", (await pzDue()).length === 0);
  await admin.from("cards").update({ last_at: pzAgo(90), reminded_at: null }).eq("id", nourCard.id);
  check("three months quiet: left alone too", (await pzDue()).length === 0);
  await admin.from("cards").update({ last_at: pzAgo(4), reminded_at: null }).eq("id", nourCard.id);
  const { data: pzGift } = await admin.from("moments").insert({ shop_id: pzShop.id, card_id: nourCard.id, kind: "gift", gift: pzShop.gift }).select("id").single();
  const pzWait = await pzDue();
  check("a gift waiting four days: reminded of it", pzWait.length === 1 && pzWait[0].kind === "gift" && pzWait[0].gift === pzShop.gift, pzWait);
  await admin.from("shops").update({ paused: true }).eq("id", pzShop.id);
  check("a shop paused: its customers left alone", (await pzDue()).length === 0);
  await admin.from("shops").update({ paused: false }).eq("id", pzShop.id);
  check("the phone taken back: nothing to send to", (await rpc(nour, "push_unsubscribe", { p_endpoint: pzEnd })).ok && (await pzPhones()) === 0 && (await pzDue()).length === 0);
  await admin.from("moments").delete().eq("id", pzGift.id);
  await admin.from("cards").update({ stamps: 0, last_at: null, reminded_at: null }).eq("id", nourCard.id);
  await admin.from("shops").update({ paid_until: pzPaid }).eq("id", pzShop.id);

  console.log("\nThe shop chooses the wait between two tampons");
  const card0 = (await rpc(owner, "me")).shop;
  const saveWait = (gap) => rpc(owner, "save_card", { p_goal: card0.goal, p_gift: card0.gift, p_color: card0.color, p_gap: gap });
  check("a wait out of bounds is refused", (await saveWait(5000)).error === "invalid_gap");
  check("an hour by default", (await rpc(owner, "me")).shop.stamp_gap === 60);
  check("no limit: two tampons in a row", (await saveWait(0)).ok && (await rpc(owner, "give_stamp", { p_who: nourMe.code })).ok && (await rpc(owner, "give_stamp", { p_who: nourMe.code })).ok);
  await saveWait(180);
  const in3h = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  const wait3h = (Date.parse(in3h.next_at) - Date.now()) / 3_600_000;
  check("three hours typed: the next one in three hours", in3h.error === "too_soon" && wait3h > 2.9 && wait3h <= 3, in3h);
  await saveWait(1440);
  const nextDay = await rpc(owner, "give_stamp", { p_who: nourMe.code });
  const ymd = (d) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis", year: "numeric", month: "2-digit", day: "2-digit" }).format(d);
  const hhmm = (d) => new Intl.DateTimeFormat("en-GB", { timeZone: "Africa/Tunis", hour: "2-digit", minute: "2-digit", hourCycle: "h23" }).format(d);
  const dayAt = new Date(nextDay.next_at);
  check("once a day: the next one tomorrow, at midnight in Tunis", nextDay.error === "too_soon" && ymd(dayAt) === ymd(new Date(Date.now() + 86_400_000)) && hhmm(dayAt) === "00:00", [nextDay.next_at, ymd(dayAt), hhmm(dayAt)]);
  check("back to an hour", (await saveWait(60)).ok && (await rpc(owner, "me")).shop.stamp_gap === 60);

  console.log("\nChanging the card: the owner chooses for the customers on their way");
  const sh = (await rpc(owner, "me")).shop;
  // on her way: 4 tampons of a card of 6 coffees (the card she started)
  await admin.from("cards").update({ stamps: 4, goal: 6, gift: "قهوة بلاش" }).eq("id", nourCard.id);
  const preview = await rpc(owner, "card_change", { p_goal: 8, p_gift: "كرواسون بلاش" });
  check("before saving, the owner sees who is on their way", preview.ok && preview.way >= 1 && preview.win_now === 0 && preview.win_eased === 0, preview);
  // the same gift for fewer tampons reaches her anyway — and with 4 of them she wins at once, whatever the owner chooses
  const easier = await rpc(owner, "card_change", { p_goal: 3, p_gift: "قهوة بلاش" });
  check("…and who an easier card rewards at once", easier.ok && easier.eased >= 1 && easier.win_eased >= 1 && easier.win_eased <= easier.win_now && easier.way - easier.eased >= 0, easier);
  check("…a customer cannot ask it", !!(await rpc(nour, "card_change", { p_goal: 5, p_gift: "x" })).error);
  const keep = await rpc(owner, "save_card", { p_goal: 8, p_gift: "كرواسون بلاش", p_color: sh.color });
  const nourKept = (await admin.from("cards").select("goal, gift").eq("id", nourCard.id).single()).data;
  check("kept: the card they started stays theirs", keep.ok && nourKept.goal === 6 && nourKept.gift === "قهوة بلاش", nourKept);
  const moved = await rpc(owner, "save_card", { p_goal: 4, p_gift: "كرواسون بلاش", p_color: sh.color, p_move: true });
  const nourMoved = (await admin.from("cards").select("goal, gift, stamps").eq("id", nourCard.id).single()).data;
  const wonNow = await rpc(owner, "customer_at", { p_who: nourMe.code });
  check("moved: the new card now, their tampons kept, the gift at once with enough", moved.ok && moved.moved >= 1 && nourMoved.goal === 4 && nourMoved.stamps === 4 && wonNow.waiting?.gift === "كرواسون بلاش", [moved, nourMoved, wonNow.waiting]);
  check("the card back as it was", (await rpc(owner, "save_card", { p_goal: sh.goal, p_gift: sh.gift, p_color: sh.color })).ok);

  console.log("\nPaying for the year");
  const pay0 = await rpc(owner, "my_payment");
  check("a new shop is not paid yet, and its offer runs 48 hours", pay0.paid_until === null && Date.parse(pay0.offer_until) > Date.now(), pay0);
  const req = await rpc(owner, "pay_request", { p_method: "d17" });
  check("asking to pay within the offer counts 15 months", req.ok && req.months === 15, req);
  check("a way to pay that does not exist is refused", (await rpc(owner, "pay_request", { p_method: "bitcoin" })).error === "invalid");
  const req2 = await rpc(owner, "pay_request", { p_method: "virement" });
  check("one payment waits at a time (the way changes)", req2.id === req.id, req2);
  check("a customer cannot read the payments", !!(await rpc(sami, "admin_payments")).error);
  const waitingPay = ((await rpc(boss, "admin_payments")) ?? []).find((x) => x.id === req.id);
  check("the founder sees it waiting, with the shop", waitingPay?.status === "pending" && waitingPay.method === "virement" && waitingPay.shop.name === "Café Test", waitingPay);
  check("an owner cannot confirm their own payment", !!(await rpc(owner, "admin_payment_decide", { p_id: req.id, p_paid: true })).error);
  check("the founder confirms it", (await rpc(boss, "admin_payment_decide", { p_id: req.id, p_paid: true })).ok);
  const booked = ((await rpc(boss, "admin_ledger")).rows ?? []).find((r) => r.shop.id === waitingPay.shop.id);
  check("…it goes in the books: 120 د for 15 months, by transfer", booked?.amount === 120 && booked.months === 15 && booked.method === "virement", booked);
  check("…and the owner's home says it once", (await rpc(owner, "my_payment")).grant?.months === 15);
  check("a customer cannot read the books", !!(await rpc(sami, "admin_ledger")).error);
  const pay1 = await rpc(owner, "my_payment");
  const monthsPaid = (Date.parse(pay1.paid_until) - Date.now()) / (30.44 * 86_400_000);
  check("…the year starts: paid for about 15 months", monthsPaid > 14.5 && monthsPaid < 15.5, pay1.paid_until);
  check("a payment decided cannot be decided again", (await rpc(boss, "admin_payment_decide", { p_id: req.id, p_paid: false })).error === "done");
  check("the offer is a one-time note", (await rpc(owner, "see", { p_key: "offer" })).ok);

  console.log("\nThe founder's hand on a shop's year (access turned on by hand), and its card");
  const planShop = (await rpc(owner, "me")).shop;
  const before = (await rpc(owner, "my_payment")).paid_until;
  check("an owner cannot turn his own access on", !!(await rpc(owner, "admin_plan", { p_shop: planShop.id, p_kind: "paid", p_months: 24 })).error);
  check("months out of bounds are refused", (await rpc(boss, "admin_plan", { p_shop: planShop.id, p_kind: "paid", p_months: 500 })).error === "invalid");
  check("nothing is a gift any more", (await rpc(boss, "admin_plan", { p_shop: planShop.id, p_kind: "gift", p_months: 12 })).error === "invalid");
  const gave = await rpc(boss, "admin_plan", { p_shop: planShop.id, p_kind: "paid", p_months: 24, p_note: "يعيشك", p_show: true, p_method: "d17", p_amount: 120 });
  const yearsMore = (Date.parse(gave.paid_until) - Date.parse(before)) / (365.25 * 86_400_000);
  check("paid by hand, 2 years turned on add onto the year already paid", gave.ok && yearsMore > 1.95 && yearsMore < 2.05, [before, gave.paid_until]);
  const told = (await rpc(owner, "my_payment")).grant;
  check("…and the owner's home says it once, with how it was paid and the founder's word", told?.kind === "paid" && told.months === 24 && told.method === "d17" && told.note === "يعيشك", told);
  check("…seen, it is not said again (nor the older one)", (await rpc(owner, "plan_seen", { p_id: told.id })).ok && !(await rpc(owner, "my_payment")).grant);
  const shopView = await rpc(boss, "admin_shop", { p_id: planShop.id });
  check("the console shows the year and its story", shopView.plan?.paid === true && shopView.plan.log[0]?.kind === "paid" && shopView.plan.log[0].method === "d17" && shopView.plan.log[0].amount === 120 && !!shopView.plan.log[0].seen, shopView.plan);
  check("a sum out of bounds is refused", (await rpc(boss, "admin_plan", { p_shop: planShop.id, p_kind: "paid", p_months: 12, p_amount: -5 })).error === "invalid");
  const added = await rpc(boss, "admin_plan", { p_shop: planShop.id, p_kind: "paid", p_months: 12, p_amount: 0, p_method: "cash", p_show: false });
  const books = await rpc(boss, "admin_ledger");
  const ours = (books.rows ?? []).filter((r) => r.shop.id === planShop.id);
  check("the books: 120 د for 2 years by D17, then a year added with no money (so no way)", added.ok && ours[0]?.amount === 0 && ours[0].method === null && ours[0].months === 12 && ours[1]?.amount === 120 && ours[1].method === "d17", ours.slice(0, 2));
  check("…what came in is counted this month, and the months added with no money", books.month >= 240 && books.all >= 240 && books.extra_months >= 12, books);
  const until = new Date(Date.now() + 40 * 86_400_000).toISOString();
  check("an end date set by the founder", (await rpc(boss, "admin_plan", { p_shop: planShop.id, p_kind: "until", p_until: until, p_show: false })).ok && Math.abs(Date.parse((await rpc(owner, "my_payment")).paid_until) - Date.parse(until)) < 60_000);
  check("…unticked, nothing to say to the owner", !(await rpc(owner, "my_payment")).grant);
  check("the year stopped now", (await rpc(boss, "admin_plan", { p_shop: planShop.id, p_kind: "end" })).ok && (await rpc(owner, "my_payment")).paid === false);

  console.log("\nThe books: the founder's own lines, both sides");
  const tunisDay = (ms = 0) => new Intl.DateTimeFormat("en-CA", { timeZone: "Africa/Tunis" }).format(new Date(Date.now() + ms));
  const near = (a, b) => Math.abs(a - b) < 0.0005;
  const booksBefore = await rpc(boss, "admin_ledger");
  const spent = await rpc(boss, "admin_book_add", { p_side: "out", p_what: "  سبونسور   فيسبوك ", p_amount: 47.3504, p_kind: "ads" });
  const longAgo = await rpc(boss, "admin_book_add", { p_side: "out", p_what: "طباعة ستيكرات", p_amount: 30, p_on: "2025-03-10", p_kind: "print" });
  const oddKind = await rpc(boss, "admin_book_add", { p_side: "out", p_what: "قهوة مع كليان", p_amount: 4.5, p_kind: "sub" });
  const earned = await rpc(boss, "admin_book_add", { p_side: "in", p_what: "خدمة طباعة لمحل", p_amount: 50, p_kind: "service" });
  for (const x of [spent, longAgo, oddKind, earned]) if (x.id) expensesMade.push(x.id);
  const booksAfter = await rpc(boss, "admin_ledger");
  const line = (id) => (booksAfter.lines ?? []).find((e) => e.id === id);
  check("an expense noted: today in Tunis, its words tidied, three figures after the point", spent.ok && line(spent.id)?.side === "out" && line(spent.id).on === tunisDay() && line(spent.id).what === "سبونسور فيسبوك" && line(spent.id).amount === 47.35 && line(spent.id).kind === "ads", line(spent.id));
  check("…counted this month and this year", near(booksAfter.out_month - booksBefore.out_month, 51.85) && near(booksAfter.out_year - booksBefore.out_year, 51.85), [booksBefore.out_month, booksAfter.out_month, booksAfter.out_year]);
  check("…a day long gone keeps its day: in the total, out of this year", longAgo.ok && line(longAgo.id)?.on === "2025-03-10" && near(booksAfter.out_all - booksBefore.out_all, 81.85), [line(longAgo.id), booksAfter.out_all]);
  check("…a kind of the other side is «other»", oddKind.ok && line(oddKind.id)?.kind === "other", line(oddKind.id));
  check("a line of what came in, written by hand, counts with the subscriptions", earned.ok && line(earned.id)?.side === "in" && line(earned.id).kind === "service" && near(booksAfter.month - booksBefore.month, 50) && near(booksAfter.year - booksBefore.year, 50) && near(booksAfter.all - booksBefore.all, 50), [line(earned.id), booksBefore.month, booksAfter.month]);
  check("…the newest day first, and today's date comes with the books", booksAfter.today === tunisDay() && booksAfter.lines.findIndex((e) => e.id === longAgo.id) > booksAfter.lines.findIndex((e) => e.id === spent.id), booksAfter.today);
  check(
    "nothing, a word too short, a day to come, a side that is neither: refused",
    (await rpc(boss, "admin_book_add", { p_side: "out", p_what: "حاجة", p_amount: 0 })).error === "invalid" &&
      (await rpc(boss, "admin_book_add", { p_side: "out", p_what: "x", p_amount: 5 })).error === "invalid" &&
      (await rpc(boss, "admin_book_add", { p_side: "out", p_what: "غدوة", p_amount: 5, p_on: tunisDay(2 * 86_400_000) })).error === "invalid" &&
      (await rpc(boss, "admin_book_add", { p_side: "both", p_what: "حاجة", p_amount: 5 })).error === "invalid",
  );
  check("an owner cannot write in the books, nor a customer take a line back", !!(await rpc(owner, "admin_book_add", { p_side: "out", p_what: "حاجة", p_amount: 5 })).error && !!(await rpc(sami, "admin_book_delete", { p_id: spent.id })).error);
  const { data: robotLine } = await admin.from("books").select("robot").eq("id", spent.id).single();
  check("a script's line is marked: the founder's books never show it", robotLine?.robot === true, robotLine);
  check("a line taken back leaves the books", (await rpc(boss, "admin_book_delete", { p_id: spent.id })).ok && !((await rpc(boss, "admin_ledger")).lines ?? []).some((e) => e.id === spent.id));
  check("…twice is not found", (await rpc(boss, "admin_book_delete", { p_id: spent.id })).error === "not_found");
  check("the founder edits a shop's card with the owner's rules", (await rpc(boss, "admin_save_card", { p_shop: planShop.id, p_goal: planShop.goal, p_gift: planShop.gift, p_gap: 60 })).ok);
  check("…and its name", (await rpc(boss, "admin_shop_edit", { p_shop: planShop.id, p_name: planShop.name, p_kind: planShop.kind })).ok);
  check("a kind that does not exist is refused", (await rpc(boss, "admin_shop_edit", { p_shop: planShop.id, p_name: planShop.name, p_kind: "spaceship" })).error === "invalid_kind");
  check("an owner cannot edit another way round the rules", !!(await rpc(owner, "admin_save_card", { p_shop: planShop.id, p_goal: 3, p_gift: "x x", p_gap: 0 })).error);
  check("the card's inner rule is nobody's to call", !!(await rpc(owner, "card_apply", { p_shop: planShop.id, p_goal: 3, p_gift: "x x", p_color: null, p_gap: 0, p_move: false })).error);

  console.log("\nThe traffic: a visit from an ad, its screens, its taps");
  const vid = randomUUID();
  const welcome = randomUUID();
  const ownerDoor = randomUUID();
  visitsMade.push(vid);
  const at = (s) => new Date(Date.now() - s * 1000).toISOString();
  const visit = { id: vid, visitor: "testvisitor0001", landing: "/?utm_source=facebook&utm_campaign=test-campaign", source: "facebook", campaign: "test-campaign", fbclid: true, device: "phone", os: "Android", browser: "Facebook", screen: "390x844", lang: "ar-TN", country: "TN", city: "Sfax" };
  const first = await admin.rpc("track", {
    p: {
      visit,
      views: [{ id: welcome, path: "/", route: "/", screen: "welcome", entered_at: at(30), left_at: null, active_ms: 4200, vw: 390, vh: 844, next: null }],
      taps: [
        { view: welcome, at: at(26), x: 0.13, y: 0.52, target: null, kind: null, rage: false, dead: true, external: false },
        { view: welcome, at: at(25), x: 0.5, y: 0.76, target: "ادخل كمولى محل", kind: "a", rage: false, dead: false, external: false },
      ],
      signals: [{ view: welcome, route: "/", screen: "welcome", at: at(28), name: "video", detail: "كيفاش تخدم Pointili؟" }],
    },
  });
  check("the beacon's door writes the visit, a screen, two taps and a signal", !first.error, first.error?.message);
  const later = await admin.rpc("track", {
    p: {
      visit,
      views: [
        { id: welcome, path: "/", route: "/", screen: "welcome", entered_at: at(30), left_at: at(24), active_ms: 6000, vw: 390, vh: 844, next: "/shop/new" },
        { id: ownerDoor, path: "/shop/new", route: "/shop/new", screen: null, entered_at: at(24), left_at: null, active_ms: 1500, vw: 390, vh: 844, next: null },
      ],
      taps: [],
      signals: [{ view: ownerDoor, route: "/shop/new", screen: null, at: at(10), name: "form_error", detail: "join-owner · password · short" }],
    },
  });
  check("a later batch carries on the same visit", !later.error, later.error?.message);
  const intruder = await sami.client.rpc("track", { p: { visit: { ...visit, id: randomUUID() } } });
  check("a browser cannot write traffic itself", !!intruder.error);
  const tr = await rpc(boss, "admin_traffic", { p_days: 1, p_all: false });
  check("the founder sees the visit from the ad, with its campaign", tr.sources?.some((x) => x.source === "facebook" && x.campaign === "test-campaign"), tr.sources);
  check("…the welcome then the owner's door, in the funnel", tr.funnel?.owner[0].visits >= 1 && tr.funnel.owner[1].visits >= 1, tr.funnel);
  const welcomeRow = tr.pages?.find((x) => x.route === "/" && x.screen === "welcome");
  check("…the welcome screen with its taps", welcomeRow?.taps >= 2, welcomeRow);
  check("…the refused form among what happened", tr.signals?.some((x) => x.name === "form_error"), tr.signals);
  const trail = tr.recent?.find((x) => x.id === vid);
  check("…the visit's trail: welcome → /shop/new, 7.5 seconds", trail?.trail?.join(" → ") === "/:welcome → /shop/new" && Number(trail.ms) === 7500, trail);
  const one = await rpc(boss, "admin_visit", { p_id: vid });
  check("one visit step by step: the later batch updated the welcome (6s, then /shop/new)", one.views?.length === 2 && one.views[0].ms === 6000 && one.views[0].taps.length === 2 && one.signals.length === 2, one.views);
  check("…the visitor's own id never leaves the database", one.visit && !("visitor" in one.visit), one.visit);
  const heat = await rpc(boss, "admin_heat", { p_route: "/", p_screen: "welcome", p_days: 1, p_all: false });
  check("the welcome's heat: the tap where it landed, and the dead one marked", heat.taps?.some(([x, y, f]) => x === 0.5 && y === 0.76 && f === 0) && heat.taps.some(([, , f]) => f === 1), heat.taps?.slice(0, 4));
  check("…what was tapped, by its words", heat.top?.some((x) => x.target === "ادخل كمولى محل" && x.n >= 1), heat.top);
  const mine = randomUUID();
  visitsMade.push(mine);
  await admin.rpc("track", { p: { visit: { ...visit, id: mine, is_admin: true }, views: [], taps: [], signals: [] } });
  const without = await rpc(boss, "admin_traffic", { p_days: 1, p_all: false });
  const withMine = await rpc(boss, "admin_traffic", { p_days: 1, p_all: true });
  check("the founder's own visits stay out unless asked", !without.recent.some((x) => x.id === mine) && withMine.recent.some((x) => x.id === mine));
  check("a customer cannot read the traffic", !!(await rpc(sami, "admin_traffic", { p_days: 1, p_all: false })).error && !!(await rpc(sami, "admin_heat", { p_route: "/", p_screen: "welcome", p_days: 1, p_all: false })).error && !!(await rpc(sami, "admin_visit", { p_id: vid })).error);
  check("an owner cannot read the traffic", !!(await rpc(owner, "admin_traffic", { p_days: 7, p_all: true })).error);
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
} finally {
  for (const id of visitsMade) await admin.from("visits").delete().eq("id", id);
  for (const id of newsMade) await admin.from("news").delete().eq("id", id);
  for (const id of expensesMade) await admin.from("books").delete().eq("id", id);
  if (settingsBefore) {
    await admin.from("settings").delete().neq("key", "");
    if (settingsBefore.length) await admin.from("settings").insert(settingsBefore);
  }
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${users.length} accounts)`);
  if (failed.length) process.exit(1);
}
