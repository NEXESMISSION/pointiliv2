/**
 * Music for the reels, synthesised here rather than downloaded.
 *
 *   node social/reel/music.mjs              → three tracks into ~/Desktop/Pointili music
 *   node social/reel/music.mjs 2            → only track 2
 *
 * Nothing is sampled and nothing is borrowed, so there is no licence attached
 * to any of it and no copyright claim can land on a post that uses it. Every
 * sound below is an oscillator or filtered noise with an envelope on it.
 *
 * The arrangement is written as a grid of bars so a section can be rewritten
 * without touching the synthesis, and the whole thing loops: the last bar is
 * built to land on the first.
 */
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { writeFile, mkdir } from "node:fs/promises";
import path from "node:path";
import os from "node:os";

const run = promisify(execFile);
const SR = 44100;
const FF = process.env.FFMPEG || "ffmpeg";
const DEST = path.join(os.homedir(), "Desktop", "Pointili music");

// ── the small amount of theory this needs ───────────────────────────────────
/** MIDI note → Hz. 69 is A440. */
const hz = (n) => 440 * Math.pow(2, (n - 69) / 12);
/** note name → MIDI, e.g. "A3", "C#4", "Eb4" */
const NOTE = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
const m = (s) => {
  const [, l, acc, oct] = s.match(/^([A-G])([#b]?)(-?\d)$/);
  return (Number(oct) + 1) * 12 + NOTE[l] + (acc === "#" ? 1 : acc === "b" ? -1 : 0);
};

// ── voices ──────────────────────────────────────────────────────────────────
const env = (t, len, a, d, s, r) => {
  if (t < a) return t / a;
  if (t < a + d) return 1 - (1 - s) * ((t - a) / d);
  if (t < len - r) return s;
  return Math.max(0, s * (1 - (t - (len - r)) / r));
};
/** a band-limited-ish saw: a few harmonics, cheap and warm enough */
const saw = (ph, n = 8) => {
  let v = 0;
  for (let k = 1; k <= n; k++) v += Math.sin(ph * k) / k;
  return v * 0.55;
};
const tri = (ph) => Math.asin(Math.sin(ph)) * (2 / Math.PI);

/** one-pole lowpass, stateful per call site */
const lp = () => {
  let y = 0;
  return (x, cut) => {
    const a = Math.min(1, (2 * Math.PI * cut) / SR);
    y += a * (x - y);
    return y;
  };
};
const hp = () => {
  const f = lp();
  return (x, cut) => x - f(x, cut);
};

// ── the mixer ───────────────────────────────────────────────────────────────
function Track(seconds) {
  const n = Math.ceil(seconds * SR);
  return { L: new Float32Array(n), R: new Float32Array(n), n };
}
const add = (t, i, l, r) => {
  if (i < 0 || i >= t.n) return;
  t.L[i] += l;
  t.R[i] += r;
};

/** A note: voice(phase, t, len) -> sample, placed at `at` seconds. */
function play(t, at, len, freq, gain, pan, voice) {
  const start = Math.round(at * SR);
  const N = Math.round(len * SR);
  const pl = Math.cos(((pan + 1) * Math.PI) / 4), pr = Math.sin(((pan + 1) * Math.PI) / 4);
  let ph = 0;
  const filt = lp();
  for (let i = 0; i < N; i++) {
    const tt = i / SR;
    ph += (2 * Math.PI * freq) / SR;
    const s = voice(ph, tt, len, filt) * gain;
    add(t, start + i, s * pl, s * pr);
  }
}

const VOICES = {
  /** wide, slow, sits under everything */
  pad: (detune = 0.004) => (ph, tt, len, filt) => {
    const e = env(tt, len, 0.35, 0.4, 0.75, 0.6);
    const a = saw(ph, 6), b = saw(ph * (1 + detune), 6), c = saw(ph * (1 - detune), 6);
    return filt((a + b + c) / 3, 900 + 900 * Math.sin(tt * 0.6)) * e;
  },
  /** short, bright, the thing the ear follows */
  pluck: () => (ph, tt, len, filt) => {
    const e = Math.exp(-tt * 9) * env(tt, len, 0.002, 0.02, 1, 0.05);
    return filt(tri(ph) * 0.8 + saw(ph, 4) * 0.25, 2600 * Math.exp(-tt * 3) + 400) * e;
  },
  /** round and soft, never fights the voice-over */
  bass: () => (ph, tt, len) => {
    const e = env(tt, len, 0.01, 0.08, 0.85, 0.09);
    const s = Math.sin(ph) + 0.22 * Math.sin(ph * 2);
    return Math.tanh(s * 1.5) * 0.5 * e;
  },
  /** an oud-ish double pluck, for the Hijaz track */
  oud: () => (ph, tt, len, filt) => {
    const e = Math.exp(-tt * 7.5);
    const body = tri(ph) + 0.4 * tri(ph * 2.01) + 0.2 * saw(ph * 0.5, 3);
    return filt(body, 3200 * Math.exp(-tt * 4) + 500) * e * 0.55;
  },
};

// ── drums ───────────────────────────────────────────────────────────────────
function kick(t, at, gain = 1) {
  const start = Math.round(at * SR), N = Math.round(0.34 * SR);
  let ph = 0;
  for (let i = 0; i < N; i++) {
    const tt = i / SR;
    const f = 52 + 105 * Math.exp(-tt * 34);
    ph += (2 * Math.PI * f) / SR;
    const s = Math.tanh(Math.sin(ph) * 1.7) * Math.exp(-tt * 7.5) * gain;
    add(t, start + i, s, s);
  }
}
function hat(t, at, gain = 0.3, open = false) {
  const start = Math.round(at * SR), N = Math.round((open ? 0.18 : 0.05) * SR);
  const f = hp();
  for (let i = 0; i < N; i++) {
    const tt = i / SR;
    const s = f(Math.random() * 2 - 1, 7000) * Math.exp(-tt * (open ? 16 : 70)) * gain;
    add(t, start + i, s * 0.85, s);
  }
}
function clap(t, at, gain = 0.42) {
  const start = Math.round(at * SR), N = Math.round(0.22 * SR);
  const f = hp(), f2 = lp();
  for (let i = 0; i < N; i++) {
    const tt = i / SR;
    const burst = tt < 0.02 ? 1 : tt < 0.035 ? 0.7 : Math.exp(-(tt - 0.035) * 22);
    let s = f(Math.random() * 2 - 1, 1100);
    s = f2(s, 5200) * burst * gain;
    add(t, start + i, s, s * 0.9);
  }
}

// ── space ───────────────────────────────────────────────────────────────────
/** two taps in time with the bar, wide — cheap and it sounds intentional */
function delay(t, time, fb = 0.34, mix = 0.3) {
  const d = Math.round(time * SR);
  for (let i = d; i < t.n; i++) {
    t.L[i] += t.R[i - d] * fb * mix;
    t.R[i] += t.L[i - Math.round(d * 1.5)] * fb * mix * 0.8;
  }
}
/** the pump that makes a loop feel alive */
function sidechain(t, beats, depth = 0.42) {
  for (const b of beats) {
    const start = Math.round(b * SR), N = Math.round(0.42 * SR);
    for (let i = 0; i < N; i++) {
      const g = 1 - depth * Math.exp(-(i / SR) * 7);
      t.L[start + i] *= g;
      t.R[start + i] *= g;
    }
  }
}

// ── the three tracks ────────────────────────────────────────────────────────
const TRACKS = [
  {
    file: "01 - Counter",
    about: "warm and unhurried, made to sit under a talking head",
    bpm: 88,
    bars: 32,
    build(t, { beat, bar, bars }) {
      // i – VI – III – VII in A minor: the friendliest four chords there are
      const chords = [
        ["A3", "C4", "E4", "G4"],
        ["F3", "A3", "C4", "E4"],
        ["C3", "E3", "G3", "B3"],
        ["G3", "B3", "D4", "F4"],
      ];
      const roots = ["A2", "F2", "C2", "G2"];
      const kicks = [];
      for (let b = 0; b < bars; b++) {
        const at = b * bar, ch = chords[b % 4], root = roots[b % 4];
        const quiet = b < 4 || (b >= 16 && b < 20);

        play(t, at, bar * 0.98, hz(m(ch[0])), 0.10, -0.3, VOICES.pad());
        play(t, at, bar * 0.98, hz(m(ch[2])), 0.09, 0.3, VOICES.pad(0.006));
        if (b >= 4) play(t, at, bar * 0.98, hz(m(ch[3]) + 12), 0.05, 0, VOICES.pad(0.009));

        if (!quiet) {
          for (let s = 0; s < 8; s++) {
            const on = [0, 3, 5, 6][s % 4];
            play(t, at + s * beat * 0.5, 0.42, hz(m(ch[on % ch.length]) + (s > 3 ? 12 : 0)),
                 0.085, s % 2 ? 0.45 : -0.45, VOICES.pluck());
          }
        }
        for (let s = 0; s < 4; s++) {
          if (b < 2) break;
          play(t, at + s * beat, beat * 0.85, hz(m(root)), 0.30, 0, VOICES.bass());
        }
        if (b >= 4 && !(b >= 16 && b < 20)) {
          for (let s = 0; s < 4; s++) { kick(t, at + s * beat, 0.9); kicks.push(at + s * beat); }
          clap(t, at + beat); clap(t, at + beat * 3);
        }
        if (b >= 2) for (let s = 0; s < 8; s++) hat(t, at + s * beat * 0.5 + (s % 2 ? 0.012 : 0), s % 2 ? 0.14 : 0.24, s === 7);
      }
      delay(t, beat * 0.75, 0.3, 0.26);
      sidechain(t, kicks, 0.38);
    },
  },
  {
    file: "02 - Souk",
    about: "Hijaz — the scale that makes it sound like it was made here",
    bpm: 100,
    bars: 32,
    build(t, { beat, bar, bars }) {
      // D Hijaz: D Eb F# G A Bb C — flat second, major third
      const sc = ["D4", "Eb4", "F#4", "G4", "A4", "Bb4", "C5", "D5"];
      const figure = [0, 2, 3, 4, 3, 2, 1, 0, 4, 3, 2, 0, 1, 2, 3, 4];
      const roots = ["D2", "D2", "Bb1", "A1"];
      const kicks = [];
      for (let b = 0; b < bars; b++) {
        const at = b * bar, root = roots[b % 4];
        const full = b >= 4 && !(b >= 20 && b < 22);

        play(t, at, bar * 0.98, hz(m("D3")), 0.09, -0.25, VOICES.pad(0.005));
        play(t, at, bar * 0.98, hz(m(b % 4 < 2 ? "A3" : "F#3")), 0.075, 0.25, VOICES.pad(0.008));

        if (b >= 2) {
          for (let s = 0; s < 16; s++) {
            const note = sc[figure[(s + b * 3) % figure.length]];
            const swing = s % 2 ? beat * 0.06 : 0;
            play(t, at + s * beat * 0.25 + swing, 0.3, hz(m(note) + (b % 8 >= 4 ? 12 : 0)),
                 b < 4 ? 0.05 : 0.085, ((s % 4) - 1.5) / 3, VOICES.oud());
          }
        }
        if (b >= 1) for (let s = 0; s < 4; s++) play(t, at + s * beat, beat * 0.8, hz(m(root)), 0.28, 0, VOICES.bass());

        if (full) {
          for (const k of [0, 1.5, 2, 3.5]) { kick(t, at + k * beat, 0.85); kicks.push(at + k * beat); }
          clap(t, at + beat); clap(t, at + beat * 3);
          for (let s = 0; s < 8; s++) hat(t, at + s * beat * 0.5 + (s % 2 ? 0.014 : 0), s % 2 ? 0.16 : 0.26, s === 5);
        } else if (b >= 2) {
          for (let s = 0; s < 4; s++) hat(t, at + s * beat, 0.18);
        }
      }
      delay(t, beat * 0.5, 0.28, 0.24);
      sidechain(t, kicks, 0.34);
    },
  },
  {
    file: "03 - Open",
    about: "almost nothing — for when the words have to carry it",
    bpm: 76,
    bars: 24,
    build(t, { beat, bar, bars }) {
      const chords = [
        ["F3", "A3", "C4"],
        ["C3", "E3", "G3"],
        ["D3", "F3", "A3"],
        ["Bb2", "D3", "F3"],
      ];
      for (let b = 0; b < bars; b++) {
        const at = b * bar, ch = chords[b % 4];
        for (const [i, nn] of ch.entries()) {
          play(t, at, bar * 1.6, hz(m(nn)), 0.085, (i - 1) * 0.5, VOICES.pad(0.003 + i * 0.002));
        }
        if (b >= 2) {
          play(t, at, 0.9, hz(m(ch[0]) + 24), 0.05, 0.4, VOICES.pluck());
          play(t, at + beat * 2.5, 0.9, hz(m(ch[2]) + 12), 0.045, -0.4, VOICES.pluck());
        }
        if (b >= 4) {
          for (let s = 0; s < 4; s++) play(t, at + s * beat, beat * 0.9, hz(m(ch[0]) - 12), 0.22, 0, VOICES.bass());
          kick(t, at, 0.5);
          kick(t, at + beat * 2, 0.45);
          hat(t, at + beat, 0.12); hat(t, at + beat * 3, 0.12, true);
        }
      }
      delay(t, beat, 0.36, 0.34);
    },
  },
];

// ── render ──────────────────────────────────────────────────────────────────
function wav(t) {
  // find the peak once, then leave headroom for loudnorm to do the rest
  let peak = 0;
  for (let i = 0; i < t.n; i++) peak = Math.max(peak, Math.abs(t.L[i]), Math.abs(t.R[i]));
  const g = peak > 0 ? 0.89 / peak : 1;
  const buf = Buffer.alloc(44 + t.n * 4);
  buf.write("RIFF", 0); buf.writeUInt32LE(36 + t.n * 4, 4); buf.write("WAVE", 8);
  buf.write("fmt ", 12); buf.writeUInt32LE(16, 16); buf.writeUInt16LE(1, 20);
  buf.writeUInt16LE(2, 22); buf.writeUInt32LE(SR, 24); buf.writeUInt32LE(SR * 4, 28);
  buf.writeUInt16LE(4, 32); buf.writeUInt16LE(16, 34);
  buf.write("data", 36); buf.writeUInt32LE(t.n * 4, 40);
  for (let i = 0; i < t.n; i++) {
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Math.tanh(t.L[i] * g) * 32767))), 44 + i * 4);
    buf.writeInt16LE(Math.max(-32767, Math.min(32767, Math.round(Math.tanh(t.R[i] * g) * 32767))), 46 + i * 4);
  }
  return buf;
}

