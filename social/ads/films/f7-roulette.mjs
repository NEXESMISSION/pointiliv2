/**
 * f7 — «الروليت» (the wheel): finish the card, get a spin; spin it on the phone, the gift comes
 * by luck; the owner chooses the gifts and each one's chance (and how many he has); the
 * customer shows the code at the counter. The app's own words (wheel*), a stadium-night look.
 */
import { qrSvg } from "../engine/qr.mjs";

const SEG = [
  ["مشروب بلاش", "#12b76a"],
  ["ريميز 10%", "#ff6b4a"],
  ["ديسار بلاش", "#f5b301"],
  ["فريت بلاش", "#3fa9f5"],
  ["سندويتش بلاش", "#6c47ff"],
  ["🎁 الكادو الكبير", "#ff3e8a"],
];
const wheel = (id, size) => {
  const r = 290, c = 300;
  const seg = SEG.map(([label, color], i) => {
    const a0 = ((i * 60 - 120) * Math.PI) / 180, a1 = ((i * 60 - 60) * Math.PI) / 180;
    const p = `M${c} ${c} L${c + r * Math.cos(a0)} ${c + r * Math.sin(a0)} A${r} ${r} 0 0 1 ${c + r * Math.cos(a1)} ${c + r * Math.sin(a1)} Z`;
    const mid = i * 60 - 90;
    return `<path d="${p}" fill="${color}" stroke="#fff" stroke-width="6"/>
      <g transform="rotate(${mid} ${c} ${c})"><text x="${c + 175}" y="${c + 12}" text-anchor="middle" font-size="${label.length > 12 ? 30 : 36}" font-weight="700" fill="#fff" font-family="Readex Pro" direction="rtl">${label}</text></g>`;
  }).join("");
  return `<svg id="${id}" class="wheel" viewBox="0 0 600 600" style="width:${size}px;height:${size}px">${seg}
    <circle cx="300" cy="300" r="292" fill="none" stroke="#fff" stroke-width="10"/>
    ${Array.from({ length: 18 }, (_, k) => { const a = (k * 20 * Math.PI) / 180; return `<circle cx="${300 + 286 * Math.cos(a)}" cy="${300 + 286 * Math.sin(a)}" r="7" fill="#ffd23f"/>`; }).join("")}
    <circle cx="300" cy="300" r="62" fill="#fff"/><circle cx="300" cy="300" r="48" fill="#6c47ff"/></svg>`;
};

