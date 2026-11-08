/**
 * f9 — «الكود اللي يتبدّل» (the code that changes): a little noir. «What if a customer photographs
 * the code and stamps from home?» He can't: the counter's code changes by itself and works once
 * (the app's own «التامبون فات — الكود تبدّل»); the owner chooses how often a customer may get a
 * tampon; every tampon is logged, who and when. Real screens: scan-missed, owner-activity.
 */
import { qrSvg } from "../engine/qr.mjs";

export default {
  title: "الكود اللي يتبدّل",
  voice: "ash",
  music: { style: "noir" },
  lead: 0.3,
  tail: 4,
  lines: [
    { id: "g1", say: "سؤال يجينا *ديما*:" },
    { id: "g2", say: "وكان الحريف *صوّر الكود*؟" },
    { id: "g3", say: "ويقعد ياخو تامبونات *من الدار*؟" },
    { id: "g4", say: "*ما ينجمش*." },
    { id: "g5", say: "الكود اللي على الكونتوار *يتبدّل وحدو*،" },
    { id: "g6", say: "وكل كود يخدم *مرّة برك*." },
    { id: "g7", say: "والتصويرة اللي خذاها؟ *فات وقتها*." },
    { id: "g8", say: "وزيد: انت تختار *كل قدّاش* ينجم ياخو تامبون." },
    { id: "g9", say: "وكل تامبون *مكتوب*: شكون، ووقتاش." },
    { id: "g10", say: "انت تعطي الكادو.. *وانت مرتاح*." },
    { id: "g11", say: "جرّب Pointili بلاش، واكتب «كود» في الكومونتار.", sub: false },
  ],
  assets: () => ({ q1: qrSvg("https://www.pointili.online/?k=7Hq2"), q2: qrSvg("https://www.pointili.online/?k=Zp91x"), q3: qrSvg("https://www.pointili.online/?k=m4Rt8Lw") }),
  css: `
#stage{background:radial-gradient(90% 60% at 50% 35%,#2a2350,#0b0918 75%)}
.sub-word{top:170px}
.sub-word>span{font-size:130px}
.spot{position:absolute;left:140px;top:250px;width:800px;height:1100px;border-radius:50%;background:radial-gradient(closest-side,rgb(255 230 170/.16),transparent)}
.rain{position:absolute;inset:0;background:repeating-linear-gradient(100deg,rgb(255 255 255/.03) 0 2px,transparent 2px 26px)}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0}
.q{position:absolute;font-weight:700;font-size:420px;color:#ffd23f;left:0;right:0;text-align:center;top:420px;text-shadow:0 0 40px rgb(255 210 63/.6)}
.stand{position:absolute;left:290px;top:520px;width:500px;padding:40px;border-radius:40px;background:#fff;box-shadow:0 0 80px rgb(108 71 255/.5)}
.stand .qq{position:relative;width:420px;height:420px}
.stand .qq svg{position:absolute;inset:0;width:100%;height:100%}
.stand b{display:block;text-align:center;font-size:38px;margin-top:18px;color:#0f0e17}
.ring{position:absolute;left:50%;top:-56px;margin-left:-44px;width:88px;height:88px;border-radius:50%;border:10px solid rgb(108 71 255/.3);border-top-color:#6c47ff;background:#fff}
.vf{position:absolute;left:220px;top:470px;width:640px;height:820px;border:6px solid rgb(255 255 255/.7);border-radius:30px}
.flash{position:absolute;inset:0;background:#fff;visibility:hidden;opacity:0;z-index:70}
.photo{position:absolute;left:330px;top:560px;width:420px;padding:18px 18px 70px;background:#f4f1ea;box-shadow:0 30px 60px -20px rgb(0 0 0/.8);transform:rotate(-6deg)}
.photo .qq{width:384px;height:384px}
.photo .qq svg{width:100%;height:100%}
.photo span{position:absolute;bottom:18px;left:0;right:0;text-align:center;font-size:30px;color:#6b6880;font-weight:600}
.home{position:absolute;left:0;right:0;bottom:430px;height:420px}
.sofa{position:absolute;left:180px;bottom:0;width:720px;height:250px;border-radius:60px 60px 30px 30px;background:#3b2f6b;box-shadow:inset 0 30px 0 #4a3c85}
.moon{position:absolute;right:140px;top:280px;width:150px;height:150px;border-radius:50%;box-shadow:-30px 10px 0 0 #ffe9a8}
.xx{position:absolute;left:50%;top:640px;width:380px;height:380px;margin-left:-190px;border-radius:50%;border:26px solid #ff4d4d;visibility:hidden;opacity:0;z-index:40}
.xx:before,.xx:after{content:"";position:absolute;left:50%;top:50%;width:300px;height:26px;margin:-13px 0 0 -150px;background:#ff4d4d;border-radius:13px;transform:rotate(45deg)}
.xx:after{transform:rotate(-45deg)}
.once{position:absolute;left:50%;top:1150px;transform:translateX(-50%);white-space:nowrap;font-weight:700;font-size:58px;color:#fff;background:#6c47ff;padding:16px 44px 24px;border-radius:999px;box-shadow:0 0 40px rgb(108 71 255/.6);visibility:hidden;opacity:0}
.chips{position:absolute;left:110px;right:110px;top:560px;display:flex;flex-direction:column;gap:22px}
.chips span{background:rgb(255 255 255/.08);border:3px solid rgb(255 255 255/.18);color:#fff;font-weight:700;font-size:48px;text-align:center;padding:24px 0 30px;border-radius:30px;visibility:hidden;opacity:0}
.chips span.on{background:#6c47ff;border-color:#9b80ff;box-shadow:0 0 40px rgb(108 71 255/.6)}
.calm{position:absolute;inset:0;background:radial-gradient(90% 60% at 50% 30%,#3c2a8a,#140f33 75%)}
.shield{position:absolute;left:50%;top:520px;width:420px;height:480px;margin-left:-210px}
`,
  html: (A) => `
<i class="spot"></i><i class="rain"></i>
<div class="sc" id="A"><div class="q" id="qm">؟</div></div>
<div class="sc" id="B"><div class="stand" id="st"><i class="ring" id="ring"></i><div class="qq"><span id="qa">${A.q1}</span><span id="qb" style="opacity:0">${A.q2}</span><span id="qc" style="opacity:0">${A.q3}</span></div><b>سكاني وخوذ تامبون</b></div><i class="vf" id="vf"></i></div>
<div class="sc" id="C"><div class="home"><i class="sofa"></i></div><i class="moon"></i><div class="photo" id="ph"><div class="qq">${A.q1}</div><span>الكونتوار · 18:02</span></div></div>
<i class="flash" id="flash"></i>
<i class="xx" id="xx"></i>
<div class="once" id="once">🔒 يخدم مرّة برك</div>
<div class="sc" id="E"><div class="chips"><span>مرّة في النهار</span><span>مرّة كل ساعة</span><span>كل مرّة يشري</span></div></div>
<div class="sc" id="G"><i class="calm"></i><svg class="shield" viewBox="0 0 24 24" fill="none"><path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" fill="#6c47ff" stroke="#b9a6ff" stroke-width="1"/><path d="m8.5 12 2.5 2.5 4.5-5" stroke="#fff" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"/></svg></div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    const S = "../../assets/screens/";
    K.subs("word");

    /* g1 — a question we always get */
    K.scene($("A"), 0, at("g2", -0.05), { inn: "cut" });
    tl.fromTo($("qm"), { autoAlpha: 0.2 }, { autoAlpha: 1, duration: 0.08, repeat: 5, yoyo: true, ease: "none" }, 0.05);
    K.sfx("buzz", 0.1, -8);

    /* g2 — he photographs the code */
    K.scene($("B"), at("g2", -0.05), at("g3", -0.05), { inn: "fade" });
    tl.fromTo($("vf"), { scale: 1.15, autoAlpha: 0 }, { scale: 1, autoAlpha: 1, duration: 0.4 }, at("g2", 0.1));
    // the flash only at the shot (a from-state would light it from the first frame)
    tl.set($("flash"), { autoAlpha: 0.95 }, end("g2", -0.4));
    tl.to($("flash"), { autoAlpha: 0, duration: 0.45, ease: "power2.out" }, end("g2", -0.4));
    K.sfx("shutter", end("g2", -0.42));

    /* g3 — and stamps from home */
    K.scene($("C"), at("g3", -0.05), at("g4", -0.05), { inn: "fade" });
    tl.fromTo($("ph"), { y: 300, rotation: -20, autoAlpha: 0 }, { y: 0, rotation: -6, autoAlpha: 1, duration: 0.6, ease: "back.out(1.4)" }, at("g3", 0.05));
    K.sfx("swoosh", at("g3", 0.05));

    /* g4 — he can't */
    tl.set($("C"), { autoAlpha: 1 }, at("g4", -0.05));
    K.pop($("xx"), at("g4", 0), { from: 2, dur: 0.3, ease: "power3.out" });
    K.sfx("impact", at("g4", 0.05));
    K.shake($("ph"), at("g4", 0.05), { dur: 0.4, amp: 20 });
    tl.to([$("xx"), $("C")], { autoAlpha: 0, duration: 0.25 }, at("g5", -0.15));

    /* g5–g6 — the counter's code changes by itself, works once */
    K.scene($("B"), at("g5", -0.1), at("g7", -0.1), { inn: "fade" });
    tl.set($("vf"), { autoAlpha: 0 }, at("g5", -0.1));
    tl.fromTo($("ring"), { rotation: 0 }, { rotation: 720, duration: Math.max(2, end("g6") - at("g5")), ease: "none" }, at("g5", 0));
    tl.to($("qa"), { opacity: 0, duration: 0.15 }, at("g5", 0.9)); tl.to($("qb"), { opacity: 1, duration: 0.15 }, at("g5", 0.9));
    K.sfx("tick", at("g5", 0.92));
    tl.to($("qb"), { opacity: 0, duration: 0.15 }, at("g6", 0.3)); tl.to($("qc"), { opacity: 1, duration: 0.15 }, at("g6", 0.3));
    K.sfx("tick", at("g6", 0.32));
    K.pop($("once"), at("g6", 0.1), { from: 0.5 });
    K.sfx("pop", at("g6", 0.15));
    K.out($("once"), at("g7", -0.15));

    /* g7 — his photo? too late: the app says so */
    const p = K.phone({ src: S + "scan-missed.png", x: 290, y: 400, w: 500, z: 12 });
    gsap.set(p, { autoAlpha: 0 });
    tl.fromTo(p, { autoAlpha: 0, y: 200 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("g7", -0.05));
    K.sfx("buzz", at("g7", 0.6), -4);
    tl.to(p, { autoAlpha: 0, duration: 0.3 }, at("g8", -0.2));

    /* g8 — and you choose how often he may get one */
    K.scene($("E"), at("g8", -0.1), at("g9", -0.1), { inn: "fade" });
    K.$$("#E .chips span").forEach((c, i) => K.pop(c, at("g8", 0.2 + i * 0.2), { from: 0.8, dur: 0.3 }));
    tl.to(K.$$("#E .chips span")[0], { backgroundColor: "#6c47ff", borderColor: "#9b80ff", boxShadow: "0 0 40px rgba(108,71,255,.6)", duration: 0.2 }, at("g8", 1.3));
    K.sfx("tap", at("g8", 1.3));

    /* g9 — every tampon written down: who, and when */
    const p2 = K.phone({ src: S + "owner-activity.png", x: 290, y: 400, w: 500, z: 12 });
    gsap.set(p2, { autoAlpha: 0 });
    tl.fromTo(p2, { autoAlpha: 0, y: 200 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("g9", -0.05));
    K.drift(p2, at("g9"), end("g9", 0.3), { from: 1, to: 1.04 });
    K.sfx("swish", at("g9", 0));
    tl.to(p2, { autoAlpha: 0, duration: 0.3 }, at("g10", -0.2));

    /* g10 — you give the gift, at ease */
    K.scene($("G"), at("g10", -0.1), null, { inn: "fade" });
    K.pop(K.$("#G .shield"), at("g10", 0.1), { from: 0.4, dur: 0.6 });
    K.sfx("chime", at("g10", 0.2));

    K.endcard(at("g11", -0.1), { tag: "اكتب *«كود»* في الكومونتار", offer: "جرّب Pointili بلاش", keyword: "كود", typeAt: 1.2 });
  },
};
