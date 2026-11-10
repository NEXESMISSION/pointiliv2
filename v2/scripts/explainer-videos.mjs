/**
 * Two short explainers to send on WhatsApp — 720×1280 MP4 (H.264, no sound), a phone on the
 * screen, a finger on each tap, one line on top for each step:
 *
 *   install — Pointili on an Android phone: the site in Chrome → «؟» → «حطّ Pointili في تليفونك»
 *             → Chrome's «تثبيت» → the icon on the home screen. Real screens of the live site,
 *             filmed in an Android phone's browser (nothing counted: the traffic calls are
 *             answered here). Only Chrome's own dialog and the phone's home screen are drawn:
 *             no page can film them.
 *   links   — a tampon sent as a link: the owner's home → «اعمل رابط جديد» → WhatsApp → the
 *             customer takes it → the owner's list. Real screens from a run of
 *             scripts/links.mjs (.e2e/links/); the chat is drawn.
 *   cancel  — a tampon given by mistake, taken back (10 Nov 2026): the home's «التاريخ» →
 *             «فسّخ» → «إيه، فسّخو» → the line taken back, and the two other ways, a
 *             customer's card and the counter. Real screens from a run of
 *             scripts/history.mjs (.e2e/history/).
 *
 *   node scripts/explainer-videos.mjs                 (from v2/: both)
 *   ONLY=install node scripts/explainer-videos.mjs    (one of them)
 *   → ../social/explainers/install-android-app.mp4, tampon-by-link.mp4, cancel-tampon.mp4
 *
 * Needs Chrome, and ffmpeg (FFMPEG=path, else on the PATH).
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readFileSync, rmSync } from "node:fs";
import { tmpdir } from "node:os";
import { join, resolve } from "node:path";
import { chromium } from "playwright-core";

const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
const SITE = process.env.SITE || "https://www.pointili.online";
const OUT = resolve("../social/explainers");
const TMP = join(tmpdir(), "pointili-explainers");
const ONLY = process.env.ONLY;
const FPS = 30;
const W = 720;
const H = 1280;
const ANDROID = "Mozilla/5.0 (Linux; Android 14; Pixel 8) AppleWebKit/537.36 (KHTML, like Gecko) Chrome/141.0.0.0 Mobile Safari/537.36";

const png = (buf) => `data:image/png;base64,${Buffer.from(buf).toString("base64")}`;
const file = (p, type = "image/png") => `data:${type};base64,${readFileSync(p).toString("base64")}`;
const ICON = file("public/icon-192.png");
const MARK = file("public/brand-mark.svg", "image/svg+xml");

/* ---------- the live site, as an Android phone sees it ---------- */

async function captureInstall(browser) {
  const shots = {};
  // in Chrome, under the status bar (24) and Chrome's own bar (56); installed, under the status bar only
  for (const [name, h] of [
    ["web", 764],
    ["app", 820],
  ]) {
    const ctx = await browser.newContext({ viewport: { width: 390, height: h }, deviceScaleFactor: 2, isMobile: true, hasTouch: true, userAgent: ANDROID, locale: "ar-TN" });
    // a film is not a visitor: the traffic calls never reach the site
    await ctx.route(/\/api\/(beacon|here)/, (r) => r.fulfill({ status: 204, body: "" }));
    const page = await ctx.newPage();
    await page.goto(`${SITE}/`, { waitUntil: "networkidle" });
    await page.waitForTimeout(1800);
    shots[name] = await page.screenshot();
    if (name === "web") {
      const help = page.getByRole("button", { name: "عندك سؤال؟" });
      shots.helpAt = await help.boundingBox();
      await help.click();
      await page.waitForTimeout(1000);
      const row = page.locator("[role=dialog]").getByRole("button", { name: /تليفونك/ });
      shots.rowAt = await row.boundingBox();
      shots.help = await page.screenshot();
    }
    await ctx.close();
  }
  if (!shots.helpAt || !shots.rowAt) throw new Error("the «؟» or its install row was not found on the live site");
  return shots;
}

/* ---------- the pieces drawn in the film ---------- */

