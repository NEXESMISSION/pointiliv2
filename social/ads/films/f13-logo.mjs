/**
 * f13 — «اللوغو متاعك» (your logo): a shop has a name, a colour, a logo — why is its card plain
 * white paper? With Pointili the card is in your colour, your logo on every tampon («اللوغو
 * متاعك»), in every customer's phone; a pastry shop, a barber, a perfume shop — each in its own
 * style. Quick cuts on the beat, one big word at a time. Female voice.
 */
const SHOPS = [
  { name: "Pâtisserie Nour", color: "#e8578a", mark: "🧁", gift: "قطعة قاتو بلاش" },
  { name: "Barber 216", color: "#1f3a8a", mark: "✂️", gift: "حجامة بلاش" },
  { name: "Dar Rayhana", color: "#9c2b4f", mark: "🌸", gift: "عطر صغير" },
];

export default {
  title: "اللوغو متاعك",
  voice: "coral",
  music: { style: "bounce" },
  lead: 0.25,
  tail: 4,
  lines: [
    { id: "l1", say: "محلّك عندو *اسم*." },
    { id: "l2", say: "عندو *لون*." },
    { id: "l3", say: "وعندو *لوغو*." },
    { id: "l4", say: "علاش الكارط متاعو تكون *كرتون أبيض*؟" },
    { id: "l5", say: "مع Pointili، الكارط *بلونك*،" },
    { id: "l6", say: "واللوغو متاعك *على كل تامبون*." },
    { id: "l7", say: "في *تليفون كل حريف*." },
    { id: "l8", say: "حلواني، حجّام، محل عطورات.. *كل واحد بستيلو*." },
    { id: "l9", say: "خلّي محلّك *في جيب الحريف*." },
    { id: "l10", say: "جرّب Pointili بلاش، الرابط في البيو.", sub: false },
  ],
  css: `
#stage{background:#f6f3ee}
.splash{position:absolute;left:540px;top:900px;width:3000px;height:3000px;margin:-1500px 0 0 -1500px;border-radius:50%;background:#e8578a;transform:scale(0)}
.sign{position:absolute;left:50%;top:900px;transform:translateX(-50%);white-space:nowrap;direction:ltr;font-weight:700;font-size:110px;color:#0f0e17;letter-spacing:-1px;visibility:hidden;opacity:0}
.sign i{display:inline-block;width:6px;height:100px;background:#0f0e17;margin-left:6px;vertical-align:-10px}
.logo{position:absolute;left:50%;top:650px;width:200px;height:200px;margin-left:-100px;border-radius:56px;background:#fff;display:grid;place-items:center;font-size:120px;box-shadow:0 30px 60px -30px rgb(0 0 0/.5);visibility:hidden;opacity:0}
.paper{position:absolute;left:170px;top:620px;width:740px;padding:40px 44px 46px;border-radius:24px;background:#f2ead9;color:#8a7a5c;box-shadow:0 26px 50px -26px rgb(80 50 10/.55);visibility:hidden;opacity:0}
.paper b{display:block;font-size:44px}
.paper .rw{display:grid;grid-template-columns:repeat(4,1fr);gap:22px;margin-top:30px;justify-items:center}
.paper .rw i{width:90px;height:90px;border-radius:50%;border:5px dashed #c5b48f}
.meh{position:absolute;right:120px;top:520px;font-size:120px;visibility:hidden;opacity:0}
.wall{position:absolute;inset:0;background:#efeaff}
.jeans{position:absolute;left:190px;top:640px;width:700px;height:760px;border-radius:60px 60px 30px 30px;background:linear-gradient(170deg,#4a5f9c,#34457a);overflow:hidden;visibility:hidden;opacity:0}
.jeans:before{content:"";position:absolute;left:0;right:0;top:0;height:70px;background:#2f3d6d;border-bottom:4px dashed #8ea0d6}
.jeans .pk{position:absolute;left:110px;top:250px;width:480px;height:420px;border:6px dashed #8ea0d6;border-radius:30px 30px 170px 170px;background:linear-gradient(170deg,#4d63a3,#3a4c86)}
.jeans .ph{position:absolute;left:190px;top:110px;width:320px;height:450px;border-radius:44px;background:#14121b;padding:12px}
.jeans .ph>div{position:relative;width:100%;height:100%;border-radius:34px;background:#f4f3f9;overflow:hidden}
`,
  html: () => `
<i class="splash" id="sp"></i>
<div class="sign" id="sign"><span id="nm"></span><i id="cur"></i></div>
<div class="logo" id="logo">🧁</div>
<div class="paper" id="paper"><b>Pâtisserie Nour</b><div class="rw">${"<i></i>".repeat(8)}</div></div>
<span class="meh" id="meh">😐</span>
<div class="jeans" id="jeans"><div class="pk"></div><div class="ph" id="pph"><div></div></div></div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("word");
    const NAME = "Pâtisserie Nour";
    // the build runs in the page: the shops again, here
    const SHOPS = [
      { name: "Pâtisserie Nour", color: "#e8578a", mark: "🧁", gift: "قطعة قاتو بلاش" },
      { name: "Barber 216", color: "#1f3a8a", mark: "✂️", gift: "حجامة بلاش" },
      { name: "Dar Rayhana", color: "#9c2b4f", mark: "🌸", gift: "عطر صغير" },
    ];

    /* l1 — a name, typed */
    K.fadeIn($("sign"), 0.05, 0.1);
    const ty = 0.15;
    K.each((t) => { K.$("#nm").textContent = NAME.slice(0, Math.max(0, Math.min(NAME.length, Math.floor((t - ty) / 0.05)))); });
    for (let i = 0; i < NAME.length; i += 2) K.sfx("key", ty + i * 0.05, -6);
    tl.fromTo($("cur"), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, repeat: 9, yoyo: true, repeatDelay: 0.3 }, 0.2);

    /* l2 — a colour: it floods in */
    tl.to($("sp"), { scale: 1, duration: 0.55, ease: "power3.inOut" }, at("l2", 0));
    tl.to($("sign"), { color: "#fff", duration: 0.3 }, at("l2", 0.2));
    K.sfx("whoosh", at("l2", 0));

    /* l3 — a logo, stamped */
    K.pop($("logo"), at("l3", 0.05), { from: 2.2, dur: 0.35, ease: "power3.out" });
    K.sfx("thud", at("l3", 0.1));
    tl.to([$("sign"), $("logo")], { autoAlpha: 0, duration: 0.25 }, at("l4", -0.15));

    /* l4 — so why a plain paper card? */
    tl.to($("sp"), { scale: 0, duration: 0.4, ease: "power3.inOut" }, at("l4", -0.2));
    K.pop($("paper"), at("l4", 0.05), { from: 0.8 });
    K.pop($("meh"), at("l4", 0.6), { from: 0.3 });
    K.shake($("paper"), at("l4", 0.9), { dur: 0.5, amp: 8 });
    K.sfx("boing", at("l4", 0.8), -6);

    /* l5 — your colour */
    tl.to([$("paper"), $("meh")], { autoAlpha: 0, scale: 0.9, duration: 0.25 }, at("l5", -0.1));
    const c = K.pass({ ...SHOPS[0], goal: 8, stamps: 0, icon: "gift", logo: "🧁", x: 110, y: 640, w: 860, size: 38, z: 22 });
    tl.fromTo(c, { autoAlpha: 0, rotationY: 90, transformPerspective: 1400 }, { autoAlpha: 1, rotationY: 0, duration: 0.5, ease: "back.out(1.4)" }, at("l5", 0));
    K.sfx("swish", at("l5", 0));
    tl.to($("sp"), { scale: 1, backgroundColor: "#fde3ec", duration: 0.5 }, at("l5", 0.1));

    /* l6 — your logo on every tampon */
    [1, 2, 3, 4, 5].forEach((n, i) => c.stamp(n, at("l6", 0.1 + i * 0.22)));
    K.out(c, at("l7", -0.15));

    /* l7 — in every customer's phone */
    const ph = K.phone({ x: 330, y: 620, w: 420, z: 12 });
    ph.put(`<div style="position:absolute;inset:0;background:#f4f3f9;padding:120px 22px 0;direction:rtl"><b style="font-size:30px">الكارطات متاعي</b></div>`);
    SHOPS.forEach((s, i) => K.pass({ ...s, goal: 8, stamps: [5, 3, 6][i], icon: "gift", logo: s.mark, x: 20, y: 190 + i * 250, w: 432, size: 18, parent: ph.scr, z: 4 }));
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 200 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("l7", -0.05));
    K.sfx("swish", at("l7", 0));
    tl.to(ph, { autoAlpha: 0, duration: 0.25 }, at("l8", -0.15));

    /* l8 — each in its own style: quick cuts */
    const cuts = SHOPS.map((s, i) => K.pass({ ...s, goal: 8, stamps: [6, 4, 7][i], icon: "gift", logo: s.mark, x: 110, y: 640, w: 860, size: 38, z: 22 }));
    const span = Math.max(1.8, end("l8") - at("l8"));
    cuts.forEach((cc, i) => {
      const t = at("l8", (span * i) / 3);
      tl.set($("sp"), { backgroundColor: ["#fde3ec", "#e3e9fb", "#f7e3ea"][i] }, t);
      tl.fromTo(cc, { autoAlpha: 0, scale: 1.25, rotation: (i - 1) * 6 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.25, ease: "power3.out" }, t);
      tl.set(cc, { autoAlpha: 0 }, t + span / 3);
      K.sfx("impact", t, -10);
    });

    /* l9 — your shop in the customer's pocket */
    tl.set($("sp"), { backgroundColor: "#efeaff" }, at("l9", -0.1));
    K.fadeIn($("jeans"), at("l9", -0.1), 0.25);
    const mini = K.pass({ ...SHOPS[0], goal: 8, stamps: 6, icon: "gift", logo: "🧁", x: 10, y: 60, w: 276, size: 12, parent: K.$("#pph div"), z: 3 });
    tl.fromTo($("pph"), { y: 300 }, { y: 0, duration: 0.6, ease: "back.out(1.6)" }, at("l9", 0.2));
    K.sfx("whoosh", at("l9", 0.2));
    K.burst(540, 600, at("l9", 0.9), { n: 12, r: 200, colors: ["#e8578a", "#ffd23f", "#fff"] });

    K.endcard(at("l10", -0.1), { tag: "الكارط بلونك واللوغو متاعك · *الرابط في البيو*", offer: "جرّب Pointili بلاش" });
  },
};