export default {
  title: "الروليت",
  voice: "ash",
  music: { style: "comic" },
  lead: 0.25,
  tail: 4.2,
  lines: [
    { id: "d1", say: "تحب الحريف يستنّى الكادو *كيما يستنّى الماتش*؟" },
    { id: "d2", say: "خدّم *الروليت*." },
    { id: "d3", say: "يكمّل الكارط.. ياخو *دورة*." },
    { id: "d4", say: "يدوّرها في تليفونو، والكادو يطلع *بالحظ*:" },
    { id: "d5", say: "مشروب بلاش، ريميز.. ولا *الكادو الكبير*!" },
    { id: "d6", say: "انت تختار الكادوات، وقدّاش *حظ كل وحدة*." },
    { id: "d7", say: "يجي للمحل، يورّيك *الكود*، وتعطيه اللي ربحو." },
    { id: "d8", say: "ويرجع باش يدوّر *مرّة أخرى*." },
    { id: "d9", say: "جرّب Pointili بلاش، واكتب «روليت» في الكومونتار.", sub: false },
  ],
  assets: () => ({ qr: qrSvg("https://www.pointili.online/?g=wheel") }),
  css: `
#stage{background:radial-gradient(120% 70% at 50% 0%,#2b1a6b,#120a33 70%)}
.beam{position:absolute;top:-200px;width:260px;height:1500px;background:linear-gradient(180deg,rgb(255 240 200/.35),transparent 80%);transform-origin:50% 0;filter:blur(6px)}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0}
.wheel{position:absolute;display:block;filter:drop-shadow(0 30px 60px rgb(0 0 0/.5))}
.wrap{position:absolute;left:190px;top:330px;width:700px;height:700px}
.wrap .wheel{left:0;top:0}
.ptr{position:absolute;left:50%;top:-34px;width:0;height:0;margin-left:-38px;border-left:38px solid transparent;border-right:38px solid transparent;border-top:76px solid #fff;filter:drop-shadow(0 6px 10px rgb(0 0 0/.4));z-index:3}
.sw{position:absolute;left:50%;top:1150px;transform:translateX(-50%);display:flex;align-items:center;gap:26px;white-space:nowrap;background:#fff;border-radius:999px;padding:22px 30px 22px 40px;font-weight:700;font-size:44px;color:var(--ink);box-shadow:0 20px 40px -18px rgb(0 0 0/.5);visibility:hidden;opacity:0}
.sw .t{position:relative;width:120px;height:66px;border-radius:33px;background:#d6d2e4}
.sw .t i{position:absolute;top:7px;left:7px;width:52px;height:52px;border-radius:50%;background:#fff;box-shadow:0 2px 6px rgb(0 0 0/.25)}
.won{position:absolute;left:50%;top:1110px;transform:translateX(-50%);white-space:nowrap;background:#ffd23f;color:var(--ink);font-weight:700;font-size:64px;padding:18px 48px 26px;border-radius:999px;box-shadow:0 20px 40px -14px rgb(255 210 63/.7);visibility:hidden;opacity:0;z-index:30}
.panel{position:absolute;left:110px;right:110px;top:330px;background:#fff;border-radius:44px;padding:40px 44px;box-shadow:0 30px 60px -30px rgb(0 0 0/.6);visibility:hidden;opacity:0}
.panel h3{font-size:46px;font-weight:700;color:var(--ink)}
.panel p{font-size:28px;color:#77748a;margin-top:6px}
.row{display:flex;align-items:center;gap:20px;margin-top:30px}
.row .sw2{width:30px;height:30px;border-radius:9px;flex:none}
.row b{flex:1;font-size:36px;color:var(--ink)}
.row .bar{width:240px;height:22px;border-radius:11px;background:#efedf6;overflow:hidden;flex:none}
.row .bar i{display:block;height:100%;border-radius:11px;transform-origin:100% 50%}
.row .pc{width:110px;text-align:left;direction:ltr;font-weight:700;font-size:36px;color:var(--ink);flex:none}
.row small{display:block;font-size:24px;color:#ff6b4a;font-weight:600}
.total{margin-top:30px;border-top:3px solid #efedf6;padding-top:20px;display:flex;justify-content:space-between;font-size:34px;font-weight:700;color:var(--mint)}
.gift{position:absolute;left:190px;top:330px;width:700px;background:#fff;border-radius:44px;padding:44px;text-align:center;box-shadow:0 30px 60px -30px rgb(0 0 0/.6);visibility:hidden;opacity:0}
.gift h3{font-size:46px;font-weight:700;color:var(--ink)}
.gift .q{width:420px;height:420px;margin:28px auto 10px;padding:22px;border-radius:30px;border:6px solid #ff3e8a;position:relative}
.gift .q svg{width:100%;height:100%}
.gift .scan{position:absolute;left:22px;right:22px;top:22px;height:8px;border-radius:4px;background:#12b76a;box-shadow:0 0 22px 6px rgb(18 183 106/.5)}
.gift p{font-size:30px;color:#77748a}
.gift .ok{position:absolute;right:-30px;top:-30px;width:130px;height:130px;border-radius:50%;background:#12b76a;display:grid;place-items:center;visibility:hidden;opacity:0}
.gift .ok svg{width:80px;height:80px;color:#fff}
`,
  html: (A) => `
<i class="beam" style="left:80px;transform:rotate(18deg)"></i><i class="beam" style="left:740px;transform:rotate(-18deg)"></i>
<div class="wrap" id="wrap"><i class="ptr"></i>${wheel("W", 700)}</div>
<template id="w2tpl">${wheel("W2", 420)}</template>
<div class="sw" id="sw"><span>خدّم الروليت للحرفاء</span><span class="t" id="tg"><i id="knob"></i></span></div>
<div class="won" id="won">ربحت الكادو الكبير! 🎉</div>
<div class="panel" id="panel"><h3>الروليت</h3><p>شنوّة يربحو الحرفاء، وقدّاش حظ كل وحدة</p>
  ${[["مشروب بلاش", "#12b76a", 40, ""], ["ريميز 10%", "#ff6b4a", 25, ""], ["ديسار بلاش", "#f5b301", 20, ""], ["سندويتش بلاش", "#6c47ff", 10, ""], ["🎁 الكادو الكبير", "#ff3e8a", 5, "باقي 3"]].map(([l, c, p, s]) => `<div class="row"><i class="sw2" style="background:${c}"></i><b>${l}${s ? `<small>${s}</small>` : ""}</b><span class="bar"><i style="background:${c};width:${p * 2.5}%"></i></span><span class="pc">${p}%</span></div>`).join("")}
  <div class="total"><span>المجموع</span><span dir="ltr">100%</span></div></div>
<div class="gift" id="gift"><h3>الكادو متاعك: الكادو الكبير</h3><div class="q">${A.qr}<i class="scan" id="scan"></i></div><p>ورّي الكود هذا في الكاسة: يسكانيوه ويعطيوك الكادو</p>
  <span class="ok" id="ok"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg></span></div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    const S = "../../assets/screens/";
    K.subs("pill");
    K.progress("#ffd23f");
    // the beams sway all film long
    K.$$(".beam").forEach((b, i) => tl.fromTo(b, { rotation: i ? -18 : 18 }, { rotation: i ? -6 : 6, duration: 2.2, yoyo: true, repeat: 30, ease: "sine.inOut" }, 0));

    /* d1 — the wheel, idling under the lights */
    K.pop($("wrap"), 0, { from: 0.85, dur: 0.6 });
    tl.fromTo($("W"), { rotation: 0, transformOrigin: "50% 50%" }, { rotation: 140, duration: end("d1"), ease: "none" }, 0);
    K.sfx("whoosh", 0.1);

    /* d2 — switch it on */
    K.pop($("sw"), at("d2", -0.1), { from: 0.6 });
    tl.to($("knob"), { x: 54, duration: 0.25, ease: "power2.out" }, at("d2", 0.4));
    tl.to($("tg"), { backgroundColor: "#12b76a", duration: 0.25 }, at("d2", 0.4));
    K.sfx("tick", at("d2", 0.45));
    K.sfx("ding", at("d2", 0.55), -2);
    K.out($("sw"), at("d3", -0.2));
    tl.to($("wrap"), { autoAlpha: 0, scale: 0.8, duration: 0.3 }, at("d3", -0.2));

    /* d3 — the card fills: a spin */
    const card = K.pass({ name: "Snack El Bahja", color: "#e5484d", goal: 8, stamps: 6, gift: "دورة في الروليت", icon: "star", x: 110, y: 600, w: 860, size: 38, z: 22 });
    K.pop(card, at("d3", -0.1), { from: 0.7 });
    card.stamp(7, at("d3", 0.4)); card.stamp(8, at("d3", 0.9));
    K.burst(540, 780, at("d3", 1.2), { n: 16, r: 260 });
    K.out(card, at("d4", -0.2));

    /* d4 — spun on his phone */
    const ph = K.phone({ x: 270, y: 260, w: 540, z: 12 });
    const scr = ph.put(`<div style="position:absolute;inset:0;background:linear-gradient(180deg,#2b1a6b,#120a33);display:flex;flex-direction:column;align-items:center;padding-top:150px">
      <b style="color:#fff;font-size:34px">كمّلت الكارط!</b><span style="color:#cfc6ff;font-size:22px;margin-top:8px">ربحت دورة في الروليت: دوّرها وشوف شنوّة تربح</span>
      <div style="position:relative;margin-top:36px;width:420px;height:420px;direction:ltr"><i class="ptr" style="top:-22px;margin-left:-24px;border-left-width:24px;border-right-width:24px;border-top-width:48px"></i>${K.$("#w2tpl").innerHTML}</div>
      <span id="spinb" style="margin-top:40px;background:#ffd23f;color:#0f0e17;font-weight:700;font-size:36px;padding:14px 60px 20px;border-radius:999px">دوّر</span></div>`);
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 200 }, { autoAlpha: 1, y: 0, duration: 0.5 }, at("d4", -0.1));
    K.sfx("swish", at("d4", -0.1));
    K.tap(540, 260 + 15 + 1170 * 0.8, at("d4", 1.1));
    // the spin: six turns and a sixth of one, to the big gift; a tick at every edge it passes
    const spinAt = at("d4", 1.3), DUR = Math.max(3.2, end("d5") - spinAt - 0.3), R = 360 * 6 + 60;
    tl.fromTo(K.$("#W2"), { rotation: 0, transformOrigin: "50% 50%" }, { rotation: R, duration: DUR, ease: "power4.out" }, spinAt);
    const ease = gsap.parseEase("power4.out");
    for (let edge = 30; edge < R; edge += 60) {
      let lo = 0, hi = 1;
      for (let k = 0; k < 30; k++) { const mid = (lo + hi) / 2; if (ease(mid) * R < edge) lo = mid; else hi = mid; }
      K.sfx("tick", spinAt + lo * DUR, -4);
    }
    // the phone grows to fill the frame as it spins
    tl.to(ph, { scale: 1.25, y: 120, duration: 0.8, ease: "power2.inOut" }, spinAt + 0.2);

    /* d5 — the big gift */
    K.pop($("won"), spinAt + DUR - 0.1, { from: 0.4 });
    K.sfx("win", spinAt + DUR - 0.05);
    K.burst(540, 760, spinAt + DUR, { n: 26, r: 360, colors: ["#ffd23f", "#ff3e8a", "#12b76a", "#fff"] });
    tl.to([ph, $("won")], { autoAlpha: 0, duration: 0.3 }, at("d6", -0.2));

    /* d6 — the owner chooses the gifts and their chances */
    K.pop($("panel"), at("d6", -0.1), { from: 0.85 });
    K.$$("#panel .bar i").forEach((b, i) => tl.fromTo(b, { scaleX: 0 }, { scaleX: 1, duration: 0.5, ease: "power3.out" }, at("d6", 0.3 + i * 0.15)));
    K.sfx("swish", at("d6", 0.3));
    tl.fromTo(K.$("#panel .total"), { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3 }, at("d6", 1.2));
    K.sfx("ding", at("d6", 1.25), -3);
    K.out($("panel"), at("d7", -0.2));

    /* d7 — the code at the counter */
    K.pop($("gift"), at("d7", -0.1), { from: 0.85 });
    tl.fromTo($("scan"), { y: 0 }, { y: 400, duration: 0.6, yoyo: true, repeat: 1, ease: "sine.inOut" }, at("d7", 0.6));
    K.sfx("scan", at("d7", 1.8));
    K.pop($("ok"), at("d7", 1.85), { from: 0.4 });
    K.sfx("ding", at("d7", 1.9));
    K.out($("gift"), at("d8", -0.2));

    /* d8 — and he comes back to spin again */
    const again = K.pass({ name: "Snack El Bahja", color: "#e5484d", goal: 8, stamps: 0, gift: "دورة في الروليت", icon: "star", x: 110, y: 600, w: 860, size: 38, z: 22 });
    K.pop(again, at("d8", -0.1), { from: 0.7 });
    again.stamp(1, at("d8", 0.5));
    tl.fromTo($("wrap"), { autoAlpha: 0, scale: 0.5, y: -320 }, { autoAlpha: 0.5, scale: 0.55, y: -330, duration: 0.4 }, at("d8", 0.3));
    tl.to($("W"), { rotation: "+=720", duration: Math.max(1, end("d8") - at("d8")), ease: "power2.inOut" }, at("d8", 0.3));

    K.endcard(at("d9", -0.1), { tag: "اكتب *«روليت»* في الكومونتار", offer: "جرّب Pointili بلاش", keyword: "روليت", typeAt: 1.2 });
  },
};