const SVG = {
  wifi: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round"><path d="M5 12.5a10 10 0 0 1 14 0"/><path d="M8.5 16a5 5 0 0 1 7 0"/><circle cx="12" cy="19.5" r="1" fill="currentColor"/></svg>',
  lock: '<svg viewBox="0 0 24 24" width="15" height="15" fill="none" stroke="currentColor" stroke-width="2.2"><rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/></svg>',
  dots: '<svg viewBox="0 0 24 24" width="20" height="20" fill="currentColor"><circle cx="12" cy="5" r="2"/><circle cx="12" cy="12" r="2"/><circle cx="12" cy="19" r="2"/></svg>',
  phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8.1 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
  chat: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22z"/>',
  camera: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
  image: '<rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3-3a2 2 0 0 0-2.8 0L6 21"/>',
  clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
  gear: '<circle cx="12" cy="12" r="3"/><circle cx="12" cy="12" r="8"/>',
  globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
  music: '<path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/>',
  download: '<svg viewBox="0 0 24 24" width="30" height="30" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M12 15V3"/></svg>',
};

const status = (tone = "dark") =>
  `<div class="status ${tone}"><span>10:30</span><span class="st-r">${SVG.wifi}<i class="bat"><b></b></i></span></div>`;
const chromeBar = () =>
  `<div class="chromebar"><div class="url">${SVG.lock}<span>pointili.online</span></div><span class="tabs">1</span><span class="menu">${SVG.dots}</span></div>`;
const img = (src, top, h) => `<img class="shot" src="${src}" style="top:${top}px;height:${h}px">`;

// a phone's home screen: generic apps, and Pointili's own icon landing among them
const APPS = [
  ["الهاتف", "#22a06b", "phone"],
  ["الرسائل", "#3b82f6", "chat"],
  ["الكاميرا", "#64748b", "camera"],
  ["الصور", "#f59e0b", "image"],
  ["الساعة", "#0ea5e9", "clock"],
  ["الإعدادات", "#6b7280", "gear"],
  ["الموسيقى", "#ef4444", "music"],
];
const POINTILI_AT = { x: 322, y: 262 }; // the 8th place: row 2, last column
function homeScreen() {
  const cell = (i) => ({ x: 58 + (i % 4) * 88, y: 150 + Math.floor(i / 4) * 112 });
  const apps = APPS.map(([label, color, glyph], i) => {
    const { x, y } = cell(i);
    return `<div class="app" style="left:${x - 30}px;top:${y - 30}px"><span class="ico" style="background:${color}"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVG[glyph]}</svg></span><span class="lbl">${label}</span></div>`;
  }).join("");
  const dock = ["phone", "chat", "globe", "camera"]
    .map((g, i) => `<span class="ico dock" style="left:${24 + i * 82}px"><svg viewBox="0 0 24 24" width="28" height="28" fill="none" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">${SVG[g]}</svg></span>`)
    .join("");
  return `<div class="wall"></div>${status("light")}<div class="clockbig">10:30</div>${apps}
    <div class="app" id="pt-icon" style="left:${POINTILI_AT.x - 30}px;top:${POINTILI_AT.y - 30}px"><img class="ico" src="${ICON}"><span class="lbl">Pointili</span></div>
    <div class="dockbar">${dock}</div>`;
}

// Chrome's own question, as Android draws it (an Arabic phone; «Installer» on a French one)
const DIALOG = { top: 300, btnX: 96, btnY: 460 };
const dialog = () => `<div class="dim" id="dim"></div>
  <div class="dialog" id="dlg" style="top:${DIALOG.top}px">
    <h3>تثبيت التطبيق؟</h3>
    <div class="dapp"><img src="${ICON}"><div><b>Pointili</b><span dir="ltr">pointili.online</span></div></div>
    <div class="dbtns"><span class="dbtn primary">تثبيت</span><span class="dbtn">إلغاء</span></div>
  </div>`;

