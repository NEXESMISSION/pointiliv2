/**
 * Every Pointili video, and a page for each: what it says (the full script, line by line, with
 * its times), its sound (the voice, the music, every effect, the soundtrack to play) and its
 * subtitles (as shown, and as .srt / .vtt files).
 *
 *   node make.mjs   → index.html, one <video>.html each, subs/, sound/, thumbs/
 *
 * The ads are read from their films (../ads/films): the times are worked out exactly as
 * render.mjs works them out (each line as long as its voice), and the effects are the ones the
 * film's own page asks for, read in Chrome. The silent explainers and the app's clips come from
 * data/silent.json (read off their makers: scripts/explainer-*.mjs, make.py, the .svg).
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readFileSync, readdirSync, statSync, writeFileSync } from "node:fs";
import { createRequire } from "node:module";
import { join, relative, resolve } from "node:path";
import { pathToFileURL } from "node:url";

const HERE = import.meta.dirname;
const ROOT = resolve(HERE, "../..");
const ADS = resolve(HERE, "../ads");
// the APK film (21e73c0) sits beside the fifteen ads; APK_ADS can point at another checkout's social/ads
const APK_ADS = process.env.APK_ADS || ADS;
const { chromium } = createRequire(join(ADS, "package.json"))("playwright-core");
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WINGET = "C:/Users/ayoub/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/";
const FF = existsSync(WINGET + "ffmpeg.exe") ? WINGET + "ffmpeg.exe" : "ffmpeg";
const FP = existsSync(WINGET + "ffprobe.exe") ? WINGET + "ffprobe.exe" : "ffprobe";
for (const d of ["subs", "sound", "thumbs"]) mkdirSync(join(HERE, d), { recursive: true });

/* ---------- small things ---------- */

