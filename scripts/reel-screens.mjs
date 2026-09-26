// Sessions come from scripts/shot.mjs: run `node --env-file=.env.local scripts/shot.mjs merchant dashboard` and `... customer customer` once on the same server first.
// Reel assets: the customer's screens and the shop's screens, as clean phone frames on transparent
// PNGs, plus one storyboard per flow. Uses the demo shop (Café Bonheur) and a throwaway customer
// on the local dev server; the shop's cooldown is lifted for the run and put back after.
//   node --env-file=.env.local scripts/reel-screens.mjs             capture everything, then frame
//   ONLY=frames node --env-file=.env.local scripts/reel-screens.mjs  frame and board what is on disk
//   ONLY=redeem node --env-file=.env.local scripts/reel-screens.mjs  just the shop's redeem screen, from the customer's pending code
import { existsSync, mkdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";

const BASE = process.env.SHOTS_BASE || "http://localhost:3000";
const HOST = new URL(BASE).host.replace(/[^a-z0-9]+/gi, "-");
const ONLY = process.env.ONLY || "";
const OUT = "social/reel/screens"; const RAW = join(OUT, "raw");
mkdirSync(RAW, { recursive: true });
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const phone = { viewport: { width: 390, height: 844 }, deviceScaleFactor: 3, isMobile: true, hasTouch: true, locale: "ar-TN" };
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const state = (role) => JSON.parse(readFileSync(`.e2e/auth-${role}-${HOST}.json`, "utf8"));
const log = (m) => console.log(m);
const ALL = ["shop-1-home", "shop-2-qr", "shop-3-customers", "shop-4-redeem", "client-1-scan-first-time", "client-2-first-stamp", "client-3-stamp-4", "client-4-home-card", "client-5-card-detail", "client-6-card-full-reward", "client-7-reward-code", "client-8-home-reward-ready"];
const codeOn = (txt) => { const mm = txt.match(/(\d{3})[\s\u00a0]?(\d{3})/); return mm ? mm[1] + mm[2] : null; };

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

if (ONLY !== "frames") {
  // the demo shop and its card; the cooldown between stamps is lifted for the run
  const { data: biz } = await admin.from("businesses").select("id,name").eq("name", "Café Bonheur").single();
  if (!biz) throw new Error("Café Bonheur not found");
  const { data: card } = await admin.from("loyalty_cards").select("id,cooldown_minutes,stamps_required").eq("business_id", biz.id).single();
  await admin.from("loyalty_cards").update({ cooldown_minutes: 0 }).eq("id", card.id);
  log(`shop ${biz.name}: ${card.stamps_required} stamps per card, cooldown ${card.cooldown_minutes} min (lifted for the run)`);

  try {
    const ctxFor = async (role) => {
      const ctx = await browser.newContext({ ...phone, storageState: role ? state(role) : undefined });
      await ctx.addCookies([{ name: "pl_lang2", value: "tn", url: BASE }]);
      return ctx;
    };
    // the Next dev badge (a <nextjs-portal> that hides inside a <script>) has no place in a reel
    const hideDev = (page) => page.evaluate(() => document.querySelectorAll("nextjs-portal, next-route-announcer").forEach((el) => { el.style.display = "none"; }));
    const shoot = async (page, name, settle = 900) => { await page.waitForTimeout(settle); await hideDev(page); const file = join(RAW, `${name}.png`); await page.screenshot({ path: file }); log(`  ✓ ${name}`); return file; };

    const m = await (await ctxFor("merchant")).newPage();
    const c = await (await ctxFor("customer")).newPage();
    const g = await (await ctxFor(null)).newPage();
    const mint = async () => { await m.goto(`${BASE}/dashboard`, { waitUntil: "load" }); const r = await m.evaluate(async () => (await fetch("/api/qr/mint", { method: "POST" })).json()); return new URL(r.url).pathname; };

    if (ONLY === "redeem") {
      await c.goto(`${BASE}/customer/rewards`, { waitUntil: "networkidle" });
      const pend = c.locator("a[href^='/customer/rewards/use/']").first();
      if (await pend.count()) { await pend.click(); await c.waitForSelector("svg", { timeout: 30000 }); await c.waitForTimeout(800); }
      const code = codeOn(await c.evaluate(() => document.body.innerText)); log(`pending code ${code || "(none)"}`);
      await m.goto(`${BASE}/redeem${code ? `?code=${code}` : ""}`, { waitUntil: "networkidle" }); await shoot(m, "shop-4-redeem", 1800);
    } else {
      // ── the shop ──
      await m.goto(`${BASE}/dashboard`, { waitUntil: "networkidle" }); await shoot(m, "shop-1-home");
      await m.goto(`${BASE}/qr`, { waitUntil: "networkidle" }); await m.waitForSelector("svg", { timeout: 30000 }); await shoot(m, "shop-2-qr", 2500);

      // ── the customer ──
      // a first-timer scans: the stamp is held, make an account
      await g.goto(BASE + (await mint()), { waitUntil: "networkidle" }); await g.waitForSelector("a[href*='/customer/register']", { timeout: 30000 }); await shoot(g, "client-1-scan-first-time", 1500);

      // a customer with an account scans, stamp after stamp
      let cardHref = null, code = null;
      for (let i = 1; i <= card.stamps_required; i++) {
        await c.goto(BASE + (await mint()), { waitUntil: "networkidle" });
        await c.waitForSelector("a[href^='/customer/cards/']", { timeout: 30000 });
        cardHref = await c.getAttribute("a[href^='/customer/cards/']", "href");
        if (i === 1) await shoot(c, "client-2-first-stamp", 3200);
        if (i === 4) {
          await shoot(c, "client-3-stamp-4", 3200);
          await c.goto(`${BASE}/customer`, { waitUntil: "networkidle" }); await shoot(c, "client-4-home-card");
          await c.goto(BASE + cardHref, { waitUntil: "networkidle" }); await shoot(c, "client-5-card-detail");
        }
        if (i === card.stamps_required) {
          await shoot(c, "client-6-card-full-reward", 3600);
          const use = c.locator("button, a").filter({ hasText: /كادو|استعمل|Utiliser|reward/i }).first();
          if (await use.count()) {
            await use.click(); await c.waitForURL(/\/customer\/rewards\/use\//, { timeout: 30000 }); await c.waitForSelector("svg", { timeout: 30000 });
            await shoot(c, "client-7-reward-code", 1500); code = codeOn(await c.evaluate(() => document.body.innerText));
          }
        }
      }
      await c.goto(`${BASE}/customer`, { waitUntil: "networkidle" }); await shoot(c, "client-8-home-reward-ready");

      // ── back to the shop: the customers, and the reward given ──
      await m.goto(`${BASE}/customers`, { waitUntil: "networkidle" }); await shoot(m, "shop-3-customers");
      await m.goto(`${BASE}/redeem${code ? `?code=${code}` : ""}`, { waitUntil: "networkidle" }); await shoot(m, "shop-4-redeem", 1800);
      log(`reward code ${code || "(none)"}`);
    }
  } finally {
    await admin.from("loyalty_cards").update({ cooldown_minutes: card.cooldown_minutes }).eq("id", card.id);
    log(`cooldown put back to ${card.cooldown_minutes} min`);
  }
}

// ── frames: each raw shot gets a status bar (the screen's own top colour, 9:41, signal, battery),
//    then sits inside a clean phone, transparent around it ──
const STRIP = 141;   // the status bar, in screen pixels at 3×
const FRAME = `<!doctype html><html><head><meta charset="utf-8"><link href="https://fonts.googleapis.com/css2?family=Tajawal:wght@500;700;800&family=Inter:wght@500;600&display=swap" rel="stylesheet">
<style>
  html,body{margin:0;background:transparent}
  .phone{position:relative;display:inline-block;padding:20px;background:#0F0F12;border-radius:118px;box-shadow:0 30px 70px rgba(0,0,0,.28), inset 0 0 0 3px #2A2A30}
  .phone .screen{display:block;width:1170px;height:auto;border-radius:98px}
  .phone .island{position:absolute;top:48px;left:50%;transform:translateX(-50%);width:276px;height:84px;border-radius:44px;background:#0F0F12}
  .board{position:relative;width:1920px;height:1080px;background:linear-gradient(135deg,#F7F5FF 0%,#EFEAFF 100%);display:flex;align-items:flex-end;justify-content:center;gap:34px;padding:0 60px 64px;box-sizing:border-box;font-family:Tajawal,Inter,sans-serif;direction:rtl}
  .step{display:flex;flex-direction:column;align-items:center;gap:18px}
  .step .phone{zoom:.27}
  .step .cap{width:330px;text-align:center;color:#111;font-size:25px;font-weight:700;line-height:1.35;min-height:70px}
  .step .num{display:inline-grid;place-items:center;width:40px;height:40px;border-radius:50%;background:#6535E0;color:#fff;font:600 21px Inter,sans-serif;margin-bottom:6px}
  .title{position:absolute;top:44px;right:60px;font-size:34px;font-weight:800;color:#111}
  .title small{display:block;font-size:20px;font-weight:500;color:#6B6B76;margin-top:4px}
  .brand{position:absolute;top:54px;left:60px;font:600 22px Inter,sans-serif;color:#6535E0;display:flex;align-items:center;gap:10px}
  .brand b{width:22px;height:17px;background:#6535E0;border-radius:5px;display:inline-block}
</style></head><body><script>
  const rr = (g, x, y, w, h, r) => { g.beginPath(); g.moveTo(x + r, y); g.arcTo(x + w, y, x + w, y + h, r); g.arcTo(x + w, y + h, x, y + h, r); g.arcTo(x, y + h, x, y, r); g.arcTo(x, y, x + w, y, r); g.closePath(); };
  window.__compose = (src, S) => new Promise((res) => { const img = new Image(); img.onload = () => {
    const W = img.naturalWidth, H = img.naturalHeight;
    const probe = document.createElement("canvas"); probe.width = W; probe.height = 4; const pg = probe.getContext("2d"); pg.drawImage(img, 0, 0, W, 4, 0, 0, W, 4);
    const d = pg.getImageData(0, 0, W, 4).data; let r = 0, gg = 0, bb = 0, n = 0; for (let i = 0; i < d.length; i += 4) { r += d[i]; gg += d[i + 1]; bb += d[i + 2]; n++; }
    const col = [r / n, gg / n, bb / n].map(Math.round); const ink = (col[0] * 0.299 + col[1] * 0.587 + col[2] * 0.114) < 140 ? "#fff" : "#111";
    const cv = document.createElement("canvas"); cv.width = W; cv.height = H + S; const g = cv.getContext("2d");
    g.fillStyle = "rgb(" + col.join(",") + ")"; g.fillRect(0, 0, W, S); g.drawImage(img, 0, S);
    g.fillStyle = ink; g.strokeStyle = ink; g.textBaseline = "middle"; g.font = "600 52px Inter, -apple-system, sans-serif"; g.textAlign = "left"; g.fillText("9:41", 108, S / 2 + 2);
    const by = S / 2; [0, 1, 2, 3].forEach((i) => { const h = 16 + i * 10; rr(g, W - 318 + i * 21, by + 20 - h, 13, h, 3); g.fill(); });
    g.lineWidth = 9; g.lineCap = "round"; const wx = W - 196, wy = by + 20; [36, 23].forEach((rad) => { g.beginPath(); g.arc(wx, wy, rad, Math.PI * 1.26, Math.PI * 1.74); g.stroke(); }); g.beginPath(); g.arc(wx, wy - 4, 7, 0, Math.PI * 2); g.fill();
    const kx = W - 150, ky = by - 17; g.lineWidth = 4; g.globalAlpha = 0.45; rr(g, kx, ky, 66, 34, 9); g.stroke(); rr(g, kx + 69, ky + 11, 5, 12, 2); g.fill(); g.globalAlpha = 1; rr(g, kx + 5, ky + 5, 56, 24, 5); g.fill();
    res(cv.toDataURL("image/png"));
  }; img.src = src; });
</script></body></html>`;
const onDisk = ALL.filter((n) => existsSync(join(RAW, `${n}.png`)));
const dataUrl = (file) => `data:image/png;base64,${readFileSync(file).toString("base64")}`;
const framePage = await browser.newPage({ viewport: { width: 1300, height: 2800 }, deviceScaleFactor: 1 });
await framePage.setContent(FRAME, { waitUntil: "load" }); await framePage.evaluate(async () => { await document.fonts.ready; });
const composed = {};
for (const name of onDisk) {
  composed[name] = await framePage.evaluate(({ src, S }) => window.__compose(src, S), { src: dataUrl(join(RAW, `${name}.png`)), S: STRIP });
  await framePage.evaluate((src) => { document.body.innerHTML = `<div class="phone" id="p"><img class="screen" src="${src}"><div class="island"></div></div>`; }, composed[name]);
  await framePage.waitForTimeout(150);
  await framePage.locator("#p").screenshot({ path: join(OUT, `${name}.png`), omitBackground: true });
  log(`  ▣ ${name}.png (framed, transparent)`);
}

// ── storyboards: one per flow, 1920×1080, numbered captions in Tunisian ──
const boards = {
  "storyboard-client": { title: "الحريف", sub: "كيفاش يلمّ التامبونات", steps: [
    ["client-1-scan-first-time", "يسكاني الكود في الكونتوار: التامبون محجوز"],
    ["client-2-first-stamp", "يعمل كونت بنومرو التليفون، التامبون يتسجّل"],
    ["client-4-home-card", "الكارط في تليفونو، بلا أبليكاسيون"],
    ["client-5-card-detail", "يشوف قداش باقيلو للكادو"],
    ["client-6-card-full-reward", "الكارط عمرت: الكادو جاهز"],
  ] },
  "storyboard-shop": { title: "المحل", sub: "كيفاش يعطي التامبونات", steps: [
    ["shop-1-home", "زر واحد: ورّي الكود"],
    ["shop-2-qr", "الكود يتبدّل وحدو، ما يتصوّرش"],
    ["shop-3-customers", "كل حريف وتامبوناتو، تلقائي"],
    ["shop-4-redeem", "الحريف يجيب الكود، تعطي الكادو"],
  ] },
};
const boardPage = await browser.newPage({ viewport: { width: 1920, height: 1080 }, deviceScaleFactor: 1 });
await boardPage.setContent(FRAME, { waitUntil: "load" }); await boardPage.evaluate(async () => { await document.fonts.ready; });
for (const [file, b] of Object.entries(boards)) {
  const steps = b.steps.filter(([n]) => composed[n]);
  await boardPage.evaluate(({ b, steps, imgs }) => {
    document.body.innerHTML = `<div class="board"><div class="brand"><b></b>Pointili</div><div class="title">${b.title}<small>${b.sub}</small></div>${steps.map(([n, cap], i) => `<div class="step"><div class="phone"><img class="screen" src="${imgs[n]}"><div class="island"></div></div><div class="cap"><span class="num">${i + 1}</span><br>${cap}</div></div>`).join("")}</div>`;
  }, { b, steps, imgs: Object.fromEntries(steps.map(([n]) => [n, composed[n]])) });
  await boardPage.waitForTimeout(500);
  await boardPage.locator(".board").screenshot({ path: join(OUT, `${file}.png`) });
  log(`  ▤ ${file}.png (1920×1080)`);
}
await browser.close();
log("done");