// the customer's WhatsApp-like chat: the message the app writes (t.linkWaText) and its link
const LINK_AT = { x: 200, y: 352 };
const chat = () => `<div class="chatbg"></div>${status("dark")}
  <div class="chathead"><span class="back">›</span><span class="av">B</span><div><b>Boutique Sonia</b><small>متّصل</small></div></div>
  <div class="bubble">🎁 تامبون جديد من Boutique Sonia! حلّ الرابط هذا وخوذو في الكارط متاعك:<a dir="ltr">www.pointili.online/s/uPn33BlcVD…</a><time>12:27</time></div>
  <div class="chatbar"><span class="field">اكتب رسالة</span><span class="mic"></span></div>`;

/* ---------- the two films ---------- */

function installFilm(s) {
  const at = (box, dy) => ({ x: box.x + box.width / 2, y: box.y + box.height / 2 + dy });
  return {
    name: "install-android-app",
    scenes: [
      { kind: "card", dur: 1900, title: "حطّ Pointili في تليفونك", sub: "على أندرويد، في ثواني" },
      { kind: "screen", dur: 3400, step: 1, title: "حلّ pointili.online في Chrome", sub: "واضغط على «؟»", html: status() + chromeBar() + img(png(s.web), 80, 764), taps: [{ at: 1900, ...at(s.helpAt, 80) }] },
      { kind: "screen", dur: 3200, step: 2, title: "اضغط «حطّ Pointili في تليفونك»", html: status() + chromeBar() + img(png(s.help), 80, 764), taps: [{ at: 1700, ...at(s.rowAt, 80) }] },
      {
        kind: "screen",
        dur: 3100,
        step: 3,
        // each line starts in Arabic: a line that starts with «Chrome» is laid out left to right
        title: "اضغط «تثبيت»",
        sub: "كي يسألك Chrome · بالفرنسية: Installer",
        html: status() + chromeBar() + img(png(s.help), 80, 764) + dialog(),
        taps: [{ at: 1750, x: DIALOG.btnX, y: DIALOG.btnY }],
        fx: [{ type: "dialog", in: 150, out: 2300 }],
      },
      {
        kind: "screen",
        dur: 4300,
        step: 4,
        title: "هاو Pointili في تليفونك!",
        sub: "تحلّو كيما أي أبليكاسيون",
        html: homeScreen() + `<div id="app-open" class="opened">${status()}${img(png(s.app), 24, 820)}</div>`,
        taps: [{ at: 2200, ...POINTILI_AT }],
        fx: [
          { type: "pop", id: "pt-icon", at: 450 },
          { type: "open", id: "app-open", at: 2500, dur: 450, from: POINTILI_AT },
        ],
      },
      { kind: "card", dur: 3000, title: "عندك محل؟", sub: "الزرّ هذا في الصفحة متاعك يحطّو زادة", button: true },
    ],
  };
}

function linksFilm() {
  const e2e = (n) => file(`.e2e/links/${n}.png`);
  return {
    name: "tampon-by-link",
    scenes: [
      { kind: "card", dur: 2000, title: "ابعث تامبون برابط", sub: "للحرفاء اللي يشريو منك أونلاين" },
      { kind: "screen", dur: 3000, step: 1, title: "اضغط «ابعث تامبون برابط»", sub: "من الصفحة متاعك", html: img(e2e("11-home"), 0, 844) + status(), taps: [{ at: 1700, x: 215, y: 292 }] },
      { kind: "screen", dur: 3200, step: 2, title: "اضغط «اعمل رابط جديد»", sub: "تنجم تكتب اسم الحريف · موش لازم", html: img(e2e("2-page-empty"), 0, 844) + status(), taps: [{ at: 1800, x: 195, y: 268 }] },
      { kind: "screen", dur: 3200, step: 3, title: "ابعثو للحريف في واتساب", sub: "ولا انسخو وابعثو وين تحب", html: img(e2e("3-link-ready"), 0, 844) + status(), taps: [{ at: 1900, x: 314, y: 684 }] },
      { kind: "screen", dur: 3100, step: 4, title: "الحريف يحلّ الرابط…", html: chat(), taps: [{ at: 1900, ...LINK_AT }] },
      { kind: "screen", dur: 2900, title: "والتامبون يدخل للكارط متاعو", html: status() + chromeBar() + img(e2e("4-customer-stamped"), 80, 844) },
      {
        kind: "screen",
        dur: 3700,
        step: 5,
        title: "وتعرف شكون خذاه",
        sub: "كل رابط يخدم مرّة وحدة، وما يوفاش",
        html: img(e2e("7-list"), 0, 844) + status() + `<div class="ring" id="ring" style="left:22px;top:492px;width:346px;height:70px"></div>`,
        fx: [{ type: "ring", id: "ring", at: 600 }],
      },
      { kind: "card", dur: 2800, title: "تامبون برابط", sub: "لكل حريف رابط جديد · مرّة وحدة" },
    ],
  };
}

