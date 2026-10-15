/**
 * The counter of a shop that says what it sells (Sultan al oud's perfumes,
 * the founder's «شنوّة يبيع» switch): it asks which thing BEFORE any code is
 * on the screen, the code it makes carries that thing, the customer's tampon
 * is written against it, and after the scan it asks again — the last
 * customer's thing is never left over. Run it after any change to the
 * counter, the codes or the schema.
 *
 *   node scripts/counter-items.mjs        (from v2/, dev server on :3200)
 */
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";
let failed = 0;
const say = console.log;
console.log = (...a) => {
  if (String(a[0]).startsWith("✗")) failed++;
  say(...a);
};
config({ path: ".env.local", quiet: true });
const BASE = "http://localhost:3200";
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const owner = await robot(admin, phoneNo());
const cust = await robot(admin, phoneNo());
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const ctx = { viewport: { width: 375, height: 667 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
try {
  const o = await (await browser.newContext(ctx)).newPage();
  await o.goto(BASE + "/shop/new", { waitUntil: "load" });
  await o.locator('input[name="name"]').fill("بدر");
  await o.locator('input[name="shop"]').fill("Sultan Probe");
  await o.locator('input[name="phone"]').fill(owner);
  await o.locator('input[name="password"]').fill("probe1234");
  await o.getByRole("button", { name: /الكل/ }).click();
  await o.locator('input[type="search"]').fill("parfum");
  await o.getByRole("dialog").getByRole("button", { name: "عطورات" }).click();
  await Promise.all([o.waitForURL("**/shop/card?new=1", { timeout: 60000 }), o.locator('button[type="submit"]').click()]);
  await Promise.all([o.waitForURL("**/shop/start", { timeout: 60000 }), o.getByRole("button", { name: "حلّ الكارط" }).click()]);
  // the counter open BEFORE the founder's switch: a code with no thing on it
  const { data: p } = await admin.from("people").select("id").eq("phone", `+216${owner}`).single();
  const { data: shop } = await admin.from("shops").select("id").eq("owner_id", p.id).single();
  await o.goto(BASE + "/shop/qr", { waitUntil: "load" });
  await o.locator("[data-qr]").waitFor({ timeout: 30000 });
  // what it sells, and the founder's switch on (as for Sultan al oud) — the open counter must notice by itself
  await admin.from("items").insert(["Parfum 30 ml", "Parfum 50 ml", "Parfum 100 ml"].map((name, i) => ({ shop_id: shop.id, name, rank: i })));
  await admin.from("shops").update({ items_on: true }).eq("id", shop.id);
  const asked = await o
    .getByRole("button", { name: /Parfum 50 ml/ })
    .waitFor({ timeout: 120000 })
    .then(() => true)
    .catch(() => false);
  console.log(asked ? "✓ a counter left open when the switch went on asks by itself at its next code" : "✗ the open counter never asked");
  await o.goto(BASE + "/shop/qr", { waitUntil: "load" });
  await o.waitForTimeout(1500);
  const qrBefore = await o.locator("[data-qr]").count();
  await o.screenshot({ path: "shots/items-ask.png" });
  console.log(qrBefore === 0 ? "✓ the counter asks first: no code on the screen before a perfume is chosen" : "✗ a code showed before asking");
  await o.getByRole("button", { name: /Parfum 50 ml/ }).click();
  await o.locator("[data-qr]").waitFor({ timeout: 30000 });
  await o.waitForTimeout(800);
  await o.screenshot({ path: "shots/items-code.png" });
  const pill = await o.getByText(/Parfum 50 ml/).count();
  console.log(pill ? "✓ the code says what it is for: Parfum 50 ml" : "✗ no pill");
  const { data: code } = await admin.from("codes").select("id, item_id").eq("shop_id", shop.id).order("created_at", { ascending: false }).limit(1).single();
  const { data: item } = await admin.from("items").select("id, name").eq("id", code.item_id ?? -1).maybeSingle();
  console.log(item?.name === "Parfum 50 ml" ? "✓ the code on screen carries Parfum 50 ml" : `✗ code item: ${item?.name}`);
  // a customer scans it
  await o.addScriptTag({ path: "node_modules/jsqr/dist/jsQR.js" });
  const url = await o.evaluate(async () => {
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
  const c = await (await browser.newContext(ctx)).newPage();
  await c.goto(BASE + new URL(url).pathname, { waitUntil: "load" });
  await c.locator('input[name="name"]').fill("حريف");
  await c.locator('input[name="phone"]').fill(cust);
  await c.locator('input[name="password"]').fill("probe1234");
  await c.getByRole("button", { name: /خوذ التامبون/ }).click();
  await c.getByText("تامبون جديد!").waitFor({ timeout: 30000 });
  await c.screenshot({ path: "shots/items-stamped.png" });
  const { data: m } = await admin.from("moments").select("item_id").eq("shop_id", shop.id).eq("kind", "stamp").single();
  const { data: mi } = await admin.from("items").select("name").eq("id", m.item_id ?? -1).maybeSingle();
  console.log(mi?.name === "Parfum 50 ml" ? "✓ the tampon is written against Parfum 50 ml" : `✗ tampon item: ${mi?.name}`);
  // and after the scan, the counter asks again (never the last customer's perfume left over)
  await o.waitForTimeout(4000);
  console.log((await o.locator("[data-qr]").count()) === 0 ? "✓ after the scan, the counter asks again for the next customer" : "✗ after the scan the code stayed");
  await o.screenshot({ path: "shots/items-after.png" });
} finally {
  await browser.close();
  for (const d of [owner, cust]) {
    const { data } = await admin.from("people").select("id").eq("phone", `+216${d}`).maybeSingle();
    if (data) { await admin.from("shops").delete().eq("owner_id", data.id); await admin.auth.admin.deleteUser(data.id); }
  }
  await unrobot(admin, [owner, cust]);
}
process.exit(failed ? 1 : 0);
