/**
 * f14 — «مش كان القهاوي» (not only cafés): a tour of the neighbourhood's trades — barber, pastry
 * shop, perfume shop, beauty salon, greengrocer, fishmonger — each a full photo (ChatGPT,
 * assets/gpt/f14-*.jpg; a colour if missing) and its own card with the gift the app itself
 * suggests for that trade (t.ts gift examples). «Choose your gift, the rest is on us.»
 */
import { existsSync } from "node:fs";
import { join } from "node:path";

const GPT = join(import.meta.dirname, "..", "assets", "gpt");
const pic = (f) => (existsSync(join(GPT, f)) ? `../../assets/gpt/${f}` : null);
const TRADES = [
  { id: "m2", file: "f14-barber.jpg", tag: "✂️ الحجّام", name: "Barber 216", color: "#1f3a8a", logo: "✂️", gift: "حجامة بلاش", goal: 10, bg: "#dfe6fb" },
  { id: "m3", file: "f14-pastry.jpg", tag: "🧁 الحلواني", name: "Pâtisserie Nour", color: "#e8578a", logo: "🧁", gift: "قطعة قاتو بلاش", goal: 8, bg: "#fde3ec" },
  { id: "m4", file: "f14-perfume.jpg", tag: "🌸 محل العطورات", name: "Dar Rayhana", color: "#9c2b4f", logo: "🌸", gift: "عطر صغير بلاش", goal: 6, bg: "#f7e3ea" },
  { id: "m5", file: "f14-beauty.jpg", tag: "💅 صالون التجميل", name: "Salon Lina", color: "#b0439e", logo: "💅", gift: "مانيكير بلاش", goal: 8, bg: "#f6e3f3" },
  { id: "m6", file: "f14-veggies.jpg", tag: "🍊 الخضّار", name: "خضرة الحومة", color: "#2f9e44", logo: "🍊", gift: "كيلو غلّة بلاش", goal: 10, bg: "#e3f6e8" },
  { id: "m7", file: "f14-fish.jpg", tag: "🐟 الحوّات", name: "حوت المرسى", color: "#1c7ed6", logo: "🐟", gift: "تنظيف الحوت بلاش", goal: 8, bg: "#e1effc" },
];

