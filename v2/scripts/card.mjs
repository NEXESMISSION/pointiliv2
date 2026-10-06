/**
 * Changing the card, every way it can go, in a phone. A robot owner whose card
 * is 12 tampons for «عصير بلاش», and customers in the middle of that card; each
 * case starts from that same state. Pictures land in v2/shots/card.
 *
 *   node scripts/card.mjs                 (from v2/, with the dev server on :3200)
 *   ONLY=keep,move node scripts/card.mjs  (some cases only)
 */
//   colour     only the colour changes                → saved at once, no sheet
//   nobody     the goal changes, nobody on their way   → saved at once, no sheet
//   eased      12 → 3, same gift, a customer has 4     → the sheet says who wins now; saved
//   keep/move  12 → 3 and another gift, one customer   → the one question; each answer does what it says
//   many       the same with three customers           → the question in the plural
//   deaf       the answer never comes back, card saved → the screen finds out by itself and goes on
//   lost       the save never reaches the server       → «الكارط ما تسجّلتش», and a way to try again
import { randomBytes } from "node:crypto";
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const ONLY = (process.env.ONLY || "").split(",").filter(Boolean);
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push"];
const password = randomBytes(9).toString("base64url");
const made = [], phones = [];
mkdirSync("shots/card", { recursive: true });
let bad = 0;
const check = (name, ok, extra) => { if (!ok) bad++; console.log(`${ok ? "  ok " : "  BAD"} ${name}${ok || extra === undefined ? "" : " · " + JSON.stringify(extra)}`); };

async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  return { id: data.user.id, digits: d };
}

