/**
 * f2 — «الحريف اللي غاب» (the customer who stopped coming): a barber's regular disappears,
 * his paper card went through the wash; with Pointili the card is in his phone, the owner sees
 * him drifting away and sends him a gift tampon on WhatsApp. Flat motion graphics, every piece
 * drawn here. Modelled on the structure of a barber-shop reel (hook → loss → card in the phone
 * → bring him back → «send this to a friend who has a salon»), in our words and only what
 * Pointili really does: no notification is promised — the owner writes, by hand, on WhatsApp.
 */
import { qrSvg } from "../engine/qr.mjs";

const SKIN = "#c98b5e", SKIN2 = "#e0a87c", HAIR = "#1d1a24", INK = "#2b2838";

const barber = `<svg viewBox="0 0 200 430" class="art"><ellipse cx="100" cy="418" rx="70" ry="10" fill="#000" opacity=".08"/>
<rect x="72" y="292" width="24" height="118" rx="11" fill="${INK}"/><rect x="104" y="292" width="24" height="118" rx="11" fill="${INK}"/>
<rect x="62" y="400" width="40" height="16" rx="8" fill="#15131c"/><rect x="98" y="400" width="40" height="16" rx="8" fill="#15131c"/>
<path d="M54 186c-14 18-18 50-14 84" stroke="#fff" stroke-width="22" stroke-linecap="round" fill="none"/><path d="M146 186c14 18 18 50 14 84" stroke="#fff" stroke-width="22" stroke-linecap="round" fill="none"/>
<path d="M52 200c0-34 20-56 48-56s48 22 48 56v100c0 6-4 10-10 10H62c-6 0-10-4-10-10z" fill="#fff"/>
<path d="M70 196h60v104c0 5-4 9-9 9H79c-5 0-9-4-9-9z" fill="${INK}"/><rect x="84" y="226" width="32" height="22" rx="5" fill="#3d3a4c"/>
<circle cx="40" cy="276" r="11" fill="${SKIN}"/><circle cx="160" cy="276" r="11" fill="${SKIN}"/>
<rect x="90" y="128" width="20" height="22" fill="#b97a4f"/><circle cx="100" cy="96" r="40" fill="${SKIN}"/>
<path d="M60 96c0-30 16-48 40-48s40 18 40 48c-6-14-20-24-40-24s-34 10-40 24z" fill="${HAIR}"/>
<circle cx="86" cy="98" r="4.5" fill="${HAIR}"/><circle cx="114" cy="98" r="4.5" fill="${HAIR}"/>
<path d="M82 116c10-7 26-7 36 0-12 6-24 6-36 0z" fill="${HAIR}"/><path d="M90 126c6 4 14 4 20 0" stroke="#7a4a2c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

const client = (shirt = "#6c47ff") => `<svg viewBox="0 0 200 430" class="art"><ellipse cx="100" cy="418" rx="66" ry="10" fill="#000" opacity=".08"/>
<rect x="72" y="282" width="25" height="126" rx="11" fill="#34457a"/><rect x="103" y="282" width="25" height="126" rx="11" fill="#34457a"/>
<rect x="60" y="398" width="42" height="18" rx="9" fill="#fff" stroke="#d9d5e6" stroke-width="3"/><rect x="98" y="398" width="42" height="18" rx="9" fill="#fff" stroke="#d9d5e6" stroke-width="3"/>
<path d="M56 186c-12 20-14 52-10 80" stroke="${shirt}" stroke-width="24" stroke-linecap="round" fill="none"/><path d="M144 186c12 20 14 52 10 80" stroke="${shirt}" stroke-width="24" stroke-linecap="round" fill="none"/>
<path d="M54 196c0-32 20-52 46-52s46 20 46 52v92c0 6-4 10-10 10H64c-6 0-10-4-10-10z" fill="${shirt}"/>
<path d="M80 150c4 16 36 16 40 0" stroke="rgb(0 0 0/.18)" stroke-width="5" fill="none" stroke-linecap="round"/><rect x="76" y="238" width="48" height="26" rx="10" fill="rgb(0 0 0/.12)"/>
<circle cx="46" cy="270" r="11" fill="${SKIN2}"/><circle cx="154" cy="270" r="11" fill="${SKIN2}"/>
<rect x="91" y="126" width="18" height="22" fill="#c98f66"/><circle cx="100" cy="94" r="38" fill="${SKIN2}"/>
<path d="M62 90c0-28 16-44 38-44s38 16 38 44c-8-12-20-18-38-18s-30 6-38 18z" fill="#3a2a20"/>
<circle cx="87" cy="96" r="4.3" fill="${HAIR}"/><circle cx="113" cy="96" r="4.3" fill="${HAIR}"/><path d="M90 112c6 5 14 5 20 0" stroke="#7a4a2c" stroke-width="3.2" fill="none" stroke-linecap="round"/></svg>`;

const chair = `<svg viewBox="0 0 300 360" class="art"><ellipse cx="150" cy="350" rx="96" ry="9" fill="#000" opacity=".08"/>
<rect x="135" y="250" width="30" height="80" rx="6" fill="#b9b6c8"/><rect x="80" y="325" width="140" height="18" rx="9" fill="#8f8ba3"/>
<rect x="80" y="60" width="140" height="150" rx="30" fill="#ff6b4a"/><rect x="105" y="20" width="90" height="34" rx="14" fill="#e5553a"/>
<rect x="60" y="196" width="180" height="58" rx="22" fill="#ff7d5f"/><rect x="38" y="168" width="46" height="18" rx="9" fill="#e5553a"/><rect x="216" y="168" width="46" height="18" rx="9" fill="#e5553a"/></svg>`;

const seated = `<svg viewBox="0 0 300 360" class="art"><path d="M64 254 L150 118 L236 254 Q150 276 64 254z" fill="#fff" stroke="#e2ddef" stroke-width="3"/>
<path d="M118 150 L150 118 L182 150" fill="none" stroke="#e2ddef" stroke-width="3"/><rect x="141" y="102" width="18" height="22" fill="#c98f66"/>
<circle cx="150" cy="76" r="38" fill="${SKIN2}"/><path d="M112 74c0-26 16-40 38-40s38 14 38 40c-8-10-20-16-38-16s-30 6-38 16z" fill="#3a2a20"/>
<circle cx="137" cy="80" r="4" fill="${HAIR}"/><circle cx="163" cy="80" r="4" fill="${HAIR}"/><path d="M140 94c6 5 14 5 20 0" stroke="#7a4a2c" stroke-width="3" fill="none" stroke-linecap="round"/></svg>`;

const okI = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 6 9 17l-5-5"/></svg>`;
const noI = `<svg viewBox="0 0 24 24" fill="none" stroke="#fff" stroke-width="3.4" stroke-linecap="round"><path d="M18 6 6 18"/><path d="m6 6 12 12"/></svg>`;
const day = (id, x, y, ok) => `<div class="day ${ok ? "" : "x"}" id="${id}" style="left:${x}px;top:${y}px"><b>سبت</b><i>${ok ? okI : noI}</i></div>`;
const scissors = (x, y, r) => `<svg class="cut" style="left:${x}px;top:${y}px;transform:rotate(${r}deg)" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg>`;

