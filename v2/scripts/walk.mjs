/**
 * Pointili v2 end to end, clicking like people do, in two phones:
 *   the owner makes an account, the shop, the card, and opens the counter;
 *   a customer with no account scans it (the code is read off the screen),
 *   sees the tampon reserved, makes an account, gets the tampon;
 *   the card fills up, the gift shows on both phones, the owner hands it over.
 * Screens land in v2/shots. The accounts are deleted at the end.
 *
 *   node scripts/walk.mjs        (from v2/, with the dev server on :3200)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = process.env.OUT || "shots";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// walking the local server again and again: its sign-up and sign-in counters start from zero
if (/localhost|127\.0\.0\.1/.test(BASE)) for (const ip of ["local", "::1", "127.0.0.1"]) for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: key });
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const ownerPhone = phoneNo();
const customerPhone = phoneNo();
let bossPhone = null;

// SIZE=375x667 walks a small phone; every screen says how far it scrolls, if it does
const [W, H] = (process.env.SIZE || "390x844").split("x").map(Number);
const phone = { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const shot = async (page, name, wait = 900) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  // the page, and every page frame (a <main>, the card questions' form): none may hold more than the screen
  const over = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight - innerHeight, ...[...document.querySelectorAll("main, body > form, main form.h-dvh")].map((m) => m.scrollHeight - m.clientHeight), 0),
  );
  console.log("  ·", name, over > 0 ? `— scrolls ${over}px` : "");
};
const readQr = async (page) => {
  await page.addScriptTag({ path: "node_modules/jsqr/dist/jsQR.js" });
  return page.evaluate(async () => {
    const svg = document.querySelector("[data-qr] svg").outerHTML;
    const img = new Image();
    img.src = "data:image/svg+xml;charset=utf-8," + encodeURIComponent(svg);
    await img.decode();
    const c = document.createElement("canvas");
    c.width = c.height = 600;
    const g = c.getContext("2d");
    g.fillStyle = "#fff";
    g.fillRect(0, 0, 600, 600);
    g.drawImage(img, 40, 40, 520, 520);
    return window.jsQR(g.getImageData(0, 0, 600, 600).data, 600, 600)?.data ?? null;
  });
};

try {
  // ── the owner ──
  const o = await (await browser.newContext(phone)).newPage();
  await o.goto(BASE + "/", { waitUntil: "load" });
  await shot(o, "01-welcome");
  await o.goto(BASE + "/shop/new", { waitUntil: "load" });
  await o.locator('input[name="name"]').fill("ياسمين");
  await o.locator('input[name="phone"]').fill(ownerPhone);
  await o.locator('input[name="password"]').fill("yasmine123");
  await shot(o, "02-owner-account", 300);
  await Promise.all([o.waitForURL("**/shop/setup", { timeout: 60000 }), o.locator('button[type="submit"]').click()]);
  await o.locator('input[name="name"]').fill("Café Yasmine");
  await o.getByRole("button", { name: "قهوة" }).click();
  await shot(o, "03-owner-shop", 300);
  // the other 39 kinds: the full list, a search in it, a pick from it
  await o.getByRole("button", { name: /الكل/ }).click();
  await o.getByRole("dialog").waitFor();
  await shot(o, "03b-kinds-all", 500);
  await o.locator('input[type="search"]').fill("parfum");
  await shot(o, "03c-kinds-search", 400);
  await o.getByRole("dialog").getByRole("button", { name: "عطورات" }).click();
  await shot(o, "03d-kinds-picked", 400);
  await o.getByRole("button", { name: "قهوة" }).click();
  await Promise.all([o.waitForURL("**/shop/card", { timeout: 60000 }), o.locator('button[type="submit"]').click()]);
  // the card, one question at a time: the hello, how many, which gift, which colour, ready
  await o.getByText("توّا نعملو مع بعضنا").waitFor({ timeout: 30000 });
  await shot(o, "04a-card-hello", 1600);
  await o.getByRole("button", { name: "يلّا نبداو" }).click();
  await o.getByRole("button", { name: "5", exact: true }).click();
  await shot(o, "04b-card-goal", 600);
  await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByText("شنوّة يربح الحريف").waitFor();
  await shot(o, "04c-card-gift", 600);
  await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByRole("button", { name: "#FF6B4A" }).click();
  await shot(o, "04d-card-color", 600);
  await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByText("الكارط متاعك حاضرة").waitFor();
  await shot(o, "04-owner-card", 1200);
  // the button breathes: Playwright never finds it "stable", so the click is forced
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop/qr", { timeout: 60000 }), o.locator('button[type="submit"]').click({ force: true })]);
  // the first code comes with a bravo, then a tip: try it with another phone
  await o.getByText("برافو").waitFor({ timeout: 30000 });
  await shot(o, "05a-bravo", 1400);
  await o.getByRole("button", { name: "ورّيني" }).click();
  await o.getByText("عندك تليفون آخر").waitFor({ timeout: 20000 });
  await o.locator("[data-qr]").waitFor({ timeout: 30000 });
  await shot(o, "05b-tip", 900);
  const covered = await o.evaluate(() => {
    const q = document.querySelector("[data-qr]").getBoundingClientRect();
    const d = document.querySelector('[role="dialog"]').getBoundingClientRect();
    return Math.min(q.bottom, d.bottom) > Math.max(q.top, d.top) && Math.min(q.right, d.right) > Math.max(q.left, d.left);
  });
  if (covered) console.log("  ! the tip covers the code");
  await o.getByRole("button", { name: "باهي، فهمت" }).click();
  await o.waitForURL((u) => u.pathname === "/shop/qr" && !u.search, { timeout: 20000 });
  await o.locator("[data-qr]").waitFor({ timeout: 30000 });
  await shot(o, "05-counter", 1200);

  // ── a customer with no account scans it ──
  const url = await readQr(o);
  if (!url) throw new Error("could not read the counter's code");
  const c = await (await browser.newContext(phone)).newPage();
  await c.goto(BASE + new URL(url).pathname, { waitUntil: "load" });
  await c.getByText("حجزنالك التامبون").waitFor({ timeout: 30000 });
  await shot(c, "06-reserved", 1600);
  await c.getByRole("link", { name: "اعمل كونت" }).click({ force: true });
  await c.waitForURL("**/join**");
  await c.locator('input[name="name"]').fill("سامي بن علي");
  await c.locator('input[name="phone"]').fill(customerPhone);
  await c.locator('input[name="password"]').fill("sami1234");
  await shot(c, "07-join", 300);
  // the counter hears the stamp (Realtime): «+1 سامي» shows for a moment — caught as it lands
  const t0 = Date.now();
  const plusOne = o
    .getByRole("status")
    .first()
    .waitFor({ timeout: 30000 })
    .then(async () => {
      console.log(`  · the counter showed +1 ${((Date.now() - t0) / 1000).toFixed(1)} s after the tap`);
      await shot(o, "09-counter-plus-one", 450);
    })
    .catch(() => console.log("  ! the counter never showed +1"));
  await Promise.all([c.waitForURL("**/s/**", { timeout: 60000 }), c.locator('button[type="submit"]').click()]);
  await c.getByText("تامبون جديد!").waitFor({ timeout: 30000 });
  await shot(c, "08-stamped", 1800);
  await plusOne;

  // ── the card fills up ──
  const { data: who } = await admin.from("people").select("id").eq("phone", `+216${customerPhone}`).single();
  await admin.from("cards").update({ stamps: 4, last_at: new Date(Date.now() - 2 * 3600_000).toISOString() }).eq("user_id", who.id);
  await o.waitForTimeout(1500);
  const url2 = await readQr(o);
  await c.goto(BASE + new URL(url2).pathname, { waitUntil: "load" });
  await c.getByText("ربحت").first().waitFor({ timeout: 30000 });
  await shot(c, "10-gift-won", 2200);
  await o.getByRole("button", { name: "عطيتو ✓" }).waitFor({ timeout: 20000 });
  await shot(o, "11-counter-gift", 1200);
  await o.getByRole("button", { name: "عطيتو ✓" }).click();
  await o.waitForTimeout(1500);
  await shot(o, "12-counter-given", 200);

  // ── the customer's other screens ──
  await c.goto(BASE + "/", { waitUntil: "load" });
  await shot(c, "13-wallet");
  await c.locator('a[href^="/c/"]').first().click();
  await c.waitForURL("**/c/**");
  await shot(c, "14-card");
  await c.goto(BASE + "/scan", { waitUntil: "load" });
  await shot(c, "15-scanner", 1500);
  await c.goto(BASE + "/me", { waitUntil: "load" });
  await shot(c, "16-account");
  await o.goto(BASE + "/shop", { waitUntil: "load" });
  await shot(o, "17-owner-home");
  await o.goto(BASE + "/shop/customers", { waitUntil: "load" });
  await shot(o, "19-owner-customers");
  // changing the card: one line says what happens to the customers on their way
  await o.goto(BASE + "/shop/card", { waitUntil: "load" });
  await o.getByRole("button", { name: "8", exact: true }).click();
  for (let i = 0; i < 3; i++) await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByRole("status").waitFor();
  await shot(o, "17b-card-change", 500);
  await o.goto(BASE + "/me", { waitUntil: "load" });
  await shot(o, "16b-owner-account");

  // ── the founder's console, through a throwaway admin ──
  bossPhone = phoneNo();
  const { data: bossUser } = await admin.auth.admin.createUser({ email: `216${bossPhone}@phone.pointidi.app`, password: "boss-walk-123", email_confirm: true, app_metadata: { phone: `+216${bossPhone}` } });
  await admin.from("people").upsert({ id: bossUser.user.id, name: "Boss", phone: `+216${bossPhone}`, is_admin: true });
  const a = await (await browser.newContext(phone)).newPage();
  await a.goto(BASE + "/login", { waitUntil: "load" });
  await a.locator('input[name="phone"]').fill(bossPhone);
  await a.locator('input[name="password"]').fill("boss-walk-123");
  await Promise.all([a.waitForURL("**/admin**", { timeout: 60000 }), a.locator('button[type="submit"]').click()]);
  await shot(a, "20-admin");
  await a.locator('a[href^="/admin/shops/"]').first().click();
  await a.waitForURL("**/admin/shops/**");
  await shot(a, "21-admin-shop");
  await a.goto(BASE + "/admin?tab=people", { waitUntil: "load" });
  await shot(a, "22-admin-people");
  await a.goto(BASE + "/admin?tab=people&q=" + encodeURIComponent("سامي"), { waitUntil: "load" });
  await a.locator('a[href^="/admin/people/"]').first().click();
  await a.waitForURL("**/admin/people/**");
  await shot(a, "23-admin-person");
  await a.getByRole("button", { name: /كلمة سر جديدة/ }).click();
  await a.getByText("كلمة السر الجديدة").waitFor({ timeout: 20000 });
  await shot(a, "24-admin-new-password", 600);
  await admin.auth.admin.deleteUser(bossUser.user.id);
  const l = await (await browser.newContext(phone)).newPage();
  await l.goto(BASE + "/login", { waitUntil: "load" });
  await shot(l, "18-login");
  await l.getByRole("link", { name: "نسيت كلمة السر؟" }).click();
  await l.waitForURL("**/forgot");
  await shot(l, "18b-forgot");
} finally {
  await browser.close();
  // the throwaway admin too, should the walk stop half way
  for (const p of [ownerPhone, customerPhone, bossPhone].filter(Boolean)) {
    const { data } = await admin.from("people").select("id").eq("phone", `+216${p}`).maybeSingle();
    if (data) {
      await admin.from("shops").delete().eq("owner_id", data.id);
      await admin.auth.admin.deleteUser(data.id);
    }
  }
  console.log("cleaned up the walk's accounts");
}
