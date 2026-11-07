/**
 * f1 — «زوز قهاوي» (two cafés on the same street): same coffee, same price; one is empty, the
 * other's customers keep coming back. Why? The second one did not leave the next visit to luck:
 * the code on the counter, the card in the customer's phone, the free coffee getting closer,
 * «يبعدو» and a gift tampon on WhatsApp when he drifts. «It has a system. It is called Pointili.»
 * Modelled on the structure of a two-cafés story reel, drawn flat (the same family as f2), in our
 * words — and only what Pointili does: no notification is promised.
 */
import { person, cup, front, ART_CSS, SKINS } from "../engine/art.mjs";

const owner1 = person({ shirt: "#fff", apron: "#8f8ba3", mustache: true, hair: "#3a2a20", skin: SKINS[2], smile: false });
const owner2 = person({ shirt: "#fff", apron: "#6c47ff", mustache: true });
const guy = person({ shirt: "#ff6b4a", skin: SKINS[1], hair: "#3a2a20", legs: "#34457a", shoes: "#fff" });
const p2 = person({ shirt: "#12b76a", skin: SKINS[3], hair: "#5a3b26", legs: "#3d3a4c", shoes: "#fff" });
const p3 = person({ shirt: "#ffd23f", skin: SKINS[0], hijab: "#6c47ff", legs: "#34457a", shoes: "#fff" });
const dice = `<svg viewBox="0 0 120 120" class="art"><rect x="8" y="8" width="104" height="104" rx="24" fill="#fff" stroke="#e1d9f3" stroke-width="4"/><circle cx="36" cy="36" r="10" fill="#ff6b4a"/><circle cx="84" cy="36" r="10" fill="#ff6b4a"/><circle cx="60" cy="60" r="10" fill="#ff6b4a"/><circle cx="36" cy="84" r="10" fill="#ff6b4a"/><circle cx="84" cy="84" r="10" fill="#ff6b4a"/></svg>`;

