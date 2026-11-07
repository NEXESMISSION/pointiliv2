/**
 * f5 — «الكارط الكرتون» (the paper card): the owner's daily chaos — «I forgot my card at home»,
 * «add me a tampon, I came yesterday», cards wet, torn, lost — then the calm: the code on the
 * counter, the tampon in the customer's phone, every tampon on record for the owner. Comic,
 * drawn, quick. Modelled on the structure of a café-chaos comic reel (the problem in bursts → «the
 * fix is simple» → how → «message us on WhatsApp»), in our words and only what Pointili does.
 */
import { person, front, ART_CSS, SKINS } from "../engine/art.mjs";

const owner = person({ shirt: "#fff", apron: "#6c47ff", mustache: true });
const ownerSad = person({ shirt: "#fff", apron: "#6c47ff", mustache: true, smile: false });
const c1 = person({ shirt: "#ff6b4a", skin: SKINS[1], hair: "#3a2a20", legs: "#34457a", shoes: "#fff" });
const c2 = person({ shirt: "#12b76a", skin: SKINS[3], hijab: "#ffd23f", legs: "#3d3a4c", shoes: "#fff" });
const burst = (id, x, y, text, color = "#ffd23f", size = 300, rot = -8) =>
  `<div class="pow" id="${id}" style="left:${x}px;top:${y}px;width:${size}px;height:${size}px;--c:${color};transform:rotate(${rot}deg)"><span>${text}</span></div>`;

