/**
 * When the owner is asked to put Pointili on his phone, and the founder's word when it lands (16 Nov 2026).
 *
 *   - before the first customer, nothing until the code has been seen; back from it — the phone's back
 *     button (from the code to the clips, which now lead home) or the code's own «ارجع» — the install is
 *     asked: Chrome's dialog on Android, the filmed guide on an iPhone, and inside Instagram's or Facebook's
 *     browser the way out (Safari or Chrome signed in, or WhatsApp to himself). An owner who left during the
 *     clips gets the code's note from the home's code tile, and the ask when he is back
 *   - asked once; after the first customer once more — only when the first ask came before any customer,
 *     and in the browser he went on in (the way out of Instagram carries it: /me?install=1&early=1)
 *   - the floating button only over a list (on the empty home it would cover «شوف كيفاش تخدم»)
 *   - never once the app was opened on a phone of his
 *   - Telegram: the first visit opened as the app, or Chrome's word that it installed, rings once per person
 *     (the mark «app_told» on the person, taken atomically right before the message goes) — an owner with
 *     the shop, a customer with the shops of their cards; never twice, never a robot, never someone already
 *     using the app before the alert existed; an install made signed out rings at the first open signed in.
 *     The local server has no bot: it prints «[telegram · not sent]» in its own output instead
 *
 * Throwaway accounts (robots — two made real for a moment for the Telegram half, a robot never rings), deleted
 * at the end; pictures in .e2e/install-moments/.
 *
 *   node scripts/install-moments.mjs      (from v2/, dev server on :3200 — or BASE=; ONLY=telegram for that half)
 */