const esc = (s) => String(s ?? "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
// English with Derja quoted in it: each «…» kept whole, in its own direction
const iso = (s) => esc(s).replace(/«([^»]*)»/g, "<bdi>«$1»</bdi>");
const plain = (s) => String(s ?? "").replace(/[*~]/g, "");
const marked = (s) => esc(s).replace(/\*([^*]+)\*/g, "<b>$1</b>").replace(/~([^~]+)~/g, "<s>$1</s>");
const sec = (t) => `${(+t).toFixed(1)}`;
const clock = (t, sep = ",") => {
  const ms = Math.round(t * 1000);
  const h = Math.floor(ms / 3600000), m = Math.floor((ms % 3600000) / 60000), s = Math.floor((ms % 60000) / 1000);
  return `${String(h).padStart(2, "0")}:${String(m).padStart(2, "0")}:${String(s).padStart(2, "0")}${sep}${String(ms % 1000).padStart(3, "0")}`;
};
const srt = (cues) => cues.map((c, i) => `${i + 1}\n${clock(c.start)} --> ${clock(c.end)}\n${c.text}\n`).join("\n");
const vtt = (cues) => `WEBVTT\n\n${cues.map((c, i) => `${i + 1}\n${clock(c.start, ".")} --> ${clock(c.end, ".")}\n${c.text}\n`).join("\n")}`;
const probe = (file) => {
  const j = JSON.parse(execFileSync(FP, ["-v", "error", "-show_entries", "format=duration,size:stream=codec_type,width,height,r_frame_rate", "-of", "json", file]).toString());
  const v = j.streams.find((s) => s.codec_type === "video");
  const [a, b] = (v?.r_frame_rate ?? "0/1").split("/").map(Number);
  return { duration: +(+j.format.duration).toFixed(2), mb: +(j.format.size / 1048576).toFixed(1), w: v?.width, h: v?.height, fps: Math.round(a / (b || 1)), audio: j.streams.some((s) => s.codec_type === "audio") };
};
const win = (p) => resolve(p).replace(/\//g, "\\");
const rel = (p) => relative(HERE, p).replace(/\\/g, "/");
const docComment = (src) => {
  const m = src.match(/^\/\*\*([\s\S]*?)\*\//);
  if (!m) return [];
  const text = m[1].split("\n").map((l) => l.replace(/^\s*\*\s?/, "")).filter((l) => !/node render\.mjs/.test(l)).join("\n").trim();
  return text.split(/\n\s*\n/).map((p) => p.replace(/\s*\n\s*/g, " ").trim()).filter(Boolean);
};

const BUILT_LIKE = {
  f1: "a two-cafés story reel (Daayem's): an illustrated story, a voice telling it, subtitles under it",
  f2: "a barber-shop reel (QuickStamp's): flat motion graphics, big words, «send this to a friend»",
  f3: "a «reply to a comment» reel (menuos's): the question stickered on, the product answering",
  f4: "an «idea for your business» reel (forsa's): one big word at a time over the pictures",
  f5: "a café-chaos comic reel (Ayyatli's): the problem in bursts, then «the fix is simple»",
  f6: "kinetic numbers on a dark board: 200 customers, one more visit, 2400 coffees a year",
  f7: "a prize wheel under stadium lights: the app's wheel (الروليت)",
  f8: "a chat story for online sellers: a tampon sent as a link on WhatsApp",
  f9: "a little noir: the photographed code that no longer works",
  f10: "a stopwatch speedrun: the card made in under two minutes",
  f11: "trading cards: the regular, the drifting one, the lost one — and «شكون رجع؟»",
  f12: "a countdown: the reset clock the owner turns on (and pauses)",
  f13: "quick cuts on the beat: your colour and your logo on every tampon",
  f14: "a photo tour of the trades (ChatGPT photos), each with its own gift",
  f15: "an arcade store: tampons spent on things from the shop (الماغازة)",
};
const CORAL = ["f8", "f11", "f13", "f15"];
const MUSIC = {
  warm: "a warm story: electric piano, soft swung drums",
  bounce: "bright and bouncy: house-ish piano stabs, a plucked line, four on the floor",
  tech: "clean and modern: a pad, a pulse, a few plucks",
  comic: "a comic: quick, plucky, staccato stabs — chaos that stays friendly",
  noir: "noir: a slow minor pulse, a pad, a few plucks in the dark",
  lofi: "lo-fi: slow, swung, a crackle under it",
};
const SUB_LOOK = {
  pill: "a white pill near the bottom, the key words in purple",
  big: "big words in the middle, coming in one by one, the key words in coral",
  word: "one word at a time, very big, white with a dark outline, the key words in yellow",
  small: "small white words with a black outline, under the comic, the key words in yellow",
  top: "a white box at the top of the screen",
};
const SFX = {
  pop: "pop", tap: "tap — a finger on the glass", key: "key click — typing", stamp: "stamp — a tampon lands", win: "win — four bells going up",
  ding: "ding", chime: "chime", sparkle: "sparkle", whoosh: "whoosh", swish: "swish (short whoosh)", swoosh: "swoosh (falling)", riser: "riser — a build-up",
  impact: "impact — a low hit", scan: "scan beep", buzz: "buzzer — wrong", boing: "boing", msg: "message ping", coin: "coin", shutter: "camera shutter",
  tick: "tick (clock)", thud: "thud", scratch: "scratch",
};

/* ---------- the ads, read from their films ---------- */

const browser = await chromium.launch({ executablePath: CHROME, headless: true });

async function readFilm(dir, file) {
  const film = (await import(pathToFileURL(join(dir, "films", file)).href)).default;
  const { voiceLength } = await import(pathToFileURL(join(dir, "engine", "sound.mjs")).href);
  const { FONTS, BASE_CSS } = await import(pathToFileURL(join(dir, "engine", "base.mjs")).href);
  const name = file.replace(/\.mjs$/, "");
  // when each line is said — the same sums as render.mjs
  const estimate = (text) => Math.max(0.8, 0.2 + text.replace(/[*_~«»"]/g, "").split(/\s+/).filter(Boolean).length * 0.34);
  const VOICE = join(dir, "voice", name);
  const timing = [];
  let cursor = film.lead ?? 0.35;
  for (const l of film.lines) {
    const v = ["wav", "mp3", "m4a"].map((x) => join(VOICE, `${l.id}.${x}`)).find(existsSync);
    const len = l.dur ?? (v ? voiceLength(v) : estimate(l.say));
    cursor += l.before ?? 0;
    timing.push({ id: l.id, say: l.say, sub: l.sub, start: +cursor.toFixed(3), end: +(cursor + len).toFixed(3), voice: v ?? null });
    cursor += len + (l.after ?? film.gap ?? 0.16);
  }
  const total = +(cursor + (film.tail ?? 1.2)).toFixed(3);
  // the film's own page, as render.mjs makes it, only to read which effects it asks for and when
  const cache = join(dir, ".cache", name);
  mkdirSync(cache, { recursive: true });
  const assets = typeof film.assets === "function" ? await film.assets() : film.assets ?? {};
  const page = join(cache, "doc.html");
  writeFileSync(page, `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>${FONTS}${BASE_CSS}${film.css ?? ""}</style></head>
<body><div id="stage">${typeof film.html === "function" ? film.html(assets) : film.html ?? ""}</div>
<script src="../../node_modules/gsap/dist/gsap.min.js"></script>
<script>window.FILM = ${JSON.stringify({ name, lines: timing, total, assets })};</script>
<script src="../../engine/kit.js"></script>
<script>(${film.build.toString()})(K.tl, K, K.at, K.end);</script>
<script>K.ready();</script>
</body></html>`);
  const ctx = await browser.newContext({ viewport: { width: 1080, height: 1920 } });
  const p = await ctx.newPage();
  await p.goto(pathToFileURL(page).href, { waitUntil: "load" });
  await p.waitForFunction(() => window.__READY === true, null, { timeout: 20000 }).catch(() => {});
  const sfx = await p.evaluate(() => window.__SFX ?? []);
  await ctx.close();
  // the subtitles as the kit shows them (K.subs): sub ?? say, until the next one or 0.35 s after the line
  const src = readFileSync(join(dir, "films", file), "utf8");
  const look = (src.match(/K\.subs\("(\w+)"/) ?? [])[1] ?? "pill";
  const shown = timing.filter((l) => l.sub !== false);
  const subCues = shown.map((l, i) => {
    const next = shown[i + 1];
    return { id: l.id, start: l.start, end: +Math.min(next ? next.start - 0.03 : total, l.end + 0.35).toFixed(3), text: plain(l.sub ?? l.say) };
  });
  const T = Object.fromEntries(timing.map((l) => [l.id, l]));
  const music = (typeof film.music === "function" ? film.music(T, total) : film.music) ?? { style: "bounce" };
  return { film, name, timing, total, sfx, subCues, look, music, about: docComment(src), dir, voiceDir: VOICE };
}

function adPage(a, meta) {
  const { film, name, timing, total, sfx, subCues, look, music, about } = a;
  const id = name.split("-")[0];
  const voiced = timing.filter((l) => l.voice).length;
  const take = join(a.voiceDir, "take.txt");
  const takeMp3 = join(a.voiceDir, "take.mp3");
  const voiceName = voiced ? (CORAL.includes(id) ? "Coral — a woman's voice" : "Ash — a man's voice") : null;
  const said = timing.map((l) => ({ start: l.start, end: l.end, text: plain(l.say) }));
  writeFileSync(join(HERE, "subs", `${name}.srt`), srt(subCues));
  writeFileSync(join(HERE, "subs", `${name}.vtt`), vtt(subCues));
  writeFileSync(join(HERE, "subs", `${name}.said.srt`), srt(said));
  // the effects, a run of the same one close together told once
  const runs = [];
  for (const s of sfx) {
    const last = runs[runs.length - 1];
    if (last && last.name === s.name && s.t - last.to < 0.75) { last.to = s.t; last.n++; }
    else runs.push({ name: s.name, from: s.t, to: s.t, n: 1 });
  }
  const byName = Object.entries(sfx.reduce((m, s) => ((m[s.name] = (m[s.name] ?? 0) + 1), m), {})).sort((x, y) => y[1] - x[1]);
  const rows = timing.map((l, i) => {
    const cue = subCues.find((c) => c.id === l.id);
    const screen = l.sub === false ? `<span class="muted">no subtitle — the scene carries it</span>` : l.sub ? marked(l.sub) : `<span class="muted">the same words</span>`;
    const play = l.voice ? `<button class="play" data-src="${esc(rel(l.voice))}" title="Play this line's voice" aria-label="Play line ${i + 1}">▶</button>` : "";
    return `<tr data-start="${l.start}" data-end="${l.end}"><td class="n">${i + 1}</td><td class="t num">${sec(l.start)}–${sec(l.end)}</td><td class="ar" dir="rtl">${marked(l.say)}</td><td class="ar" dir="rtl">${screen}${cue ? `<small class="num">${sec(cue.start)}–${sec(cue.end)}</small>` : ""}</td><td>${play}</td></tr>`;
  }).join("\n");
  const breaks = (music.breaks ?? []).map(([x, y]) => `${sec(x)}–${sec(y)} s`).join(", ");
  const full = timing.map((l) => plain(l.say)).join("\n");
  return shell({
    meta, title: film.title, kind: id === "apk" ? "Explainer" : `Ad ${id.slice(1)} of 15`,
    lede: id === "apk" ? "How to put the Android app on a phone — sent to owners on WhatsApp" : `Built like ${BUILT_LIKE[id] ?? "a reel"}`,
    data: { cues: subCues, lines: timing.map((l) => ({ start: l.start, end: l.end })) },
    files: { srt: srt(subCues), vtt: vtt(subCues), said: srt(said), name },
    body: `
<section id="script">
  <h2>Script</h2>
  ${about.length ? `<div class="about">${about.map((p) => `<p>${iso(p)}</p>`).join("")}</div>` : ""}
  <p class="note">${timing.length} lines, ${sec(total)} s. ${voiced ? `Every line is said by the voice; ▶ plays one line alone.` : `No voice: the captions say it.`} Click a line to jump the video there. <b>Bold</b> words are the ones coloured on screen.</p>
  <div class="tablewrap"><table class="lines">
    <thead><tr><th>#</th><th>time (s)</th><th>${voiced ? "said (voice)" : "caption"}</th><th>subtitle on screen</th><th></th></tr></thead>
    <tbody>${rows}</tbody>
  </table></div>
  <h3>The whole text <button class="copy" data-copy="full">Copy</button></h3>
  <pre class="ar block" dir="rtl" id="full">${esc(full)}</pre>
</section>

<section id="sound">
  <h2>Sound</h2>
  ${meta.audio ? `<div class="player"><span>The soundtrack, alone</span><audio controls preload="none" src="sound/${name}.m4a"></audio><a href="sound/${name}.m4a" download>sound/${name}.m4a</a></div>` : ""}
  <dl class="facts">
    <dt>Voice</dt><dd>${voiceName ? `${voiceName}, from OpenAI's voice studio (openai.fm), in Tunisian Derja. One take for the whole film, cut into its ${voiced} lines.` : "None — the captions carry it, over the music."}
      ${existsSync(takeMp3) ? `<div class="player"><span>The take, as recorded</span><audio controls preload="none" src="${esc(rel(takeMp3))}"></audio></div>` : ""}</dd>
    <dt>Music</dt><dd>«${esc(music.style)}» — ${esc(MUSIC[music.style] ?? "")}. Written and played in code (engine/sound.mjs), nothing licensed.${breaks ? ` It stops for a moment at ${breaks}.` : ""} ${voiced ? "It ducks under the voice." : ""}</dd>
    <dt>Effects</dt><dd>${sfx.length} sounds: ${byName.map(([n, c]) => `${esc(n)} ×${c}`).join(", ")}.</dd>
    <dt>Level</dt><dd>Levelled to −14 LUFS (what Instagram plays at), AAC 192 kb/s, 48 kHz stereo.</dd>
  </dl>
  ${existsSync(take) ? `<details><summary>What the voice studio was given (take.txt)</summary><pre class="block" dir="auto">${esc(readFileSync(take, "utf8").trim())}</pre></details>` : voiced ? `<p class="note">The instructions given to the studio were the same Tunisian-Derja ones as film 1 (tts.mjs), with the ${CORAL.includes(id) ? "Coral" : "Ash"} voice.</p>` : ""}
  <h3>Every effect, in order</h3>
  <div class="tablewrap"><table class="fx"><thead><tr><th>time (s)</th><th>sound</th></tr></thead><tbody>
    ${runs.map((r) => `<tr data-start="${r.from}"><td class="num">${r.n > 1 ? `${sec(r.from)}–${sec(r.to)}` : sec(r.from)}</td><td>${esc(SFX[r.name] ?? r.name)}${r.n > 1 ? ` <span class="muted">×${r.n}</span>` : ""}</td></tr>`).join("")}
  </tbody></table></div>
</section>

<section id="subtitles">
  <h2>Subtitles</h2>
  <p class="note">Already burned into the film: ${esc(SUB_LOOK[look] ?? look)}. ${subCues.length} subtitles${subCues.length < timing.length ? `; ${timing.length - subCues.length === 1 ? "1 line has" : `${timing.length - subCues.length} lines have`} none (the scene or the end card shows ${timing.length - subCues.length === 1 ? "it" : "them"})` : ""}. The .srt has them as shown; “every line said” has the whole voice, for a platform's own captions.</p>
  <div class="dl"><button data-dl="srt">${name}.srt</button><button data-dl="vtt">${name}.vtt</button><button data-dl="said">${name}.said.srt — every line said</button></div>
  <pre class="block srt">${esc(srt(subCues))}</pre>
</section>`,
  });
}

/* ---------- the silent ones ---------- */

function silentPage(v, meta) {
  const name = v.slug;
  const clip = v.group === "clips";
  // an explainer's step lines are its captions; a clip's words are only the app's own screens
  const cues = clip ? [] : (v.steps ?? []).filter((s) => s.text).map((s) => ({ start: s.start, end: s.end, text: s.text }));
  if (cues.length) {
    writeFileSync(join(HERE, "subs", `${name}.srt`), srt(cues));
    writeFileSync(join(HERE, "subs", `${name}.vtt`), vtt(cues));
  }
  const rows = (v.steps ?? []).map((s, i) => `<tr data-start="${s.start}" data-end="${s.end}"><td class="n">${i + 1}</td><td class="t num">${sec(s.start)}–${sec(s.end)}</td><td class="ar pre cap" dir="auto">${s.badge ? `<span class="badge">${esc(s.badge)}</span>` : ""}${s.text ? esc(s.text) : `<span class="muted">—</span>`}</td><td>${s.tap ? iso(s.tap) : ""}${s.screen ? `<small>${iso(s.screen)}</small>` : ""}</td></tr>`).join("\n");
  const full = (clip ? (v.steps ?? []).filter((s) => s.text).map((s) => s.text) : cues.map((c) => c.text)).join("\n\n");
  const fixed = (v.fixed_text ?? []).length ? `<dt>Always on screen</dt><dd>${v.fixed_text.map(iso).join("<br>")}</dd>` : "";
  return shell({
    meta, title: v.title, kind: v.group === "clips" ? "Clip inside the app" : "Explainer", lede: v.purpose,
    data: { cues, lines: (v.steps ?? []).map((s) => ({ start: s.start, end: s.end })) },
    files: { srt: srt(cues), vtt: vtt(cues), said: null, name },
    body: `
<section id="script">
  <h2>Script</h2>
  <dl class="facts"><dt>Made by</dt><dd><code>${esc(v.made_by)}</code></dd><dt>Filmed</dt><dd>${iso(v.filmed)}</dd>${fixed}${v.timing_note ? `<dt>Times</dt><dd>${iso(v.timing_note)}</dd>` : ""}</dl>
  ${v.app_text ? `<h3>The words with it in the app</h3><p class="note pre" dir="auto">${iso(v.app_text)}</p>` : ""}
  ${(v.steps ?? []).some((s) => s.text || s.tap) ? `<p class="note">${clip ? "What the app's screen shows" : "What is on screen"}, step by step. Click a step to jump the video there.</p>
  <div class="tablewrap"><table class="lines"><thead><tr><th>step</th><th>time (s)</th><th>${clip ? "the app's words" : "caption"}</th><th>finger / screen</th></tr></thead><tbody>${rows}</tbody></table></div>` : `<p class="note">No words in the picture: ${esc(v.steps?.[0]?.screen ?? "real footage")}.</p>`}
  ${full ? `<h3>The whole text <button class="copy" data-copy="full">Copy</button></h3><pre class="ar block" dir="auto" id="full">${esc(full)}</pre>` : ""}
</section>
<section id="sound">
  <h2>Sound</h2>
  <p class="note">${esc(v.sound && !/^none/i.test(v.sound) ? v.sound : "None — the video is silent (no sound track at all): the words on screen say it all, so it works with the sound off.")}</p>
</section>
<section id="subtitles">
  <h2>Subtitles</h2>
  ${cues.length ? `<p class="note">The words are drawn into the video itself. These files have the same lines with their times.</p>
  <div class="dl"><button data-dl="srt">${name}.srt</button><button data-dl="vtt">${name}.vtt</button></div>
  <pre class="block srt">${esc(srt(cues))}</pre>` : `<p class="note">None: ${clip ? "the clip has no captions — any words in it are the app's own screens, and the app writes its own words over it" : "nothing is said or written on it"}.</p>`}
</section>`,
  });
}

/* ---------- a page ---------- */

const CSS = `
@font-face{font-family:"Readex Pro";font-weight:160 700;font-display:swap;src:url(../ads/assets/fonts/readex-arabic.woff2) format("woff2");unicode-range:U+6??,U+750-77F,U+870-891,U+897-8E1,U+8E3-8FF,U+200C-200E,U+2010-2011,U+204F,U+2E41,U+FB50-FDFF,U+FE70-FE74,U+FE76-FEFC}
@font-face{font-family:"Readex Pro";font-weight:160 700;font-display:swap;src:url(../ads/assets/fonts/readex-latin.woff2) format("woff2");unicode-range:U+??,U+131,U+152-153,U+2BB-2BC,U+2C6,U+2DA,U+2DC,U+304,U+308,U+329,U+2000-206F,U+20AC,U+2122,U+2191,U+2193,U+2212,U+2215,U+FEFF,U+FFFD}
:root{--bg:#f6f5fb;--card:#fff;--ink:#14121d;--muted:#6b6880;--line:#e6e3f0;--brand:#6c47ff;--brand-soft:#efeaff;--hl:#fff3c4;color-scheme:light}
@media (prefers-color-scheme:dark){:root:not([data-theme="light"]){--bg:#111018;--card:#1b1a24;--ink:#ecebf3;--muted:#9a97ad;--line:#2d2b39;--brand:#9d85ff;--brand-soft:#262043;--hl:#3a3313;color-scheme:dark}}
:root[data-theme="dark"]{--bg:#111018;--card:#1b1a24;--ink:#ecebf3;--muted:#9a97ad;--line:#2d2b39;--brand:#9d85ff;--brand-soft:#262043;--hl:#3a3313;color-scheme:dark}
*{box-sizing:border-box}
body{margin:0;background:var(--bg);color:var(--ink);font:16px/1.55 "Readex Pro",system-ui,sans-serif}
a{color:var(--brand)}
code{font:13px ui-monospace,Consolas,monospace;background:var(--brand-soft);padding:2px 6px;border-radius:6px;word-break:break-all}
.wrap{max-width:1180px;margin:0 auto;padding:24px 16px 80px}
.top{display:flex;gap:12px;align-items:center;justify-content:space-between;margin-bottom:18px}
.top a{text-decoration:none;font-weight:600}
.kind{font-size:13px;font-weight:600;color:var(--brand);text-transform:uppercase;letter-spacing:.06em}
h1{margin:4px 0 6px;font-size:34px;line-height:1.25}
.lede{margin:0 0 18px;color:var(--muted)}
.grid{display:grid;grid-template-columns:minmax(0,360px) minmax(0,1fr);gap:28px;align-items:start}
@media (max-width:860px){.grid{grid-template-columns:minmax(0,1fr)}}
.side{position:sticky;top:16px}
@media (max-width:860px){.side{position:static}}
video{width:100%;max-height:72vh;background:#000;border-radius:18px;display:block}
.where{margin-top:12px;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:12px 14px;font-size:14px}
.where b{display:block;font-size:12px;color:var(--muted);font-weight:600;margin-top:6px}
.where b:first-child{margin-top:0}
.chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:10px}
.chip{font-size:12px;background:var(--brand-soft);color:var(--brand);padding:3px 10px;border-radius:999px;font-weight:600}
.now{margin-top:12px;min-height:3.2em;background:var(--card);border:1px solid var(--line);border-radius:14px;padding:10px 14px;font-size:20px;font-weight:600;text-align:center}
.tog{margin-top:8px;font-size:13px;color:var(--muted);display:flex;gap:6px;align-items:center}
nav.jump{display:flex;gap:8px;margin-bottom:14px;flex-wrap:wrap}
nav.jump a{background:var(--card);border:1px solid var(--line);padding:6px 14px;border-radius:999px;text-decoration:none;font-weight:600;font-size:14px}
section{background:var(--card);border:1px solid var(--line);border-radius:18px;padding:18px 20px;margin-bottom:18px}
h2{margin:0 0 10px;font-size:22px}
h3{margin:20px 0 8px;font-size:16px;display:flex;align-items:center;gap:10px}
.about p{margin:0 0 8px;color:var(--ink)}
.note{color:var(--muted);font-size:14px;margin:6px 0 12px}
.muted{color:var(--muted);font-size:13px}
.tablewrap{overflow-x:auto}
table{width:100%;border-collapse:collapse;font-size:15px}
th{text-align:left;font-size:12px;color:var(--muted);font-weight:600;padding:6px 8px;border-bottom:1px solid var(--line);white-space:nowrap}
td{padding:9px 8px;border-bottom:1px solid var(--line);vertical-align:top}
tbody tr{cursor:pointer}
tbody tr:hover{background:var(--brand-soft)}
tr.on{background:var(--hl)!important}
td.n{color:var(--muted);width:2em}
td.t{white-space:nowrap;color:var(--muted);font-size:13px}
td small{display:block;color:var(--muted);font-size:12px;margin-top:3px}
.ar{font-size:18px;line-height:1.6;text-align:right}
td.ar b{color:var(--brand)}
.pre{white-space:pre-line}
td.cap{width:42%;min-width:180px}
.badge{display:inline-grid;place-items:center;min-width:24px;height:24px;border-radius:12px;background:var(--brand);color:#fff;font-size:13px;font-weight:700;margin-inline-end:8px;padding:0 6px;vertical-align:2px}
.note.pre{color:var(--ink);font-size:15px;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:10px 14px}
.num{font-variant-numeric:tabular-nums;direction:ltr;unicode-bidi:isolate}
pre.block{white-space:pre-wrap;background:var(--bg);border:1px solid var(--line);border-radius:12px;padding:12px 14px;margin:0;font:15px/1.7 "Readex Pro",system-ui,sans-serif;max-height:420px;overflow:auto}
pre.ar{font-size:17px}
pre.srt{font-size:15px;direction:ltr;unicode-bidi:plaintext;text-align:left}
button{font:inherit;font-size:13px;font-weight:600;border:1px solid var(--line);background:var(--card);color:var(--ink);border-radius:999px;padding:5px 12px;cursor:pointer}
button:hover{border-color:var(--brand);color:var(--brand)}
button.play{width:34px;height:34px;padding:0;border-radius:50%}
.dl{display:flex;flex-wrap:wrap;gap:8px;margin-bottom:12px}
.player{display:flex;flex-wrap:wrap;align-items:center;gap:10px;margin:6px 0 12px;font-size:14px}
.player span{font-weight:600}
audio{height:36px;max-width:100%}
dl.facts{display:grid;grid-template-columns:max-content minmax(0,1fr);gap:8px 16px;margin:6px 0 12px}
dl.facts dt{font-weight:600;color:var(--muted);font-size:14px}
dl.facts dd{margin:0;min-width:0;overflow-wrap:anywhere}
.note,td{overflow-wrap:anywhere}
@media (max-width:520px){dl.facts{grid-template-columns:minmax(0,1fr);gap:2px}dl.facts dd{margin-bottom:10px}}
details{margin:8px 0}
summary{cursor:pointer;font-weight:600;font-size:14px}
details pre{margin-top:8px}
`;

const JS = `
const D = JSON.parse(document.getElementById("data").textContent);
const v = document.querySelector("video");
const now = document.querySelector(".now");
const rows = [...document.querySelectorAll("tbody tr[data-start]")];
rows.forEach((r) => r.addEventListener("click", (e) => { if (e.target.closest("button")) return; v.currentTime = +r.dataset.start + 0.02; v.play().catch(() => {}); window.scrollTo({ top: 0, behavior: "smooth" }); }));
let track = null;
try { track = v.addTextTrack("subtitles", "Subtitles", "ar"); D.cues.forEach((c) => track.addCue(new VTTCue(c.start, c.end, c.text))); track.mode = "hidden"; } catch (e) {}
const tog = document.getElementById("cc");
if (tog) tog.addEventListener("change", () => { if (track) track.mode = tog.checked ? "showing" : "hidden"; });
v.addEventListener("timeupdate", () => {
  const t = v.currentTime;
  const c = D.cues.find((c) => t >= c.start && t < c.end);
  now.textContent = c ? c.text : "";
  document.querySelectorAll("table.lines tbody tr").forEach((r) => r.classList.toggle("on", t >= +r.dataset.start && t < +r.dataset.end));
});
const one = new Audio();
document.querySelectorAll("button.play").forEach((b) => b.addEventListener("click", () => { v.pause(); one.src = b.dataset.src; one.play(); }));
document.querySelectorAll("[data-copy]").forEach((b) => b.addEventListener("click", async () => {
  const text = document.getElementById(b.dataset.copy).textContent;
  try { await navigator.clipboard.writeText(text); } catch (e) { const r = document.createRange(); r.selectNodeContents(document.getElementById(b.dataset.copy)); getSelection().removeAllRanges(); getSelection().addRange(r); document.execCommand("copy"); }
  b.textContent = "Copied"; setTimeout(() => (b.textContent = "Copy"), 1500);
}));
const F = JSON.parse(document.getElementById("files").textContent);
document.querySelectorAll("[data-dl]").forEach((b) => b.addEventListener("click", () => {
  const k = b.dataset.dl, ext = k === "vtt" ? ".vtt" : k === "said" ? ".said.srt" : ".srt";
  const a = document.createElement("a");
  a.href = URL.createObjectURL(new Blob(["\\ufeff" + F[k]], { type: "text/plain;charset=utf-8" }));
  a.download = F.name + ext; a.click();
}));
`;

function shell({ meta, title, kind, lede, body, data, files }) {
  const chips = [`${sec(meta.duration)} s`, `${meta.w}×${meta.h}`, `${meta.fps} fps`, meta.audio ? "with sound" : "no sound", `${meta.mb} MB`];
  return `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>${esc(plain(title))} · Pointili video</title><style>${CSS}</style></head>
<body><div class="wrap">
<div class="top"><a href="index.html">← All videos</a><span class="muted">${esc(meta.file)}</span></div>
<div class="kind">${esc(kind)}</div>
<h1 dir="auto">${esc(plain(title))}</h1>
<p class="lede">${iso(lede ?? "")}</p>
<div class="grid">
  <div class="side">
    <video controls playsinline preload="metadata" poster="thumbs/${esc(files.name)}.jpg" src="${esc(meta.src)}"></video>
    <div class="now ar" dir="rtl" aria-live="polite"></div>
    <label class="tog"><input type="checkbox" id="cc"> Show the subtitle file over the video (they are already in the picture)</label>
    <div class="where">
      <b>Where it is</b><code>${esc(meta.abs)}</code>
      ${meta.alt ? `<b>Also</b>${meta.alt.map((x) => `<code>${esc(x)}</code>`).join("<br>")}` : ""}
      <div class="chips">${chips.map((c) => `<span class="chip">${esc(c)}</span>`).join("")}</div>
    </div>
  </div>
  <div>
    <nav class="jump"><a href="#script">Script</a><a href="#sound">Sound</a><a href="#subtitles">Subtitles</a></nav>
    ${body}
  </div>
</div></div>
<script type="application/json" id="data">${JSON.stringify(data).replace(/</g, "\\u003c")}</script>
<script type="application/json" id="files">${JSON.stringify(files).replace(/</g, "\\u003c")}</script>
<script>${JS}</script>
</body></html>`;
}

/* ---------- all of them ---------- */

function media(file, slug, alt) {
  const m = probe(file);
  const at = Math.min(m.duration * 0.35, 12).toFixed(2);
  execFileSync(FF, ["-v", "error", "-y", "-ss", at, "-i", file, "-frames:v", "1", "-vf", "scale=360:-2", "-q:v", "4", join(HERE, "thumbs", `${slug}.jpg`)]);
  if (m.audio) execFileSync(FF, ["-v", "error", "-y", "-i", file, "-vn", "-c:a", "copy", join(HERE, "sound", `${slug}.m4a`)]);
  return { ...m, src: rel(file), abs: win(file), file: relative(ROOT, file).replace(/\\/g, "/"), alt };
}

const entries = [];
const films = readdirSync(join(ADS, "films")).filter((f) => /^f\d+-.*\.mjs$/.test(f)).sort((x, y) => parseInt(x.slice(1)) - parseInt(y.slice(1)));
for (const f of films) {
  const a = await readFilm(ADS, f);
  const mp4 = join(ADS, "out", `${a.name}.mp4`);
  const wa = join(ADS, "out", "whatsapp", `${a.name}.mp4`);
  const meta = media(mp4, a.name, existsSync(wa) ? [`${win(wa)}  (lighter copy for WhatsApp)`] : null);
  if (Math.abs(meta.duration - a.total) > 0.25) console.log(`  ! ${a.name}: the film is ${meta.duration} s, its lines add up to ${a.total} s`);
  writeFileSync(join(HERE, `${a.name}.html`), adPage(a, meta));
  entries.push({ group: "ads", slug: a.name, title: plain(a.film.title), meta, lines: a.timing.length, voice: a.timing.some((l) => l.voice) ? (CORAL.includes(a.name.split("-")[0]) ? "Coral" : "Ash") : null, about: BUILT_LIKE[a.name.split("-")[0]] });
  console.log(`✓ ${a.name}: ${a.timing.length} lines, ${a.sfx.length} sounds, ${a.subCues.length} subtitles`);
}

// the APK explainer: its film is films/apk-install.mjs; the file sent is explainers/install-apk.mp4
if (existsSync(join(APK_ADS, "films", "apk-install.mjs"))) {
  const a = await readFilm(APK_ADS, "apk-install.mjs");
  const main = join(APK_ADS, "..", "explainers", "install-apk.mp4");
  const here = join(ADS, "out", "apk-install.mp4");
  if (!existsSync(here)) copyFileSync(main, here);
  const meta = media(here, a.name, [`${win(main)}  (the copy sent to owners)`]);
  meta.abs = win(here);
  writeFileSync(join(HERE, `${a.name}.html`), adPage(a, meta));
  entries.push({ group: "explainers", slug: a.name, title: plain(a.film.title), meta, lines: a.timing.length, voice: null, about: "How to put the Android app on a phone, step by step" });
  console.log(`✓ ${a.name}: ${a.timing.length} lines, ${a.sfx.length} sounds`);
}
await browser.close();

const silentFile = join(HERE, "data", "silent.json");
if (existsSync(silentFile)) {
  for (const v of JSON.parse(readFileSync(silentFile, "utf8"))) {
    const file = join(ROOT, v.file);
    if (!existsSync(file)) { console.log(`  ! missing ${v.file}`); continue; }
    v.slug = v.file.split("/").pop().replace(/\.mp4$/, "");
    v.group = v.file.startsWith("v2/public/clips") ? "clips" : "explainers";
    const meta = media(file, v.slug, null);
    writeFileSync(join(HERE, `${v.slug}.html`), silentPage(v, meta));
    entries.push({ group: v.group, slug: v.slug, title: v.title, meta, lines: (v.steps ?? []).length, voice: null, about: v.purpose });
    console.log(`✓ ${v.slug}: ${(v.steps ?? []).length} steps`);
  }
}

/* ---------- the index ---------- */

const GROUPS = [
  ["ads", "Video ads", "Vertical ads for Instagram, Facebook and TikTok, with a Derja voice, music and subtitles."],
  ["explainers", "Explainers to send owners", "Short how-tos to send on WhatsApp: no voice, the words on screen say it."],
  ["clips", "Clips inside the app", "Short silent clips the site shows owners (how it works, the wheel)."],
];
const card = (e) => `<a class="card" href="${esc(e.slug)}.html">
  <img src="thumbs/${esc(e.slug)}.jpg" alt="" loading="lazy">
  <div><div class="t" dir="auto">${esc(e.title)}</div><div class="s">${iso(e.about ?? "")}</div>
  <div class="chips"><span class="chip">${sec(e.meta.duration)} s</span><span class="chip">${e.meta.audio ? (e.voice ? `voice: ${e.voice}` : "music") : "silent"}</span>${e.lines > 1 ? `<span class="chip">${e.lines} ${e.group === "ads" || e.slug === "apk-install" ? "lines" : "steps"}</span>` : ""}</div>
  <code>${esc(e.meta.abs)}</code></div></a>`;
const total = entries.reduce((s, e) => s + e.meta.duration, 0);
const index = `<!doctype html>
<html lang="en"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1">
<title>Pointili videos</title><style>${CSS}
.cards{display:grid;grid-template-columns:repeat(auto-fill,minmax(min(100%,340px),1fr));gap:14px}
.card{display:grid;grid-template-columns:96px minmax(0,1fr);gap:14px;background:var(--card);border:1px solid var(--line);border-radius:16px;padding:12px;text-decoration:none;color:var(--ink)}
.card:hover{border-color:var(--brand)}
.card img{width:96px;aspect-ratio:9/16;object-fit:cover;border-radius:10px;background:#000}
.card .t{font-weight:700;font-size:18px;line-height:1.3}
.card .s{color:var(--muted);font-size:13px;margin:4px 0 2px}
.card code{display:block;margin-top:8px;font-size:11px}
.group{margin:28px 0 10px}
.group h2{margin:0}
.group p{margin:2px 0 0;color:var(--muted);font-size:14px}
.folders{background:var(--card);border:1px solid var(--line);border-radius:16px;padding:14px 18px;font-size:14px}
.folders li{margin:4px 0}
</style></head>
<body><div class="wrap">
<div class="kind">Pointili</div>
<h1>All the videos</h1>
<p class="lede">${entries.length} videos, ${Math.round(total / 60)} minutes in all. Each page has the full script with its times, the sound (voice, music, effects, the soundtrack to play) and the subtitles (.srt / .vtt).</p>
<div class="folders"><b>The folders</b><ul>
  <li><code>${esc(win(join(ADS, "out")))}</code> — the ${entries.filter((e) => e.group === "ads").length} ads (and <code>out\\whatsapp</code>: lighter copies of f4 and f14), plus <code>apk-install.mp4</code></li>
  <li><code>${esc(win(join(ROOT, "social", "explainers")))}</code> — the explainers sent to owners</li>
  <li><code>${esc(win(join(ROOT, "social", "install-guide")))}</code> — the two «add to home screen» guides</li>
  <li><code>${esc(win(join(ROOT, "v2", "public", "clips")))}</code> — the clips the site shows</li>
  <li><code>${esc(win(HERE))}</code> — these pages; <code>subs\\</code> the subtitles, <code>sound\\</code> each soundtrack alone</li>
</ul></div>
${GROUPS.map(([g, h, p]) => {
  const list = entries.filter((e) => e.group === g);
  return list.length ? `<div class="group"><h2>${h} <span class="muted">(${list.length})</span></h2><p>${p}</p></div><div class="cards">${list.map(card).join("")}</div>` : "";
}).join("")}
</div></body></html>`;
writeFileSync(join(HERE, "index.html"), index);
console.log(`index.html: ${entries.length} videos`);
