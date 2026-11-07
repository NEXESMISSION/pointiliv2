/**
 * Pointili's video ads, filmed.
 *
 *   node render.mjs f2                   → out/<film>.mp4 (1080×1920, 30 fps, its sound mixed)
 *   node render.mjs f2 --still 2,9.5     → .cache/<film>/still-2.jpg … (no film: for checking a cut)
 *   node render.mjs f2 --sheet           → .cache/<film>/sheet.jpg, a frame every second on one page
 *   node render.mjs f2 --workers 6       → the frames filmed by 6 pages at once (default 4)
 *   node render.mjs f2 --mute            → no voice even when voice/<film>/ has some (music, effects)
 *
 * A film (films/*.mjs) is the lines it says, in Derja, and the scenes under them. A line lasts as
 * long as its voice (voice/<film>/<line id>.wav or .mp3, when there is one), else as long as it
 * takes to say it — so a voice recorded later only has to be dropped in: everything re-times.
 * The scenes are HTML moved by one GSAP timeline, sought frame by frame: a frame is the same
 * every time it is filmed. The sound (music, effects, voice) is made in engine/sound.mjs.
 *
 * Needs Chrome (CHROME=path) and ffmpeg (FFMPEG=path, else the one winget installed, else PATH).
 */
import { chromium } from "playwright-core";
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, rmSync, writeFileSync } from "node:fs";
import { join, resolve } from "node:path";
import { pathToFileURL } from "node:url";
import { makeSound, voiceLength } from "./engine/sound.mjs";
import { FONTS, BASE_CSS } from "./engine/base.mjs";

const DIR = import.meta.dirname;
const CHROME = process.env.CHROME || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const WINGET_FF = "C:/Users/ayoub/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
export const FF = process.env.FFMPEG || (existsSync(WINGET_FF) ? WINGET_FF : "ffmpeg");
const W = 1080;
const H = 1920;

const argv = process.argv.slice(2);
const flag = (name) => argv.includes(`--${name}`);
const opt = (name, d) => {
  const i = argv.indexOf(`--${name}`);
  return i >= 0 ? argv[i + 1] : d;
};
const id = argv.find((a) => !a.startsWith("--") && !argv[argv.indexOf(a) - 1]?.startsWith("--"));
if (!id) {
  console.log("node render.mjs <film> [--still s,s] [--sheet] [--workers n] [--mute]");
  process.exit(1);
}
const file = readdirSync(join(DIR, "films")).find((f) => f === `${id}.mjs` || f.startsWith(`${id}-`));
if (!file) throw new Error(`no film «${id}» in films/`);
const film = (await import(pathToFileURL(join(DIR, "films", file)).href)).default;
const NAME = file.replace(/\.mjs$/, "");
const FPS = Number(opt("fps", film.fps ?? 30));
const CACHE = join(DIR, ".cache", NAME);
mkdirSync(CACHE, { recursive: true });

/* ---------- when each line is said ---------- */

