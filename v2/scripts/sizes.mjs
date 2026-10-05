/**
 * Every screen, at every shape of screen — what a phone's browser really
 * leaves (its bars take 100–180px: an iPhone SE in Safari is 375×548), small
 * and tall phones, the desktop app's pane with a computer's scrollbars, a
 * tablet, a laptop — and what goes wrong on each: the page scrolls, a box
 * scrolls that should not, something sticks out of the screen, or something
 * is cut by its own box. A box that is a real list (customers, the latest
 * moments) carries `data-list` and may scroll inside. Under 548px of height
 * a screen may scroll as a whole, but nothing may be cut. A size ending in
 * «d» is a computer: no touch, real scrollbars. Pictures: .e2e/sizes/<size>/.
 *
 *   node scripts/sizes.mjs                       (from v2/, dev server on :3200)
 *   SIZES=354x610d,360x540 ONLY=wizard,home node scripts/sizes.mjs
 *
 * ONLY keeps the screens whose name starts with one of the words. It makes
 * its own throwaway accounts and deletes them at the end.
 */
import { mkdirSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = process.env.OUT || ".e2e/sizes";
const ALL_SIZES = [
  "320x480", // the smallest iPhone in Safari: may scroll, never cut
  "360x540", // a small Android in Chrome, with its bars
  "375x548", // iPhone SE in Safari
  "354x610d", // the desktop app's pane, a computer's scrollbars
  "360x640",
  "390x664", // a tall iPhone in Safari
  "375x667",
  "412x732", // a Pixel in Chrome
  "360x740",
  "390x844", // the app added to the home screen
  "430x932",
  "442x763d",
  "480x600d", // a short window on a computer
  "768x1024", // a tablet
  "1280x720d", // a laptop
  "1440x900d",
];
const SIZES = (process.env.SIZES ? process.env.SIZES.split(",") : ALL_SIZES).map((s) => {
  const desk = s.trim().endsWith("d");
  const [w, h] = s.trim().replace(/d$/, "").split("x").map(Number);
  return [w, h, desk];
});
const ONLY = process.env.ONLY ? process.env.ONLY.split(",").map((s) => s.trim()) : null;
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const anonDb = () => createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const PASS = "sizes-check-2026";
const ALL_NOTES = ["card_hello", "coach", "logo_tip", "offer"];
const made = [];
const ago = (ms) => new Date(Date.now() - ms).toISOString();
const HOUR = 3600_000;

// ── the people this run needs ──────────────────────────────────────────────
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const phones = [];
async function person(name, extra = {}) {
  // a robot: on the list before it exists, so the founder's console never shows it (scripts/robots.mjs)
  const d = await robot(admin, phoneNo());
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  const id = data.user.id;
  made.push(id);
  await admin.from("people").upsert({ id, name, phone: `+216${d}`, seen: ALL_NOTES, ...extra });
  const { data: row } = await admin.from("people").select("code").eq("id", id).single();
  return { id, digits: d, name, code: row.code };
}
async function shopOf(owner, fields) {
  const { data, error } = await admin.from("shops").insert({ owner_id: owner.id, kind: "cafe", color: "#6C47FF", ...fields }).select("*").single();
  if (error) throw error;
  return data;
}
async function cardAt(shop, who, stamps, { gift = false, lastAgo = 2 * HOUR } = {}) {
  const { data: c, error } = await admin
    .from("cards")
    .insert({ shop_id: shop.id, user_id: who.id, stamps, goal: shop.goal, gift: shop.gift, last_at: ago(lastAgo), created_at: ago(9 * 86_400_000) })
    .select("id")
    .single();
  if (error) throw error;
  const moments = Array.from({ length: Math.min(stamps, 4) }, (_, i) => ({ shop_id: shop.id, card_id: c.id, kind: "stamp", created_at: ago(lastAgo + i * 20 * HOUR) }));
  if (gift) moments.push({ shop_id: shop.id, card_id: c.id, kind: "gift", gift: shop.gift, created_at: ago(lastAgo) });
  if (moments.length) await admin.from("moments").insert(moments);
  return c.id;
}

for (const ip of ["local", "::1", "127.0.0.1"]) for (const key of [`join-ip:${ip}`, `login-ip:${ip}`]) await admin.rpc("forget_tries", { p_key: key });

console.log("setting up…");
// the owner, an established café with customers, a gift to hand over, the offer running
const owner = await person("سامي بن عمر");
const shop = await shopOf(owner, { name: "Pâtisserie El Medina", goal: 8, gift: "قهوة بلاش", created_at: ago(5 * 86_400_000), offer_at: ago(HOUR) });
const names = ["نور الهدى", "محمد أمين", "ياسمين", "أحمد", "سلمى", "خليل", "مريم", "يوسف"];
const regulars = [];
for (const [i, n] of names.entries()) {
  const p = await person(n);
  regulars.push(p);
  await cardAt(shop, p, (i % 7) + 1, { gift: i === 0, lastAgo: (i + 2) * HOUR });
}
// the customer: three cards, one full with its gift waiting
const customer = regulars[0];
const other1 = await person("حمزة");
const barber = await shopOf(other1, { name: "Barber Shop Hamza", kind: "barber", goal: 6, gift: "تحسينة بلاش", color: "#1D5FA8" });
const other2 = await person("رانية");
const bakery = await shopOf(other2, { name: "Boulangerie", kind: "bakery", goal: 10, gift: "خبزة بلاش", color: "#B45309" });
const cardBarber = await cardAt(barber, customer, 4);
await cardAt(bakery, customer, 9);
const { data: cardHere } = await admin.from("cards").select("id").eq("shop_id", shop.id).eq("user_id", customer.id).single();
// a new owner: the shop made, the card not yet (the questions); and one with an account and no shop
const fresh = await person("خليل", { seen: [] });
await shopOf(fresh, { name: "Café Jasmin", goal: null, gift: null });
const noShop = await person("رحمة", { seen: [] });
// someone to give a tampon to, by code, on every size
const takers = [];
for (const [i] of SIZES.entries()) takers.push(await person(`حريف ${i + 1}`));
// news for this owner only, a short tour
const { data: news } = await admin
  .from("news")
  .insert({
    title: "توّا تنجم تسكاني الكود متاع الحريف",
    body: "حريف ما عرفش يسكاني الكود متاعك؟ توّا إنت تنجم تزيدلو التامبون.",
    icon: "sparkles",
    cta_label: "جرّب توّا",
    cta_href: "/shop/collect?by=scan",
    only_people: [owner.id],
    pic: "/news/gift-code.webp",
    steps: [
      { icon: "camera", pic: "/news/gift-scan.webp", title: "انزل على «سكاني»", body: "وسكاني الكود اللي يورّيهولك، ولا اكتب الأرقام اللي تحتو" },
      { icon: "gift", pic: "/news/card-change.webp", title: "تبدّل الكارط؟ إنت تختار للي بداو", body: "يكمّلو كارطهم القديمة، ولا يبدّلو للجديدة توّا بالتامبونات متاعهم" },
    ],
  })
  .select("id")
  .single();
// …already seen today, except on the screen that shows it
if (news?.id) await admin.from("news_views").insert({ news_id: news.id, person_id: owner.id });
// the founder, for the console
const boss = await person("Saif", { is_admin: true });

// ── signing in once each, then the cookie is reused at every size ────────────
const browser = await chromium.launch({
  executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe",
  headless: true,
  args: ["--use-fake-ui-for-media-stream", "--use-fake-device-for-media-stream"],
});
const states = {};
async function signIn(who) {
  const ctx = await browser.newContext({ viewport: { width: 390, height: 844 }, locale: "ar-TN" });
  const page = await ctx.newPage();
  await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await page.locator('input[name="phone"]').fill(who.digits);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), page.locator('button[type="submit"]').click()]);
  const state = await ctx.storageState();
  await ctx.close();
  // cookies only: what a phone remembers of the notes lives in the database
  return { cookies: state.cookies, origins: [] };
}

