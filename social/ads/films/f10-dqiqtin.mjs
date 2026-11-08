/**
 * f10 — «دقيقتين» (two minutes): a stopwatch races while the card is made on the phone, the
 * app's own steps (wizGiftQ, wizGoalQ, wizColorQ, «اللوغو متاعك», wizReady): name, gift, how many
 * tampons, colour, logo — the code is ready for the counter; customers scan, the card fills.
 * «تبدا في دقيقتين، من التليفون متاعك» is what the site itself says.
 */
import { qrSvg } from "../engine/qr.mjs";

const COLORS = ["#6c47ff", "#e5484d", "#12b76a", "#f5b301", "#0f0e17", "#c2185b"];

export default {
  title: "دقيقتين",
  voice: "ash",
  music: { style: "bounce" },
  lead: 0.25,
  tail: 4,
  lines: [
    { id: "h1", say: "قدّاش تاخو باش تعمل *كارط فيدليتي* لمحلّك؟" },
    { id: "h2", say: "*دقيقتين*. من التليفون متاعك." },
    { id: "h3", say: "اسم المحل.." },
    { id: "h4", say: "شنوّة يربح الحريف؟ *قهوة بلاش*." },
    { id: "h5", say: "قدّاش من تامبون؟ *ثمانية*." },
    { id: "h6", say: "اللون متاعك.. *واللوغو متاعك*." },
    { id: "h7", say: "وهاو الكود *حاضر*، حطّو على الكونتوار." },
    { id: "h8", say: "والحرفاء يسكانيو، *والكارط تتعمّر*." },
    { id: "h9", say: "لا كرتون، لا مطبعة، *لا أبليكاسيون*." },
    { id: "h10", say: "جرّب Pointili بلاش، الرابط في البيو.", sub: false },
  ],
  assets: () => ({ qr: qrSvg("https://www.pointili.online/?k=yasmine") }),
  css: `
#stage{background:linear-gradient(180deg,#efeaff,#f8f6ff 45%,#fff4e6)}
.watch{position:absolute;left:50%;top:150px;transform:translateX(-50%);display:flex;align-items:center;gap:22px;background:#0f0e17;color:#fff;border-radius:999px;padding:16px 46px 22px 30px;box-shadow:0 20px 40px -18px rgb(15 14 23/.6);z-index:40;visibility:hidden;opacity:0}
.watch .ic{width:64px;height:64px;border-radius:50%;border:7px solid #ffd23f;position:relative}
.watch .ic:after{content:"";position:absolute;left:50%;top:6px;width:6px;height:22px;margin-left:-3px;background:#ffd23f;border-radius:3px;transform-origin:50% 100%;transform:rotate(var(--a,0deg))}
.watch b{font-size:84px;font-weight:700;direction:ltr;min-width:240px;text-align:center}
.done{position:absolute;left:50%;top:300px;transform:translateX(-50%);white-space:nowrap;background:#12b76a;color:#fff;font-weight:700;font-size:44px;padding:12px 36px 18px;border-radius:999px;visibility:hidden;opacity:0;z-index:41}
.wz{position:absolute;inset:0;background:#f4f3f9;padding:120px 26px 0;direction:rtl}
.wz .stp{font-size:22px;color:#77748a;font-weight:600}
.wz h3{font-size:32px;font-weight:700;margin-top:10px;line-height:1.35}
.wz .fld{margin-top:24px;background:#fff;border-radius:22px;height:84px;display:flex;align-items:center;padding:0 24px;font-size:30px;font-weight:600;box-shadow:inset 0 0 0 3px #6c47ff}
.wz .chips{display:grid;grid-template-columns:1fr 1fr;gap:14px;margin-top:26px}
.wz .chips span{background:#fff;border-radius:20px;text-align:center;font-weight:700;font-size:26px;padding:22px 0 26px}
.wz .nums{display:grid;grid-template-columns:repeat(4,1fr);gap:12px;margin-top:26px}
.wz .nums span{background:#fff;border-radius:20px;text-align:center;font-weight:700;font-size:40px;padding:20px 0 26px;direction:ltr}
.wz .sw{display:grid;grid-template-columns:repeat(6,1fr);gap:12px;margin-top:26px}
.wz .sw i{aspect-ratio:1;border-radius:50%}
.wz .logo{margin-top:30px;display:flex;align-items:center;gap:18px;background:#fff;border-radius:22px;padding:18px 20px;font-size:26px;font-weight:700}
.wz .logo i{width:84px;height:84px;border-radius:22px;background:#efeaff;display:grid;place-items:center;font-style:normal;font-size:44px}
.wz .ready{text-align:center;margin-top:10px}
.wz .ready b{display:block;font-size:34px}
.wz .ready span{display:block;font-size:22px;color:#77748a;margin-top:6px}
.tab{position:absolute;left:300px;top:420px;width:480px;padding:26px;border-radius:44px;background:#0f0e17;box-shadow:0 40px 80px -40px rgb(15 14 23/.7);visibility:hidden;opacity:0}
.tab .in{border-radius:24px;background:linear-gradient(170deg,#8f74ff,#6c47ff);padding:30px;text-align:center;color:#fff}
.tab .in b{font-size:36px}
.tab .qq{margin:20px auto 6px;width:330px;height:330px;padding:18px;background:#fff;border-radius:22px}
.tab .qq svg{width:100%;height:100%}
.tab .in small{font-size:20px;opacity:.85}
.counter{position:absolute;left:0;right:0;top:1020px;height:220px;background:linear-gradient(180deg,#b07a52,#8a5a37);box-shadow:inset 0 12px 0 #cf9a6e;visibility:hidden;opacity:0}
.mini{position:absolute;width:150px;height:260px;border-radius:30px;background:#0f0e17;padding:8px;visibility:hidden;opacity:0;z-index:30}
.mini i{display:block;width:100%;height:100%;border-radius:22px;background:linear-gradient(170deg,#8f74ff,#6c47ff)}
.mini b{position:absolute;left:50%;top:40%;transform:translate(-50%,-50%);color:#fff;font-size:40px;font-weight:700}
.nos{position:absolute;left:130px;right:130px;top:560px;display:flex;flex-direction:column;gap:22px}
.nos span{display:flex;align-items:center;justify-content:center;gap:16px;background:#fff;border-radius:28px;font-weight:700;font-size:52px;padding:22px 0 30px;box-shadow:0 16px 30px -18px rgb(40 20 90/.4);visibility:hidden;opacity:0}
.nos span i{font-style:normal;width:56px;height:56px;border-radius:50%;background:#ff6b4a;color:#fff;display:grid;place-items:center;font-size:34px}
`,
  html: (A) => `
<div class="watch" id="watch"><i class="ic" id="ic"></i><b id="clock">00:00</b></div>
<div class="done" id="done">✓ أقل من دقيقتين</div>
<div class="counter" id="ctr"></div>
<div class="tab" id="tab"><div class="in"><b>قهوة الياسمين</b><div class="qq">${A.qr}</div><small>سكاني وخوذ تامبون</small></div></div>
${[[90, 760, "+1"], [840, 700, "+1"], [905, 1110, "+1"]].map(([x, y, t], i) => `<div class="mini" id="mn${i}" style="left:${x}px;top:${y}px"><i></i><b>${t}</b></div>`).join("")}
<div class="nos" id="nos"><span><i>✕</i>كرتون</span><span><i>✕</i>مطبعة</span><span><i>✕</i>أبليكاسيون</span></div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("pill");
    const P = { x: 305, y: 320, w: 470 };
    const COLORS = ["#6c47ff", "#e5484d", "#12b76a", "#f5b301", "#0f0e17", "#c2185b"];

    /* h1–h2 — how long? two minutes: the stopwatch starts */
    K.pop($("watch"), 0.1, { from: 0.6 });
    const hook = K.add(`<div style="position:absolute;left:0;right:0;top:560px;text-align:center;visibility:hidden;opacity:0"><div style="font-size:220px;line-height:1">☕🤔</div><div style="display:inline-block;margin-top:30px;background:#fff;border-radius:999px;padding:18px 44px 26px;font-weight:700;font-size:58px;box-shadow:0 18px 36px -16px rgb(40 20 90/.35)">كارط فيدليتي؟</div></div>`);
    K.pop(hook, 0.3, { from: 0.6 });
    K.sfx("pop", 0.35);
    K.out(hook, at("h2", -0.1));
    const t0 = at("h2", 0.2), t1 = end("h7", -0.2);
    K.counter(K.$("#clock"), 0, 112, t0, t1 - t0, { ease: (x) => x, fmt: (s) => `${String(Math.floor(s / 60)).padStart(2, "0")}:${String(Math.floor(s % 60)).padStart(2, "0")}` });
    K.each((t) => K.$("#ic").style.setProperty("--a", `${Math.max(0, Math.min(t, t1) - t0) * 360}deg`));
    for (let s = t0; s < t1; s += 0.5) K.sfx("tick", s, -10);
    K.sfx("riser", t0 - 0.1, -4);

    /* h3–h6 — the steps, in the phone */
    const ph = K.phone({ ...P, z: 12 });
    const step = (html) => { const d = ph.put(`<div class="wz">${html}</div>`); gsap.set(d, { autoAlpha: 0 }); return d; };
    const s1 = step(`<div class="stp">1 / 4</div><h3>اسم المحل</h3><div class="fld" id="nm"></div>`);
    const s2 = step(`<div class="stp">2 / 4</div><h3>شنوّة يربح الحريف كي يكمّل الكارط؟</h3><div class="chips"><span id="g0">قهوة بلاش</span><span>كابوسان بلاش</span><span>كرواسون بلاش</span><span>حاجة أخرى</span></div>`);
    const s3 = step(`<div class="stp">3 / 4</div><h3>قدّاش من تامبون باش يربح الحريف كادو؟</h3><div class="nums"><span>6</span><span id="n8">8</span><span>10</span><span>12</span></div>`);
    const s4 = step(`<div class="stp">4 / 4</div><h3>شنوّة لون الكارط؟</h3><div class="sw">${COLORS.map((c, i) => `<i style="background:${c}" ${i === 0 ? 'id="c0"' : ""}></i>`).join("")}</div><div class="logo"><i id="lg">➕</i><span>اللوغو متاعك</span></div>`);
    const s5 = step(`<div class="ready"><b>الكارط متاعك حاضرة!</b><span>الحريف يسكاني الكود متاعك، وكل مرّة ياخو تامبون</span></div>`);
    gsap.set(ph, { autoAlpha: 0 });
    tl.fromTo(ph, { autoAlpha: 0, y: 160 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("h2", 0.3));
    const show = (el, t, prev) => { if (prev) tl.to(prev, { autoAlpha: 0, x: -80, duration: 0.25 }, t - 0.1); tl.fromTo(el, { autoAlpha: 0, x: 120 }, { autoAlpha: 1, x: 0, duration: 0.35, ease: "power3.out" }, t); K.sfx("swish", t, -2); };
    show(s1, at("h3", -0.1));
    const name = "قهوة الياسمين";
    const ty = at("h3", 0.15);
    K.each((t) => { K.$("#nm").textContent = name.slice(0, Math.max(0, Math.min(name.length, Math.floor((t - ty) / 0.07) + 1))); });
    [...name].forEach((_, i) => K.sfx("key", ty + i * 0.07, -4));
    show(s2, at("h4", -0.1), s1);
    tl.to(K.$("#g0"), { backgroundColor: "#6c47ff", color: "#fff", duration: 0.2 }, at("h4", 1.0));
    K.sfx("tap", at("h4", 1.0));
    show(s3, at("h5", -0.1), s2);
    tl.to(K.$("#n8"), { backgroundColor: "#6c47ff", color: "#fff", duration: 0.2 }, at("h5", 0.9));
    K.sfx("tap", at("h5", 0.9));
    show(s4, at("h6", -0.1), s3);
    tl.to(K.$("#c0"), { boxShadow: "0 0 0 6px #fff, 0 0 0 11px #6c47ff", duration: 0.2 }, at("h6", 0.4));
    K.sfx("tap", at("h6", 0.4));
    const lgAt = at("h6", 1.1);
    K.each((t) => { K.$("#lg").textContent = t >= lgAt ? "☕" : "➕"; });
    tl.fromTo(K.$("#lg"), { scale: 1.6 }, { scale: 1, duration: 0.35, ease: "back.out(3)" }, at("h6", 1.1));
    K.sfx("pop", at("h6", 1.1));

    /* h7 — the card is ready; the code goes on the counter: the stopwatch stops */
    show(s5, at("h7", -0.1), s4);
    const prev = K.pass({ name: "قهوة الياسمين", color: "#6c47ff", goal: 8, stamps: 0, gift: "قهوة بلاش", icon: "coffee", x: 22, y: 300, w: 440, size: 19, parent: ph.scr, z: 3 });
    gsap.set(prev, { autoAlpha: 0 });
    tl.to(prev, { autoAlpha: 1, duration: 0.3 }, at("h7", 0.1));
    tl.to(ph, { x: -260, scale: 0.8, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, end("h7", -0.4));
    K.fadeIn($("ctr"), end("h7", -0.4), 0.3);
    K.pop($("tab"), end("h7", -0.3), { from: 0.7 });
    K.pop($("done"), t1, { from: 0.5 });
    K.sfx("win", t1, -2);

    /* h8 — customers scan: the card fills */
    K.$$(".mini").forEach((m, i) => { K.pop(m, at("h8", 0.1 + i * 0.35), { from: 0.4 }); K.sfx("scan", at("h8", 0.2 + i * 0.35), -4); });
    const card = K.pass({ name: "قهوة الياسمين", color: "#6c47ff", goal: 8, stamps: 0, gift: "قهوة بلاش", icon: "coffee", x: 190, y: 1070, w: 700, size: 28, z: 35 });
    gsap.set(card, { autoAlpha: 0 });
    tl.fromTo(card, { autoAlpha: 0, y: 120 }, { autoAlpha: 1, y: 0, duration: 0.4 }, at("h8", 0.3));
    card.stamp(1, at("h8", 0.6)); card.stamp(2, at("h8", 0.9)); card.stamp(3, at("h8", 1.2));
    tl.to([$("tab"), $("ctr"), card, ...K.$$(".mini")], { autoAlpha: 0, duration: 0.3 }, at("h9", -0.2));

    /* h9 — no paper, no printer, no app */
    K.$$("#nos span").forEach((s, i) => { K.pop(s, at("h9", 0.05 + i * 0.4), { from: 0.6 }); K.sfx("scratch", at("h9", 0.1 + i * 0.4), -3); });

    K.endcard(at("h10", -0.1), { tag: "تبدا في دقيقتين، *الرابط في البيو*", offer: "جرّب Pointili بلاش" });
  },
};
