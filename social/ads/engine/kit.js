/* The kit every film's page is built with: one paused GSAP timeline (window.__seek films it
 * a frame at a time), the lines' times (FILM.lines, from render.mjs), and the pieces a Pointili
 * ad is made of. Everything is put on the timeline — never on a clock — so any frame can be
 * filmed alone, in any order, and come out the same. */
(() => {
  const F = window.FILM;
  gsap.ticker.lagSmoothing(0);
  gsap.config({ force3D: false });
  const stage = document.getElementById("stage");
  const tl = gsap.timeline({ paused: true, defaults: { ease: "power3.out", duration: 0.5 } });
  tl.set({}, {}, F.total); // the film's whole length, whatever is on it
  const byId = Object.fromEntries(F.lines.map((l) => [l.id, l]));
  const line = (x) => {
    const l = byId[x];
    if (!l) throw new Error(`no line «${x}»`);
    return l;
  };
  /** at("a3") → when line a3 starts; at("a3", .4) → .4 s after; numbers pass through */
  const at = (x, d = 0) => (typeof x === "number" ? x : line(x).start) + d;
  const end = (x, d = 0) => (typeof x === "number" ? x : line(x).end) + d;
  const SFX = [];
  /** a sound at a moment: engine/sound.mjs makes it (gain in dB) */
  const sfx = (name, t, gain = 0) => SFX.push({ name, t: Math.max(0, +(+t).toFixed(3)), gain });

  const $ = (s, root = document) => root.querySelector(s);
  const $$ = (s, root = document) => [...root.querySelectorAll(s)];
  const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");
  /** *word* → the line's colour; ~word~ → struck */
  const mark = (s) => esc(s).replace(/\*([^*]+)\*/g, '<b class="hl">$1</b>').replace(/~([^~]+)~/g, '<s class="st">$1</s>');
  const add = (html, parent = stage) => {
    const t = document.createElement("template");
    t.innerHTML = html.trim();
    const el = t.content.firstElementChild;
    parent.appendChild(el);
    return el;
  };
  // the words of a line, each knowing if it is coloured or struck
  const tokens = (s) => {
    const out = [];
    let hl = false, st = false, cur = null;
    for (const ch of s) {
      if (ch === "*") { hl = !hl; continue; }
      if (ch === "~") { st = !st; continue; }
      if (/\s/.test(ch)) { cur = null; continue; }
      if (!cur) out.push((cur = { text: "", hl: false, st: false }));
      cur.text += ch;
      cur.hl ||= hl;
      cur.st ||= st;
    }
    return out;
  };
  const wordHtml = (w) => `<span class="w${w.hl ? " hl" : ""}${w.st ? " st" : ""}">${esc(w.text)}</span>`;

  /* ── showing and hiding ── */
  const pop = (el, t, { from = 0.6, dur = 0.5, y = 0, ease = "back.out(2.2)" } = {}) =>
    tl.fromTo(el, { autoAlpha: 0, scale: from, y }, { autoAlpha: 1, scale: 1, y: 0, duration: dur, ease }, t);
  const rise = (el, t, { y = 60, dur = 0.55, ease = "power3.out" } = {}) => tl.fromTo(el, { autoAlpha: 0, y }, { autoAlpha: 1, y: 0, duration: dur, ease }, t);
  const fadeIn = (el, t, dur = 0.4) => tl.fromTo(el, { autoAlpha: 0 }, { autoAlpha: 1, duration: dur, ease: "none" }, t);
  const out = (el, t, { dur = 0.25, scale = 0.92, y = 0 } = {}) => tl.to(el, { autoAlpha: 0, scale, y, duration: dur, ease: "power2.in" }, t);
  const fadeOut = (el, t, dur = 0.3) => tl.to(el, { autoAlpha: 0, duration: dur, ease: "none" }, t);
  const show = (el, t) => tl.set(el, { autoAlpha: 1 }, t);
  const hide = (el, t) => tl.set(el, { autoAlpha: 0 }, t);
  /** a picture that never stops moving: slow push (or pull) across its time on screen */
  const drift = (el, t0, t1, { from = 1.0, to = 1.08, x = 0, y = 0, rot = null } = {}) => {
    const a = { scale: from, xPercent: 0, yPercent: 0 };
    const b = { scale: to, xPercent: x, yPercent: y, duration: Math.max(0.1, t1 - t0), ease: "none" };
    if (rot != null) [a.rotation, b.rotation] = [0, rot];
    return tl.fromTo(el, a, b, t0);
  };
  const shake = (el, t, { dur = 0.4, amp = 14 } = {}) => {
    const n = Math.round(dur / 0.05);
    const kf = Array.from({ length: n }, (_, i) => ({ x: (i % 2 ? -1 : 1) * amp * (1 - i / n), y: ((i * 7) % 3 - 1) * amp * 0.5 * (1 - i / n), duration: dur / n }));
    tl.to(el, { keyframes: [...kf, { x: 0, y: 0, duration: 0.05 }], ease: "none" }, t);
  };
  /** a scene: on at t0 (fade, or slide from a side), off at t1 */
  const scene = (el, t0, t1, { inn = "fade", outt = "fade", dur = 0.35 } = {}) => {
    const from = { fade: { autoAlpha: 0 }, left: { autoAlpha: 1, xPercent: -100 }, right: { autoAlpha: 1, xPercent: 100 }, up: { autoAlpha: 1, yPercent: 100 }, zoom: { autoAlpha: 0, scale: 1.15 }, cut: null }[inn];
    if (from) tl.fromTo(el, from, { autoAlpha: 1, xPercent: 0, yPercent: 0, scale: 1, duration: dur, ease: inn === "fade" ? "none" : "power3.inOut" }, t0);
    else tl.set(el, { autoAlpha: 1 }, t0);
    if (t1 != null) {
      const to = { fade: { autoAlpha: 0 }, left: { xPercent: 100 }, right: { xPercent: -100 }, up: { yPercent: -100 }, zoom: { autoAlpha: 0, scale: 0.9 }, cut: null }[outt];
      if (to) tl.to(el, { ...to, duration: dur, ease: outt === "fade" ? "none" : "power3.inOut" }, t1 - (outt === "cut" ? 0 : dur * 0.5));
      else tl.set(el, { autoAlpha: 0 }, t1);
    }
    return el;
  };

  /* ── the subtitles: every line, in one of four looks ── */
  function subs(style = "pill", { skip = [], hold = 0.35, only = null } = {}) {
    const list = F.lines.filter((l) => l.sub !== false && !skip.includes(l.id) && (!only || only.includes(l.id)));
    list.forEach((l, i) => {
      const text = l.sub ?? l.say;
      const next = list[i + 1];
      const off = Math.min(next ? next.start - 0.03 : F.total, l.end + hold);
      if (style === "word") return wordByWord(l, text, off);
      const el = add(`<div class="sub sub-${style}" data-line="${l.id}"><span></span></div>`);
      const inner = el.firstElementChild;
      if (style === "big") {
        inner.innerHTML = tokens(text).map(wordHtml).join(" ");
        const ws = $$(".w", inner);
        tl.set(el, { autoAlpha: 1 }, l.start);
        tl.fromTo(ws, { autoAlpha: 0, y: 34, scale: 0.9 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(2)", stagger: Math.min(0.11, ((l.end - l.start) * 0.55) / ws.length) }, l.start);
        tl.to(el, { autoAlpha: 0, y: -24, duration: 0.16, ease: "power2.in" }, off - 0.16);
      } else {
        inner.innerHTML = mark(text);
        tl.fromTo(el, { autoAlpha: 0, y: 26, scale: 0.92 }, { autoAlpha: 1, y: 0, scale: 1, duration: 0.3, ease: "back.out(2.2)" }, l.start);
        tl.to(el, { autoAlpha: 0, duration: 0.1, ease: "none" }, off - 0.1);
      }
    });
  }
  // one word at a time, each for its share of the line
  function wordByWord(l, text, off) {
    const ws = tokens(text);
    const span = off - l.start;
    const weight = ws.reduce((a, w) => a + w.text.length + 2.5, 0);
    let t = l.start;
    ws.forEach((w) => {
      const d = (span * (w.text.length + 2.5)) / weight;
      const el = add(`<div class="sub sub-word"><span class="${w.hl ? "hl" : ""}">${esc(w.text)}</span></div>`);
      tl.fromTo(el, { autoAlpha: 0, scale: 1.4, rotation: -3 }, { autoAlpha: 1, scale: 1, rotation: 0, duration: 0.18, ease: "back.out(3)" }, t);
      tl.set(el, { autoAlpha: 0 }, t + d);
      t += d;
    });
  }

  /* ── icons (lucide's, as the app uses them) ── */
  const svg = (p, sw = 2.2) => `<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="${sw}" stroke-linecap="round" stroke-linejoin="round">${p}</svg>`;
  const ICON = {
    check: svg('<path d="M20 6 9 17l-5-5"/>', 3.2),
    gift: svg('<rect x="3" y="8" width="18" height="4" rx="1"/><path d="M12 8v13"/><path d="M19 12v7a2 2 0 0 1-2 2H7a2 2 0 0 1-2-2v-7"/><path d="M7.5 8a2.5 2.5 0 0 1 0-5A4.8 8 0 0 1 12 8a4.8 8 0 0 1 4.5-5 2.5 2.5 0 0 1 0 5"/>', 2.4),
    coffee: svg('<path d="M10 2v2"/><path d="M14 2v2"/><path d="M16 8a1 1 0 0 1 1 1v8a4 4 0 0 1-4 4H7a4 4 0 0 1-4-4V9a1 1 0 0 1 1-1h14a4 4 0 1 1 0 8h-1"/><path d="M6 2v2"/>'),
    scissors: svg('<circle cx="6" cy="6" r="3"/><path d="M8.12 8.12 12 12"/><path d="M20 4 8.12 15.88"/><circle cx="6" cy="18" r="3"/><path d="M14.8 14.8 20 20"/>'),
    send: svg('<path d="M14.5 21.7a.5.5 0 0 0 .9 0l6.5-19a.5.5 0 0 0-.6-.6l-19 6.5a.5.5 0 0 0 0 .9l7.9 3.2a2 2 0 0 1 1.1 1.1z"/><path d="m21.9 2.1-10.9 10.9"/>', 2.4),
    nodl: svg('<path d="M12 15V3"/><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><path d="m7 10 5 5 5-5"/><path d="M3 3l18 18" stroke="#ff6b4a" stroke-width="3"/>', 2.4),
    phone: svg('<rect x="5" y="2" width="14" height="20" rx="2"/><path d="M12 18h.01"/>'),
    qr: svg('<rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/>'),
    clock: svg('<circle cx="12" cy="12" r="10"/><path d="M12 6v6l4 2"/>'),
    users: svg('<path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/>'),
    heart: svg('<path d="M19 14c1.49-1.46 3-3.21 3-5.5A5.5 5.5 0 0 0 16.5 3c-1.76 0-3 .5-4.5 2-1.5-1.5-2.74-2-4.5-2A5.5 5.5 0 0 0 2 8.5c0 2.3 1.5 4.05 3 5.5l7 7Z"/>'),
    chat: svg('<path d="M7.9 20A9 9 0 1 0 4 16.1L2 22Z"/>'),
    star: svg('<path d="M11.5 2.3a.6.6 0 0 1 1 0l2.6 5.3 5.9.9a.6.6 0 0 1 .3 1l-4.3 4.1 1 5.9a.6.6 0 0 1-.8.6L12 17.3l-5.2 2.8a.6.6 0 0 1-.8-.6l1-5.9L2.7 9.5a.6.6 0 0 1 .3-1l5.9-.9z"/>'),
    x: svg('<path d="M18 6 6 18"/><path d="m6 6 12 12"/>', 3),
    pin: svg('<path d="M20 10c0 4.99-5.54 10.19-7.4 11.8a1 1 0 0 1-1.2 0C9.54 20.19 4 14.99 4 10a8 8 0 0 1 16 0"/><circle cx="12" cy="10" r="3"/>'),
  };
  // Pointili's mark (public/brand-mark.svg); white=true for a dark ground
  let markN = 0;
  const brandMark = (white = false) => {
    const n = ++markN;
    return `<svg viewBox="0 0 96 70" xmlns="http://www.w3.org/2000/svg"><defs>
      <linearGradient id="pb${n}" x1="0" y1="0" x2="0.2" y2="1"><stop offset="0" stop-color="${white ? "#fff" : "#7244EC"}" stop-opacity="${white ? 0.55 : 1}"/><stop offset="1" stop-color="${white ? "#fff" : "#4F28C6"}" stop-opacity="${white ? 0.55 : 1}"/></linearGradient>
      <linearGradient id="pf${n}" x1="0" y1="0" x2="0.25" y2="1"><stop offset="0" stop-color="${white ? "#fff" : "#7143E6"}"/><stop offset="1" stop-color="${white ? "#fff" : "#5029C5"}"/></linearGradient>
      <mask id="pm${n}"><rect width="96" height="70" fill="#fff"/><rect x="-2" y="14" width="86" height="58" rx="10" fill="#000"/></mask></defs>
      <rect x="16" y="5" width="72" height="50" rx="7" transform="rotate(8 52 30)" fill="url(#pb${n})" mask="url(#pm${n})"/>
      <rect x="1" y="17" width="80" height="52" rx="8" fill="url(#pf${n})"/>
      <path d="M41 29C42.2 38.6 44.4 41.2 56 43 44.4 44.8 42.2 47.4 41 57 39.8 47.4 37.6 44.8 26 43 37.6 41.2 39.8 38.6 41 29Z" fill="${white ? "#6c47ff" : "#fff"}"/></svg>`;
  };

  /* ── a phone, a real screen of the app in it ── */
  function phone({ src = "", x = 260, y = 330, w = 560, parent = stage, z = 10 } = {}) {
    const el = add(`<div class="phone" style="left:${x}px;top:${y}px;width:${w}px;z-index:${z}"><div class="scr">${src ? `<img src="${src}">` : ""}<i class="island"></i></div></div>`, parent);
    el.scr = el.firstElementChild;
    el.island = $(".island", el);
    /** another screen over the one showing: slid in from the left (RTL: forward) or faded */
    el.screen = (s, t, how = "slide") => {
      const img = document.createElement("img");
      img.src = s;
      el.scr.insertBefore(img, el.island);
      if (how === "slide") tl.fromTo(img, { xPercent: -100, autoAlpha: 1 }, { xPercent: 0, duration: 0.45, ease: "power3.inOut" }, t);
      else if (how === "cut") tl.fromTo(img, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.01 }, t);
      else tl.fromTo(img, { autoAlpha: 0 }, { autoAlpha: 1, duration: 0.3, ease: "none" }, t);
      return img;
    };
    /** a piece of HTML laid on the screen (a card, a list…) */
    el.put = (html) => {
      const d = document.createElement("div");
      d.style.cssText = "position:absolute;inset:0";
      d.innerHTML = html;
      el.scr.insertBefore(d, el.island);
      return d;
    };
    return el;
  }

  /* ── Pointili's card, stamps landing on it as they do in the app ── */
  const passLine = (n, goal, gift) => (n >= goal ? `ربحت ${gift}!` : goal - n === 1 ? `مازالك تامبون واحد باش تربح ${gift}` : `مازالولك ${goal - n} باش تربح ${gift}`);
  function pass({ name = "Café El Medina", color = "#6c47ff", goal = 8, stamps = 0, gift = "قهوة بلاش", icon = "coffee", x = 130, y = 700, w = 820, size = 36, parent = stage, z = 20 } = {}) {
    const cols = goal <= 6 ? goal : goal <= 10 ? 5 : goal <= 12 ? 6 : 8;
    const dots = Array.from({ length: goal }, (_, i) => `<span class="dot">${i === goal - 1 ? ICON.gift : ""}<span class="on">${i === goal - 1 ? ICON.gift : ICON.check}</span></span>`).join("");
    const counts = Array.from({ length: goal + 1 }, (_, n) => `<span data-n="${n}"><b>${n}</b><i>/${goal}</i></span>`).join("");
    const lines = Array.from({ length: goal + 1 }, (_, n) => `<span data-n="${n}">${ICON.gift}<span>${esc(passLine(n, goal, gift))}</span></span>`).join("");
    const el = add(`<div class="pass" style="--c:${color};left:${x}px;top:${y}px;width:${w}px;font-size:${size}px;z-index:${z}">
      <div class="top"><span class="mark">${ICON[icon] ?? ICON.coffee}</span><span class="name" dir="auto">${esc(name)}</span><span class="count">${counts}</span></div>
      <div class="dots" style="grid-template-columns:repeat(${cols},minmax(0,1fr))">${dots}</div>
      <div class="line">${lines}</div></div>`, parent);
    const ons = $$(".dot .on", el);
    const cs = $$(".count>span", el);
    const ls = $$(".line>span", el);
    ons.forEach((o, i) => gsap.set(o, i < stamps ? { autoAlpha: 1 } : { autoAlpha: 0, scale: 2.4, rotation: -20 }));
    cs.forEach((c, n) => gsap.set(c, { autoAlpha: n === stamps ? 1 : 0 }));
    ls.forEach((c, n) => gsap.set(c, { autoAlpha: n === stamps ? 1 : 0 }));
    let cur = stamps;
    /** up to n stamps from where it is, landing one after the other from t */
    el.stamp = (n, t, { gap = 0.22, sound = "stamp" } = {}) => {
      for (let i = cur; i < n; i++) {
        const ti = t + (i - cur) * gap;
        tl.to(ons[i], { keyframes: [{ autoAlpha: 1, scale: 0.82, rotation: 4, duration: 0.36, ease: "power2.out" }, { scale: 1.12, rotation: -2, duration: 0.13 }, { scale: 1, rotation: 0, duration: 0.18 }] }, ti);
        if (sound) sfx(i === n - 1 && n >= goal ? "win" : sound, ti + 0.22);
        tl.set(cs[i], { autoAlpha: 0 }, ti + 0.3);
        tl.set(cs[i + 1], { autoAlpha: 1 }, ti + 0.3);
        tl.set(ls[i], { autoAlpha: 0 }, ti + 0.3);
        tl.set(ls[i + 1], { autoAlpha: 1 }, ti + 0.3);
        tl.fromTo(cs[i + 1], { scale: 1.5 }, { scale: 1, duration: 0.3, ease: "back.out(3)" }, ti + 0.3);
      }
      cur = Math.max(cur, n);
    };
    el.dots = ons;
    return el;
  }

  /* ── labels ── */
  function pill(text, { x = null, y = 200, cls = "", icon = null, parent = stage, z = 40, size = null } = {}) {
    const el = add(`<div class="pill ${cls}" style="top:${y}px;${x == null ? "left:50%;" : `left:${x}px;`}z-index:${z};${size ? `font-size:${size}px;` : ""}">${icon ? ICON[icon] ?? icon : ""}<span>${mark(text)}</span></div>`, parent);
    if (x == null) gsap.set(el, { xPercent: -50 });
    return el;
  }

  /* ── typing ── */
  /** the box's text, one letter after the other from t, in dur seconds */
  function typeIn(box, text, t, dur = 0.8, { sound = true } = {}) {
    const txt = $(".txt", box);
    // the letters inside one inline run (not one flex item each): «Pointili» reads left to right
    // inside a right-to-left box, Arabic right to left, as the bidi rules say
    txt.innerHTML = `<span class="ph">${esc(box.dataset.ph ?? "")}</span><span class="typed" dir="auto">` + [...text].map((c) => `<span class="ch">${c === " " ? "&nbsp;" : esc(c)}</span>`).join("") + `</span><i class="caret"></i>`;
    const chs = $$(".ch", txt);
    chs.forEach((c) => gsap.set(c, { display: "none" }));
    chs.forEach((c, i) => {
      const ti = t + (dur * i) / chs.length;
      tl.set(c, { display: "inline" }, ti);
      if (sound) sfx("key", ti, -4);
    });
    tl.set($(".ph", txt), { autoAlpha: 0 }, t);
    tl.fromTo($(".caret", txt), { autoAlpha: 1 }, { autoAlpha: 0, duration: 0.01, repeat: Math.ceil((F.total - t) / 0.5), yoyo: true, repeatDelay: 0.45 }, t);
  }
  function commentBox({ x = 130, y = 1300, w = 820, ph = "زيد كومونتار…", parent = stage, z = 45 } = {}) {
    const el = add(`<div class="cbox" data-ph="${esc(ph)}" style="left:${x}px;top:${y}px;width:${w}px;z-index:${z}"><i class="av"></i><span class="txt"><span class="ph">${esc(ph)}</span></span><span class="send">${ICON.send}</span></div>`, parent);
    return el;
  }
  function reply({ user = "cafe.yasmine", q = "", x = 110, y = 300, parent = stage, z = 45 } = {}) {
    return add(`<div class="reply" style="left:${x}px;top:${y}px;z-index:${z}"><div class="who"><i></i><span>رد على تعليق <b dir="ltr">@${esc(user)}</b></span></div><div class="q">${mark(q)}</div></div>`, parent);
  }
  function chat({ name = "Café Yasmine", sub = "متّصل", msgs = [], x = 120, y = 520, w = 840, parent = stage, z = 30 } = {}) {
    const body = msgs.map((m) => `<div class="msg ${m.me ? "me" : "them"}">${mark(m.text)}${m.link ? `<a>${esc(m.link)}</a>` : ""}<time>${m.time ?? "10:42"}</time></div>`).join("");
    const el = add(`<div class="chat" style="left:${x}px;top:${y}px;width:${w}px;z-index:${z}"><div class="head"><span class="av">${esc(name[0])}</span><div><b>${esc(name)}</b><small>${esc(sub)}</small></div></div><div class="body">${body}</div></div>`, parent);
    el.msgs = $$(".msg", el);
    return el;
  }

  /* ── the end card: the mark, the name, what to do now ── */
  function endcard(t, { tag = "كارطات الفيدليتي متاعك، في تليفونك", offer = "", keyword = "", ph = "زيد كومونتار…", url = "pointili.online", typeAt = 0.9 } = {}) {
    const el = add(`<div class="end"><div class="logo">${brandMark()}</div><div class="word">Pointili</div><div class="tag">${mark(tag)}</div>
      ${offer ? `<div class="offer">${mark(offer)}</div>` : ""}
      ${keyword ? `<div class="cbox" data-ph="${esc(ph)}"><i class="av"></i><span class="txt"><span class="ph">${esc(ph)}</span></span><span class="send">${ICON.send}</span></div>` : ""}
      <div class="url">${esc(url)}</div></div>`);
    tl.fromTo(el, { autoAlpha: 0, clipPath: "circle(0% at 50% 50%)" }, { autoAlpha: 1, clipPath: "circle(75% at 50% 50%)", duration: 0.6, ease: "power3.inOut" }, t);
    sfx("whoosh", t - 0.05);
    pop($(".logo", el), t + 0.25, { from: 0.3, dur: 0.7, ease: "back.out(1.8)" });
    sfx("impact", t + 0.35);
    rise($(".word", el), t + 0.45, { y: 40 });
    rise($(".tag", el), t + 0.6, { y: 30 });
    if (offer) pop($(".offer", el), t + 0.8, { from: 0.7 });
    if (keyword) {
      const box = $(".cbox", el);
      rise(box, t + typeAt - 0.2, { y: 40 });
      typeIn(box, keyword, t + typeAt + 0.25, Math.min(0.9, keyword.length * 0.09));
      tl.fromTo($(".send", box), { scale: 1 }, { scale: 1.18, duration: 0.16, yoyo: true, repeat: 1, ease: "power2.out" }, t + typeAt + 1.3);
      sfx("pop", t + typeAt + 1.32, -2);
    }
    rise($(".url", el), t + 1.0, { y: 24 });
    return el;
  }

  /* ── a tap, a burst of sparks, a progress bar, the corner mark ── */
  function tap(x, y, t, { sound = true } = {}) {
    const el = add(`<i class="tap" style="left:${x}px;top:${y}px"></i>`);
    tl.fromTo(el, { autoAlpha: 0, scale: 1.6 }, { autoAlpha: 1, scale: 0.8, duration: 0.18, ease: "power2.out" }, t);
    tl.to(el, { autoAlpha: 0, scale: 1.8, duration: 0.35, ease: "power2.out" }, t + 0.2);
    if (sound) sfx("tap", t + 0.12);
  }
  function burst(x, y, t, { n = 16, colors = ["#ffd23f", "#ff6b4a", "#6c47ff", "#12b76a"], r = 220, sound = true } = {}) {
    for (let i = 0; i < n; i++) {
      const a = (i / n) * Math.PI * 2 + (i % 3) * 0.2;
      const d = r * (0.6 + ((i * 37) % 10) / 25);
      const s = add(`<i class="spark" style="left:${x}px;top:${y}px;background:${colors[i % colors.length]}"></i>`);
      // hidden (CSS) until t: a from-state that showed it would light it from the film's first frame
      tl.set(s, { autoAlpha: 1 }, t);
      tl.fromTo(s, { x: 0, y: 0, scale: 1 }, { x: Math.cos(a) * d, y: Math.sin(a) * d, scale: 0.2, duration: 0.7, ease: "power3.out", immediateRender: false }, t);
      tl.to(s, { autoAlpha: 0, duration: 0.25 }, t + 0.5);
    }
    if (sound) sfx("sparkle", t);
  }
  function progress(color = "var(--coral)") {
    const el = add(`<div class="progress"><i style="background:${color}"></i></div>`);
    tl.fromTo($("i", el), { scaleX: 0 }, { scaleX: 1, duration: F.total, ease: "none" }, 0);
    return el;
  }
  function bug({ white = true } = {}) {
    return add(`<div class="mark-bug"><span class="m">${brandMark()}</span><span style="color:${white ? "#fff" : "var(--ink)"}">Pointili</span></div>`);
  }

  // returns nothing: the timeline itself would be serialised back to Node, the whole graph of it
  window.__seek = (t) => {
    tl.seek(t, false);
  };
  window.K = {
    tl, at, end, sfx, $, $$, add, mark, esc, tokens, ICON, brandMark,
    pop, rise, fadeIn, out, fadeOut, show, hide, drift, shake, scene,
    subs, phone, pass, pill, typeIn, commentBox, reply, chat, endcard, tap, burst, progress, bug,
    asset: (k) => F.assets[k],
    ready: () => {
      window.__SFX = SFX.sort((a, b) => a.t - b.t);
      tl.seek(0, false);
      window.__READY = true;
    },
  };
})();
