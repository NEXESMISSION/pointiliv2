/**
 * «الحريف يختار الكادو» (13 Nov 2026) end to end, and taking customers off the list: the owner turns the choice on
 * and lists the gifts, a customer who fills the card picks one on their phone, another one picks at the counter, the
 * cases that must be refused, the choice turned off — then customers removed, one from their sheet, two at once.
 * On localbase and the real UI; throwaway accounts.
 *
 *   BASE=http://localhost:3302 OUT=.e2e/choice node scripts/choice.mjs   (from v2/)
 */
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3302";
const OUT = process.env.OUT || ".e2e/choice";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("choice.mjs runs on this computer only");
mkdirSync(OUT, { recursive: true });
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL, ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: k });
const users = [], phones = [];
async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`); phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: "demo-1234", email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error; users.push(data.user.id);
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email: `216${d}@phone.pointidi.app`, password: "demo-1234" });
  const me = (await client.rpc("me")).data; if (name) await client.rpc("set_name", { p_name: name });
  await admin.from("people").update({ seen: ["card_hello", "coach", "logo_tip", "offer", "install", "links_tip", "new_insights", "reset_tip", "first_gift"] }).eq("id", data.user.id);
  return { id: data.user.id, client, digits: d, code: me?.code };
}
const rpc = async (who, fn, args = {}) => { const { data, error } = await who.client.rpc(fn, args); if (error) console.log(`  ! ${fn}: ${error.message}`); return data; };
const err = (r) => r?.error ?? (r?.ok ? "ok" : JSON.stringify(r));
const view = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
let browser, failed = 0;
const ok = (what, cond, more = "") => { console.log(`  ${cond ? "✓" : "✗"} ${what}${more ? ` (${more})` : ""}`); if (!cond) failed++; };
const shot = async (p, n, w = 700) => { await p.waitForTimeout(w); await p.screenshot({ path: `${OUT}/${n}.png` }); console.log("  ·", n); };
async function login(who, next) {
  const ctx = await browser.newContext(view); const p = await ctx.newPage();
  p.on("load", () => void p.addStyleTag({ content: "nextjs-portal{display:none!important}" }).catch(() => {}));
  await p.goto(BASE + "/login", { waitUntil: "load" });
  await p.locator('input[name="phone"]').fill(who.digits); await p.locator('input[name="password"]').fill("demo-1234");
  await Promise.all([p.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 60000 }).catch(() => {}), p.locator('button[type="submit"]').click()]);
  if (next) await p.goto(BASE + next, { waitUntil: "load" });
  return p;
}
const gift = async (who) => (await rpc(who, "me")).shop.gift;

try {
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  console.log("\nThe owner turns it on");
  const owner = await person("ياسمين");
  await rpc(owner, "open_shop", { p_name: "Café El Medina", p_kind: "cafe" });
  await rpc(owner, "save_card", { p_goal: 3, p_gift: "قهوة", p_color: "#b5541c", p_gap: 0 });
  // off, it is one of the card's options on «خيارات الكارط»; on, «المحل»'s line for the options says it too
  const o = await login(owner, "/shop/options");
  ok("«الحريف يختار الكادو» is on «خيارات الكارط», off", (await o.getByText("الحريف يختار الكادو").count()) === 1 && (await o.getByText("مطفي: الكادو واحد").count()) === 1);
  await o.goto(BASE + "/shop/settings", { waitUntil: "load" });
  ok("…and «المحل» does not say it while off", (await o.getByText(/الحريف يختار/).count()) === 0);
  await o.goto(BASE + "/shop/choices", { waitUntil: "load" });
  await shot(o, "1-off", 900);
  await o.getByRole("switch", { name: "الحريف يختار" }).click();
  for (const n of ["كابوسان", "كرواسون"]) await o.getByRole("button", { name: n, exact: true }).click();
  await shot(o, "2-on", 400);
  await o.getByRole("button", { name: "سجّل" }).click();
  await o.getByText("تسجّل").first().waitFor({ timeout: 15000 }).catch(() => {});
  ok("saved: «قهوة · كابوسان · كرواسون»", (await gift(owner)) === "قهوة · كابوسان · كرواسون", await gift(owner));
  await o.goto(BASE + "/shop/options", { waitUntil: "load" });
  ok("on: «خيارات الكارط» shows the gifts", (await o.getByText("قهوة · كابوسان · كرواسون").count()) >= 1);
  await o.goto(BASE + "/shop/settings", { waitUntil: "load" });
  ok("…and «المحل»'s line for the options says it", (await o.getByText(/الحريف يختار/).count()) >= 1);

  console.log("\nThe cases");
  ok("one gift is not a choice", err(await rpc(owner, "set_gift_choices", { p_options: ["قهوة"] })) === "count");
  ok("five are too many", err(await rpc(owner, "set_gift_choices", { p_options: ["أ ب", "ت ث", "ج ح", "خ د", "ذ ر"] })) === "count");
  ok("too long together", err(await rpc(owner, "set_gift_choices", { p_options: ["قهوة كبيرة بالحليب", "كرواسون بالشكلاطة", "عصير فريز طبيعي", "مشروب بارد كبير"] })) === "too_long");

  console.log("\nA customer chooses on their card");
  const sami = await person("سامي");
  for (let i = 0; i < 3; i++) await rpc(owner, "give_stamp", { p_who: sami.digits });
  const card = (await rpc(sami, "wallet"))[0]?.id;
  const c = await login(sami, `/c/${card}`);
  await c.getByText("اختار الكادو متاعك").waitFor({ timeout: 20000 }).catch(() => {});
  await shot(c, "3-choose", 600);
  ok("the full card asks «اختار الكادو متاعك», with the three", (await c.getByRole("button", { name: "كرواسون" }).count()) === 1 && (await c.getByRole("button", { name: "قهوة" }).count()) >= 1);
  await c.getByRole("button", { name: "كرواسون" }).click();
  await c.getByText("اخترت كرواسون").waitFor({ timeout: 15000 }).catch(() => {});
  await shot(c, "4-chosen", 500);
  const m1 = (await admin.from("moments").select("id, gift").eq("card_id", card).eq("kind", "gift")).data?.[0];
  ok("the voucher is «كرواسون» now", m1?.gift === "كرواسون", m1?.gift);
  ok("chosen once: no second choice on it", err(await rpc(sami, "choose_gift", { p_moment: m1.id, p_option: "قهوة" })) === "no_choice");

  console.log("\nAnother one chooses at the counter");
  const rim = await person("ريم");
  for (let i = 0; i < 3; i++) await rpc(owner, "give_stamp", { p_who: rim.digits });
  const m2 = (await admin.from("moments").select("id, gift").eq("card_id", (await rpc(rim, "wallet"))[0].id).eq("kind", "gift")).data?.[0];
  const stranger = await person("كريم");
  ok("a stranger cannot choose for her", err(await rpc(stranger, "choose_gift", { p_moment: m2.id, p_option: "قهوة" })) === "not_found");
  ok("nor anything not on the list", err(await rpc(rim, "choose_gift", { p_moment: m2.id, p_option: "بيتزا" })) === "invalid");
  await o.goto(BASE + "/shop/collect?by=code", { waitUntil: "load" });
  await o.getByRole("textbox").first().fill(rim.code);
  await o.getByText("شنوّة يختار؟", { exact: false }).waitFor({ timeout: 20000 }).catch(() => {});
  await shot(o, "5-counter", 400);
  ok("the counter asks what she chooses", (await o.getByRole("button", { name: "كابوسان" }).count()) === 1);
  await o.getByRole("button", { name: "كابوسان" }).click();
  await o.waitForTimeout(2500);
  await shot(o, "6-counter-given", 300);
  const m2b = (await admin.from("moments").select("gift, given_at").eq("id", m2.id)).data?.[0];
  ok("…«كابوسان», handed over in the same tap", m2b?.gift === "كابوسان" && !!m2b?.given_at, JSON.stringify(m2b));

  console.log("\nTurned off");
  const nour = await person("نور");
  await rpc(owner, "give_stamp", { p_who: nour.digits }); // on her way, under the choice
  ok("off: the gift is the first one alone", err(await rpc(owner, "set_gift_choices", { p_options: null })) === "ok" && (await gift(owner)) === "قهوة");
  ok("…and a customer on her way keeps the choice she started with", (await rpc(nour, "wallet"))[0]?.shop?.gift === "قهوة · كابوسان · كرواسون", (await rpc(nour, "wallet"))[0]?.shop?.gift);
  await rpc(owner, "set_wheel", { p_on: false });
  await admin.from("shops").update({ wheel_on: true }).eq("owner_id", owner.id);
  ok("on the roulette: refused (the gift is luck)", err(await rpc(owner, "set_gift_choices", { p_options: ["قهوة", "شاي"] })) === "wheel");
  await admin.from("shops").update({ wheel_on: false }).eq("owner_id", owner.id);

  console.log("\nCustomers taken off the list");
  await o.goto(BASE + "/shop/customers", { waitUntil: "load" });
  await o.getByText("سامي").first().click();
  await o.getByRole("button", { name: "نحّي الحريف" }).first().waitFor({ timeout: 15000 });
  await shot(o, "7-sheet-remove", 400);
  ok("«نحّي الحريف» at the top of the customer's sheet", (await o.getByRole("button", { name: "نحّي الحريف" }).count()) >= 1);
  await o.getByRole("button", { name: "نحّي الحريف" }).first().click();
  await o.getByRole("button", { name: "إيه، نحّيه" }).click();
  await o.waitForTimeout(2000);
  ok("سامي is off the list", (await o.getByText("سامي").count()) === 0);
  await o.getByRole("button", { name: "نحّي حرفاء" }).click();
  await o.getByText("ريم").first().click();
  await o.getByText("نور").first().click();
  await shot(o, "8-many", 400);
  await o.getByRole("button", { name: "نحّي 2 حرفاء" }).click();
  await o.getByRole("button", { name: "إيه، نحّيه" }).click();
  await o.waitForTimeout(3000);
  await shot(o, "9-after", 400);
  ok("ريم and نور off the list at once", (await o.getByText("ريم").count()) === 0 && (await o.getByText("نور").count()) === 0);
  const left = (await admin.from("cards").select("id").eq("shop_id", (await rpc(owner, "me")).shop.id)).data ?? [];
  ok("their cards are gone (their accounts stay)", left.length === 0, `${left.length} left`);

  console.log(failed ? `\n${failed} FAILED` : "\nAll good. Screens in " + OUT);
} finally {
  if (browser) await browser.close();
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  process.exitCode = failed ? 1 : 0;
}
