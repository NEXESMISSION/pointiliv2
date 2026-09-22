/**
 * The reel, taken apart: every b-roll card as a PNG and as a ready-to-drop clip,
 * plus the cleaned sound — for cutting by hand in CapCut / Premiere / Resolve.
 *
 *   node social/reel/kit.mjs                      → ~/Desktop/Pointili reel kit
 *   node social/reel/kit.mjs "D:/somewhere"       → there instead
 *   node social/reel/kit.mjs --src "C:/clip.mp4"  → a different camera file
 *
 * Every card is a real screen of the running app (social/carousels/screens),
 * never a drawing of one. The six numbered ones are the cut that was delivered;
 * the ones in "extra" are spares for when the words change.
 */
import { chromium } from "playwright-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { readFile, writeFile, mkdir, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const SCREENS = path.join(DIR, "..", "carousels", "screens");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";

const argv = process.argv.slice(2);
const srcFlag = argv.indexOf("--src");
const SRC = srcFlag >= 0 ? argv[srcFlag + 1] : path.join(os.homedir(), "Desktop", "Untitled.mp4");
const DEST = argv.find((a) => !a.startsWith("--") && a !== SRC) || path.join(os.homedir(), "Desktop", "Pointili reel kit");

/** Measured on the camera file: where the picture dies, and where it comes back. */
const A_ROLL_END = 26.79;
const TOTAL = 44.63;
const CARD_SECONDS = 2.97;

/** The six in the delivered cut, in the order the product works. */
const CUT = [
  { file: "01 - counter QR", screen: "owner-qr.png", cap: "الكود على الكونتوار", sub: "يتبدّل وحدو، ما يتسرقش", tone: "dark" },
  { file: "02 - stamp lands", screen: "stamp-success.png", cap: "الحريف يسكاني", sub: "والتامبون يطيح ساعة ساعة", tone: "light" },
  { file: "03 - card fills", screen: "customer-home-after.png", cap: "الكارط تتعمّر في تليفونو", sub: "بلا أبليكاسيون، بلا كرتون", tone: "dark" },
  { file: "04 - reward unlocked", screen: "card-unlocked.png", cap: "كمّل؟ الكادو يتحلّ", sub: "وهو يعرف علاش يرجع", tone: "light" },
  { file: "05 - code at the counter", screen: "reward-code.png", cap: "يورّي الكود عندك", sub: "وإنت تأكّد، وخلاص", tone: "dark" },
  { file: "06 - end card", type: "end", cap: "كارط الوفاء في تليفون الحريف", url: "pointidi.vercel.app" },
];

/** Spares: same look, other screens, for when the voice-over says something else. */
const EXTRA = [
  { file: "07 - the full card", screen: "customer-card-7.png", cap: "الكارط الكاملة", sub: "كل تامبون وين وصل", tone: "light" },
  { file: "08 - you set the rules", screen: "owner-loyalty.png", cap: "إنت تختار", sub: "قدّاش تامبون، وشنوّة الكادو", tone: "dark" },
  { file: "09 - who came back", screen: "owner-dashboard.png", cap: "تعرف شكون رجع", sub: "وقدّاش مرّة", tone: "light" },
  { file: "10 - your customers", screen: "owner-customers.png", cap: "حرفاءك الكل هوني", sub: "بلا كرّاس، بلا كرتون", tone: "dark" },
  { file: "11 - every stamp logged", screen: "owner-activity.png", cap: "كل تامبون مكتوب", sub: "ما تخسر حتى حاجة", tone: "light" },
  { file: "12 - no app to install", screen: "scan-needs-account.png", cap: "ما يحمّل حتى شي", sub: "كونت في عشر ثواني", tone: "dark" },
];

const dataUri = async (f) => `data:image/png;base64,${(await readFile(f)).toString("base64")}`;

async function renderAll(cards, outDir) {
  const browser = await chromium.launch({ executablePath: CHROME, headless: true });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1920 }, deviceScaleFactor: 1 });
  await page.goto("file:///" + path.join(DIR, "cards.html").replace(/\\/g, "/"));
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1200);

  for (const c of cards) {
    const payload = { ...c };
    if (c.screen) {
      const f = path.join(SCREENS, c.screen);
      if (!existsSync(f)) throw new Error(`missing screen: ${f}`);
      payload.screenData = await dataUri(f);
    }
    await page.evaluate((p) => window.renderCard(p), payload);
    await page.waitForTimeout(250);
    await page.screenshot({ path: path.join(outDir, `${c.file}.png`) });
    console.log(`  ✓ ${c.file}.png`);
  }
  await browser.close();
}

/** Each card also as a clip with the same slow push-in, to drop straight in. */
async function animate(cards, fromDir, outDir) {
  const frames = Math.round(CARD_SECONDS * 24);
  for (const c of cards) {
    await run(FF, [
      "-v", "error", "-y",
      "-loop", "1", "-framerate", "24", "-t", CARD_SECONDS.toFixed(3), "-i", path.join(fromDir, `${c.file}.png`),
      "-vf", `scale=2160:3840,zoompan=z='min(1.0+on/${frames * 14},1.07)':d=1:x='iw/2-(iw/zoom/2)':y='ih/2-(ih/zoom/2)':s=1080x1920:fps=24,format=yuv420p`,
      "-an", "-c:v", "libx264", "-preset", "medium", "-crf", "18", path.join(outDir, `${c.file}.mp4`),
    ]);
    console.log(`  ✓ ${c.file}.mp4`);
  }
}

