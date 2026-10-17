/**
 * Renders typo-anim.html — six typography overlays for «شقولك كان نقلك كيفاش تعمل programme de fidélité
 * للcommerce متاعك في 3 دقايق» — into clips to lay over the talking video.
 *
 *   node social/reel/typo-anim.mjs                 → all six styles into the reel kit (typo-3-minutes/)
 *   node social/reel/typo-anim.mjs --only 2,3      → just those styles
 *   node social/reel/typo-anim.mjs --speed 0.85    → slower (said more slowly); 1.2 = faster
 *   node social/reel/typo-anim.mjs --preview       → a few still frames per style over a b-roll frame, to look first
 *   node social/reel/typo-anim.mjs --bg <video>    → the footage the previews are laid over (default: vedio pointili 3/clip1.mp4)
 *   … --times 0.02,0.46,… --end 4.5               → the real start of each of the 13 words in a take (from its transcript), and when it leaves
 *   … --theme light --at 0 --out clip4            → dark type for light footage; the preview starts at second 0 of --bg, with its sound;
 *                                                   files go to typo-3-minutes/clip4/ and line up when dropped at --at in the edit
 *
 * For each style: <n>-<id>-alpha.mov (ProRes 4444, transparent: CapCut PC, Premiere, Resolve),
 * <n>-<id>-green.mp4 (green screen: CapCut phone → Overlay → Chroma key) and <n>-<id>-preview.mp4
 * (over the footage, to choose). Then ALL-OPTIONS-preview.mp4: the six one after the other, numbered.
 */
import { chromium } from "playwright-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, writeFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
const FPS = 30;
const KIT = path.join(os.homedir(), "Desktop", "Pointili reel kit", "typo-3-minutes", ...(process.argv.includes("--out") ? [process.argv[process.argv.indexOf("--out") + 1]] : []));
const WORK = path.join(DIR, ".work", "typo-anim");

const argv = process.argv.slice(2);
const arg = (k) => { const i = argv.indexOf(k); return i >= 0 ? argv[i + 1] : null; };
const preview = argv.includes("--preview");
const speed = Number(arg("--speed") || 1);
const only = arg("--only")?.split(",").map(Number);
const times = arg("--times"), end = arg("--end"), theme = arg("--theme"), at = arg("--at"), sub = arg("--out");
const BG = arg("--bg") || path.join(os.homedir(), "Desktop", "vedio pointili 3", "clip1.mp4");
const url = (s, extra = "") => "file:///" + path.join(DIR, "typo-anim.html").replace(/\\/g, "/") + `?s=${s}&speed=${speed}${times ? `&times=${times}` : ""}${end ? `&end=${end}` : ""}${theme ? `&theme=${theme}` : ""}${extra}`;

