/**
 * f11 — «ثلاثة حرفاء» (three kinds of customers): trading cards flip over — the regular, the one
 * drifting away, the lost one. You can't tell who is who; Pointili sorts them by itself (the app's
 * «شكون رجع؟»: نشطين / يبعدو / ضاعو), a gift tampon on WhatsApp brings the drifting ones back,
 * and you know your best customers by name («أوفى الحرفاء»). Female voice.
 */
import { person, SKINS } from "../engine/art.mjs";

const P1 = person({ shirt: "#12b76a", skin: SKINS[1], hair: "#3a2a20", legs: "#34457a", shoes: "#fff" });
const P2 = person({ shirt: "#ff6b4a", skin: SKINS[3], hijab: "#6c47ff", legs: "#3d3a4c", shoes: "#fff", smile: false });
const P3 = person({ shirt: "#8f8ba3", skin: SKINS[0], hair: "#1d1a24", legs: "#3d3a4c", shoes: "#fff", smile: false });
const card = (id, x, color, title, sub, art, badge) => `<div class="tc" id="${id}" style="left:${x}px">
  <div class="face back"><span class="bm"></span></div>
  <div class="face front" style="--c:${color}"><b>${title}</b><div class="pic">${art}</div><small>${sub}</small>${badge ? `<i class="bd">${badge}</i>` : ""}</div></div>`;

