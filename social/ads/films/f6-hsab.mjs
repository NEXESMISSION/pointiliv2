/**
 * f6 — «الحساب» (the math): 200 customers a month; if each comes back once more → 200 more
 * coffees; × 12 → 2400 a year. No ads, no discount: a reason to come back — the card in the
 * phone. Kinetic numbers on a dark board, then the card. The numbers are an «if» (كان), said so.
 */
const S = "../../assets/screens/";

export default {
  title: "الحساب",
  voice: "ash",
  music: { style: "tech" },
  lead: 0.25,
  tail: 3,
  lines: [
    { id: "c1", say: "عندك قهوة يجيوها *200 حريف* في الشهر؟" },
    { id: "c2", say: "كان كل واحد يزيد يرجع *مرّة برك* في الشهر.." },
    { id: "c3", say: "هاذي *200 قهوة* زايدة." },
    { id: "c4", say: "في العام؟ *2400 قهوة*." },
    { id: "c5", say: "من غير إشهار.. ومن غير *ريميز*." },
    { id: "c6", say: "*سبب واحد* يخلّيه يرجع:" },
    { id: "c7", say: "كارط تامبون *في تليفونو*." },
    { id: "c8", say: "كل قهوة، تامبون. والثامنة *بلاش*." },
    { id: "c9", say: "والحساب يكمّل *وحدو*." },
    { id: "c10", say: "جرّب Pointili.", sub: false },
  ],
  css: `
#stage{background:#0f0b24}
.grid{position:absolute;inset:0;background-image:linear-gradient(rgb(255 255 255/.05) 2px,transparent 2px),linear-gradient(90deg,rgb(255 255 255/.05) 2px,transparent 2px);background-size:90px 90px}
.glow{position:absolute;left:-200px;right:-200px;top:200px;height:900px;background:radial-gradient(closest-side,rgb(108 71 255/.45),transparent)}
.crowd{position:absolute;left:110px;top:300px;width:860px;display:grid;grid-template-columns:repeat(20,1fr);gap:10px}
.crowd i{aspect-ratio:1;border-radius:50%;background:#8f74ff;visibility:hidden;opacity:0}
.big{position:absolute;left:0;right:0;text-align:center;color:#fff;font-weight:700;direction:ltr;visibility:hidden;opacity:0}
.big small{display:block;font-size:44px;font-weight:600;opacity:.75;direction:rtl;margin-top:6px}
.op{position:absolute;left:50%;transform:translateX(-50%);white-space:nowrap;font-weight:700;color:#12b76a;background:rgb(18 183 106/.14);border:4px solid #12b76a;border-radius:999px;padding:10px 36px 16px;font-size:64px;direction:ltr;visibility:hidden;opacity:0}
.cups{position:absolute;left:140px;right:140px;top:1140px;display:flex;flex-wrap:wrap;gap:12px;justify-content:center}
.cups i{font-style:normal;font-size:46px;visibility:hidden;opacity:0}
.no{position:absolute;display:flex;align-items:center;gap:18px;white-space:nowrap;font-weight:700;font-size:64px;color:#fff;background:rgb(255 255 255/.08);border:3px solid rgb(255 255 255/.18);border-radius:28px;padding:18px 40px 26px;visibility:hidden;opacity:0}
.no b{position:relative}
.no b:after{content:"";position:absolute;left:-6%;right:-6%;top:55%;height:10px;border-radius:5px;background:#ff6b4a;transform:scaleX(var(--k,0));transform-origin:100% 50%}
.up{position:absolute;left:150px;right:150px;top:560px;height:520px}
`,
  html: () => `
<div class="grid"></div><div class="glow"></div>
<div class="crowd" id="dots">${Array.from({ length: 200 }, () => "<i></i>").join("")}</div>
<div class="big" id="n200" style="top:980px;font-size:230px">0<small>حريف في الشهر</small></div>
<div class="op" id="plus1" style="top:820px">+1 ×</div>
<div class="big" id="cups200" style="top:560px;font-size:250px">200</div>
<div class="big" id="lbl200" style="top:860px;font-size:60px;direction:rtl">قهوة زايدة في الشهر ☕</div>
<div class="op" id="x12" style="top:330px">× 12</div>
<div class="big" id="n2400" style="top:520px;font-size:280px;color:#ffd23f">200</div>
<div class="big" id="lbl2400" style="top:850px;font-size:60px;direction:rtl">قهوة في العام</div>
<div class="cups" id="cups">${Array.from({ length: 24 }, () => "<i>☕</i>").join("")}</div>
<div class="no" id="no1" style="left:180px;top:620px">📣 <b id="s1">إشهار</b></div>
<div class="no" id="no2" style="left:300px;top:820px">🏷️ <b id="s2">ريميز</b></div>
<svg class="up" id="up" viewBox="0 0 780 520"><path id="upl" d="M20 480 L200 380 L330 410 L480 250 L600 280 L760 60" fill="none" stroke="#12b76a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round" stroke-dasharray="1200" stroke-dashoffset="1200"/><path d="M700 60 L760 60 L760 120" fill="none" stroke="#12b76a" stroke-width="14" stroke-linecap="round" stroke-linejoin="round"/></svg>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    const S = "../../assets/screens/";
    K.subs("pill");
    K.progress("#ffd23f");

    /* c1 — 200 customers a month */
    const dots = K.$$("#dots i");
    dots.forEach((d, i) => tl.fromTo(d, { autoAlpha: 0, scale: 0.2 }, { autoAlpha: 1, scale: 1, duration: 0.25, ease: "back.out(3)" }, 0.1 + (i % 20) * 0.02 + Math.floor(i / 20) * 0.09));
    K.fadeIn($("n200"), 0.3, 0.3);
    // the count lands on 200 as «200» is said
    K.counter(K.$("#n200"), 0, 200, 0.3, Math.max(0.8, at("c1", "200", 0.3) - 0.3), { fmt: (n) => `${Math.round(n)}` });
    // keep the label under the number: the counter writes the text, the label sits apart
    const lbl = K.add(`<div class="big" style="top:1220px;font-size:48px;direction:rtl;color:#b9aef5">حريف في الشهر</div>`);
    K.fadeIn(lbl, 0.6, 0.3);
    for (let k = 0; k < 6; k++) K.sfx("tick", 0.3 + k * 0.2, -6);

    /* c2 — each comes back once more */
    // «+1» as «يزيد» is said; every one of them turns as «يرجع مرّة» is
    K.pop($("plus1"), at("c2", "يزيد", -0.08), { from: 0.5 });
    K.sfx("pop", at("c2", "يزيد", -0.02));
    tl.to(dots, { backgroundColor: "#12b76a", duration: 0.2, stagger: { each: 0.006, from: "random" } }, at("c2", "يرجع"));
    tl.to(dots, { scale: 1.25, duration: 0.15, yoyo: true, repeat: 1, stagger: { each: 0.006, from: "random" } }, at("c2", "يرجع"));
    K.sfx("sparkle", at("c2", "يرجع", 0.08));

    /* c3 — 200 more coffees */
    tl.to([$("dots"), $("n200"), lbl, $("plus1")], { autoAlpha: 0, y: -60, duration: 0.3, ease: "power2.in" }, at("c3", -0.15));
    K.pop($("cups200"), at("c3", 0), { from: 0.4 });
    K.rise($("lbl200"), at("c3", 0.12), { y: 30 });
    K.sfx("impact", at("c3", 0.02));

    /* c4 — × 12: 2400 a year */
    tl.to([$("cups200"), $("lbl200")], { autoAlpha: 0, scale: 0.8, duration: 0.25 }, at("c4", -0.1));
    K.pop($("x12"), at("c4", 0), { from: 0.5 });
    K.sfx("whoosh", at("c4", 0));
    // the year's count runs while «2400» is being said, and lands as it ends («قهوة»)
    const y0 = at("c4", "العام", 0.1), y1 = at("c4", "قهوة", 0.05);
    K.fadeIn($("n2400"), y0 - 0.04, 0.2);
    K.counter(K.$("#n2400"), 200, 2400, y0, Math.max(0.8, y1 - y0), { sound: "tick", every: 0.07 });
    K.rise($("lbl2400"), y0 + 0.2, { y: 30 });
    K.$$("#cups i").forEach((c, i) => K.pop(c, y0 + 0.1 + i * 0.04, { from: 0.3, dur: 0.25 }));
    K.sfx("win", y1, -4);

    /* c5 — without ads, without discounts */
    tl.to([$("x12"), $("n2400"), $("lbl2400"), $("cups")], { autoAlpha: 0, y: -40, duration: 0.25, ease: "power2.in" }, at("c5", -0.15));
    K.pop($("no1"), at("c5", 0.02), { from: 0.6 });
    tl.to($("s1"), { "--k": 1, duration: 0.25 }, at("c5", "إشهار", 0.3));
    K.sfx("scratch", at("c5", "إشهار", 0.32));
    K.pop($("no2"), at("c5", "ومن", -0.05), { from: 0.6 });
    tl.to($("s2"), { "--k": 1, duration: 0.25 }, at("c5", "ريميز", 0.25));
    K.sfx("scratch", at("c5", "ريميز", 0.27));
    gsap.set([$("s1"), $("s2")], { "--k": 0 });

    /* c6–c7 — one reason («سبب واحد»), then what it is: the card in his phone */
    tl.to([$("no1"), $("no2")], { autoAlpha: 0, x: 200, duration: 0.3, ease: "power2.in" }, at("c6", -0.1));
    const one = K.add(`<div class="big" style="top:800px;font-size:150px;direction:rtl;color:#ffd23f">سبب واحد</div>`);
    K.pop(one, at("c6", 0), { from: 0.5 });
    K.sfx("impact", at("c6", 0.03), -4);
    K.out(one, at("c7", -0.2), { dur: 0.2 });
    const ph = K.phone({ src: S + "v2-cafe-card-7.png", x: 290, y: 330, w: 500, z: 12 });
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 900, rotation: 8 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.55, ease: "back.out(1.3)" }, at("c7", -0.15));
    K.sfx("whoosh", at("c7", -0.15));
    tl.to(ph, { autoAlpha: 0, scale: 0.85, duration: 0.3 }, at("c8", -0.2));

    /* c8 — every coffee a tampon, the eighth is free */
    const card = K.pass({ name: "قهوة الحومة", color: "#6c47ff", goal: 8, stamps: 4, gift: "قهوة بلاش", icon: "coffee", x: 110, y: 600, w: 860, size: 38, z: 22 });
    K.pop(card, at("c8", -0.1), { from: 0.7 });
    // a coffee, a tampon — and the eighth as «والثامنة» is said, free on «بلاش»
    card.stamp(5, at("c8", "قهوة", 0.1)); card.stamp(6, at("c8", "تامبون")); card.stamp(7, at("c8", "تامبون", 0.4)); card.stamp(8, at("c8", "والثامنة", 0.15));
    K.burst(540, 760, at("c8", "بلاش"), { n: 18, r: 300 });
    K.sfx("win", at("c8", "بلاش"), -5);

    /* c9 — and the math keeps going by itself */
    K.out(card, at("c9", -0.15), { dur: 0.25 });
    const n = K.add(`<div class="big" style="top:1100px;font-size:120px;color:#ffd23f">2400</div>`);
    K.fadeIn(n, at("c9", 0.04), 0.2);
    K.counter(n, 2400, 2880, at("c9", 0.08), Math.max(1, end("c9") - at("c9")), { sound: "tick", every: 0.1 });
    tl.to(K.$("#upl"), { strokeDashoffset: 0, duration: Math.max(0.8, end("c9") - at("c9")), ease: "power2.out" }, at("c9", 0));
    K.fadeIn($("up"), at("c9", 0), 0.1);
    gsap.set($("up"), { autoAlpha: 0 });

    K.endcard(at("c10", -0.5), { tag: "كارط الفيدليتي متاعك، *في تليفون الحريف*", offer: "جرّب Pointili" });
  },
};