export default {
  title: "الكارط الكرتون",
  music: { style: "comic" },
  lead: 0.25,
  tail: 4.6,
  lines: [
    { id: "k1", say: "عندك *قهوة* ولا *حانوت*؟", after: 0.2 },
    { id: "k2", say: "أكيد فدّيت من الحريف اللي يقلّك: «خويا، *نسيت الكارط* في الدار»..", after: 0.15 },
    { id: "k3", say: "ولا: «*زيدني تامبون*، راني جيت البارح!»", after: 0.15 },
    { id: "k4", say: "ولا الكارط اللي *تبلّت*، *تقطّعت*، *وضاعت*..", after: 0.35 },
    { id: "k5", say: "الحل ساهل مع *Pointili*.", after: 0.25 },
    { id: "k6", say: "الحريف يسكاني *الكود* اللي على الكونتوار،", after: 0.1 },
    { id: "k7", say: "والتامبون يطيح *في تليفونو*.", after: 0.2 },
    { id: "k8", say: "*لا كرتون* يضيع، *لا تامبون* بالكذب:", after: 0.1 },
    { id: "k9", say: "انت تشوف *كل تامبون* وقتاش طاح.", after: 0.25 },
    { id: "k10", say: "هكا *ترتاح انت*، والحريف *يرجع*.", after: 0.3 },
    { id: "k11", say: "شنوّة تستنّى؟ ابعثلنا على الواتساب، ودخّل Pointili لمحلّك اليوم.", sub: false },
  ],
  css: `
#stage{background:#2d6b5e}
${ART_CSS}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0}
.wallc{position:absolute;inset:0;background:radial-gradient(110% 70% at 50% 20%,#3f8f7d,#245a4f 70%)}
.shelf{position:absolute;left:60px;right:60px;height:26px;border-radius:8px;background:#7b4c2c;box-shadow:0 12px 0 rgb(0 0 0/.15)}
.jar{position:absolute;width:70px;height:90px;border-radius:18px 18px 12px 12px;background:#f4ead8;border:6px solid #7b4c2c}
.lamp{position:absolute;top:0;width:8px;height:150px;background:#1d1a24}
.lamp:after{content:"";position:absolute;left:-46px;top:150px;width:100px;height:56px;border-radius:50px 50px 8px 8px;background:#1d1a24;box-shadow:0 40px 80px 30px rgb(255 214 120/.35)}
.counter{position:absolute;left:0;right:0;top:1000px;height:400px;background:repeating-linear-gradient(92deg,rgb(0 0 0/.05) 0 3px,transparent 3px 26px),linear-gradient(180deg,#b07a52,#8a5a37);box-shadow:inset 0 12px 0 #cf9a6e}
.pow{position:absolute;display:grid;place-items:center;visibility:hidden;opacity:0;z-index:30}
.pow:before{content:"";position:absolute;inset:0;background:var(--c);clip-path:polygon(50% 0,61% 30%,93% 16%,74% 44%,100% 60%,70% 66%,80% 98%,52% 76%,26% 100%,32% 68%,0 62%,26% 44%,8% 14%,40% 30%);filter:drop-shadow(0 10px 0 rgb(0 0 0/.25))}
.pow span{position:relative;font-weight:700;font-size:64px;color:var(--ink);-webkit-text-stroke:3px #fff;paint-order:stroke fill}
.say{position:absolute;background:#fff;border:6px solid var(--ink);border-radius:46px;padding:22px 34px 30px;font-weight:700;font-size:46px;line-height:1.3;color:var(--ink);z-index:31;visibility:hidden;opacity:0;max-width:640px}
.say:after{content:"";position:absolute;bottom:-34px;width:40px;height:40px;background:#fff;border-right:6px solid var(--ink);border-bottom:6px solid var(--ink);transform:rotate(45deg) skew(10deg,10deg)}
.say.l:after{left:70px}.say.r:after{right:70px}
.sweat{position:absolute;width:26px;height:38px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#8cd3ff;z-index:32;visibility:hidden;opacity:0}
.q{position:absolute;font-weight:700;color:#ffd23f;-webkit-text-stroke:6px var(--ink);paint-order:stroke fill;z-index:31;visibility:hidden;opacity:0}
.paper{position:absolute;width:420px;height:250px;border-radius:20px;background:#efe0c2;box-shadow:0 22px 40px -22px rgb(0 0 0/.6);padding:24px 28px;color:#6b5434;z-index:20}
.paper b{display:block;font-size:34px}
.paper .rw{display:flex;gap:14px;margin-top:20px}
.paper .rw i{width:50px;height:50px;border-radius:50%;border:4px dashed #b99d6f}
.paper .rw i.s{border:none;background:radial-gradient(circle,#7c3a2a 0 45%,#0000 46%),#c9a978}
.drop{position:absolute;width:30px;height:44px;border-radius:50% 50% 50% 50%/60% 60% 40% 40%;background:#5ab8f5;z-index:21}
.calm{position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 0%,#8f74ff,#6c47ff 55%,#4a2ad6)}
.brandbig{position:absolute;left:50%;top:560px;width:320px;height:320px;margin-left:-160px;border-radius:84px;background:#fff;display:grid;place-items:center;box-shadow:0 40px 80px -30px rgb(20 8 80/.7);z-index:20}
.brandbig svg{width:220px}
.bword{position:absolute;left:0;right:0;top:930px;text-align:center;color:#fff;font-weight:700;font-size:120px;direction:ltr;z-index:20}
.chip{position:absolute;display:flex;align-items:center;gap:16px;white-space:nowrap;background:#fff;color:var(--ink);font-weight:700;font-size:46px;padding:20px 36px 26px;border-radius:999px;box-shadow:0 18px 36px -16px rgb(0 0 0/.45);z-index:30;visibility:hidden;opacity:0}
.chip .x{width:52px;height:52px;border-radius:50%;background:var(--coral);display:grid;place-items:center;color:#fff}
.chip .x svg{width:30px;height:30px}
.wa{position:absolute;left:50%;transform:translateX(-50%);display:flex;align-items:center;gap:18px;white-space:nowrap;background:#25d366;color:#fff;font-weight:700;font-size:56px;padding:22px 44px 28px;border-radius:999px;direction:ltr;box-shadow:0 20px 40px -16px rgb(0 0 0/.45);z-index:90;visibility:hidden;opacity:0}
.wa svg{width:56px;height:56px}
`,
  html: () => `
<div class="wallc"></div>
<div class="shelf" style="top:330px"></div>${[110, 210, 310, 700, 800, 900].map((x, i) => `<i class="jar" style="left:${x}px;top:${i % 2 ? 244 : 236}px"></i>`).join("")}
<i class="lamp" style="left:300px"></i><i class="lamp" style="left:780px"></i>

<div class="sc" id="A">
  <div class="art" id="ow" style="left:390px;top:470px;width:300px;height:645px">${owner}</div>
  <div class="art" id="ows" style="left:390px;top:470px;width:300px;height:645px">${ownerSad}</div>
  <div class="counter"></div>
  <div class="art" id="cu1" style="left:-40px;top:700px;width:260px;height:559px">${c1}</div>
  <div class="art" id="cu2" style="left:840px;top:700px;width:260px;height:559px">${c2}</div>
  <div class="say l" id="say1" style="left:120px;top:400px">خويا، نسيت الكارط<br>في الدار! 🙄</div>
  <div class="say r" id="say2" style="left:330px;top:420px">زيدني تامبون،<br>راني جيت البارح!</div>
  ${burst("pw1", 40, 150, "؟!", "#ffd23f", 280, -10)}${burst("pw2", 760, 140, "POP!", "#ff6b4a", 280, 8)}${burst("pw3", 700, 520, "!!", "#ffd23f", 220, 12)}
  <i class="sweat" id="sw1" style="left:610px;top:520px"></i><i class="sweat" id="sw2" style="left:470px;top:540px"></i>
  <span class="q" id="q1" style="left:150px;top:640px;font-size:140px">؟</span><span class="q" id="q2" style="left:860px;top:620px;font-size:120px">؟</span><span class="q" id="q3" style="left:520px;top:300px;font-size:160px">؟</span>
</div>
<div class="sc" id="B">
  <div class="paper" id="pc" style="left:330px;top:560px"><b>قهوة الحومة</b><div class="rw"><i class="s"></i><i class="s"></i><i class="s"></i><i></i><i></i></div></div>
  ${[[360, 470], [520, 430], [680, 480]].map(([x, y], i) => `<i class="drop" id="dr${i}" style="left:${x}px;top:${y}px"></i>`).join("")}
  ${burst("pw4", 650, 380, "شششش", "#8cd3ff", 300, 10)}${burst("pw5", 90, 820, "طررر", "#ffd23f", 300, -8)}${burst("pw6", 640, 900, "وينها؟", "#ff6b4a", 320, 6)}
</div>
<div class="sc" id="C"><div class="calm"></div>
  <div class="brandbig" id="bb"></div><div class="bword" id="wd">Pointili</div>
</div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    const S = "../../assets/screens/";
    K.subs("small");
    $("bb").innerHTML = K.brandMark();

    /* A — the counter, and what the paper card brings to it */
    K.scene($("A"), 0, at("k4", -0.05), { inn: "cut" });
    gsap.set($("ows"), { autoAlpha: 0 });
    K.pop($("pw1"), 0.15, { from: 0.3, dur: 0.4 });
    K.sfx("pop", 0.2);
    K.out($("pw1"), at("k2", -0.1), { dur: 0.15 });
    tl.to($("ow"), { y: -20, duration: 0.18, yoyo: true, repeat: 1 }, 0.3);
    // «I forgot my card at home»
    tl.fromTo($("cu1"), { x: -300 }, { x: 0, duration: 0.45, ease: "back.out(1.3)" }, at("k2", -0.1));
    K.sfx("swish", at("k2", -0.1));
    K.pop($("say1"), at("k2", 1.0), { from: 0.5 });
    K.sfx("pop", at("k2", 1.05));
    tl.set($("ow"), { autoAlpha: 0 }, at("k2", 1.6));
    tl.set($("ows"), { autoAlpha: 1 }, at("k2", 1.6));
    K.pop($("q1"), at("k2", 1.8), { from: 0.3 });
    K.sfx("boing", at("k2", 1.85), -4);
    K.out($("say1"), at("k3", -0.1), { dur: 0.15 });
    // «add me a tampon, I came yesterday»
    tl.fromTo($("cu2"), { x: 300 }, { x: 0, duration: 0.45, ease: "back.out(1.3)" }, at("k3", -0.1));
    K.sfx("swish", at("k3", -0.1));
    K.pop($("say2"), at("k3", 0.35), { from: 0.5 });
    K.sfx("pop", at("k3", 0.4));
    K.pop($("q2"), at("k3", 1.0), { from: 0.3 });
    K.pop($("pw2"), at("k3", 1.2), { from: 0.3 });
    K.sfx("boing", at("k3", 1.25), -2);
    K.pop($("q3"), at("k3", 1.5), { from: 0.3 });
    K.pop($("pw3"), at("k3", 1.7), { from: 0.3 });
    K.sfx("pop", at("k3", 1.75));
    ["sw1", "sw2"].forEach((s, i) => tl.fromTo($(s), { autoAlpha: 1, y: 0 }, { y: 160, autoAlpha: 0, duration: 0.7, repeat: 2, ease: "power1.in", immediateRender: false }, at("k3", 0.6 + i * 0.3)));
    K.shake($("ows"), at("k3", 1.2), { dur: 0.8, amp: 10 });

    /* B — wet, torn, lost */
    K.scene($("B"), at("k4", -0.05), at("k5", -0.05), { inn: "fade" });
    K.pop($("pc"), at("k4", 0), { from: 0.6 });
    [0, 1, 2].forEach((i) => tl.fromTo($("dr" + i), { y: -200, autoAlpha: 1 }, { y: 120, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, at("k4", 0.5 + i * 0.12)));
    K.pop($("pw4"), at("k4", 0.6), { from: 0.4 });
    K.sfx("swoosh", at("k4", 0.6));
    tl.to($("pc"), { background: "#d7c39c", filter: "blur(.6px)", duration: 0.3 }, at("k4", 0.7));
    tl.to($("pc"), { clipPath: "polygon(0 0,52% 0,46% 30%,55% 52%,47% 76%,52% 100%,0 100%)", duration: 0.01 }, at("k4", 1.4));
    K.pop($("pw5"), at("k4", 1.4), { from: 0.4 });
    K.sfx("scratch", at("k4", 1.4));
    tl.to($("pc"), { x: -140, rotation: -14, duration: 0.3 }, at("k4", 1.4));
    tl.to($("pc"), { x: -700, y: -500, rotation: -80, autoAlpha: 0, duration: 0.6, ease: "power2.in" }, at("k4", 2.1));
    K.pop($("pw6"), at("k4", 2.2), { from: 0.4 });
    K.sfx("whoosh", at("k4", 2.1));

    /* C — the fix is simple */
    K.scene($("C"), at("k5", -0.05), at("k6", -0.05), { inn: "zoom", dur: 0.4 });
    K.pop($("bb"), at("k5", 0.2), { from: 0.3, dur: 0.6, ease: "back.out(1.8)" });
    K.sfx("impact", at("k5", 0.3));
    K.rise($("wd"), at("k5", 0.5), { y: 40 });
    K.burst(540, 720, at("k5", 0.5), { n: 18, r: 300, colors: ["#ffd23f", "#fff", "#12b76a"] });

    /* D — the code on the counter, the tampon in his phone */
    const calm2 = K.add(`<div class="sc" id="D"><div class="calm"></div></div>`);
    K.scene(calm2, at("k6", -0.05), at("k11", -0.1), { inn: "fade" });
    const qr = K.phone({ src: S + "v2-food-counter.png", x: 300, y: 300, w: 480, z: 12 });
    gsap.set(qr, { autoAlpha: 0 });
    tl.fromTo(qr, { autoAlpha: 0, y: 160 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("k6", 0));
    K.sfx("swish", at("k6", 0));
    K.sfx("scan", at("k6", 1.6));
    qr.screen(S + "v2-food-stamped.png", at("k7", -0.05), "slide");
    K.sfx("stamp", at("k7", 0.5));
    K.burst(540, 600, at("k7", 0.5), { n: 16, r: 260 });
    tl.to(qr, { autoAlpha: 0, scale: 0.9, duration: 0.25 }, at("k8", -0.2));
    // no paper to lose, no tampon by fibbing
    const ch1 = K.add(`<div class="chip" style="left:150px;top:620px"><span class="x">${K.ICON.x}</span><span>كرتون يضيع</span></div>`);
    const ch2 = K.add(`<div class="chip" style="left:310px;top:800px"><span class="x">${K.ICON.x}</span><span>تامبون بالكذب</span></div>`);
    K.pop(ch1, at("k8", 0.05), { from: 0.5 }); K.sfx("pop", at("k8", 0.1));
    K.pop(ch2, at("k8", 0.85), { from: 0.5 }); K.sfx("pop", at("k8", 0.9));
    [ch1, ch2].forEach((c) => K.out(c, at("k9", -0.15)));
    // every tampon on record, for the owner
    const own = K.phone({ src: S + "v2-food-owner-home.png", x: 300, y: 290, w: 480, z: 12 });
    gsap.set(own, { autoAlpha: 0 });
    tl.fromTo(own, { autoAlpha: 0, y: 160 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("k9", -0.1));
    K.sfx("swish", at("k9", -0.1));
    const hl = K.add(`<i style="position:absolute;left:318px;top:${290 + 15 + 1045 * 0.585}px;width:444px;height:${1045 * 0.27}px;border-radius:26px;box-shadow:0 0 0 6px #ffd23f;z-index:13;visibility:hidden;opacity:0"></i>`);
    K.pop(hl, at("k9", 0.6), { from: 1.08, dur: 0.3 });
    K.sfx("ding", at("k9", 0.65));
    tl.to([own, hl], { autoAlpha: 0, duration: 0.25 }, at("k10", -0.15));
    // the owner breathes, the customer comes back
    const happy = K.add(`<div class="sc" id="E"><div class="art" style="left:150px;top:500px;width:300px;height:645px">${K.$("#ow").innerHTML}</div><div class="art" id="hc" style="left:600px;top:560px;width:280px;height:602px">${K.$("#cu2").innerHTML}</div></div>`);
    K.scene(happy, at("k10", -0.1), at("k11", -0.1), { inn: "fade" });
    tl.fromTo(K.$("#hc"), { x: 300 }, { x: 0, duration: 0.5, ease: "back.out(1.3)" }, at("k10", 0.6));
    K.burst(540, 700, at("k10", 1.1), { n: 18, r: 280 });
    K.sfx("win", at("k10", 1.1), -3);

    /* the end: message us on WhatsApp */
    const ec = K.endcard(at("k11", -0.1), { tag: "دخّل Pointili *لمحلّك اليوم*", offer: "شنوّة تستنّى؟" });
    const wa = K.add(`<div class="wa" style="top:1390px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"><path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/></svg><span>+216 58 415 520</span></div>`);
    K.pop(wa, at("k11", 1.2), { from: 0.6 });
    K.sfx("pop", at("k11", 1.25));
    tl.fromTo(wa, { scale: 1 }, { scale: 1.06, duration: 0.4, yoyo: true, repeat: 5, ease: "sine.inOut" }, at("k11", 2.0));
  },
};
