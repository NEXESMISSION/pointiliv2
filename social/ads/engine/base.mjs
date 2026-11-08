/**
 * What every film's page starts from: Pointili's font (Readex Pro, the app's own, from v2's build)
 * and the pieces the kit draws (engine/kit.js). Paths are from .cache/<film>/index.html.
 */
const F = "../../assets/fonts";
export const FONTS = `
@font-face{font-family:"Readex Pro";font-weight:160 700;font-display:block;src:url(${F}/readex-arabic.woff2) format("woff2");unicode-range:U+6??,U+750-77F,U+870-891,U+897-8E1,U+8E3-8FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
@font-face{font-family:"Readex Pro";font-weight:160 700;font-display:block;src:url(${F}/readex-latin.woff2) format("woff2");unicode-range:U+??,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+304,U+308,U+329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
@font-face{font-family:"Readex Pro";font-weight:160 700;font-display:block;src:url(${F}/readex-latin-ext.woff2) format("woff2");unicode-range:U+100-2BA,U+2BD-2C5,U+2C7-2CC,U+2CE-2D7,U+2DD-2FF,U+1E00-1E9F,U+20A0-20AB,U+20AD-20C4}
`;

export const BASE_CSS = `
:root{--brand:#6c47ff;--brand-soft:#efeaff;--brand-deep:#4a2ad6;--coral:#ff6b4a;--coral-soft:#ffede8;--mint:#12b76a;--mint-soft:#e5f8ee;--ink:#0f0e17;--canvas:#f4f3f9;--muted:#6b6880;--line:#e7e5f0}
*{box-sizing:border-box;margin:0;padding:0}
html,body{width:1080px;height:1920px;overflow:hidden;background:#000}
body{font-family:"Readex Pro",system-ui,sans-serif;color:var(--ink);-webkit-font-smoothing:antialiased}
#stage{position:relative;width:1080px;height:1920px;overflow:hidden;background:var(--canvas)}
#stage *{will-change:auto}
.abs{position:absolute}
.layer{position:absolute;inset:0}
.hide{visibility:hidden;opacity:0}
.num,.ltr{direction:ltr;unicode-bidi:isolate}
img.cover{position:absolute;inset:0;width:100%;height:100%;object-fit:cover}

/* ── subtitles: four looks, one per reference ── */
.sub{position:absolute;left:70px;right:70px;display:flex;justify-content:center;text-align:center;pointer-events:none;visibility:hidden;opacity:0;z-index:50}
.sub .hl{color:var(--brand)}
.sub .st{text-decoration:line-through;text-decoration-thickness:6px;text-decoration-color:var(--coral)}
/* a white pill at the bottom, the key word in the brand's colour */
.sub-pill{bottom:430px}
.sub-pill>span{background:#fff;color:var(--ink);font-weight:700;font-size:52px;line-height:1.35;padding:14px 36px 20px;border-radius:30px;box-shadow:0 14px 34px -12px rgb(15 14 23/.4);max-width:900px}
/* big words in the middle, coming one by one */
.sub-big{top:1210px;bottom:auto}
.sub-big>span{font-weight:700;font-size:76px;line-height:1.28;color:var(--ink);max-width:900px}
.sub-big .hl{color:var(--coral)}
.sub-big .w{display:inline-block;margin:0 .13em}
/* one word at a time, very big, over a picture */
.sub-word{top:420px;bottom:auto}
.sub-word>span{font-weight:700;font-size:150px;line-height:1.1;color:#fff;-webkit-text-stroke:10px var(--ink);paint-order:stroke fill;text-shadow:0 10px 0 var(--ink),0 18px 40px rgb(0 0 0/.35)}
.sub-word>span.hl{color:#ffd23f}
/* small, white, outlined: under a comic */
.sub-small{bottom:470px}
.sub-small>span{font-weight:700;font-size:46px;line-height:1.35;color:#fff;-webkit-text-stroke:9px #000;paint-order:stroke fill;max-width:900px}
.sub-small .hl{color:#ffd23f}

/* ── labels ── */
.pill{position:absolute;display:inline-flex;align-items:center;gap:14px;white-space:nowrap;font-weight:700;font-size:44px;line-height:1;padding:20px 32px 24px;border-radius:999px;background:#fff;color:var(--ink);box-shadow:0 14px 30px -12px rgb(15 14 23/.35);visibility:hidden;opacity:0}
.pill.brand{background:var(--brand);color:#fff}
.pill.coral{background:var(--coral);color:#fff}
.pill.mint{background:var(--mint);color:#fff}
.pill.ink{background:var(--ink);color:#fff}
.pill .hl{color:var(--brand)}
.pill svg{width:1.05em;height:1.05em;flex:none}

/* ── a phone ── */
.phone{position:absolute;padding:15px;border-radius:86px;background:linear-gradient(150deg,#34323d,#0b0a0f 60%);box-shadow:inset 0 0 0 3px #4a4855,0 60px 110px -40px rgb(20 12 60/.6)}
.phone .scr{position:relative;border-radius:72px;overflow:hidden;background:#fff;aspect-ratio:1170/2532}
.phone .scr img{position:absolute;left:0;top:0;width:100%;height:auto}
.phone .island{position:absolute;top:26px;left:50%;width:142px;height:42px;margin-left:-71px;border-radius:21px;background:#000;z-index:5}

/* ── Pointili's card, as the app draws it (components/Pass.tsx), bigger ── */
.pass{position:absolute;--c:#6c47ff;font-size:36px;border-radius:1.5em;color:#fff;overflow:hidden;padding:1em 1.25em .85em;direction:rtl;
  background:linear-gradient(165deg,color-mix(in oklab,var(--c) 82%,white) 0%,var(--c) 55%,color-mix(in oklab,var(--c) 88%,black) 100%);
  box-shadow:0 34px 70px -34px color-mix(in oklab,var(--c) 75%,black)}
.pass .top{display:flex;align-items:center;gap:.75em}
.pass .mark{width:2.25em;height:2.25em;border-radius:.75em;background:rgb(255 255 255/.95);display:grid;place-items:center;color:var(--c);flex:none}
.pass .mark svg{width:1.4em;height:1.4em}
.pass .name{flex:1;min-width:0;font-weight:700;font-size:1em;line-height:1.2;text-align:right;white-space:nowrap;overflow:hidden;text-overflow:ellipsis}
.pass .count{position:relative;flex:none;direction:ltr;font-weight:700;line-height:1;min-width:2.6em;height:1.5em}
.pass .count>span{position:absolute;left:0;bottom:0;white-space:nowrap}
.pass .count b{font-size:1.5em}
.pass .count i{font-style:normal;font-size:.94em;opacity:.7}
.pass .dots{margin-top:.9em;display:grid;gap:.5em;justify-items:center}
.pass .dot{position:relative;width:100%;max-width:2.5em;aspect-ratio:1;border-radius:50%;background:rgb(255 255 255/.2);display:grid;place-items:center;color:rgb(255 255 255/.8)}
.pass .dot>svg{width:46%;height:46%}
.pass .dot .on{position:absolute;inset:0;border-radius:50%;background:#fff;color:var(--c);display:grid;place-items:center;box-shadow:0 2px 6px rgb(0 0 0/.15)}
.pass .dot .on svg{width:50%;height:50%}
.pass .line{position:relative;margin-top:.9em;border-top:2px solid rgb(255 255 255/.2);padding-top:.55em;height:1.95em;font-size:.84em;font-weight:600}
.pass .line>span{position:absolute;right:0;left:0;display:flex;align-items:center;gap:.5em;white-space:nowrap}
.pass .line svg{width:1.25em;height:1.25em;flex:none}

/* ── an Instagram-ish comment box, the keyword typed in it ── */
.cbox{position:absolute;display:flex;align-items:center;gap:22px;background:#fff;border-radius:999px;padding:20px 26px 20px 30px;box-shadow:0 18px 40px -16px rgb(15 14 23/.45);direction:rtl}
.cbox .av{width:72px;height:72px;border-radius:50%;flex:none;background:linear-gradient(135deg,#feda75,#fa7e1e 35%,#d62976 65%,#962fbf)}
.cbox .txt{flex:1;font-size:48px;font-weight:700;color:var(--ink);min-height:1.3em;white-space:nowrap;display:flex;align-items:center}
.cbox .txt .ph{color:#9a98a8;font-weight:500;position:absolute}
.cbox .caret{display:inline-block;width:4px;height:1.1em;background:var(--brand);margin-inline-start:4px}
.cbox .send{width:76px;height:76px;border-radius:50%;background:var(--brand);display:grid;place-items:center;color:#fff;flex:none}
.cbox .send svg{width:40px;height:40px}

/* ── «reply to a comment», as Instagram stickers it on a reel ── */
.reply{position:absolute;background:#fff;border-radius:34px;padding:26px 34px 30px;box-shadow:0 20px 44px -18px rgb(15 14 23/.5);direction:rtl;max-width:860px}
.reply .who{display:flex;align-items:center;gap:14px;font-size:30px;color:#77748a;font-weight:500}
.reply .who i{width:44px;height:44px;border-radius:50%;background:linear-gradient(135deg,#8ec5fc,#e0c3fc);flex:none}
.reply .q{margin-top:12px;font-size:46px;line-height:1.35;font-weight:700;color:var(--ink)}

/* ── a chat (WhatsApp-like, no logo) ── */
.chat{position:absolute;border-radius:44px;overflow:hidden;background:#efeae2;box-shadow:0 40px 80px -36px rgb(15 14 23/.55);direction:rtl}
.chat .head{display:flex;align-items:center;gap:20px;background:#f7f5f3;padding:26px 30px;border-bottom:1px solid #e3ddd6}
.chat .head .av{width:74px;height:74px;border-radius:50%;background:var(--brand);color:#fff;display:grid;place-items:center;font-weight:700;font-size:34px}
.chat .head b{display:block;font-size:36px}
.chat .head small{display:block;font-size:26px;color:#667781}
.chat .body{padding:30px 26px 40px;display:flex;flex-direction:column;gap:18px}
.chat .msg{max-width:84%;background:#fff;border-radius:26px;padding:20px 26px 14px;font-size:34px;line-height:1.45;box-shadow:0 2px 2px rgb(0 0 0/.06)}
.chat .msg.me{align-self:flex-start;background:#d9fdd3}
.chat .msg.them{align-self:flex-end}
.chat .msg a{display:block;color:#027eb5;direction:ltr;text-align:left;font-size:30px;margin-top:6px;word-break:break-all}
.chat .msg time{display:block;text-align:left;font-size:22px;color:#667781;margin-top:4px;direction:ltr}

/* ── the brand's end card ── */
.end{position:absolute;inset:0;display:flex;flex-direction:column;align-items:center;justify-content:center;gap:0;color:#fff;
  background:radial-gradient(90% 60% at 20% 0%,rgb(255 255 255/.22),transparent 60%),linear-gradient(150deg,#7c4dff,#6c47ff 45%,#3f22c9);visibility:hidden;opacity:0;z-index:80}
/* the classes of a film (.word, .tag…) never move the pieces of the end card */
#stage .end>*{position:relative;inset:auto;transform:none}
.end .logo{width:250px;height:250px;border-radius:64px;background:#fff;display:grid;place-items:center;box-shadow:0 40px 80px -30px rgb(20 8 80/.7)}
.end .logo svg{width:170px}
.end .word{margin-top:44px;font-size:116px;font-weight:700;letter-spacing:-1px;direction:ltr}
.end .tag{margin-top:14px;font-size:44px;font-weight:500;opacity:.95;padding:0 60px;text-align:center}
.end .hl{color:#ffd23f}
.end .offer{margin-top:56px;background:#ffd23f;color:var(--ink);font-weight:700;font-size:46px;padding:18px 40px 24px;border-radius:999px}
.end .cbox{position:relative;margin-top:46px;width:820px}
.end .url{margin-top:44px;font-size:48px;font-weight:700;direction:ltr;opacity:.95}

/* ── a finger's tap, a burst, a progress bar ── */
.tap{position:absolute;width:120px;height:120px;margin:-60px 0 0 -60px;border-radius:50%;background:rgb(255 255 255/.55);border:6px solid rgb(255 255 255/.9);box-shadow:0 0 0 2px rgb(15 14 23/.15);visibility:hidden;opacity:0;z-index:60}
.spark{position:absolute;width:22px;height:22px;margin:-11px 0 0 -11px;border-radius:50%;visibility:hidden;opacity:0;z-index:60}
.progress{position:absolute;left:0;right:0;bottom:0;height:12px;background:rgb(15 14 23/.08);z-index:90}
.progress i{position:absolute;inset:0;transform-origin:100% 50%;background:var(--coral)}
.mark-bug{position:absolute;top:120px;left:60px;display:flex;align-items:center;gap:14px;direction:ltr;font-weight:700;font-size:38px;color:#fff;z-index:85;text-shadow:0 2px 10px rgb(0 0 0/.35)}
.mark-bug .m{width:62px;height:62px;border-radius:18px;background:#fff;display:grid;place-items:center}
.mark-bug .m svg{width:44px}
`;
