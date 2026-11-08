/**
 * f8 — «تبيع أونلاين؟» (selling online): a perfume shop on Instagram — a customer buys once and
 * vanishes; with Pointili, after each order the shop makes a tampon link and sends it on
 * WhatsApp; she opens it, the tampon lands on her card; each link works once and does not
 * expire; the shop sees who took it. The app's own words (links*, linkWaText). Female voice.
 */
export default {
  title: "تبيع أونلاين؟",
  voice: "coral",
  music: { style: "warm" },
  lead: 0.25,
  tail: 4,
  lines: [
    { id: "e1", say: "تبيع في *الأنستغرام* ولا الفيسبوك؟" },
    { id: "e2", say: "الحريفة تشري مرّة.. *وتغبر*." },
    { id: "e3", say: "مع Pointili، بعد كل كوموند،" },
    { id: "e4", say: "تعمل *رابط فيه تامبون*، وتبعثو في الواتساب." },
    { id: "e5", say: "تحلّو.. والتامبون يطيح *في الكارط متاعها*." },
    { id: "e6", say: "كل رابط يخدم *مرّة وحدة*، وما يوفاش." },
    { id: "e7", say: "وانت تعرف *شكون خذاه*." },
    { id: "e8", say: "وكل ما تحلّ الكارط، تشوف قدّاش *مازالها للكادو*." },
    { id: "e9", say: "ترجعلك انت.. *موش لغيرك*." },
    { id: "e10", say: "جرّب Pointili بلاش، الرابط في البيو.", sub: false },
  ],
  css: `
#stage{background:linear-gradient(170deg,#fde7f0,#efe6ff 55%,#e6ecff)}
.blob{position:absolute;border-radius:50%;filter:blur(40px);opacity:.55}
.feed{position:absolute;inset:0;background:#fff;padding:110px 22px 0;direction:rtl}
.feed .hd{display:flex;align-items:center;gap:18px}
.feed .av{width:92px;height:92px;border-radius:50%;background:conic-gradient(#feda75,#fa7e1e,#d62976,#962fbf,#feda75);padding:5px}
.feed .av i{display:grid;place-items:center;width:100%;height:100%;border-radius:50%;background:#fff;font-style:normal;font-size:44px}
.feed b{font-size:28px}
.feed small{display:block;font-size:20px;color:#77748a;margin-top:4px}
.feed .grid{display:grid;grid-template-columns:repeat(3,1fr);gap:6px;margin-top:26px}
.feed .grid i{aspect-ratio:1;display:grid;place-items:center;font-style:normal;font-size:64px;border-radius:6px}
.dm{position:absolute;inset:0;background:#fff;padding:110px 20px 0;direction:rtl;display:flex;flex-direction:column;gap:14px}
.dm .top{display:flex;align-items:center;gap:14px;border-bottom:2px solid #f0eef6;padding-bottom:14px}
.dm .top i{width:60px;height:60px;border-radius:50%;background:#f3c6d9;display:grid;place-items:center;font-style:normal;font-size:28px}
.dm .top b{font-size:26px}
.dm .m{max-width:78%;font-size:25px;line-height:1.4;padding:14px 20px;border-radius:24px}
.dm .them{align-self:flex-end;background:#f0eef6}
.dm .me{align-self:flex-start;background:linear-gradient(135deg,#7c4dff,#d62976);color:#fff}
.dm .ghost{align-self:center;margin-top:24px;font-size:22px;color:#a19fb2}
.app{position:absolute;inset:0;background:#f4f3f9;padding:110px 24px 0;direction:rtl}
.app h3{font-size:34px;font-weight:700}
.app p{font-size:21px;color:#77748a;margin-top:6px;line-height:1.4}
.app .btn{margin-top:26px;background:var(--brand);color:#fff;font-weight:700;font-size:26px;text-align:center;padding:20px 0 24px;border-radius:22px}
.app .lnk{margin-top:20px;background:#fff;border-radius:22px;padding:18px 20px;visibility:hidden;opacity:0}
.app .lnk code{display:block;direction:ltr;text-align:left;font-family:inherit;font-size:21px;color:var(--brand);font-weight:600}
.app .lnk .acts{display:flex;gap:12px;margin-top:14px}
.app .lnk .acts span{flex:1;text-align:center;font-size:22px;font-weight:700;padding:12px 0 16px;border-radius:16px;background:#f0eef6}
.app .lnk .acts .wa{background:#25d366;color:#fff}
.app .lst{margin-top:18px}
.app .r{display:flex;align-items:center;gap:14px;background:#fff;border-radius:20px;padding:16px 18px;margin-top:12px}
.app .r i{width:54px;height:54px;border-radius:50%;background:#efeaff;color:var(--brand);display:grid;place-items:center;font-style:normal;font-weight:700;font-size:24px;flex:none}
.app .r b{flex:1;font-size:24px}
.app .r span{font-size:20px;font-weight:700;padding:6px 14px 9px;border-radius:999px}
.app .r .ok{background:var(--mint-soft);color:var(--mint)}
.app .r .wt{background:#fff4d6;color:#b07a00}
.badge{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:16px;white-space:nowrap;font-weight:700;font-size:50px;color:#fff;padding:18px 40px 24px;border-radius:999px;box-shadow:0 18px 36px -16px rgb(40 20 90/.5);visibility:hidden;opacity:0}
.heart{position:absolute;font-size:90px;visibility:hidden;opacity:0}
`,
  html: () => `
<i class="blob" style="left:-120px;top:200px;width:520px;height:520px;background:#ffb3d1"></i>
<i class="blob" style="right:-160px;top:900px;width:620px;height:620px;background:#b9a6ff"></i>
<div class="badge" id="b1" style="top:430px;background:var(--brand)">🔗 يخدم مرّة وحدة</div>
<div class="badge" id="b2" style="top:580px;background:var(--mint)">♾️ ما يوفاش بالوقت</div>
${[[220, 520], [780, 640], [480, 420]].map(([x, y], i) => `<span class="heart" id="h${i}" style="left:${x}px;top:${y}px">💜</span>`).join("")}
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("pill");
    const P = { x: 290, y: 300, w: 500 };
    const swap = (from, to, t) => {
      if (from) tl.to(from, { autoAlpha: 0, x: -120, duration: 0.3, ease: "power2.in" }, t - 0.15);
      gsap.set(to, { autoAlpha: 0 });
      tl.fromTo(to, { autoAlpha: 0, x: 140 }, { autoAlpha: 1, x: 0, duration: 0.4, ease: "power3.out" }, t);
      K.sfx("swish", t);
    };

    /* e1 — a shop on Instagram */
    const p1 = K.phone({ ...P, z: 12 });
    p1.put(`<div class="feed"><div class="hd"><span class="av"><i>🌸</i></span><div><b dir="ltr">dar.rayhana</b><small>عطورات · بخور · توصيل لكل تونس</small></div></div>
      <div class="grid">${["🧴", "💐", "🌹", "🕯️", "🧴", "🎁", "🌸", "🧴", "💐"].map((e, i) => `<i style="background:${["#fde7f0", "#efe6ff", "#fff4d6", "#e6f7ef", "#e6ecff", "#ffe9e1"][i % 6]}">${e}</i>`).join("")}</div></div>`);
    tl.fromTo(p1, { autoAlpha: 0, y: 160 }, { autoAlpha: 1, y: 0, duration: 0.5 }, 0.05);
    K.$$(".feed .grid i", p1).forEach((g, i) => K.pop(g, 0.4 + i * 0.07, { from: 0.5, dur: 0.3 }));

    /* e2 — she buys once… and vanishes */
    const p2 = K.phone({ ...P, z: 13 });
    p2.put(`<div class="dm"><div class="top"><i>س</i><b>سارة</b></div>
      <span class="m them" id="m1">نحب نكوموندي العطر هذا 😍</span><span class="m me" id="m2">تمّ ✅ يوصلك غدوة إن شاء الله</span>
      <span class="ghost" id="gh">👻 آخر مرّة: من 3 شهور</span></div>`);
    swap(p1, p2, at("e2", -0.1));
    K.pop($("m1"), at("e2", 0.15), { from: 0.6 }); K.sfx("msg", at("e2", 0.2));
    K.pop($("m2"), at("e2", 0.6), { from: 0.6 }); K.sfx("msg", at("e2", 0.65));
    K.pop($("gh"), end("e2", -0.4), { from: 0.6 });
    tl.to(K.$(".dm", p2), { filter: "grayscale(1)", duration: 0.4 }, end("e2", -0.3));
    K.sfx("boing", end("e2", -0.35), -6);

    /* e3–e4 — after each order: a tampon link, on WhatsApp */
    const p3 = K.phone({ ...P, z: 14 });
    p3.put(`<div class="app"><h3>تامبون برابط</h3><p>لكل حريف رابط جديد. يخدم مرّة وحدة، وما يوفاش بالوقت.</p>
      <div class="btn" id="mk">اعمل رابط جديد</div>
      <div class="lnk" id="lnk"><code>www.pointili.online/s/R7kQ2m</code><div class="acts"><span class="wa" id="wa">واتساب</span><span>كوبي</span></div></div></div>`);
    swap(p2, p3, at("e3", -0.1));
    K.tap(540, P.y + 15 + 1082 * 0.33, at("e4", 0.15));
    K.pop($("lnk"), at("e4", 0.35), { from: 0.8 });
    K.sfx("pop", at("e4", 0.4));
    K.tap(400, P.y + 15 + 1082 * 0.52, end("e4", -0.6));
    const ch = K.chat({ name: "سارة", sub: "واتساب", x: 140, y: 420, w: 800, z: 20, msgs: [{ me: true, text: "🎁 تامبون جديد من Dar Rayhana! حلّ الرابط هذا وخوذو في الكارط متاعك:", link: "www.pointili.online/s/R7kQ2m", time: "18:05" }] });
    gsap.set(ch, { autoAlpha: 0 });
    tl.fromTo(ch, { autoAlpha: 0, y: 120 }, { autoAlpha: 1, y: 0, duration: 0.4 }, end("e4", -0.3));
    K.pop(ch.msgs[0], end("e4", -0.1), { from: 0.6 }); K.sfx("msg", end("e4", -0.05));

    /* e5 — she opens it: the tampon lands on her card */
    K.tap(560, 420 + 330, at("e5", 0.1));
    tl.to([ch, p3], { autoAlpha: 0, duration: 0.3 }, at("e5", 0.35));
    const card = K.pass({ name: "Dar Rayhana", color: "#c2185b", goal: 6, stamps: 2, gift: "عطر صغير", icon: "heart", x: 110, y: 640, w: 860, size: 38, z: 22 });
    K.pop(card, at("e5", 0.4), { from: 0.7 });
    card.stamp(3, at("e5", 0.9));
    K.burst(540, 820, at("e5", 1.1), { n: 14, r: 240 });
    K.out(card, at("e6", -0.15));

    /* e6 — works once, never expires */
    K.pop($("b1"), at("e6", 0.05), { from: 0.5 }); K.sfx("pop", at("e6", 0.1));
    K.pop($("b2"), at("e6", 0.8), { from: 0.5 }); K.sfx("pop", at("e6", 0.85));
    K.out($("b1"), at("e7", -0.15)); K.out($("b2"), at("e7", -0.15));

    /* e7 — and you know who took it */
    const p4 = K.phone({ ...P, z: 15 });
    p4.put(`<div class="app"><h3>الروابط اللي بعثتهم</h3><p>1 يستنّى · 3 تخذاو</p><div class="lst">
      ${[["س", "سارة", "تخذا", "ok"], ["م", "مريم", "يستنّى", "wt"], ["ي", "ياسمين", "تخذا", "ok"], ["ن", "نور", "تخذا", "ok"]].map(([a, n, s, c]) => `<div class="r"><i>${a}</i><b>${n}</b><span class="${c}">${s}</span></div>`).join("")}</div></div>`);
    swap(null, p4, at("e7", -0.1));
    K.$$(".r", p4).forEach((r, i) => K.pop(r, at("e7", 0.3 + i * 0.15), { from: 0.8, dur: 0.3 }));
    K.sfx("tick", at("e7", 0.35), -4);

    /* e8 — every time she opens the card: how far the gift is */
    tl.to(p4, { autoAlpha: 0, duration: 0.3 }, at("e8", -0.2));
    const c2 = K.pass({ name: "Dar Rayhana", color: "#c2185b", goal: 6, stamps: 4, gift: "عطر صغير", icon: "heart", x: 110, y: 640, w: 860, size: 38, z: 22 });
    K.pop(c2, at("e8", -0.05), { from: 0.7 });
    tl.fromTo(K.$(".line", c2), { scale: 1 }, { scale: 1.06, duration: 0.3, yoyo: true, repeat: 3, transformOrigin: "50% 50%" }, at("e8", 1.0));
    K.out(c2, at("e9", -0.15));

    /* e9 — she comes back to you */
    const p5 = K.phone({ ...P, z: 16 });
    p5.put(`<div class="dm"><div class="top"><i>س</i><b>سارة</b></div><span class="m them" id="m3">نحب نعاود نكوموندي 💜</span><span class="m me" id="m4">بكل فرحة! 🌸</span></div>`);
    swap(null, p5, at("e9", -0.1));
    K.pop($("m3"), at("e9", 0.2), { from: 0.6 }); K.sfx("msg", at("e9", 0.25));
    K.pop($("m4"), at("e9", 0.7), { from: 0.6 }); K.sfx("msg", at("e9", 0.75));
    K.$$(".heart").forEach((h, i) => { K.pop(h, at("e9", 0.4 + i * 0.15), { from: 0.3 }); tl.to(h, { y: -120, autoAlpha: 0, duration: 0.9 }, at("e9", 0.9 + i * 0.15)); });

    K.endcard(at("e10", -0.1), { tag: "تبيع أونلاين؟ *الرابط في البيو*", offer: "جرّب Pointili بلاش" });
  },
};
