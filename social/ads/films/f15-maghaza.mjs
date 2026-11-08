/**
 * f15 — «الماغازة» (the store): what if tampons became money? With Pointili's store, the customer
 * collects tampons each time he buys and trades them for things from your store — a juice for 10,
 * a sandwich for 25 (the owner sets the things and their price); he chooses, pays in tampons,
 * shows the code at the till, and you hand it over. The app's own words (store*). An arcade look.
 * Female voice.
 */
const ITEMS = [["🧃", "عصير", 10], ["🥪", "سندويتش", 25], ["☕", "قهوة", 6], ["🍰", "ديسار", 15]];

export default {
  title: "الماغازة",
  voice: "coral",
  music: { style: "comic" },
  lead: 0.25,
  tail: 4,
  lines: [
    { id: "n1", say: "وكان التامبونات *تولّي فلوس*؟" },
    { id: "n2", say: "مع *الماغازة* في Pointili:" },
    { id: "n3", say: "الحريف يلمّ تامبونات *كل مرّة يشري*،" },
    { id: "n4", say: "ويبدّلهم *بحاجات من الماغازة* متاعك." },
    { id: "n5", say: "عصير *بعشرة* تامبونات، سندويتش *بخمسة وعشرين*.." },
    { id: "n6", say: "انت تحط الحاجات، وانت *تحط السوم*." },
    { id: "n7", say: "هو يختار، *ويخلّص بالتامبونات*." },
    { id: "n8", say: "يورّيك الكود في الكاسة، *وتسلّمهالو*." },
    { id: "n9", say: "وكل ما يلمّ أكثر.. *يرجع أكثر*." },
    { id: "n10", say: "جرّب Pointili بلاش، واكتب «ماغازة» في الكومونتار.", sub: false },
  ],
  css: `
#stage{background:radial-gradient(100% 70% at 50% 15%,#3a1c7a,#170b38 70%)}
.pix{position:absolute;inset:0;background-image:linear-gradient(rgb(255 255 255/.04) 2px,transparent 2px),linear-gradient(90deg,rgb(255 255 255/.04) 2px,transparent 2px);background-size:60px 60px}
.coin{position:absolute;width:120px;height:120px;border-radius:50%;background:radial-gradient(circle at 35% 30%,#fff3b0,#ffd23f 45%,#e0a800);box-shadow:inset 0 -8px 0 rgb(0 0 0/.15),0 10px 20px rgb(0 0 0/.35);display:grid;place-items:center;font-weight:700;font-size:58px;color:#8a5a00;visibility:hidden;opacity:0}
.neon{position:absolute;left:50%;top:380px;transform:translateX(-50%);white-space:nowrap;font-weight:700;font-size:150px;color:#fff;text-shadow:0 0 18px #ff3e8a,0 0 40px #ff3e8a,0 0 80px #ff3e8a;visibility:hidden;opacity:0}
.bal{position:absolute;left:50%;top:620px;transform:translateX(-50%);display:flex;align-items:center;gap:24px;white-space:nowrap;background:rgb(255 255 255/.08);border:4px solid rgb(255 255 255/.2);border-radius:999px;padding:20px 50px 26px;color:#fff;visibility:hidden;opacity:0}
.bal b{font-size:120px;font-weight:700;direction:ltr;color:#ffd23f;min-width:180px;text-align:center}
.bal span{font-size:44px;font-weight:600}
.shop{position:absolute;inset:0;background:#f4f3f9;padding:118px 24px 0;direction:rtl}
.shop h3{font-size:36px;font-weight:700}
.shop p{font-size:22px;color:#77748a;margin-top:4px}
.shop .bl{margin-top:16px;display:inline-flex;gap:10px;align-items:center;background:#fff4d6;color:#b07a00;font-weight:700;font-size:24px;padding:8px 18px 12px;border-radius:999px}
.shop .items{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:20px}
.shop .it{background:#fff;border-radius:24px;padding:18px 10px 20px;text-align:center}
.shop .it i{display:block;font-style:normal;font-size:70px}
.shop .it b{display:block;font-size:28px;margin-top:6px}
.shop .it span{display:inline-block;margin-top:8px;font-size:22px;font-weight:700;color:#6c47ff;background:#efeaff;padding:6px 14px 9px;border-radius:999px}
.shop .buy{margin-top:20px;background:#6c47ff;color:#fff;text-align:center;font-weight:700;font-size:28px;padding:18px 0 22px;border-radius:22px;visibility:hidden;opacity:0}
.own{position:absolute;inset:0;background:#f4f3f9;padding:118px 24px 0;direction:rtl}
.own h3{font-size:34px;font-weight:700}
.own .add{margin-top:20px;background:#fff;border-radius:22px;padding:20px}
.own .add div{height:66px;border-radius:16px;background:#f4f3f9;display:flex;align-items:center;padding:0 18px;font-size:26px;font-weight:600;margin-top:12px}
.own .add .btn{background:#6c47ff;color:#fff;justify-content:center}
.order{position:absolute;inset:0;background:#f4f3f9;padding:130px 24px 0;direction:rtl;text-align:center}
.order b{display:block;font-size:34px}
.order small{display:block;font-size:22px;color:#77748a;margin-top:6px}
.order .code{margin:30px auto 0;width:300px;padding:24px;border-radius:26px;background:#fff;border:5px solid #ff6b4a;font-size:56px;font-weight:700;direction:ltr;letter-spacing:4px}
.order .give{margin-top:30px;background:#12b76a;color:#fff;font-weight:700;font-size:30px;padding:18px 0 22px;border-radius:22px;visibility:hidden;opacity:0}
`,
  html: () => `
<i class="pix"></i>
${[[160, 520], [470, 470], [780, 540], [300, 760], [640, 780]].map(([x, y], i) => `<span class="coin" id="co${i}" style="left:${x}px;top:${y}px">★</span>`).join("")}
<div class="neon" id="neon">الماغازة</div>
<div class="bal" id="bal"><b id="bn">0</b><span>تامبون عندك</span></div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("pill");
    const P = { x: 290, y: 330, w: 500 };
    const ITEMS = [["🧃", "عصير", 10], ["🥪", "سندويتش", 25], ["☕", "قهوة", 6], ["🍰", "ديسار", 15]];

    /* n1 — what if tampons were money? stamps turn into coins */
    const c0 = K.pass({ name: "Snack Amine", color: "#6c47ff", goal: 8, stamps: 5, gift: "سندويتش بلاش", icon: "star", x: 110, y: 820, w: 860, size: 36, z: 22 });
    K.pop(c0, 0.05, { from: 0.8 });
    K.$$(".coin").forEach((c, i) => { tl.fromTo(c, { autoAlpha: 0, y: 500, scale: 0.4 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5, ease: "back.out(2)" }, 0.6 + i * 0.12); K.sfx("coin", 0.7 + i * 0.12, -4); });
    K.$$(".coin").forEach((c, i) => tl.to(c, { rotationY: 360, duration: 0.8, repeat: 2, ease: "none" }, 0.9 + i * 0.1));
    tl.to([c0, ...K.$$(".coin")], { autoAlpha: 0, duration: 0.3 }, at("n2", -0.15));

    /* n2 — the store */
    K.pop($("neon"), at("n2", 0), { from: 0.6 });
    tl.fromTo($("neon"), { autoAlpha: 0.4 }, { autoAlpha: 1, duration: 0.06, repeat: 5, yoyo: true, immediateRender: false }, at("n2", 0.1));
    K.sfx("buzz", at("n2", 0.1), -8);
    K.sfx("ding", at("n2", 0.5));

    /* n3 — he collects tampons every time he buys: the balance climbs */
    K.pop($("bal"), at("n3", -0.05), { from: 0.7 });
    K.counter(K.$("#bn"), 0, 32, at("n3", 0.1), Math.max(1.2, end("n3") - at("n3") - 0.1), { sound: "coin", every: 0.25 });
    tl.to([$("neon"), $("bal")], { autoAlpha: 0, y: -80, duration: 0.3 }, at("n4", -0.15));

    /* n4–n5 — he trades them for things in your store */
    const ph = K.phone({ ...P, z: 12 });
    const shop = ph.put(`<div class="shop"><h3>الماغازة</h3><p>اختار شنوّة تحب، وخلّص بالتامبونات</p><span class="bl">★ <span id="pb">32</span> تامبون عندك</span>
      <div class="items">${ITEMS.map(([e, n, c], i) => `<div class="it" id="it${i}"><i>${e}</i><b>${n}</b><span>${c} تامبون</span></div>`).join("")}</div>
      <div class="buy" id="buy">خوذهم بـ10 تامبون</div></div>`);
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 200 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("n4", -0.05));
    K.sfx("swish", at("n4", 0));
    K.$$(".it", shop).forEach((it, i) => K.pop(it, at("n4", 0.4 + i * 0.12), { from: 0.7, dur: 0.3 }));
    tl.to(K.$("#it0"), { scale: 1.08, boxShadow: "0 0 0 5px #6c47ff", duration: 0.25, yoyo: true, repeat: 1 }, at("n5", 0.1));
    tl.to(K.$("#it1"), { scale: 1.08, boxShadow: "0 0 0 5px #6c47ff", duration: 0.25, yoyo: true, repeat: 1 }, at("n5", 1.3));
    K.sfx("tick", at("n5", 0.1)); K.sfx("tick", at("n5", 1.3));
    tl.to(ph, { autoAlpha: 0, x: -200, duration: 0.3 }, at("n6", -0.2));

    /* n6 — you put the things, you set the price */
    const ph2 = K.phone({ ...P, z: 13 });
    ph2.put(`<div class="own"><h3>الماغازة</h3><p style="font-size:22px;color:#77748a;margin-top:4px">شنوّة يشريو الحرفاء بالتامبونات متاعهم</p>
      <div class="add"><b style="font-size:26px">زيد حاجة</b><div id="an"></div><div id="ac"></div><div class="btn">سجّل</div></div></div>`);
    gsap.set(ph2, { autoAlpha: 0 });
    tl.fromTo(ph2, { autoAlpha: 0, x: 200 }, { autoAlpha: 1, x: 0, duration: 0.4 }, at("n6", -0.1));
    const a0 = at("n6", 0.3);
    K.each((t) => { K.$("#an").textContent = t > a0 ? "🍦 جلاطي".slice(0, Math.max(0, Math.floor((t - a0) / 0.08))) : ""; K.$("#ac").textContent = t > a0 + 0.9 ? "12 تامبون" : ""; });
    for (let k = 0; k < 6; k++) K.sfx("key", a0 + k * 0.08, -5);
    K.sfx("key", a0 + 0.9, -4);
    tl.to(ph2, { autoAlpha: 0, x: -200, duration: 0.3 }, at("n7", -0.2));

    /* n7 — he chooses, pays in tampons */
    tl.to(ph, { autoAlpha: 1, x: 0, duration: 0.4 }, at("n7", -0.1));
    tl.to(K.$("#it0"), { boxShadow: "0 0 0 6px #6c47ff", duration: 0.2 }, at("n7", 0.3));
    K.tap(400, P.y + 15 + 1082 * 0.55, at("n7", 0.3));
    K.pop(K.$("#buy"), at("n7", 0.5), { from: 0.8 });
    K.tap(540, P.y + 15 + 1082 * 0.86, at("n7", 1.1));
    K.counter(K.$("#pb"), 32, 22, at("n7", 1.2), 0.6);
    K.sfx("coin", at("n7", 1.2));
    tl.to(ph, { autoAlpha: 0, duration: 0.3 }, at("n8", -0.2));

    /* n8 — the code at the till, you hand it over */
    const ph3 = K.phone({ ...P, z: 14 });
    ph3.put(`<div class="order"><b>الطلبية متاعك حاضرة!</b><small>ورّي الكود في الكاسة</small><div class="code">482 913</div><div class="give" id="give">✓ سلّمو: عصير 🧃</div></div>`);
    gsap.set(ph3, { autoAlpha: 0 });
    tl.fromTo(ph3, { autoAlpha: 0, y: 160 }, { autoAlpha: 1, y: 0, duration: 0.4 }, at("n8", -0.1));
    K.sfx("ding", at("n8", 0.2));
    K.pop(K.$("#give"), at("n8", 1.3), { from: 0.7 });
    K.sfx("win", at("n8", 1.35), -4);
    tl.to(ph3, { autoAlpha: 0, duration: 0.3 }, at("n9", -0.2));

    /* n9 — the more he collects, the more he comes back */
    tl.set($("bal"), { y: 0 }, at("n9", -0.2));
    K.pop($("bal"), at("n9", -0.1), { from: 0.7 });
    K.each((t) => { if (t >= at("n9", -0.1)) K.$("#bn").textContent = String(Math.round(22 + 30 * Math.min(1, Math.max(0, (t - at("n9", 0.2)) / 1.5)))); });
    K.$$(".coin").forEach((c, i) => { tl.fromTo(c, { autoAlpha: 0, y: -400 }, { autoAlpha: 1, y: 0, duration: 0.5, ease: "bounce.out" }, at("n9", 0.2 + i * 0.12)); K.sfx("coin", at("n9", 0.4 + i * 0.12), -4); });

    K.endcard(at("n10", -0.1), { tag: "اكتب *«ماغازة»* في الكومونتار", offer: "جرّب Pointili بلاش", keyword: "ماغازة", typeAt: 1.2 });
  },
};
