/**
 * Turns a filmed talking-head clip into a finished vertical reel.
 *
 *   node social/reel/build.mjs "C:/path/Untitled.mp4"
 *
 * What it does, and why:
 *  - The camera was covered from 26.8s to 36.8s and the last shot is sideways,
 *    so 18 of the 45 seconds have sound but no usable picture. Those seconds get
 *    b-roll cards built from the REAL app screens (social/carousels/screens),
 *    in the order the product actually works: the QR, the stamp, the card, the
 *    reward, then the name.
 *  - The sound is a café at one flat level with no silence anywhere. It gets a
 *    high-pass, a measured de-noise, a presence lift, gentle compression and
 *    loudnorm to -14 LUFS, which is what Instagram and TikTok play back at.
 *
 * Nothing is invented: every picture in the reel is a screen of the running app.
 */
import { chromium } from "playwright-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const SCREENS = path.join(DIR, "..", "carousels", "screens");
const WORK = path.join(DIR, ".work");
const SRC = process.argv[2] || path.join(os.homedir(), "Desktop", "Untitled.mp4");
const OUT = process.argv[3] || path.join(os.homedir(), "Desktop", "Pointili reel.mp4");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";

/** Where the picture dies and where it comes back — measured, not guessed. */
const A_ROLL_END = 26.79;
const TOTAL = 44.63;

/** The b-roll, in the order the product works. */
const CARDS = [
  { screen: "owner-qr.png", cap: "الكود على الكونتوار", sub: "يتبدّل وحدو، ما يتسرقش", tone: "dark" },
  { screen: "stamp-success.png", cap: "الحريف يسكاني", sub: "والتامبون يطيح ساعة ساعة", tone: "light" },
  // the home screen AFTER the stamp: card 2 already showed 8/10, so this one
  // cannot go back to 7/10 — the count only ever goes up
  { screen: "customer-home-after.png", cap: "الكارط تتعمّر في تليفونو", sub: "بلا أبليكاسيون، بلا كرتون", tone: "dark" },
  { screen: "card-unlocked.png", cap: "كمّل؟ الكادو يتحلّ", sub: "وهو يعرف علاش يرجع", tone: "light" },
  { screen: "reward-code.png", cap: "يورّي الكود عندك", sub: "وإنت تأكّد، وخلاص", tone: "dark" },
  { type: "end", cap: "كارط الوفاء في تليفون الحريف", url: "pointidi.vercel.app" },
];

const dataUri = async (f) => `data:image/png;base64,${(await readFile(f)).toString("base64")}`;

async function renderCards() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file:///" + path.join(DIR, "cards.html").replace(/\\/g, "/"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  for (const [i, c] of CARDS.entries()) {
    const payload = { ...c };
    if (c.screen) {
      const file = path.join(SCREENS, c.screen);
      if (!existsSync(file)) throw new Error(`missing screen: ${file}`);
      payload.screenData = await dataUri(file);
    }
    await page.evaluate((p) => window.renderCard(p), payload);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(WORK, `card-${i + 1}.png`) });
    console.log(`  ✓ card ${i + 1} — ${c.cap}`);
  }
  await browser.close();
}

/** One clip per card: a slow push-in, so a still never looks like a freeze. */
async function animate() {
  const each = (TOTAL - A_ROLL_END) / CARDS.length;
  const frames = Math.round(each * 24);
  for (let i = 0; i < CARDS.length; i++) {
    const src = path.join(WORK, `card-${i + 1}.png`);
    const out = path.join(WORK, `clip-${i + 1}.mp4`);
    await run(FF, [
      "-v", "error", "-y",
      "-loop", "1", "-framerate", "24", "-t", each.toFixed(3), "-i", src,
      "-vf", `scale=2160:3840,zoompan=z='min(1.0+on/${frames * 14},1.07)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=24,format=yuv420p`,
      "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", out,
    ]);
    console.log(`  ✓ clip ${i + 1} — ${each.toFixed(2)}s`);
  }
  return each;
}

async function main() {
  if (!existsSync(SRC)) throw new Error(`no such file: ${SRC}`);
  await rm(WORK, { recursive: true, force: true });
  await mkdir(WORK, { recursive: true });

  console.log("b-roll cards");
  await renderCards();
  console.log("push-in");
  await animate();

  console.log("the part that was filmed");
  await run(FF, [
    "-v", "error", "-y", "-i", SRC, "-t", String(A_ROLL_END),
    "-vf", "format=yuv420p", "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18",
    path.join(WORK, "clip-0.mp4"),
  ]);

  console.log("sound");
  // 1: high-pass under the voice · 2: measured de-noise · 3: less mud, more presence
  // 4: gentle levelling · 5: the platform's playback target
  const CHAIN =
    "highpass=f=85," +
    "afftdn=nr=12:nf=-30:tn=1," +
    "equalizer=f=300:t=q:w=1.1:g=-2.5," +
    "equalizer=f=3200:t=q:w=1.3:g=3.5," +
    "equalizer=f=8000:t=h:w=0.7:g=2," +
    "acompressor=threshold=-20dB:ratio=3:attack=12:release=220:makeup=2," +
    "alimiter=limit=0.89," +
    "loudnorm=I=-14:TP=-1.5:LRA=11";
  await run(FF, ["-v", "error", "-y", "-i", SRC, "-af", CHAIN, "-ac", "2", "-ar", "48000", "-c:a", "aac", "-b:a", "192k", path.join(WORK, "audio.m4a")]);

  console.log("assembly");
  const list = ["clip-0.mp4", ...CARDS.map((_, i) => `clip-${i + 1}.mp4`)];
  const concat = list.map((f) => `file '${f.replace(/'/g, "'\\''")}'`).join("\n");
  await (await import("node:fs/promises")).writeFile(path.join(WORK, "list.txt"), concat + "\n");
  await run(FF, [
    "-v", "error", "-y",
    "-f", "concat", "-safe", "0", "-i", path.join(WORK, "list.txt"),
    "-i", path.join(WORK, "audio.m4a"),
    "-map", "0:v", "-map", "1:a", "-shortest",
    "-c:v", "libx264", "-preset", "slow", "-crf", "19", "-pix_fmt", "yuv420p",
    "-c:a", "copy", "-movflags", "+faststart", OUT,
  ]);

  const { stdout } = await run("ffprobe", ["-v", "error", "-show_entries", "format=duration,size", "-of", "default=nw=1", OUT]);
  console.log(`\n${OUT}\n${stdout.trim()}`);
}

await main();