const notes = (who, seen) => admin.from("people").update({ seen }).eq("id", who.id);
// the regular's card full again, its gift waiting (handing it over at one size takes it away)
async function giftBack() {
  const { data: waiting } = await admin.from("moments").select("id").eq("card_id", cardHere.id).eq("kind", "gift").is("given_at", null);
  if (waiting?.length) return;
  await admin.from("cards").update({ stamps: shop.goal, last_at: ago(2 * HOUR) }).eq("id", cardHere.id);
  await admin.from("moments").insert({ shop_id: shop.id, card_id: cardHere.id, kind: "gift", gift: shop.gift });
}
let ownerDb = null;
async function newToken() {
  if (!ownerDb) {
    ownerDb = anonDb();
    await ownerDb.auth.signInWithPassword({ email: `216${owner.digits}@phone.pointidi.app`, password: PASS });
  }
  const { data } = await ownerDb.rpc("new_code");
  return data?.token;
}

// ── the screens ────────────────────────────────────────────────────────────
// fit: must hold on one screen; read: a reading page or the console, it may scroll down (never sideways)
const press = (page, name) => page.getByRole("button", { name, exact: true }).first().click({ timeout: 15000 });
const SCREENS = [
  { name: "public-welcome", path: "/" },
  { name: "public-join", path: "/join" },
  { name: "public-login", path: "/login" },
  { name: "public-forgot", path: "/forgot" },
  { name: "public-shop-new", path: "/shop/new" },
  { name: "public-scan", path: "/scan", wait: 2500 },
  { name: "public-stamp-reserved", path: async () => `/s/${await newToken()}`, wait: 2500 },
  { name: "public-stamp-expired", path: "/s/aaaaaaaaaaaaaaaaaaaaaaaaaaaaaaaa", wait: 1500 },
  { name: "public-person", path: () => `/u/${customer.code}` },
  { name: "public-faq", path: "/faq", read: true },
  { name: "public-prix", path: "/prix", read: true },

  { name: "customer-wallet", as: "customer", before: () => giftBack(), path: "/" },
  {
    name: "customer-gift-code",
    as: "customer",
    before: () => giftBack(),
    path: "/",
    act: async (p) => {
      await p.getByRole("button", { name: /عندك كادو يستنّى فيك/ }).click({ timeout: 15000 });
      await p.getByRole("dialog").waitFor({ timeout: 15000 });
    },
  },
  { name: "customer-mycode", as: "customer", path: "/", act: (p) => press(p, "الكود متاعي") },
  { name: "customer-card-gift", as: "customer", before: () => giftBack(), path: () => `/c/${cardHere.id}` },
  // the gift's code opened from the card itself: its button sits in a box that pops in and clips — the sheet must not stay inside it
  {
    name: "customer-card-gift-code",
    as: "customer",
    before: () => giftBack(),
    path: () => `/c/${cardHere.id}`,
    act: async (p) => {
      await p.getByRole("button", { name: /ورّي الكود متاع الكادو/ }).click({ timeout: 15000 });
      await p.getByRole("dialog").waitFor({ timeout: 15000 });
    },
  },
  { name: "customer-card", as: "customer", path: () => `/c/${cardBarber}` },
  { name: "customer-me", as: "customer", path: "/me" },
  { name: "customer-scan", as: "customer", path: "/scan", wait: 2500 },
  {
    name: "customer-stamp",
    as: "customer",
    before: () => admin.from("cards").update({ last_at: ago(2 * HOUR) }).eq("id", cardHere.id),
    path: async () => `/s/${await newToken()}`,
    wait: 3500,
  },

  { name: "home", as: "owner", path: "/shop" },
  { name: "home-help", as: "owner", path: "/shop", act: (p) => press(p, "عندك سؤال؟") },
  { name: "home-welcome", as: "owner", before: () => notes(owner, ["card_hello", "logo_tip", "offer"]), path: "/shop?welcome=1", wait: 1800, after: () => notes(owner, ALL_NOTES) },
  { name: "home-logo-tip", as: "owner", before: () => notes(owner, ["card_hello", "coach", "offer"]), path: "/shop", wait: 1800, after: () => notes(owner, ALL_NOTES) },
  { name: "home-offer", as: "owner", before: () => notes(owner, ["card_hello", "coach", "logo_tip"]), path: "/shop", wait: 2000, after: () => notes(owner, ALL_NOTES) },
  { name: "home-news", as: "owner", before: () => admin.from("news_views").delete().eq("person_id", owner.id), path: "/shop", wait: 1800 },
  {
    name: "home-news-slide",
    as: "owner",
    before: () => admin.from("news_views").delete().eq("person_id", owner.id),
    path: "/shop",
    act: async (p) => {
      // this phone remembers the piece it showed: forget it, the database already did
      await p.evaluate(() => localStorage.clear());
      await p.reload({ waitUntil: "load" });
      await p.getByRole("button", { name: "كمّل", exact: true }).click({ timeout: 20000 });
    },
    wait: 1200,
  },
  {
    name: "home-plan-on",
    as: "owner",
    // the founder turned the access on: said once, so a fresh word for each size
    before: async () => {
      const until = new Date(Date.now() + 730 * 86_400_000).toISOString();
      await admin.from("shops").update({ paid_until: until }).eq("id", shop.id);
      await admin.from("plan_log").insert({ shop_id: shop.id, kind: "paid", months: 24, until_at: until, note: "كان عندك أيّ سؤال كلّمني", method: "d17", show_owner: true });
    },
    path: "/shop",
    wait: 1800,
    after: () => admin.from("shops").update({ paid_until: null }).eq("id", shop.id),
  },
  { name: "counter", as: "owner", path: "/shop/qr", wait: 1800 },
  { name: "counter-tip", as: "owner", before: () => notes(owner, ["card_hello", "logo_tip", "offer"]), path: "/shop/qr?tip=1", wait: 1800, after: () => notes(owner, ALL_NOTES) },
  { name: "collect-scan", as: "owner", path: "/shop/collect?by=scan", wait: 2500 },
  { name: "collect-code", as: "owner", path: "/shop/collect?by=code" },
  {
    name: "collect-found",
    as: "owner",
    path: "/shop/collect?by=code",
    act: async (p, i) => {
      await p.getByRole("textbox").fill(takers[i].code);
      await p.getByRole("button", { name: /زيد تامبون لـ/ }).waitFor({ timeout: 20000 });
    },
  },
  {
    name: "collect-done",
    as: "owner",
    before: () => admin.rpc("forget_tries", { p_key: `give:${owner.id}` }),
    path: "/shop/collect?by=code",
    act: async (p, i) => {
      await p.getByRole("textbox").fill(takers[i].code);
      await p.getByRole("button", { name: /زيد تامبون لـ/ }).click({ timeout: 20000 });
      await p.getByText("+1").first().waitFor({ timeout: 20000 });
    },
    wait: 1400,
  },
  {
    name: "collect-gift",
    as: "owner",
    before: () => giftBack(),
    path: "/shop/collect?by=code",
    act: async (p) => {
      await p.getByRole("textbox").fill(customer.code);
      await p.getByRole("button", { name: "إيه، عطيه الكادو" }).waitFor({ timeout: 20000 });
    },
  },
  {
    name: "collect-handed",
    as: "owner",
    before: () => giftBack(),
    path: "/shop/collect?by=code",
    act: async (p) => {
      await p.getByRole("textbox").fill(customer.code);
      await p.getByRole("button", { name: "إيه، عطيه الكادو" }).click({ timeout: 20000 });
      await p.getByRole("heading", { name: /خذا/ }).waitFor({ timeout: 20000 });
    },
    wait: 1400,
  },
  { name: "customers", as: "owner", path: "/shop/customers" },
  { name: "stats", as: "owner", path: "/shop/stats" },
  { name: "pay", as: "owner", path: "/shop/pay" },
  { name: "settings", as: "owner", path: "/shop/setup?edit=1" },
  { name: "wizard-edit-goal", as: "owner", path: "/shop/card" },
  { name: "wizard-edit-review", as: "owner", path: "/shop/card", act: async (p) => {
    await p.getByRole("button", { name: "10", exact: true }).click();
    for (let n = 0; n < 4; n++) await press(p, "كمّل");
  } },
  { name: "wizard-edit-confirm", as: "owner", path: "/shop/card", act: async (p) => {
    await p.getByRole("button", { name: "12", exact: true }).click();
    for (let n = 0; n < 4; n++) await press(p, "كمّل");
    await press(p, "سجّل");
    await p.getByText("يكمّلو كارطهم القديمة").waitFor({ timeout: 20000 });
  } },

  { name: "wizard-hello", as: "fresh", before: () => notes(fresh, []), path: "/shop/card", wait: 1300 },
  { name: "wizard-goal", as: "fresh", path: "/shop/card" },
  { name: "wizard-gift", as: "fresh", path: "/shop/card", act: (p) => press(p, "كمّل") },
  { name: "wizard-wait", as: "fresh", path: "/shop/card", act: async (p) => { await press(p, "كمّل"); await press(p, "كمّل"); } },
  { name: "wizard-color", as: "fresh", path: "/shop/card", act: async (p) => { for (let n = 0; n < 3; n++) await press(p, "كمّل"); } },
  { name: "wizard-ready", as: "fresh", path: "/shop/card", act: async (p) => { for (let n = 0; n < 4; n++) await press(p, "كمّل"); }, wait: 1500 },
  { name: "wizard-confirm", as: "fresh", path: "/shop/card", act: async (p) => {
    for (let n = 0; n < 4; n++) await press(p, "كمّل");
    await p.getByRole("button", { name: "حلّ الكود" }).click({ force: true });
    await p.getByRole("dialog").waitFor({ timeout: 15000 });
  } },
  { name: "setup", as: "noShop", path: "/shop/setup" },

  { name: "console", as: "boss", path: "/admin", read: true },
  { name: "console-shops", as: "boss", path: "/admin/shops", read: true },
  { name: "console-shop", as: "boss", path: () => `/admin/shops/${shop.id}`, read: true },
  {
    name: "console-shop-plan",
    as: "boss",
    path: () => `/admin/shops/${shop.id}`,
    read: true,
    act: async (p) => {
      await press(p, "فعّل الأبونمان");
      await p.getByText("كيفاش خلّص؟").scrollIntoViewIfNeeded();
    },
  },
  { name: "console-people", as: "boss", path: "/admin/people", read: true },
  { name: "console-traffic", as: "boss", path: "/admin/traffic", read: true },
  { name: "console-news", as: "boss", path: "/admin/news", read: true },
  { name: "console-payments", as: "boss", path: "/admin/payments", read: true },
  { name: "console-settings", as: "boss", path: "/admin/settings", read: true },
].filter((s) => !ONLY || ONLY.some((w) => s.name.startsWith(w)));
function SCREENS_AS() {
  return SCREENS.map((s) => s.as).filter(Boolean);
}
const needed = new Set(SCREENS_AS());
for (const [key, who] of Object.entries({ owner, customer, fresh, noShop, boss })) if (needed.has(key)) states[key] = await signIn(who);

