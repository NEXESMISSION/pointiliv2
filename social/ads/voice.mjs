/**
 * A voice for a film, from one take: `node voice.mjs f2 "C:/…/take.m4a"`.
 *
 * Record the film's lines (SCRIPTS.md) in one go — on a phone, or made by the voice studio
 * (tts.mjs) — a breath between lines is enough. This finds the take's pauses, hears each phrase
 * between them (Whisper large-v3-turbo, on this computer), finds each line by its words, and cuts
 * it on the pause around it into voice/<film>/<line>.wav, levelled. Then `node render.mjs f2`
 * films it again: every scene and subtitle moves to the real voice.
 *
 * Needs @huggingface/transformers (npm install, here). The first run downloads the model (~600 MB);
 * MODELS=<folder> to use one already downloaded.
 */
import { execFileSync } from "node:child_process";
import { copyFileSync, existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DIR = import.meta.dirname;
const [id, take] = process.argv.slice(2);
if (!id || !take || !existsSync(take)) {
  console.log('node voice.mjs <film> "<take.m4a|mp3|wav>"');
  process.exit(1);
}
const file = readdirSync(join(DIR, "films")).find((f) => f === `${id}.mjs` || f.startsWith(`${id}-`));
const film = (await import(pathToFileURL(join(DIR, "films", file)).href)).default;
const NAME = file.replace(/\.mjs$/, "");
const WINGET = "C:/Users/ayoub/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/ffmpeg.exe";
const FF = process.env.FFMPEG || (existsSync(WINGET) ? WINGET : "ffmpeg");

// ONNX on Windows needs the C++ runtime next to it; this PC has none system-wide: borrow an app's
const ORT = join(DIR, "node_modules", "onnxruntime-node", "bin", "napi-v3", "win32", "x64");
if (existsSync(ORT) && !existsSync(join(ORT, "msvcp140.dll"))) {
  const from = [join(process.env.LOCALAPPDATA ?? "", "Microsoft", "OneDrive"), join(process.env.LOCALAPPDATA ?? "", "CapCut", "Apps")]
    .flatMap((d) => (existsSync(d) ? readdirSync(d).map((v) => join(d, v)) : []))
    .find((d) => existsSync(join(d, "msvcp140.dll")) && existsSync(join(d, "vcruntime140_1.dll")));
  if (from) for (const f of ["vcruntime140.dll", "vcruntime140_1.dll", "msvcp140.dll", "msvcp140_1.dll"]) if (existsSync(join(from, f))) copyFileSync(join(from, f), join(ORT, f));
}
const { pipeline, env } = await import("@huggingface/transformers");
env.cacheDir = process.env.MODELS || join(DIR, ".cache", "models");

/* ---------- the take, and its pauses ---------- */

const SR = 16000;
const pcm = execFileSync(FF, ["-v", "error", "-i", take, "-f", "f32le", "-ac", "1", "-ar", String(SR), "pipe:1"], { maxBuffer: 1 << 30 });
const audio = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
const DUR = audio.length / SR;
// its loudness, 10 ms at a time; a pause is a run of frames under −30 dB from the loudest
const HOP = SR / 100;
const E = new Float32Array(Math.floor(audio.length / HOP));
for (let k = 0; k < E.length; k++) {
  let s = 0;
  for (let i = k * HOP; i < (k + 1) * HOP; i++) s += audio[i] * audio[i];
  E[k] = Math.sqrt(s / HOP);
}
const peak = E.reduce((a, b) => Math.max(a, b), 0);
const quiet = peak * 0.03;
const runs = [];
for (let k = 0; k < E.length; ) {
  if (E[k] >= quiet) { k++; continue; }
  const a = k;
  while (k < E.length && E[k] < quiet) k++;
  if (k - a >= 8) runs.push({ a: a / 100, z: k / 100 });
}
const center = (r) => (r.a + r.z) / 2;

/* ---------- hear it, a phrase at a time ---------- */

// split on the long pauses, each phrase heard alone: on long audio Whisper loses its times and
// invents words (once, «اشتركوا في القناة» after a take's last line, 12 s past its end)
const edges = [0, ...runs.filter((r) => r.z - r.a >= 0.32 && r.a > 0.05 && r.z < DUR - 0.05).map(center), DUR];
const chunks = [];
for (let i = 0; i < edges.length - 1; i++) {
  const p = { a: edges[i], z: edges[i + 1] };
  if (chunks.length && p.z - p.a < 0.35) chunks.at(-1).z = p.z; // a breath, not a phrase
  else chunks.push(p);
}
console.log(`take: ${DUR.toFixed(1)} s, ${chunks.length} phrases — listening…`);
const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-large-v3-turbo", { dtype: { encoder_model: "q4", decoder_model_merged: "q4" }, device: "cpu" });
for (const c of chunks) {
  const seg = audio.subarray(Math.floor(c.a * SR), Math.ceil(c.z * SR));
  const padded = new Float32Array(seg.length + SR * 0.3);
  padded.set(seg, Math.floor(SR * 0.15));
  c.text = ((await asr(padded, { language: "arabic", task: "transcribe" })).text ?? "").trim();
  console.log(`  heard [${c.a.toFixed(1)}–${c.z.toFixed(1)}] ${c.text}`);
}
// a phrase's words spread over it by their length
const words = chunks.flatMap((c, ci) => {
  const ws = norm(c.text).split(/\s+/).filter(Boolean);
  const total = ws.reduce((s, w) => s + w.length + 1, 0);
  let at = 0;
  return ws.map((w) => {
    const from = c.a + ((c.z - c.a) * at) / total;
    at += w.length + 1;
    return { w, a: from, z: c.a + ((c.z - c.a) * at) / total, c: ci };
  });
});

/* ---------- find each line in it ---------- */

function norm(s) {
  return s.replace(/[\u064B-\u065F\u0670\u0640]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
}
const lev = (a, b) => {
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length, 1);
};
// «Pointili» is said, and so heard, «بوانتيلي» (tts.mjs writes it so)
const script = film.lines.flatMap((l, li) => norm(l.say.replace(/[*~«»]/g, "").replace(/Pointili/g, "بوانتيلي")).split(/\s+/).filter(Boolean).map((w) => ({ w, li })));
// a global alignment of the script's words to the heard ones (gaps allowed both ways)
const n = script.length, m = words.length;
const S = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
for (let i = 1; i <= n; i++) { S[i][0] = -0.6 * i; B[i][0] = 1; }
for (let j = 1; j <= m; j++) { S[0][j] = -0.4 * j; B[0][j] = 2; }
for (let i = 1; i <= n; i++)
  for (let j = 1; j <= m; j++) {
    const sim = lev(script[i - 1].w, words[j - 1].w);
    const diag = S[i - 1][j - 1] + (sim >= 0.5 ? sim : -0.7);
    const up = S[i - 1][j] - 0.6, left = S[i][j - 1] - 0.4;
    [S[i][j], B[i][j]] = diag >= up && diag >= left ? [diag, 0] : up >= left ? [up, 1] : [left, 2];
  }
const hit = new Array(n).fill(null);
for (let i = n, j = m; i > 0 || j > 0; ) {
  if (i > 0 && j > 0 && B[i][j] === 0) { if (lev(script[i - 1].w, words[j - 1].w) >= 0.5) hit[i - 1] = j - 1; i--; j--; }
  else if (i > 0 && (j === 0 || B[i][j] === 1)) i--;
  else j--;
}
const lineWords = film.lines.map((_, li) => script.map((s, k) => (s.li === li && hit[k] != null ? hit[k] : null)).filter((x) => x != null));
const spans = film.lines.map((l, li) => {
  const idx = lineWords[li];
  const of = script.filter((s) => s.li === li).length;
  return idx.length ? { id: l.id, a: words[Math.min(...idx)].a, z: words[Math.max(...idx)].z, found: idx.length, of } : { id: l.id, a: null, z: null, found: 0, of };
});
// a line not heard sits between its neighbours
spans.forEach((s, i) => {
  if (s.a != null) return;
  const prev = spans.slice(0, i).reverse().find((x) => x.a != null), next = spans.slice(i + 1).find((x) => x.a != null);
  s.a = prev ? prev.z + 0.1 : 0;
  s.z = next ? next.a - 0.1 : DUR;
});

/* ---------- the cuts, on the pauses ---------- */

// where each boundary between two lines can fall:
//  - the lines' words heard in two phrases: on the pause between those phrases;
//  - in one phrase: on a pause inside it (the words' spread gives the guess).
// Then one choice for all of them, in order: near the guess, on the longest pause (a line break
// pauses longer than a comma).
const bounds = film.lines.slice(0, -1).map((_, i) => {
  const L = lineWords[i].length ? Math.max(...lineWords[i]) : null;
  const R = lineWords[i + 1].length ? Math.min(...lineWords[i + 1]) : null;
  let guess, cands;
  if (L != null && R != null && words[L].c !== words[R].c) {
    const ga = chunks[words[L].c].z, gb = chunks[words[R].c].a;
    guess = (ga + gb) / 2;
    cands = runs.filter((r) => r.z > Math.min(ga, gb) - 0.35 && r.a < Math.max(ga, gb) + 0.35);
  } else if (L != null && R != null) {
    const ch = chunks[words[L].c];
    guess = (words[L].z + words[R].a) / 2;
    cands = runs.filter((r) => center(r) > ch.a + 0.15 && center(r) < ch.z - 0.15);
  } else {
    guess = (spans[i].z + spans[i + 1].a) / 2;
    cands = runs.filter((r) => Math.abs(center(r) - guess) < 1.2);
  }
  return { guess, cands: cands.length ? cands : [{ a: guess, z: guess }] };
});
const cost = (b, r) => Math.abs(center(r) - b.guess) - 2.5 * Math.min(r.z - r.a, 0.6);
let paths = [{ t: 0, total: 0, cuts: [] }];
for (const b of bounds) {
  const next = b.cands
    .map((r) => {
      const t = center(r);
      const best = paths.filter((p) => t - p.t >= 0.25).reduce((x, p) => (!x || p.total < x.total ? p : x), null);
      return best && { t, total: best.total + cost(b, r), cuts: [...best.cuts, t] };
    })
    .filter(Boolean);
  // nothing fits after the previous cut: a short step on, and a price for it
  paths = next.length ? next : paths.map((p) => ({ t: p.t + 0.3, total: p.total + 5, cuts: [...p.cuts, p.t + 0.3] }));
}
const cuts = [0, ...paths.reduce((x, p) => (p.total < x.total ? p : x)).cuts.map((t) => Math.min(t, DUR - 0.3)), DUR];
// each line: its stretch between two cuts, the silence at both ends trimmed (a breath kept)
const pieces = spans.map((s, i) => {
  const lo = Math.min(cuts[i], DUR - 0.3), hi = Math.max(cuts[i + 1], lo + 0.3);
  let a = Math.round(lo * 100), z = Math.round(hi * 100);
  while (a < z && E[a] < quiet) a++;
  while (z > a && E[z - 1] < quiet) z--;
  if (z - a < 10) return { ...s, a: lo, z: hi }; // all quiet: keep the whole stretch
  return { ...s, a: Math.max(lo, a / 100 - 0.06), z: Math.min(hi, z / 100 + 0.12) };
});

/* ---------- cut, clean, level ---------- */

const OUT = join(DIR, "voice", NAME);
mkdirSync(OUT, { recursive: true });
// a studio voice needs no de-noising: only the low rumble off, then one level for every line
const CHAIN = "highpass=f=70,acompressor=threshold=-20dB:ratio=2.5:attack=10:release=200:makeup=1.5,loudnorm=I=-16:TP=-1.5:LRA=7";
for (const s of pieces) {
  execFileSync(FF, ["-v", "error", "-y", "-ss", s.a.toFixed(3), "-to", s.z.toFixed(3), "-i", take, "-af", `${CHAIN},afade=t=in:d=0.02,areverse,afade=t=in:d=0.05,areverse`, "-ar", "48000", "-ac", "1", join(OUT, `${s.id}.wav`)]);
  console.log(`  ${s.id.padEnd(4)} ${s.a.toFixed(2).padStart(6)} → ${s.z.toFixed(2).padStart(6)}  ${(s.z - s.a).toFixed(2)} s  (${s.found}/${s.of} words heard)${s.found / s.of < 0.5 ? "  ← check this one" : ""}`);
}
writeFileSync(join(OUT, "heard.json"), JSON.stringify({ phrases: chunks, pieces }, null, 1));
console.log(`\n${spans.length} lines in ${OUT}\nnow: node render.mjs ${id}`);
