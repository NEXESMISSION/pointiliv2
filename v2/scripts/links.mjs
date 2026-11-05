/**
 * A tampon sent as a link, for real, on phones: the owner's home and its note,
 * the page, a link made and sent, a customer taking it, a phone without an
 * account holding it, somebody else refused, the owner's list, a link
 * cancelled, and one opened too soon. Throwaway accounts, deleted at the end;
 * pictures in .e2e/links/.
 *
 *   node scripts/links.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/links";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
const PASS = "links-e2e-2026";
// every one-time note but the new one: the home shows the links note and nothing else
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission"];
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const made = [];
const phones = [];
let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  }
};

async function person(name) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  return { id: data.user.id, digits: d };
}

const owner = await person("سنية");
const { data: shop, error: shopErr } = await admin
  .from("shops")
  .insert({ owner_id: owner.id, name: "Boutique Sonia", kind: "clothes", goal: 5, gift: "تخفيض 10%", color: "#E8487A", created_at: ago(30 * 86_400_000), paid_until: new Date(Date.now() + 300 * 86_400_000).toISOString() })
  .select("*")
  .single();
if (shopErr) throw shopErr;
// the news already out: seen by this owner, so nothing else covers the home
const { data: live } = await admin.from("news").select("id").eq("active", true);
if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: owner.id })));
const rania = await person("رانية");
const karim = await person("كريم");

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
async function signIn(who) {
  const ctx = await browser.newContext(phone);
  const page = await ctx.newPage();
  // a dev server recompiling may draw the form again under the typing: filled once it is awake, checked, tried twice
  for (let attempt = 1; ; attempt++) {
    await page.goto(`${BASE}/login`, { waitUntil: "networkidle", timeout: 90000 });
    await page.waitForTimeout(800);
    await page.locator('input[name="phone"]').fill(who.digits);
    await page.locator('input[name="password"]').fill(PASS);
    if ((await page.locator('input[name="phone"]').inputValue()).replace(/\D/g, "") !== who.digits) continue;
    await page.locator('button[type="submit"]').click();
    const away = await page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 30000 }).then(() => true, () => false);
    if (away) return { ctx, page };
    if (attempt >= 2) throw new Error(`could not sign in ${who.digits}`);
  }
}
const shot = async (page, name) => {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.waitForTimeout(350);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
/** the screen never wider than the phone, and (unless it says so) never taller */
const fits = (page) => page.evaluate(() => ({ wide: document.documentElement.scrollWidth <= innerWidth + 1, tall: document.documentElement.scrollHeight <= innerHeight + 1 }));
/** the link a sheet is sending, read from its WhatsApp button */
const linkOf = async (page) => {
  const href = await page.locator('a[href^="https://wa.me/"]').getAttribute("href");
  return decodeURIComponent(href.split("text=")[1]).split("\n").pop();
};
const open = async (page, url) => {
  await page.goto(url, { waitUntil: "load", timeout: 90000 });
  await page.locator("h1").first().waitFor({ timeout: 30000 });
  await page.waitForTimeout(1800);
  return (await page.locator("h1").first().innerText()).trim();
};

