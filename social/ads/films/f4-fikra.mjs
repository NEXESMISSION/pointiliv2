/**
 * f4 — «حركة بسيطة» (a simple move that brings the customer back): a business tip, one big
 * word at a time — a loyalty card, the free coffee as the reason to come back, a gift close
 * enough not to give up on — then «and in his phone, no paper: Pointili». Modelled on the
 * structure of an «idea for your business» reel; drawn scenes behind the words for now (a
 * photo per scene can replace them: assets/gpt/f4-<line>.jpg, when there is one).
 */
import { existsSync } from "node:fs";
import { join } from "node:path";
import { person, cup, front, ART_CSS, SKINS } from "../engine/art.mjs";

const guy = person({ shirt: "#ff6b4a", skin: SKINS[1], hair: "#3a2a20", legs: "#34457a", shoes: "#fff" });
const sad = person({ shirt: "#ff6b4a", skin: SKINS[1], hair: "#3a2a20", legs: "#34457a", shoes: "#fff", smile: false });
const crowd = [
  person({ shirt: "#12b76a", skin: SKINS[3], hair: "#5a3b26", legs: "#3d3a4c", shoes: "#fff" }),
  person({ shirt: "#ffd23f", skin: SKINS[0], hijab: "#6c47ff", legs: "#34457a", shoes: "#fff" }),
  person({ shirt: "#6c47ff", skin: SKINS[2], hair: "#1d1a24", legs: "#34457a", shoes: "#fff" }),
  person({ shirt: "#ff6b4a", skin: SKINS[1], hair: "#3a2a20", legs: "#3d3a4c", shoes: "#fff" }),
];
const paper = (n, filled, id = "", cls = "") => `<div class="pcard ${cls}" id="${id}"><b>قهوة الحومة</b><div class="rw" style="grid-template-columns:repeat(${n > 10 ? 10 : n / 2 > 4 ? 5 : 4},1fr)">${Array.from({ length: n }, (_, i) => `<i><b class="ink" style="${i < filled ? "visibility:visible;opacity:1" : ""}"></b></i>`).join("")}</div></div>`;
const gift = `<svg viewBox="0 0 120 120" class="art"><rect x="14" y="48" width="92" height="62" rx="10" fill="#ff6b4a"/><rect x="8" y="34" width="104" height="22" rx="8" fill="#ff8a6e"/><rect x="53" y="34" width="14" height="76" fill="#ffd23f"/><path d="M60 34c-10-22-34-22-30-6 2 8 18 8 30 6zM60 34c10-22 34-22 30-6-2 8-18 8-30 6z" fill="#ffd23f"/></svg>`;

const PHOTOS = join(import.meta.dirname, "..", "assets", "gpt");
const photo = (id) => (existsSync(join(PHOTOS, `f4-${id}.jpg`)) ? `../../assets/gpt/f4-${id}.jpg` : null);

