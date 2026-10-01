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
const OUT = "shots";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const ownerPhone = phoneNo();
const customerPhone = phoneNo();

const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const shot = async (page, name, wait = 900) => {
  await page.waitForTimeout(wait);
  await page.screenshot({ path: `${OUT}/${name}.png` });
  console.log("  ·", name);
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
  await Promise.all([o.waitForURL("**/shop/card", { timeout: 60000 }), o.locator('button[type="submit"]').click()]);
  await o.getByRole("button", { name: "5", exact: true }).click();
  await o.getByRole("button", { name: "#FF6B4A" }).click();
  await shot(o, "04-owner-card", 500);
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop/qr", { timeout: 60000 }), o.locator('button[type="submit"]').click()]);
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
  await Promise.all([c.waitForURL("**/s/**", { timeout: 60000 }), c.locator('button[type="submit"]').click()]);
  await c.getByText("تامبون جديد!").waitFor({ timeout: 30000 });
  await shot(c, "08-stamped", 1800);
  await o.getByRole("status").first().waitFor({ timeout: 20000 }).catch(() => {});
  await shot(o, "09-counter-plus-one", 200);

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

  // ── the founder's console, through a throwaway admin ──
  const bossPhone = phoneNo();
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
  await admin.auth.admin.deleteUser(bossUser.user.id);
  const l = await (await browser.newContext(phone)).newPage();
  await l.goto(BASE + "/login", { waitUntil: "load" });
  await shot(l, "18-login");
} finally {
  await browser.close();
  for (const p of [ownerPhone, customerPhone]) {
    const { data } = await admin.from("people").select("id").eq("phone", `+216${p}`).maybeSingle();
    if (data) {
      await admin.from("shops").delete().eq("owner_id", data.id);
      await admin.auth.admin.deleteUser(data.id);
    }
  }
  console.log("cleaned up the two accounts");
}
