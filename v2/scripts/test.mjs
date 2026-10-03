/**
 * Every rule of v2/supabase/schema.sql, through the same functions the app
 * calls, with throwaway accounts that are deleted at the end, pass or fail.
 *
 *   node scripts/test.mjs        (from v2/)
 */
import { randomBytes, randomUUID } from "node:crypto";
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
// the founder's settings are real (production shares this database): put back as they were
let settingsBefore = null;
const visitsMade = [];

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
  check("a card of 30 stamps (typed by hand) is fine", (await rpc(owner, "save_card", { p_goal: 30, p_gift: "قهوة بلاش", p_color: "#6c47ff" })).ok && (await rpc(owner, "save_card", { p_goal: 5, p_gift: "قهوة بلاش", p_color: "#6c47ff" })).ok);
  check("a new shop has no logo", me.shop.logo === null, me.shop);
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
  check("an owner cannot change the settings", !!(await rpc(owner, "admin_set_setting", { p_key: "support_phone", p_value: "1" })).error);
  check("a browser cannot read the settings table", ((await sami.client.from("settings").select("key")).data ?? []).length === 0);

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
  if (settingsBefore) {
    await admin.from("settings").delete().neq("key", "");
    if (settingsBefore.length) await admin.from("settings").insert(settingsBefore);
  }
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${users.length} accounts)`);
  if (failed.length) process.exit(1);
}
