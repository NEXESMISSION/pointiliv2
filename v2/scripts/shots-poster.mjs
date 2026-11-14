/**
 * The sign-up poster (components/PosterStudio, lib/poster): a tampon shop and a points shop, every size and
 * every look, saved as the full pictures the owner downloads — and the owner's page itself. On this computer's
 * database (localbase); throwaway accounts, removed at the end.
 *
 *   BASE=http://localhost:3302 OUT=.e2e/poster node scripts/shots-poster.mjs   (from v2/)
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3302";
const OUT = process.env.OUT || ".e2e/poster";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("shots-poster.mjs runs on this computer only");
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: k });

const users = [], phones = [];
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
async function person(name, pass = "demo-1234") {
  const d = await robot(admin, phoneNo()); phones.push(d);
  const email = `216${d}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password: pass, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error; users.push(data.user.id);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password: pass });
  await client.rpc("me"); if (name) await client.rpc("set_name", { p_name: name });
  return { id: data.user.id, client, digits: d, pass };
}
const rpc = async (who, fn, args = {}) => { const { data, error } = await who.client.rpc(fn, args); if (error) console.log(`  ! ${fn}: ${error.message}`); return data; };
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
let browser;
async function login(who, next) {
  const ctx = await browser.newContext(phone); const p = await ctx.newPage();
  await p.goto(BASE + "/login", { waitUntil: "load" });
  await p.locator('input[name="phone"]').fill(who.digits); await p.locator('input[name="password"]').fill(who.pass);
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}), p.locator('button[type="submit"]').click()]);
  if (next) await p.goto(BASE + next, { waitUntil: "load" });
  return p;
}

try {
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const boss = await person("Founder", "boss-1234");
  await admin.from("people").update({ is_admin: true }).eq("id", boss.id);
  const shops = [];
  const a = await person("جيهان");
  await rpc(a, "open_shop", { p_name: "Salon Jihen", p_kind: "beauty" });
  await rpc(a, "save_card", { p_goal: 8, p_gift: "سشوار", p_color: "#c2417a", p_gap: 0 });
  shops.push(["tampon", a]);
  const b = await person("ياسمين");
  await rpc(b, "open_shop", { p_name: "Café El Medina", p_kind: "cafe" });
  await rpc(b, "start_points");
  await rpc(b, "save_card", { p_goal: 10, p_gift: "قهوة", p_color: "#17b890", p_gap: 0 });
  await rpc(b, "store_save", { p_items: [{ name: "قهوة", cost: 50 }] });
  shops.push(["points", b]);

  for (const [tag, o] of shops) {
    const shop = (await rpc(o, "me")).shop;
    await rpc(boss, "admin_set_join", { p_id: shop.id, p_on: true });
    const p = await login(o, "/shop/join");
    await p.locator('canvas[data-drawn="1"]').waitFor({ timeout: 30000 });
    await p.waitForTimeout(500);
    await p.screenshot({ path: `${OUT}/${tag}-page.png` });
    console.log("  ·", `${tag}-page`);
    for (const [fmt, label] of [["a4", "A4"], ["story", "ستوري"], ["square", "بوست"]]) {
      await p.getByRole("radio", { name: new RegExp(label) }).click();
      for (const [look, lname] of [["brand", "Pointili"], ["shop", "لون المحل"], ["light", "أبيض"]]) {
        await p.getByRole("radio", { name: lname }).click();
        await p.waitForTimeout(250);
        const url = await p.locator("canvas[data-drawn]").evaluate((c) => c.toDataURL("image/png"));
        writeFileSync(`${OUT}/${tag}-${fmt}-${look}.png`, Buffer.from(url.split(",")[1], "base64"));
        console.log("  ·", `${tag}-${fmt}-${look}`);
      }
      if (fmt === "story") {
        await p.screenshot({ path: `${OUT}/${tag}-page-story.png` });
      }
    }
  }
  console.log("\nDone. Pictures in", OUT);
} finally {
  if (browser) await browser.close();
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log("cleaned up", users.length, "accounts");
}
