/**
 * pointili.online/app, the install as a link (components/InstallPage): what each phone gets when it
 * opens it. Android: one button, Chrome's own dialog on a fresh tap (Chrome's offer before the tap,
 * or a moment after it), then «Pointili راهو في تليفونك» once installed — and at once when Chrome
 * says it is already there. An iPhone: the film open by itself (Safari), the drawn guide (Chrome).
 * Facebook's browser: the ways out of it. A computer: a QR that reads as the link. The installed
 * app: its home. And the page holds one screen from 548 px tall, its two typed aliases lead to it,
 * a chat's preview carries its own words, and its opening is counted. Chrome's offer is played by
 * the page (a `beforeinstallprompt` sent when the script says), and like Chrome's, its dialog opens
 * only on a fresh tap. No accounts; pictures in shots/app-link/ (ignored).
 *
 *   node scripts/app-link.mjs      (from v2/, dev server on :3200 — or BASE=)
 */
import { mkdirSync } from "node:fs";
import jsQR from "jsqr";
import sharp from "sharp";
import { chromium } from "playwright-core";

const BASE = process.env.BASE || "http://localhost:3200";
const OUT = "shots/app-link";
mkdirSync(OUT, { recursive: true });
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

const UA = {
  android: "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36",
  iphone: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) Version/18.6 Mobile/15E148 Safari/604.1",
  iphoneChrome: "Mozilla/5.0 (iPhone; CPU iPhone OS 18_6 like Mac OS X) AppleWebKit/605.1.15 (KHTML, like Gecko) CriOS/141.0.7390.41 Mobile/15E148 Safari/604.1",
  facebook: "Mozilla/5.0 (Linux; Android 14; SM-A146B Build/UP1A.231005.007; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 [FB_IAB/FB4A;FBAV/489.0.0.38.109;]",
  ourApp: "Mozilla/5.0 (Linux; Android 14; Pixel 8; wv) AppleWebKit/537.36 (KHTML, like Gecko) Version/4.0 Chrome/141.0.0.0 Mobile Safari/537.36 PointiliApp/2",
  computer: "Mozilla/5.0 (Windows NT 10.0; Win64; x64) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Safari/537.36",
};
// the words on the page (lib/t)
const T = {
  install: "حطّ Pointili في تليفونك",
  go: "حطّها",
  waiting: "لحظة… قاعد يتحضّر",
  here: "Pointili راهو في تليفونك ✓",
  then: "وبعد انزل على",
  scan: "سكاني الكود هذا بكاميرا تليفونك",
  wa: "ابعثها لروحك في واتساب",
  chrome: "حلّ Pointili في Chrome",
  done: "فهمت",
};

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
// Chrome's offer, sent when the script says; like Chrome's, its dialog opens only while a tap is fresh.
// `accept`: the person taps «Installer», and Chrome says it is installed a moment later
const offerScript = ({ installed, accept }) => {
  window.__prompted = 0;
  window.__refused = 0;
  window.__offer = () => {
    const e = new Event("beforeinstallprompt", { cancelable: true });
    e.prompt = async () => {
      if (!navigator.userActivation?.isActive) {
        window.__refused++;
        throw new DOMException("The prompt() method must be called with a user gesture", "NotAllowedError");
      }
      window.__prompted++;
      if (accept) setTimeout(() => dispatchEvent(new Event("appinstalled")), 300);
    };
    e.userChoice = Promise.resolve({ outcome: accept ? "accepted" : "dismissed" });
    dispatchEvent(e);
  };
  if (installed) navigator.getInstalledRelatedApps = async () => [{ platform: "webapp", url: `${location.origin}/manifest.webmanifest` }];
  // what the traffic tracker sends (lib/track: sendBeacon as the page goes, fetch in between), kept here —
  // a beacon's blob never reaches Playwright's request.postData()
  window.__sent = [];
  const keep = (url, body) => {
    if (!String(url).includes("/api/beacon") || body == null) return;
    if (typeof body === "string") window.__sent.push(body);
    else if (body.text) void body.text().then((x) => window.__sent.push(x));
  };
  const beacon = navigator.sendBeacon?.bind(navigator);
  if (beacon)
    navigator.sendBeacon = (url, data) => {
      keep(url, data);
      return beacon(url, data);
    };
  const get = window.fetch.bind(window);
  window.fetch = (url, init) => {
    keep(url, init?.body);
    return get(url, init);
  };
};
async function phone({ ua = UA.android, size = { width: 390, height: 844 }, installed = false, accept = false, mobile = true } = {}) {
  const ctx = await browser.newContext({ viewport: size, screen: size, deviceScaleFactor: 2, isMobile: mobile, hasTouch: mobile, locale: "ar-TN", userAgent: ua });
  await ctx.addInitScript(offerScript, { installed, accept });
  return { ctx, page: await ctx.newPage() };
}
const open = async (page, path = "/app") => {
  await page.goto(`${BASE}${path}`, { waitUntil: "load", timeout: 90000 });
  await page.waitForTimeout(1200);
};
const shot = async (page, name) => {
  await page.evaluate(() => document.querySelectorAll("nextjs-portal").forEach((e) => (e.style.display = "none")));
  await page.waitForTimeout(300);
  await page.screenshot({ path: `${OUT}/${name}.png` });
};
const title = (page) => page.locator("main h1").innerText().catch(() => "");
const counts = (page) => page.evaluate(() => ({ prompted: window.__prompted, refused: window.__refused }));
const offer = (page) => page.evaluate(() => window.__offer());
// the page's install button, by what it says (Facebook's two ways out are buttons too, and say other things)
// whole words only: «حطّها» is also inside the «…وتنجم تحطّها» under Facebook's way out
const LABEL = /^\s*(?:حطّها|لحظة… قاعد يتحضّر|جاهز! انقر باش تحطّو)\s*$/;
const button = (page) => page.locator("main button").filter({ hasText: LABEL });
// one screen: the page does not scroll, and nothing in it is cut
const fits = (page) =>
  page.evaluate(() => {
    const m = document.querySelector("main");
    return { ok: document.documentElement.scrollHeight <= innerHeight + 1 && !!m && m.scrollHeight <= m.clientHeight + 1, inner: innerHeight, main: m?.scrollHeight };
  });