export default {
  title: "ثلاثة حرفاء",
  voice: "coral",
  music: { style: "lofi" },
  lead: 0.25,
  tail: 4,
  lines: [
    { id: "i1", say: "في كل محل، فما *ثلاثة أنواع* حرفاء." },
    { id: "i2", say: "الأوّل: *ديما يجي*. هذا كنزك." },
    { id: "i3", say: "الثاني: *بدا يبعد*.. جمعة، جمعتين." },
    { id: "i4", say: "الثالث: *ضاع*. ما عادش جا." },
    { id: "i5", say: "المشكل؟ *ما تعرفش* شكون شكون." },
    { id: "i6", say: "Pointili يقسّمهملك *وحدو*: نشطين، يبعدو، ضاعو." },
    { id: "i7", say: "اللي يبعدو؟ *كلمة منك* ترجّعهم:" },
    { id: "i8", say: "*تامبون هدية* في الواتساب." },
    { id: "i9", say: "وأوفى الحرفاء؟ *تعرفهم بالاسم*." },
    { id: "i10", say: "جرّب Pointili بلاش، واكتب «حرفاء» في الكومونتار.", sub: false },
  ],
  css: `
#stage{background:radial-gradient(90% 60% at 50% 30%,#14606b,#0b343b 75%)}
.felt{position:absolute;inset:0;background-image:radial-gradient(rgb(255 255 255/.05) 2px,transparent 2px);background-size:26px 26px}
.tc{position:absolute;top:470px;width:300px;height:450px;transform-style:preserve-3d;visibility:hidden;opacity:0}
.face{position:absolute;inset:0;border-radius:30px;backface-visibility:hidden;-webkit-backface-visibility:hidden;box-shadow:0 26px 50px -24px rgb(0 0 0/.6)}
.back{background:repeating-linear-gradient(45deg,#6c47ff 0 18px,#5a37e8 18px 36px);border:10px solid #fff;transform:rotateY(180deg);display:grid;place-items:center}
.back .bm{width:120px;height:120px;border-radius:30px;background:#fff}
.front{background:#fff;border:10px solid var(--c);text-align:center;padding-top:20px}
.front b{display:block;font-size:40px;font-weight:700;color:var(--c)}
.front .pic{position:relative;height:290px;margin-top:6px}
.front .pic .art{position:absolute;left:50%;top:0;width:135px;height:290px;margin-left:-67px}
.front small{display:block;font-size:24px;color:#6b6880;font-weight:600;margin-top:6px}
.front .bd{position:absolute;top:-34px;left:50%;margin-left:-40px;width:80px;height:80px;border-radius:50%;background:#fff;display:grid;place-items:center;font-style:normal;font-size:48px;box-shadow:0 8px 16px rgb(0 0 0/.25)}
.qmk{position:absolute;left:0;right:0;top:560px;text-align:center;font-size:300px;font-weight:700;color:#ffd23f;visibility:hidden;opacity:0;z-index:30;text-shadow:0 10px 30px rgb(0 0 0/.4)}
.ins{position:absolute;inset:0;background:#f4f3f9;padding:118px 30px 0;direction:rtl}
.ins h3{font-size:40px;font-weight:700}
.ins p{font-size:22px;color:#77748a;margin-top:6px}
.ins .seg{display:flex;gap:12px;margin-top:24px}
.ins .seg span{flex:1;background:#fff;border-radius:22px;padding:14px 0 18px;text-align:center;font-size:23px;color:#77748a;font-weight:600}
.ins .seg span b{display:block;font-size:44px}
.ins .row{display:flex;align-items:center;gap:16px;background:#fff;border-radius:24px;padding:18px 20px;margin-top:14px}
.ins .row i{width:62px;height:62px;border-radius:50%;background:#ffede8;color:#ff6b4a;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:30px;flex:none}
.ins .row div{flex:1}
.ins .row b{display:block;font-size:27px}
.ins .row small{display:block;font-size:21px;color:#ff6b4a;font-weight:600;margin-top:2px}
.ins h4{margin-top:26px;font-size:26px;font-weight:700}
.champ{position:absolute;left:110px;right:110px;top:380px;background:#fff;border-radius:44px;padding:40px 40px 30px;box-shadow:0 30px 60px -30px rgb(0 0 0/.6);visibility:hidden;opacity:0}
.champ h3{font-size:46px;font-weight:700;display:flex;align-items:center;gap:14px}
.champ .r{display:flex;align-items:center;gap:18px;padding:20px 0;border-bottom:3px solid #f0eef6}
.champ .r:last-child{border:0}
.champ .r .n{width:60px;height:60px;border-radius:50%;display:grid;place-items:center;font-weight:700;font-size:30px;color:#fff;flex:none}
.champ .r b{flex:1;font-size:38px}
.champ .r span{font-size:30px;color:#6b6880;font-weight:600}
`,
  html: () => `
<i class="felt"></i>
${card("t1", 690, "#12b76a", "ديما يجي", "جا 18 مرّة", `<div class="art">${P1}</div>`, "👑")}
${card("t2", 390, "#ff6b4a", "بدا يبعد", "ما جاتش من 15 يوم", `<div class="art">${P2}</div>`, "")}
${card("t3", 90, "#8f8ba3", "ضاع", "ما جاش من 60 يوم", `<div class="art" style="opacity:.45">${P3}</div>`, "")}
<div class="qmk" id="qmk">؟</div>
<div class="champ" id="champ"><h3>👑 أوفى الحرفاء</h3>
  ${[["#12b76a", "أ", "أمين", "جا 18 مرّة"], ["#6c47ff", "س", "سارة", "جات 15 مرّة"], ["#f5b301", "ك", "كريم", "جا 12 مرّة"]].map(([c, a, n, s]) => `<div class="r"><span class="n" style="background:${c}">${a}</span><b>${n}</b><span>${s}</span></div>`).join("")}</div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("pill");
    const cards = [$("t1"), $("t2"), $("t3")];
    cards.forEach((c) => gsap.set(c, { transformPerspective: 1400, rotationY: 180 }));

    /* i1 — three cards, face down */
    // never faded: a 3D card at less than full opacity is flattened, and shows both faces at once
    cards.forEach((c, i) => { const t = 0.1 + i * 0.15; tl.set(c, { autoAlpha: 1 }, t); tl.fromTo(c, { y: 1300, rotation: (i - 1) * 8 }, { y: 0, rotation: (i - 1) * 3, duration: 0.5, ease: "back.out(1.2)", immediateRender: false }, t); K.sfx("swish", t, -4); });
    const flip = (c, t) => { tl.to(c, { rotationY: 0, duration: 0.55, ease: "power2.inOut" }, t); tl.to(c, { y: -40, scale: 1.08, duration: 0.3, yoyo: true, repeat: 1, ease: "power1.inOut" }, t); K.sfx("swoosh", t, -4); K.sfx("pop", t + 0.45, -3); };

    /* i2–i4 — the regular, the drifting one, the lost one */
    flip(cards[0], at("i2", 0));
    K.burst(840, 500, at("i2", 0.6), { n: 12, r: 160, colors: ["#ffd23f", "#12b76a", "#fff"] });
    flip(cards[1], at("i3", 0));
    flip(cards[2], at("i4", 0));

    /* i5 — but you can't tell who is who */
    cards.forEach((c, i) => tl.to(c, { rotationY: 180, duration: 0.4, ease: "power2.in" }, at("i5", 0.05 + i * 0.06)));
    tl.to(cards[0], { x: -600, duration: 0.35, ease: "power2.inOut", yoyo: true, repeat: 1 }, at("i5", 0.5));
    tl.to(cards[2], { x: 600, duration: 0.35, ease: "power2.inOut", yoyo: true, repeat: 1 }, at("i5", 0.5));
    K.sfx("whoosh", at("i5", 0.5));
    K.pop($("qmk"), at("i5", 0.8), { from: 0.4 });
    K.sfx("boing", at("i5", 0.85), -4);
    tl.to(cards, { y: 1400, duration: 0.4, ease: "power2.in", stagger: 0.05 }, at("i6", -0.3));
    tl.set(cards, { autoAlpha: 0 }, at("i6", 0.25));
    tl.to($("qmk"), { autoAlpha: 0, scale: 0.6, duration: 0.25 }, at("i6", -0.3));

    /* i6 — Pointili sorts them by itself */
    const ph = K.phone({ x: 300, y: 270, w: 480, z: 12 });
    ph.put(`<div class="ins"><h3>شكون رجع؟</h3><p>الحرفاء اللي رجعولك، اللي بعدو، وقدّاش يطوّلو</p>
      <div class="seg"><span style="color:#12b76a"><b id="s1">0</b>نشطين</span><span style="color:#ff6b4a"><b id="s2">0</b>يبعدو</span><span style="color:#8f8ba3"><b id="s3">0</b>ضاعو</span></div>
      <h4>يبعدو: كلمة منك ترجّعهم</h4>
      <div class="row"><i>س</i><div><b>سنية</b><small>ما جاتش من 15 يوم</small></div></div>
      <div class="row"><i>ه</i><div><b>هشام</b><small>ما جاش من 12 يوم</small></div></div></div>`);
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 160 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("i6", -0.1));
    K.counter(K.$("#s1"), 0, 63, at("i6", 0.5), 1.2);
    K.counter(K.$("#s2"), 0, 7, at("i6", 0.9), 0.9);
    K.counter(K.$("#s3"), 0, 2, at("i6", 1.3), 0.6);
    K.sfx("tick", at("i6", 0.5), -6); K.sfx("tick", at("i6", 0.9), -6); K.sfx("tick", at("i6", 1.3), -6);
    tl.to(ph, { autoAlpha: 0, x: 200, duration: 0.3, ease: "power2.in" }, at("i7", 0.4));

    /* i7–i8 — a word from you: a gift tampon on WhatsApp */
    const ch = K.chat({ name: "سنية", sub: "واتساب", x: 140, y: 420, w: 800, z: 20, msgs: [
      { me: true, text: "توحشناك يا سنية 💜", time: "17:05" },
      { me: true, text: "🎁 تامبون جديد من صالون نور! حلّ الرابط هذا وخوذو في الكارط متاعك:", link: "www.pointili.online/s/n3Wq8e", time: "17:05" },
    ] });
    gsap.set(ch, { autoAlpha: 0 });
    tl.fromTo(ch, { autoAlpha: 0, y: 120 }, { autoAlpha: 1, y: 0, duration: 0.4 }, at("i7", 0.6));
    ch.msgs.forEach((m, i) => { const t = i ? at("i8", 0.2) : at("i7", 1.0); K.pop(m, t, { from: 0.6 }); K.sfx("msg", t + 0.05); });
    tl.to(ch, { autoAlpha: 0, y: -80, duration: 0.3 }, at("i9", -0.2));

    /* i9 — your best customers, by name */
    K.pop($("champ"), at("i9", -0.1), { from: 0.85 });
    K.$$("#champ .r").forEach((r, i) => K.rise(r, at("i9", 0.3 + i * 0.2), { y: 30 }));
    K.sfx("chime", at("i9", 0.4));

    K.endcard(at("i10", -0.1), { tag: "اكتب *«حرفاء»* في الكومونتار", offer: "جرّب Pointili بلاش", keyword: "حرفاء", typeAt: 1.2 });
  },
};
