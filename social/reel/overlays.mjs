/**
 * The things that go ON TOP of the reel: transparent animated elements and the
 * sound cues, for dropping onto a timeline by hand.
 *
 *   node social/reel/overlays.mjs                 → ~/Desktop/Pointili reel kit/overlays
 *   node social/reel/overlays.mjs "D:/somewhere"
 *
 * Every element ships three ways, because every editor wants a different one:
 *   frames/   a PNG sequence with real alpha   (Resolve, Premiere, After Effects)
 *   *.mov     ProRes 4444 with alpha           (Premiere, Final Cut, Resolve)
 *   *.webm    VP9 with alpha                   (CapCut desktop, web)
 *
 * The sounds are synthesised here rather than downloaded, so they are ours and
 * there is no licence attached to any of them.
 */
import { chromium } from "playwright-core";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { mkdir, rm, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const SCREENS = path.join(DIR, "..", "carousels", "screens");
const DEST = process.argv[2] || path.join(os.homedir(), "Desktop", "Pointili reel kit", "overlays");
const CHROME = process.env.CHROME_PATH || "C:/Program Files/Google/Chrome/Application/chrome.exe";
const FF = process.env.FFMPEG || "ffmpeg";
const FPS = 24;

/**
 * Each element is a function of t (0..1) returning the HTML for that frame.
 * Keeping it a pure function of t means the motion is written down, not tweened
 * by hand in an editor, and it renders the same every time.
 */
const ease = {
  // overshoots once and settles: how the app's own +1 lands
  back: (t) => { const c = 1.70158 + 1; return 1 + (c + 1) * Math.pow(t - 1, 3) + c * Math.pow(t - 1, 2); },
  out: (t) => 1 - Math.pow(1 - t, 3),
  in: (t) => t * t * t,
};

const ELEMENTS = {
  /** The app's own "+1 تامبون" pill, landing with a bounce. Put it over an open palm. */
  "plus-one": {
    w: 620, h: 360, seconds: 1.6,
    html: (t) => {
      const inT = Math.min(1, t / 0.22);
      const outT = Math.max(0, (t - 0.78) / 0.22);
      const s = 0.4 + 0.6 * ease.back(inT);
      const y = 60 * (1 - ease.out(inT)) - 40 * ease.in(outT);
      const o = Math.min(1, inT * 1.6) * (1 - ease.in(outT));
      const ring = Math.min(1, t / 0.45);
      return `
        <div style="position:absolute;inset:0;display:grid;place-items:center">
          <div style="position:absolute;width:${180 + 260 * ease.out(ring)}px;height:${180 + 260 * ease.out(ring)}px;
                      border-radius:50%;border:6px solid rgba(34,197,94,${0.55 * (1 - ring) * o});"></div>
          <div style="transform:translateY(${y}px) scale(${s});opacity:${o};
                      display:flex;align-items:center;gap:20px;background:#17B65A;color:#fff;
                      padding:26px 46px;border-radius:999px;font:700 64px 'IBM Plex Sans Arabic',sans-serif;
                      box-shadow:0 26px 60px -18px rgba(8,80,40,0.75);white-space:nowrap">
            <span style="font-family:Inter,sans-serif;font-size:70px">+1</span> تامبون
          </div>
        </div>`;
    },
  },

  /** A soft bar sweeping down a QR once — "it is being read". Sits over card 01. */
  "scan-sweep": {
    w: 620, h: 620, seconds: 1.1,
    html: (t) => {
      const p = ease.out(Math.min(1, t / 0.8));
      const o = t < 0.8 ? 1 : 1 - (t - 0.8) / 0.2;
      return `
        <div style="position:absolute;inset:0;opacity:${o}">
          <div style="position:absolute;left:0;right:0;top:${p * 100}%;height:10px;
                      background:linear-gradient(90deg,transparent,#8B5CF6,#C4B5FD,#8B5CF6,transparent);
                      box-shadow:0 0 40px 10px rgba(139,92,246,0.55);transform:translateY(-50%)"></div>
          <div style="position:absolute;left:0;right:0;top:0;height:${p * 100}%;
                      background:linear-gradient(180deg,rgba(139,92,246,0) 0%,rgba(139,92,246,0.14) 100%)"></div>
        </div>`;
    },
  },

  /** A thumb tap: the ripple every phone makes. Drop it where a finger would be. */
  "tap-ripple": {
    w: 420, h: 420, seconds: 0.9,
    html: (t) => {
      const p = ease.out(Math.min(1, t / 0.75));
      const o = (1 - p) * (t < 0.08 ? t / 0.08 : 1);
      return `
        <div style="position:absolute;inset:0;display:grid;place-items:center">
          <div style="width:${90 + 250 * p}px;height:${90 + 250 * p}px;border-radius:50%;
                      border:5px solid rgba(255,255,255,${0.9 * o});background:rgba(255,255,255,${0.16 * o})"></div>
          <div style="position:absolute;width:76px;height:76px;border-radius:50%;background:rgba(255,255,255,${0.55 * (1 - p)})"></div>
        </div>`;
    },
  },

  /** The celebration the app itself fires when a card is finished. */
  "reward-burst": {
    w: 900, h: 900, seconds: 1.8,
    html: (t) => {
      const N = 26;
      const bits = Array.from({ length: N }, (_, i) => {
        // deterministic scatter: no randomness, so re-renders are identical
        const a = (i / N) * Math.PI * 2 + (i % 3) * 0.28;
        const dist = (0.55 + ((i * 37) % 45) / 100) * 380 * ease.out(Math.min(1, t / 0.75));
        const x = Math.cos(a) * dist;
        const y = Math.sin(a) * dist + 160 * ease.in(t) * (t > 0.4 ? 1 : 0);
        const col = ["#FFD166", "#F94F6D", "#6535E0", "#17B65A", "#4CC9F0"][i % 5];
        const o = t < 0.6 ? 1 : Math.max(0, 1 - (t - 0.6) / 0.4);
        const rot = i * 47 + t * 520;
        const w = 16 + (i % 4) * 7;
        return `<div style="position:absolute;left:50%;top:50%;width:${w}px;height:${w * 1.7}px;background:${col};
                  border-radius:4px;opacity:${o};transform:translate(-50%,-50%) translate(${x}px,${y}px) rotate(${rot}deg)"></div>`;
      }).join("");
      const ring = Math.min(1, t / 0.3);
      return `<div style="position:absolute;inset:0">
          <div style="position:absolute;left:50%;top:50%;width:${120 + 460 * ease.out(ring)}px;height:${120 + 460 * ease.out(ring)}px;
                      margin:-${(120 + 460 * ease.out(ring)) / 2}px 0 0 -${(120 + 460 * ease.out(ring)) / 2}px;border-radius:50%;
                      border:8px solid rgba(255,209,102,${0.75 * (1 - ring)})"></div>${bits}</div>`;
    },
  },

  /** A thin bar across the top that fills over the whole reel: how much is left. */
  "progress-bar": {
    w: 1080, h: 14, seconds: 44.63,
    html: (t) => `
      <div style="position:absolute;inset:0;background:rgba(255,255,255,0.18)">
        <div style="position:absolute;left:0;top:0;bottom:0;width:${t * 100}%;
                    background:linear-gradient(90deg,#8B5CF6,#C4B5FD)"></div>
      </div>`,
  },
};

/** Stills: the corner mark, and three ways to open the reel. */
const STILLS = {
  "logo-bug": { w: 420, h: 130, html: () => `
      <div style="position:absolute;inset:0;display:flex;align-items:center;gap:20px;
                  background:rgba(12,8,30,0.42);backdrop-filter:blur(8px);border-radius:999px;padding:0 34px;
                  font:700 46px Inter,sans-serif;color:#fff">
        <span style="width:58px;height:58px;border-radius:18px;background:#6535E0;display:grid;place-items:center">
          <svg viewBox="0 0 24 24" width="32" height="32" fill="none">
            <rect x="2.5" y="6" width="15" height="12" rx="3.2" fill="#fff"/>
            <rect x="6.5" y="3" width="15" height="12" rx="3.2" fill="#fff" opacity="0.55"/>
            <path d="M13.6 8.2l.9 2.1 2.1.9-2.1.9-.9 2.1-.9-2.1-2.1-.9 2.1-.9z" fill="#6535E0"/>
          </svg>
        </span> Pointili
      </div>` },

  "hook-A": { w: 1080, h: 420, html: () => hook("الحريف اللي جاك اليوم…", "باش يرجع غدوة؟") },
  "hook-B": { w: 1080, h: 420, html: () => hook("كارط الكرتون تضيع.", "التليفون ما يضيعش.") },
  "hook-C": { w: 1080, h: 420, html: () => hook("محلّك يخدم.", "أما الحرفاء يرجعو؟") },
};

const hook = (l1, l2) => `
  <div style="position:absolute;inset:0;display:flex;flex-direction:column;justify-content:center;
              align-items:center;gap:14px;text-align:center;font-family:'IBM Plex Sans Arabic',sans-serif">
    <div style="background:rgba(12,8,30,0.62);color:#fff;font-size:76px;font-weight:700;line-height:1.25;
                padding:16px 40px;border-radius:24px;box-shadow:0 20px 50px -24px rgba(0,0,0,0.8)">${l1}</div>
    <div style="background:#6535E0;color:#fff;font-size:76px;font-weight:700;line-height:1.25;
                padding:16px 40px;border-radius:24px;box-shadow:0 20px 50px -24px rgba(60,20,140,0.9)">${l2}</div>
  </div>`;

const PAGE = `<!doctype html><html dir="rtl"><head><meta charset="utf-8">
<link href="https://fonts.googleapis.com/css2?family=IBM+Plex+Sans+Arabic:wght@400;600;700&family=Inter:wght@600;700;800&display=swap" rel="stylesheet">
<style>*{margin:0;padding:0;box-sizing:border-box}html,body{background:transparent}
#stage{position:relative;overflow:hidden}</style></head>
<body><div id="stage"></div></body></html>`;

async function renderElement(page, name, el, outDir) {
  await mkdir(path.join(outDir, "frames", name), { recursive: true });
  const total = Math.max(1, Math.round(el.seconds * FPS));
  await page.setViewportSize({ width: el.w, height: el.h });
  for (let f = 0; f < total; f++) {
    const t = total === 1 ? 0 : f / (total - 1);
    await page.evaluate(({ w, h, html }) => {
      const s = document.getElementById("stage");
      s.style.width = w + "px";
      s.style.height = h + "px";
      s.innerHTML = html;
    }, { w: el.w, h: el.h, html: el.html(t) });
    await page.screenshot({ path: path.join(outDir, "frames", name, `${String(f + 1).padStart(4, "0")}.png`), omitBackground: true });
  }
  console.log(`  ✓ ${name} — ${total} frames`);

  const seq = path.join(outDir, "frames", name, "%04d.png");
  // ProRes 4444 keeps the alpha for the desktop editors
  await run(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", seq,
    "-c:v", "prores_ks", "-profile:v", "4444", "-pix_fmt", "yuva444p10le", path.join(outDir, `${name}.mov`)]);
  // VP9 keeps it for CapCut desktop and the web
  await run(FF, ["-v", "error", "-y", "-framerate", String(FPS), "-i", seq,
    "-c:v", "libvpx-vp9", "-pix_fmt", "yuva420p", "-b:v", "0", "-crf", "22", path.join(outDir, `${name}.webm`)]);
}