export default {
  title: "حركة بسيطة",
  music: { style: "lofi" },
  lead: 0.25,
  tail: 4.4,
  lines: [
    { id: "w1", say: "تحب الحريف *يرجعلك* مرّة أخرى،" },
    { id: "w2", say: "من غير ما تعمل *ريميز* كل شوية؟", after: 0.25 },
    { id: "w3", say: "جرّب *كارط فيدليتي* بسيطة.", after: 0.25 },
    { id: "w4", say: "مثلا، عندك *قهوة*:", after: 0.1 },
    { id: "w5", say: "كل ما يشري قهوة، ياخو *تامبون*.", after: 0.15 },
    { id: "w6", say: "يكمّل *ثمانية*؟ ياخو قهوة *بلاش*،" },
    { id: "w7", say: "ولا *كادو* تختارو انت.", after: 0.3 },
    { id: "w8", say: "*الفكرة* موش في القهوة البلاش.", after: 0.1 },
    { id: "w9", say: "انت هكا تعطيه *سبب* باش يرجعلك،" },
    { id: "w10", say: "في عوض ما يمشي *لقهوة أخرى*.", after: 0.3 },
    { id: "w11", say: "*والأهم*: ما تبعّدش الكادو برشا،" },
    { id: "w12", say: "لدرجة الحريف *ييأس* منو.", after: 0.3 },
    { id: "w13", say: "اعملها *صحيحة*،" },
    { id: "w14", say: "وفي عوض حريف يشري *مرّة* ويمشي،" },
    { id: "w15", say: "تبني حرفاء *يرجعولك ديما*.", after: 0.35 },
    { id: "w16", say: "وكان تحبها في تليفون الحريف، بلا كرتون: *Pointili*.", after: 0.3 },
    { id: "w17", say: "عجبتك الفكرة؟ اكتب «فكرة» في الكومونتار.", sub: false },
  ],
  assets: () => Object.fromEntries(["w1", "w3", "w5", "w9", "w14"].map((k) => [k, photo(k)]).filter(([, v]) => v)),
  css: `
#stage{background:#fff4e6}
${ART_CSS}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0;overflow:hidden}
.bg{position:absolute;inset:0}
.pcard{position:absolute;width:640px;border-radius:26px;background:#efe0c2;box-shadow:0 26px 50px -26px rgb(80 50 10/.55);padding:30px 34px 34px;color:#6b5434}
.pcard b{display:block;font-size:40px}
.pcard .rw{display:grid;gap:16px;margin-top:24px;justify-items:center}
.pcard .rw i{position:relative;width:100%;max-width:82px;aspect-ratio:1;border-radius:50%;border:5px dashed #b99d6f}
.pcard .rw i .ink{position:absolute;inset:-5px;border-radius:50%;background:radial-gradient(circle,#7c3a2a 0 44%,#0000 45%),#c9a978;visibility:hidden;opacity:0}
.pcard.many .rw i{max-width:46px;border-width:4px}
.stampr{position:absolute;width:170px;height:210px;z-index:25}
.stampr .h{position:absolute;left:55px;top:0;width:60px;height:110px;border-radius:30px;background:#6b3f22}
.stampr .b{position:absolute;left:0;top:100px;width:170px;height:70px;border-radius:18px;background:#2b2838}
.stampr .f{position:absolute;left:10px;top:166px;width:150px;height:30px;border-radius:0 0 12px 12px;background:#7c3a2a}
.tagp{position:absolute;background:var(--coral);color:#fff;font-weight:700;font-size:110px;padding:30px 60px 44px;border-radius:40px;direction:ltr;box-shadow:0 26px 50px -24px rgb(255 107 74/.8)}
.tagp:after{content:"";position:absolute;left:-30px;right:-30px;top:50%;height:22px;margin-top:-11px;border-radius:11px;background:var(--ink);transform:rotate(-12deg) scaleX(var(--k,0));transform-origin:100% 50%}
.free{position:absolute;background:var(--mint);color:#fff;font-weight:700;font-size:56px;padding:14px 34px 22px;border-radius:999px;z-index:5}
.loop{position:absolute;left:190px;top:640px;width:700px;height:700px}
.big20{position:absolute;font-weight:700;font-size:210px;color:var(--coral);direction:ltr;-webkit-text-stroke:8px #fff;paint-order:stroke fill}
.okb{position:absolute;width:150px;height:150px;border-radius:50%;background:var(--mint);display:grid;place-items:center;box-shadow:0 20px 40px -16px rgb(18 183 106/.7);z-index:30}
.okb svg{width:90px;height:90px;color:#fff}
.xb{position:absolute;width:150px;height:150px;border-radius:50%;background:var(--coral);display:grid;place-items:center;z-index:30}
.xb svg{width:84px;height:84px;color:#fff}
.heart{position:absolute;width:70px;height:70px;color:var(--coral);z-index:30}
`,
  html: (A) => {
    const bg = (k, color) => (A[k] ? `<img class="bg cover" src="${A[k]}">` : `<div class="bg" style="background:${color}"></div>`);
    return `
<div class="sc" id="S1">${bg("w1", "radial-gradient(90% 70% at 50% 30%,#ffe2c4,#ffc896)")}
  ${front({ id: "f1", x: 330, top: 760, w: 420, name: "قهوة الحومة", awning: "#6c47ff" })}<div class="street" style="top:1280px"></div>
  <div class="art" id="g1" style="left:80px;top:900px;width:180px;height:387px">${guy}</div>
  <div class="tagp" id="rem" style="left:250px;top:780px;--k:0">-20%</div></div>
<div class="sc" id="S3">${bg("w3", "radial-gradient(90% 70% at 50% 30%,#fff3c4,#ffe08a)")}
  ${paper(8, 0, "pc1").replace('class="pcard ', 'style="left:220px;top:900px" class="pcard ')}
  <div class="art" id="cp" style="left:400px;top:640px;width:290px;height:247px">${cup()}</div>
  <div class="stampr" id="stp" style="left:700px;top:620px"><i class="h"></i><i class="b"></i><i class="f"></i></div>
  <div class="art" id="gf" style="left:440px;top:1260px;width:200px;height:200px">${gift}</div>
  <div class="free" id="fr" style="left:660px;top:660px">بلاش</div></div>
<div class="sc" id="S9">${bg("w9", "radial-gradient(90% 70% at 50% 30%,#e7f9ef,#bdebd2)")}
  <svg class="loop" viewBox="0 0 100 100"><path id="lp" d="M50 8a42 42 0 1 1-0.1 0" fill="none" stroke="#12b76a" stroke-width="3.2" stroke-linecap="round" stroke-dasharray="264" stroke-dashoffset="264"/><path d="M47 3l6 5-6 5" fill="none" stroke="#12b76a" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"/></svg>
  ${front({ id: "f9", x: 330, top: 760, w: 420, name: "قهوة الحومة", awning: "#6c47ff" })}
  ${front({ id: "f10", x: 1160, top: 760, w: 420, name: "قهوة أخرى", awning: "#8f8ba3", lit: false })}
  <div class="street" style="top:1280px"></div>
  <div class="art" id="g9" style="left:110px;top:900px;width:180px;height:387px">${guy}</div>
  <div class="xb" id="x10" style="left:470px;top:960px">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>'}</div></div>
<div class="sc" id="S11">${bg("w11", "radial-gradient(90% 70% at 50% 30%,#ffe7e1,#ffc3b4)")}
  ${paper(20, 2, "pc20", "many").replace('class="pcard ', 'style="left:220px;top:900px" class="pcard ')}
  <div class="big20" id="b20" style="left:400px;top:660px">20</div>
  <div class="art" id="sd" style="left:820px;top:980px;width:200px;height:430px">${sad}</div>
  ${paper(8, 6, "pc8").replace('class="pcard ', 'style="left:220px;top:860px" class="pcard ')}
  <div class="okb" id="ok8" style="left:780px;top:790px">${'<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="3.2" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>'}</div></div>
<div class="sc" id="S14">${bg("w14", "radial-gradient(90% 70% at 50% 30%,#efeaff,#d9ceff)")}
  ${front({ id: "f14", x: 330, top: 700, w: 420, name: "قهوة الحومة", awning: "#6c47ff" })}<div class="street" style="top:1220px"></div>
  <div class="art" id="one" style="left:470px;top:860px;width:170px;height:366px">${guy}</div>
  ${crowd.map((p, i) => `<div class="art cr" id="cr${i}" style="left:${1100 + i * 120}px;top:860px;width:170px;height:366px">${p}</div>`).join("")}
  ${[0, 1, 2].map((i) => `<svg class="heart" id="h${i}" style="left:${380 + i * 140}px;top:${640 - (i % 2) * 40}px" viewBox="0 0 24 24" fill="currentColor"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg>`).join("")}</div>
`;
  },
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    const S = "../../assets/screens/";
    K.subs("word");
    const bug = K.bug({ white: false });

    /* 1 — come back, without a discount every time */
    K.scene($("S1"), 0, at("w3", -0.05), { inn: "cut" });
    K.drift(K.$("#S1 .bg"), 0, at("w3"), { from: 1.0, to: 1.08 });
    gsap.set($("rem"), { autoAlpha: 0 });
    tl.to($("g1"), { x: 330, duration: end("w1") - 0.2, ease: "none" }, 0.2);
    tl.to($("g1"), { keyframes: Array.from({ length: 8 }, (_, k) => ({ y: k % 2 ? -12 : 0, duration: (end("w1") - 0.2) / 8 })), ease: "none" }, 0.2);
    K.pop($("rem"), at("w2", 0.6), { from: 0.5 });
    K.sfx("pop", at("w2", 0.65));
    tl.to($("rem"), { "--k": 1, duration: 0.25 }, at("w2", 1.3));
    K.sfx("scratch", at("w2", 1.32));

    /* 3 — a simple card: a coffee, a tampon; eight, a free one — or a gift you choose */
    K.scene($("S3"), at("w3", -0.05), at("w8", -0.05), { inn: "fade" });
    K.drift(K.$("#S3 .bg"), at("w3"), at("w8"), { from: 1.0, to: 1.06 });
    K.pop($("pc1"), at("w3", 0.3), { from: 0.6 });
    K.sfx("swish", at("w3", 0.3));
    gsap.set([$("cp"), $("stp"), $("gf"), $("fr")], { autoAlpha: 0 });
    K.pop($("cp"), at("w4", 0.2), { from: 0.4 });
    K.sfx("pop", at("w4", 0.25));
    const dots = K.$$("#pc1 .rw i");
    // the rubber stamp comes down on the card, a dot at a time
    // where a dot is on the stage, from the layout (the entrances scale things for a while)
    const pos = (el) => { let x = 0, y = 0; for (let e = el; e && e.id !== "stage"; e = e.offsetParent) { x += e.offsetLeft; y += e.offsetTop; } return { x: x + el.offsetWidth / 2, y: y + el.offsetHeight / 2 }; };
    const stampAt = (i, t) => {
      const d = pos(dots[i]);
      const x = d.x - (700 + 85), y = d.y - (620 + 196);
      tl.set($("stp"), { autoAlpha: 1 }, t - 0.25);
      tl.to($("stp"), { x, y: y - 30, duration: 0.2, ease: "power2.inOut" }, t - 0.25);
      tl.to($("stp"), { y: y + 4, duration: 0.07, yoyo: true, repeat: 1, ease: "power2.in" }, t - 0.05);
      tl.set(K.$(".ink", dots[i]), { autoAlpha: 1 }, t + 0.02);
      K.sfx("thud", t + 0.02);
    };
    tl.to($("cp"), { x: -260, scale: 0.7, duration: 0.35 }, at("w5", 0));
    stampAt(0, at("w5", 0.5)); stampAt(1, at("w5", 0.95)); stampAt(2, at("w5", 1.4));
    [3, 4, 5, 6, 7].forEach((i, k) => stampAt(i, at("w6", 0.15 + k * 0.22)));
    tl.to($("stp"), { autoAlpha: 0, y: "-=200", duration: 0.25 }, at("w6", 1.4));
    K.pop($("fr"), at("w6", 1.45), { from: 0.4 });
    tl.to($("cp"), { x: 0, scale: 1.0, duration: 0.35 }, at("w6", 1.4));
    K.sfx("win", at("w6", 1.5), -3);
    K.pop($("gf"), at("w7", 0.1), { from: 0.3 });
    K.burst(540, 1250, at("w7", 0.3), { n: 16, r: 240 });

    /* 8 — the idea is not the free coffee: it is a reason to come back */
    K.scene($("S9"), at("w8", -0.05), at("w11", -0.05), { inn: "fade" });
    K.drift(K.$("#S9 .bg"), at("w8"), at("w11"), { from: 1.0, to: 1.06 });
    gsap.set($("x10"), { autoAlpha: 0 });
    tl.to(K.$("#lp"), { strokeDashoffset: 0, duration: 1.2, ease: "power2.inOut" }, at("w9", 0.1));
    K.sfx("whoosh", at("w9", 0.1));
    tl.to($("g9"), { x: 300, duration: 1.0, ease: "none" }, at("w9", 0.3));
    tl.to([$("f9"), $("g9"), K.$("#S9 .loop")], { x: "-=380", duration: 0.6, ease: "power3.inOut" }, at("w10", 0));
    tl.to($("f10"), { x: -620, duration: 0.6, ease: "power3.inOut" }, at("w10", 0));
    tl.set($("x10"), { left: 860 }, at("w10", 0));
    K.pop($("x10"), at("w10", 0.7), { from: 0.4 });
    K.sfx("buzz", at("w10", 0.75), -4);

    /* 11 — the gift not so far he gives up on it */
    K.scene($("S11"), at("w11", -0.05), at("w14", -0.05), { inn: "fade" });
    gsap.set([$("pc8"), $("ok8"), $("b20"), $("sd")], { autoAlpha: 0 });
    K.pop($("pc20"), at("w11", 0.6), { from: 0.6 });
    K.pop($("b20"), at("w11", 1.0), { from: 0.4 });
    K.sfx("thud", at("w11", 1.05));
    K.pop($("sd"), at("w12", 0.1), { from: 0.7, y: 40 });
    tl.to($("sd"), { rotation: -6, transformOrigin: "50% 100%", duration: 0.4, yoyo: true, repeat: 1 }, at("w12", 0.5));
    K.sfx("boing", at("w12", 0.4), -6);
    tl.to([$("pc20"), $("b20"), $("sd")], { autoAlpha: 0, duration: 0.25 }, at("w13", -0.15));
    K.pop($("pc8"), at("w13", 0), { from: 0.7 });
    K.pop($("ok8"), at("w13", 0.35), { from: 0.4 });
    K.sfx("ding", at("w13", 0.4));

    /* 14 — not one visit and gone: customers who come back */
    K.scene($("S14"), at("w14", -0.05), at("w16", -0.05), { inn: "fade" });
    gsap.set(K.$$("#S14 .heart"), { autoAlpha: 0 });
    tl.to($("one"), { x: -560, duration: 1.3, ease: "none" }, at("w14", 0.4));
    tl.to($("one"), { autoAlpha: 0, duration: 0.2 }, at("w14", 1.5));
    K.sfx("swish", at("w14", 0.4));
    K.$$("#S14 .cr").forEach((c, i) => {
      const t0 = at("w15", -0.1 + i * 0.25);
      tl.to(c, { x: -(510 + i * 120), duration: 0.9, ease: "power1.out" }, t0);
      tl.to(c, { autoAlpha: 0, scale: 0.85, duration: 0.25 }, t0 + 0.85);
      K.sfx("tick", t0 + 0.3, -8);
    });
    K.$$("#S14 .heart").forEach((h, i) => { K.pop(h, at("w15", 1.0 + i * 0.15), { from: 0.3 }); tl.to(h, { y: -80, autoAlpha: 0, duration: 0.8 }, at("w15", 1.4 + i * 0.15)); });
    K.sfx("sparkle", at("w15", 1.0));

    /* 16 — in his phone, without paper: Pointili */
    const calm = K.add(`<div class="sc" style="background:radial-gradient(90% 60% at 50% 0%,#8f74ff,#6c47ff 55%,#4a2ad6)"></div>`);
    K.scene(calm, at("w16", -0.05), null, { inn: "fade" });
    const ph = K.phone({ src: S + "v2-cafe-card-7.png", x: 300, y: 620, w: 480, z: 12 });
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 220, rotation: 6 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.55, ease: "back.out(1.3)" }, at("w16", 0.1));
    K.sfx("whoosh", at("w16", 0.1));
    tl.to(K.$("span:last-child", bug), { color: "#fff", duration: 0.2 }, at("w16", 0));

    /* the end: comment «فكرة» */
    K.endcard(at("w17", -0.1), { tag: "عجبتك الفكرة؟ اكتب *«فكرة»* في الكومونتار", offer: "جرّب Pointili بلاش", keyword: "فكرة", typeAt: 1.2 });
  },
};
