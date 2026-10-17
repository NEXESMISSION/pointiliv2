/**
 * Renders logo-anim.html — «مع Pointili تنجم تعمل carte de fidélité digital» with the Pointili mark
 * built on screen — as transparent clips timed on the take (clip4, 4.4 s → 7.1 s).
 *
 *   node social/reel/logo-anim.mjs               → the three styles: <n>-<id>-alpha.mov (ProRes 4444, no background)
 *   node social/reel/logo-anim.mjs --only 1      → just that one
 *   node social/reel/logo-anim.mjs --preview     → still frames over the take into .work/logo-preview, to look first
 *   … --bg <video>                               → the take (default: vedio pointili 3/clip4.mp4)
 *
 * The render starts at the take's 0:00 (empty until the words), so it lines up when dropped at 0:00.
 * A preview over the take, with its sound, goes into the «preview» folder next to the clips.
 */
import { chromium } from "playwright-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
const FPS = 30;
const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const preview = argv.includes("--preview");
const only = arg("--only")?.split(",").map(Number);
const BG = arg("--bg") || path.join(os.homedir(), "Desktop", "vedio pointili 3", "clip4.mp4");
const KIT = path.join(os.homedir(), "Desktop", "Pointili reel kit", "logo-pointili-digital");
const PREV = path.join(KIT, "preview (bel fond, ken bech tchouf)");
const WORK = path.join(DIR, ".work", "logo-anim");
const url = (s) => "file:///" + path.join(DIR, "logo-anim.html").replace(/\\/g, "/") + `?s=${s}`;

await rm(WORK, { recursive: true, force: true }); await mkdir(WORK, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(url(1), { waitUntil: "load" });
  const styles = await page.evaluate(() => window.STYLES);
  for (const [k, st] of styles.entries()) {
    const n = k + 1;
    if (only && !only.includes(n)) continue;
    await page.goto(url(n), { waitUntil: "load" });
    await page.evaluate(() => window.ready);
    const duration = await page.evaluate(() => window.DURATION);
    const name = `${n}-${st.id}`;
    if (preview) {
      const dir = path.join(DIR, ".work", "logo-preview"); await mkdir(dir, { recursive: true });
      for (const t of [4.5, 4.75, 5.0, 5.3, 5.55, 5.85, 6.2, 6.6, 6.85, 7.1]) {
        await page.evaluate((t) => window.seek(t), t);
        const f = path.join(WORK, `p.png`);
        await page.screenshot({ path: f, omitBackground: true });
        await run(FF, ["-v", "error", "-y", "-ss", String(t), "-i", BG, "-i", f, "-frames:v", "1", "-filter_complex", "[0:v]scale=1080:1920[b];[b][1]overlay,scale=360:640", path.join(dir, `${name}-${t.toFixed(2)}.png`)]);
      }
      console.log(`  ${name}: stills`);
      continue;
    }
    await mkdir(PREV, { recursive: true });
    const frames = path.join(WORK, name); await mkdir(frames, { recursive: true });
    const total = Math.round(duration * FPS);
    for (let f = 0; f < total; f++) {
      await page.evaluate((t) => window.seek(t), f / FPS);
      await page.screenshot({ path: path.join(frames, `${String(f + 1).padStart(4, "0")}.png`), omitBackground: true });
    }
    const seq = ["-framerate", String(FPS), "-i", path.join(frames, "%04d.png")];
    await run(FF, ["-v", "error", "-y", ...seq, "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0", path.join(KIT, `${name}-alpha.mov`)]);
    if (existsSync(BG)) await run(FF, ["-v", "error", "-y", "-t", String(duration), "-i", BG, ...seq,
      "-filter_complex", `[0:v]scale=1080:1920,fps=${FPS},setsar=1[b];[b][1]overlay=shortest=1,format=yuv420p`, "-c:a", "aac", "-b:a", "192k",
      "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-movflags", "+faststart", path.join(PREV, `${name}-preview.mp4`)]);
    await rm(frames, { recursive: true, force: true });
    console.log(`  ✓ ${name} — ${duration}s`);
  }
  console.log(`\n${preview ? path.join(DIR, ".work", "logo-preview") : KIT}`);
} finally {
  await browser.close();
}
