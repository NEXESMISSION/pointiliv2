/**
 * Turns what Pointili Captions exports into something DaVinci Resolve opens.
 *
 *   node social/reel/to-resolve.mjs <folder of PNGs>      → ProRes 4444, with alpha
 *   node social/reel/to-resolve.mjs <video file>          → ProRes 422, constant frame rate
 *   node social/reel/to-resolve.mjs <input> <output.mov>  → name it yourself
 *   ... --fps 30                                          → only for a PNG folder
 *
 * ── WHY THIS EXISTS ───────────────────────────────────────────────────────
 * A browser records with MediaRecorder, and MediaRecorder cannot give Resolve
 * what it needs, three ways over:
 *
 *   · VARIABLE FRAME RATE. Frames are stamped with the wall clock, so a file
 *     declares 29.97 and actually runs at 30.03. Resolve refuses VFR rather
 *     than guessing, which is the import that "does nothing".
 *   · NO ALPHA. Asking Chrome for a transparent recording gives back yuv420p —
 *     the transparency is flattened onto black on the way out. Only a PNG
 *     sequence keeps it, which is why the app exports one.
 *   · WEBM. Resolve on Windows does not read Matroska at all, at any setting.
 *
 * ProRes is the answer to all three: constant frame rate, a real alpha channel
 * in 4444, and a codec Resolve treats as native. The files are big; they are
 * meant to be dropped on a timeline and deleted afterwards.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { existsSync, readdirSync, readFileSync, statSync } from "node:fs";
import path from "node:path";

const run = promisify(execFile);
const FF = process.env.FFMPEG || "ffmpeg";

const argv = process.argv.slice(2);
const flags = {};
const args = [];
for (let i = 0; i < argv.length; i++) {
  if (argv[i].startsWith("--")) flags[argv[i].slice(2)] = argv[++i];
  else args.push(argv[i]);
}

const input = args[0];
if (!input || !existsSync(input)) {
  console.error("usage: node social/reel/to-resolve.mjs <png folder | video file> [out.mov] [--fps 30]");
  process.exit(2);
}

const isFolder = statSync(input).isDirectory();
const out = args[1] || defaultOut(input, isFolder);

if (isFolder) await fromSequence();
else await fromVideo();

/** A folder of transparent PNGs → ProRes 4444, alpha intact. */
async function fromSequence() {
  const pngs = readdirSync(input).filter((f) => f.toLowerCase().endsWith(".png")).sort();
  if (!pngs.length) throw new Error(`no PNGs in ${input}`);

  /* The app leaves this next to the frames so the frame rate is not a guess. */
  let fps = Number(flags.fps) || 0;
  const meta = path.join(input, "pointili-sequence.json");
  if (!fps && existsSync(meta)) fps = Number(JSON.parse(readFileSync(meta, "utf8")).fps) || 0;
  if (!fps) fps = 30;

  /* %04d needs the numbering the app writes; a stray file would break the
     pattern, so the glob form is used instead and the sort above is the order. */
  await run(FF, [
    "-y",
    "-framerate", String(fps),
    "-pattern_type", "sequence",
    "-start_number", String(firstNumber(pngs[0])),
    "-i", path.join(input, numberPattern(pngs[0])),
    "-c:v", "prores_ks",
    "-profile:v", "4444",
    "-pix_fmt", "yuva444p10le",
    "-alpha_bits", "16",
    "-vendor", "apl0",
    "-r", String(fps),
    out,
  ]);
  console.log(`${pngs.length} frames at ${fps} fps  →  ${out}`);
  console.log("ProRes 4444 with alpha. Drop it on the timeline: it carries its own transparency, no keying.");
}

/** A recording → ProRes 422 at a constant frame rate Resolve will accept. */
async function fromVideo() {
  const fps = Number(flags.fps) || (await sourceFps()) || 30;
  await run(FF, [
    "-y",
    "-i", input,
    "-vf", `fps=${fps},format=yuv422p10le`,
    "-c:v", "prores_ks",
    "-profile:v", "3",
    "-vendor", "apl0",
    "-r", String(fps),
    "-an",
    out,
  ]);
  console.log(`→ ${out}`);
  console.log(`ProRes 422 at a constant ${fps} fps. No alpha — if it was rendered on green, key it in Resolve.`);
}

/** The rate the source really ran at, rounded to something sane. */
async function sourceFps() {
  try {
    const { stdout } = await run("ffprobe", ["-v", "error", "-select_streams", "v:0", "-show_entries", "stream=avg_frame_rate", "-of", "default=nw=1:nk=1", input]);
    const [a, b] = String(stdout).trim().split("/").map(Number);
    const raw = b ? a / b : a;
    return [24, 25, 30, 50, 60].find((c) => Math.abs(c - raw) < 1.2) || Math.round(raw) || 0;
  } catch {
    return 0;
  }
}

function defaultOut(inp, folder) {
  const base = folder ? path.basename(path.resolve(inp)) : path.basename(inp, path.extname(inp));
  const dir = folder ? path.dirname(path.resolve(inp)) : path.dirname(inp);
  return path.join(dir, `${base} (resolve).mov`);
}

/** "cap_0001.png" → "cap_%04d.png", so ffmpeg reads the whole run. */
function numberPattern(name) {
  const m = /^(.*?)(\d+)(\.png)$/i.exec(name);
  if (!m) throw new Error(`cannot read a frame number from ${name}`);
  return `${m[1]}%0${m[2].length}d${m[3]}`;
}

function firstNumber(name) {
  const m = /(\d+)\.png$/i.exec(name);
  return m ? Number(m[1]) : 1;
}
