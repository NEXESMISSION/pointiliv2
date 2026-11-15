/**
 * A film's voice from one human take, kept whole: `node take.mjs f6 "C:/…/6.wav"`.
 *
 * voice.mjs cuts a take into one file per line and the film spaces them out again — right for a
 * studio voice that pauses at every line. Somebody reading the script in one breath does not:
 * cut there and the voice stutters. So this keeps the take as it was said and only finds WHEN each
 * line, and each word, is said in it:
 *
 *   0. what voice/<film>/edit.json says to cut goes first — a phrase said twice, a slip:
 *      { "cut": [[from, to, "why"], …] }, seconds in the recording as it was given;
 *   1. the take is heard word by word (hear.py: Whisper with the time of every word, the script
 *      whispered to it first);
 *   2. the script's words are matched to the heard ones, in order (a word not heard sits between
 *      its neighbours);
 *   3. each line's edges are moved onto the quiet around them (the pause, or the dip between two
 *      words);
 *   4. the voice is cleaned once, as a whole (rumble off, a light compressor, levelled to
 *      −16 LUFS, peaks held under −1.5 dB), its silent ends cut, a pause longer than PAUSE (0.6 s)
 *      shortened to it — and a pause made at least as long as the `hold` a line of the film asks
 *      for after it ({ id, say, hold: 0.4 }: its scene needs that long before the next line).
 *
 * It writes voice/<film>/take.wav (the voice) and take.json (when every line and word is said in
 * it). `node retime.mjs f6` then moves the film's scenes to this voice, and `node render.mjs f6`
 * films it: scenes and subtitles follow the real voice, word by word where a film shows its words
 * one at a time.
 *
 *   node take.mjs f6 "C:/…/6.wav" --check    only say what it found (nothing written)
 *   PAUSE=0.45 node take.mjs …               another longest pause
 *
 * The lines must be written the way they are said: where the take says another word, change the
 * film's line (relisten.py hears a stretch again by itself, which.py tells two wordings apart).
 *
 * Needs ffmpeg, and Python with faster-whisper (pip install faster-whisper) for hear.py.
 */
import { execFileSync, spawnSync } from "node:child_process";
import { createHash } from "node:crypto";
import { existsSync, mkdirSync, readdirSync, readFileSync, rmSync, statSync, writeFileSync } from "node:fs";
import { basename, dirname, isAbsolute, join } from "node:path";
import { pathToFileURL } from "node:url";
import { match, norm, shown, spoken, spread } from "./engine/words.mjs";

const DIR = import.meta.dirname;
const argv = process.argv.slice(2);
const CHECK = argv.includes("--check");
const [id, source] = argv.filter((a) => !a.startsWith("--"));
if (!id || !source || !existsSync(source)) {
  console.log('node take.mjs <film> "<take.wav|m4a|mp3>" [--check]');
  process.exit(1);
}
const file = readdirSync(join(DIR, "films")).find((f) => f === `${id}.mjs` || f.startsWith(`${id}-`));
if (!file) throw new Error(`no film «${id}» in films/`);
const film = (await import(pathToFileURL(join(DIR, "films", file)).href)).default;
const NAME = file.replace(/\.mjs$/, "");
const FF = process.env.FFMPEG || "ffmpeg";
const PY = process.env.PYTHON || "python";
const SR = 48000;
const PAUSE = Number(process.env.PAUSE) || 0.6;
const CACHE = join(DIR, ".cache", "takes");
mkdirSync(CACHE, { recursive: true });

