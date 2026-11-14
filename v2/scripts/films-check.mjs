/**
 * The two option films, as an owner meets them (14 Nov 2026): «▶ شوف كيفاش يخدم» on «شنوّة تبيع؟» and on «الحريف يختار
 * الكادو» opens the film over the page — its poster there at once, the film playing within a few seconds, how
 * heavy it is on the way. On this computer only; the robot owner is removed after.
 *   BASE=http://localhost:3302 node scripts/films-check.mjs
 */
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3302";
if (!/localhost|127\.0\.0\.1/.test(BASE)) throw new Error("films-check runs on this computer only");
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "films-check-2026";
let pass = 0;
let fail = 0;
const check = (label, ok, info) => {
  ok ? pass++ : fail++;
  console.log(`${ok ? "  ✓" : "  ✗"} ${label}${ok || info === undefined ? "" : ` — ${JSON.stringify(info)}`}`);
};

const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
const { data: u } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
const id = u.user.id;
let browser;
try {
  await admin.from("people").upsert({ id, name: "تست", phone: `+216${d}`, seen: ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission", "links_tip", "new_insights", "reset_tip"], password_set: true });
  await admin.from("shops").insert({ owner_id: id, name: "Café Films", kind: "cafe", goal: 8, gift: "قهوة", color: "#6C47FF", trial_first: false, paid_until: new Date(Date.now() + 30 * 864e5).toISOString() });
  browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  const page = await ctx.newPage();
  const bytes = {};
  page.on("response", async (r) => {
    const m = r.url().match(/\/clips\/([^?]+)$/);
    if (m) bytes[m[1]] = (bytes[m[1]] ?? 0) + Number(r.headers()["content-length"] ?? 0);
  });
  await page.goto(`${BASE}/login`, { waitUntil: "load" });
  await page.locator('input[name="phone"]').fill(d);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  for (const [path, file, label] of [
    ["/shop/items", "shop-items-v2", "«شنوّة تبيع؟»"],
    ["/shop/choices", "gift-choice-v2", "«الحريف يختار الكادو»"],
  ]) {
    await page.goto(BASE + path, { waitUntil: "load" });
    await page.getByRole("button", { name: /شوف كيفاش يخدم/ }).first().click();
    const video = page.locator("video").first();
    await video.waitFor({ timeout: 15000 });
    const poster = await video.getAttribute("poster");
    check(`${label}: the film opens with its poster`, poster === `/clips/${file}.webp`, poster);
    const p = await page.request.get(BASE + `/clips/${file}.webp`);
    check(`${label}: the poster is there (${(await p.body()).length} B)`, p.ok() && (await p.body()).length > 1000);
    await page.waitForTimeout(3500);
    const st = await video.evaluate((v) => ({ t: v.currentTime, ready: v.readyState, w: v.videoWidth, h: v.videoHeight, dur: v.duration, err: v.error?.code ?? null }));
    check(`${label}: it plays (${st.t.toFixed(1)} s of ${st.dur.toFixed(1)} s, ${st.w}×${st.h})`, st.t > 1 && st.ready >= 2 && st.w === 540 && !st.err, st);
    await page.keyboard.press("Escape");
  }
  for (const [f, n] of Object.entries(bytes)) console.log(`    · ${f}: ${(n / 1024).toFixed(0)} KB on the way`);
} catch (e) {
  fail++;
  console.log("  ✗ stopped:", e.message);
} finally {
  await browser?.close().catch(() => {});
  await admin.from("shops").delete().eq("owner_id", id);
  await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, [d]);
  console.log(`\n${pass} ✓ · ${fail} ✗`);
  process.exit(fail ? 1 : 0);
}
