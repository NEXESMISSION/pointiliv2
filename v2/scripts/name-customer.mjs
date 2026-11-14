/**
 * An owner writes the name of a customer who has no account yet (14 Nov 2026, a client: «give me an access to
 * write the customer's name by hand while he has no account»): at the counter, giving a tampon to a new number; and
 * later, from the customer's sheet in «الحرفاء». Never for somebody with their own account, never from another shop.
 * On this computer only; every account is a robot, removed after.
 *   BASE=http://localhost:3302 node scripts/name-customer.mjs
 */
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3302";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("name-customer runs on this computer only");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "name-check-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission", "links_tip", "new_insights", "reset_tip"];
let pass = 0;
let fail = 0;
const check = (label, ok, info) => {
  if (ok) pass++;
  else fail++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${ok || info === undefined ? "" : ` — ${JSON.stringify(info)}`}`);
};
const phones = [];
const users = [];
const num = async () => {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  return d;
};
async function owner(name, shop) {
  const d = await num();
  const { data } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  users.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES, password_set: true });
  const { data: s } = await admin.from("shops").insert({ owner_id: data.user.id, name: shop, kind: "cafe", goal: 8, gift: "قهوة", color: "#6C47FF", trial_first: false, stamp_gap: 0, paid_until: new Date(Date.now() + 30 * 864e5).toISOString() }).select("id").single();
  return { id: data.user.id, digits: d, shop: s.id };
}
const personOf = async (d) => (await admin.from("people").select("id, name, made_by_shop, password_set").eq("phone", `+216${d}`).maybeSingle()).data;
let browser;
async function signIn(o) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.locator('input[name="phone"]').fill(o.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  return page;
}
/** a tampon by number at the counter; `name`: what the owner writes for a new number (none: left empty) */
async function byNumber(page, d, name) {
  await page.goto(`${BASE}/shop/collect?by=phone`, { waitUntil: "load" });
  await page.getByRole("textbox").first().fill(d);
  await page.getByRole("button", { name: /زيد التامبون|زيد تامبون/ }).first().waitFor({ timeout: 20000 });
  const field = page.getByRole("textbox", { name: "إسمو، كان تحب" });
  const fresh = await field.isVisible().catch(() => false);
  if (name && fresh) await field.fill(name);
  await page.getByRole("button", { name: /زيد التامبون|زيد تامبون/ }).first().click();
  await page.getByRole("button", { name: "غلطت؟ فسّخ التامبون" }).waitFor({ timeout: 20000 });
  return fresh;
}
async function openSheet(page, label) {
  await page.goto(`${BASE}/shop/customers`, { waitUntil: "load" });
  await page.getByRole("button", { name: new RegExp(label) }).first().click();
  await page.getByRole("dialog").first().waitFor({ timeout: 15000 });
}

try {
  for (const ip of ["local", "::1", "127.0.0.1"]) for (const k of [`join-ip:${ip}`, `login-ip:${ip}`, `phone_card:${ip}`]) await admin.rpc("forget_tries", { p_key: k });
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const a = await owner("هشام", "Café Nom");
  const b = await owner("وليد", "Snack Voisin");
  const n1 = await num();
  const n2 = await num();

  console.log("\nAt the counter: a new number, its name written");
  const pa = await signIn(a);
  check("the new number's card has the name field", await byNumber(pa, n1, "أحمد بن علي"));
  const p1 = await personOf(n1);
  check("the name is written on the account the tampon made", p1?.name === "أحمد بن علي" && p1?.made_by_shop === a.shop && p1?.password_set === false, p1);
  check("…and a new number with no name typed stays nameless (as before)", (await byNumber(pa, n2, null)) && (await personOf(n2))?.name === "");

  console.log("\nIn «الحرفاء»: the owner writes or corrects the name");
  await pa.goto(`${BASE}/shop/customers`, { waitUntil: "load" });
  const list = await pa.locator("body").innerText();
  check("the list shows the written name, and «حريف» for the other", list.includes("أحمد بن علي") && list.includes("حريف"));
  await openSheet(pa, "أحمد بن علي");
  await pa.getByRole("button", { name: /بدّل الإسم/ }).click();
  await pa.getByRole("textbox", { name: "اكتب إسمو" }).fill("أحمد");
  await pa.getByRole("button", { name: "سجّل" }).click();
  await pa.waitForTimeout(1500);
  check("corrected from the sheet", (await personOf(n1))?.name === "أحمد");
  await openSheet(pa, "حريف");
  await pa.getByRole("button", { name: /اكتب إسمو/ }).click();
  await pa.getByRole("textbox", { name: "اكتب إسمو" }).fill("ب");
  await pa.getByRole("button", { name: "سجّل" }).click();
  await pa.getByText("اكتب إسم من 2 لـ30 حرف").waitFor({ timeout: 10000 });
  check("one letter is not a name: said, nothing written", (await personOf(n2))?.name === "");
  await pa.getByRole("textbox", { name: "اكتب إسمو" }).fill("سامي");
  await pa.getByRole("button", { name: "سجّل" }).click();
  await pa.waitForTimeout(1500);
  check("the nameless one named from the sheet", (await personOf(n2))?.name === "سامي");

  console.log("\nNever somebody else's");
  const pb = await signIn(b);
  check("another shop gives a tampon to the same number: no name field (the number is known)", !(await byNumber(pb, n1, "اسم آخر")));
  await openSheet(pb, "أحمد");
  check("…and its sheet has no way to change the name", (await pb.getByRole("button", { name: /بدّل الإسم|اكتب إسمو/ }).count()) === 0);
  check("…the name is still the first shop's", (await personOf(n1))?.name === "أحمد");
  // the person signs up with the number: the account is theirs, the owner's way to name it goes
  await admin.from("people").update({ password_set: true, name: "Ahmed" }).eq("phone", `+216${n1}`);
  await openSheet(pa, "Ahmed");
  check("once the person has their own account: no way to change their name", (await pa.getByRole("button", { name: /بدّل الإسم|اكتب إسمو/ }).count()) === 0);
} catch (e) {
  fail++;
  console.log("  ✗ stopped:", e.message);
} finally {
  await browser?.close().catch(() => {});
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  const { data: made } = await admin.from("people").select("id").in("phone", phones.map((d) => `+216${d}`));
  for (const p of made ?? []) await admin.auth.admin.deleteUser(p.id).catch(() => {});
  await unrobot(admin, phones);
  console.log(`\n${pass} ✓ · ${fail} ✗ (accounts removed)`);
  process.exit(fail ? 1 : 0);
}