function cancelFilm() {
  const e2e = (n) => file(`.e2e/history/${n}.png`);
  const at = JSON.parse(readFileSync(".e2e/history/taps.json", "utf8"));
  const ring = (id, b, pad = 6) => `<div class="ring" id="${id}" style="left:${b.x - b.w / 2 - pad}px;top:${b.y - b.h / 2 - pad}px;width:${b.w + 2 * pad}px;height:${b.h + 2 * pad}px"></div>`;
  return {
    name: "cancel-tampon",
    scenes: [
      { kind: "card", dur: 2000, title: "غلطت في تامبون؟", sub: "فسّخو في ثانيتين" },
      { kind: "screen", dur: 3100, step: 1, title: "اضغط «التاريخ»", sub: "في الصفحة متاعك، فوق «آخر حركة»", html: img(e2e("1-home"), 0, 844) + status(), taps: [{ at: 1800, x: at.home.x, y: at.home.y }] },
      { kind: "screen", dur: 3300, step: 2, title: "على التامبون الغالط، اضغط «فسّخ»", sub: "كل تامبون وكل كادو، نهار بنهار", html: img(e2e("2-history"), 0, 844) + status(), taps: [{ at: 1950, x: at.undo.x, y: at.undo.y }] },
      { kind: "screen", dur: 3200, step: 3, title: "اضغط «إيه، فسّخو»", sub: "والكادو اللي ربحو بيه يتنحّى زادة", html: img(e2e("3-sheet"), 0, 844) + status(), taps: [{ at: 1900, x: at.yes.x, y: at.yes.y }] },
      {
        kind: "screen",
        dur: 3200,
        title: "وفات! التامبون تفسّخ",
        sub: "والكارط متاع الحريف رجعت كيما كانت",
        html: img(e2e("4-done"), 0, 844) + status() + ring("ring-done", at.done),
        fx: [{ type: "ring", id: "ring-done", at: 500 }],
      },
      {
        kind: "screen",
        dur: 3600,
        step: 4,
        title: "ولا من كارط الحريف",
        sub: "في «الحرفاء»: «فسّخ» على آخر تامبون متاعو",
        html: img(e2e("6-card"), 0, 844) + status() + ring("ring-card", at.card, 4),
        fx: [{ type: "ring", id: "ring-card", at: 700 }],
      },
      {
        kind: "screen",
        dur: 3400,
        step: 5,
        title: "ولا من الكود، كي يسكاني",
        sub: "«فسّخ» حذا آخر تامبون",
        html: img(e2e("7-counter"), 0, 844) + status("light"),
        taps: [{ at: 2000, x: at.counter.x, y: at.counter.y }],
      },
      { kind: "card", dur: 3200, title: "آخر تامبون لكل حريف", sub: "تنجم تفسّخو في 24 ساعة، قبل ما ياخو الكادو" },
    ],
  };
}

/* ---------- the page that draws a film at any moment ---------- */

const SW = 396; // the phone's screen, in the film's pixels (the app's screens are 390 wide)
const K = SW / 390;
const BEZ = 11;
const PHONE = { x: (W - SW - 2 * BEZ) / 2, y: 300 };