try {
  console.log("\nThe owner: the home's new row, and its note once");
  const o = await signIn(owner);
  const tip = o.page.getByRole("dialog", { name: "ابعث التامبون برابط" });
  // a dev server reloading the page (another edit landing) can take the note away the moment it showed —
  // it is written down as seen then — so it is given back and the home opened again, up to three times
  for (let attempt = 1; attempt <= 3; attempt++) {
    await admin.from("people").update({ seen: NOTES }).eq("id", owner.id);
    await o.page.goto(`${BASE}/shop`, { waitUntil: "load" });
    await o.page.evaluate(() => Object.keys(localStorage).filter((k) => k.startsWith("pt_seen:links_tip")).forEach((k) => localStorage.removeItem(k)));
    await o.page.reload({ waitUntil: "load" });
    if (await tip.waitFor({ timeout: 15000 }).then(() => true, () => false)) break;
  }
  check("the note lights the new row on the home", await tip.isVisible());
  check("…and is written down as seen at once", ((await admin.from("people").select("seen").eq("id", owner.id).single()).data?.seen ?? []).includes("links_tip"));
  await shot(o.page, "1-home-note");
  await o.page.getByRole("link", { name: "نجرّب توّا" }).click();
  await o.page.waitForURL(/\/shop\/links$/, { timeout: 30000 });
  check("«نجرّب توّا» opens the links page", true);
  const f1 = await fits(o.page);
  check("the links page fits the phone", f1.wide && f1.tall, f1);
  await shot(o.page, "2-page-empty");

  console.log("\nA link made and sent");
  await o.page.locator("input").first().fill("رانية · كوموند 12");
  await o.page.getByRole("button", { name: /اعمل رابط جديد/ }).click();
  await o.page.getByRole("dialog", { name: "الرابط حاضر" }).waitFor({ timeout: 20000 });
  const url1 = await linkOf(o.page);
  check("the link is this site's tampon address, a token of 32", new RegExp(`^${BASE}/s/[A-Za-z0-9_-]{32}$`).test(url1), url1);
  check("its WhatsApp message names the shop", decodeURIComponent((await o.page.locator('a[href^="https://wa.me/"]').getAttribute("href")) ?? "").includes("Boutique Sonia"));
  check("the sheet says who it is for", await o.page.getByRole("dialog").getByText("رانية · كوموند 12").isVisible());
  await o.ctx.grantPermissions(["clipboard-read", "clipboard-write"], { origin: BASE });
  await o.page.getByRole("button", { name: /انسخ/ }).click();
  await o.page.getByText("تنسخ").first().waitFor({ timeout: 5000 });
  check("«انسخ» puts the link on the clipboard", (await o.page.evaluate(() => navigator.clipboard.readText())) === url1);
  await shot(o.page, "3-link-ready");
  await o.page.getByRole("button", { name: "رابط آخر لحريف آخر" }).click();
  await o.page.waitForTimeout(600);
  check("«رابط آخر» goes straight back to the name, empty", (await o.page.locator("input").first().inputValue()) === "" && (await o.page.evaluate(() => document.activeElement?.tagName)) === "INPUT");
  await o.page.getByRole("button", { name: /اعمل رابط جديد/ }).click();
  await o.page.getByRole("dialog", { name: "الرابط حاضر" }).waitFor({ timeout: 20000 });
  const url2 = await linkOf(o.page);
  await o.page.getByRole("button", { name: "باهي" }).click();
  await o.page.getByRole("button", { name: /اعمل رابط جديد/ }).click();
  await o.page.getByRole("dialog", { name: "الرابط حاضر" }).waitFor({ timeout: 20000 });
  const url3 = await linkOf(o.page);
  await o.page.getByRole("button", { name: "باهي" }).click();
  check("every link is a new one", new Set([url1, url2, url3]).size === 3);

  console.log("\nThe customers");
  const r = await signIn(rania);
  check("the customer opens the link: the tampon lands", (await open(r.page, url1)) === "تامبون جديد!", await r.page.locator("h1").first().innerText());
  await shot(r.page, "4-customer-stamped");
  const card = (await admin.from("cards").select("stamps").eq("shop_id", shop.id).eq("user_id", rania.id).single()).data;
  check("…one tampon on her card at the shop", card?.stamps === 1, card);
  const again = await r.ctx.newPage();
  check("the same link again, another tab: «already taken», no second tampon", (await open(again, url1)) === "التامبون هذا خذيتو");
  const anon = await browser.newContext(phone);
  const ap = await anon.newPage();
  check("a phone without an account: the tampon held for it, the account asked", (await open(ap, url2)) === "خوذ التامبون متاعك");
  await shot(ap, "5-no-account-held");
  const k = await signIn(karim);
  check("somebody else with a used link: told it was used, to ask for a new one", (await open(k.page, url1)) === "الرابط هذا خذاه حدّ آخر" && (await k.page.getByText("اطلب من المحل رابط جديد").isVisible()));
  check("…and no «scan again» on a link", (await k.page.getByText("سكاني من جديد").count()) === 0);
  await shot(k.page, "6-link-used");

  console.log("\nThe owner's list, and a link cancelled");
  await o.page.reload({ waitUntil: "load" });
  await o.page.getByText("خذاه رانية").waitFor({ timeout: 20000 });
  check("the list says who took the first", await o.page.getByText("خذاه رانية").isVisible());
  check("…the second opened, waiting for the account", await o.page.getByText("تحلّ · يكمّل في الكونت").isVisible());
  check("…the third waiting", (await o.page.getByText("يستنّى", { exact: true }).count()) === 1);
  check("…and the counts", await o.page.getByText("2 يستنّاو · 1 تخذاو").isVisible());
  await shot(o.page, "7-list");
  await o.page.getByRole("button", { name: "بطّل" }).first().click();
  await o.page.getByRole("dialog", { name: "تبطّل الرابط هذا؟" }).waitFor({ timeout: 10000 });
  await shot(o.page, "8-cancel-ask");
  await o.page.getByRole("button", { name: "إيه، بطّلو" }).click();
  await o.page.getByText("تبطّل", { exact: true }).waitFor({ timeout: 10000 });
  check("the newest link cancelled: said at once", await o.page.getByText("تبطّل", { exact: true }).isVisible());
  check("a cancelled link gives nothing, and says so", (await open(k.page, url3)) === "الرابط هذا تبطّل");
  await shot(k.page, "9-link-cancelled");

  console.log("\nToo soon after the last tampon");
  await o.page.getByRole("button", { name: /اعمل رابط جديد/ }).click();
  await o.page.getByRole("dialog", { name: "الرابط حاضر" }).waitFor({ timeout: 20000 });
  const url4 = await linkOf(o.page);
  await o.page.getByRole("button", { name: "باهي" }).click();
  check("the customer again within the hour: refused, the link said to stay good", (await open(r.page, url4)) === "خذيت التامبون متاعك هوني" && (await r.page.getByText("الرابط يقعد يخدم").isVisible()));
  await shot(r.page, "10-too-soon");
  await admin.from("cards").update({ last_at: ago(2 * 3_600_000) }).eq("shop_id", shop.id).eq("user_id", rania.id);
  const later = await r.ctx.newPage();
  const laterSaid = await open(later, url4);
  check("…opened again once the time has come: the tampon", laterSaid === "تامبون جديد!", { said: laterSaid, card: (await admin.from("cards").select("stamps, last_at").eq("shop_id", shop.id).eq("user_id", rania.id).single()).data });

  console.log("\nThe home, after");
  await o.page.goto(`${BASE}/shop`, { waitUntil: "load" });
  await o.page.locator("#links-row").waitFor({ timeout: 20000 });
  await o.page.waitForTimeout(1500);
  check("the note never comes back", (await o.page.getByRole("dialog", { name: "ابعث التامبون برابط" }).count()) === 0);
  const f2 = await fits(o.page);
  check("the home still fits the phone with its new row", f2.wide && f2.tall, f2);
  await shot(o.page, "11-home");
  for (const [w, h] of [
    [360, 640],
    [375, 667],
  ]) {
    await o.page.setViewportSize({ width: w, height: h });
    for (const path of ["/shop", "/shop/links"]) {
      await o.page.goto(`${BASE}${path}`, { waitUntil: "load" });
      await o.page.waitForTimeout(1200);
      const f = await fits(o.page);
      check(`${path} at ${w}×${h}: nothing sideways, nothing below the screen`, f.wide && f.tall, f);
      await shot(o.page, `12-${path.replaceAll("/", "_")}-${w}x${h}`);
    }
  }
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
  // where it stood: every page still open, pictured
  for (const [i, p] of browser.contexts().flatMap((c) => c.pages()).entries()) {
    console.log(`    page ${i}: ${p.url()}`);
    await p.screenshot({ path: `${OUT}/crash-${i}.png` }).catch(() => {});
  }
} finally {
  await browser.close();
  for (const id of made) {
    await admin.from("shops").delete().eq("owner_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${made.length} accounts) · pictures in ${OUT}/`);
  if (failed.length) process.exit(1);
}
