/**
 * Renders flow.html — the customer's screens, then the shop's, in one phone — as a clip.
 *
 *   node social/reel/flow.mjs              → both files into the reel kit (flow/)
 *   node social/reel/flow.mjs --mp4        → only the ready-to-post MP4 (with its backgrounds)
 *   node social/reel/flow.mjs --alpha      → only the ProRes 4444 with a transparent background, to lay over footage
 *   node social/reel/flow.mjs --preview    → a dozen still frames into social/reel/.work/flow-preview, to look before rendering
 *
 * Every frame is placed by seek(t) in the page, then screenshotted, then ffmpeg encodes the
 * sequence: the same frames every time, no variable frame rate, real alpha where asked.
 */
import { chromium } from "playwright-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, rm, readdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const SCREENS = path.join(DIR, "screens", "screen");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
const FPS = Number(process.env.FPS || 30);
const KIT = path.join(os.homedir(), "Desktop", "Pointili reel kit", "flow");
const WORK = path.join(DIR, ".work");

const argv = process.argv.slice(2);
const preview = argv.includes("--preview");
const wantMp4 = !argv.includes("--alpha") || argv.includes("--mp4");
const wantAlpha = !argv.includes("--mp4") || argv.includes("--alpha");

const screens = {};
for (const f of await readdir(SCREENS)) if (f.endsWith(".png")) screens[f.replace(/\.png$/, "")] = `data:image/png;base64,${(await readFile(path.join(SCREENS, f))).toString("base64")}`;

const browser = await chromium.launch({ executablePath: CHROME, headless: true });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file:///" + path.join(DIR, "flow.html").replace(/\\/g, "/"), { waitUntil: "load" });
  await page.evaluate((s) => window.setup(s), screens);
  await page.waitForTimeout(600);
  const duration = await page.evaluate(() => window.DURATION);

  if (preview) {
    const out = path.join(WORK, "flow-preview"); await rm(out, { recursive: true, force: true }); await mkdir(out, { recursive: true });
    const samples = await page.evaluate(() => window.SAMPLE);
    for (const t of samples) { await page.evaluate((t) => window.seek(t), t); await page.screenshot({ path: path.join(out, `t-${t.toFixed(2)}.png`) }); }
    await page.evaluate(() => document.body.classList.add("alpha"));
    await page.evaluate((t) => window.seek(t), 9.2); await page.screenshot({ path: path.join(out, "alpha-9.20.png"), omitBackground: true });
    console.log(`${samples.length + 1} frames in ${out}`);
  } else {
    await mkdir(KIT, { recursive: true });
    const frames = Math.round(duration * FPS);
    for (const [variant, on] of [["mp4", wantMp4], ["alpha", wantAlpha]]) {
      if (!on) continue;
      const dir = path.join(WORK, `flow-${variant}`); await rm(dir, { recursive: true, force: true }); await mkdir(dir, { recursive: true });
      await page.evaluate((a) => document.body.classList.toggle("alpha", a), variant === "alpha");
      const t0 = Date.now();
      for (let f = 0; f < frames; f++) {
        await page.evaluate((t) => window.seek(t), f / FPS);
        await page.screenshot({ path: path.join(dir, `${String(f + 1).padStart(4, "0")}.png`), omitBackground: variant === "alpha" });
        if (f % 150 === 0) process.stdout.write(`  ${variant}: frame ${f}/${frames}\r`);
      }
      const out = path.join(KIT, variant === "alpha" ? "pointili-flow-alpha.mov" : "pointili-flow.mp4");
      const codec = variant === "alpha"
        ? ["-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0"]
        : ["-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p", "-movflags", "+faststart"];
      await run(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(dir, "%04d.png"), ...codec, out]);
      await rm(dir, { recursive: true, force: true });
      console.log(`  ✓ ${out} — ${frames} frames at ${FPS} fps, ${duration}s, ${((Date.now() - t0) / 1000).toFixed(0)}s to render`);
    }
    console.log(`\n${KIT}`);
  }
} finally {
  await browser.close();
}