function page(film) {
  let id = 0;
  const scenes = film.scenes.map((s) => ({ ...s, id: `s${id++}` }));
  const cards = scenes
    .filter((s) => s.kind === "card")
    .map(
      (s) => `<section class="card" id="${s.id}">
        <div class="tile"><img src="${MARK}"></div>
        <div class="word">Pointili</div>
        ${s.button ? `<span class="purple">${SVG.download}</span>` : ""}
        <h1>${s.title}</h1><p>${s.sub ?? ""}</p>
        <div class="site" dir="ltr">www.pointili.online</div>
      </section>`,
    )
    .join("");
  const screens = scenes.filter((s) => s.kind === "screen").map((s) => `<div class="scene" id="${s.id}">${s.html}</div>`).join("");
  const caps = scenes
    .filter((s) => s.kind === "screen")
    .map((s) => `<div class="cap" id="c${s.id}">${s.step ? `<span class="step">${s.step}</span>` : ""}<h2>${s.title}</h2>${s.sub ? `<p>${s.sub}</p>` : ""}</div>`)
    .join("");
  const data = scenes.map(({ html: _h, ...rest }) => rest);
  return `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<link rel="preconnect" href="https://fonts.googleapis.com"><link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@400;500;600;700&display=block" rel="stylesheet">
<style>
*{box-sizing:border-box;margin:0}
html,body{width:${W}px;height:${H}px;overflow:hidden;font-family:"Readex Pro",sans-serif;color:#0F0E17}
body{background:radial-gradient(120% 70% at 50% 0%,#ffffff 0%,#F4F3F9 45%,#E9E4FF 100%)}
.caps{position:absolute;inset:0 0 auto 0;height:${PHONE.y}px}
.cap{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;padding:18px 44px 26px;text-align:center;opacity:0}
.step{display:grid;place-items:center;width:52px;height:52px;border-radius:50%;background:#6C47FF;color:#fff;font-weight:700;font-size:28px;margin-bottom:16px;box-shadow:0 10px 24px -10px rgb(108 71 255/.8)}
.cap h2{font-size:43px;line-height:1.28;font-weight:700}
.cap p{margin-top:10px;font-size:28px;color:#6B6880;font-weight:500}
.phone{position:absolute;left:${PHONE.x}px;top:${PHONE.y}px;width:${SW + 2 * BEZ}px;height:${844 * K + 2 * BEZ}px;border-radius:56px;background:#141320;padding:${BEZ}px;box-shadow:0 40px 70px -30px rgb(40 20 120/.55),inset 0 0 0 2px #2b2940}
.screen{position:relative;width:${SW}px;height:${844 * K}px;border-radius:45px;overflow:hidden;background:#F4F3F9}
.inner{position:absolute;left:0;top:0;width:390px;height:844px;transform:scale(${K});transform-origin:0 0}
.scene{position:absolute;inset:0;opacity:0;overflow:hidden;background:#F4F3F9}
.shot{position:absolute;left:0;width:390px;object-fit:cover;object-position:top}
.punch{position:absolute;left:50%;top:9px;width:11px;height:11px;margin-left:-5.5px;border-radius:50%;background:#0b0a12;z-index:5}
.status{position:absolute;inset:0 0 auto 0;height:24px;display:flex;align-items:center;justify-content:space-between;padding:0 22px 0 26px;font-size:13px;font-weight:600;direction:ltr;z-index:4}
.status.dark{color:#1d1b29}.status.light{color:#fff}
.st-r{display:flex;align-items:center;gap:6px}
.bat{display:inline-block;width:22px;height:11px;border:1.6px solid currentColor;border-radius:3px;padding:1px;position:relative}
.bat b{display:block;width:70%;height:100%;background:currentColor;border-radius:1px}
.chromebar{position:absolute;left:0;right:0;top:24px;height:56px;background:#fff;display:flex;align-items:center;gap:10px;padding:0 10px 0 12px;direction:ltr;z-index:3;box-shadow:0 1px 0 #e6e3ef}
.url{flex:1;height:40px;border-radius:20px;background:#f1f0f6;display:flex;align-items:center;gap:8px;padding:0 14px;color:#3c3a4a;font-size:16px}
.tabs{width:22px;height:22px;border:2px solid #3c3a4a;border-radius:5px;display:grid;place-items:center;font-size:12px;font-weight:700;color:#3c3a4a}
.menu{color:#3c3a4a;display:grid;place-items:center}
.dim{position:absolute;inset:0;background:rgb(20 16 40/.45);opacity:0;z-index:6}
.dialog{position:absolute;left:39px;width:312px;padding:24px 24px 14px;border-radius:28px;background:#fff;z-index:7;opacity:0;box-shadow:0 24px 60px -20px rgb(0 0 0/.5)}
.dialog h3{font-size:22px;font-weight:600}
.dapp{display:flex;align-items:center;gap:14px;margin:20px 0 22px}
.dapp img{width:46px;height:46px;border-radius:12px}
.dapp b{display:block;font-size:18px}.dapp span{display:block;font-size:14px;color:#6b6880}
.dbtns{display:flex;flex-direction:row-reverse;justify-content:flex-start;gap:6px}
.dbtn{padding:10px 16px;border-radius:20px;font-size:17px;font-weight:600;color:#4b4760}
.dbtn.primary{color:#fff;background:#6C47FF}
.wall{position:absolute;inset:0;background:linear-gradient(160deg,#2a1b7a 0%,#5a37e6 48%,#9c7dff 100%)}
.clockbig{position:absolute;top:58px;left:0;right:0;text-align:center;color:#fff;font-size:44px;font-weight:300;direction:ltr;opacity:.95}
.app{position:absolute;width:60px;display:flex;flex-direction:column;align-items:center;gap:6px}
.ico{display:grid;place-items:center;width:58px;height:58px;border-radius:18px;box-shadow:0 8px 16px -8px rgb(0 0 0/.45)}
.app .lbl{color:#fff;font-size:12px;white-space:nowrap;text-shadow:0 1px 3px rgb(0 0 0/.4)}
.dockbar{position:absolute;left:20px;right:20px;bottom:30px;height:86px;border-radius:30px;background:rgb(255 255 255/.18)}
.dockbar .ico{position:absolute;top:14px;background:rgb(255 255 255/.22)}
.opened{position:absolute;inset:0;background:#F4F3F9;opacity:0;z-index:8}
.chatbg{position:absolute;inset:0;background:#efeae2}
.chathead{position:absolute;top:24px;left:0;right:0;height:62px;background:#fff;display:flex;align-items:center;gap:12px;padding:0 14px;box-shadow:0 1px 0 #e5e1da}
.chathead .back{font-size:30px;color:#3b3a45;line-height:1}
.chathead .av{width:40px;height:40px;border-radius:50%;background:#e8457a;color:#fff;display:grid;place-items:center;font-weight:700}
.chathead b{display:block;font-size:17px}.chathead small{font-size:13px;color:#6b6880}
.bubble{position:absolute;right:14px;top:250px;width:292px;background:#fff;border-radius:16px 4px 16px 16px;padding:12px 14px 22px;font-size:16px;line-height:1.55;box-shadow:0 1px 1px rgb(0 0 0/.12)}
.bubble a{display:block;margin-top:6px;color:#027eb5;text-decoration:underline;font-size:15px;text-align:left}
.bubble time{position:absolute;left:12px;bottom:6px;font-size:11px;color:#8a8794;direction:ltr}
.chatbar{position:absolute;left:10px;right:10px;bottom:22px;display:flex;gap:8px;align-items:center}
.chatbar .field{flex:1;height:48px;border-radius:24px;background:#fff;display:flex;align-items:center;padding:0 18px;color:#8a8794;font-size:16px}
.chatbar .mic{width:48px;height:48px;border-radius:50%;background:#1faa59}
.ring{position:absolute;border-radius:22px;border:3px solid #6C47FF;box-shadow:0 0 0 6px rgb(108 71 255/.18);opacity:0;z-index:5}
.finger{position:absolute;left:0;top:0;width:46px;height:46px;margin:-23px 0 0 -23px;border-radius:50%;background:rgb(255 255 255/.55);border:3px solid #6C47FF;box-shadow:0 6px 16px -4px rgb(40 20 120/.5);opacity:0;z-index:20}
.ripple{position:absolute;left:0;top:0;border-radius:50%;border:3px solid #6C47FF;opacity:0;z-index:19}
.card{position:absolute;inset:0;z-index:30;display:flex;flex-direction:column;align-items:center;justify-content:center;text-align:center;padding:0 60px;color:#fff;background:radial-gradient(120% 80% at 50% 10%,#8f75ff 0%,#6C47FF 45%,#3d22b8 100%);opacity:0}
.tile{width:132px;height:132px;border-radius:36px;background:#fff;display:grid;place-items:center;box-shadow:0 24px 50px -20px rgb(20 10 80/.6)}
.tile img{width:86px}
.word{margin-top:20px;font-size:30px;font-weight:700;letter-spacing:.5px;direction:ltr}
.card h1{margin-top:54px;font-size:56px;line-height:1.25;font-weight:700}
.card p{margin-top:18px;font-size:31px;line-height:1.4;opacity:.92}
.purple{margin-top:44px;width:92px;height:92px;border-radius:50%;background:#6C47FF;color:#fff;border:4px solid #fff;display:grid;place-items:center;box-shadow:0 16px 34px -14px rgb(0 0 0/.55)}
.purple svg{width:40px;height:40px}
.card .purple + h1{margin-top:28px}
.site{position:absolute;bottom:70px;left:0;right:0;font-size:26px;font-weight:600;opacity:.85}
.foot{position:absolute;bottom:34px;left:0;right:0;text-align:center;font-size:22px;font-weight:600;color:#6B6880;direction:ltr}
</style></head><body>
<div class="caps">${caps}</div>
<div class="phone"><div class="screen"><div class="inner">${screens}</div><span class="punch"></span></div></div>
<div class="foot">www.pointili.online</div>
<div class="ripple" id="ripple"></div><div class="finger" id="finger"></div>
${cards}
<script>
const SC = ${JSON.stringify(data)};
const PH = { x: ${PHONE.x + BEZ}, y: ${PHONE.y + BEZ}, k: ${K} };
const FADE = 280;
let acc = 0;
for (const s of SC) { s.start = acc; acc += s.dur; s.end = acc; }
window.TOTAL = acc;
const cl = (v) => Math.max(0, Math.min(1, v));
const out3 = (p) => 1 - Math.pow(1 - cl(p), 3);
const io3 = (p) => { p = cl(p); return p < .5 ? 4 * p * p * p : 1 - Math.pow(-2 * p + 2, 3) / 2; };
const back = (p) => { p = cl(p); const c = 1.9; return 1 + (c + 1) * Math.pow(p - 1, 3) + c * Math.pow(p - 1, 2); };
const $ = (id) => document.getElementById(id);
const taps = SC.flatMap((s) => (s.taps || []).map((t) => ({ ...t, T: s.start + t.at })));
window.setTime = (t) => {
  for (const s of SC) {
    const el = $(s.id);
    let o = 0;
    if (s.kind === "card") {
      if (t >= s.start && t < s.end + FADE) o = (s.start === 0 ? 1 : cl((t - s.start) / FADE)) * (t > s.end ? 1 - cl((t - s.end) / FADE) : 1);
      if (s === SC[SC.length - 1] && t >= s.start) o = cl((t - s.start) / FADE);
    } else {
      if (t >= s.start && t < s.end + FADE) o = s.start === 0 ? 1 : cl((t - s.start) / FADE);
      const cap = $("c" + s.id);
      const ci = out3((t - s.start - 120) / 380), co = 1 - cl((t - (s.end - 160)) / 160);
      const on = t >= s.start && t < s.end;
      cap.style.opacity = on ? ci * co : 0;
      cap.style.transform = "translateY(" + (1 - ci) * 18 + "px)";
      for (const f of s.fx || []) fx(f, t - s.start);
    }
    el.style.opacity = o;
  }
  // the finger: comes in, presses, a ring spreads, it leaves
  const f = $("finger"), r = $("ripple");
  f.style.opacity = 0; r.style.opacity = 0;
  for (const tp of taps) {
    const d = t - tp.T;
    if (d < -700 || d > 520) continue;
    const X = PH.x + tp.x * PH.k, Y = PH.y + tp.y * PH.k;
    const p = io3((d + 700) / 560);
    const x = X + (1 - p) * 110, y = Y + (1 - p) * 190;
    const press = d > -110 && d < 150 ? 0.8 : 1;
    f.style.opacity = cl((d + 700) / 160) * (1 - cl((d - 300) / 220));
    f.style.transform = "translate(" + x + "px," + y + "px) scale(" + press + ")";
    if (d >= 0 && d < 480) {
      const q = d / 480, size = 44 + q * 90;
      r.style.opacity = (1 - q) * 0.75;
      r.style.width = r.style.height = size + "px";
      r.style.transform = "translate(" + (X - size / 2) + "px," + (Y - size / 2) + "px)";
    }
  }
};
function fx(f, d) {
  if (f.type === "dialog") {
    const i = out3((d - f.in) / 260), o = 1 - cl((d - f.out) / 220);
    $("dlg").style.opacity = i * o;
    $("dlg").style.transform = "scale(" + (0.92 + 0.08 * i) + ")";
    $("dim").style.opacity = i * o;
  } else if (f.type === "pop") {
    const el = $(f.id), p = (d - f.at) / 520;
    el.style.opacity = p <= 0 ? 0 : 1;
    el.style.transform = "scale(" + (p <= 0 ? 0.01 : Math.max(0.01, back(p))) + ")";
  } else if (f.type === "open") {
    const el = $(f.id), p = io3((d - f.at) / f.dur);
    el.style.opacity = d < f.at ? 0 : cl((d - f.at) / (f.dur * 0.5));
    const s = 0.12 + 0.88 * p;
    el.style.transformOrigin = f.from.x + "px " + f.from.y + "px";
    el.style.transform = "scale(" + s + ")";
    el.style.borderRadius = (1 - p) * 60 + "px";
  } else if (f.type === "ring") {
    const el = $(f.id), p = out3((d - f.at) / 420);
    el.style.opacity = d < f.at ? 0 : p;
    el.style.transform = "scale(" + (1.06 - 0.06 * p) + ")";
  }
}
setTime(0);
</script></body></html>`;
}

