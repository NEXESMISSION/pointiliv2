/**
 * The systems separated, and the golden ticket (supabase/systems-2026-11-08.sql), against the real
 * database: the founder's two new switches (the link on for every shop, the golden ticket off), a
 * draw made, its rules refused when they are broken, customers in its pool by their tampons, the
 * moment past — the first look draws, once, never the same customer twice — the winners told on their
 * cards, the prizes handed over, a draw called off, the rule «every customer once». Its own throwaway
 * accounts, on the robots list first, removed at the end, pass or fail. No shop of anyone's is touched.
 *
 *   node scripts/draw.mjs          (from v2/)
 */
import { randomBytes } from "node:crypto";
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
  // signed in as the app signs in: «me» writes the person's number down from the login
  await client.rpc("me");
  await client.rpc("set_name", { p_name: name });
  return { id: data.user.id, client, digits };
}
const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  return error ? { error: error.message } : data;
};
// a tampon from the counter: the owner's code, scanned by the customer
const tampon = async (owner, customer) => {
  const code = await rpc(owner, "new_code");
  return rpc(customer, "stamp", { p_token: code.token });
};
// the server's clock, never this computer's (it runs minutes behind: memory «test-clock-skew»)
const later = (hours) => new Date(Date.now() + hours * 3600_000).toISOString();
// the moment of a draw moved to just now, by the database's own clock: as if Monday 8:00 had come
const comeNow = (id) => sql(`update public.draws set draw_at = greatest(now(), starts_at + interval '1 millisecond') where id = '${id}'`);