import { randomUUID } from "node:crypto";
import { mkdirSync } from "node:fs";
import { config } from "dotenv";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const OUT = ".e2e/install-moments";
mkdirSync(OUT, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "moments-e2e-2026";
// a new shop's list (app/actions: NOT_NEWS) — what every owner has on the first day
const NEW = ["links_tip", "new_insights", "reset_tip"];
const DIALOG = "حطّ Pointili في تليفونك";
const WHY_CODE = "كي يجي أوّل حريف";
const WHY_AGAIN = "كل حريف يجي";
const TOLD = "app_told";

const UA = {
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.5 Mobile/15E148 Safari/604.1",
  instagram: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_5 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Mobile/22F76 Instagram 380.0.0.31.110 (iPhone15,3; iOS 18_5; fr_FR; fr; scale=3.00; 1290x2796; 731373582)",
  facebook: "Mozilla/5.0 (Linux; Android 14; SM-A546B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/480.0.0.42.109;]",
};

const made = [];
const phones = [];
const visits = [];
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
const phoneNo = () => `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

async function person(name, seen = []) {
  const d = await robot(admin, phoneNo());
  phones.push(d);
  const { data: u, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(u.user.id);
  await admin.from("people").upsert({ id: u.user.id, name, phone: `+216${d}`, seen });
  // every piece of news already read, so none covers the ask
  const { data: live } = await admin.from("news").select("id").eq("active", true);
  if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: u.user.id })));
  return { id: u.user.id, digits: d };
}
async function shopFor(owner, name) {
  const { data, error } = await admin.from("shops").insert({ owner_id: owner.id, name, kind: "cafe", goal: 6, gift: "قهوة بلاش", color: "#6C47FF" }).select("id").single();
  if (error) throw error;
  return data.id;
}

// Chrome's offer on Android, sent when the script says (like scripts/install.mjs)
const offerScript = () => {
  window.__offer = () => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => {};
    e.userChoice = Promise.resolve({ outcome: "dismissed" });
    dispatchEvent(e);
  };
};
const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
async function phone(who, ua, size = { width: 390, height: 844 }) {
  const ctx = await browser.newContext({ viewport: size, screen: size, deviceScaleFactor: 2, isMobile: true, hasTouch: true, locale: "ar-TN", userAgent: ua });
  await ctx.addInitScript(offerScript);
  const page = await ctx.newPage();
  for (let attempt = 1; ; attempt++) {
    for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });
    await page.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
    await page.locator('input[name="phone"]').waitFor({ timeout: 30000 });
    await page.waitForTimeout(800);
    await page.locator('input[name="phone"]').fill(who.digits);
    await page.locator('input[name="password"]').fill(PASS);
    await page.locator('button[type="submit"]').click();
    if (await page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 30000 }).then(() => true, () => false)) break;
    if (attempt >= 2) throw new Error("could not sign in");
  }
  return { ctx, page };
}
// the dev server's own badge sits in a corner, over the buttons there
const hideBadge = (page) => page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
const shot = async (page, name) => {
  await hideBadge(page);
  await page.waitForTimeout(400);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const offer = (page) => page.evaluate(() => window.__offer());
const ask = (page) => page.getByRole("dialog", { name: DIALOG });
// a «no» needs the time a «yes» would have taken: the ask comes 1.2 s after the page (and Chrome's offer)
const asked = async (page, ms = 3500) => ask(page).waitFor({ timeout: ms }).then(() => true, () => false);
const home = async (page, android = true) => {
  await page.goto(`${BASE}/shop`, { waitUntil: "load", timeout: 90000 });
  await page.locator("#shop-tile").waitFor({ timeout: 30000 });
  if (android) {
    await page.waitForTimeout(600);
    await offer(page);
  }
};
// the floating button carries its words; the header's round one only an aria-label
const fab = (page) => page.locator("button", { hasText: DIALOG }).count();
const headerIcon = (page) => page.locator(`header button[aria-label="${DIALOG}"], header button[aria-label="لحظة… قاعد يتحضّر"], header button[aria-label="جاهز! انقر باش تحطّو"]`).count();
const again = (page, shop) => page.evaluate((s) => localStorage.getItem(`pl-install-again:${s}`), shop);
const seenOf = async (id) => (await admin.from("people").select("seen").eq("id", id).single()).data?.seen ?? [];
const setSeen = (id, seen) => admin.from("people").update({ seen }).eq("id", id);
// the sheet whole on the screen, nothing cut: its last button inside the window
const fits = (page) =>
  page.evaluate(() => {
    const d = document.querySelector('[role="dialog"] > div');
    const buttons = [...(d?.querySelectorAll("button, a") ?? [])];
    const last = buttons[buttons.length - 1]?.getBoundingClientRect();
    return !!d && d.scrollHeight <= d.clientHeight + 1 && !!last && last.bottom <= innerHeight;
  });

try {
  const owner = await person("ياسين", NEW);
  const shop = await shopFor(owner, "Café Moments");
  const customer = await person("سامي");

  if (process.env.ONLY !== "telegram") {
    console.log("\nA new owner at night, on Android's Chrome: nothing before the code, asked back from it");
    {
      const { ctx, page } = await phone(owner, UA.android);
      await home(page);
      check("before the code: no ask on the home", !(await asked(page)));
      check("…and no floating button either", (await fab(page)) === 0);
      // the real way in: the clips (step 3), «تخطّى», the code with its note
      await page.goto(`${BASE}/shop/start`, { waitUntil: "load", timeout: 90000 });
      await page.getByRole("button", { name: "تخطّى" }).click();
      await page.waitForURL("**/shop/qr**", { timeout: 30000 });
      await page.waitForTimeout(2500);
      check("the code's first look is written on the owner", (await seenOf(owner.id)).includes("coach"));
      // the phone's own back button: the clips' page comes back as it was, and sends him home
      await page.goBack();
      await page.waitForURL((u) => u.pathname === "/shop", { timeout: 20000 }).catch(() => {});
      check("the phone's back from the code lands home, not on the clips", new URL(page.url()).pathname === "/shop", page.url());
      await page.locator("#shop-tile").waitFor({ timeout: 30000 });
      await offer(page);
      check("…and the install is asked there", await asked(page));
      check("…with the reason (the first customer, one tap)", await ask(page).getByText(WHY_CODE).isVisible().catch(() => false));
      await shot(page, "1-android-back-from-code");
      check("asked once: written on the owner", (await seenOf(owner.id)).includes("install"));
      check("…and a second ask is due after the first customer", (await again(page, shop)) === "early");
      await ask(page).getByRole("button", { name: "موش توّا" }).click();
      await page.waitForTimeout(1800);
      check("«موش توّا»: no floating button over the empty home (it would cover «شوف كيفاش تخدم»)", (await fab(page)) === 0);
      check("…the install stays one tap away, in the header", (await headerIcon(page)) === 1);
      await home(page);
      check("the next visit asks nothing", !(await asked(page)));
      await ctx.close();
    }

    console.log("\nThe code's own «ارجع» (a fresh phone, the code not seen yet)");
    {
      await setSeen(owner.id, NEW);
      const { ctx, page } = await phone(owner, UA.android);
      await page.goto(`${BASE}/shop/start`, { waitUntil: "load", timeout: 90000 });
      await page.getByRole("button", { name: "تخطّى" }).click();
      await page.waitForURL("**/shop/qr**", { timeout: 30000 });
      await page.waitForTimeout(2500);
      await hideBadge(page);
      await page.getByRole("link", { name: "ارجع" }).click();
      await page.waitForURL((u) => u.pathname === "/shop", { timeout: 20000 });
      await page.locator("#shop-tile").waitFor({ timeout: 30000 });
      await offer(page);
      check("«ارجع» from the code: the install is asked", await asked(page));
      await ctx.close();
    }

    console.log("\nAn owner who left during the clips: the code tile carries the code's note, then the ask");
    {
      await setSeen(owner.id, NEW);
      const { ctx, page } = await phone(owner, UA.android);
      await home(page);
      check("no ask yet", !(await asked(page, 2500)));
      await page.locator('a[href="/shop/qr?tip=1"]').click();
      await page.waitForURL("**/shop/qr**", { timeout: 30000 });
      check("the code tile opens the code with its note", await page.getByText("هذا هو الكود متاعك").waitFor({ timeout: 15000 }).then(() => true, () => false));
      await page.waitForTimeout(1500);
      await hideBadge(page);
      await page.getByRole("link", { name: "ارجع" }).click();
      await page.waitForURL((u) => u.pathname === "/shop", { timeout: 20000 });
      await page.locator("#shop-tile").waitFor({ timeout: 30000 });
      await offer(page);
      check("…back from it, the install is asked", await asked(page));
      check("…and the tile is the plain code now", (await page.locator('a[href="/shop/qr"]').count()) >= 1);
      await ctx.close();
    }

    console.log("\nAn iPhone's Safari: the filmed guide is the ask");
    {
      await setSeen(owner.id, [...NEW, "coach"]);
      const { ctx, page } = await phone(owner, UA.iphone);
      await home(page, false);
      check("the guide opens by itself", await asked(page));
      check("…for an iPhone's Safari", await ask(page).getByText("آيفون · Safari").isVisible().catch(() => false));
      await page.waitForTimeout(2500);
      check("…its film drawn", (await ask(page).locator("svg").count()) > 0);
      await shot(page, "2-iphone-guide");
      await ctx.close();
    }

    console.log("\nInside Instagram on an iPhone (where 39 of the campaign's 41 owners signed up): the way out");
    {
      await setSeen(owner.id, [...NEW, "coach"]);
      const { ctx, page } = await phone(owner, UA.instagram);
      await home(page, false);
      check("the ask comes inside Instagram too", await asked(page));
      check("…to open Pointili in Safari", await ask(page).getByRole("button", { name: "حلّ Pointili في Safari" }).isVisible().catch(() => false));
      check("…or send it to himself on WhatsApp", await ask(page).getByRole("button", { name: "ابعثها لروحك في واتساب" }).isVisible().catch(() => false));
      check("…saying why: Instagram cannot install it", await ask(page).getByText(/من Instagram ما تنجمش تحطّها/).isVisible().catch(() => false));
      await shot(page, "3-instagram-iphone");
      check("written on the owner, like any ask", (await seenOf(owner.id)).includes("install"));
      check("…and the second ask's «early» rides the way out (/me?install=1&early=1)", (await again(page, shop)) === "early");
      await ctx.close();
    }

    console.log("\nInside Facebook on Android: Chrome is the way out — and it fits the shortest phone");
    {
      await setSeen(owner.id, [...NEW, "coach"]);
      const { ctx, page } = await phone(owner, UA.facebook, { width: 360, height: 548 });
      await home(page, false);
      check("the ask comes", await asked(page));
      check("…naming Chrome", (await ask(page).getByRole("button", { name: "حلّ Pointili في Chrome" }).count()) === 1);
      check("…and Facebook", await ask(page).getByText(/من Facebook ما تنجمش تحطّها/).isVisible().catch(() => false));
      check("…whole on a 360×548 screen", await fits(page));
      await shot(page, "4-facebook-android-360x548");
      await ctx.close();
    }

    console.log("\nOut of Instagram into Chrome: «early» is written in the browser he goes on in");
    {
      await setSeen(owner.id, [...NEW, "coach", "install"]);
      const { ctx, page } = await phone(owner, UA.android);
      await page.goto(`${BASE}/me?install=1&early=1`, { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(600);
      await offer(page);
      check("the install is asked at once", await asked(page));
      check("…and this browser knows a second ask is due after the first customer", (await again(page, shop)) === "early");
      await ctx.close();
    }

    // the first customer: a card at the shop, and its tampon in the home's list
    const { data: card } = await admin.from("cards").insert({ shop_id: shop, user_id: customer.id, goal: 6, gift: "قهوة بلاش", stamps: 1 }).select("id").single();
    await admin.from("moments").insert({ shop_id: shop, card_id: card.id, kind: "stamp" });
    // the notes that come first after a first customer (the logo, the offer) already seen
    const AFTER = [...NEW, "coach", "logo_tip", "offer"];

    console.log("\nAfter the first customer: asked once more, when the first ask came before any customer");
    {
      await setSeen(owner.id, [...AFTER, "install"]);
      const { ctx, page } = await phone(owner, UA.android);
      // the first ask came before the customer, in this browser: the way out of Instagram brought it here
      await page.goto(`${BASE}/me?install=1&early=1`, { waitUntil: "load", timeout: 90000 });
      await page.waitForTimeout(600);
      await offer(page);
      await asked(page);
      await home(page);
      check("the second ask comes", await asked(page));
      check("…with the day's reason (every customer, one tap)", await ask(page).getByText(WHY_AGAIN).isVisible().catch(() => false));
      await shot(page, "5-android-again");
      check("…once", (await again(page, shop)) === "done");
      await ask(page).getByRole("button", { name: "موش توّا" }).click();
      await page.waitForTimeout(1800);
      check("with a list on the home, the floating button is there", (await fab(page)) === 1);
      await home(page);
      check("the next visit asks nothing", !(await asked(page)));
      await ctx.close();
    }

    console.log("\nAn owner whose first customer came before any ask: asked once, not twice in a row");
    {
      await setSeen(owner.id, AFTER);
      const { ctx, page } = await phone(owner, UA.android);
      await home(page);
      check("the first ask comes", await asked(page));
      check("…with the day's reason", await ask(page).getByText(WHY_AGAIN).isVisible().catch(() => false));
      await home(page);
      check("the next visit asks nothing (no second ask due)", !(await asked(page)));
      await ctx.close();
    }

    console.log("\nThe app already opened on a phone of his: never asked");
    {
      await setSeen(owner.id, [...NEW, "coach"]);
      const id = randomUUID();
      visits.push(id);
      await admin.from("visits").insert({ id, visitor: `moments-${id.slice(0, 8)}`, user_id: owner.id, standalone: true, is_bot: true });
      const { ctx, page } = await phone(owner, UA.android);
      await home(page);
      check("no ask", !(await asked(page)));
      check("no floating button", (await fab(page)) === 0);
      await ctx.close();
      await admin.from("visits").delete().eq("id", id);
    }

    console.log("\nThe clips page, once the code is seen: home instead");
    {
      await setSeen(owner.id, [...NEW, "coach"]);
      const { ctx, page } = await phone(owner, UA.android);
      await page.goto(`${BASE}/shop/start`, { waitUntil: "load", timeout: 90000 });
      check("/shop/start sends an owner who saw his code home", new URL(page.url()).pathname === "/shop", page.url());
      await ctx.close();
    }
  }

  console.log("\nTelegram: once per person, the first time the app lands");
  {
    const real = await person("نادية");
    const realShop = await shopFor(real, "Salon Nadia");
    const fan = await person("ريم");
    const before = await person("هالة");
    const late = await person("منير");
    const twice = await person("كريم");
    await admin.from("cards").insert({ shop_id: realShop, user_id: fan.id, goal: 6, gift: "بروشينغ بلاش", stamps: 2 });
    // signed in (the cookies), then the beacon as a phone would send it — from a host that is not the local one
    const cookiesOf = async (who) => {
      const { ctx, page } = await phone(who, UA.android);
      await page.goto(`${BASE}/me`, { waitUntil: "load", timeout: 90000 });
      const jar = (await ctx.cookies()).map((c) => `${c.name}=${c.value}`).join("; ");
      await ctx.close();
      return jar;
    };
    const jars = {};
    for (const [k, who] of Object.entries({ real, fan, robot: customer, before, late, twice })) jars[k] = await cookiesOf(who);
    const beacon = async (jar, ua, { visit = randomUUID(), visitor, standalone = false, signals = [] } = {}) => {
      visits.push(visit);
      const at = new Date().toISOString();
      const res = await fetch(`${BASE}/api/beacon`, {
        method: "POST",
        headers: { "content-type": "application/json", "user-agent": ua, "x-forwarded-host": "pointili.test", ...(jar ? { cookie: jar } : {}) },
        body: JSON.stringify({ visit: { id: visit, visitor: visitor ?? `moments${visit.slice(0, 8)}`, landing: "/", standalone }, views: [], taps: [], signals: signals.map((name) => ({ view: null, route: "/", screen: null, at, name, detail: null })) }),
      });
      return { status: res.status, visit };
    };
    // the ring goes after the answer (next/server's after): a moment for it
    const settle = () => new Promise((r) => setTimeout(r, 1800));
    const told = async (who) => (await seenOf(who.id)).filter((k) => k === TOLD).length;
    // someone already using the app before the alert existed: a visit as the app in the books
    const old = randomUUID();
    visits.push(old);
    await admin.from("visits").insert({ id: old, visitor: `moments-${old.slice(0, 8)}`, user_id: before.id, standalone: true, is_bot: false });

    // real for the moment of the beacons (a robot never rings), robots again right after
    const realOnes = [real, fan, before, late, twice];
    await unrobot(admin, realOnes.map((p) => p.digits));
    try {
      const first = await beacon(jars.real, UA.iphone, { standalone: true });
      await settle();
      check("an owner's first visit as the app rings (🍏 iPhone)", first.status === 204 && (await told(real)) === 1, { status: first.status, told: await told(real) });
      await beacon(jars.real, UA.iphone, { visit: first.visit, standalone: true });
      await beacon(jars.real, UA.iphone, { standalone: true });
      await settle();
      check("…the same visit again, and another visit as the app: no second ring", (await told(real)) === 1, await told(real));

      await beacon(jars.fan, UA.android, { signals: ["pwa_installed"] });
      await settle();
      check("a customer's install, said by Chrome in a tab, rings (🤖 Android · Chrome)", (await told(fan)) === 1, await told(fan));
      await beacon(jars.fan, UA.android, { standalone: true });
      await settle();
      check("…then opening it: no second ring", (await told(fan)) === 1, await told(fan));

      await beacon(jars.robot, UA.android, { standalone: true });
      await settle();
      check("a robot as the app: no ring", (await told(customer)) === 0);

      await beacon(jars.before, UA.android, { standalone: true });
      await settle();
      check("someone already in the app before the alert existed: no ring on the day it goes live", (await told(before)) === 0);

      // installed while signed out (from WhatsApp's link, before signing in), signed in in the same sitting, then the icon
      const sitting = randomUUID();
      await beacon(null, UA.android, { visit: sitting, visitor: `moments${late.id.slice(0, 8)}`, signals: ["pwa_installed"] });
      await beacon(jars.late, UA.android, { visit: sitting, visitor: `moments${late.id.slice(0, 8)}` });
      await settle();
      check("an install made signed out rings nothing yet (nobody to name)", (await told(late)) === 0);
      await beacon(jars.late, UA.android, { standalone: true });
      await settle();
      check("…its first open signed in rings, once", (await told(late)) === 1, await told(late));

      // two batches of a first open at the same moment (the page hidden and closed together)
      await Promise.all([beacon(jars.twice, UA.iphone, { standalone: true }), beacon(jars.twice, UA.iphone, { standalone: true })]);
      await settle();
      check("two first batches at the same moment: one ring", (await told(twice)) === 1, await told(twice));
    } finally {
      for (const p of realOnes) await robot(admin, p.digits);
    }
    console.log("  → the dev server's output says «[telegram · not sent]» for each ring: the owner, the customer, the late one, the twice one");
  }
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
  for (const [i, p] of browser.contexts().flatMap((x) => x.pages()).entries()) {
    console.log(`    page ${i}: ${p.url()}`);
    await p.screenshot({ path: `${OUT}/crash-${i}.png` }).catch(() => {});
  }
} finally {
  await browser.close();
  for (const id of visits) await admin.from("visits").delete().eq("id", id);
  for (const id of made) {
    await admin.from("visits").delete().eq("user_id", id);
    await admin.from("cards").delete().eq("user_id", id);
    await admin.from("shops").delete().eq("owner_id", id);
    await admin.auth.admin.deleteUser(id);
  }
  await unrobot(admin, phones);
  console.log(`\n${passed} passed, ${failed.length} failed (removed ${made.length} accounts) · pictures in ${OUT}/`);
  if (failed.length) process.exit(1);
}
