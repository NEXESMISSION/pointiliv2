/**
 * apk — «كيفاش تحطّ Pointili في تليفونك»: an explainer, not an ad. The Android app
 * (www.pointili.online/android → public/pointili.apk) put on a phone step by step, the way a
 * phone in French asks it: Chrome warns before the download («Télécharger quand même»), the file
 * opens («Ouvrir»), Android asks once to let Chrome install apps («Paramètres» → «Autoriser cette
 * source»), then «Installer» — and Pointili opens, its icon on the home screen like any app.
 *
 * The phone's screens are drawn (the system's own dialogs, no logo); the app's screen in it is a
 * real one (assets/screens). The camera moves in on each dialog, so the button to tap is big
 * enough to read on the phone the film is watched on. No voice: the captions say it.
 *
 *   node render.mjs apk   → out/apk-install.mp4, copied to ../explainers/install-apk.mp4
 */
export default {
  title: "كيفاش تحطّ Pointili في تليفونك",
  music: { style: "tech", gain: -10 },
  lead: 0.4,
  gap: 0.3,
  tail: 2.2,
  lines: [
    { id: "i1", say: "تحبّ *Pointili* أبليكاسيون في تليفونك؟", dur: 2.6 },
    { id: "i2", say: "*4 خطوات*، وفي أقل من دقيقة.", dur: 2.6 },
    { id: "s1", say: "حلّ الرابط: *pointili.online/android*", dur: 3.4 },
    { id: "s2", say: "Chrome يحذّرك؟ عادي، يعملها مع أي تطبيق موش من Play Store", dur: 3.4 },
    { id: "s3", say: "اختار *Télécharger quand même*", dur: 2.8 },
    { id: "s4", say: "كي يوفى التحميل، اختار *Ouvrir*", dur: 2.8 },
    { id: "s5", say: "أوّل مرّة برك، Android يسألك: اختار *Paramètres*", dur: 3.2 },
    { id: "s6", say: "شعّل *Autoriser cette source*، وارجع لتالي", dur: 3.4 },
    { id: "s7", say: "توّا اختار *Installer*", dur: 2.6 },
    { id: "s8", say: "كان سألك *Play Protect*، كمّل عادي.", dur: 2.8 },
    { id: "s9", say: "*Ouvrir*… وهاو Pointili في تليفونك!", dur: 3.0 },
    { id: "s10", say: "ومن بعد، حلّو من *الأيقونة* متاعو، كيما أي أبليكاسيون.", dur: 3.6 },
    { id: "e1", say: "pointili.online/android", sub: false, dur: 2.4 },
  ],
  assets: () => ({ icon: "../../assets/apk/icon.png", app: "../../assets/screens/v2-food-owner-home.png" }),
  css: `
#stage{background:linear-gradient(180deg,#efeaff,#f8f6ff 45%,#fff4e6)}
.sub-pill{bottom:96px}
.ax-cam{position:absolute;left:0;top:0;width:1080px;height:1920px}
.phone .island{width:30px;height:30px;margin-left:-15px;top:14px;border-radius:50%}
.ax-l{position:absolute;inset:0;direction:ltr;text-align:left;font-family:"Readex Pro",system-ui,sans-serif;visibility:hidden;opacity:0}
.ax-l svg{display:block}
/* the status bar, over every screen */
.ax-sb{position:absolute;left:0;right:0;top:0;height:44px;display:flex;align-items:center;justify-content:space-between;padding:4px 30px 0;font-size:19px;font-weight:600;color:#1b1b1f;z-index:4;direction:ltr}
.ax-sb .r{display:flex;gap:7px;align-items:center}
.ax-sb svg{width:20px;height:20px}
/* the home screen */
.ax-home{background:linear-gradient(170deg,#cbbcff 0%,#eee6ff 42%,#ffe2d2 100%)}
.ax-home .clk{position:absolute;left:0;right:0;top:120px;text-align:center;color:#2a2340}
.ax-home .clk b{display:block;font-size:104px;font-weight:300;letter-spacing:-2px;line-height:1}
.ax-home .clk span{display:block;margin-top:10px;font-size:22px;font-weight:500}
.ax-ic{position:absolute;width:120px;margin-left:-60px;text-align:center}
.ax-ic>i:first-child{display:grid;place-items:center;width:84px;height:84px;margin:0 auto;border-radius:50%;background:#fff;box-shadow:0 6px 14px -8px rgb(40 20 90/.5)}
.ax-ic>i:first-child svg{width:40px;height:40px}
.ax-ic span{display:block;margin-top:8px;font-size:17px;font-weight:500;color:#2a2340;white-space:nowrap}
.ax-ic img{display:block;width:84px;height:84px;margin:0 auto;border-radius:50%;box-shadow:0 8px 18px -8px rgb(60 30 160/.7)}
.ax-slot>i{background:transparent;border:4px dashed rgb(108 71 255/.55);box-shadow:none;color:#6c47ff;font-style:normal;font-size:40px;font-weight:700}
.ax-new{visibility:hidden;opacity:0}
.phone .scr .ax-ic img{position:static;width:84px;height:84px}
.ax-ic .ax-hi{inset:auto;left:50%;top:42px;width:112px;height:112px;margin:-56px 0 0 -56px;border-radius:50%;border-width:5px}
.ax-dock{position:absolute;left:24px;right:24px;bottom:56px;height:118px;border-radius:40px;background:rgb(255 255 255/.45)}
.ax-nav{position:absolute;left:50%;bottom:14px;width:150px;height:6px;margin-left:-75px;border-radius:3px;background:rgb(27 27 31/.55);z-index:4}
/* Chrome */
.ax-chrome{background:#fff}
.ax-tb{position:absolute;left:0;right:0;top:44px;height:84px;display:flex;align-items:center;gap:16px;padding:0 18px;border-bottom:1px solid #e3e3e8}
.ax-url{flex:1;height:58px;border-radius:29px;background:#eef0f4;display:flex;align-items:center;gap:10px;padding:0 20px;font-size:23px;color:#1b1b1f;white-space:nowrap;overflow:hidden}
.ax-url svg{width:20px;height:20px;flex:none;color:#5f6368}
.ax-url .ph{color:#80868b}
.ax-url .cr{display:inline-block;width:3px;height:26px;background:#0b57d0;vertical-align:middle;margin-left:1px}
.ax-tabs{width:30px;height:30px;border:3px solid #444;border-radius:7px;font-size:15px;font-weight:700;display:grid;place-items:center;color:#444}
.ax-more{width:6px;display:flex;flex-direction:column;gap:5px}
.ax-more i{width:6px;height:6px;border-radius:50%;background:#444}
.ax-load{position:absolute;left:0;top:127px;height:4px;width:530px;background:#0b57d0;transform-origin:0 50%;transform:scaleX(0)}
.ax-ntp{position:absolute;left:0;right:0;top:300px;display:flex;justify-content:center;gap:34px}
.ax-ntp i{width:70px;height:70px;border-radius:50%;background:#f1f3f4}
.ax-ntp2{position:absolute;left:60px;right:60px;top:200px;height:20px;border-radius:10px;background:#f1f3f4}
.ax-kb{position:absolute;left:0;right:0;bottom:0;height:400px;background:#e8eaed;padding:16px 6px 40px;display:flex;flex-direction:column;gap:12px}
.ax-kb div{display:flex;justify-content:center;gap:7px}
.ax-kb u{text-decoration:none;flex:0 0 44px;height:62px;border-radius:9px;background:#fff;display:grid;place-items:center;font-size:24px;color:#202124;box-shadow:0 1px 0 rgb(0 0 0/.18)}
.ax-kb u.wd{flex:0 0 74px;background:#d2d5da;font-size:18px}
.ax-kb u.sp{flex:0 0 220px}
.ax-kb u.go{position:relative;flex:0 0 84px;background:#0b57d0;color:#fff}
.ax-kb u.go svg{width:28px;height:28px}
/* a dialog, Material 3 as Android and Chrome draw it */
.ax-scrim{position:absolute;inset:0;background:rgb(0 0 0/.42);display:flex;align-items:center;justify-content:center}
.ax-dlg{width:468px;border-radius:30px;background:#fff;padding:32px 28px 18px;box-shadow:0 20px 50px -20px rgb(0 0 0/.5)}
.ax-dlg h4{font-size:27px;font-weight:600;line-height:1.3;color:#1b1b1f}
.ax-dlg p{margin-top:14px;font-size:21px;line-height:1.5;color:#46464f}
.ax-dlg .app{display:flex;align-items:center;gap:18px}
.phone .scr .ax-dlg .app img{position:static;width:66px;height:66px;border-radius:50%}
.ax-dlg .app h4{font-size:29px}
.ax-acts{display:flex;justify-content:flex-end;gap:6px;margin-top:22px}
.ax-btn{position:relative;font-size:21px;font-weight:700;color:#0b57d0;padding:14px 18px;border-radius:999px;white-space:nowrap}
.ax-hi{position:absolute;inset:-6px;border-radius:999px;border:4px solid #ff6b4a;visibility:hidden;opacity:0}
.ax-tap{position:absolute;left:50%;top:50%;width:76px;height:76px;margin:-38px 0 0 -38px;border-radius:50%;background:rgb(108 71 255/.3);border:4px solid rgb(108 71 255/.85);visibility:hidden;opacity:0;z-index:3}
.ax-bar{margin-top:20px;height:8px;border-radius:4px;background:#dfe3eb;overflow:hidden}
.ax-bar i{display:block;height:100%;width:100%;background:#0b57d0;transform-origin:0 50%;transform:scaleX(0)}
.ax-swap{position:relative}
.ax-swap>div{visibility:hidden;opacity:0}
.ax-swap>div:first-child{visibility:visible;opacity:1}
.ax-swap>div+div{position:absolute;inset:0}
/* Chrome's download message, at the foot */
.ax-snack{position:absolute;left:16px;right:16px;bottom:40px;border-radius:22px;background:#2f3033;color:#fff;display:flex;align-items:center;gap:16px;padding:20px 18px 20px 22px;box-shadow:0 14px 30px -12px rgb(0 0 0/.55)}
.ax-snack .ic{width:46px;height:46px;border-radius:50%;background:#3c4043;display:grid;place-items:center;flex:none;color:#a8c7fa}
.ax-snack .ic svg{width:24px;height:24px}
.ax-snack .tx{flex:1;min-width:0;font-size:20px;line-height:1.35}
.ax-snack .tx b{display:block;font-size:21px}
.ax-snack .tx small{display:block;font-size:17px;color:#c4c7c5}
.ax-snack .ax-btn{color:#a8c7fa;font-size:22px}
.ax-snack .ax-bar{position:absolute;left:22px;right:22px;bottom:10px;margin:0;height:5px;background:#4a4c50}
.ax-snack .ax-bar i{background:#a8c7fa}
/* Settings: install unknown apps */
.ax-set{background:#f7f2fa}
.ax-set .bar{position:absolute;left:0;right:0;top:44px;height:90px;display:flex;align-items:center;gap:14px;padding:0 14px}
.ax-set .back{position:relative;width:56px;height:56px;border-radius:50%;display:grid;place-items:center;color:#1b1b1f}
.ax-set .back svg{width:30px;height:30px}
.ax-set h3{position:absolute;left:30px;right:30px;top:150px;font-size:34px;font-weight:500;line-height:1.25;color:#1b1b1f}
.ax-set .who{position:absolute;left:30px;right:30px;top:260px;display:flex;align-items:center;gap:18px}
.ax-set .who i{width:64px;height:64px;border-radius:50%;background:#e8f0fe;display:grid;place-items:center;color:#1a73e8}
.ax-set .who i svg{width:36px;height:36px}
.ax-set .who b{font-size:25px;font-weight:600;color:#1b1b1f}
.ax-set .row{position:absolute;left:16px;right:16px;top:370px;height:104px;border-radius:26px;background:#fff;display:flex;align-items:center;justify-content:space-between;padding:0 24px}
.ax-set .row span{font-size:23px;font-weight:500;color:#1b1b1f}
.ax-sw{position:relative;width:76px;height:44px;border-radius:22px;background:#e2e1ec;border:3px solid #77767f}
.ax-sw .k{position:absolute;left:7px;top:7px;width:24px;height:24px;border-radius:50%;background:#77767f}
.ax-set .note{position:absolute;left:34px;right:34px;top:500px;font-size:17px;line-height:1.5;color:#5d5e66}
/* the app opening */
.ax-app{background:#f4f3f9;overflow:hidden}
.phone .scr .ax-app img{position:absolute;left:0;top:44px;width:100%;height:auto}
/* the four steps, at the top */
.ax-steps{position:absolute;left:36px;right:36px;top:70px;height:160px;border-radius:40px;background:#fff;box-shadow:0 18px 40px -22px rgb(40 20 90/.45);display:flex;justify-content:space-between;align-items:flex-start;padding:24px 22px 0;z-index:45;visibility:hidden;opacity:0}
.ax-steps .ln{position:absolute;left:110px;right:110px;top:54px;height:6px;border-radius:3px;background:#ece9f6}
.ax-st{position:relative;width:226px;text-align:center}
.ax-st .c{position:relative;width:62px;height:62px;margin:0 auto;border-radius:50%;background:#ece9f6;color:#77748a;font-size:28px;font-weight:700;display:grid;place-items:center}
.ax-st .c em{position:absolute;inset:0;display:grid;place-items:center;font-style:normal;visibility:hidden;opacity:0}
.ax-st .c em svg{width:30px;height:30px}
.ax-st span{display:block;margin-top:10px;font-size:28px;font-weight:700;color:#77748a;direction:ltr}
.ax-once{position:absolute;left:50%;top:-46px;white-space:nowrap;background:#ff6b4a;color:#fff;font-style:normal;font-size:26px;font-weight:700;padding:6px 20px 10px;box-shadow:0 8px 18px -8px rgb(255 107 74/.8);border-radius:999px;visibility:hidden;opacity:0}
`,
  html: (A) => {
    const svg = (p, sw = 2.2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
    const I = {
      phone: '<path d="M22 16.9v3a2 2 0 0 1-2.2 2 19.8 19.8 0 0 1-8.6-3.1 19.5 19.5 0 0 1-6-6A19.8 19.8 0 0 1 2.1 4.2 2 2 0 0 1 4.1 2h3a2 2 0 0 1 2 1.7c.1 1 .4 1.9.7 2.8a2 2 0 0 1-.5 2.1L8 9.9a16 16 0 0 0 6 6l1.3-1.3a2 2 0 0 1 2.1-.4c.9.3 1.8.6 2.8.7a2 2 0 0 1 1.7 2z"/>',
      msg: '<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>',
      cam: '<path d="M14.5 4h-5L7 7H4a2 2 0 0 0-2 2v9a2 2 0 0 0 2 2h16a2 2 0 0 0 2-2V9a2 2 0 0 0-2-2h-3z"/><circle cx="12" cy="13" r="3"/>',
      img: '<rect width="18" height="18" x="3" y="3" rx="2"/><circle cx="9" cy="9" r="2"/><path d="m21 15-3.1-3.1a2 2 0 0 0-2.8 0L6 21"/>',
      cal: '<rect width="18" height="18" x="3" y="4" rx="2"/><path d="M16 2v4M8 2v4M3 10h18"/>',
      clock: '<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>',
      gear: '<circle cx="12" cy="12" r="3"/><path d="M12 2v3M12 19v3M4.9 4.9l2.1 2.1M17 17l2.1 2.1M2 12h3M19 12h3M4.9 19.1 7 17M17 7l2.1-2.1"/>',
      calc: '<rect width="16" height="20" x="4" y="2" rx="2"/><path d="M8 6h8M8 10h.01M12 10h.01M16 10h.01M8 14h.01M12 14h.01M16 14h.01M8 18h.01M12 18h.01M16 18h.01"/>',
      globe: '<circle cx="12" cy="12" r="10"/><path d="M12 2a14.5 14.5 0 0 0 0 20 14.5 14.5 0 0 0 0-20M2 12h20"/>',
      lock: '<rect width="16" height="11" x="4" y="11" rx="2"/><path d="M8 11V7a4 4 0 0 1 8 0v4"/>',
      back: '<path d="m12 19-7-7 7-7M19 12H5"/>',
      dl: '<path d="M12 15V3M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4M7 10l5 5 5-5"/>',
      ok: '<path d="M20 6 9 17l-5-5"/>',
      enter: '<path d="M20 4v7a4 4 0 0 1-4 4H4"/><path d="m9 10-5 5 5 5"/>',
      wifi: '<path d="M12 20h.01M2 8.8a15 15 0 0 1 20 0M5 12.9a10 10 0 0 1 14 0M8.5 16.4a5 5 0 0 1 7 0"/>',
      bat: '<rect width="16" height="10" x="2" y="7" rx="2"/><path d="M22 11v2"/><path d="M5 10h8v4H5z" fill="currentColor" stroke="none"/>',
    };
    const ic = (k, color) => `<i style="color:${color}">${svg(I[k])}</i>`;
    const btn = (id, text) => `<b class="ax-btn" id="${id}"><span>${text}</span><i class="ax-hi"></i><i class="ax-tap"></i></b>`;
    // the home screen's icons: four across, centres at 66, 199, 331, 464
    const X = [66, 199, 331, 464];
    const app = (x, y, k, color, label) => `<div class="ax-ic" style="left:${x}px;top:${y}px">${ic(k, color)}${label ? `<span>${label}</span>` : ""}</div>`;
    const keys = (s) => [...s].map((c) => `<u>${c}</u>`).join("");
    return `
<div class="ax-steps" id="steps"><i class="ln"></i>
  ${["Télécharger", "Ouvrir", "Autoriser", "Installer"].map((w, i) => `<div class="ax-st" id="st${i + 1}"><div class="c"><b>${i + 1}</b><em>${svg(I.ok, 3.4)}</em></div><span>${w}</span>${i === 2 ? '<em class="ax-once" id="once">مرّة برك</em>' : ""}</div>`).join("")}
</div>
<div class="ax-cam" id="cam"></div>
<template id="screens">
  <div class="ax-l ax-home" id="home">
    <div class="clk"><b>10:42</b><span>dimanche 9 novembre</span></div>
    ${app(X[0], 520, "cal", "#1a73e8", "Agenda")}${app(X[1], 520, "clock", "#5f6368", "Horloge")}${app(X[2], 520, "img", "#e8710a", "Galerie")}${app(X[3], 520, "gear", "#5f6368", "Paramètres")}
    ${app(X[0], 680, "calc", "#188038", "Calculatrice")}
    <div class="ax-ic ax-slot" id="slot" style="left:${X[1]}px;top:680px"><i>?</i></div>
    <div class="ax-ic ax-new" id="newic" style="left:${X[1]}px;top:680px"><img src="${A.icon}"><span>Pointili</span><i class="ax-hi" id="icring"></i><i class="ax-tap" id="ictap" style="top:42px"></i></div>
    <div class="ax-dock"></div>
    ${app(X[0], 1000, "phone", "#188038")}${app(X[1], 1000, "msg", "#1a73e8")}${app(X[2], 1000, "globe", "#d93025")}${app(X[3], 1000, "cam", "#5f6368")}
  </div>
  <div class="ax-l ax-chrome" id="chrome">
    <div class="ax-tb"><div class="ax-url" id="url"><span id="lock" style="display:none">${svg(I.lock)}</span><span class="ph" id="urlph">Rechercher ou saisir une URL</span><span id="urltx">${[..."pointili.online/android"].map((c) => `<span class="ch" style="display:none">${c}</span>`).join("")}</span><i class="cr" id="caret"></i></div><div class="ax-tabs">1</div><div class="ax-more"><i></i><i></i><i></i></div></div>
    <i class="ax-load" id="load"></i>
    <i class="ax-ntp2"></i><div class="ax-ntp"><i></i><i></i><i></i><i></i></div>
    <div class="ax-kb" id="kb"><div>${keys("azertyuiop")}</div><div>${keys("qsdfghjklm")}</div><div><u class="wd">⇧</u>${keys("wxcvbn")}<u class="wd">⌫</u></div><div><u class="wd">?123</u><u>,</u><u class="sp"></u><u>.</u><u class="go" id="go">${svg(I.enter)}<i class="ax-tap"></i></u></div></div>
  </div>
  <div class="ax-l" id="warn"><div class="ax-scrim"><div class="ax-dlg">
    <h4>Fichier potentiellement dangereux</h4>
    <p>Ce type de fichier peut endommager votre appareil. Voulez-vous quand même télécharger Pointili.apk&nbsp;?</p>
    <div class="ax-acts">${btn("wno", "Annuler")}${btn("wyes", "Télécharger quand même")}</div>
  </div></div></div>
  <div class="ax-l" id="snackl"><div class="ax-snack"><span class="ic">${svg(I.dl)}</span>
    <div class="tx ax-swap" id="snacktx"><div><b>Pointili.apk</b><small>Téléchargement…</small></div><div><b>Pointili.apk</b><small>Téléchargement terminé · 55 Ko</small></div></div>
    <span id="openw" style="visibility:hidden;opacity:0">${btn("open1", "Ouvrir")}</span>
    <div class="ax-bar" id="snackbar"><i></i></div></div></div>
  <div class="ax-l" id="block"><div class="ax-scrim"><div class="ax-dlg">
    <p style="margin-top:0">Pour votre sécurité, votre téléphone n'est pas autorisé à installer des applications inconnues provenant de cette source.</p>
    <div class="ax-acts">${btn("bno", "Annuler")}${btn("bset", "Paramètres")}</div>
  </div></div></div>
  <div class="ax-l ax-set" id="set">
    <div class="bar"><b class="back" id="back">${svg(I.back)}<i class="ax-hi" style="inset:-4px"></i><i class="ax-tap"></i></b></div>
    <h3>Installer des applis inconnues</h3>
    <div class="who"><i>${svg(I.globe)}</i><b>Chrome</b></div>
    <div class="row"><span>Autoriser cette source</span><div class="ax-sw" id="sw"><i class="k" id="knob"></i><i class="ax-hi" id="swhi"></i><i class="ax-tap" id="swtap"></i></div></div>
    <p class="note">Votre téléphone et vos données personnelles sont plus vulnérables aux attaques provenant d'applications inconnues.</p>
  </div>
  <div class="ax-l" id="inst"><div class="ax-scrim"><div class="ax-dlg">
    <div class="app"><img src="${A.icon}"><h4>Pointili</h4></div>
    <div class="ax-swap" id="instsw">
      <div><p>Voulez-vous installer cette application&nbsp;?</p><div class="ax-acts">${btn("ino", "Annuler")}${btn("iyes", "Installer")}</div></div>
      <div><p>Installation…</p><div class="ax-bar" id="ibar"><i></i></div><div class="ax-acts" style="visibility:hidden">${btn("_x", "Installer")}</div></div>
      <div><p>Application installée.</p><div class="ax-acts">${btn("idone", "Terminé")}${btn("iopen", "Ouvrir")}</div></div>
    </div>
  </div></div></div>
  <div class="ax-l ax-app" id="app1"><img src="${A.app}"></div>
  <div class="ax-l ax-app" id="app2"><img src="${A.app}"></div>
  <div class="ax-sb"><span>10:42</span><span class="r">${svg(I.wifi)}${svg(I.bat)}</span></div>
  <i class="ax-nav"></i>
</template>`;
  },
  build: (tl, K, at, end) => {
    const $ = (id) => K.$("#" + id);
    K.subs("pill");

    /* the phone, inside a camera that moves in on what to tap */
    const cam = $("cam");
    gsap.set(cam, { x: 0, y: 0, scale: 1, transformOrigin: "0 0" });
    const ph = K.phone({ x: 260, y: 300, w: 560, parent: cam, z: 10 });
    const scr = ph.scr;
    // the screens, laid under the camera hole
    const tpl = $("screens");
    [...tpl.content.children].forEach((n) => scr.insertBefore(n, ph.island));
    tpl.remove();
    const S = (sx, sy) => [275 + sx, 315 + sy]; // a point of the screen, on the stage
    /** the camera on a point of the screen, at a scale, that point brought to height py */
    const zoom = (t, sx, sy, s, py, dur = 0.6) => {
      const [fx, fy] = S(sx, sy);
      tl.to(cam, { x: s === 1 ? 0 : 540 - fx * s, y: s === 1 ? 0 : py - fy * s, scale: s, duration: dur, ease: "power2.inOut" }, t);
    };
    const DLG = [265, 573];

    /* a button: a ring around it while it waits, then a finger on it */
    const ring = (el, t0, t1) => {
      const r = el.querySelector(".ax-hi");
      tl.set(r, { autoAlpha: 1 }, t0);
      tl.fromTo(r, { scale: 1.3 }, { scale: 1, duration: 0.35, ease: "back.out(2.2)", immediateRender: false }, t0);
      const n = Math.max(1, Math.floor((t1 - t0 - 0.35) / 0.42));
      tl.to(r, { scale: 1.07, duration: 0.42, ease: "sine.inOut", repeat: n - 1, yoyo: true }, t0 + 0.35);
      tl.set(r, { autoAlpha: 0 }, t1);
      K.sfx("pop", t0, -6);
    };
    const press = (el, t, tapEl = null) => {
      const d = tapEl ?? el.querySelector(".ax-tap");
      tl.fromTo(d, { autoAlpha: 0, scale: 1.7 }, { autoAlpha: 1, scale: 0.8, duration: 0.18, ease: "power2.out", immediateRender: false }, t);
      tl.to(d, { autoAlpha: 0, scale: 1.9, duration: 0.35, ease: "power2.out" }, t + 0.2);
      K.sfx("tap", t + 0.12);
    };
    /** one of a box's states (ax-swap) in place of the one showing */
    const swap = (box, i, t) => {
      const kids = [...box.children];
      kids.forEach((k, j) => tl.set(k, { autoAlpha: j === i ? 1 : 0 }, t));
    };

    /* the four steps: on, then done */
    const step = (n) => $("st" + n);
    const stepOn = (n, t) => {
      const c = step(n).querySelector(".c");
      tl.to(c, { backgroundColor: "#6c47ff", color: "#fff", scale: 1.16, duration: 0.3, ease: "back.out(2.5)" }, t);
      tl.to(step(n).querySelector("span"), { color: "#6c47ff", duration: 0.2 }, t);
      K.sfx("swish", t, -4);
    };
    const stepDone = (n, t) => {
      const c = step(n).querySelector(".c");
      tl.to(c, { backgroundColor: "#12b76a", color: "#fff", scale: 1, duration: 0.25 }, t);
      tl.set(c.querySelector("b"), { autoAlpha: 0 }, t);
      tl.fromTo(c.querySelector("em"), { autoAlpha: 0, scale: 0.3 }, { autoAlpha: 1, scale: 1, duration: 0.3, ease: "back.out(3)", immediateRender: false }, t);
      tl.to(step(n).querySelector("span"), { color: "#12b76a", duration: 0.2 }, t);
      K.sfx("ding", t, -8);
    };

    /* i1 — the phone, its home screen, a place waiting for Pointili */
    tl.fromTo(ph, { autoAlpha: 0, y: 220 }, { autoAlpha: 1, y: 0, duration: 0.7, ease: "power3.out" }, 0.05);
    K.sfx("whoosh", 0.05, -4);
    K.show($("home"), 0);
    const slot = $("slot");
    tl.fromTo(slot, { autoAlpha: 0, scale: 0.4 }, { autoAlpha: 1, scale: 1, duration: 0.45, ease: "back.out(2.4)", immediateRender: false }, at("i1", 0.7));
    tl.set(slot, { autoAlpha: 0 }, 0);
    tl.to(slot, { scale: 1.12, duration: 0.45, ease: "sine.inOut", repeat: 5, yoyo: true }, at("i1", 1.2));
    K.sfx("pop", at("i1", 0.75));
    zoom(at("i1", 0.6), 199, 722, 1.25, 860, 1.4);

    /* i2 — four steps */
    K.pop($("steps"), at("i2", -0.05), { from: 0.85, y: -30 });
    [1, 2, 3, 4].forEach((n, i) => {
      tl.fromTo(step(n), { autoAlpha: 0, y: 24 }, { autoAlpha: 1, y: 0, duration: 0.35, ease: "back.out(2)", immediateRender: false }, at("i2", 0.25 + i * 0.22));
      tl.set(step(n), { autoAlpha: 0 }, 0);
      K.sfx("pop", at("i2", 0.3 + i * 0.22), -4);
    });
    zoom(at("i2", 0.2), 0, 0, 1, 0, 0.8);

    /* s1 — Chrome, the address typed, the keyboard */
    stepOn(1, at("s1", -0.15));
    K.scene($("chrome"), at("s1", -0.2), null, { inn: "up", dur: 0.45 });
    zoom(at("s1", -0.1), 265, 600, 1.3, 920, 0.7);
    tl.fromTo($("kb"), { yPercent: 100 }, { yPercent: 0, duration: 0.35, ease: "power3.out" }, at("s1", 0.15));
    const chs = K.$$("#urltx .ch");
    const t0 = at("s1", 0.55), td = 1.35;
    tl.set($("urlph"), { display: "none" }, t0);
    chs.forEach((c, i) => {
      tl.set(c, { display: "inline" }, t0 + (td * i) / chs.length);
      K.sfx("key", t0 + (td * i) / chs.length, -6);
    });
    tl.to($("caret"), { autoAlpha: 0, duration: 0.01, repeat: 9, yoyo: true, repeatDelay: 0.45 }, at("s1", 0));
    press($("go"), at("s1", 2.15));
    tl.set($("caret"), { display: "none" }, at("s1", 2.4));
    tl.set($("lock"), { display: "inline" }, at("s1", 2.4));
    tl.to($("kb"), { yPercent: 100, duration: 0.3, ease: "power2.in" }, at("s1", 2.4));
    tl.to($("load"), { scaleX: 0.7, duration: 0.8, ease: "power1.out" }, at("s1", 2.5));

    /* s2–s3 — Chrome's warning: normal; «Télécharger quand même» */
    zoom(at("s2", -0.3), ...DLG, 1.7, 900, 0.6);
    K.scene($("warn"), at("s2", -0.1), at("s3", 2.05), { inn: "fade", dur: 0.25 });
    tl.fromTo(K.$("#warn .ax-dlg"), { scale: 0.85 }, { scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, at("s2", -0.1));
    K.sfx("chime", at("s2", 0), -6);
    ring($("wyes"), at("s3", 0.1), at("s3", 1.75));
    press($("wyes"), at("s3", 1.6));
    tl.to($("load"), { scaleX: 1, autoAlpha: 0, duration: 0.3 }, at("s3", 1.9));

    /* s4 — the download ends: «Ouvrir» */
    stepDone(1, at("s4", -0.25));
    stepOn(2, at("s4", -0.05));
    zoom(at("s3", 2.0), 265, 1050, 1.6, 1200, 0.6);
    // it stays under Android's question, which comes over it with its own shade
    K.scene($("snackl"), at("s3", 2.1), at("s5", 0.2), { inn: "up", dur: 0.35 });
    tl.to(K.$("#snackbar i"), { scaleX: 1, duration: 0.7, ease: "power1.inOut" }, at("s3", 2.2));
    tl.set($("snackbar"), { autoAlpha: 0 }, at("s4", -0.05));
    swap($("snacktx"), 1, at("s4", -0.05));
    K.pop($("openw"), at("s4", 0), { from: 0.6 });
    K.sfx("ding", at("s4", 0), -2);
    ring($("open1"), at("s4", 0.5), at("s4", 1.95));
    press($("open1"), at("s4", 1.8));

    /* s5 — the first time only: Android asks; «Paramètres» */
    stepDone(2, at("s5", -0.3));
    stepOn(3, at("s5", -0.1));
    gsap.set($("once"), { xPercent: -50 });
    K.pop($("once"), at("s5", 0.1), { from: 0.5 });
    tl.to($("once"), { autoAlpha: 0, duration: 0.25 }, at("s7", -0.4));
    zoom(at("s5", -0.35), ...DLG, 1.7, 900, 0.6);
    K.scene($("block"), at("s5", -0.15), at("s6", -0.05), { inn: "fade", dur: 0.25 });
    tl.fromTo(K.$("#block .ax-dlg"), { scale: 0.85 }, { scale: 1, duration: 0.35, ease: "back.out(2)", immediateRender: false }, at("s5", -0.15));
    K.sfx("chime", at("s5", -0.05), -6);
    ring($("bset"), at("s5", 0.9), at("s5", 2.55));
    press($("bset"), at("s5", 2.4));

    /* s6 — «Autoriser cette source» on, then back */
    // a French phone: the next screen comes from the right
    K.scene($("set"), at("s6", -0.15), at("s7", -0.2), { inn: "right", outt: "fade", dur: 0.4 });
    zoom(at("s6", -0.2), 265, 380, 1.6, 760, 0.6);
    ring($("sw"), at("s6", 0.45), at("s6", 1.25));
    press($("sw"), at("s6", 1.1), $("swtap"));
    tl.to($("sw"), { backgroundColor: "#6c47ff", borderColor: "#6c47ff", duration: 0.2 }, at("s6", 1.2));
    tl.to($("knob"), { x: 30, width: 30, height: 30, top: 4, backgroundColor: "#fff", duration: 0.22, ease: "power2.out" }, at("s6", 1.2));
    K.sfx("ding", at("s6", 1.25), -6);
    zoom(at("s6", 1.55), 265, 90, 1.6, 640, 0.5);
    ring($("back"), at("s6", 2.0), at("s6", 3.1));
    press($("back"), at("s6", 2.95));

    /* s7–s9 — «Installer», installing, installed: «Ouvrir» */
    stepDone(3, at("s7", -0.3));
    stepOn(4, at("s7", -0.1));
    zoom(at("s7", -0.3), ...DLG, 1.7, 900, 0.6);
    K.scene($("inst"), at("s7", -0.2), at("s9", 1.15), { inn: "fade", dur: 0.25 });
    K.sfx("chime", at("s7", -0.1), -6);
    ring($("iyes"), at("s7", 0.3), at("s7", 1.75));
    press($("iyes"), at("s7", 1.6));
    swap($("instsw"), 1, at("s7", 1.85));
    tl.to(K.$("#ibar i"), { scaleX: 1, duration: end("s8", 0) - at("s7", 1.9), ease: "power1.inOut" }, at("s7", 1.9));
    // Play Protect, sometimes: go on
    const pp = K.pill("Play Protect", { y: 1500, cls: "ink", icon: '<svg viewBox="0 0 24 24" fill="none" stroke="#12b76a" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>', z: 46 });
    K.pop(pp, at("s8", 0.05), { from: 0.6 });
    K.out(pp, end("s8", 0.1));
    swap($("instsw"), 2, at("s9", -0.15));
    stepDone(4, at("s9", -0.1));
    K.sfx("win", at("s9", -0.1), -2);
    ring($("iopen"), at("s9", 0.2), at("s9", 1.05));
    press($("iopen"), at("s9", 0.9));
    // Pointili opens
    zoom(at("s9", 1.0), 0, 0, 1, 0, 0.6);
    tl.fromTo($("app1"), { autoAlpha: 0, scale: 0.2, borderRadius: 80 }, { autoAlpha: 1, scale: 1, borderRadius: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, at("s9", 1.1));
    K.burst(540, 760, at("s9", 1.35), { r: 320, n: 20 });
    tl.to(K.$$(".ax-st .c"), { scale: 1.18, duration: 0.18, yoyo: true, repeat: 1, stagger: 0.07 }, at("s9", 1.35));

    /* s10 — afterwards, from its icon like any app */
    tl.set($("chrome"), { autoAlpha: 0 }, at("s10", -0.3));
    K.show($("home"), at("s10", -0.3));
    tl.set(slot, { autoAlpha: 0 }, at("s10", -0.3));
    K.show($("newic"), at("s10", -0.3));
    tl.set($("app1"), { transformOrigin: "37.5% 62.9%" }, at("s10", -0.3));
    tl.to($("app1"), { scale: 0.16, autoAlpha: 0, borderRadius: 300, duration: 0.45, ease: "power3.inOut" }, at("s10", -0.25));
    K.sfx("swoosh", at("s10", -0.25), -4);
    zoom(at("s10", 0.1), 199, 722, 1.45, 820, 0.7);
    ring($("newic"), at("s10", 0.8), at("s10", 2.25));
    press($("newic"), at("s10", 2.1), $("ictap"));
    gsap.set($("app2"), { transformOrigin: "37.5% 62.9%" });
    tl.fromTo($("app2"), { autoAlpha: 0, scale: 0.16, borderRadius: 300 }, { autoAlpha: 1, scale: 1, borderRadius: 0, duration: 0.45, ease: "power3.out", immediateRender: false }, at("s10", 2.3));
    zoom(at("s10", 2.3), 0, 0, 1, 0, 0.6);

    K.endcard(at("e1", -0.15), { tag: "Pointili *أبليكاسيون* في تليفونك", url: "pointili.online/android" });
  },
};