/**
 * The cues, built from oscillators and noise. Short, dry, and quiet enough to
 * sit under a voice — a reel does not need a sound effect it can hear thinking.
 */
const SOUNDS = {
  // a soft UI pop for every cut between cards
  "cut-pop": "sine=frequency=760:duration=0.09,volume=0.55,afade=t=out:st=0.012:d=0.078:curve=exp,highpass=f=220",
  // the stamp landing: a low thud with a click on top
  "stamp-thud": "sine=frequency=150:duration=0.22,volume=0.85,afade=t=out:st=0:d=0.22:curve=exp",
  // the reward: a small major triad, nothing triumphant
  "reward-chime": null,
  // air under a push-in
  "whoosh": "anoisesrc=d=0.7:c=pink:a=0.5,highpass=f=300,lowpass=f=4200,afade=t=in:st=0:d=0.35:curve=exp,afade=t=out:st=0.35:d=0.35",
  // a lift into the end card
  "riser": "anoisesrc=d=1.4:c=white:a=0.28,highpass=f=600,lowpass=f=9000,afade=t=in:st=0:d=1.4:curve=log",
};

async function renderSounds(outDir) {
  await mkdir(outDir, { recursive: true });
  for (const [name, src] of Object.entries(SOUNDS)) {
    const out = path.join(outDir, `${name}.wav`);
    if (name === "reward-chime") {
      await run(FF, ["-v", "error", "-y",
        "-f", "lavfi", "-i", "sine=frequency=523.25:duration=0.9",
        "-f", "lavfi", "-i", "sine=frequency=659.25:duration=0.9",
        "-f", "lavfi", "-i", "sine=frequency=783.99:duration=0.9",
        "-filter_complex",
        "[0]adelay=0|0,volume=0.5[a];[1]adelay=70|70,volume=0.42[b];[2]adelay=140|140,volume=0.36[c];" +
        "[a][b][c]amix=inputs=3:normalize=0,afade=t=out:st=0.18:d=0.72:curve=exp,highpass=f=300",
        "-ar", "48000", "-ac", "2", out]);
    } else {
      await run(FF, ["-v", "error", "-y", "-f", "lavfi", "-i", src, "-ar", "48000", "-ac", "2", out]);
    }
    console.log(`  ✓ ${name}.wav`);
  }
}

async function main() {
  await rm(DEST, { recursive: true, force: true });
  await mkdir(DEST, { recursive: true });

  const browser = await chromium.launch({ executablePath: CHROME, headless: true, args: ["--force-color-profile=srgb"] });
  const page = await browser.newPage({ viewport: { width: 1080, height: 1080 }, deviceScaleFactor: 1 });
  await page.setContent(PAGE);
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(1500);

  console.log("moving elements");
  for (const [name, el] of Object.entries(ELEMENTS)) await renderElement(page, name, el, DEST);

  console.log("stills");
  for (const [name, el] of Object.entries(STILLS)) {
    await page.setViewportSize({ width: el.w, height: el.h });
    await page.evaluate(({ w, h, html }) => {
      const s = document.getElementById("stage");
      s.style.width = w + "px"; s.style.height = h + "px"; s.innerHTML = html;
    }, { w: el.w, h: el.h, html: el.html() });
    await page.screenshot({ path: path.join(DEST, `${name}.png`), omitBackground: true });
    console.log(`  ✓ ${name}.png`);
  }
  await browser.close();

  console.log("sound cues");
  await renderSounds(path.join(DEST, "..", "sfx"));

  console.log(`\n${DEST}`);
}

await main();