export default {
  title: "مش كان القهاوي",
  voice: "ash",
  music: { style: "warm" },
  lead: 0.25,
  tail: 4,
  lines: [
    { id: "m1", say: "تحسب Pointili *كان للقهاوي*؟" },
    { id: "m2", say: "الحجّام: *الحجامة العاشرة* بلاش." },
    { id: "m3", say: "الحلواني: *قطعة قاتو* كادو." },
    { id: "m4", say: "محل العطورات: *عطر صغير* هدية." },
    { id: "m5", say: "صالون التجميل: *مانيكير* بلاش." },
    { id: "m6", say: "الخضّار: *كيلو غلّة* بلاش." },
    { id: "m7", say: "الحوّات: *تنظيف الحوت* بلاش." },
    { id: "m8", say: "كل محل عندو حرفاء.. *وكل حريف يحب يتحسب*." },
    { id: "m9", say: "اختار الكادو متاعك، *والباقي علينا*." },
    { id: "m10", say: "جرّب Pointili بلاش، واكتب نوع محلّك في الكومونتار.", sub: false },
  ],
  assets: () => Object.fromEntries([["cafe", pic("f4-w14.jpg")], ...TRADES.map((t) => [t.id, pic(t.file)])].filter(([, v]) => v)),
  css: `
#stage{background:#111}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0;overflow:hidden}
.sc .bg{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.sc .shade{position:absolute;inset:0;background:linear-gradient(180deg,rgb(0 0 0/.35),rgb(0 0 0/0) 30%,rgb(0 0 0/0) 50%,rgb(0 0 0/.55))}
.trd{position:absolute;left:50%;top:210px;transform:translateX(-50%);white-space:nowrap;background:#fff;color:#0f0e17;font-weight:700;font-size:58px;padding:16px 44px 24px;border-radius:999px;box-shadow:0 18px 36px -16px rgb(0 0 0/.5);visibility:hidden;opacity:0}
.q{position:absolute;left:50%;top:620px;width:330px;height:330px;margin-left:-165px;border-radius:50%;background:#ffd23f;display:grid;place-items:center;font-size:190px;box-shadow:0 30px 60px -20px rgb(0 0 0/.6);visibility:hidden;opacity:0}
.grid{position:absolute;inset:0;display:grid;grid-template-columns:1fr 1fr;grid-template-rows:repeat(3,1fr);gap:8px;background:#111;visibility:hidden;opacity:0}
.grid .cell{position:relative;overflow:hidden;visibility:hidden;opacity:0}
.grid .cell img,.grid .cell i{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}
.grid .cell b{position:absolute;right:16px;bottom:16px;background:#fff;border-radius:999px;padding:6px 18px 10px;font-size:30px;color:#0f0e17}
.gift{position:absolute;z-index:40;left:110px;right:110px;top:560px;background:#fff;border-radius:40px;padding:40px 44px;box-shadow:0 30px 60px -30px rgb(0 0 0/.6);direction:rtl;visibility:hidden;opacity:0}
.gift h3{font-size:42px;font-weight:700;color:#0f0e17}
.gift .fld{margin-top:26px;height:110px;border-radius:26px;background:#f4f3f9;box-shadow:inset 0 0 0 4px #6c47ff;display:flex;align-items:center;padding:0 30px;font-size:46px;font-weight:700;color:#0f0e17}
.gift p{margin-top:22px;font-size:30px;color:#77748a}
`,
  html: (A) => {
    const scene = (id, src, color) => `<div class="sc" id="S${id}">${src ? `<img class="bg" src="${src}">` : `<i class="bg" style="background:${color}"></i>`}<i class="shade"></i></div>`;
    return `
${scene("m1", A.cafe, "#3b2a20")}
${TRADES.map((t) => scene(t.id, A[t.id], t.bg)).join("")}
<div class="q" id="q">☕</div>
<div class="grid" id="grid">${TRADES.map((t) => `<div class="cell">${A[t.id] ? `<img src="${A[t.id]}">` : `<i style="background:${t.bg}"></i>`}<b>${t.tag}</b></div>`).join("")}</div>
<div class="gift" id="gift"><h3>شنوّة يربح الحريف كي يكمّل الكارط؟</h3><div class="fld" id="gf"></div><p>انت تختار، والباقي علينا</p></div>
${TRADES.map((t) => `<div class="trd" id="tag-${t.id}">${t.tag}</div>`).join("")}`;
  },
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("pill");
    const TR = [
      { id: "m2", name: "Barber 216", color: "#1f3a8a", logo: "✂️", gift: "حجامة بلاش", goal: 10 },
      { id: "m3", name: "Pâtisserie Nour", color: "#e8578a", logo: "🧁", gift: "قطعة قاتو بلاش", goal: 8 },
      { id: "m4", name: "Dar Rayhana", color: "#9c2b4f", logo: "🌸", gift: "عطر صغير بلاش", goal: 6 },
      { id: "m5", name: "Salon Lina", color: "#b0439e", logo: "💅", gift: "مانيكير بلاش", goal: 8 },
      { id: "m6", name: "خضرة الحومة", color: "#2f9e44", logo: "🍊", gift: "كيلو غلّة بلاش", goal: 10 },
      { id: "m7", name: "حوت المرسى", color: "#1c7ed6", logo: "🐟", gift: "تنظيف الحوت بلاش", goal: 8 },
    ];

    /* m1 — only for cafés? */
    K.scene($("Sm1"), 0, at("m2", -0.05), { inn: "cut" });
    K.drift(K.$("#Sm1 .bg"), 0, at("m2"), { from: 1.08, to: 1.0 });
    K.pop($("q"), 0.4, { from: 0.4 });
    K.sfx("pop", 0.45);
    tl.to($("q"), { rotation: 360, scale: 0.6, autoAlpha: 0, duration: 0.4, ease: "power2.in" }, end("m1", -0.2));
    K.sfx("whoosh", end("m1", -0.2));

    /* m2–m7 — each trade: its photo, its card, its gift */
    TR.forEach((t, i) => {
      const next = i < TR.length - 1 ? at(TR[i + 1].id, -0.05) : at("m8", -0.05);
      K.scene($("S" + t.id), at(t.id, -0.1), next, { inn: i % 2 ? "left" : "right", outt: "cut", dur: 0.35 });
      K.drift(K.$(`#S${t.id} .bg`), at(t.id, -0.1), next, { from: 1.0, to: 1.08 });
      K.sfx("swish", at(t.id, -0.1), -2);
      const tag = $("tag-" + t.id);
      K.pop(tag, at(t.id, 0.1), { from: 0.6 });
      tl.set(tag, { autoAlpha: 0 }, next);
      const c = K.pass({ name: t.name, color: t.color, goal: t.goal, stamps: t.goal - 2, gift: t.gift, icon: "gift", logo: t.logo, mark: t.logo, x: 130, y: 1000, w: 820, size: 32, z: 30 });
      tl.fromTo(c, { autoAlpha: 0, y: 200 }, { autoAlpha: 1, y: 0, duration: 0.4, ease: "back.out(1.4)" }, at(t.id, 0.25));
      c.stamp(t.goal - 1, at(t.id, 0.8), { sound: "stamp" });
      tl.set(c, { autoAlpha: 0 }, next);
    });

    /* m8 — every shop has customers: all of them at once */
    K.scene($("grid"), at("m8", -0.05), at("m9", -0.05), { inn: "zoom", dur: 0.35 });
    K.$$("#grid .cell").forEach((c, i) => K.pop(c, at("m8", 0.05 + i * 0.12), { from: 0.8, dur: 0.3 }));
    K.sfx("sparkle", at("m8", 0.3));

    /* m9 — choose your gift, the rest is on us */
    const bgGift = K.add(`<div class="sc" style="background:radial-gradient(90% 60% at 50% 20%,#8f74ff,#6c47ff 55%,#4a2ad6)"></div>`);
    K.scene(bgGift, at("m9", -0.1), null, { inn: "fade" });
    K.pop($("gift"), at("m9", 0.05), { from: 0.85 });
    const gifts = ["قهوة بلاش", "حجامة بلاش", "قطعة قاتو بلاش", "عطر صغير بلاش"];
    const g0 = at("m9", 0.3), each = Math.max(0.5, (end("m9") - g0) / gifts.length);
    K.each((t) => { const k = Math.max(0, Math.min(gifts.length - 1, Math.floor((t - g0) / each))); K.$("#gf").textContent = t < g0 ? "" : gifts[k]; });
    gifts.forEach((_, k) => K.sfx("tick", g0 + k * each, -4));

    K.endcard(at("m10", -0.1), { tag: "اكتب *نوع محلّك* في الكومونتار", offer: "جرّب Pointili بلاش", keyword: "حجّام", ph: "اكتب نوع محلّك…", typeAt: 1.2 });
  },
};
