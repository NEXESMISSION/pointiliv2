/**
 * f3 — «رد على كومونتار» (a reply to a comment): a café owner asks if his customers must download
 * an app to get their tampon. No — and here is the whole of it, on the app's real screens: the
 * code on the counter, an account in ten seconds, the tampon landing, the code that changes by
 * itself. Modelled on the «reply to a comment» reel: the question stickered on, small labels at
 * the top, the product doing it, «link in bio / comment».
 */
const S = "../../assets/screens/";

export default {
  title: "رد على كومونتار",
  music: { style: "tech" },
  lead: 0.25,
  tail: 3.6,
  lines: [
    { id: "r1", say: "مولى قهوة يسأل: الحريف لازمو يحمّل أبليكاسيون باش ياخو التامبون؟", sub: false, after: 0.3 },
    { id: "r2", say: "لا. وهاذي *مبدأ* عندنا.", after: 0.3 },
    { id: "r3", say: "يسكاني الكود اللي على الكونتوار، بكاميرا تليفونو.", sub: "يسكاني الكود *بالكاميرا*", after: 0.15 },
    { id: "r4", say: "أوّل مرّة، يعمل كونت بالنومرو متاعو، في عشر ثواني.", sub: "كونت *في عشر ثواني*", after: 0.15 },
    { id: "r5", say: "والتامبون يطيح طول في الكارط متاعو.", sub: "والتامبون *يطيح طول*", after: 0.2 },
    { id: "r6", say: "لا أبليكاسيون يحمّلو، لا كارط كرتون تضيع.", sub: "*بلا أبليكاسيون*، بلا كرتون", after: 0.2 },
    { id: "r7", say: "والكود يتبدّل وحدو، ويخدم مرّة برك: ما يتسرقش.", sub: "الكود *يتبدّل وحدو*", after: 0.25 },
    { id: "r8", say: "جرّب Pointili بلاش: الرابط في البيو، ولا اكتب «كارط» في الكومونتار.", sub: false },
  ],
  css: `
#stage{background:#2a1d16}
.back{position:absolute;inset:0;background:radial-gradient(120% 70% at 50% 0%,#6b4b38,#2a1d16 75%)}
.back .bok{opacity:.55}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0}
.sub-top{top:150px;bottom:auto}
.sub-top>span{background:#fff;color:var(--ink);font-weight:700;font-size:44px;line-height:1.3;padding:14px 32px 20px;border-radius:26px;box-shadow:0 12px 30px -12px rgb(0 0 0/.5)}
.wall{position:absolute;left:0;right:0;top:0;height:1150px;background:radial-gradient(120% 80% at 50% 10%,#7a5a45,#3a281e 70%)}
.bok{position:absolute;border-radius:50%;background:radial-gradient(circle,rgb(255 214 150/.55),rgb(255 214 150/0) 70%)}
.counter{position:absolute;left:-40px;right:-40px;top:1050px;height:950px;background:repeating-linear-gradient(92deg,rgb(0 0 0/.06) 0 3px,transparent 3px 26px),linear-gradient(180deg,#a06a43,#7b4c2c 40%,#5e3a22);box-shadow:inset 0 14px 0 #c48a5c,inset 0 22px 30px rgb(0 0 0/.25)}
.stand{position:absolute;width:260px;height:70px;border-radius:0 0 30px 30px;background:#1b1a22}
.wtag{position:absolute;left:50%;top:330px;transform:translateX(-50%);white-space:nowrap;background:#e0322d;color:#fff;font-weight:700;font-size:42px;padding:14px 30px 20px;border-radius:18px;z-index:45;visibility:hidden;opacity:0}
.badge{position:absolute;display:flex;align-items:center;gap:16px;background:var(--mint);color:#fff;font-weight:700;font-size:50px;padding:20px 40px 26px;border-radius:999px;box-shadow:0 20px 40px -16px rgb(18 183 106/.7);z-index:46;visibility:hidden;opacity:0}
.badge svg{width:50px;height:50px}
.cam{position:absolute;inset:0;background:#000;overflow:hidden}
.cam .pic{position:absolute;left:0;top:0;width:1080px;height:1920px}
.cam .pic img{position:absolute;left:40px;top:-357px;width:1000px}
.cam .br{position:absolute;width:120px;height:120px;border:12px solid #fff;z-index:3}
.cam .yel{position:absolute;left:150px;top:470px;width:780px;height:780px;border:10px solid #ffd60a;border-radius:30px;z-index:3;visibility:hidden;opacity:0}
.cam .chip{position:absolute;left:50%;top:1240px;transform:translateX(-50%);display:flex;align-items:center;gap:14px;background:#ffd60a;color:#111;font-weight:700;font-size:44px;padding:16px 34px 22px;border-radius:999px;direction:ltr;z-index:3;visibility:hidden;opacity:0}
.cam .shut{position:absolute;left:50%;bottom:250px;width:150px;height:150px;margin-left:-75px;border-radius:50%;border:10px solid #fff;z-index:3}
.cam .shut:after{content:"";position:absolute;inset:10px;border-radius:50%;background:#fff}
.cam .scan{position:absolute;left:180px;right:180px;top:480px;height:10px;border-radius:5px;background:#ffd60a;box-shadow:0 0 30px 10px rgb(255 214 10/.55);z-index:3}
.field{position:absolute;height:4.4%;display:flex;align-items:center;background:#fff;font-weight:600;font-size:23px;color:#0f0e17;white-space:nowrap;padding:0 4px}
.ring{position:absolute;width:150px;height:150px;border-radius:50%;border:12px solid rgb(255 255 255/.35);border-top-color:#fff;z-index:30}
.paperx{position:absolute;width:300px;height:180px;border-radius:16px;background:#efe0c2;box-shadow:0 20px 40px -20px rgb(0 0 0/.6);z-index:30}
.paperx:after{content:"";position:absolute;left:-30px;right:-30px;top:84px;height:14px;border-radius:7px;background:var(--coral);transform:rotate(-24deg)}
.bio{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:14px;white-space:nowrap;background:#fff;color:var(--ink);font-weight:700;font-size:46px;padding:18px 38px 24px;border-radius:999px;z-index:85;visibility:hidden;opacity:0;box-shadow:0 18px 40px -16px rgb(20 8 80/.6)}
.bio svg{width:44px;height:44px;color:var(--brand)}
`,
  html: () => `
<div class="back">${[[80, 260, 300], [700, 140, 340], [860, 900, 220], [40, 1100, 260], [520, 1500, 300]].map(([x, y, r]) => `<i class="bok" style="left:${x}px;top:${y}px;width:${r}px;height:${r}px"></i>`).join("")}</div>
<div class="sc" id="c1">
  <div class="wall"></div>
  ${[[120, 160, 260], [760, 90, 300], [880, 520, 180], [60, 640, 220], [460, 300, 160]].map(([x, y, r]) => `<i class="bok" style="left:${x}px;top:${y}px;width:${r}px;height:${r}px"></i>`).join("")}
  <div class="counter"></div>
  <svg class="abs" id="cup" style="left:70px;top:1180px;width:330px" viewBox="0 0 200 140"><ellipse cx="100" cy="112" rx="92" ry="24" fill="#f4efe9"/><ellipse cx="100" cy="108" rx="72" ry="16" fill="#e3dad0"/><path d="M48 52h104l-10 50a14 14 0 0 1-14 12H72a14 14 0 0 1-14-12z" fill="#fff"/><path d="M152 62c22-4 26 24 4 30" stroke="#fff" stroke-width="10" fill="none"/><ellipse cx="100" cy="52" rx="52" ry="12" fill="#6b3f22"/><ellipse cx="96" cy="50" rx="30" ry="6" fill="#a8703f"/></svg>
</div>
<div class="sc" id="c2">
  <div class="cam"><div class="pic" id="pic"><img src="${S}v2-food-counter.png"></div>
    <i class="br" style="left:120px;top:440px;border-right:0;border-bottom:0;border-radius:40px 0 0 0"></i><i class="br" style="right:120px;top:440px;border-left:0;border-bottom:0;border-radius:0 40px 0 0"></i>
    <i class="br" style="left:120px;top:1160px;border-right:0;border-top:0;border-radius:0 0 0 40px"></i><i class="br" style="right:120px;top:1160px;border-left:0;border-top:0;border-radius:0 0 40px 0"></i>
    <i class="scan" id="scan"></i><i class="yel" id="yel"></i>
    <span class="chip" id="chip"><svg viewBox="0 0 24 24" width="40" height="40" fill="none" stroke="currentColor" stroke-width="2.4"><circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/></svg>pointili.online</span>
    <i class="shut"></i></div>
</div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    const S = "../../assets/screens/";
    K.subs("top");

    /* 1 — the question, on the counter where the code is */
    K.scene($("c1"), 0, at("r3", -0.1), { inn: "cut", dur: 0.3 });
    const ph = K.phone({ src: S + "v2-food-counter.png", x: 470, y: 520, w: 430, z: 12 });
    gsap.set(ph, { rotation: -5, transformOrigin: "50% 100%" });
    K.drift($("c1"), 0, at("r3"), { from: 1.0, to: 1.06 });
    K.drift(ph, 0, at("r3"), { from: 1.0, to: 1.04, y: -1 });
    const tag = K.add(`<div class="wtag">مولات القهاوي والريستوات</div>`);
    K.pop(tag, 0.15, { from: 0.7 });
    const q = K.reply({ user: "cafe.sfax", q: "الحريف لازمو يحمّل *أبليكاسيون* باش ياخو التامبون؟", x: 110, y: 430 });
    K.pop(q, 0.45, { from: 0.6 });
    K.sfx("pop", 0.5);
    const no = K.add(`<div class="badge" style="left:120px;top:1180px">${K.ICON.check}<span>لا، ماكش محتاج</span></div>`);
    K.pop(no, at("r2", 0), { from: 0.4 });
    K.sfx("ding", at("r2", 0.1));
    [tag, q, no].forEach((e) => K.out(e, at("r3", -0.25), { dur: 0.2 }));
    tl.to(ph, { autoAlpha: 0, duration: 0.2 }, at("r3", -0.15));

    /* 2 — the camera finds the code */
    K.scene($("c2"), at("r3", -0.15), at("r4", 0), { inn: "zoom", dur: 0.35 });
    K.sfx("whoosh", at("r3", -0.15));
    K.drift($("pic"), at("r3"), at("r4"), { from: 1.0, to: 1.05 });
    tl.fromTo($("scan"), { y: 0, autoAlpha: 1 }, { y: 760, duration: 0.7, ease: "sine.inOut", yoyo: true, repeat: 1 }, at("r3", 0.25));
    tl.set($("scan"), { autoAlpha: 0 }, at("r3", 1.65));
    K.pop($("yel"), at("r3", 1.6), { from: 1.15, dur: 0.3 });
    K.sfx("scan", at("r3", 1.65));
    K.pop($("chip"), at("r3", 1.8), { from: 0.7 });
    K.tap(540, 1270, at("r3", 2.3));

    /* 3 — the first time: an account, with his number */
    const p2 = K.phone({ src: S + "live-join.png", x: 290, y: 330, w: 500, z: 20 });
    gsap.set(p2, { autoAlpha: 0 });
    tl.fromTo(p2, { autoAlpha: 0, y: 140, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.45 }, at("r4", -0.1));
    // what he types, laid over the empty fields of the real screen
    const fields = [
      p2.put(`<span class="field" style="top:36.7%;left:45%;right:8.5%;justify-content:flex-start">سامي</span>`),
      p2.put(`<span class="field" style="top:48.1%;left:24.5%;right:42%;justify-content:flex-start;direction:ltr">98 765 432</span>`),
      p2.put(`<span class="field" style="top:59.6%;left:30%;right:8.5%;justify-content:flex-start;letter-spacing:5px">••••••••</span>`),
    ];
    fields.forEach((f, i) => {
      gsap.set(f, { autoAlpha: 0 });
      tl.to(f, { autoAlpha: 1, duration: 0.05 }, at("r4", 0.35 + i * 0.6));
      for (let k = 0; k < 3; k++) K.sfx("key", at("r4", 0.35 + i * 0.6 + k * 0.08), -3);
    });
    K.tap(540, 330 + 15 + 1017 * 0.72, at("r4", 2.3));
    /* 4 — the tampon lands, straight on his card */
    const st = p2.screen(S + "v2-food-stamped.png", at("r5", -0.05), "slide");
    K.sfx("swish", at("r5", -0.05));
    K.sfx("stamp", at("r5", 0.45));
    K.burst(540, 560, at("r5", 0.45), { n: 16, r: 260 });
    const plus = K.pill("+1 تامبون", { y: 300, cls: "mint", z: 40 });
    K.pop(plus, at("r5", 0.5), { from: 0.5 });
    K.out(plus, at("r6", -0.2));

    /* 5 — no app, no paper */
    p2.screen(S + "v2-cafe-home.png", at("r6", -0.05), "fade");
    const n1 = K.pill("بلا أبليكاسيون", { x: 120, y: 1440, cls: "coral", icon: "nodl", z: 40 });
    K.pop(n1, at("r6", 0.1), { from: 0.6 });
    K.sfx("pop", at("r6", 0.12));
    const px = K.add(`<div class="paperx" style="left:640px;top:1410px"></div>`);
    K.pop(px, at("r6", 0.75), { from: 0.6 });
    K.sfx("scratch", at("r6", 0.85));
    tl.to(px, { y: 520, rotation: 28, autoAlpha: 0, duration: 0.7, ease: "power2.in" }, at("r6", 1.4));
    K.out(n1, at("r7", -0.2));

    /* 6 — the code changes by itself, works once */
    p2.screen(S + "v2-food-counter.png", at("r7", -0.05), "slide");
    K.sfx("swish", at("r7", -0.05));
    const ring = K.add(`<i class="ring" style="left:830px;top:640px"></i>`);
    K.pop(ring, at("r7", 0.2), { from: 0.5 });
    tl.to(ring, { rotation: 720, duration: end("r7") - at("r7"), ease: "none" }, at("r7", 0.2));
    tl.fromTo(K.$$("img", p2.scr).at(-1), { filter: "brightness(1)" }, { filter: "brightness(1.35)", duration: 0.12, yoyo: true, repeat: 1 }, at("r7", 1.2));
    K.sfx("tick", at("r7", 1.2));
    tl.to([p2, ring], { autoAlpha: 0, duration: 0.25 }, at("r8", -0.15));

    /* 7 — try it free: the link in the bio, or a comment */
    K.endcard(at("r8", -0.1), { tag: "اكتب *«كارط»* في الكومونتار، ولا الرابط في البيو", offer: "جرّب Pointili بلاش", keyword: "كارط", typeAt: 1.1 });
  },
};
