/**
 * Renders the b-roll cards as animated clips instead of still pictures.
 *
 *   node social/reel/motion.mjs              → all 12, into the reel kit
 *   node social/reel/motion.mjs 01 04        → only those, by their number
 *   node social/reel/motion.mjs --reel       → also rebuild the finished reel
 *
 * Each frame is rendered by scrubbing motion.html's paused CSS animations to an
 * exact instant, so the easing is authored as CSS — real overshoot on the phone,
 * a light travelling across the glass — and every render is identical.
 *
 * Exports renderClip(), which build.mjs uses so the finished reel and the loose
 * clips are always the same animation.
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
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
export const FPS = 24;

/** The six of the cut, then the six spares — same list the kit uses. */
export const CARDS = [
  { file: "01 - counter QR", screen: "owner-qr.png", cap: "الكود على الكونتوار", sub: "يتبدّل وحدو، ما يتسرقش", tone: "dark" },
  { file: "02 - stamp lands", screen: "stamp-success.png", cap: "الحريف يسكاني", sub: "والتامبون يطيح ساعة ساعة", tone: "light" },
  { file: "03 - card fills", screen: "customer-home-after.png", cap: "الكارط تتعمّر في تليفونو", sub: "بلا أبليكاسيون، بلا كرتون", tone: "dark" },
  { file: "04 - reward unlocked", screen: "card-unlocked.png", cap: "كمّل؟ الكادو يتحلّ", sub: "وهو يعرف علاش يرجع", tone: "light" },
  { file: "05 - code at the counter", screen: "reward-code.png", cap: "يورّي الكود عندك", sub: "وإنت تأكّد، وخلاص", tone: "dark" },
  { file: "06 - end card", type: "end", cap: "كارط الفيدليتي في تليفون الحريف", url: "pointili.online" },
  { file: "07 - the full card", screen: "customer-card-7.png", cap: "الكارط الكاملة", sub: "كل تامبون وين وصل", tone: "light", extra: true },
  { file: "08 - you set the rules", screen: "owner-loyalty.png", cap: "إنت تختار", sub: "قدّاش تامبون، وشنوّة الكادو", tone: "dark", extra: true },
  { file: "09 - who came back", screen: "owner-dashboard.png", cap: "تعرف شكون رجع", sub: "وقدّاش مرّة", tone: "light", extra: true },
  { file: "10 - your customers", screen: "owner-customers.png", cap: "حرفاءك الكل هوني", sub: "بلا كرّاس، بلا كرتون", tone: "dark", extra: true },
  { file: "11 - every stamp logged", screen: "owner-activity.png", cap: "كل تامبون مكتوب", sub: "ما تخسر حتى حاجة", tone: "light", extra: true },
  { file: "12 - no app to install", screen: "scan-needs-account.png", cap: "ما يحمّل حتى شي", sub: "كونت في عشر ثواني", tone: "dark", extra: true },
];

const dataUri = async (f) => `data:image/png;base64,${(await readFile(f)).toString("base64")}`;

/** A page with motion.html loaded and its fonts settled, ready to be scrubbed. */
export async function openStage() {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file:///" + path.join(DIR, "motion.html").replace(/\\/g, "/"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1400);
  return { browser, page };
}

/**
 * One card, one clip. Frames go through a temp folder rather than a pipe because
 * a PNG sequence is the only thing that survives ffmpeg's colour handling
 * unchanged, and it costs a few seconds.
 */
export async function renderClip(page, card, outFile, seconds, workDir) {
  const frames = Math.round(seconds * FPS);
  const dir = path.join(workDir, card.file.replace(/[^\w-]+/g, "_"));
  await rm(dir, { recursive: true, force: true });
  await mkdir(dir, { recursive: true });

  const payload = { ...card, seconds };
  if (card.screen) {
    const f = path.join(SCREENS, card.screen);
    if (!existsSync(f)) throw new Error(`missing screen: ${f}`);
    payload.screenData = await dataUri(f);
  }
  await page.evaluate((p) => window.renderCard(p), payload);
  await page.waitForTimeout(200);

  for (let f = 0; f < frames; f++) {
    await page.evaluate((t) => window.seek(t), f / FPS);
    await page.screenshot({ path: path.join(dir, `${String(f + 1).padStart(4, "0")}.png`) });
  }

  await run(FF, [
    "-v", "error", "-y",
    "-framerate", String(FPS), "-i", path.join(dir, "%04d.png"),
    "-c:v", "libx264", "-preset", "slow", "-crf", "17", "-pix_fmt", "yuv420p",
    "-movflags", "+faststart", outFile,
  ]);
  await rm(dir, { recursive: true, force: true });
  return frames;
}

async function main() {
  const argv = process.argv.slice(2);
  const alsoReel = argv.includes("--reel");
  const picks = argv.filter((a) => /^\d+$/.test(a));
  const list = picks.length ? CARDS.filter((c) => picks.includes(c.file.slice(0, 2))) : CARDS;
  if (!list.length) throw new Error(`no card matches ${picks.join(", ")}`);

  const KIT = path.join(os.homedir(), "Desktop", "Pointili reel kit");
  const WORK = path.join(DIR, ".work", "motion");
  await mkdir(WORK, { recursive: true });
  await mkdir(path.join(KIT, "clips"), { recursive: true });
  await mkdir(path.join(KIT, "extra", "clips"), { recursive: true });

  // 2.97 s each is what the finished reel needs; the spares match so they swap in
  const SECONDS = 2.97;
  const { browser, page } = await openStage();
  try {
    for (const c of list) {
      const out = path.join(KIT, c.extra ? "extra" : "", "clips", `${c.file}.mp4`);
      const n = await renderClip(page, c, out, SECONDS, WORK);
      console.log(`  ✓ ${c.file} — ${n} frames`);
    }
  } finally {
    await browser.close();
  }

  console.log(`\n${KIT}`);
  if (alsoReel) {
    console.log("\nrebuilding the reel with the animated cards");
    await run("node", [path.join(DIR, "build.mjs")], { stdio: "inherit" }).catch((e) => {
      console.error(e.stdout || e.message);
    });
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(import.meta.filename)) await main();
