"use strict";
/**
 * الحاجات اللي كل الصفحات تحتاجهم. صفحة وحدة = خدمة وحدة، أما الحساب
 * والتبديلات يلزمهم يكونو نفسهم في كل بلاصة.
 */

const KEY = "pointili-crm-v2";
const $ = (id) => document.getElementById(id);
const esc = (s) => String(s).replace(/[&<>"]/g, (c) => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;" })[c]);
const CH = { messenger: "FB", instagram: "IG", whatsapp: "WA" };
const CHAR = { messenger: "مسنجر", instagram: "إنستغرام", whatsapp: "واتساب" };
const HEAT = { hot: "سخون", warm: "دافي", cold: "بارد" };

let edits = {};
try { edits = JSON.parse(localStorage.getItem(KEY) || "{}"); } catch {}
const persist = () => { try { localStorage.setItem(KEY, JSON.stringify(edits)); } catch {} };

/** كل واحد + التبديلات اللي عملتهم انت فوقو */
const all = () => CRM.leads.map((l) => ({ ...l, ...(edits[l.id] || {}) }));
const one = (id) => all().find((l) => l.id === id);

/** بدّل حاجة وحدة وسجّلها، وبعد عاود ارسم الصفحة */
function set(id, key, val, redraw) {
  edits[id] = { ...(edits[id] || {}), [key]: val };
  persist();
  if (redraw) redraw();
}

const stageOf = (id) => CRM.stages.find((s) => s.id === id) || { label: "—", hint: "" };
const isAr = (s) => /[؀-ۿ]/.test(String(s));
const lat = (s) => (isAr(s) ? "" : "lat");

/** كم يوم عدّى من آخر حركة */
function daysSince(d) {
  const t = Date.parse(String(d).slice(0, 10));
  if (Number.isNaN(t)) return 0;
  return Math.max(0, Math.round((Date.now() - t) / 864e5));
}
const dayWord = (n) => (n === 0 ? "اليوم" : n === 1 ? "من البارح" : `من ${n} أيام`);

/* ── الصور ───────────────────────────────────────────────────── */
const TINTS = ["#6535E0", "#C2410C", "#15803D", "#0E7490", "#9D174D", "#8A6508"];
const avPos = (i) => {
  const c = CRM.sprite.cols;
  return `background-position: calc(var(--tile) * -${i % c}) calc(var(--tile) * -${Math.floor(i / c)})`;
};
/** اللي جاو بعد ما تصوّرت الصور: أول حرف بلون ثابت، خير من وجه غالط */
function avHTML(l) {
  if (l.av === null || l.av === undefined) {
    const ch = [...(l.name || "?")].find((c) => /[^\s]/.test(c)) || "?";
    const tint = TINTS[[...l.id].reduce((a, c) => a + c.charCodeAt(0), 0) % TINTS.length];
    return `<span class="av ini" style="--tint:${tint}" dir="auto">${esc(ch)}</span>`;
  }
  return `<span class="av" style="${avPos(l.av)}"></span>`;
}

/* ── الترتيب: الخلاصة متاع كل شنوة قريناه، فدالة وحدة ─────────── */
const RANK = { hot: 0, warm: 1, cold: 2 };
function weight(l) {
  return RANK[l.heat] * 1000
    - (l.due === "today" ? 400 : l.due === "tomorrow" ? 300 : 0)
    - (l.phone ? 120 : 0)
    - (l.business ? 60 : 0)
    - (l.spoke ? 50 : 0)
    + daysSince(l.last) * 12;
}
const byWeight = (a, b) => weight(a) - weight(b);

/* ── الأعداد اللي النافيقاسيون يورّيهم ───────────────────────── */
function counts() {
  const rows = all();
  return {
    today: rows.filter((l) => l.turn === "us" || l.due).length,
    board: rows.filter((l) => l.spoke).length,
    silent: rows.filter((l) => !l.spoke && !l.unread).length,
    all: rows.length,
  };
}

/** نفس النافيقاسيون في كل صفحة، والصفحة الحالية معلّمة */
function drawNav(here) {
  const c = counts();
  const items = [
    ["index.html", "اليوم", c.today],
    ["board.html", "اللوحة", c.board],
    ["silent.html", "ساكت", c.silent],
    ["stats.html", "الأرقام", null],
    ["replies.html", "الردود", null],
  ];
  document.querySelector(".nav .links").innerHTML = items
    .map(([href, label, n]) =>
      `<a href="${href}"${href === here ? ' aria-current="page"' : ""}>${label}${n ? `<i>${n}</i>` : ""}</a>`)
    .join("");
}