const TIMELINE = `POINTILI — REEL KIT
===================

The camera file (Untitled.mp4), measured:

  0:00.00 → 0:26.79   you, talking. Good. Keep it.
  0:26.79 → 0:36.75   THE LENS WAS COVERED. Ten seconds of black, your voice still running.
  0:36.75 → 0:41.21   the table: ashtray, cigarette packs. Cut it — wrong appetite for a
                      café product, and tobacco in frame means Meta will not let you boost.
  0:41.21 → 0:44.63   the phone was sideways. Unusable.

So 18 of the 45 seconds have sound and no picture. That is what these cards fill.

THE CUT THAT WAS DELIVERED
--------------------------
Put your camera clip on the timeline, keep 0:00 → 0:26.79, then lay these end to
end over the rest of the audio. Each one is 2.97 s.

  0:26.79   01 - counter QR
  0:29.76   02 - stamp lands
  0:32.73   03 - card fills
  0:35.70   04 - reward unlocked
  0:38.67   05 - code at the counter
  0:41.64   06 - end card
  0:44.61   (end)

Use the files in "clips" if you want the slow push-in already baked in; use the
PNGs in "cards" if you would rather animate them yourself.

THE SOUND
---------
"audio/reel-audio-cleaned.wav" is your original take with the café pulled back:
a high-pass under the voice, a measured de-noise, less 300 Hz mud, more 3 kHz
presence, gentle levelling, and -14 LUFS, which is what Instagram plays back at.
Mute the camera's own audio track and use this one instead — it is exactly the
same length, so it lines up at 0:00.

Raw take: -15.3 LUFS, loudness range 0.7 LU (the room was as loud as you were).
This one:  -14.0 LUFS, voice in front.

WHAT GOES ON TOP  (overlays/ and sfx/)
-------------------------------------
Everything here has real alpha. Use the .mov in Premiere/Resolve/Final Cut, the
.webm in CapCut desktop, or the PNG sequence in frames/ anywhere else.

  0:00.0   hook-A|B|C.png        pick one, hold it 2.5 s, let it slide off
  0:00.0   progress-bar          the full 44.6 s, pinned to the very top of frame
  0:00.0   logo-bug.png          top-left, over the blurred shelf, until 0:26.8
  0:07.2   plus-one              his right palm opens into empty frame — land it there
  0:19.4   plus-one              he opens the same hand again, slightly lower
  0:21.0   (the framing jumps bigger here — put a cut or a flash on it so it
            reads as a decision and not as a bump)
  0:26.8   scan-sweep            over the QR on card 01, once
  0:30.6   tap-ripple            on card 02, where a thumb would be
  0:35.7   reward-burst          on card 04, the moment the card is finished
  0:41.6   riser + end card

  sfx:  cut-pop on every card cut · stamp-thud under each plus-one ·
        reward-chime with the burst · whoosh under the push-ins · riser into the end.
        Keep them all around -24 dB under the voice; you should feel them, not hear them.

WHAT IS STILL YOURS TO DO
-------------------------
1. Captions. Most people watch on mute. CapCut auto-captions in Arabic, 2-4 words
   a line, and keep them above the bottom ~420 px or Instagram's own UI covers them.
2. A hook in the first second and a half — one line of text over your face. Right
   now it opens mid-sentence.
3. Music, if you want it: from Instagram's own library, about 15 dB under your
   voice. Quiet enough that you only notice it when it stops.

NEXT TIME YOU FILM
------------------
Check the preview before you start talking (that is the whole problem here).
Lock the orientation. Then shoot four cutaways, ten seconds each, on purpose:
the QR on your counter, a customer scanning it, the card filling in their phone,
the moment you hand over the reward. Your own shop beats my screens every time.
`;

async function main() {
  const cards = path.join(DEST, "cards");
  const clips = path.join(DEST, "clips");
  const extraCards = path.join(DEST, "extra", "cards");
  const extraClips = path.join(DEST, "extra", "clips");
  const audio = path.join(DEST, "audio");
  // only the folders this script owns — overlays/ and sfx/ are another script's
  for (const d of [cards, clips, extraCards, extraClips, audio]) {
    await rm(d, { recursive: true, force: true });
    await mkdir(d, { recursive: true });
  }

  console.log("the six in the cut");
  await renderAll(CUT, cards);
  await animate(CUT, cards, clips);

  console.log("spares");
  await renderAll(EXTRA, extraCards);
  await animate(EXTRA, extraCards, extraClips);

  if (existsSync(SRC)) {
    console.log("sound");
    const CHAIN =
      "highpass=f=85,afftdn=nr=12:nf=-30:tn=1," +
      "equalizer=f=300:t=q:w=1.1:g=-2.5,equalizer=f=3200:t=q:w=1.3:g=3.5,equalizer=f=8000:t=h:w=0.7:g=2," +
      "acompressor=threshold=-20dB:ratio=3:attack=12:release=220:makeup=2,alimiter=limit=0.89," +
      "loudnorm=I=-14:TP=-1.5:LRA=11";
    await run(FF, ["-v", "error", "-y", "-i", SRC, "-af", CHAIN, "-ac", "2", "-ar", "48000", "-c:a", "pcm_s16le", path.join(audio, "reel-audio-cleaned.wav")]);
    await run(FF, ["-v", "error", "-y", "-i", path.join(audio, "reel-audio-cleaned.wav"), "-c:a", "aac", "-b:a", "192k", path.join(audio, "reel-audio-cleaned.m4a")]);
    console.log("  ✓ reel-audio-cleaned.wav + .m4a");
  } else {
    console.log(`  · no camera file at ${SRC} — skipping the sound`);
  }

  await writeFile(path.join(DEST, "TIMELINE.txt"), TIMELINE.replace(/\n/g, "\r\n"), "utf8");
  console.log(`\n${DEST}`);
}

await main();