// what is wrong on the screen as it stands
function measure([read, tiny]) {
  const W = innerWidth;
  const H = innerHeight;
  const se = document.scrollingElement;
  const out = [];
  const desc = (el) => {
    const text = (el.getAttribute("aria-label") || el.innerText || el.getAttribute("placeholder") || "").trim().replace(/\s+/g, " ").slice(0, 32);
    const cls = typeof el.className === "string" ? el.className.split(" ").filter((c) => !c.includes(":")).slice(0, 3).join(".") : "";
    return `${el.tagName.toLowerCase()}${cls ? "." + cls : ""}${text ? ` «${text}»` : ""}`;
  };
  const shown = (el) => {
    const s = getComputedStyle(el);
    if (s.visibility === "hidden" || s.display === "none") return false;
    const r = el.getBoundingClientRect();
    return r.width > 1 && r.height > 1;
  };
  const skip = (el) => el.closest("nextjs-portal, [aria-hidden='true'], [data-deco], [data-list]");
  const pageY = se.scrollHeight - H;
  if (!read && !tiny && pageY > 1) out.push({ kind: "page scrolls", px: pageY });
  if (se.scrollWidth - W > 1) out.push({ kind: "page too wide", px: se.scrollWidth - W });
  for (const el of document.querySelectorAll("body *")) {
    if (skip(el) || el === se) continue;
    const s = getComputedStyle(el);
    if (!read && (s.overflowY === "auto" || s.overflowY === "scroll") && el.scrollHeight - el.clientHeight > 1) out.push({ kind: "box scrolls", px: el.scrollHeight - el.clientHeight, el: desc(el) });
    if ((s.overflowX === "auto" || s.overflowX === "scroll") && el.scrollWidth - el.clientWidth > 1) out.push({ kind: "box scrolls sideways", px: el.scrollWidth - el.clientWidth, el: desc(el) });
  }
  const things = [...document.querySelectorAll("button, a, input, textarea, select, h1, h2, h3, p, label, li, img, [role='img'], canvas, video")].filter((el) => shown(el) && !skip(el));
  for (const el of things) {
    const r = el.getBoundingClientRect();
    const sx = Math.round(Math.max(r.right - W, -r.left));
    if (sx > 1) out.push({ kind: "sticks out sideways", px: sx, el: desc(el) });
    let inScroller = false;
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const st = getComputedStyle(a);
      if (["auto", "scroll"].includes(st.overflowY)) inScroller = a !== se;
      if (st.overflowY !== "visible") break;
    }
    if (!read && pageY <= 1 && !inScroller && r.bottom - H > 1) out.push({ kind: "below the screen", px: Math.round(r.bottom - H), el: desc(el) });
    // cut by the nearest box that hides what overflows it
    for (let a = el.parentElement; a && a !== document.body; a = a.parentElement) {
      const st = getComputedStyle(a);
      if (st.overflowX === "visible" && st.overflowY === "visible") continue;
      const ar = a.getBoundingClientRect();
      const cut = Math.round(Math.max(r.bottom - ar.bottom, ar.top - r.top, r.right - ar.right, ar.left - r.left));
      // a box that scrolls shows the rest by scrolling; that is reported above
      const scrolls = ["auto", "scroll"].includes(st.overflowY) || ["auto", "scroll"].includes(st.overflowX);
      if (cut > 2 && !scrolls && !a.closest("[data-deco], [data-list]")) out.push({ kind: "cut by its box", px: cut, el: desc(el), box: desc(a) });
      if (cut > 2 && scrolls && !read && !a.closest("[data-list]")) out.push({ kind: "hidden in a scrolling box", px: cut, el: desc(el) });
      break;
    }
  }
  // one line per kind and element
  const seen = new Set();
  return out.filter((x) => {
    const k = `${x.kind}|${x.el ?? ""}`;
    if (seen.has(k)) return false;
    seen.add(k);
    return true;
  });
}