export default {
  title: "الحريف اللي غاب",
  music: (T) => ({ style: "bounce", breaks: [[T.a5.start - 0.1, T.a9.start - 0.05]] }),
  lead: 0.3,
  tail: 4.2,
  lines: [
    { id: "a1", say: "الحريف اللي كان يحجم عندك *كل جمعة*..", after: 0.25 },
    { id: "a2", say: "عندو *شهر* ما جاش.", after: 0.3 },
    { id: "a3", say: "لا *تغشّش*، لا *اشتكى*.", after: 0.2 },
    { id: "a4", say: "جرّب برك *الحجّام اللي بحذاك*.", after: 0.35 },
    { id: "a5", say: "*النومرو متاعو* ما عندكش..", after: 0.15 },
    { id: "a6", say: "وما تنجمش تقلّو *توحشناك*!", after: 0.35 },
    { id: "a7", say: "والكارط الكرتون اللي عطيتهولو؟", after: 0.15 },
    { id: "a8", say: "*ضاعت* في أوّل تصبينة.", after: 0.45 },
    { id: "a9", say: "أما كان الكارط *في تليفونو*؟", after: 0.25 },
    { id: "a10", say: "*بلا أبليكاسيون*: يسكاني الكود، وتتحلّ.", after: 0.25 },
    { id: "a11", say: "كل حجامة *بتامبون*،", after: 0.1 },
    { id: "a12", say: "وكل تامبون يقرّبو *للكادو*.", after: 0.35 },
    { id: "a13", say: "وكان غاب؟ تشوفو في *«يبعدو»*..", after: 0.15 },
    { id: "a14", say: "والنومرو متاعو *عندك*.", after: 0.25 },
    { id: "a15", say: "تبعثلو *تامبون هدية* في الواتساب:", after: 0.1 },
    { id: "a16", say: "«*توحشناك!* مازالك تامبون واحد».", after: 0.35 },
    { id: "a17", say: "ويرجع يقعد *على الكرسي متاعو*.", after: 0.45 },
    { id: "a18", say: "الحريف ما يستأذنش *قبل ما يمشي*..", after: 0.15 },
    { id: "a19", say: "خلّي الكارط متاعك *في جيبو*.", after: 0.4 },
    { id: "a20", say: "ابعث الفيديو هذا *لصاحبك اللي عندو صالون*..", after: 0.15 },
    { id: "a21", say: "وقلّو يكتب *«كارط»* في الكومونتار.", sub: false },
  ],
  assets: () => ({ qr: qrSvg() }),
  css: `
#stage{background:#f6f2fb}
.art{position:absolute;display:block;overflow:visible}
.sc{position:absolute;inset:0;visibility:hidden;opacity:0}
.halo{position:absolute;left:150px;top:370px;width:780px;height:780px;border-radius:50%;background:radial-gradient(circle,#ebe4ff 0 62%,#f1ecfd 62% 100%)}
.cut{position:absolute;width:74px;height:74px;color:#c3bbdf}
.day{position:absolute;width:132px;height:156px;border-radius:26px;background:#fff;box-shadow:0 16px 30px -16px rgb(40 20 90/.35);overflow:hidden;text-align:center;visibility:hidden;opacity:0}
.day b{display:block;background:var(--brand);color:#fff;font-size:30px;padding:8px 0 13px}
.day i{display:grid;place-items:center;width:66px;height:66px;margin:15px auto 0;border-radius:50%;background:var(--mint)}
.day.x b{background:#8f8ba3}.day.x i{background:var(--coral)}
.day i svg{width:38px;height:38px}
.pole{position:absolute;width:66px;height:300px;border-radius:33px;background:repeating-linear-gradient(140deg,#ff6b4a 0 24px,#fff 24px 48px,#6c47ff 48px 72px,#fff 72px 96px);box-shadow:inset 0 0 0 7px rgb(255 255 255/.55),0 14px 26px -12px rgb(0 0 0/.35)}
.pole:before,.pole:after{content:"";position:absolute;left:-8px;right:-8px;height:26px;border-radius:13px;background:#3d3a4c}
.pole:before{top:-14px}.pole:after{bottom:-14px}
.bigic{position:absolute;width:300px;height:300px;border-radius:50%;display:grid;place-items:center;box-shadow:0 26px 50px -26px rgb(40 20 90/.45)}
.bigic svg{width:190px;height:190px}
.bigic .slash{position:absolute;left:30px;right:30px;top:146px;height:16px;border-radius:8px;background:var(--coral);transform:rotate(-38deg);transform-origin:50% 50%}
.biglbl{position:absolute;width:300px;text-align:center;font-weight:700;font-size:46px;color:var(--ink)}
.shop{position:absolute;top:430px;width:400px;height:520px;background:#fff;border-radius:22px 22px 0 0;box-shadow:0 26px 50px -30px rgb(40 20 90/.45)}
.shop .sign{position:absolute;top:-34px;left:50%;transform:translateX(-50%);white-space:nowrap;background:var(--ink);color:#fff;font-weight:700;font-size:38px;padding:12px 30px 18px;border-radius:999px}
.shop .awn{position:absolute;top:56px;left:-14px;right:-14px;height:96px;border-radius:14px 14px 0 0;-webkit-mask:radial-gradient(circle at 24px 96px,#0000 22px,#000 23px) -24px 0/48px 100%,linear-gradient(#000,#000) 0 0/100% 74px no-repeat}
.shop .win{position:absolute;top:190px;left:34px;width:190px;height:200px;border-radius:16px;background:linear-gradient(160deg,#dff1ff,#bfe0fb)}
.shop .door{position:absolute;bottom:0;right:40px;width:120px;height:250px;border-radius:60px 60px 0 0;background:#d8d2ec}
.shop .door:after{content:"";position:absolute;top:120px;left:20px;width:14px;height:14px;border-radius:50%;background:#8f8ba3}
.ground{position:absolute;left:40px;right:40px;top:950px;height:14px;border-radius:7px;background:#ddd6f1}
.ccard{position:absolute;width:430px;border-radius:30px;background:#fff;padding:28px 30px;box-shadow:0 26px 50px -26px rgb(40 20 90/.45);display:flex;align-items:center;gap:22px}
.ccard .av{width:92px;height:92px;border-radius:50%;background:#ebe4ff;display:grid;place-items:center;font-weight:700;font-size:44px;color:var(--brand);flex:none}
.ccard b{display:block;font-size:40px}
.ccard span{display:block;font-size:36px;color:#9a96ad;letter-spacing:2px;direction:ltr;text-align:right;margin-top:6px}
.qmark{position:absolute;font-weight:700;font-size:200px;color:var(--coral);line-height:1}
.miss{position:absolute;display:flex;align-items:center;gap:18px;background:var(--coral);color:#fff;font-weight:700;font-size:54px;padding:22px 42px 30px;border-radius:999px;box-shadow:0 20px 40px -18px rgb(255 107 74/.8)}
.miss svg{width:52px;height:52px}
.miss .no{position:absolute;inset:-10px;border-radius:999px;border:10px solid var(--ink);}
.miss .no:after{content:"";position:absolute;left:-6%;right:-6%;top:50%;height:10px;background:var(--ink);transform:rotate(-10deg)}
.paper{position:absolute;width:420px;height:250px;border-radius:20px;background:#efe0c2;box-shadow:0 22px 40px -22px rgb(80 50 10/.5);padding:24px 28px;color:#6b5434}
.paper b{display:block;font-size:34px}
.paper .rw{display:flex;gap:14px;margin-top:20px;direction:rtl}
.paper .rw i{width:50px;height:50px;border-radius:50%;border:4px dashed #b99d6f}
.paper .rw i.s{border:none;background:radial-gradient(circle,#7c3a2a 0 45%,#0000 46%),#c9a978}
.wm{position:absolute;width:480px;height:560px;border-radius:48px;background:#fff;box-shadow:0 30px 60px -30px rgb(40 20 90/.5)}
.wm .pan{position:absolute;top:0;left:0;right:0;height:96px;border-bottom:4px solid #eeeaf6}
.wm .pan i{position:absolute;top:30px;width:36px;height:36px;border-radius:50%;background:#e4dff2}
.wm .pan b{position:absolute;top:28px;right:40px;width:140px;height:40px;border-radius:12px;background:#2b2838}
.wm .door{position:absolute;top:150px;left:65px;width:350px;height:350px;border-radius:50%;border:22px solid #dcd6ec;background:#bfe0fb;overflow:hidden}
.wm .water{position:absolute;left:-40px;right:-40px;top:150px;bottom:-40px;background:#8cc8f5;border-radius:44% 46% 0 0}
.wm .mini{position:absolute;left:70px;top:105px;width:170px;height:100px;border-radius:12px;background:#efe0c2;box-shadow:0 8px 16px -8px rgb(0 0 0/.3)}
.bub{position:absolute;border-radius:50%;border:5px solid #fff;opacity:.9}
.ins{position:absolute;inset:0;background:#f4f3f9;padding:120px 34px 0;direction:rtl}
.ins h3{font-size:44px;font-weight:700}
.ins p{font-size:24px;color:#77748a;margin-top:6px}
.ins .seg{display:flex;gap:12px;margin-top:26px}
.ins .seg span{flex:1;background:#fff;border-radius:22px;padding:14px 0 18px;text-align:center;font-size:24px;color:#77748a;font-weight:600}
.ins .seg span b{display:block;font-size:40px;color:var(--ink)}
.ins .seg span.on{background:var(--coral-soft);color:var(--coral);box-shadow:inset 0 0 0 3px var(--coral)}
.ins .seg span.on b{color:var(--coral)}
.ins h4{margin-top:30px;font-size:28px;font-weight:700}
.ins .row{display:flex;align-items:center;gap:16px;background:#fff;border-radius:24px;padding:18px 20px;margin-top:14px}
.ins .row i{width:64px;height:64px;border-radius:50%;background:#ebe4ff;color:var(--brand);display:grid;place-items:center;font-style:normal;font-weight:700;font-size:30px;flex:none}
.ins .row div{flex:1;min-width:0}
.ins .row b{display:block;font-size:28px}
.ins .row small{display:block;font-size:22px;color:var(--coral);font-weight:600;margin-top:2px}
.ins .row .ph{font-size:21px;color:#77748a;direction:ltr;margin-top:4px;text-align:right;font-weight:600}
.ins .row.hot{box-shadow:inset 0 0 0 4px var(--coral)}
.ins .row .ph.lit{color:var(--mint)}
.cardpage{position:absolute;inset:0;background:#f4f3f9;padding:108px 22px 0}
.cardpage h3{font-size:27px;font-weight:700}
.cardpage .his{margin-top:26px;background:#fff;border-radius:26px;padding:10px 22px}
.cardpage .his div{display:flex;justify-content:space-between;align-items:center;padding:16px 0;border-bottom:2px solid #f0eef6;font-size:22px;color:#77748a}
.cardpage .his div b{color:var(--ink);font-size:24px}
.cardpage .his div:last-child{border:0}
.qrstand{position:absolute;width:300px;padding:26px 26px 30px;border-radius:30px;background:#fff;box-shadow:0 26px 50px -26px rgb(40 20 90/.45);text-align:center}
.qrstand .q{width:248px;height:248px}
.qrstand .q svg{width:100%;height:100%}
.qrstand b{display:block;margin-top:16px;font-size:30px;color:var(--brand)}
.scanline{position:absolute;left:26px;right:26px;top:26px;height:8px;border-radius:4px;background:var(--mint);box-shadow:0 0 22px 6px rgb(18 183 106/.5)}
.jeans{position:absolute;left:190px;top:420px;width:700px;height:720px;border-radius:60px 60px 30px 30px;background:linear-gradient(170deg,#4a5f9c,#34457a);box-shadow:0 30px 60px -30px rgb(20 30 80/.6);overflow:hidden}
.jeans:before{content:"";position:absolute;left:0;right:0;top:0;height:70px;background:#2f3d6d;border-bottom:4px dashed #8ea0d6}
.jeans .pk{position:absolute;left:120px;top:250px;width:460px;height:400px;border:6px dashed #8ea0d6;border-radius:30px 30px 160px 160px;background:linear-gradient(170deg,#4d63a3,#3a4c86)}
.jeans .ph{position:absolute;left:200px;top:110px;width:300px;height:420px;border-radius:44px;background:#14121b;padding:12px}
.jeans .ph div{width:100%;height:100%;border-radius:34px;background:linear-gradient(165deg,#9b80ff,#6c47ff 55%,#5a37e8);}
.jeans .ph .pass{transform-origin:0 0}
.share{position:absolute;display:flex;align-items:center;justify-content:space-between;left:150px;right:150px;top:600px}
.share .p{width:230px;height:230px;border-radius:50%;display:grid;place-items:center;box-shadow:0 24px 46px -24px rgb(40 20 90/.5)}
.share .dash{position:absolute;left:230px;right:230px;top:112px;border-top:8px dashed #c9c0ea}
.share .plane{position:absolute;top:66px;width:96px;height:96px;border-radius:50%;background:var(--brand);display:grid;place-items:center;color:#fff}
.share .plane svg{width:52px;height:52px}
.share .badge{position:absolute;right:-6px;bottom:6px;width:84px;height:84px;border-radius:50%;background:var(--coral);display:grid;place-items:center;color:#fff;border:6px solid #f6f2fb}
.share .badge svg{width:44px;height:44px}
.plus{position:absolute;font-weight:700;font-size:96px;color:var(--mint);direction:ltr}
.heart{position:absolute;color:var(--coral)}
`,
  html: (A) => `
<div class="halo" id="halo"></div>
${scissors(60, 110, -20)}${scissors(946, 110, 20)}

<div class="sc" id="s1">
  <div class="art" id="b1" style="left:40px;top:500px;width:270px;height:580px">${barber}</div>
  <div class="art" id="ch1" style="left:300px;top:560px;width:490px;height:588px">${chair}</div>
  <div class="art" id="se1" style="left:300px;top:560px;width:490px;height:588px">${seated}</div>
  <div class="pole" id="pole" style="left:880px;top:640px"></div>
  ${day("d1", 330, 380, true)}${day("d2", 474, 380, true)}${day("d3", 618, 380, true)}
  ${day("x1", 258, 380, false)}${day("x2", 402, 380, false)}${day("x3", 546, 380, false)}${day("x4", 690, 380, false)}
</div>

<div class="sc" id="s3">
  <div class="bigic" id="ang" style="left:170px;top:520px;background:#ffe3dc"><svg viewBox="0 0 100 100"><circle cx="50" cy="50" r="40" fill="#ff8a6e"/><path d="M30 38l14 6M70 38l-14 6" stroke="#2b2838" stroke-width="6" stroke-linecap="round"/><circle cx="37" cy="50" r="5" fill="#2b2838"/><circle cx="63" cy="50" r="5" fill="#2b2838"/><path d="M34 72q16-12 32 0" stroke="#2b2838" stroke-width="6" fill="none" stroke-linecap="round"/></svg><i class="slash" id="sl1"></i></div>
  <div class="bigic" id="cmp" style="left:610px;top:520px;background:#e6e0ff"><svg viewBox="0 0 100 100"><path d="M14 22a10 10 0 0 1 10-10h52a10 10 0 0 1 10 10v36a10 10 0 0 1-10 10H44L26 84V68h-2a10 10 0 0 1-10-10z" fill="#fff" stroke="#6c47ff" stroke-width="6" stroke-linejoin="round"/><path d="M50 26v20" stroke="#ff6b4a" stroke-width="8" stroke-linecap="round"/><circle cx="50" cy="56" r="4.5" fill="#ff6b4a"/></svg><i class="slash" id="sl2"></i></div>
  <div class="biglbl" id="l1" style="left:170px;top:850px">تغشّش</div>
  <div class="biglbl" id="l2" style="left:610px;top:850px">اشتكى</div>
</div>

<div class="sc" id="s4">
  <div class="shop" id="shA" style="left:560px"><div class="awn" style="background:repeating-linear-gradient(90deg,#6c47ff 0 48px,#fff 48px 96px)"></div><div class="sign">صالون أمين</div><div class="win"></div><div class="door"></div></div>
  <div class="shop" id="shB" style="left:120px"><div class="awn" style="background:repeating-linear-gradient(90deg,#ff6b4a 0 48px,#fff 48px 96px)"></div><div class="sign" dir="ltr">Barber 216</div><div class="win"></div><div class="door"></div></div>
  <div class="ground"></div>
  <div class="art" id="walk" style="left:640px;top:600px;width:170px;height:366px">${client()}</div>
</div>

<div class="sc" id="s5">
  <div class="art" id="b5" style="left:130px;top:520px;width:230px;height:494px">${barber}</div>
  <div class="qmark" id="q5" style="left:205px;top:300px">?</div>
  <div class="ccard" id="cc" style="left:450px;top:560px"><span class="av">ح</span><div><b>حريف السبت</b><span>?? ??? ???</span></div></div>
  <div class="miss" id="miss" style="left:470px;top:800px"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/></svg><span>توحشناك!</span><i class="no" id="no"></i></div>
</div>

<div class="sc" id="s6">
  <div class="paper" id="pc" style="left:330px;top:560px"><b>صالون أمين</b><div class="rw"><i class="s"></i><i class="s"></i><i class="s"></i><i></i><i></i></div></div>
  <div class="wm" id="wm" style="left:300px;top:450px"><div class="pan"><i style="left:40px"></i><i style="left:92px"></i><b></b></div>
    <div class="door"><div class="water" id="water"></div><div class="mini" id="mini"></div>
      <i class="bub" id="bb1" style="left:80px;top:220px;width:40px;height:40px"></i><i class="bub" id="bb2" style="left:200px;top:250px;width:28px;height:28px"></i><i class="bub" id="bb3" style="left:150px;top:200px;width:22px;height:22px"></i></div></div>
</div>

<div class="sc" id="s7">
  <div class="qrstand" id="qs" style="left:110px;top:520px"><div class="q">${A.qr}</div><b>سكاني وخوذ تامبون</b><i class="scanline" id="scan"></i></div>
</div>

<div class="sc" id="s12">
  <div class="art" id="wk" style="left:450px;top:560px;width:190px;height:409px;z-index:5">${client()}</div>
  <div class="jeans" id="jeans"><div class="pk"></div><div class="ph" id="pph"><div></div></div></div>
</div>

<div class="sc" id="s13">
  <div class="share"><span class="p" style="background:#fff"><svg viewBox="0 0 24 24" width="120" height="120" fill="none" stroke="#6c47ff" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg></span>
  <i class="dash"></i><span class="plane" id="plane"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M14.5 21.7a.5.5 0 0 0 .9 0l6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z"/><path d="m21.9 2.1-10.9 10.9"/></svg></span>
  <span class="p" id="friend" style="background:#fff;position:relative"><svg viewBox="0 0 24 24" width="120" height="120" fill="none" stroke="#ff6b4a" stroke-width="2"><circle cx="12" cy="8" r="4"/><path d="M4 21c1-4 4.5-6 8-6s7 2 8 6"/></svg><span class="badge"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.2" stroke-linecap="round"><circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/></svg></span></span></div>
</div>
`,
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("big");
    K.progress("#ff6b4a");
    // the pole turns all film long; the halo breathes
    tl.fromTo($("pole"), { backgroundPositionY: 0 }, { backgroundPositionY: 96 * 40, duration: K.tl.duration(), ease: "none" }, 0);
    tl.fromTo($("halo"), { scale: 0.96 }, { scale: 1.03, duration: 2.4, yoyo: true, repeat: 20, ease: "sine.inOut" }, 0);

    /* 1 — the regular, every Saturday */
    K.scene($("s1"), 0, at("a3"), { inn: "cut", dur: 0.3 });
    K.pop($("b1"), 0.05, { from: 0.8, y: 30 });
    K.pop($("ch1"), 0.15, { from: 0.8, y: 30 });
    K.pop($("se1"), 0.25, { from: 0.8, y: 30 });
    K.pop($("pole"), 0.3, { from: 0.6 });
    ["d1", "d2", "d3"].forEach((d, i) => { K.pop($(d), at("a1", 0.35 + i * 0.28), { from: 0.4 }); K.sfx("tick", at("a1", 0.45 + i * 0.28)); });
    tl.to($("b1"), { rotation: -4, transformOrigin: "50% 100%", duration: 0.5, yoyo: true, repeat: 3, ease: "sine.inOut" }, at("a1", 0.2));
    /* 2 — a month without him */
    ["d1", "d2", "d3"].forEach((d, i) => K.out($(d), at("a2", -0.1 + i * 0.04), { dur: 0.2 }));
    tl.to($("se1"), { autoAlpha: 0, x: 260, duration: 0.5, ease: "power2.in" }, at("a2", 0));
    K.sfx("swoosh", at("a2", 0));
    ["x1", "x2", "x3", "x4"].forEach((d, i) => { K.pop($(d), at("a2", 0.25 + i * 0.16), { from: 0.4 }); K.sfx("buzz", at("a2", 0.33 + i * 0.16), -8); });
    tl.to($("b1"), { y: 8, duration: 0.4, ease: "power2.out" }, at("a2", 0.3));

    /* 3 — no anger, no complaint */
    K.scene($("s3"), at("a3", -0.05), at("a4"), { dur: 0.3 });
    K.pop($("ang"), at("a3", 0), { from: 0.5 });
    K.pop($("cmp"), at("a3", 0.35), { from: 0.5 });
    K.rise($("l1"), at("a3", 0.15), { y: 20 });
    K.rise($("l2"), at("a3", 0.5), { y: 20 });
    tl.fromTo([$("sl1"), $("sl2")], { scaleX: 0 }, { scaleX: 1, duration: 0.25, stagger: 0.35, ease: "power2.out" }, at("a3", 0.55));
    K.sfx("scratch", at("a3", 0.6)); K.sfx("scratch", at("a3", 0.95));

    /* 4 — he just tried the one next door */
    K.scene($("s4"), at("a4", -0.05), at("a5"), { dur: 0.3 });
    K.rise($("shA"), at("a4", 0), { y: 80 });
    K.rise($("shB"), at("a4", 0.12), { y: 80 });
    K.pop($("walk"), at("a4", 0.25), { from: 0.7 });
    const w0 = at("a4", 0.55), w1 = end("a4", 0.25);
    tl.to($("walk"), { x: -430, duration: w1 - w0, ease: "none" }, w0);
    tl.to($("walk"), { keyframes: Array.from({ length: 8 }, (_, i) => ({ y: i % 2 ? -14 : 0, duration: (w1 - w0) / 8 })), ease: "none" }, w0);
    tl.to($("walk"), { autoAlpha: 0, scale: 0.85, duration: 0.25 }, w1 - 0.15);
    for (let i = 0; i < 4; i++) K.sfx("tick", w0 + ((w1 - w0) * i) / 4, -6);

    /* 5 — no number, no way to say «we miss you» */
    K.scene($("s5"), at("a5", -0.05), at("a7"), { dur: 0.3 });
    K.pop($("b5"), at("a5", 0), { from: 0.8, y: 30 });
    K.pop($("cc"), at("a5", 0.2), { from: 0.7 });
    K.pop($("q5"), at("a5", 0.45), { from: 0.3 });
    K.sfx("boing", at("a5", 0.45));
    tl.to($("q5"), { rotation: 10, duration: 0.3, yoyo: true, repeat: 5, ease: "sine.inOut" }, at("a5", 0.8));
    K.pop($("miss"), at("a6", 0), { from: 0.6 });
    K.sfx("pop", at("a6", 0.05));
    K.pop($("no"), at("a6", 0.75), { from: 1.6, dur: 0.3, ease: "power3.out" });
    K.sfx("buzz", at("a6", 0.8));
    K.shake($("miss"), at("a6", 0.8), { dur: 0.4, amp: 16 });

    /* 6 — the paper card went through the wash */
    K.scene($("s6"), at("a7", -0.05), at("a9"), { dur: 0.3 });
    K.pop($("pc"), at("a7", 0), { from: 0.6 });
    tl.to($("pc"), { rotation: -6, duration: 0.5, yoyo: true, repeat: 1, ease: "sine.inOut" }, at("a7", 0.4));
    tl.to($("pc"), { x: 60, y: 230, scale: 0.4, rotation: 200, autoAlpha: 0, duration: 0.45, ease: "power2.in" }, at("a8", -0.1));
    K.pop($("wm"), at("a8", -0.25), { from: 0.7 });
    K.sfx("whoosh", at("a8", -0.2));
    tl.fromTo($("mini"), { rotation: 0, autoAlpha: 0 }, { autoAlpha: 1, duration: 0.2 }, at("a8", 0.3));
    tl.to($("mini"), { rotation: 360 * 4, duration: 2.6, ease: "power1.in" }, at("a8", 0.3));
    tl.to($("water"), { rotation: 8, yPercent: -6, duration: 0.35, yoyo: true, repeat: 7, ease: "sine.inOut" }, at("a8", 0.2));
    ["bb1", "bb2", "bb3"].forEach((b, i) => tl.fromTo($(b), { y: 0, autoAlpha: 0 }, { y: -160, autoAlpha: 1, duration: 1.2, repeat: 1, ease: "none" }, at("a8", 0.3 + i * 0.25)));
    K.shake($("wm"), at("a8", 0.5), { dur: 1.2, amp: 5 });
    K.sfx("boing", at("a8", 0.4), -3);

    /* 7 — the card in his phone, no app */
    const ph = K.phone({ x: 500, y: 290, w: 420, z: 12 });
    ph.put(`<div class="cardpage"><h3>الكارطات متاعي</h3><div class="his" style="margin-top:210px"><div><b>تامبون</b><span>السبت 10:30</span></div><div><b>تامبون</b><span>السبت 11:05</span></div><div><b>تامبون</b><span>السبت 10:12</span></div></div></div>`);
    const card = K.pass({ name: "صالون أمين", color: "#6c47ff", goal: 6, stamps: 1, gift: "حجامة بلاش", icon: "scissors", x: 20, y: 170, w: 350, size: 15.5, parent: ph.scr, z: 3 });
    gsap.set(ph, { autoAlpha: 0 });
    K.scene($("s7"), at("a9", -0.05), at("a11"), { dur: 0.3 });
    tl.fromTo(ph, { autoAlpha: 0, y: 1400, rotation: 8 }, { autoAlpha: 1, y: 0, rotation: 0, duration: 0.6, ease: "back.out(1.2)" }, at("a9", 0));
    K.sfx("whoosh", at("a9", 0));
    const noApp = K.pill("بلا أبليكاسيون", { x: 110, y: 330, cls: "coral", icon: "nodl", z: 40 });
    K.pop(noApp, at("a10", 0), { from: 0.6 });
    K.sfx("pop", at("a10", 0.05));
    K.pop($("qs"), at("a10", 0.35), { from: 0.7 });
    tl.fromTo($("scan"), { y: 0, autoAlpha: 1 }, { y: 240, duration: 0.55, repeat: 1, yoyo: true, ease: "sine.inOut" }, at("a10", 0.6));
    K.sfx("scan", at("a10", 1.6));
    K.out(noApp, at("a11", -0.15));
    card.stamp(2, at("a10", 1.75), { sound: "stamp" });
    // the card itself, big, for the stamps
    tl.to(ph, { autoAlpha: 0, scale: 0.85, y: 60, duration: 0.35, ease: "power2.in" }, at("a11", -0.25));
    tl.to($("s7"), { autoAlpha: 0, duration: 0.3 }, at("a11", -0.25));
    /* 8 — every haircut a tampon, every tampon closer */
    const big = K.pass({ name: "صالون أمين", color: "#6c47ff", goal: 6, stamps: 2, gift: "حجامة بلاش", icon: "scissors", x: 110, y: 560, w: 860, size: 38, z: 22 });
    K.pop(big, at("a11", -0.1), { from: 0.7, dur: 0.5 });
    K.sfx("swish", at("a11", -0.1));
    big.stamp(3, at("a11", 0.4));
    big.stamp(4, at("a12", 0.05));
    big.stamp(5, at("a12", 0.55));
    tl.fromTo(big.dots[5], { scale: 1 }, { scale: 1.22, duration: 0.28, yoyo: true, repeat: 3, ease: "sine.inOut" }, end("a12", -0.25));
    K.sfx("chime", end("a12", -0.15));
    K.out(big, at("a13", -0.2), { dur: 0.3 });

    /* 9 — he drifts away: «يبعدو», and his number is there */
    const ph2 = K.phone({ x: 320, y: 270, w: 440, z: 12 });
    ph2.put(`<div class="ins"><h3>شكون رجع؟</h3><p>الحرفاء اللي رجعولك، اللي بعدو، وقدّاش يطوّلو</p>
      <div class="seg"><span><b>41</b>نشطين</span><span class="on" id="segc"><b>6</b>يبعدو</span><span><b>3</b>ضاعو</span></div>
      <h4>يبعدو: كلمة منك ترجّعهم</h4>
      <div class="row hot" id="rowc"><i>ح</i><div><b>حريف السبت</b><small>ما جاش من 30 يوم</small><div class="ph" id="phn">+216 98 •• •214</div></div></div>
      <div class="row"><i>س</i><div><b>سامي</b><small>ما جاش من 18 يوم</small></div></div>
      <div class="row"><i>ك</i><div><b>كريم</b><small>ما جاش من 15 يوم</small></div></div></div>`);
    gsap.set(ph2, { autoAlpha: 0 });
    tl.fromTo(ph2, { autoAlpha: 0, y: 120, scale: 0.94 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.5 }, at("a13", -0.05));
    K.sfx("swish", at("a13", 0));
    tl.fromTo(K.$("#segc"), { scale: 1 }, { scale: 1.12, duration: 0.25, yoyo: true, repeat: 1 }, at("a13", 0.9));
    K.sfx("tap", at("a13", 0.95));
    tl.fromTo(K.$("#rowc"), { scale: 1 }, { scale: 1.05, duration: 0.25, yoyo: true, repeat: 1 }, at("a14", 0));
    tl.to(K.$("#phn"), { color: "#12b76a", duration: 0.2 }, at("a14", 0.25));
    tl.fromTo(K.$("#phn"), { scale: 1 }, { scale: 1.3, duration: 0.25, yoyo: true, repeat: 1, transformOrigin: "100% 50%" }, at("a14", 0.25));
    K.sfx("ding", at("a14", 0.3));
    tl.to(ph2, { autoAlpha: 0, x: 200, duration: 0.35, ease: "power2.in" }, at("a15", -0.2));

    /* 10 — a gift tampon on WhatsApp, written by the owner */
    const ch = K.chat({ name: "حريف السبت", sub: "واتساب", x: 120, y: 380, w: 840, msgs: [
      { me: true, text: "توحشناك! 💜", time: "18:40" },
      { me: true, text: "🎁 تامبون جديد من صالون أمين! حلّ الرابط هذا وخوذو في الكارط متاعك:", link: "www.pointili.online/s/kX29fQ", time: "18:40" },
      { me: true, text: "مازالك تامبون واحد باش تربح *حجامة بلاش* ✂️", time: "18:41" },
    ] });
    gsap.set(ch, { autoAlpha: 0 });
    tl.fromTo(ch, { autoAlpha: 0, y: 100 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("a15", -0.05));
    ch.msgs.forEach((m, i) => { K.pop(m, at("a15", 0.45 + i * 0.75), { from: 0.6, ease: "back.out(2)" }); K.sfx("msg", at("a15", 0.5 + i * 0.75)); });
    tl.to(ch, { autoAlpha: 0, y: -80, duration: 0.35, ease: "power2.in" }, at("a17", -0.2));

    /* 11 — and he is back in his chair */
    const back = K.add(`<div class="sc" id="s11">
      <div class="art" style="left:40px;top:500px;width:270px;height:580px" id="b11">${K.$("#b1").innerHTML}</div>
      <div class="art" style="left:300px;top:560px;width:490px;height:588px">${K.$("#ch1").innerHTML}</div>
      <div class="art" id="se11" style="left:300px;top:560px;width:490px;height:588px">${K.$("#se1").innerHTML}</div>
      <div class="plus" id="p11" style="left:700px;top:430px">+1</div></div>`);
    K.scene(back, at("a17", -0.15), at("a18"), { dur: 0.3 });
    tl.fromTo(K.$("#se11"), { x: 300, autoAlpha: 0 }, { x: 0, autoAlpha: 1, duration: 0.55, ease: "back.out(1.4)" }, at("a17", 0.1));
    K.sfx("swish", at("a17", 0.1));
    tl.to(K.$("#b11"), { y: -24, duration: 0.18, yoyo: true, repeat: 3, ease: "power2.out" }, at("a17", 0.6));
    K.pop(K.$("#p11"), at("a17", 0.75), { from: 0.3 });
    K.sfx("stamp", at("a17", 0.8));
    K.burst(560, 650, at("a17", 0.8), { n: 18, r: 260 });

    /* 12 — he will not ask before he goes: keep your card in his pocket */
    K.scene($("s12"), at("a18", -0.05), at("a20"), { dur: 0.3 });
    const w2 = $("wk");
    K.scene(w2, at("a18", 0), at("a19", -0.1), { dur: 0.2 });
    tl.set($("jeans"), { autoAlpha: 0 }, at("a18", -0.05));
    tl.to(w2, { x: -420, duration: end("a18") - at("a18"), ease: "none" }, at("a18", 0.2));
    K.sfx("swish", at("a18", 0.2));
    tl.fromTo($("jeans"), { autoAlpha: 0, y: 140 }, { autoAlpha: 1, y: 0, duration: 0.45 }, at("a19", -0.1));
    tl.fromTo($("pph"), { y: 260 }, { y: 0, duration: 0.6, ease: "back.out(1.6)" }, at("a19", 0.25));
    K.sfx("whoosh", at("a19", 0.25));
    const mini = K.pass({ name: "صالون أمين", goal: 6, stamps: 5, gift: "حجامة بلاش", icon: "scissors", x: 12, y: 12, w: 276, size: 13, parent: K.$("#pph div"), z: 2 });
    K.burst(540, 560, at("a19", 0.8), { n: 12, r: 200, colors: ["#ffd23f", "#fff", "#9b80ff"] });

    /* 13 — send it to a friend with a salon; the end card */
    K.scene($("s13"), at("a20", -0.05), at("a21"), { dur: 0.3 });
    tl.fromTo($("plane"), { left: 230 }, { left: 520, duration: 1.1, ease: "power2.inOut" }, at("a20", 0.3));
    K.sfx("whoosh", at("a20", 0.3));
    K.pop($("friend"), at("a20", 1.3), { from: 0.8, dur: 0.4 });
    K.sfx("pop", at("a20", 1.35));
    K.endcard(at("a21", -0.15), { tag: "قلّو يكتب *«كارط»* في الكومونتار", offer: "جرّب Pointili بلاش", keyword: "كارط", typeAt: 1.0 });
  },
};