await rm(WORK, { recursive: true, force: true });
await mkdir(WORK, { recursive: true });
await mkdir(KIT, { recursive: true });
const browser = await chromium.launch({ executablePath: CHROME, headless: true });
const done = [];
try {
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto(url(1), { waitUntil: "load" });
  const styles = await page.evaluate(() => window.STYLES);

  // one still of the footage for the previews (a few seconds in, the face in frame)
  const still = path.join(WORK, "bg.png");
  if (existsSync(BG)) await run(FF, ["-v", "error", "-y", "-ss", "1.2", "-i", BG, "-frames:v", "1", "-vf", "scale=1080:1920", still]);

  for (const [k, st] of styles.entries()) {
    const n = k + 1;
    if (only && !only.includes(n)) continue;
    await page.goto(url(n), { waitUntil: "load" });
    await page.evaluate(() => window.ready);
    const duration = await page.evaluate(() => window.DURATION);
    const name = `${n}-${st.id}`;

    if (preview) {
      const dir = path.join(DIR, ".work", "typo-preview"); await mkdir(dir, { recursive: true });
      for (const t of [0.4, 1.7, 2.7, 3.6, 4.6]) {
        await page.evaluate((t) => window.seek(t), t / speed);
        const f = path.join(WORK, `p-${n}-${t}.png`);
        await page.screenshot({ path: f, omitBackground: true });
        const outp = path.join(dir, `${name}-t${t}.png`);
        if (existsSync(still)) await run(FF, ["-v", "error", "-y", "-i", still, "-i", f, "-filter_complex", "overlay,scale=540:960", outp]);
      }
      console.log(`  ${name}: 5 stills`);
      continue;
    }

    const frames = path.join(WORK, name); await mkdir(frames, { recursive: true });
    const total = Math.round(duration * FPS);
    const t0 = Date.now();
    for (let f = 0; f < total; f++) {
      await page.evaluate((t) => window.seek(t), f / FPS);
      await page.screenshot({ path: path.join(frames, `${String(f + 1).padStart(4, "0")}.png`), omitBackground: true });
    }
    const seq = ["-framerate", String(FPS), "-i", path.join(frames, "%04d.png")];
    const alpha = path.join(KIT, `${name}-alpha.mov`), green = path.join(KIT, `${name}-green.mp4`), prev = path.join(KIT, `${name}-preview.mp4`);
    await run(FF, ["-v", "error", "-y", ...seq, "-c:v", "prores_ks", "-profile:v", "4", "-pix_fmt", "yuva444p10le", "-vendor", "apl0", alpha]);
    const h264 = ["-c:v", "libx264", "-preset", "slow", "-crf", "16", "-pix_fmt", "yuv420p", "-movflags", "+faststart", "-r", String(FPS)];
    await run(FF, ["-v", "error", "-y", "-f", "lavfi", "-i", `color=c=0x00FF00:s=1080x1920:r=${FPS}`, ...seq,
      "-filter_complex", "[0][1]overlay=shortest=1:format=auto,format=yuv420p", ...h264, green]);
    // the label for the all-options reel
    await page.goto(url(n, "&x=label"), { waitUntil: "load" });
    await page.evaluate(() => { document.body.classList.add("label"); return window.ready; });
    const label = path.join(WORK, `${name}-label.png`);
    await page.screenshot({ path: label, omitBackground: true });
    if (existsSync(BG)) {
      // over the footage, from second 1 of it (as long as the overlay)
      // with --at: from that second of the footage, with its sound, to check the timing
      await run(FF, ["-v", "error", "-y", "-ss", at ?? "1", "-t", String(duration), "-i", BG, ...seq,
        "-filter_complex", `[0:v]scale=1080:1920,fps=${FPS},setsar=1[b];[b][1]overlay=shortest=1,format=yuv420p`, ...(at ? ["-c:a", "aac", "-b:a", "192k"] : ["-an"]), ...h264, prev]);
      const lab = path.join(WORK, `${name}-labelled.mp4`);
      if (sub) { await rm(frames, { recursive: true, force: true }); console.log(`  ✓ ${name} — ${duration}s`); continue; }
      await run(FF, ["-v", "error", "-y", "-i", prev, "-i", label, "-filter_complex", "[0][1]overlay,format=yuv420p", ...h264, lab]);
      done.push(lab);
    }
    await rm(frames, { recursive: true, force: true });
    console.log(`  ✓ ${name} — ${duration}s, ${total} frames, ${((Date.now() - t0) / 1000).toFixed(0)}s`);
  }

  if (!preview && done.length > 1) {
    const list = path.join(WORK, "list.txt");
    await writeFile(list, done.map((f) => `file '${f.replace(/\\/g, "/")}'`).join("\n"));
    await run(FF, ["-v", "error", "-y", "-f", "concat", "-safe", "0", "-i", list, "-c", "copy", path.join(KIT, "ALL-OPTIONS-preview.mp4")]);
    console.log(`  ✓ ALL-OPTIONS-preview.mp4`);
  }
  console.log(`\n${preview ? path.join(DIR, ".work", "typo-preview") : KIT}`);
} finally {
  await browser.close();
}
