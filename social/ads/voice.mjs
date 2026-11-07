/**
 * A voice for a film, from one take: `node voice.mjs f2 "C:/…/take.m4a"`.
 *
 * Record the film's lines (SCRIPTS.md) in one go, on any phone — a breath between lines is
 * enough. This hears the take (Whisper large-v3-turbo, on this computer), finds each line in it
 * by its words, and cuts it into voice/<film>/<line>.wav, cleaned and levelled. Then
 * `node render.mjs f2` films it again: every scene and subtitle moves to the real voice.
 *
 * Needs @huggingface/transformers (npm install, here). The first run downloads the model (~600 MB).
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

/* ---------- hear the take ---------- */

const SR = 16000;
const pcm = execFileSync(FF, ["-v", "error", "-i", take, "-f", "f32le", "-ac", "1", "-ar", String(SR), "pipe:1"], { maxBuffer: 1 << 30 });
const audio = new Float32Array(pcm.buffer, pcm.byteOffset, pcm.byteLength / 4);
console.log(`take: ${(audio.length / SR).toFixed(1)} s — listening…`);
const asr = await pipeline("automatic-speech-recognition", "onnx-community/whisper-large-v3-turbo", { dtype: { encoder_model: "q4", decoder_model_merged: "q4" }, device: "cpu" });
// phrase by phrase (this export has no word times): each phrase's words spread over its span by
// their length — a speaker breathes between lines, so a line's edges fall on a phrase's edges
const heard = await asr(audio, { language: "arabic", task: "transcribe", return_timestamps: true, chunk_length_s: 30, stride_length_s: 5 });
const words = (heard.chunks ?? []).flatMap((c) => {
  const a = c.timestamp[0], z = c.timestamp[1] ?? a + 1;
  const ws = norm(c.text).split(/\s+/).filter(Boolean);
  const total = ws.reduce((s, w) => s + w.length + 1, 0);
  let at = 0;
  return ws.map((w) => {
    const from = a + ((z - a) * at) / total;
    at += w.length + 1;
    return { w, a: from, z: a + ((z - a) * at) / total };
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
const script = film.lines.flatMap((l, li) => norm(l.say.replace(/[*~«»]/g, "")).split(/\s+/).filter(Boolean).map((w) => ({ w, li })));
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
const spans = film.lines.map((l, li) => {
  const idx = script.map((s, k) => (s.li === li && hit[k] != null ? hit[k] : null)).filter((x) => x != null);
  return idx.length ? { id: l.id, a: words[Math.min(...idx)].a, z: words[Math.max(...idx)].z, found: idx.length, of: script.filter((s) => s.li === li).length } : { id: l.id, a: null, z: null, found: 0, of: script.filter((s) => s.li === li).length };
});
// a line not heard sits between its neighbours
spans.forEach((s, i) => {
  if (s.a != null) return;
  const prev = spans.slice(0, i).reverse().find((x) => x.a != null), next = spans.slice(i + 1).find((x) => x.a != null);
  s.a = prev ? prev.z + 0.1 : 0;
  s.z = next ? next.a - 0.1 : audio.length / SR;
});

/* ---------- cut, clean, level ---------- */

const OUT = join(DIR, "voice", NAME);
mkdirSync(OUT, { recursive: true });
const CHAIN = "highpass=f=80,afftdn=nr=10:nf=-32:tn=1,equalizer=f=300:t=q:w=1.1:g=-2,equalizer=f=3200:t=q:w=1.3:g=3,acompressor=threshold=-20dB:ratio=3:attack=10:release=200:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=7";
for (const s of spans) {
  const a = Math.max(0, s.a - 0.08), z = s.z + 0.14;
  execFileSync(FF, ["-v", "error", "-y", "-ss", a.toFixed(3), "-to", z.toFixed(3), "-i", take, "-af", `${CHAIN},afade=t=in:d=0.03,areverse,afade=t=in:d=0.06,areverse`, "-ar", "48000", "-ac", "1", join(OUT, `${s.id}.wav`)]);
  console.log(`  ${s.id.padEnd(4)} ${a.toFixed(2).padStart(6)} → ${z.toFixed(2).padStart(6)}  (${s.found}/${s.of} words heard)${s.found / s.of < 0.5 ? "  ← check this one" : ""}`);
}
writeFileSync(join(OUT, "heard.json"), JSON.stringify({ text: heard.text, spans }, null, 1));
console.log(`\n${spans.length} lines in ${OUT}\nnow: node render.mjs ${id}`);