/* ---------- film it ---------- */

async function render(browser, film) {
  const dir = join(TMP, film.name);
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  await p.setContent(page(film), { waitUntil: "networkidle" });
  await p.evaluate(() => document.fonts.ready);
  await p.waitForTimeout(400);
  const total = await p.evaluate(() => window.TOTAL);
  // PREVIEW=1000,4200 → a still at each of those moments (ms), no film: for checking a cut
  if (process.env.PREVIEW) {
    for (const t of process.env.PREVIEW.split(",").map(Number)) {
      await p.evaluate((v) => window.setTime(v), t);
      await p.screenshot({ path: join(TMP, `${film.name}-${t}.png`) });
    }
    await ctx.close();
    console.log(`stills in ${TMP} (film ${(total / 1000).toFixed(1)} s)`);
    return;
  }
  const frames = Math.ceil((total / 1000) * FPS);
  for (let i = 0; i < frames; i++) {
    await p.evaluate((t) => window.setTime(t), (i * 1000) / FPS);
    await p.screenshot({ path: join(dir, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 93 });
  }
  await ctx.close();
  const out = join(OUT, `${film.name}.mp4`);
  execFileSync(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", join(dir, "f%05d.jpg"), "-c:v", "libx264", "-preset", "slow", "-crf", "21",
    // the frames are JPEGs (full range): the film in the ordinary range, which every phone and WhatsApp play
    "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-color_range", "tv", "-movflags", "+faststart", out]);
  rmSync(dir, { recursive: true, force: true });
  console.log(`✓ ${out}  (${(total / 1000).toFixed(1)} s, ${frames} frames)`);
}

mkdirSync(OUT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  if (!ONLY || ONLY === "install") await render(browser, installFilm(await captureInstall(browser)));
  if (!ONLY || ONLY === "links") {
    if (!existsSync(".e2e/links/11-home.png")) throw new Error("no .e2e/links/ pictures: run scripts/links.mjs first");
    await render(browser, linksFilm());
  }
  if (!ONLY || ONLY === "cancel") {
    if (!existsSync(".e2e/history/taps.json")) throw new Error("no .e2e/history/ pictures: run scripts/history.mjs first");
    await render(browser, cancelFilm());
  }
} finally {
  await browser.close();
}