const report = [];
let bad = 0;
try {
  for (const [i, [width, height, desk]] of SIZES.entries()) {
    const size = `${width}x${height}${desk ? "d" : ""}`;
    mkdirSync(`${OUT}/${size}`, { recursive: true });
    console.log(`\n${size}${height < 548 ? " (may scroll, never cut)" : ""}`);
    const mobile = !desk && width < 900;
    const contexts = {};
    const ctxFor = async (as) => {
      const key = as ?? "anon";
      if (!contexts[key])
        contexts[key] = await browser.newContext({
          viewport: { width, height },
          deviceScaleFactor: mobile ? 2 : 1,
          isMobile: mobile,
          hasTouch: mobile,
          locale: "ar-TN",
          storageState: as ? states[as] : undefined,
          permissions: ["camera"],
        });
      return contexts[key];
    };
    for (const s of SCREENS) {
      const page = await (await ctxFor(s.as)).newPage();
      let issues;
      try {
        if (s.before) await Promise.resolve(s.before(i));
        const path = typeof s.path === "function" ? await s.path(i) : s.path;
        await page.goto(BASE + path, { waitUntil: "load", timeout: 120000 });
        await page.waitForTimeout(900);
        if (s.act) await s.act(page, i);
        await page.waitForTimeout(s.wait ?? 900);
        await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
        await page.screenshot({ path: `${OUT}/${size}/${s.name}.png` });
        issues = await page.evaluate(measure, [!!s.read, height < 548]);
      } catch (e) {
        issues = [{ kind: "could not open", el: String(e.message).split("\n")[0].slice(0, 160) }];
      } finally {
        if (s.after) await Promise.resolve(s.after(i)).catch(() => {});
        await page.close();
      }
      report.push({ size, screen: s.name, issues });
      if (issues.length) bad++;
      console.log(`  ${issues.length ? "✗" : "✓"} ${s.name}${issues.length ? "" : ""}`);
      for (const x of issues.slice(0, 6)) console.log(`      ${x.kind}${x.px ? ` ${x.px}px` : ""}${x.el ? ` — ${x.el}` : ""}${x.box ? ` in ${x.box}` : ""}`);
      if (issues.length > 6) console.log(`      … ${issues.length - 6} more`);
    }
    for (const c of Object.values(contexts)) await c.close();
  }
} finally {
  writeFileSync(`${OUT}/report.json`, JSON.stringify(report, null, 1));
  await browser.close();
  if (news?.id) await admin.from("news").delete().eq("id", news.id);
  for (const id of made) {
    await admin.from("shops").delete().eq("owner_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  await unrobot(admin, phones);
  console.log(`\n${bad} of ${report.length} screens have something wrong — ${OUT}/report.json (accounts removed)`);
}
if (bad) process.exitCode = 1;