try {
  console.log("\nAndroid — Chrome has offered: one tap, «Installer», installed");
  {
    const { ctx, page } = await phone({ accept: true });
    await open(page);
    check("the title says what the link is for", (await title(page)) === T.install, await title(page));
    check("one big button", (await button(page).count()) === 1 && (await button(page).innerText()).includes(T.go), await button(page).innerText().catch(() => ""));
    check("…and under it, what the browser asks next («Installer»)", await page.getByText(T.then).isVisible());
    check("nothing opens by itself on Android", (await page.locator('[role="dialog"]').count()) === 0);
    await offer(page);
    await page.waitForTimeout(300);
    check("it breathes once one tap installs", /animate-breathe/.test((await button(page).getAttribute("class")) ?? ""));
    await shot(page, "android");
    // a real tap (a trusted click, so Chrome's gesture rule still holds): forced only because the
    // breathing never stands still long enough for Playwright to call it "stable"
    await button(page).click({ force: true });
    await page.waitForTimeout(1000);
    const c = await counts(page);
    check("the tap is Chrome's own dialog", c.prompted === 1 && c.refused === 0, c);
    check("installed: the page says Pointili is on the phone", (await title(page)) === T.here, await title(page));
    check("…and offers no button any more", (await button(page).count()) === 0);
    await shot(page, "android-installed");
    // the page hidden: the batch goes out with sendBeacon (lib/track)
    await page.evaluate(() => dispatchEvent(new Event("pagehide")));
    await page.waitForTimeout(800);
    const body = await page.evaluate(() => window.__sent.join("\n"));
    check("the opening is counted (pwa_link · android)", body.includes('"name":"pwa_link","detail":"android"'), body.slice(0, 160));
    check("…and the install, with where = link", body.includes('"name":"pwa_accepted","detail":"link"'));
    await ctx.close();
  }

  console.log("\nAndroid — a tap before Chrome has offered");
  {
    const { ctx, page } = await phone();
    await open(page);
    await button(page).click();
    await page.waitForTimeout(400);
    check("it waits, saying so («لحظة…»)", (await button(page).innerText()).includes(T.waiting), await button(page).innerText());
    await offer(page);
    await page.waitForTimeout(600);
    const c = await counts(page);
    check("…and Chrome's dialog opens the moment Chrome offers", c.prompted === 1, c);
    await ctx.close();
  }

  console.log("\nAndroid — Pointili already on the phone");
  {
    const { ctx, page } = await phone({ installed: true });
    await open(page);
    check("Chrome says it is there: the page says so at once", (await title(page)) === T.here, await title(page));
    check("…with no install button", (await button(page).count()) === 0);
    await shot(page, "android-already");
    await ctx.close();
  }

  console.log("\niPhone — Safari");
  {
    const { ctx, page } = await phone({ ua: UA.iphone });
    await open(page);
    const sheet = page.locator('[role="dialog"]');
    check("the filmed guide opens by itself", (await sheet.count()) === 1 && (await sheet.isVisible()));
    await page.waitForTimeout(2600);
    check("…the film itself, with its words in time", (await sheet.locator('[class*="igi-c"]').count()) > 0);
    await shot(page, "iphone");
    await sheet.getByRole("button", { name: T.done }).click();
    await page.waitForTimeout(500);
    check("«فهمت» puts it away", (await page.locator('[role="dialog"]').count()) === 0);
    check("…and the page under it has the button to open it again", (await button(page).innerText().catch(() => "")).includes(T.go));
    await shot(page, "iphone-page");
    await button(page).click();
    await page.waitForTimeout(600);
    check("…which it does", (await page.locator('[role="dialog"]').count()) === 1);
    await ctx.close();
  }

  console.log("\niPhone — Chrome");
  {
    const { ctx, page } = await phone({ ua: UA.iphoneChrome });
    await open(page);
    const sheet = page.locator('[role="dialog"]');
    check("the drawn guide opens by itself (the share button sits at the address there)", (await sheet.count()) === 1 && (await sheet.locator(".ios-ring").count()) > 0);
    await shot(page, "iphone-chrome");
    await ctx.close();
  }

  console.log("\nFacebook's browser");
  {
    const { ctx, page } = await phone({ ua: UA.facebook });
    await open(page);
    check("send it to yourself on WhatsApp", await page.getByRole("button", { name: T.wa }).isVisible());
    check("…or open it in Chrome", await page.getByRole("button", { name: T.chrome }).isVisible());
    check("…and no install button where nothing installs", (await button(page).count()) === 0);
    await shot(page, "facebook");
    await ctx.close();
  }

  console.log("\nA computer");
  {
    const { ctx, page } = await phone({ ua: UA.computer, size: { width: 1280, height: 800 }, mobile: false });
    await open(page);
    const qr = page.locator('main [role="img"]');
    check("the link as a QR", (await qr.locator("svg").count()) === 1);
    check("…with the words for the phone's camera", await page.getByText(T.scan).first().isVisible());
    const address = (await page.locator("main bdi").last().innerText()).trim();
    check("…the address under it", address.endsWith("/app"), address);
    const png = await qr.locator("..").screenshot();
    const { data, info } = await sharp(png).ensureAlpha().raw().toBuffer({ resolveWithObject: true });
    const read = jsQR(new Uint8ClampedArray(data), info.width, info.height);
    check("…and the QR reads as this very link", !!read?.data && read.data.endsWith("/app"), read?.data ?? "unreadable");
    check("…no install button", (await button(page).count()) === 0);
    await shot(page, "computer");
    await ctx.close();
  }

  console.log("\nInside the installed app (Pointili's Android app)");
  {
    const { ctx, page } = await phone({ ua: UA.ourApp });
    await page.goto(`${BASE}/app`, { waitUntil: "load", timeout: 90000 });
    await page.waitForURL((u) => u.pathname === "/", { timeout: 15000 }).catch(() => {});
    check("straight to its home: nothing to install", new URL(page.url()).pathname === "/", page.url());
    await ctx.close();
  }

  console.log("\nOne screen, from the shortest phone up");
  for (const [w, h] of [[360, 548], [375, 548], [360, 640], [390, 844], [430, 932]]) {
    const { ctx, page } = await phone({ size: { width: w, height: h } });
    await open(page);
    const f = await fits(page);
    check(`Android ${w}×${h}: fits`, f.ok, f);
    if (w === 360 && h === 548) await shot(page, "android-360x548");
    await ctx.close();
  }
  for (const [w, h] of [[375, 548], [390, 844]]) {
    const { ctx, page } = await phone({ ua: UA.iphone, size: { width: w, height: h } });
    await open(page);
    await page.waitForTimeout(2600);
    // the film's sheet: a phone's height at most, its button never cut
    const s = await page.evaluate(() => {
      const panel = document.querySelector('[role="dialog"] > div');
      const go = [...(panel?.querySelectorAll("button") ?? [])].pop()?.getBoundingClientRect();
      return { inner: innerHeight, panel: panel?.scrollHeight, shown: panel?.clientHeight, button: go ? Math.round(go.bottom) : null };
    });
    check(`iPhone ${w}×${h}: the film and its button on the screen`, !!s.button && s.button <= s.inner && s.panel <= s.shown + 1, s);
    if (h === 548) await shot(page, "iphone-375x548");
    await ctx.close();
  }
  for (const [w, h] of [[1280, 800], [1366, 768]]) {
    const { ctx, page } = await phone({ ua: UA.computer, size: { width: w, height: h }, mobile: false });
    await open(page);
    const f = await fits(page);
    check(`computer ${w}×${h}: fits`, f.ok, f);
    await ctx.close();
  }

  console.log("\nThe address, typed or sent");
  for (const p of ["/install", "/installer"]) {
    const r = await fetch(`${BASE}${p}`, { redirect: "manual" });
    check(`${p} leads to /app`, [307, 308].includes(r.status) && (r.headers.get("location") ?? "").endsWith("/app"), `${r.status} ${r.headers.get("location")}`);
  }
  const html = await (await fetch(`${BASE}/app`)).text();
  const meta = (p) => html.match(new RegExp(`<meta property="${p}" content="([^"]*)"`))?.[1];
  check("a chat's preview: the page's own title", meta("og:title") === T.install, meta("og:title"));
  // the share picture's name carries its version since the new prices (og-v2.jpg): a chat caches by address
  check("…the site's picture", /\/og(-v\d+)?\.jpg$/.test(meta("og:image") ?? ""), meta("og:image"));
  check("…and this address", /\/app$/.test(meta("og:url") ?? ""), meta("og:url"));
} finally {
  await browser.close();
}

console.log(`\n${passed} passed, ${failed.length} failed${failed.length ? `:\n  - ${failed.join("\n  - ")}` : ""}`);
process.exit(failed.length ? 1 : 0);