async function main() {
  const only = process.argv.slice(2).filter((a) => /^\d+$/.test(a)).map(Number);
  await mkdir(DEST, { recursive: true });

  for (const [i, spec] of TRACKS.entries()) {
    if (only.length && !only.includes(i + 1)) continue;
    const beat = 60 / spec.bpm, bar = beat * 4;
    const seconds = spec.bars * bar + 2.5;
    const t = Track(seconds);
    spec.build(t, { beat, bar, bars: spec.bars });

    const raw = path.join(DEST, `.${spec.file}.wav`);
    await writeFile(raw, wav(t));

    // a music bed sits under a voice, so -16 LUFS, not -14
    const out = path.join(DEST, `${spec.file}.mp3`);
    await run(FF, ["-v", "error", "-y", "-i", raw,
      "-af", "highpass=f=32,loudnorm=I=-16:TP=-1.5:LRA=9",
      "-c:a", "libmp3lame", "-b:a", "224k", out]);
    await run(FF, ["-v", "error", "-y", "-i", raw,
      "-af", "highpass=f=32,loudnorm=I=-16:TP=-1.5:LRA=9",
      "-c:a", "pcm_s16le", path.join(DEST, `${spec.file}.wav`)]);
    await (await import("node:fs/promises")).rm(raw, { force: true });

    console.log(`  ✓ ${spec.file} — ${spec.bpm} BPM, ${Math.round(seconds)}s · ${spec.about}`);
  }
  console.log(`\n${DEST}`);
}

await main();
