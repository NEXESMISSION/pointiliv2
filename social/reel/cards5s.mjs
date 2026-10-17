/**
 * Renders cards5s.html — five seconds: the number of tampons chosen, what the
 * customer wins, a card for every kind of shop, and a card made — in three
 * takes to choose from:
 *   A «Morph»  one card that becomes everything, light
 *   B «Deck»   dark: a picker wheel, the card turns over to its gift, a fan of shops
 *   C «Phone»  a finger makes the card in the app, and it leaves the phone
 *
 *   node social/reel/cards5s.mjs              → the three MP4s (1080×1920, 60 fps) into the reel kit (cards-5s/)
 *   node social/reel/cards5s.mjs A C          → only those takes
 *   node social/reel/cards5s.mjs --preview    → a contact sheet of stills per take into social/reel/.work/cards5s-preview
 *
 * Every frame is placed by seek(t) in the page, then screenshotted, then ffmpeg encodes it.
 */
import { chromium } from "playwright-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
const FPS = Number(process.env.FPS || 60);
const KIT = path.join(os.homedir(), "Desktop", "Pointili reel kit", "cards-5s");
const WORK = path.join(DIR, ".work");
const NAMES = { A: "morph", B: "deck", C: "phone" };

const argv = process.argv.slice(2);
const preview = argv.includes("--preview");
const takes = argv.filter((a) => /^[ABC]$/.test(a));
const which = takes.length ? takes : ["A", "B", "C"];

const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--allow-file-access-from-files"] });
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file:///" + path.join(DIR, "cards5s.html").replace(/\\/g, "/"), { waitUntil: "load" });
  await page.evaluate(() => window.ready());
  const duration = await page.evaluate(() => window.DURATION);
  await mkdir(preview ? path.join(WORK, "cards5s-preview") : KIT, { recursive: true });

  for (const v of which) {
    await page.evaluate((v) => window.setup(v), v);
    if (preview) {
      const out = path.join(WORK, "cards5s-preview", v);
      await rm(out, { recursive: true, force: true });
      await mkdir(out, { recursive: true });
      const times = [0.2, 0.55, 0.9, 1.2, 1.6, 2.1, 2.3, 2.7, 3.0, 3.4, 3.9, 4.2, 4.55, 4.95];
      for (const t of times) {
        await page.evaluate((t) => window.seek(t), t);
        await page.waitForTimeout(30);
        await page.screenshot({ path: path.join(out, `t-${t.toFixed(2)}.png`) });
      }
      // one sheet of all the stills, to look at in one go
      const files = times.map((t) => path.join(out, `t-${t.toFixed(2)}.png`));
      const cols = 7;
      await run(FF, ["-v", "error", "-y", ...files.flatMap((f) => ["-i", f]), "-filter_complex",
        files.map((_, i) => `[${i}:v]scale=270:480[s${i}]`).join(";") + ";" + files.map((_, i) => `[s${i}]`).join("") + `xstack=inputs=${files.length}:layout=` +
        files.map((_, i) => `${(i % cols) * 270}_${Math.floor(i / cols) * 480}`).join("|"),
        path.join(WORK, "cards5s-preview", `sheet-${v}.png`)]);
      console.log(`  ${v}: ${times.length} stills → ${path.join(WORK, "cards5s-preview", `sheet-${v}.png`)}`);
      continue;
    }
    const frames = Math.round(duration * FPS);
    const dir = path.join(WORK, `cards5s-${v}`);
    await rm(dir, { recursive: true, force: true });
    await mkdir(dir, { recursive: true });
    const t0 = Date.now();
    for (let f = 0; f < frames; f++) {
      await page.evaluate((t) => window.seek(t), f / FPS);
      await page.screenshot({ path: path.join(dir, `${String(f + 1).padStart(4, "0")}.png`) });
    }
    const out = path.join(KIT, `pointili-cards-${v}-${NAMES[v]}.mp4`);
    await run(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", path.join(dir, "%04d.png"), "-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", out]);
    await rm(dir, { recursive: true, force: true });
    console.log(`  ✓ ${out} — ${frames} frames, ${duration}s at ${FPS} fps, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }
  if (!preview) console.log(`\n${KIT}`);
} finally {
  await browser.close();
}