const OLD = { goal: 12, gift: "عصير بلاش", color: "#FF6B4A", stamp_gap: 60 };
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
try {
  const owner = await person("Robot owner");
  const { data: shop } = await admin.from("shops").insert({ owner_id: owner.id, name: "Robot juice", kind: "juice", ...OLD, paid_until: new Date(Date.now() + 9e9).toISOString() }).select("*").single();
  const clients = [];
  for (const n of ["Saif", "Nour", "Rania"]) clients.push(await person(n));

  /** The shop back to its old card, and `n` customers with 4 tampons of it. */
  async function reset(n) {
    await admin.from("cards").delete().eq("shop_id", shop.id);
    await admin.from("shops").update(OLD).eq("id", shop.id);
    const cards = [];
    for (const c of clients.slice(0, n)) {
      const { data: card } = await admin.from("cards").insert({ shop_id: shop.id, user_id: c.id, stamps: 4, goal: OLD.goal, gift: OLD.gift }).select("id").single();
      await admin.from("moments").insert({ shop_id: shop.id, card_id: card.id, kind: "stamp" });
      cards.push(card.id);
    }
    return cards;
  }
  const state = async (cards) => ({
    shop: (await admin.from("shops").select("goal, gift, color, stamp_gap").eq("id", shop.id).single()).data,
    cards: cards.length ? (await admin.from("cards").select("stamps, goal, gift").in("id", cards)).data : [],
    gifts: cards.length ? (await admin.from("moments").select("gift").in("card_id", cards).eq("kind", "gift")).data.length : 0,
  });

  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message.slice(0, 200)));
  await p.goto(BASE + "/login", { waitUntil: "load" });
  await p.locator('input[name="phone"]').fill(owner.digits);
  await p.locator('input[name="password"]').fill(password);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }), p.locator('button[type="submit"]').click()]);

  const next = async () => { await p.getByRole("button", { name: "كمّل", exact: true }).click(); await p.waitForTimeout(450); };
  /** Walk the four questions with these changes, stop on the last step. */
  async function edit({ goal, gift, color }) {
    await p.goto(BASE + "/shop/card", { waitUntil: "load" });
    await p.addStyleTag({ content: "nextjs-portal{display:none!important}" });
    if (goal) await p.locator('input[inputmode="numeric"]').first().fill(String(goal), { timeout: 20000 });
    await next();
    if (gift) await p.getByRole("textbox").first().fill(gift);
    await next();
    await next();
    if (color) await p.getByRole("button", { name: color, exact: true }).click();
    await next();
  }
  const save = () => p.getByRole("button", { name: "سجّل", exact: true }).first().click();
  const home = (ms = 15000) => p.waitForURL((u) => u.pathname === "/shop", { timeout: ms }).then(() => true).catch(() => false);
  const sheet = p.getByRole("dialog");
  const want = (name) => !ONLY.length || ONLY.includes(name);

  if (want("colour")) {
    console.log("\ncolour: only the colour changes");
    const cards = await reset(1);
    await edit({ color: "#1D5FA8" });
    const t0 = Date.now();
    await save();
    const ok = await home();
    const s = await state(cards);
    check(`saved at once, no sheet (${Date.now() - t0} ms)`, ok && s.shop.color === "#1D5FA8" && s.cards[0].goal === 12, s);
  }

  if (want("nobody")) {
    console.log("\nnobody: the goal changes and nobody is on their way");
    await reset(0);
    await edit({ goal: 5 });
    const t0 = Date.now();
    await save();
    const ok = await home();
    const s = await state([]);
    check(`saved at once, no sheet (${Date.now() - t0} ms)`, ok && s.shop.goal === 5, s);
  }

  if (want("eased")) {
    console.log("\neased: 12 → 3 for the same gift, and a customer already has 4");
    const cards = await reset(1);
    await edit({ goal: 3 });
    await save();
    await sheet.waitFor({ timeout: 15000 });
    await p.waitForTimeout(600);
    await p.screenshot({ path: "shots/card/eased.png" });
    const said = (await sheet.textContent()).replace(/\s+/g, " ");
    check("the sheet says who wins now, and asks nothing", said.includes("حريف واحد يربح الكادو توّا") && (await sheet.getByRole("radio").count()) === 0, said);
    await sheet.getByRole("button", { name: "سجّل", exact: true }).click();
    const ok = await home();
    const s = await state(cards);
    check("saved: the easier card is theirs, the gift waits", ok && s.shop.goal === 3 && s.cards[0].goal === 3 && s.gifts === 1, s);
  }

  for (const choice of ["keep", "move"]) {
    if (!want(choice)) continue;
    console.log(`\n${choice}: 12 → 3 and another gift, one customer in the middle of the old card`);
    const cards = await reset(1);
    await edit({ goal: 3, gift: "جلاطي بلاش" });
    await save();
    await sheet.getByRole("radio").first().waitFor({ timeout: 15000 });
    await p.waitForTimeout(600);
    if (choice === "move") await sheet.getByRole("radio").nth(1).click();
    await p.waitForTimeout(250);
    await p.screenshot({ path: `shots/card/one-${choice}.png` });
    const said = (await sheet.textContent()).replace(/\s+/g, " ");
    if (choice === "keep") check("the question, for one customer", said.includes("حريف واحد في نصّ الكارط") && said.includes("شنوّة نعملو معاه؟") && said.includes("يكمّل كارطو القديمة") && said.includes("يبدّل للجديدة توّا") && said.includes("حريف واحد يربح الكادو توّا"), said);
    const t0 = Date.now();
    await sheet.getByRole("button", { name: "سجّل", exact: true }).click();
    const ok = await home();
    const s = await state(cards);
    if (choice === "keep") check(`kept: the card they started stays theirs (${Date.now() - t0} ms)`, ok && s.shop.goal === 3 && s.cards[0].goal === 12 && s.cards[0].gift === OLD.gift && s.gifts === 0, s);
    else check(`moved: the new card now, the tampons kept, the gift at once (${Date.now() - t0} ms)`, ok && s.cards[0].goal === 3 && s.cards[0].gift === "جلاطي بلاش" && s.cards[0].stamps === 4 && s.gifts === 1, s);
  }

  if (want("many")) {
    console.log("\nmany: the same change with three customers");
    await reset(3);
    for (const size of [{ width: 390, height: 844 }, { width: 360, height: 640 }, { width: 375, height: 548 }]) {
      await p.setViewportSize(size);
      await edit({ goal: 3, gift: "جلاطي بلاش" });
      await save();
      await sheet.getByRole("radio").first().waitFor({ timeout: 15000 });
      await p.waitForTimeout(600);
      await sheet.getByRole("radio").nth(1).click();
      await p.waitForTimeout(250);
      await p.screenshot({ path: `shots/card/many-${size.width}x${size.height}.png` });
      const fit = await p.evaluate(() => {
        const d = document.querySelector('[role="dialog"]');
        const panel = d.firstElementChild.getBoundingClientRect();
        const last = [...d.querySelectorAll("button")].pop().getBoundingClientRect();
        const list = d.querySelector("[role=radiogroup]");
        return { top: Math.round(panel.top), bottom: Math.round(panel.bottom), lastBottom: Math.round(last.bottom), vh: innerHeight, scrolls: list.scrollHeight > list.clientHeight + 1 };
      });
      const said = (await sheet.textContent()).replace(/\s+/g, " ");
      check(`[${size.width}x${size.height}] the question in the plural, the whole sheet on the screen`, said.includes("3 حرفاء في نصّ الكارط") && said.includes("شنوّة نعملو معاهم؟") && said.includes("يكمّلو كارطهم القديمة") && said.includes("3 حرفاء يربحو الكادو توّا") && fit.top >= 0 && fit.lastBottom <= fit.vh && !fit.scrolls, [fit, said]);
      await sheet.getByRole("button", { name: "نرجع", exact: true }).click();
      await sheet.waitFor({ state: "detached", timeout: 5000 });
    }
    await p.setViewportSize({ width: 390, height: 844 });
  }

  if (want("deaf")) {
    console.log("\ndeaf: the save reaches the server, its answer never comes back");
    const cards = await reset(1);
    await edit({ goal: 3, gift: "جلاطي بلاش" });
    await save();
    await sheet.getByRole("radio").first().waitFor({ timeout: 15000 });
    // the save goes to the server, and its answer is thrown away: the page waits for good
    await p.route("**/shop/card", async (route) => {
      if (route.request().method() !== "POST") return route.fallback();
      await route.fetch().catch(() => {});
    });
    const t0 = Date.now();
    const asks = [];
    const seen = async (r) => { if (new URL(r.url()).pathname === "/api/card") asks.push(`${((Date.now() - t0) / 1000).toFixed(1)}s → ${r.status()} ${(await r.text().catch(() => "")).slice(0, 90)}`); };
    p.on("response", seen);
    await sheet.getByRole("button", { name: "سجّل", exact: true }).click();
    const ok = await home(30000);
    p.off("response", seen);
    console.log("    the screen asked the database:", asks.join(" | ") || "(never)");
    const s = await state(cards);
    check(`the card was saved: the screen finds out and goes home by itself (${((Date.now() - t0) / 1000).toFixed(1)} s)`, ok && s.shop.goal === 3, s);
    await p.unroute("**/shop/card");
  }

  if (want("lost")) {
    console.log("\nlost: the save never reaches the server");
    const cards = await reset(1);
    await edit({ goal: 3, gift: "جلاطي بلاش" });
    await save();
    await sheet.getByRole("radio").first().waitFor({ timeout: 15000 });
    await p.route("**/shop/card", (route) => (route.request().method() === "POST" ? new Promise(() => {}) : route.fallback()));
    const t0 = Date.now();
    await sheet.getByRole("button", { name: "سجّل", exact: true }).click();
    const told = await p.getByText("الكارط ما تسجّلتش").waitFor({ timeout: 60000 }).then(() => true).catch(() => false);
    await p.waitForTimeout(300);
    await p.screenshot({ path: "shots/card/lost.png" });
    const s = await state(cards);
    check(`said after ${((Date.now() - t0) / 1000).toFixed(0)} s, the sheet gone, the card still the old one`, told && (await sheet.count()) === 0 && s.shop.goal === 12, s);
    await p.unroute("**/shop/card");
    await Promise.all([p.waitForEvent("load", { timeout: 20000 }), p.getByRole("button", { name: "عاود جرّب", exact: true }).click()]);
    check("«عاود جرّب» starts the card's screen again", new URL(p.url()).pathname === "/shop/card" && (await p.getByRole("button", { name: "كمّل", exact: true }).count()) === 1);
  }

  check("no error on the page", errors.length === 0, errors);
} finally {
  await browser.close();
  for (const id of made) { await admin.from("shops").delete().eq("owner_id", id); await admin.auth.admin.deleteUser(id); }
  await unrobot(admin, phones);
}
console.log(bad ? `\n${bad} BAD` : "\nall good");
process.exit(bad ? 1 : 0);