// a Derja line said in an ad, brisk: ~0.34 s a word, a breath before the next
const estimate = (text) => {
  const words = text.replace(/[*_~«»"]/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(0.8, 0.2 + words * 0.34);
};
const VOICE = join(DIR, "voice", NAME);
const timing = [];
let cursor = film.lead ?? 0.35;
for (const l of film.lines) {
  const v = flag("mute") ? null : ["wav", "mp3", "m4a"].map((x) => join(VOICE, `${l.id}.${x}`)).find(existsSync);
  const len = l.dur ?? (v ? voiceLength(v) : estimate(l.say));
  cursor += l.before ?? 0;
  timing.push({ id: l.id, say: l.say, sub: l.sub, start: +cursor.toFixed(3), end: +(cursor + len).toFixed(3), voice: v ?? null });
  cursor += len + (l.after ?? film.gap ?? 0.16);
}
const total = +(cursor + (film.tail ?? 1.2)).toFixed(3);

/* ---------- the page ---------- */

const assets = typeof film.assets === "function" ? await film.assets() : film.assets ?? {};
const html = `<!doctype html><html lang="ar" dir="rtl"><head><meta charset="utf-8">
<style>${FONTS}${BASE_CSS}${film.css ?? ""}</style></head>
<body><div id="stage">${typeof film.html === "function" ? film.html(assets) : film.html ?? ""}</div>
<script src="../../node_modules/gsap/dist/gsap.min.js"></script>
<script>window.FILM = ${JSON.stringify({ name: NAME, lines: timing, total, assets })};</script>
<script src="../../engine/kit.js"></script>
<script>(${film.build.toString()})(K.tl, K, K.at, K.end);</script>
<script>K.ready();</script>
</body></html>`;
const PAGE = join(CACHE, "index.html");
writeFileSync(PAGE, html);

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--force-color-profile=srgb", "--hide-scrollbars", "--font-render-hinting=none"] });
async function openPage() {
  const ctx = await browser.newContext({ viewport: { width: W, height: H }, deviceScaleFactor: 1 });
  const p = await ctx.newPage();
  const errors = [];
  p.on("pageerror", (e) => errors.push(e.message));
  p.on("console", (m) => m.type() === "error" && errors.push(m.text()));
  await p.goto(pathToFileURL(PAGE).href, { waitUntil: "load" });
  await p.evaluate(async () => {
    await document.fonts.ready;
    await Promise.all([...document.images].map((i) => (i.complete ? null : i.decode().catch(() => null))));
  });
  await p.waitForFunction(() => window.__READY === true, null, { timeout: 15000 }).catch(() => {});
  if (errors.length) throw new Error(`the page broke:\n  ${errors.join("\n  ")}`);
  return p;
}

const first = await openPage();
const sfx = await first.evaluate(() => window.__SFX ?? []);
console.log(`${NAME}: ${timing.length} lines, ${total.toFixed(1)} s, ${sfx.length} sounds${timing.some((l) => l.voice) ? `, voice on ${timing.filter((l) => l.voice).length} lines` : ", no voice yet"}`);

const at = async (p, t) => p.evaluate((v) => window.__seek(v), t);

if (opt("still")) {
  for (const t of opt("still").split(",").map(Number)) {
    await at(first, t);
    await first.screenshot({ path: join(CACHE, `still-${t}.jpg`), type: "jpeg", quality: 90 });
  }
  console.log(`stills in ${CACHE}`);
  await browser.close();
  process.exit(0);
}

if (flag("sheet")) {
  const dir = join(CACHE, "sheet");
  rmSync(dir, { recursive: true, force: true });
  mkdirSync(dir, { recursive: true });
  const step = Number(opt("step", 1));
  let n = 0;
  for (let t = 0.5; t < total; t += step, n++) {
    await at(first, t);
    await first.screenshot({ path: join(dir, `s${String(n).padStart(3, "0")}.jpg`), type: "jpeg", quality: 80 });
  }
  const cols = 8;
  // ffmpeg takes a font path badly on Windows: a copy next to the frames, by its bare name
  copyFileSync("C:/Windows/Fonts/segoeuib.ttf", join(dir, "label.ttf"));
  execFileSync(FF, ["-v", "error", "-y", "-framerate", "1", "-i", "s%03d.jpg", "-vf",
    `scale=270:-1,drawtext=fontfile=label.ttf:text='%{eif\\:n*${step}+0.5\\:d}s':x=8:y=8:fontsize=26:fontcolor=yellow:box=1:boxcolor=black@0.6,tile=${cols}x${Math.ceil(n / cols)}`,
    "-frames:v", "1", join(CACHE, "sheet.jpg")], { cwd: dir });
  console.log(`sheet: ${join(CACHE, "sheet.jpg")} (${n} frames)`);
  await browser.close();
  process.exit(0);
}

/* ---------- the frames, filmed by a few pages at once ---------- */

const FRAMES = join(DIR, ".frames", NAME);
rmSync(FRAMES, { recursive: true, force: true });
mkdirSync(FRAMES, { recursive: true });
const count = Math.ceil(total * FPS);
const workers = Math.max(1, Math.min(Number(opt("workers", 4)), 8));
const pages = [first, ...(await Promise.all(Array.from({ length: workers - 1 }, openPage)))];
let next = 0;
let done = 0;
const t0 = Date.now();
await Promise.all(
  pages.map(async (p) => {
    for (;;) {
      const i = next++;
      if (i >= count) return;
      await at(p, i / FPS);
      await p.screenshot({ path: join(FRAMES, `f${String(i).padStart(5, "0")}.jpg`), type: "jpeg", quality: 92 });
      if (++done % 150 === 0) process.stdout.write(`  ${done}/${count} frames (${((Date.now() - t0) / 1000).toFixed(0)} s)\n`);
    }
  }),
);
await browser.close();

/* ---------- the sound, then the film ---------- */

const wav = join(CACHE, "sound.wav");
await makeSound({ film, timing, total, sfx, out: wav, ff: FF });
mkdirSync(join(DIR, "out"), { recursive: true });
const out = join(DIR, "out", `${NAME}.mp4`);
execFileSync(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", join(FRAMES, "f%05d.jpg"), "-i", wav,
  "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-profile:v", "high",
  // the frames are JPEGs (full range): the film in the ordinary range, which every phone and Instagram play
  "-vf", "scale=in_range=pc:out_range=tv,format=yuv420p", "-color_range", "tv",
  "-c:a", "aac", "-b:a", "192k", "-ar", "48000", "-shortest", "-movflags", "+faststart", out]);
rmSync(FRAMES, { recursive: true, force: true });
console.log(`✓ ${resolve(out)}  (${total.toFixed(1)} s, ${count} frames, ${((Date.now() - t0) / 1000).toFixed(0)} s to film)`);
