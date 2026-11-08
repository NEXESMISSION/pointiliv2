/**
 * f12 — «العدّاد» (the clock): customers collect tampons and vanish for a month. Turn the clock on
 * (off until the owner turns it on); choose the days (15); a card not stamped in 15 days goes back
 * to zero; the customer sees the countdown on the card («ترجع للصفر بعد 3 أيام») and comes back;
 * holidays, Ramadan: pause it, nobody loses a tampon. The app's own words (clock*, reset*).
 */
export default {
  title: "العدّاد",
  voice: "ash",
  music: { style: "tech" },
  lead: 0.25,
  tail: 4,
  lines: [
    { id: "j1", say: "عندك حرفاء يلمّو تامبونات.. *ويغيبو شهر*؟" },
    { id: "j2", say: "*شعّل العدّاد*." },
    { id: "j3", say: "انت تختار الأيام: *15 يوم* مثلا." },
    { id: "j4", say: "اللي ما خذاش تامبون في 15 يوم،" },
    { id: "j5", say: "الكارط متاعو *ترجع للصفر*." },
    { id: "j6", say: "وهو يشوف *العدّاد* في الكارط متاعو:" },
    { id: "j7", say: "«ترجع للصفر *بعد 3 أيام*»." },
    { id: "j8", say: "يرجعلك *قبل ما يخسرهم*." },
    { id: "j9", say: "عطلة؟ رمضان؟ *وقّف العدّاد*، وما حد يخسر حتى تامبون." },
    { id: "j10", say: "جرّب Pointili بلاش، الرابط في البيو.", sub: false },
  ],
  css: `
#stage{background:radial-gradient(100% 70% at 50% 20%,#1d2a5a,#0b1030 75%)}
.ring{position:absolute;left:190px;top:330px;width:700px;height:700px}
.big{position:absolute;left:0;right:0;top:500px;text-align:center;color:#fff;font-weight:700;font-size:250px;direction:ltr;visibility:hidden;opacity:0}
.big small{display:block;font-size:56px;opacity:.75;direction:rtl}
.cal{position:absolute;left:330px;top:340px;width:420px;border-radius:34px;overflow:hidden;background:#fff;box-shadow:0 30px 60px -30px rgb(0 0 0/.6);text-align:center;visibility:hidden;opacity:0}
.cal b{display:block;background:#ff6b4a;color:#fff;font-size:40px;padding:14px 0 20px}
.cal span{display:block;font-size:150px;font-weight:700;color:#0f0e17;direction:ltr;line-height:1.25}
.cal small{display:block;font-size:34px;color:#6b6880;padding-bottom:20px}
.btn{position:absolute;left:50%;top:620px;transform:translateX(-50%);white-space:nowrap;background:#6c47ff;color:#fff;font-weight:700;font-size:64px;padding:28px 70px 36px;border-radius:999px;box-shadow:0 0 0 0 rgb(108 71 255/.5);visibility:hidden;opacity:0}
.chip{position:absolute;left:50%;transform:translateX(-50%);display:inline-flex;align-items:center;gap:14px;white-space:nowrap;font-weight:700;font-size:44px;padding:14px 34px 20px;border-radius:999px;visibility:hidden;opacity:0}
.days{position:absolute;left:150px;right:150px;top:520px;display:grid;grid-template-columns:repeat(3,1fr);gap:22px}
.days span{background:rgb(255 255 255/.08);border:3px solid rgb(255 255 255/.2);color:#fff;border-radius:30px;text-align:center;font-weight:700;font-size:52px;padding:30px 0 38px;visibility:hidden;opacity:0}
.ex{position:absolute;left:120px;right:120px;top:800px;text-align:center;color:#cfd6ff;font-size:40px;line-height:1.5;visibility:hidden;opacity:0}
.cdwn{position:absolute;left:110px;right:110px;top:1000px;display:flex;justify-content:center;z-index:40}
.cdwn span{display:inline-flex;align-items:center;gap:14px;background:#fff4d6;color:#b07a00;font-weight:700;font-size:40px;padding:14px 32px 20px;border-radius:999px;box-shadow:0 14px 28px -14px rgb(0 0 0/.5);visibility:hidden;opacity:0}
.pause{position:absolute;left:50%;top:560px;transform:translateX(-50%);display:flex;flex-direction:column;align-items:center;gap:26px;visibility:hidden;opacity:0}
.pause .b{white-space:nowrap;background:#fff;color:#0f0e17;font-weight:700;font-size:56px;padding:24px 56px 32px;border-radius:999px;display:flex;align-items:center;gap:18px}
.pause .icons{font-size:110px;display:flex;gap:40px}
`,
  html: () => `
<svg class="ring" id="ring" viewBox="0 0 100 100"><circle cx="50" cy="50" r="44" fill="none" stroke="rgb(255 255 255/.1)" stroke-width="5"/><circle id="arc" cx="50" cy="50" r="44" fill="none" stroke="#ffd23f" stroke-width="5" stroke-linecap="round" stroke-dasharray="276.5" stroke-dashoffset="0" transform="rotate(-90 50 50)"/></svg>
<div class="cal" id="cal"><b>غايب</b><span id="dd">0</span><small>يوم</small></div>
<div class="btn" id="on">⏱️ شعّل العدّاد</div>
<div class="chip" id="run" style="top:820px;background:#12b76a;color:#fff">● يخدم</div>
<div class="days" id="days"><span>7 أيّام</span><span id="d15">15 يوم</span><span>30 يوم</span></div>
<div class="ex" id="ex">كان ما خذاش تامبون 15 يوم، الكارط ترجع للصفر.</div>
<div class="big" id="cd">15<small>يوم</small></div>
<div class="cdwn" id="cdw"><span id="cdt">⏳ ترجع للصفر بعد 3 أيام</span></div>
<div class="pause" id="pause"><div class="b">⏸️ وقّف العدّاد</div><div class="icons"><span>🏖️</span><span>🌙</span></div><div class="chip" id="paused" style="position:static;transform:none;background:#8f8ba3;color:#fff">موقوف · ما حد يخسر</div></div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("pill");
    gsap.set($("ring"), { autoAlpha: 0 });

    /* j1 — tampons collected… and a month away */
    const c1 = K.pass({ name: "Pizza Lina", color: "#e5484d", goal: 8, stamps: 5, gift: "بيتزا صغيرة بلاش", icon: "star", x: 110, y: 800, w: 860, size: 36, z: 22 });
    K.pop(c1, 0.1, { from: 0.8 });
    K.pop($("cal"), 0.3, { from: 0.7 });
    K.counter(K.$("#dd"), 0, 30, 0.5, Math.max(1.2, end("j1") - 0.6), { sound: "tick", every: 0.1 });
    tl.to(c1, { filter: "grayscale(.8) brightness(.8)", duration: 0.8 }, end("j1", -0.8));
    tl.to([$("cal"), c1], { autoAlpha: 0, y: -60, duration: 0.3 }, at("j2", -0.2));

    /* j2 — turn the clock on */
    K.pop($("on"), at("j2", 0), { from: 0.6 });
    K.tap(540, 690, at("j2", 0.55));
    K.pop($("run"), at("j2", 0.7), { from: 0.5 });
    K.sfx("ding", at("j2", 0.75));
    tl.to([$("on"), $("run")], { autoAlpha: 0, duration: 0.25 }, at("j3", -0.15));

    /* j3 — you choose the days: 15 */
    K.$$("#days span").forEach((s, i) => K.pop(s, at("j3", 0.05 + i * 0.12), { from: 0.7, dur: 0.3 }));
    tl.to($("d15"), { backgroundColor: "#6c47ff", borderColor: "#9b80ff", duration: 0.2 }, at("j3", 0.9));
    K.sfx("tap", at("j3", 0.9));
    K.rise($("ex"), at("j3", 1.1), { y: 20 });
    tl.to([$("days"), $("ex")], { autoAlpha: 0, duration: 0.25 }, at("j4", -0.15));

    /* j4–j5 — fifteen days without a tampon: back to zero */
    tl.to($("ring"), { autoAlpha: 1, duration: 0.3 }, at("j4", -0.1));
    tl.fromTo(K.$("#arc"), { strokeDashoffset: 0 }, { strokeDashoffset: 276.5, duration: Math.max(1.4, end("j4") - at("j4")), ease: "none" }, at("j4", 0));
    K.fadeIn($("cd"), at("j4", 0), 0.2);
    K.counter(K.$("#cd"), 15, 0, at("j4", 0), Math.max(1.4, end("j4") - at("j4")), { ease: (x) => x, sound: "tick", every: 0.12, fmt: (n) => String(Math.round(n)) });
    tl.to([$("ring"), $("cd")], { autoAlpha: 0, duration: 0.25 }, at("j5", -0.1));
    const c2 = K.pass({ name: "Pizza Lina", color: "#e5484d", goal: 8, stamps: 5, gift: "بيتزا صغيرة بلاش", icon: "star", x: 110, y: 640, w: 860, size: 38, z: 22 });
    K.pop(c2, at("j5", -0.05), { from: 0.8 });
    c2.dots.slice(0, 5).reverse().forEach((d, i) => tl.to(d, { y: 260, rotation: 40, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, at("j5", 0.5 + i * 0.12)));
    K.sfx("swoosh", at("j5", 0.5));
    K.sfx("thud", at("j5", 1.1));
    K.out(c2, at("j6", -0.15));

    /* j6–j7 — he sees the countdown on his card */
    const ph = K.phone({ x: 290, y: 280, w: 500, z: 12 });
    ph.put(`<div style="position:absolute;inset:0;background:#f4f3f9;padding:120px 24px 0;direction:rtl"><b style="font-size:30px">الكارطات متاعي</b></div>`);
    const c3 = K.pass({ name: "Pizza Lina", color: "#e5484d", goal: 8, stamps: 6, gift: "بيتزا صغيرة بلاش", icon: "star", x: 20, y: 230, w: 432, size: 19, parent: ph.scr, z: 4 });
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 160 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("j6", -0.05));
    K.sfx("swish", at("j6", 0));
    K.pop(K.$("#cdt"), at("j7", -0.1), { from: 0.5 });
    tl.fromTo(K.$("#cdt"), { scale: 1 }, { scale: 1.08, duration: 0.35, yoyo: true, repeat: 5, ease: "sine.inOut" }, at("j7", 0.4));
    for (let k = 0; k < 6; k++) K.sfx("tick", at("j7", 0.3 + k * 0.35), -6);

    /* j8 — he comes back before he loses them */
    c3.stamp(7, at("j8", 0.3));
    tl.to(K.$("#cdt"), { backgroundColor: "#e5f8ee", color: "#12b76a", duration: 0.25 }, at("j8", 0.6));
    K.each((t) => { K.$("#cdt").textContent = t >= at("j8", 0.6) ? "✓ ترجع للصفر بعد 15 يوم" : "⏳ ترجع للصفر بعد 3 أيام"; });
    K.burst(540, 620, at("j8", 0.5), { n: 14, r: 220 });
    tl.to([ph, K.$("#cdw")], { autoAlpha: 0, duration: 0.3 }, at("j9", -0.2));

    /* j9 — holidays, Ramadan: pause it */
    K.pop($("pause"), at("j9", 0), { from: 0.7 });
    K.sfx("tap", at("j9", 0.6));
    K.pop($("paused"), at("j9", 1.6), { from: 0.5 });
    K.sfx("ding", at("j9", 1.65), -3);

    K.endcard(at("j10", -0.1), { tag: "العدّاد *انت تشعلو وانت توقفو*", offer: "جرّب Pointili بلاش" });
  },
};