export default {
  title: "زوز قهاوي",
  music: (T) => ({ style: "warm", breaks: [[T.b5.start - 0.05, T.b6.start + 0.2], [T.b18.start - 0.1, T.b21.start - 0.05]] }),
  lead: 0.3,
  tail: 4.4,
  lines: [
    { id: "b1", say: "زوز قهاوي في *نفس الشارع*،", after: 0.1 },
    { id: "b2", say: "نفس القهوة، *ونفس السوم*.", after: 0.25 },
    { id: "b3", say: "وحدة *فارغة*..", after: 0.1 },
    { id: "b4", say: "والأخرى، الحرفاء *يرجعولها* كل يوم.", after: 0.25 },
    { id: "b5", say: "*علاش؟*", after: 0.35 },
    { id: "b6", say: "تخيّل حريف شرب قهوة *في الزوز*، في نفس النهار.", after: 0.25 },
    { id: "b7", say: "القهوة الأولى قالتلو «يعيشك».. *وخلاتو للزهر*.", after: 0.3 },
    { id: "b8", say: "*أما الثانية؟*", after: 0.15 },
    { id: "b9", say: "سكاني *الكود* اللي على الكونتوار،", after: 0.1 },
    { id: "b10", say: "وطاحلو أوّل تامبون، *في تليفونو*.", after: 0.1 },
    { id: "b11", say: "من غير ما يحمّل *حتى أبليكاسيون*.", after: 0.25 },
    { id: "b12", say: "كل مرّة يرجع، *تامبون جديد*..", after: 0.1 },
    { id: "b13", say: "*والقهوة البلاش* تقرب.", after: 0.3 },
    { id: "b14", say: "وإذا غاب *جمعتين*؟", after: 0.15 },
    { id: "b15", say: "مولى القهوة يشوفو في *«يبعدو»*،", after: 0.1 },
    { id: "b16", say: "ويبعثلو *تامبون هدية* في الواتساب.", after: 0.2 },
    { id: "b17", say: "*ويرجع.*", after: 0.4 },
    { id: "b18", say: "القهوة هاذي موش *أشطر*.. ولا *أرخص*.", sub: false, after: 0.15 },
    { id: "b19", say: "هي برك ما خلاتش الزيارة الجاية *للزهر*.", sub: false, after: 0.2 },
    { id: "b20", say: "*عندها سيستام.*", sub: false, after: 0.25 },
    { id: "b21", say: "والسيستام هذا اسمو *Pointili*.", sub: false, after: 0.25 },
    { id: "b22", say: "تحب نفس الحاجة لقهوتك؟", sub: false, after: 0.15 },
    { id: "b23", say: "جرّب Pointili بلاش، واكتب «Pointili» في الكومونتار.", sub: false },
  ],
  css: `
#stage{background:#f6f2fb}
${ART_CSS}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0}
.halo{position:absolute;left:110px;top:330px;width:860px;height:860px;border-radius:50%;background:radial-gradient(circle,#ebe4ff 0 62%,#f1ecfd 62% 100%)}
.ask{position:absolute;left:50%;top:200px;transform:translateX(-50%);white-space:nowrap;background:var(--ink);color:#fff;font-weight:700;font-size:46px;padding:18px 36px 24px;border-radius:999px;z-index:40;visibility:hidden;opacity:0}
.price{position:absolute;background:#fff;border-radius:999px;padding:10px 24px 14px;font-weight:700;font-size:36px;direction:ltr;box-shadow:0 12px 24px -12px rgb(40 20 90/.4)}
.why{position:absolute;left:0;right:0;top:420px;text-align:center;font-weight:700;font-size:460px;line-height:1;color:var(--coral);visibility:hidden;opacity:0}
.counter{position:absolute;left:0;right:0;top:960px;height:260px;background:repeating-linear-gradient(92deg,rgb(0 0 0/.05) 0 3px,transparent 3px 26px),linear-gradient(180deg,#b07a52,#8a5a37);box-shadow:inset 0 12px 0 #cf9a6e}
.lbl{position:absolute;font-weight:700;font-size:40px;text-align:center;color:var(--ink)}
.cal{position:absolute;left:190px;top:420px;width:700px;border-radius:40px;background:#fff;box-shadow:0 26px 50px -26px rgb(40 20 90/.45);overflow:hidden}
.cal b{display:block;background:var(--coral);color:#fff;font-size:44px;text-align:center;padding:18px 0 24px}
.cal .g{display:grid;grid-template-columns:repeat(7,1fr);gap:14px;padding:30px}
.cal .g i{aspect-ratio:1;border-radius:18px;background:#f1ecfd;display:grid;place-items:center;font-style:normal;font-weight:700;font-size:30px;color:#b3abd0}
.cal .g i.x{background:var(--coral-soft);color:var(--coral)}
.days{position:absolute;left:0;right:0;top:1000px;text-align:center;font-weight:700;font-size:120px;color:var(--coral);direction:rtl}
.ins{position:absolute;inset:0;background:#f4f3f9;padding:118px 30px 0;direction:rtl}
.ins h3{font-size:40px;font-weight:700}
.ins p{font-size:22px;color:#77748a;margin-top:6px}
.ins .seg{display:flex;gap:12px;margin-top:24px}
.ins .seg span{flex:1;background:#fff;border-radius:22px;padding:14px 0 18px;text-align:center;font-size:23px;color:#77748a;font-weight:600}
.ins .seg span b{display:block;font-size:38px;color:var(--ink)}
.ins .seg span.on{background:var(--coral-soft);color:var(--coral);box-shadow:inset 0 0 0 3px var(--coral)}
.ins .seg span.on b{color:var(--coral)}
.ins h4{margin-top:28px;font-size:26px;font-weight:700}
.ins .row{display:flex;align-items:center;gap:16px;background:#fff;border-radius:24px;padding:18px 20px;margin-top:14px}
.ins .row i{width:62px;height:62px;border-radius:50%;background:#ebe4ff;color:var(--brand);display:grid;place-items:center;font-style:normal;font-weight:700;font-size:30px;flex:none}
.ins .row div{flex:1;min-width:0}
.ins .row b{display:block;font-size:27px}
.ins .row small{display:block;font-size:21px;color:var(--coral);font-weight:600;margin-top:2px}
.ins .row .ph{font-size:20px;color:#77748a;direction:ltr;margin-top:4px;text-align:right;font-weight:600}
.ins .row.hot{box-shadow:inset 0 0 0 4px var(--coral)}
.big{position:absolute;left:0;right:0;text-align:center;font-weight:700;color:var(--ink);visibility:hidden;opacity:0}
.big s{text-decoration:none;position:relative;display:inline-block}
.big s:after{content:"";position:absolute;left:-4%;right:-4%;top:54%;height:14px;border-radius:7px;background:var(--coral);transform:scaleX(var(--k,0));transform-origin:100% 50%}
`,
  html: () => `
<div class="halo" id="halo"></div>
<div class="sc" id="A">
  ${front({ id: "fa", x: 100, top: 470, w: 410, name: "قهوة النجمة", awning: "#ff6b4a" })}
  ${front({ id: "fb", x: 570, top: 470, w: 410, name: "قهوة الياسمين", awning: "#6c47ff" })}
  <div class="street" style="top:990px"></div>
  <div class="art" id="ca" style="left:210px;top:860px;width:170px;height:145px">${cup()}</div>
  <div class="art" id="cb" style="left:680px;top:860px;width:170px;height:145px">${cup()}</div>
  <div class="price" id="pa" style="left:225px;top:1030px">1.800 D</div>
  <div class="price" id="pb" style="left:695px;top:1030px">1.800 D</div>
  <div class="art" id="g1" style="left:1100px;top:690px;width:140px;height:301px">${guy}</div>
  <div class="art" id="g2" style="left:1190px;top:690px;width:140px;height:301px">${p2}</div>
  <div class="art" id="g3" style="left:1280px;top:690px;width:140px;height:301px">${p3}</div>
  <div class="why" id="why">؟</div>
</div>
<div class="sc" id="B">
  <div class="art" style="left:400px;top:470px;width:280px;height:602px">${guy}</div>
  <div class="art" id="cl" style="left:200px;top:760px;width:200px;height:170px">${cup()}</div>
  <div class="art" id="cr" style="left:680px;top:760px;width:200px;height:170px">${cup()}</div>
  <div class="lbl" id="ll" style="left:180px;top:950px;width:240px">الأولى</div>
  <div class="lbl" id="lr" style="left:660px;top:950px;width:240px">الثانية</div>
</div>
<div class="sc" id="C">
  <div class="art" id="o1" style="left:380px;top:420px;width:320px;height:688px">${owner1}</div>
  <div class="counter"></div>
  <div class="bubble l" id="bye" style="left:620px;top:380px">يعيشك! 👋</div>
  <div class="art" id="dice" style="left:470px;top:1010px;width:150px;height:150px">${dice}</div>
</div>
<div class="sc" id="D">
  <div class="art" id="o2" style="left:120px;top:420px;width:300px;height:645px">${owner2}</div>
  <div class="counter"></div>
</div>
<div class="sc" id="F">
  <div class="cal"><b>جمعتين</b><div class="g">${Array.from({ length: 14 }, (_, i) => `<i class="x" data-d="${i}">${i + 1}</i>`).join("")}</div></div>
  <div class="days" id="days">14 يوم</div>
</div>
<div class="sc" id="J">
  <div class="big" id="j1" style="top:560px;font-size:150px">موش <s id="s1">أشطر</s></div>
  <div class="big" id="j2" style="top:760px;font-size:150px">ولا <s id="s2">أرخص</s></div>
  <div class="big" id="j3" style="top:1000px;font-size:96px">ولا <s id="s3">بالزهر</s></div>
  <div class="big" id="j4" style="top:520px;font-size:200px;color:var(--brand)">سيستام</div>
</div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    const S = "../../assets/screens/";
    K.subs("pill");
    tl.fromTo($("halo"), { scale: 0.97 }, { scale: 1.03, duration: 2.6, yoyo: true, repeat: 20, ease: "sine.inOut" }, 0);

    /* A — two cafés, one street */
    K.scene($("A"), 0, at("b6", -0.05), { inn: "cut" });
    K.rise($("fa"), 0.0, { y: 90 });
    K.rise($("fb"), 0.12, { y: 90 });
    const ask = K.add(`<div class="ask">علاش يرجعو لوحدة برك؟</div>`);
    K.pop(ask, 0.35, { from: 0.7 });
    K.sfx("pop", 0.4);
    K.pop($("ca"), at("b2", 0), { from: 0.4 });
    K.pop($("cb"), at("b2", 0.15), { from: 0.4 });
    K.pop($("pa"), at("b2", 0.55), { from: 0.5 });
    K.pop($("pb"), at("b2", 0.7), { from: 0.5 });
    ["pop", "pop", "tick", "tick"].forEach((s, i) => K.sfx(s, at("b2", [0, 0.15, 0.55, 0.7][i] + 0.05), -3));
    // one goes dark and empty
    const empty = K.pill("فارغة", { x: 190, y: 330, cls: "ink", z: 41 });
    tl.to(K.$("#fa .win"), { background: "linear-gradient(160deg,#e9e6f2,#d6d2e4)", duration: 0.4 }, at("b3", 0));
    tl.to(K.$$("#fa .win i"), { autoAlpha: 0, duration: 0.3 }, at("b3", 0));
    tl.to($("fa"), { filter: "grayscale(1) brightness(.96)", duration: 0.5 }, at("b3", 0));
    K.pop(empty, at("b3", 0.1), { from: 0.6 });
    K.sfx("thud", at("b3", 0.15));
    // the other one: people walk in
    const back = K.pill("يرجعولها", { x: 640, y: 330, cls: "mint", z: 41 });
    K.pop(back, at("b4", 0.1), { from: 0.6 });
    K.sfx("ding", at("b4", 0.15));
    ["g1", "g2", "g3"].forEach((g, i) => {
      const t0 = at("b4", 0.2 + i * 0.35), t1 = t0 + 1.4;
      tl.to($(g), { x: -(290 + i * 90), duration: t1 - t0, ease: "none" }, t0);
      tl.to($(g), { keyframes: Array.from({ length: 6 }, (_, k) => ({ y: k % 2 ? -10 : 0, duration: (t1 - t0) / 6 })), ease: "none" }, t0);
      tl.to($(g), { autoAlpha: 0, scale: 0.8, duration: 0.25 }, t1 - 0.1);
      K.sfx("tick", t0 + 0.3, -8);
    });
    [ask, empty, back].forEach((e) => K.out(e, at("b5", -0.1), { dur: 0.2 }));
    tl.to([$("fa"), $("fb"), $("ca"), $("cb"), $("pa"), $("pb")], { autoAlpha: 0.12, duration: 0.25 }, at("b5", -0.1));
    K.pop($("why"), at("b5", 0), { from: 0.3, dur: 0.45 });
    K.sfx("boing", at("b5", 0.05));

    /* B — one customer, both cafés, the same day */
    K.scene($("B"), at("b6", -0.05), at("b7", -0.05), { inn: "fade" });
    K.pop($("cl"), at("b6", 0.5), { from: 0.4 });
    K.pop($("cr"), at("b6", 0.8), { from: 0.4 });
    K.rise($("ll"), at("b6", 0.6), { y: 20 });
    K.rise($("lr"), at("b6", 0.9), { y: 20 });
    K.sfx("pop", at("b6", 0.55)); K.sfx("pop", at("b6", 0.85));

    /* C — the first one: «thanks», and luck */
    K.scene($("C"), at("b7", -0.05), at("b8", -0.05), { inn: "fade" });
    K.pop($("bye"), at("b7", 0.3), { from: 0.5 });
    K.sfx("pop", at("b7", 0.35));
    tl.to($("o1"), { rotation: -3, transformOrigin: "50% 100%", duration: 0.35, yoyo: true, repeat: 3, ease: "sine.inOut" }, at("b7", 0.3));
    K.pop($("dice"), at("b7", 1.4), { from: 0.3 });
    tl.to($("dice"), { rotation: 720, duration: 1.0, ease: "power3.out" }, at("b7", 1.4));
    K.sfx("boing", at("b7", 1.45), -4);

    /* D — the second one: the code on the counter, the tampon in his phone */
    K.scene($("D"), at("b8", -0.05), at("b12", -0.1), { inn: "fade" });
    K.pop($("o2"), at("b8", 0), { from: 0.85, y: 30 });
    tl.to($("o2"), { y: -18, duration: 0.2, yoyo: true, repeat: 1, ease: "power2.out" }, at("b8", 0.3));
    const qr = K.phone({ src: S + "v2-food-counter.png", x: 560, y: 470, w: 330, z: 12 });
    gsap.set(qr, { autoAlpha: 0, rotation: -4 });
    tl.fromTo(qr, { autoAlpha: 0, y: 120 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("b9", -0.1));
    K.sfx("swish", at("b9", -0.1));
    const his = K.phone({ src: S + "v2-food-stamped.png", x: 490, y: 520, w: 380, z: 14 });
    gsap.set(his, { autoAlpha: 0 });
    tl.fromTo(his, { autoAlpha: 0, x: 320, rotation: 10 }, { autoAlpha: 1, x: 0, rotation: 0, duration: 0.5, ease: "back.out(1.3)" }, at("b10", -0.15));
    tl.to(qr, { x: -380, autoAlpha: 0.0, duration: 0.4 }, at("b10", -0.15));
    K.sfx("scan", at("b10", -0.05));
    K.sfx("stamp", at("b10", 0.5));
    K.burst(670, 760, at("b10", 0.5), { n: 14, r: 220 });
    const noApp = K.pill("بلا أبليكاسيون", { x: 110, y: 330, cls: "coral", icon: "nodl", z: 41 });
    K.pop(noApp, at("b11", 0.05), { from: 0.6 });
    K.sfx("pop", at("b11", 0.1));
    K.out(noApp, at("b12", -0.2));
    tl.to(his, { autoAlpha: 0, scale: 0.9, duration: 0.3 }, at("b12", -0.2));

    /* E — every visit a tampon, the free coffee closer */
    const card = K.pass({ name: "قهوة الياسمين", color: "#6c47ff", goal: 8, stamps: 1, gift: "قهوة بلاش", icon: "coffee", x: 110, y: 560, w: 860, size: 38, z: 22 });
    K.pop(card, at("b12", -0.1), { from: 0.7 });
    K.sfx("swish", at("b12", -0.1));
    card.stamp(2, at("b12", 0.3)); card.stamp(3, at("b12", 0.6)); card.stamp(4, at("b12", 0.9)); card.stamp(5, at("b12", 1.2));
    card.stamp(6, at("b13", 0.05)); card.stamp(7, at("b13", 0.45));
    tl.fromTo(card.dots[7], { scale: 1 }, { scale: 1.22, duration: 0.28, yoyo: true, repeat: 3, ease: "sine.inOut" }, end("b13", -0.3));
    K.sfx("chime", end("b13", -0.2));
    K.out(card, at("b14", -0.2), { dur: 0.3 });

    /* F — two weeks without him */
    K.scene($("F"), at("b14", -0.05), at("b15", -0.05), { inn: "fade" });
    K.$$("#F .g i").forEach((d, i) => { K.pop(d, at("b14", 0.05 + i * 0.05), { from: 0.4, dur: 0.3 }); });
    K.sfx("tick", at("b14", 0.1), -6); K.sfx("tick", at("b14", 0.4), -6); K.sfx("tick", at("b14", 0.7), -6);
    K.pop($("days"), at("b14", 0.8), { from: 0.5 });
    K.sfx("thud", at("b14", 0.85));

    /* G — «يبعدو»: he is there, with his number */
    const ins = K.phone({ x: 320, y: 270, w: 440, z: 12 });
    ins.put(`<div class="ins"><h3>شكون رجع؟</h3><p>الحرفاء اللي رجعولك، اللي بعدو، وقدّاش يطوّلو</p>
      <div class="seg"><span><b>63</b>نشطين</span><span class="on" id="segc"><b>7</b>يبعدو</span><span><b>2</b>ضاعو</span></div>
      <h4>يبعدو: كلمة منك ترجّعهم</h4>
      <div class="row hot" id="rowc"><i>م</i><div><b>محمد</b><small>ما جاش من 14 يوم</small><div class="ph">+216 22 •• •518</div></div></div>
      <div class="row"><i>ل</i><div><b>ليلى</b><small>ما جاتش من 11 يوم</small></div></div>
      <div class="row"><i>ي</i><div><b>ياسين</b><small>ما جاش من 9 أيّام</small></div></div></div>`);
    gsap.set(ins, { autoAlpha: 0 });
    tl.fromTo(ins, { autoAlpha: 0, y: 120 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("b15", -0.05));
    K.sfx("swish", at("b15", 0));
    tl.fromTo(K.$("#segc"), { scale: 1 }, { scale: 1.12, duration: 0.22, yoyo: true, repeat: 1 }, at("b15", 0.8));
    K.sfx("tap", at("b15", 0.85));
    tl.fromTo(K.$("#rowc"), { scale: 1 }, { scale: 1.05, duration: 0.22, yoyo: true, repeat: 1 }, at("b15", 1.3));
    tl.to(ins, { autoAlpha: 0, x: 200, duration: 0.3, ease: "power2.in" }, at("b16", -0.2));

    /* H — a gift tampon, on WhatsApp */
    const ch = K.chat({ name: "محمد", sub: "واتساب", x: 120, y: 360, w: 840, msgs: [
      { me: true, text: "توحشناك يا محمد ☕", time: "17:05" },
      { me: true, text: "🎁 تامبون جديد من قهوة الياسمين! حلّ الرابط هذا وخوذو في الكارط متاعك:", link: "www.pointili.online/s/p8RtQ2", time: "17:05" },
    ] });
    gsap.set(ch, { autoAlpha: 0 });
    tl.fromTo(ch, { autoAlpha: 0, y: 100 }, { autoAlpha: 1, y: 0, duration: 0.4 }, at("b16", -0.1));
    ch.msgs.forEach((m, i) => { K.pop(m, at("b16", 0.35 + i * 0.7), { from: 0.6 }); K.sfx("msg", at("b16", 0.4 + i * 0.7)); });
    tl.to(ch, { autoAlpha: 0, y: -60, duration: 0.3 }, at("b17", -0.2));

    /* I — and he comes back */
    const ret = K.add(`<div class="sc" id="I">${K.$("#fb").outerHTML.replace('id="fb"', 'id="fb2"')}<div class="street" style="top:990px"></div>
      <div class="art" id="gb" style="left:20px;top:690px;width:140px;height:301px">${K.$("#g1").innerHTML}</div></div>`);
    gsap.set(K.$("#fb2"), { left: 330, autoAlpha: 1, x: 0, y: 0, filter: "none" });
    K.scene(ret, at("b17", -0.15), at("b18", -0.05), { inn: "fade" });
    tl.to(K.$("#gb"), { x: 470, duration: 1.0, ease: "none" }, at("b17", 0));
    tl.to(K.$("#gb"), { keyframes: Array.from({ length: 6 }, (_, k) => ({ y: k % 2 ? -10 : 0, duration: 1.0 / 6 })), ease: "none" }, at("b17", 0));
    tl.to(K.$("#gb"), { autoAlpha: 0, scale: 0.85, duration: 0.25 }, at("b17", 0.9));
    K.burst(620, 640, at("b17", 1.0), { n: 18, r: 260 });
    K.sfx("win", at("b17", 1.0), -3);

    /* J — not smarter, not cheaper, not luck: a system */
    K.scene($("J"), at("b18", -0.05), at("b21", -0.05), { inn: "fade" });
    ["s1", "s2", "s3"].forEach((x) => gsap.set($(x), { "--k": 0 }));
    K.pop($("j1"), at("b18", 0.1), { from: 0.7 });
    K.pop($("j2"), at("b18", 0.9), { from: 0.7 });
    tl.to($("s1"), { "--k": 1, duration: 0.25, ease: "power2.out" }, at("b18", 0.6));
    tl.to($("s2"), { "--k": 1, duration: 0.25, ease: "power2.out" }, at("b18", 1.4));
    K.sfx("scratch", at("b18", 0.62)); K.sfx("scratch", at("b18", 1.42));
    K.pop($("j3"), at("b19", 0.3), { from: 0.7 });
    tl.to($("s3"), { "--k": 1, duration: 0.25, ease: "power2.out" }, at("b19", 1.4));
    K.sfx("scratch", at("b19", 1.42));
    tl.to([$("j1"), $("j2"), $("j3")], { autoAlpha: 0, y: -40, duration: 0.25, stagger: 0.05 }, at("b20", -0.15));
    K.pop($("j4"), at("b20", 0.05), { from: 0.4, dur: 0.55 });
    K.sfx("impact", at("b20", 0.1));
    const sys = K.pass({ name: "قهوة الياسمين", color: "#6c47ff", goal: 8, stamps: 7, gift: "قهوة بلاش", icon: "coffee", x: 170, y: 880, w: 740, size: 33, z: 22 });
    K.rise(sys, at("b20", 0.35), { y: 80 });
    tl.to(sys, { autoAlpha: 0, duration: 0.2 }, at("b21", -0.05));

    /* the end: its name, then what to do */
    K.endcard(at("b21", 0.15), { tag: "تحب نفس الحاجة لقهوتك؟", offer: "جرّب Pointili بلاش", keyword: "Pointili", typeAt: 2.2 });
  },
};