try {
  console.log("\nA shop, its card, and three customers");
  const owner = await person("Draw Owner");
  check("the shop opens", (await rpc(owner, "open_shop", { p_name: "Café Draw", p_kind: "cafe" })).ok);
  // no wait between two tampons: one customer can take several in a row
  check("its card, no wait between tampons", (await rpc(owner, "save_card", { p_goal: 10, p_gift: "قهوة بلاش", p_color: "#6c47ff", p_gap: 0 })).ok);
  const shop = (await rpc(owner, "me")).shop;
  const amine = await person("Amine");
  const sara = await person("Sara");
  const omar = await person("Omar");
  // Omar has a card from before the draw, and no tampon in it
  check("Omar's card, before any draw", (await tampon(owner, omar)).ok);

  console.log("\nThe founder's switches: as they were for every shop");
  const sys0 = await rpc(owner, "my_systems");
  check("the link: on, as for every shop", sys0?.links === true, sys0);
  check("the golden ticket: off until the founder turns it on", sys0?.draw === false && sys0.draw_open === null, sys0);
  check("a draw is refused while it is off", (await rpc(owner, "draw_new", { p_title: "", p_at: later(2), p_rule: "stamps", p_gifts: [{ name: "x", n: 1 }] })).error === "not_allowed");
  check("an owner cannot turn it on himself", !!(await rpc(owner, "admin_set_system", { p_id: shop.id, p_key: "draw", p_on: true })).error);
  const boss = await person("Draw Boss");
  await admin.from("people").update({ is_admin: true }).eq("id", boss.id);
  check("the founder sees the shop's systems", (await rpc(boss, "admin_systems", { p_id: shop.id }))?.draw === false);
  check("a system that does not exist is refused", (await rpc(boss, "admin_set_system", { p_id: shop.id, p_key: "rocket", p_on: true })).error === "invalid");
  check("the founder turns the golden ticket on", (await rpc(boss, "admin_set_system", { p_id: shop.id, p_key: "draw", p_on: true })).ok);
  check("…and the owner's screens know it", (await rpc(owner, "my_systems"))?.draw === true);
  check("the founder takes the link away…", (await rpc(boss, "admin_set_system", { p_id: shop.id, p_key: "links", p_on: false })).ok && (await rpc(owner, "my_systems"))?.links === false);
  check("…and gives it back", (await rpc(boss, "admin_set_system", { p_id: shop.id, p_key: "links", p_on: true })).ok && (await rpc(owner, "my_systems"))?.links === true);

  console.log("\nA draw: its rules");
  const gifts = [{ name: "التذكرة الذهبية", n: 1 }, { name: "قهوة", n: 1 }];
  check("a moment too soon is refused", (await rpc(owner, "draw_new", { p_title: "", p_at: later(0.05), p_rule: "stamps", p_gifts: gifts })).error === "bad_time");
  check("a moment too far is refused", (await rpc(owner, "draw_new", { p_title: "", p_at: later(24 * 100), p_rule: "stamps", p_gifts: gifts })).error === "bad_time");
  check("no gift: refused", (await rpc(owner, "draw_new", { p_title: "", p_at: later(2), p_rule: "stamps", p_gifts: [] })).error === "bad_gifts");
  check("no gift list at all: refused (not a draw with nothing to win)", (await rpc(owner, "draw_new", { p_title: "", p_at: later(2), p_rule: "stamps", p_gifts: null })).error === "bad_gifts");
  check("a gift of 0 winners: refused", (await rpc(owner, "draw_new", { p_title: "", p_at: later(2), p_rule: "stamps", p_gifts: [{ name: "x", n: 0 }] })).error === "bad_gifts");
  check("a rule that does not exist: refused", (await rpc(owner, "draw_new", { p_title: "", p_at: later(2), p_rule: "all", p_gifts: gifts })).error === "invalid");
  const d1 = await rpc(owner, "draw_new", { p_title: "سحب التجربة", p_at: later(48), p_rule: "stamps", p_gifts: gifts });
  check("the draw is made", d1?.ok && !!d1.id, d1);
  check("a second one while it waits: refused", (await rpc(owner, "draw_new", { p_title: "", p_at: later(3), p_rule: "stamps", p_gifts: gifts })).error === "one_open");
  check("a customer cannot make one (no shop)", (await rpc(amine, "draw_new", { p_title: "", p_at: later(2), p_rule: "stamps", p_gifts: gifts })).error === "no_shop");

  console.log("\nThe customers come: a tampon, a ticket");
  for (let i = 0; i < 3; i++) await tampon(owner, amine);
  await tampon(owner, sara);
  const own = await rpc(owner, "my_draw");
  check("the owner sees the pool grow: 2 customers, 4 tickets (Omar's card has no tampon in it)", own.open?.people === 2 && own.open.tickets === 4, own.open);
  check("…and who is in it, the most tickets first, numbers masked", own.open?.pool?.[0]?.name === "Amine" && own.open.pool[0].tickets === 3 && own.open.pool[1]?.name === "Sara" && /•••/.test(own.open.pool[0].phone ?? ""), own.open?.pool);
  const amineCard = (await rpc(amine, "wallet")).find((c) => c.shop.id === shop.id).id;
  const saraCard = (await rpc(sara, "wallet")).find((c) => c.shop.id === shop.id).id;
  const omarCard = (await rpc(omar, "wallet")).find((c) => c.shop.id === shop.id).id;
  const other = await person("Other Owner");
  await rpc(other, "open_shop", { p_name: "Other Shop", p_kind: "cafe" });
  const a1 = await rpc(amine, "card_draw", { p_card: amineCard });
  check("Amine's card: the draw, its countdown, his 3 tickets", a1?.open?.id === d1.id && a1.open.mine === 3 && a1.open.gifts.length === 2 && a1.last === null, a1);
  check("Omar's card: the draw, no ticket yet", (await rpc(omar, "card_draw", { p_card: omarCard }))?.open?.mine === 0);
  check("nobody reads another's card", (await rpc(sara, "card_draw", { p_card: amineCard })) === null);
  const w1 = await rpc(amine, "my_draws");
  check("the wallet: a golden line on Amine's card", Array.isArray(w1) && w1.some((x) => x.card === amineCard && x.draw_at && x.won === 0), w1);

  console.log("\nThe moment comes: the first look draws, once");
  await comeNow(d1.id);
  const a2 = await rpc(amine, "card_draw", { p_card: amineCard });
  check("drawn at Amine's look: no draw waiting, the last one is there", a2?.open === null && a2.last?.id === d1.id && a2.last.people === 2, a2);
  const own2 = await rpc(owner, "my_draw");
  const wins = own2.wins.filter((w) => w.draw === d1.id);
  check("two winners for two gifts", wins.length === 2, own2.wins);
  check("never the same customer twice", new Set(wins.map((w) => w.card)).size === 2);
  check("Omar, with no ticket, won nothing", !wins.some((w) => w.card === omarCard));
  check("the pool kept: 2 customers, 4 tickets", own2.last?.people === 2 && own2.last.tickets === 4, own2.last);
  check("the owner sees names and the end of their numbers only", wins.every((w) => w.name && /•••/.test(w.phone ?? "")), wins);
  const again = (await sql(`select public.draw_settle('${shop.id}') as n`))[0].n;
  check("a second look draws nothing again", again === 0, again);
  check("…and the winners are the same", (await rpc(owner, "my_draw")).wins.filter((w) => w.draw === d1.id).map((w) => w.id).join() === wins.map((w) => w.id).join());
  const a3 = await rpc(amine, "card_draw", { p_card: amineCard });
  check("Amine's card says what he won, and it waits for him", a3.last.won.length === 1 && a3.waiting.length === 1 && a3.waiting[0].gift === a3.last.won[0].gift, a3);
  check("the wallet says he won", (await rpc(amine, "my_draws")).some((x) => x.card === amineCard && x.won === 1));
  const o3 = await rpc(omar, "card_draw", { p_card: omarCard });
  check("Omar's card: the result, nothing won, nothing waiting", o3.last?.won.length === 0 && o3.waiting.length === 0 && o3.last.mine === 0, o3);

  console.log("\nThe prizes handed over");
  console.log("\nThe counter reads a winner's code");
  const amineWin = wins.find((w) => w.card === amineCard);
  const amineCode = (await rpc(amine, "me")).code;
  const atCounter = await rpc(owner, "draw_wins_at", { p_who: amineCode });
  check("his code at the counter: his prize, its number", atCounter.ok && atCounter.wins.length === 1 && atCounter.wins[0].id === amineWin.id, atCounter);
  check("…and by his number too", (await rpc(owner, "draw_wins_at", { p_who: amine.digits })).wins.length === 1);
  check("Omar's code: nothing", (await rpc(owner, "draw_wins_at", { p_who: (await rpc(omar, "me")).code })).wins.length === 0);
  check("another shop reading his code sees nothing of this one", (await rpc(other, "draw_wins_at", { p_who: amineCode })).wins.length === 0);
  check("a customer cannot ask", (await rpc(amine, "draw_wins_at", { p_who: amineCode })).error === "no_shop");
  check("the owner's systems count the prizes waiting", (await rpc(owner, "my_systems")).wins === 2);
  check("a customer cannot hand a prize over", (await rpc(amine, "draw_give", { p_win: amineWin.id })).error === "no_shop");
  check("another shop cannot hand it over", (await rpc(other, "draw_give", { p_win: amineWin.id })).error === "not_found");
  check("the owner hands it over", (await rpc(owner, "draw_give", { p_win: amineWin.id })).ok);
  check("…once", (await rpc(owner, "draw_give", { p_win: amineWin.id })).already === true);
  const a4 = await rpc(amine, "card_draw", { p_card: amineCard });
  check("Amine's card: taken, nothing waits", a4.waiting.length === 0 && a4.last.won[0].given === true, a4);
  const card = (await rpc(amine, "card", { p_id: amineCard }));
  check("his card itself is untouched: 3 tampons, no gift of the card's own", card.stamps === 3 && card.waiting === false, { stamps: card.stamps, waiting: card.waiting });

  console.log("\nA draw called off, and the founder's switch off");
  const d2 = await rpc(owner, "draw_new", { p_title: "", p_at: later(24), p_rule: "stamps", p_gifts: gifts });
  check("a new draw once the last is drawn", d2?.ok, d2);
  check("another owner cannot call it off", (await rpc(other, "draw_cancel", { p_id: d2.id })).error === "not_found");
  check("its owner calls it off", (await rpc(owner, "draw_cancel", { p_id: d2.id })).ok);
  check("…the customers see it no more", (await rpc(amine, "card_draw", { p_card: amineCard }))?.open === null);
  const d3 = await rpc(owner, "draw_new", { p_title: "", p_at: later(24), p_rule: "stamps", p_gifts: gifts });
  check("the founder's switch off calls off the draw waiting", (await rpc(boss, "admin_set_system", { p_id: shop.id, p_key: "draw", p_on: false })).ok
    && (await sql(`select status from public.draws where id = '${d3.id}'`))[0].status === "cancelled");
  check("…and no new one can be made", (await rpc(owner, "draw_new", { p_title: "", p_at: later(24), p_rule: "stamps", p_gifts: gifts })).error === "not_allowed");

  console.log("\nThe rule «every customer once»");
  await rpc(boss, "admin_set_system", { p_id: shop.id, p_key: "draw", p_on: true });
  const d4 = await rpc(owner, "draw_new", { p_title: "", p_at: later(24), p_rule: "cards", p_gifts: [{ name: "كيك", n: 5 }] });
  check("a draw for every customer", d4?.ok, d4);
  check("every card is in it once: 3 customers, 3 tickets", (await rpc(owner, "my_draw")).open?.tickets === 3);
  check("Omar is in it without a new tampon", (await rpc(omar, "card_draw", { p_card: omarCard }))?.open?.mine === 1);
  await comeNow(d4.id);
  const own4 = await rpc(owner, "my_draw");
  const w4 = own4.wins.filter((w) => w.draw === d4.id);
  check("5 gifts, 3 customers: each of the 3 wins one, the rest are nobody's", w4.length === 3 && new Set(w4.map((w) => w.card)).size === 3, w4);

  console.log("\nThe winners told on their phones, once");
  const told = (await sql("select public.draw_tell() as v"))[0].v;
  check("the draws just made: each prize waiting is a winner to tell", Array.isArray(told) && told.filter((x) => x.draw === d4.id).length === 3, told?.length);
  check("…told once: asked again, nobody", (await sql("select public.draw_tell() as v"))[0].v.length === 0);
  check("an account cannot ask who won (the server's own key only)", !!(await rpc(owner, "draw_tell")).error && !!(await rpc(owner, "draw_settle_all")).error);
  // a draw whose moment came with nobody looking since: the daily job makes it, then tells its winner
  const d5 = await rpc(owner, "draw_new", { p_title: "", p_at: later(24), p_rule: "cards", p_gifts: [{ name: "قهوة", n: 1 }] });
  await comeNow(d5.id);
  const settled = (await sql("select public.draw_settle_all() as n"))[0].n;
  check("the daily job makes a draw nobody looked at", settled >= 1 && (await sql(`select status from public.draws where id = '${d5.id}'`))[0].status === "drawn", settled);
  check("…and its winner is told", (await sql("select public.draw_tell() as v"))[0].v.some((x) => x.draw === d5.id));

  console.log("\nA shop with no draw: nothing at all");
  const plain = await person("Plain Customer");
  const code = await rpc(other, "save_card", { p_goal: 5, p_gift: "x x", p_color: "#6c47ff" });
  check("another shop's card", code.ok && (await tampon(other, plain)).ok);
  const plainCard = (await rpc(plain, "wallet"))[0].id;
  check("its card has no golden ticket (null)", (await rpc(plain, "card_draw", { p_card: plainCard })) === null);
  check("its wallet has no golden line", (await rpc(plain, "my_draws")).length === 0);
  const sysOther = await rpc(other, "my_systems");
  check("its owner's systems: the link on, the golden ticket off", sysOther?.ok === true && sysOther.links === true && sysOther.draw === false && sysOther.draw_open === null, sysOther);
  const all = await rpc(boss, "admin_systems_all");
  check("the console's «الأنظمة»: every shop with its systems (a robot founder sees the robots' shops)", Array.isArray(all) && all.some((x) => x.id === shop.id && x.draw === true && x.links === true && x.card === true), all.length);
  check("…an owner cannot read it", !!(await rpc(owner, "admin_systems_all")).error);
  const anon = createClient(URL_, ANON, { auth: { persistSession: false } });
  check("a visitor without an account calls none of it", !!(await anon.rpc("my_systems")).error && !!(await anon.rpc("card_draw", { p_card: plainCard })).error);
} finally {
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${users.length} accounts)`);
  if (failed.length) process.exit(1);
}
