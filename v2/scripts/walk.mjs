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
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = process.env.OUT || "shots";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
// walking the local server again and again: its sign-up and sign-in counters start from zero
if (/localhost|127\.0\.0\.1/.test(BASE)) for (const ip of ["local", "::1", "127.0.0.1"]) for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: key });
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
// robots, all three: on the list before they exist, so the founder's console never shows them (scripts/robots.mjs)
const ownerPhone = await robot(admin, phoneNo());
const customerPhone = await robot(admin, phoneNo());
let bossPhone = null;
// a piece of news for this walk's owner only (no real owner ever sees it)
const NEWS_TITLE = "جديد: اللوغو متاعك على الكارط";
let newsId = null;

// SIZE=375x667 walks a small phone; every screen says how far it scrolls, if it does
const [W, H] = (process.env.SIZE || "390x844").split("x").map(Number);
const phone = { viewport: { width: W, height: H }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN" };
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
const shot = async (page, name, wait = 900) => {
  await page.waitForTimeout(wait);
  // the dev server's own badge is not part of the app
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.screenshot({ path: `${OUT}/${name}.png` });
  // the page, and every page frame (a <main>, the card questions' form): none may hold more than the screen
  // — except the founder's console, which is a desk, not a phone screen: it scrolls on purpose
  if (page.url().includes("/admin")) return void console.log("  ·", name, "(console: scrolls on purpose)");
  const over = await page.evaluate(() =>
    Math.max(document.documentElement.scrollHeight - innerHeight, ...[...document.querySelectorAll("main, body > form, main form.h-dvh")].map((m) => m.scrollHeight - m.clientHeight), 0),
  );
  console.log("  ·", name, over > 0 ? `— scrolls ${over}px` : "");
};
// a one-time note must stay away: wait a moment, then complain loudly if it came back
const never = async (page, what, locator, ms = 2500) => {
  await page.waitForTimeout(ms);
  if (await locator.isVisible().catch(() => false)) console.log(`  ! ${what} showed twice`);
  else console.log(`  · ${what}: not again ✓`);
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
  // the founder's first video, when there is one: it opens over the page
  const pill = o.getByRole("button", { name: /كيفاش|فيديو/ }).first();
  if (await pill.count()) {
    await pill.click();
    await o.locator("iframe[src*='youtube']").waitFor({ timeout: 20000 });
    await shot(o, "01b-video", 1200);
    await o.keyboard.press("Escape");
  }
  await o.goto(BASE + "/shop/new", { waitUntil: "load" });
  await o.locator('input[name="name"]').fill("ياسمين");
  await o.locator('input[name="phone"]').fill(ownerPhone);
  await o.locator('input[name="password"]').fill("yasmine123");
  await shot(o, "02-owner-account", 300);
  await Promise.all([o.waitForURL("**/shop/setup", { timeout: 60000 }), o.locator('button[type="submit"]').click()]);
  await o.locator('input[name="name"]').fill("Café Yasmine");
  await o.getByRole("button", { name: "قهوة" }).click();
  // the logo (not needed): a picture from the phone, made small, shown beside the name
  await o.locator('input[type="file"]').setInputFiles("app/apple-icon.png");
  await o.locator('img[src*="/logos/"]').first().waitFor({ timeout: 30000 });
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
  // the card, one question at a time: the hello, how many, which gift, how long between two, which colour, ready
  await o.getByRole("heading", { name: /توّا نعملو مع بعضنا/ }).waitFor({ timeout: 30000 });
  await shot(o, "04a-card-hello", 1600);
  await o.reload({ waitUntil: "load" });
  await never(o, "the card's hello (reload)", o.getByRole("heading", { name: /توّا نعملو مع بعضنا/ }), 1500);
  await o.getByText("قدّاش من تامبون").first().waitFor({ timeout: 20000 });
  await o.getByRole("textbox", { name: "ولا اكتب العدد" }).fill("15");
  await shot(o, "04b2-card-goal-typed", 500);
  await o.getByRole("button", { name: "5", exact: true }).click();
  await shot(o, "04b-card-goal", 600);
  await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByText("شنوّة يربح الحريف").waitFor();
  await shot(o, "04c-card-gift", 600);
  await o.getByRole("button", { name: "كمّل" }).click();
  // the wait between two tampons: an hour stays (the rest of the walk scans by the hour)
  await o.getByText("كل قدّاش ينجم الحريف").waitFor();
  await shot(o, "04c2-card-wait", 600);
  await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByRole("button", { name: "#FF6B4A" }).click();
  await shot(o, "04d-card-color", 600);
  await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByText("الكارط متاعك حاضرة").waitFor();
  await shot(o, "04-owner-card", 1200);
  // the button breathes: Playwright never finds it "stable", so the click is forced; a sheet says how the card works first
  await o.getByRole("button", { name: "حلّ الكود" }).click({ force: true });
  await o.getByRole("dialog", { name: "هكّا تخدم الكارط متاعك" }).waitFor({ timeout: 20000 });
  await shot(o, "04e-card-how", 700);
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop", { timeout: 60000 }), o.getByRole("button", { name: "باهي، حلّ الكود" }).click()]);
  // the card is ready: the bravo meets them on their own home and asks for one
  // thing — press «ورّي الكود». That is what opens the counter, and its note.
  await o.getByText("برافو").waitFor({ timeout: 30000 });
  await shot(o, "05a-bravo", 1400);
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop/qr", { timeout: 60000 }), o.getByRole("button", { name: "ورّي الكود" }).click()]);
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
  await o.reload({ waitUntil: "load" });
  await never(o, "the bravo (reload)", o.getByText("برافو"));
  await o.goto(BASE + "/shop/qr", { waitUntil: "load" });
  await o.locator("[data-qr]").waitFor({ timeout: 30000 });

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
  // the gift's code, on the customer's phone, to show at the counter
  await c.getByRole("link", { name: /ورّي الكود متاع الكادو/ }).click();
  await c.getByRole("dialog", { name: /الكادو متاعك/ }).waitFor({ timeout: 30000 });
  await shot(c, "10b-gift-code", 900);
  // the code itself: whole on the screen, big enough for a camera (its sheet once stayed cut inside the gift's box)
  const giftQr = await c.evaluate(() => {
    const r = document.querySelector('[role="dialog"] div.aspect-square')?.getBoundingClientRect();
    return r ? { w: Math.round(r.width), top: Math.round(r.top), bottom: Math.round(r.bottom), left: Math.round(r.left), right: Math.round(r.right), vw: innerWidth, vh: innerHeight } : null;
  });
  console.log(giftQr && giftQr.w >= 170 && giftQr.top >= 0 && giftQr.bottom <= giftQr.vh && giftQr.left >= 0 && giftQr.right <= giftQr.vw ? "  · the gift's code: whole on the screen ✓" : `  ! the gift's code is cut: ${JSON.stringify(giftQr)}`);
  // the counter shows who won, and the camera to hand it over (never a tap alone)
  await o.getByRole("link", { name: "سكاني" }).waitFor({ timeout: 20000 });
  await shot(o, "11-counter-gift", 1200);
  // the owner types the code under the customer's QR: the question comes up, the gift is handed over
  const { data: gifted } = await admin.from("people").select("code").eq("phone", `+216${customerPhone}`).single();
  await o.goto(BASE + "/shop/collect?by=code", { waitUntil: "load" });
  await o.getByRole("textbox").fill(gifted.code);
  await o.getByRole("button", { name: "إيه، عطيه الكادو" }).waitFor({ timeout: 20000 });
  await shot(o, "12-gift-question", 700);
  await o.getByRole("button", { name: "إيه، عطيه الكادو" }).click();
  await o.getByRole("heading", { name: /خذا/ }).waitFor({ timeout: 20000 });
  await shot(o, "12-counter-given", 900);

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
  {
    const { data: me } = await admin.from("people").select("id").eq("phone", `+216${ownerPhone}`).single();
    const { data: piece } = await admin
      .from("news")
      .insert({ title: NEWS_TITLE, body: "حطّ اللوغو متاعك ويبان على كارط كل حريف.", icon: "camera", cta_label: "حطّ اللوغو", cta_href: "/shop/setup?edit=1", only_people: [me.id] })
      .select("id")
      .single();
    newsId = piece.id;
  }
  await o.goto(BASE + "/shop", { waitUntil: "load" });
  await o.getByRole("dialog", { name: "اللوغو متاعك هوني" }).waitFor({ timeout: 20000 });
  await shot(o, "17d-logo-tip", 700);
  await o.getByRole("button", { name: "باهي", exact: true }).click();
  await shot(o, "17-owner-home");
  await o.reload({ waitUntil: "load" });
  await never(o, "the logo tip (reload)", o.getByRole("dialog", { name: "اللوغو متاعك هوني" }));
  // one note a visit: after the logo tip, the offer (a new shop's first 48 hours), then the news
  const offer = o.getByRole("dialog", { name: "عام كامل + 3 شهور بلاش" });
  await offer.waitFor({ timeout: 20000 });
  await shot(o, "17f-offer", 1300);
  await o.getByRole("button", { name: "من بعد" }).click();
  await o.reload({ waitUntil: "load" });
  await never(o, "the offer (reload)", offer, 1800);
  const news = o.getByRole("dialog", { name: NEWS_TITLE });
  await news.waitFor({ timeout: 20000 });
  await shot(o, "17e-news", 700);
  await o.getByRole("button", { name: "حطّ اللوغو" }).click();
  await o.waitForURL("**/shop/setup?edit=1", { timeout: 20000 });
  await o.goto(BASE + "/shop", { waitUntil: "load" });
  await never(o, "the news (back home)", news);
  // the welcome's own address, now that every note on this screen has had its turn
  await o.goto(BASE + "/shop?welcome=1", { waitUntil: "load" });
  await never(o, "the bravo (its old address)", o.getByText("برافو"));
  {
    // the same owner on another phone: the notes were written on the person, not on the first phone
    const other = await (await browser.newContext(phone)).newPage();
    await other.goto(BASE + "/login", { waitUntil: "load" });
    await other.locator('input[name="phone"]').fill(ownerPhone);
    await other.locator('input[name="password"]').fill("yasmine123");
    await Promise.all([other.waitForURL("**/shop", { timeout: 60000 }), other.locator('button[type="submit"]').click()]);
    await never(other, "the logo tip (another phone)", other.getByRole("dialog", { name: "اللوغو متاعك هوني" }));
    await never(other, "the news (another phone)", other.getByRole("dialog", { name: NEWS_TITLE }), 500);
    await never(other, "the offer (another phone)", other.getByRole("dialog", { name: "عام كامل + 3 شهور بلاش" }), 300);
    await other.goto(BASE + "/shop?welcome=1", { waitUntil: "load" });
    await never(other, "the bravo (another phone)", other.getByText("برافو"));
    await other.context().close();
  }
  // «عندك سؤال؟»: call, WhatsApp, the videos
  // the dev server's badge sits on this corner (not in production)
  await o.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await o.getByRole("button", { name: "عندك سؤال؟" }).click();
  await o.getByRole("dialog", { name: "عندك سؤال؟" }).waitFor();
  await shot(o, "17c-help", 600);
  await o.goto(BASE + "/shop/stats", { waitUntil: "load" });
  await shot(o, "18-owner-stats");
  await o.goto(BASE + "/shop/customers", { waitUntil: "load" });
  await shot(o, "19-owner-customers");
  // changing the card. A change no customer's card feels (the colour) is saved at once: no sheet, straight home
  await o.goto(BASE + "/shop/card", { waitUntil: "load" });
  for (let i = 0; i < 3; i++) await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByRole("button", { name: "#0891B2", exact: true }).click();
  await o.getByRole("button", { name: "كمّل" }).click();
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop", { timeout: 30000 }), o.getByRole("button", { name: "سجّل", exact: true }).click()]);
  console.log("  · the colour alone: saved at once ✓");
  // a customer in the middle of the card, and a harder card: one question, and the save goes all the way home
  await admin.from("cards").update({ stamps: 2 }).eq("user_id", who.id);
  await o.goto(BASE + "/shop/card", { waitUntil: "load" });
  await o.getByRole("button", { name: "8", exact: true }).click();
  for (let i = 0; i < 4; i++) await o.getByRole("button", { name: "كمّل" }).click();
  await o.getByRole("button", { name: "سجّل", exact: true }).click();
  const ask = o.getByRole("dialog", { name: "حريف واحد في نصّ الكارط" });
  await ask.waitFor({ timeout: 20000 });
  await ask.getByRole("radio", { name: /يبدّل للجديدة توّا/ }).click();
  await shot(o, "17b-card-change", 700);
  await Promise.all([o.waitForURL((u) => u.pathname === "/shop", { timeout: 30000 }), ask.getByRole("button", { name: "سجّل", exact: true }).click()]);
  const { data: switched } = await admin.from("cards").select("stamps, goal").eq("user_id", who.id).single();
  console.log(switched.goal === 8 && switched.stamps === 2 ? "  · the card changed: the customer switched to it, tampons kept ✓" : `  ! the customer's card after the change: ${JSON.stringify(switched)}`);
  await o.goto(BASE + "/me", { waitUntil: "load" });
  await shot(o, "16b-owner-account");

  // ── the founder's console, through a throwaway admin ──
  bossPhone = await robot(admin, phoneNo());
  const { data: bossUser } = await admin.auth.admin.createUser({ email: `216${bossPhone}@phone.pointidi.app`, password: "boss-walk-123", email_confirm: true, app_metadata: { phone: `+216${bossPhone}` } });
  await admin.from("people").upsert({ id: bossUser.user.id, name: "Boss", phone: `+216${bossPhone}`, is_admin: true });
  const a = await (await browser.newContext(phone)).newPage();
  await a.goto(BASE + "/login", { waitUntil: "load" });
  await a.locator('input[name="phone"]').fill(bossPhone);
  await a.locator('input[name="password"]').fill("boss-walk-123");
  await Promise.all([a.waitForURL("**/admin**", { timeout: 60000 }), a.locator('button[type="submit"]').click()]);
  await shot(a, "20-admin");
  // the traffic (the walks are robots: shown with «مع زياراتي»), and the settings
  for (const [tab, name] of [["overview", "25-traffic"], ["pages", "25b-traffic-pages"], ["sources", "25c-traffic-sources"], ["visits", "25d-traffic-visits"]]) {
    await a.goto(`${BASE}/admin/traffic?all=1&tab=${tab}`, { waitUntil: "load" });
    await shot(a, name, 400);
  }
  const firstVisit = a.locator('a[href*="tab=visits"][href*="v="]').first();
  if (await firstVisit.count()) {
    await firstVisit.click();
    await a.waitForURL("**v=**");
    await shot(a, "25e-traffic-visit", 400);
  }
  await a.goto(`${BASE}/admin/traffic?all=1&tab=heat&h=${encodeURIComponent("/:welcome")}`, { waitUntil: "load" });
  await shot(a, "25f-traffic-heat", 800);
  await a.goto(`${BASE}/admin/settings`, { waitUntil: "load" });
  await shot(a, "26-settings", 300);
  await a.goto(`${BASE}/admin/news`, { waitUntil: "load" });
  await shot(a, "27-news", 300);
  if (newsId) {
    await a.goto(`${BASE}/admin/news?id=${newsId}`, { waitUntil: "load" });
    await shot(a, "27b-news-piece", 400);
  }
  await a.goto(`${BASE}/admin/news?new=1`, { waitUntil: "load" });
  await a.locator('input[name="title"]').fill("توّا تنجم تحط اللوغو متاعك");
  await a.locator('textarea[name="body"]').fill("يبان على كارط كل حريف، وتبدّلو وقتلّي تحب.");
  await a.getByRole("button", { name: "المحل (الإسم واللوغو)" }).click();
  await a.locator('input[name="cta_label"]').fill("جرّبها توّا");
  await shot(a, "27c-news-new", 400);
  // the books: an expense and a line of income written by hand, each in its list, then taken back (a script's lines: never in the founder's own books)
  await a.goto(`${BASE}/admin/payments`, { waitUntil: "load" });
  await a.getByPlaceholder("مثلا: سبونسور فيسبوك").fill("سبونسور فيسبوك");
  await a.getByRole("textbox", { name: "قدّاش؟ (د)" }).fill("47,35");
  await a.getByRole("radio", { name: "إشهار" }).click();
  await a.getByRole("button", { name: "سجّل", exact: true }).click();
  const spentLine = a.getByRole("row", { name: /سبونسور فيسبوك/ }).first();
  await spentLine.waitFor({ timeout: 20000 });
  const spentSays = (await spentLine.textContent()).replace(/\s+/g, " ");
  console.log(spentSays.includes("47,35") && spentSays.includes("إشهار") ? "  · an expense written: its line is in the books ✓" : `  ! the expense's line says: ${spentSays}`);
  await a.getByRole("radio", { name: "دخل", exact: true }).click();
  await a.getByPlaceholder("مثلا: خدمة لمحل").fill("خدمة طباعة لمحل");
  await a.getByRole("textbox", { name: "قدّاش؟ (د)" }).fill("50");
  await a.getByRole("radio", { name: "خدمة" }).click();
  await a.getByRole("button", { name: "سجّل", exact: true }).click();
  const earnedLine = a.getByRole("row", { name: /خدمة طباعة لمحل/ }).first();
  await earnedLine.waitFor({ timeout: 20000 });
  await shot(a, "28-books", 400);
  const earnedSays = (await earnedLine.textContent()).replace(/\s+/g, " ");
  console.log(earnedSays.includes("50") && earnedSays.includes("خدمة") ? "  · a line of income written: in the book with the subscriptions ✓" : `  ! the income's line says: ${earnedSays}`);
  for (const row of [spentLine, earnedLine]) {
    await row.getByRole("button", { name: "افسخ السطر هذا" }).click();
    await row.getByRole("button", { name: "افسخ", exact: true }).click();
    await row.waitFor({ state: "detached", timeout: 20000 });
  }
  console.log("  · …and both taken back ✓");
  await a.goto(`${BASE}/admin/shops`, { waitUntil: "load" });
  await shot(a, "21-admin-shops");
  await a.locator('a[href^="/admin/shops/"]').first().click();
  await a.waitForURL("**/admin/shops/**");
  await shot(a, "21b-admin-shop");
  await a.goto(BASE + "/admin/people", { waitUntil: "load" });
  await shot(a, "22-admin-people");
  // a customer, not an admin: only they have the password and delete tools
  await a.goto(BASE + "/admin/people?q=" + encodeURIComponent("سامي"), { waitUntil: "load" });
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
  if (newsId) await admin.from("news").delete().eq("id", newsId);
  // the throwaway admin too, should the walk stop half way
  for (const p of [ownerPhone, customerPhone, bossPhone].filter(Boolean)) {
    const { data } = await admin.from("people").select("id").eq("phone", `+216${p}`).maybeSingle();
    if (data) {
      const { data: files } = await admin.storage.from("logos").list(data.id);
      if (files?.length) await admin.storage.from("logos").remove(files.map((f) => `${data.id}/${f.name}`));
      await admin.from("shops").delete().eq("owner_id", data.id);
      await admin.auth.admin.deleteUser(data.id);
    }
  }
  await unrobot(admin, [ownerPhone, customerPhone, bossPhone]);
  console.log("cleaned up the walk's accounts");
}