const FFPROBE = FF.replace(/ffmpeg(\.exe)?$/, "ffprobe$1");
// One channel, at the level it was recorded. A phone or an editor often writes the same voice on
// two channels: left to itself, ffmpeg adds them at 0.707 each for a float output — 3 dB louder,
// over the top on a take already at full level. Half of each keeps it as it was said.
const channels = (src) => Number(execFileSync(FFPROBE, ["-v", "error", "-select_streams", "a:0", "-show_entries", "stream=channels", "-of", "csv=p=0", src]).toString().trim()) || 1;
const mono = (src) => (channels(src) === 2 ? "pan=mono|c0=0.5*c0+0.5*c1" : channels(src) > 2 ? "aformat=channel_layouts=mono" : "anull");
const decode = (src, filter = null) => {
  const raw = execFileSync(FF, ["-v", "error", "-i", src, "-af", `${mono(src)},aresample=${SR}${filter ? `,${filter}` : ""}`, "-f", "f32le", "-ac", "1", "-ar", String(SR), "pipe:1"], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer.slice(raw.byteOffset, raw.byteOffset + raw.byteLength));
};
const wav16 = (samples) => {
  const h = Buffer.alloc(44), bytes = samples.length * 2;
  h.write("RIFF", 0); h.writeUInt32LE(36 + bytes, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(1, 20); h.writeUInt16LE(1, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * 2, 28); h.writeUInt16LE(2, 32); h.writeUInt16LE(16, 34); h.write("data", 36); h.writeUInt32LE(bytes, 40);
  const pcm = Buffer.alloc(bytes);
  for (let i = 0; i < samples.length; i++) pcm.writeInt16LE(Math.round(Math.max(-1, Math.min(1, samples[i])) * 32767), i * 2);
  return Buffer.concat([h, pcm]);
};

/* ---------- what is taken out of the recording first: a phrase said twice, a slip ---------- */

// voice/<film>/edit.json, seconds in the recording as it was given:
//   "cut":  [[from, to, "why"], …]   each stretch goes (its two ends meet in the quiet, a short fade
//                                    at each): a phrase said twice, a slip;
//   "stop": seconds                  what is said after it is left out (a line the film no longer has);
//   "tail": { "file": "4.wav", "at": [from, to], "after": 0.35, "why": "…" }
//                                    a piece of another recording of the same voice, put at the end
//                                    after that much silence (the file: beside the take, or a path).
// Everything after this reads the recording as if it had been said that way.
const OUT = join(DIR, "voice", NAME);
const EDIT = existsSync(join(OUT, "edit.json")) ? JSON.parse(readFileSync(join(OUT, "edit.json"), "utf8")) : {};
const REMOVED = (EDIT.cut ?? []).map(([a, z, why]) => ({ a, z, why: why ?? "" })).sort((x, y) => x.a - y.a);
const STOP = Number.isFinite(EDIT.stop) ? EDIT.stop : null;
const TAIL = EDIT.tail ? { ...EDIT.tail, path: isAbsolute(EDIT.tail.file) ? EDIT.tail.file : join(dirname(source), EDIT.tail.file) } : null;
if (TAIL && !existsSync(TAIL.path)) throw new Error(`edit.json: no recording «${TAIL.path}» for the tail`);
const F = Math.round(0.01 * SR);
const fade = (seg, start, end) => {
  if (start) for (let i = 0; i < Math.min(F, seg.length); i++) seg[i] *= i / F;
  if (end) for (let i = 0; i < Math.min(F, seg.length); i++) seg[seg.length - 1 - i] *= i / F;
  return seg;
};
let take = source;
let audio = decode(source);
if (STOP != null) audio = fade(audio.slice(0, Math.round(STOP * SR)), false, true);
if (REMOVED.length) {
  const keep = [];
  let from = 0;
  for (const c of [...REMOVED, null]) {
    const to = c ? Math.round(c.a * SR) : audio.length;
    keep.push(fade(audio.slice(from, to), keep.length > 0, !!c));
    if (c) from = Math.round(c.z * SR);
  }
  audio = new Float32Array(keep.reduce((x, p) => x + p.length, 0));
  let w = 0;
  for (const p of keep) { audio.set(p, w); w += p.length; }
}
if (TAIL) {
  const all = decode(TAIL.path);
  const clip = fade(all.slice(Math.round(TAIL.at[0] * SR), Math.round(TAIL.at[1] * SR)), true, true);
  const gap = Math.round((TAIL.after ?? 0.35) * SR);
  const joined = new Float32Array(audio.length + gap + clip.length);
  joined.set(audio, 0);
  joined.set(clip, audio.length + gap);
  audio = joined;
}
if (REMOVED.length || STOP != null || TAIL) {
  take = join(CACHE, `${id.split("-")[0]}.edit.wav`);
  writeFileSync(take, wav16(audio));
}

/* ---------- the take: its loudness 10 ms at a time, where it is quiet ---------- */

const HOP = SR / 100;
const E = new Float32Array(Math.floor(audio.length / HOP));
for (let k = 0; k < E.length; k++) {
  let s = 0;
  for (let i = k * HOP; i < (k + 1) * HOP; i++) s += audio[i] * audio[i];
  E[k] = Math.sqrt(s / HOP);
}
const peak = E.reduce((a, b) => Math.max(a, b), 0);
const quiet = peak * 0.03; // −30 dB under the loudest
// the voice: from its first sound to the end of its last one — sounds that last (120 ms) and are
// really loud somewhere (−20 dB): a click is too short for speech, a breath too soft
const loud = [];
for (let k = 0; k < E.length; ) {
  if (E[k] < quiet) { k++; continue; }
  const a = k;
  while (k < E.length && E[k] >= quiet) k++;
  loud.push({ a, z: k });
}
const loudest = (r) => { let m = 0; for (let k = r.a; k < r.z; k++) m = Math.max(m, E[k]); return m; };
const lasting = loud.filter((r) => r.z - r.a >= 12 && loudest(r) >= peak * 0.1);
if (!lasting.length) throw new Error("nothing is said in this take");
// a word can start on a short burst (the «ت» of «تبيع») just before its first long sound: it is the word's
let first = lasting[0].a;
for (let k = loud.indexOf(lasting[0]) - 1; k >= 0 && loud[k].z - loud[k].a >= 4 && first - loud[k].z <= 10; k--) first = loud[k].a;
const ON = first / 100, OFF = lasting.at(-1).z / 100;
// the quiet runs inside it (60 ms and more): where a line may end and the next begin
const runs = [];
for (let k = Math.round(ON * 100); k < Math.round(OFF * 100); ) {
  if (E[k] >= quiet) { k++; continue; }
  const a = k;
  while (k < OFF * 100 && E[k] < quiet) k++;
  if (k - a >= 6) runs.push({ a: a / 100, z: k / 100 });
}

/* ---------- heard, word by word ---------- */

// the film's lines are whispered to Whisper first: it then writes the words the way the script does.
// So a take is heard once for each script and each way the recording is cut (the name says which).
const PROMPT = film.lines.map((l) => spoken(l.say)).join(" ");
const KEY = createHash("sha1").update(JSON.stringify([PROMPT, REMOVED.map((c) => [c.a, c.z]), STOP, TAIL && [TAIL.file, TAIL.at, TAIL.after]])).digest("hex").slice(0, 8);
const HEARD = join(DIR, ".cache", "heard", `${id.split("-")[0]}.${KEY}.json`);
if (!existsSync(HEARD) || statSync(HEARD).mtimeMs < statSync(source).mtimeMs) {
  mkdirSync(join(DIR, ".cache", "heard"), { recursive: true });
  // only what is said goes to Whisper: on a long silence it invents words
  const cut = join(CACHE, `${id.split("-")[0]}.wav`);
  execFileSync(FF, ["-v", "error", "-y", "-i", take, "-t", (OFF + 0.4).toFixed(2), "-ac", "1", "-ar", String(SR), "-c:a", "pcm_s16le", cut]);
  const jobs = join(CACHE, `${id.split("-")[0]}.job.json`);
  writeFileSync(jobs, JSON.stringify([{ take: cut, out: HEARD, prompt: PROMPT }]));
  console.log("listening…");
  execFileSync(PY, [join(DIR, "hear.py"), jobs], { stdio: ["ignore", "inherit", "inherit"], env: { ...process.env, PYTHONIOENCODING: "utf-8" } });
}
const heard = JSON.parse(readFileSync(HEARD, "utf8"));
const words = heard.words.map((w) => ({ ...w, n: norm(w.w) })).filter((w) => w.n);

/* ---------- the script's words, matched to the heard ones ---------- */

const script = film.lines.flatMap((l, li) => shown(l.say).map((text) => ({ text, n: norm(spoken(text)), li })));
const n = script.length;
const hit = match(script, words);
const used = new Array(words.length).fill(false);
// every script word gets a time: its heard word's, or its share of the room between its neighbours
script.forEach((s, k) => { if (hit[k] != null) { used[hit[k]] = true; s.a = words[hit[k]].a; s.z = words[hit[k]].z; s.heard = words[hit[k]].w; } });
spread(script, ON, OFF);

/* ---------- each line's edges, on the quiet ---------- */

const frame = (t) => Math.max(0, Math.min(E.length - 1, Math.round(t * 100)));
const lines = film.lines.map((l, li) => {
  const ws = script.filter((s) => s.li === li);
  return { id: l.id, ws, a: ws[0].a, z: ws.at(-1).z, found: ws.filter((s) => s.heard).length };
});
lines[0].start = ON;
lines.at(-1).end = OFF;
for (let i = 0; i < lines.length - 1; i++) {
  const t1 = Math.min(lines[i].z, lines[i + 1].a), t2 = Math.max(lines[i].z, lines[i + 1].a);
  const lo = t1 - 0.12, hi = t2 + 0.12;
  // a pause there: the line ends where it starts, the next begins where it ends
  const pause = runs.filter((r) => r.z > lo && r.a < hi).sort((x, y) => (y.z - y.a) - (x.z - x.a))[0];
  if (pause && pause.z - pause.a >= 0.08) {
    lines[i].end = pause.a;
    lines[i + 1].start = pause.z;
  } else {
    // said in one breath: the quietest 10 ms between the two words
    let best = frame(lo), k = frame(lo);
    for (; k <= frame(hi); k++) if (E[k] < E[best]) best = k;
    lines[i].end = lines[i + 1].start = (best + 0.5) / 100;
  }
}
// the words follow their line's edges (a word never starts before its line, nor ends after it)
for (const l of lines) {
  l.ws.forEach((w, k) => {
    w.a = Math.max(l.start, Math.min(w.a, l.end - 0.02));
    w.z = Math.min(l.end, Math.max(w.z, w.a + 0.02));
    if (k === 0) w.a = l.start;
    if (k === l.ws.length - 1) w.z = l.end;
  });
  for (let k = 1; k < l.ws.length; k++) if (l.ws[k].a < l.ws[k - 1].a + 0.02) l.ws[k].a = Math.min(l.end - 0.01, l.ws[k - 1].a + 0.02);
}

/* ---------- what was found, said ---------- */

const matched = hit.filter((x) => x != null).length;
console.log(`${NAME}: the take is ${(audio.length / SR).toFixed(1)} s, said from ${ON.toFixed(2)} to ${OFF.toFixed(2)} (${(OFF - ON).toFixed(1)} s) — ${matched}/${n} words of the script heard`);
for (const [i, l] of lines.entries()) {
  const gap = i < lines.length - 1 ? lines[i + 1].start - l.end : 0;
  console.log(`  ${l.id.padEnd(4)} ${l.start.toFixed(2).padStart(6)} → ${l.end.toFixed(2).padStart(6)}  ${(l.end - l.start).toFixed(2)} s${gap > 0.005 ? `  +${gap.toFixed(2)} pause` : ""}  (${l.found}/${l.ws.length})${l.found / l.ws.length < 0.6 ? "  ← check this one" : ""}`);
}
const extra = words.filter((_, j) => !used[j]);
const missed = script.filter((s) => !s.heard && s.n);
if (extra.length) console.log(`  heard, not in the script: ${extra.map((w) => `${w.w}@${w.a.toFixed(1)}`).join(" ")}`);
if (missed.length) console.log(`  in the script, not heard: ${missed.map((s) => `${s.text}(${film.lines[s.li].id})`).join(" ")}`);
if (CHECK) process.exit(0);

/* ---------- the voice: cleaned once, its ends cut, its pauses set ---------- */

// the rumble off, a hand on the loud words, then one level for the whole take. A voice read close
// to a phone has a few sharp bursts 6–9 dB over everything else (well under 1 % of it): the
// limiter at the end holds only those, quickly, and lets go at once.
const CHAIN = "highpass=f=75,acompressor=threshold=-24dB:ratio=3:attack=5:release=150:makeup=2:knee=6";
const A0 = Math.max(0, ON - 0.08), Z0 = Math.min(audio.length / SR, OFF + 0.18);
const TRIM = `atrim=${A0.toFixed(3)}:${Z0.toFixed(3)},asetpts=PTS-STARTPTS`;
// how loud it is as said (EBU R128), on what is kept
const probe = spawnSync(FF, ["-hide_banner", "-nostats", "-i", take, "-af", `${mono(take)},aresample=${SR},${TRIM},${CHAIN},ebur128`, "-f", "null", "-"], { encoding: "utf8", maxBuffer: 1 << 26 });
const I = Number((String(probe.stderr).match(/Integrated loudness:\s*I:\s*(-?[\d.]+) LUFS/) ?? [])[1]);
if (!Number.isFinite(I)) throw new Error("could not measure how loud the take is");
const GAIN = -16 - I;
const voice = decode(take, `${TRIM},${CHAIN},volume=${GAIN.toFixed(2)}dB,alimiter=limit=${Math.pow(10, -1.5 / 20).toFixed(3)}:level=false:attack=5:release=50`);

// What changes the take's rhythm — all of it in the quiet, where nothing is heard of it:
//  · a pause longer than PAUSE (a hesitation, a page turned) is shortened to it;
//  · a line the film gives a `hold` (its scene needs that long before the next line) gets a pause
//    at least that long after it, even where the voice went straight on.
const ops = []; // { a, z, add }: the take from a to z goes, then `add` seconds of silence come
const holds = new Map();
film.lines.forEach((l, i) => { if (l.hold && i < lines.length - 1) holds.set(i, l.hold); });
const held = new Set();
for (const r of runs) {
  const len = r.z - r.a, mid = (r.a + r.z) / 2;
  // the line this pause comes after, when it is the pause between two lines
  const i = lines.findIndex((l, k) => k < lines.length - 1 && Math.abs(l.end - r.a) < 0.005 && Math.abs(lines[k + 1].start - r.z) < 0.005);
  const want = Math.max(i >= 0 && holds.has(i) ? holds.get(i) : 0, Math.min(len, PAUSE));
  if (i >= 0) held.add(i);
  if (want < len - 0.02) ops.push({ a: mid - (len - want) / 2, z: mid + (len - want) / 2, add: 0 });
  else if (want > len + 0.02) ops.push({ a: mid, z: mid, add: want - len });
}
// a hold where the voice did not pause at all: the silence goes in at the line's edge
for (const [i, h] of holds) if (!held.has(i)) ops.push({ a: lines[i].end, z: lines[i].end, add: h });
ops.sort((x, y) => x.a - y.a);
/** a moment of the take → the same moment in the voice as written (`after`: for what starts at that moment, not what ends there) */
const moved = (t, after = false) => {
  let d = 0;
  for (const o of ops) {
    if (o.a === o.z) { if (t > o.a || (after && t === o.a)) d += o.add; else break; } // silence put in
    else if (t >= o.z) d -= o.z - o.a; // a stretch of pause taken out before it
    else if (t > o.a) { d -= t - o.a; break; } // inside what was taken out: where the join is
    else break;
  }
  return t - A0 + d;
};
const FADE = Math.round(0.012 * SR);
const parts = [];
let from = 0;
for (const o of [...ops, null]) {
  const to = o ? Math.round((o.a - A0) * SR) : voice.length;
  const seg = voice.slice(from, Math.max(from, to));
  // a short fade at each side of a join
  if (parts.length) for (let i = 0; i < Math.min(FADE, seg.length); i++) seg[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / FADE);
  if (o) for (let i = 0; i < Math.min(FADE, seg.length); i++) seg[seg.length - 1 - i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / FADE);
  parts.push(seg);
  if (o) {
    if (o.add > 0) parts.push(new Float32Array(Math.round(o.add * SR)));
    from = Math.round((o.z - A0) * SR);
  }
}
const outLen = parts.reduce((x, p) => x + p.length, 0);
const final = new Float32Array(outLen);
let w = 0;
for (const p of parts) { final.set(p, w); w += p.length; }
// its two ends: in from nothing over the quiet kept before the first word (30 ms of it; 10 ms when
// the recording starts on the word itself), out in 60
const IN = Math.round((ON - A0 >= 0.04 ? 0.03 : 0.01) * SR);
for (let i = 0; i < Math.min(IN, outLen); i++) final[i] *= 0.5 - 0.5 * Math.cos((Math.PI * i) / IN);
for (let i = 0; i < Math.min(Math.round(0.06 * SR), outLen); i++) final[outLen - 1 - i] *= i / (0.06 * SR);

const r3 = (x) => +x.toFixed(3);
mkdirSync(OUT, { recursive: true });
// the voice before this one (a studio take cut into lines) leaves: one voice per film. What is
// said about the film stays: edit.json (what to cut), drawn.json (the voice its scenes were drawn for)
for (const f of readdirSync(OUT)) if (/\.(wav|mp3|m4a|txt|json)$/.test(f) && f !== "edit.json" && f !== "drawn.json") rmSync(join(OUT, f));
writeFileSync(join(OUT, "take.wav"), wav16(final));
// a line (and a word) starts after the silence put before it, and ends before the one put after it
writeFileSync(
  join(OUT, "take.json"),
  JSON.stringify(
    {
      source: basename(source),
      duration: r3(outLen / SR),
      loudness: -16,
      heard: `${matched}/${n}`,
      removed: REMOVED,
      ...(STOP != null ? { stop: STOP } : {}),
      ...(TAIL ? { tail: { file: TAIL.file, at: TAIL.at } } : {}),
      pauses: ops.map((o) => ({ at: r3(moved(o.a)), by: r3(o.add - (o.z - o.a)) })),
      lines: lines.map((l) => ({ id: l.id, start: r3(moved(l.start, true)), end: r3(moved(l.end)), words: l.ws.map((x) => ({ w: x.text, a: r3(moved(x.a, true)), z: r3(moved(x.z)) })) })),
    },
    null,
    1,
  ),
);
const net = ops.reduce((x, o) => x + o.add - (o.z - o.a), 0);
console.log(`\n${basename(source)} → ${join("voice", NAME, "take.wav")}: ${(outLen / SR).toFixed(1)} s, ${GAIN >= 0 ? "+" : ""}${GAIN.toFixed(1)} dB to −16 LUFS${REMOVED.length ? `, ${REMOVED.length} stretch${REMOVED.length > 1 ? "es" : ""} taken out (${REMOVED.reduce((x, c) => x + c.z - c.a, 0).toFixed(1)} s)` : ""}${STOP != null ? `, stopped at ${STOP} s` : ""}${TAIL ? `, ${TAIL.file} ${TAIL.at[0]}–${TAIL.at[1]} s added at the end` : ""}${ops.length ? `, ${ops.length} pause${ops.length > 1 ? "s" : ""} set (${net >= 0 ? "+" : ""}${net.toFixed(2)} s)` : ""}\nnow: node retime.mjs ${id} (the scenes, to this voice), then node render.mjs ${id}`);
