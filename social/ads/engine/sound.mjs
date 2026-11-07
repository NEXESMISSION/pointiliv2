/**
 * A film's sound, all of it made here: the music (written and played in code: no track to
 * license), the effects the timeline asked for (K.sfx), and the voice, line by line, when
 * voice/<film>/ has it. Mixed so the voice leads, the music ducks under it, the effects are
 * felt more than heard — then levelled to -14 LUFS, what Instagram plays back at.
 */
import { execFileSync } from "node:child_process";
import { existsSync, writeFileSync } from "node:fs";

const SR = 48000;
const WINGET = "C:/Users/ayoub/AppData/Local/Microsoft/WinGet/Packages/Gyan.FFmpeg_Microsoft.Winget.Source_8wekyb3d8bbwe/ffmpeg-9.0.2-full_build/bin/";
const FFMPEG = process.env.FFMPEG || (existsSync(WINGET + "ffmpeg.exe") ? WINGET + "ffmpeg.exe" : "ffmpeg");
const FFPROBE = FFMPEG.replace(/ffmpeg(\.exe)?$/, "ffprobe$1");

export const voiceLength = (file) => +execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", file]).toString().trim();
const decode = (file) => {
  const raw = execFileSync(FFMPEG, ["-v", "error", "-i", file, "-f", "f32le", "-ac", "1", "-ar", String(SR), "pipe:1"], { maxBuffer: 1 << 30 });
  return new Float32Array(raw.buffer, raw.byteOffset, raw.byteLength / 4);
};

/* ---------- the little things sound is made of ---------- */

const TAU = Math.PI * 2;
const mtof = (m) => 440 * Math.pow(2, (m - 69) / 12);
const rng = (seed) => () => {
  seed = (seed + 0x6d2b79f5) | 0;
  let t = Math.imul(seed ^ (seed >>> 15), 1 | seed);
  t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
};
class Biquad {
  constructor(type, f, q = 0.707) {
    this.x1 = this.x2 = this.y1 = this.y2 = 0;
    this.set(type, f, q);
  }
  set(type, f, q = 0.707) {
    const w = (TAU * Math.min(f, SR * 0.45)) / SR, c = Math.cos(w), s = Math.sin(w), al = s / (2 * q);
    let b0, b1, b2;
    const a0 = 1 + al, a1 = -2 * c, a2 = 1 - al;
    if (type === "lp") [b0, b1, b2] = [(1 - c) / 2, 1 - c, (1 - c) / 2];
    else if (type === "hp") [b0, b1, b2] = [(1 + c) / 2, -(1 + c), (1 + c) / 2];
    else [b0, b1, b2] = [al, 0, -al];
    this.b0 = b0 / a0; this.b1 = b1 / a0; this.b2 = b2 / a0; this.a1 = a1 / a0; this.a2 = a2 / a0;
    return this;
  }
  run(x) {
    const y = this.b0 * x + this.b1 * this.x1 + this.b2 * this.x2 - this.a1 * this.y1 - this.a2 * this.y2;
    this.x2 = this.x1; this.x1 = x; this.y2 = this.y1; this.y1 = y;
    return y;
  }
}
const db = (d) => Math.pow(10, d / 20);
// a stereo bus
const bus = (sec) => ({ L: new Float32Array(Math.ceil(sec * SR)), R: new Float32Array(Math.ceil(sec * SR)) });
function put(b, mono, t, gain = 1, pan = 0) {
  const at = Math.round(t * SR);
  const gl = gain * Math.cos(((pan + 1) * Math.PI) / 4) * Math.SQRT2, gr = gain * Math.sin(((pan + 1) * Math.PI) / 4) * Math.SQRT2;
  for (let i = 0; i < mono.length; i++) {
    const j = at + i;
    if (j < 0 || j >= b.L.length) continue;
    b.L[j] += mono[i] * gl;
    b.R[j] += mono[i] * gr;
  }
}
const make = (sec, fn) => {
  const out = new Float32Array(Math.ceil(sec * SR));
  for (let i = 0; i < out.length; i++) out[i] = fn(i / SR, i);
  return out;
};

/* ---------- instruments ---------- */

const INST = {
  kick: (g = 1) => {
    let ph = 0;
    return make(0.5, (t) => {
      ph += (TAU * (46 + 92 * Math.exp(-t * 32))) / SR;
      return Math.tanh(1.6 * Math.sin(ph) * Math.exp(-t * 7.5)) * g;
    });
  },
  clap: (r) => {
    const f = new Biquad("bp", 1700, 0.9), h = new Biquad("hp", 600);
    return make(0.4, (t) => {
      const burst = t < 0.03 ? Math.exp(-((t * 1000) % 10) * 0.35) : Math.exp(-(t - 0.03) * 20);
      return h.run(f.run((r() * 2 - 1) * burst)) * 1.6;
    });
  },
  snare: (r) => {
    const f = new Biquad("bp", 2200, 0.7);
    let ph = 0;
    return make(0.35, (t) => {
      ph += (TAU * 185) / SR;
      return f.run((r() * 2 - 1) * Math.exp(-t * 16)) * 1.2 + Math.sin(ph) * Math.exp(-t * 30) * 0.5;
    });
  },
  hat: (r, open = false) => {
    const f = new Biquad("hp", 7500, 0.8);
    return make(open ? 0.35 : 0.07, (t) => f.run(r() * 2 - 1) * Math.exp(-t * (open ? 11 : 65)) * 0.55);
  },
  shaker: (r) => {
    const f = new Biquad("bp", 6000, 1.2);
    return make(0.09, (t) => f.run(r() * 2 - 1) * Math.sin(Math.PI * Math.min(1, t / 0.09)) * 0.5);
  },
  bass: (midi, dur) => {
    const f = mtof(midi);
    return make(dur + 0.08, (t) => {
      const e = Math.min(1, t / 0.006) * (t < dur ? 0.82 + 0.18 * Math.exp(-t * 6) : Math.exp(-(t - dur) * 40));
      const p = TAU * f * t;
      return Math.tanh(1.3 * (Math.sin(p) + 0.22 * Math.sin(2 * p) + 0.08 * Math.sin(3 * p))) * e * 0.8;
    });
  },
  // an electric piano: two operators, the bright one fading first
  ep: (midi, dur) => {
    const f = mtof(midi);
    return make(dur + 0.9, (t) => {
      const I = 1.5 * Math.exp(-t * 4) + 0.22;
      const e = Math.min(1, t / 0.004) * Math.exp(-t * 1.25) * (t < dur ? 1 : Math.exp(-(t - dur) * 7));
      return (Math.sin(TAU * f * t + I * Math.sin(TAU * f * t)) + 0.18 * Math.sin(TAU * 2 * f * t) * Math.exp(-t * 5)) * e * (1 + 0.05 * Math.sin(TAU * 4.6 * t)) * 0.35;
    });
  },
  // a plucked string-ish synth: harmonics dying faster the higher they are
  pluck: (midi, len = 0.7, bright = 1) => {
    const f = mtof(midi);
    return make(len, (t) => {
      let v = 0;
      for (let k = 1; k <= 9; k++) v += (Math.sin(TAU * k * f * t) / k) * Math.exp(-t * (3.5 + k * 2.2 / bright));
      return v * Math.min(1, t / 0.002) * 0.3;
    });
  },
  // a soft pad: three detuned saws, filtered, slow to come and go
  pad: (midi, dur) => {
    const f = mtof(midi), lp1 = new Biquad("lp", 1300, 0.6), lp2 = new Biquad("lp", 1300, 0.6);
    const ph = [0, 0.33, 0.66];
    const det = [1, Math.pow(2, 7 / 1200), Math.pow(2, -7 / 1200)];
    return make(dur + 0.8, (t) => {
      let v = 0;
      for (let k = 0; k < 3; k++) {
        ph[k] = (ph[k] + (f * det[k]) / SR) % 1;
        v += 2 * ph[k] - 1;
      }
      const e = Math.min(1, t / 0.45) * (t < dur ? 1 : Math.exp(-(t - dur) * 5));
      return lp2.run(lp1.run(v / 3)) * e * 0.45;
    });
  },
};

// a room for the music: a small Freeverb
function reverb(b, { mix = 0.18, size = 0.78, damp = 0.35 } = {}) {
  const combs = [1116, 1188, 1277, 1356, 1422, 1491, 1557, 1617].map((d) => Math.round((d * SR) / 44100));
  const alls = [556, 441, 341, 225].map((d) => Math.round((d * SR) / 44100));
  for (const [ch, spread] of [["L", 0], ["R", 23]]) {
    const x = b[ch];
    const outv = new Float32Array(x.length);
    for (const d0 of combs) {
      const d = d0 + spread, line = new Float32Array(d);
      let idx = 0, store = 0;
      for (let i = 0; i < x.length; i++) {
        const y = line[idx];
        store = y * (1 - damp) + store * damp;
        line[idx] = x[i] * 0.015 + store * size;
        idx = (idx + 1) % d;
        outv[i] += y;
      }
    }
    for (const d0 of alls) {
      const d = d0 + spread, line = new Float32Array(d);
      let idx = 0;
      for (let i = 0; i < outv.length; i++) {
        const bufv = line[idx], y = -outv[i] + bufv;
        line[idx] = outv[i] + bufv * 0.5;
        idx = (idx + 1) % d;
        outv[i] = y;
      }
    }
    for (let i = 0; i < x.length; i++) x[i] = x[i] * (1 - mix) + outv[i] * mix * 3;
  }
}

/* ---------- the music: four styles, written as patterns ---------- */

const C = {
  Fmaj7: [53, 57, 60, 64], Em7: [52, 55, 59, 62], Dm7: [50, 53, 57, 60], Cmaj7: [48, 52, 55, 59],
  C: [48, 55, 60, 64], G: [47, 55, 59, 62], Am: [48, 52, 57, 60], F: [48, 53, 57, 60],
  Am7: [55, 57, 60, 64], Dm9: [53, 57, 60, 64], G7: [53, 55, 59, 62], Am_: [57, 60, 64], F_: [57, 60, 65], C_: [55, 60, 64], G_: [55, 59, 62],
};
export const STYLES = {
  // a warm story: electric piano, soft swung drums
  warm: { bpm: 92, swing: 0.16, prog: ["Fmaj7", "Em7", "Dm7", "Cmaj7"], roots: [41, 40, 38, 36], kick: [0, 7, 8], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], keys: "ep", keysAt: [0, 10], bassAt: [0, 8, 11], pluck: null, room: 0.22 },
  // bright and bouncy: house-ish piano stabs, a plucked line, four on the floor
  bounce: { bpm: 108, swing: 0, prog: ["C", "G", "Am", "F"], roots: [36, 43, 45, 41], kick: [0, 4, 8, 12], clap: [4, 12], hats: [2, 6, 10, 14], shaker: true, keys: "stab", keysAt: [2, 6, 10, 14], bassAt: [0, 3, 6, 8, 11, 14], pluck: [0, 3, 6, 8, 10, 12, 14], room: 0.16 },
  // clean and modern: a pad, a pulse, a few plucks
  tech: { bpm: 100, swing: 0, prog: ["Am_", "F_", "C_", "G_"], roots: [45, 41, 36, 43], kick: [0, 4, 8, 12], clap: [12], hats: [2, 6, 10, 14], shaker: true, keys: "pad", bassAt: [0, 2, 4, 6, 8, 10, 12, 14], pluck: [0, 6, 10], room: 0.2 },
  // a comic: quick, plucky, staccato stabs — chaos that stays friendly
  comic: { bpm: 120, swing: 0, prog: ["C", "F", "G", "C"], roots: [36, 41, 43, 36], kick: [0, 8, 11], clap: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], keys: "stab", keysAt: [0, 3, 6, 10], bassAt: [0, 3, 8, 11], pluck: [0, 2, 4, 7, 9, 12, 14], room: 0.12 },
  // lo-fi: slow, swung, a crackle under it
  lofi: { bpm: 84, swing: 0.2, prog: ["Am7", "Dm7", "G7", "Cmaj7"], roots: [45, 38, 43, 36], kick: [0, 6, 10], snare: [4, 12], hats: [0, 2, 4, 6, 8, 10, 12, 14], keys: "ep", keysAt: [0, 7], bassAt: [0, 10], pluck: null, crackle: true, room: 0.25 },
};

export function music(styleName, total, { drumsFrom = 0, breaks = [], seed = 7, calmFrom = null } = {}) {
  const S = STYLES[styleName] ?? STYLES.bounce;
  const r = rng(seed);
  const beat = 60 / S.bpm, step = beat / 4, bar = beat * 4;
  const b = bus(total + 2);
  const keysBus = bus(total + 2);
  const inBreak = (t) => breaks.some(([a, z]) => t >= a && t < z) || t < drumsFrom || (calmFrom != null && t >= calmFrom);
  const swung = (s) => (s % 4 === 2 ? S.swing * step * 2 : 0);
  const kickT = [];
  const nBars = Math.ceil(total / bar) + 1;
  for (let k = 0; k < nBars; k++) {
    const t0 = k * bar;
    const ci = k % S.prog.length;
    const chord = C[S.prog[ci]];
    const root = S.roots[ci];
    // drums
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * step + swung(s);
      if (t >= total || inBreak(t)) continue;
      if (S.kick.includes(s)) { put(b, INST.kick(), t, 0.9); kickT.push(t); }
      if (S.clap?.includes(s)) put(b, INST.clap(r), t, 0.42, 0.05);
      if (S.snare?.includes(s)) put(b, INST.snare(r), t, 0.32, -0.05);
      if (S.hats.includes(s)) put(b, INST.hat(r, styleName === "bounce" && s === 14), t, s % 4 === 2 ? 0.3 : 0.18, 0.25);
      if (S.shaker && s % 2 === 1) put(b, INST.shaker(r), t, 0.12, -0.3);
    }
    // bass
    for (const s of S.bassAt) {
      const t = t0 + s * step + swung(s);
      if (t >= total || inBreak(t)) continue;
      const len = styleName === "warm" || styleName === "lofi" ? step * 3.2 : step * 1.6;
      const oct = styleName === "bounce" && (s === 3 || s === 11) ? 12 : 0;
      put(b, INST.bass(root + oct, len), t, 0.55);
    }
    // keys
    if (S.keys === "ep") {
      for (const s of S.keysAt) {
        const t = t0 + s * step + swung(s);
        if (t >= total) continue;
        chord.forEach((m, i) => put(keysBus, INST.ep(m + 12, s === 0 ? bar * 0.62 : bar * 0.3), t + i * 0.012, 0.5, i % 2 ? 0.3 : -0.3));
      }
    } else if (S.keys === "stab") {
      for (const s of S.keysAt) {
        const t = t0 + s * step;
        if (t >= total) continue;
        chord.forEach((m, i) => put(keysBus, INST.ep(m + 12, step * 0.9), t, 0.42, i % 2 ? 0.25 : -0.25));
      }
    } else if (S.keys === "pad") {
      chord.forEach((m, i) => put(keysBus, INST.pad(m + 12, bar), t0, 0.33, i % 2 ? 0.35 : -0.35));
    }
    // a plucked line over the chord
    if (S.pluck) {
      const tones = [...chord.slice(-3).map((m) => m + 12), chord[chord.length - 1] + 17];
      S.pluck.forEach((s, j) => {
        const t = t0 + s * step;
        if (t >= total || (calmFrom == null && t < drumsFrom && styleName !== "tech")) return;
        put(keysBus, INST.pluck(tones[(j + k) % tones.length] + 12, 0.55), t, styleName === "tech" ? 0.3 : 0.34, j % 2 ? 0.4 : -0.4);
      });
    }
  }
  // the keys breathe with the kick (a little pump), then join the mix
  const pump = new Float32Array(keysBus.L.length).fill(1);
  for (const t of kickT) {
    const at = Math.round(t * SR), len = Math.round(0.35 * SR);
    for (let i = 0; i < len && at + i < pump.length; i++) pump[at + i] = Math.min(pump[at + i], 1 - 0.32 * Math.exp(-(i / SR) * 9));
  }
  for (let i = 0; i < pump.length; i++) { b.L[i] += keysBus.L[i] * pump[i]; b.R[i] += keysBus.R[i] * pump[i]; }
  if (S.crackle) {
    const f = new Biquad("bp", 2500, 0.5);
    for (let i = 0; i < b.L.length; i++) {
      const c = r() < 0.0009 ? (r() * 2 - 1) * 0.5 : 0;
      const n = f.run((r() * 2 - 1) * 0.012 + c);
      b.L[i] += n; b.R[i] += n;
    }
  }
  reverb(b, { mix: S.room });
  // in, and out at the end
  const fadeIn = Math.round(0.25 * SR), fadeOut = Math.round(1.6 * SR), N = Math.round(total * SR);
  for (let i = 0; i < b.L.length; i++) {
    const g = i < fadeIn ? i / fadeIn : i > N - fadeOut ? Math.max(0, (N - i) / fadeOut) : 1;
    b.L[i] *= g; b.R[i] *= g;
  }
  return b;
}

/* ---------- the effects ---------- */

function noiseSweep(r, len, f0, f1, q = 1.2, shape = (x) => Math.sin(Math.PI * x)) {
  const f = new Biquad("bp", f0, q);
  return make(len, (t, i) => {
    if (i % 64 === 0) f.set("bp", f0 * Math.pow(f1 / f0, t / len), q);
    return f.run(r() * 2 - 1) * shape(t / len) * 1.4;
  });
}
const tone = (len, fn, decay, attack = 0.002) => make(len, (t) => fn(t) * Math.min(1, t / attack) * Math.exp(-t * decay));
const bell = (freq, len = 0.9, decay = 4) => tone(len, (t) => [1, 2.0, 3.01, 4.2].reduce((a, k, i) => a + Math.sin(TAU * freq * k * t) * [1, 0.45, 0.22, 0.1][i] * Math.exp(-t * i * 2), 0) * 0.45, decay);
const mixArr = (...parts) => {
  const len = Math.max(...parts.map(([a, at = 0]) => a.length + Math.round(at * SR)));
  const out = new Float32Array(len);
  for (const [a, at = 0, g = 1] of parts) { const o = Math.round(at * SR); for (let i = 0; i < a.length; i++) out[o + i] += a[i] * g; }
  return out;
};

export const SOUNDS = {
  pop: (r) => { let ph = 0; return tone(0.14, (t) => { ph += (TAU * (380 + 620 * Math.min(1, t / 0.045))) / SR; return Math.sin(ph) * 0.8; }, 38); },
  tap: (r) => { const f = new Biquad("bp", 3200, 1.4); return mixArr([make(0.03, (t) => f.run(r() * 2 - 1) * Math.exp(-t * 220) * 1.2)], [tone(0.05, (t) => Math.sin(TAU * 1500 * t) * 0.3, 90)]); },
  key: (r) => { const f = new Biquad("hp", 2500); const p = 0.85 + r() * 0.3; return mixArr([make(0.04, (t) => f.run(r() * 2 - 1) * Math.exp(-t * 160) * 0.7)], [tone(0.05, (t) => Math.sin(TAU * 320 * p * t) * 0.35, 120)]); },
  stamp: (r) => { let ph = 0; const lp = new Biquad("lp", 1800); return mixArr([tone(0.28, (t) => { ph += (TAU * (52 + 110 * Math.exp(-t * 40))) / SR; return Math.tanh(2 * Math.sin(ph)) * 0.9; }, 17)], [make(0.02, (t) => lp.run(r() * 2 - 1) * Math.exp(-t * 300) * 0.9)], [bell(1568, 0.5, 9), 0.02, 0.35]); },
  win: (r) => mixArr([bell(1047, 1)], [bell(1319, 1), 0.07], [bell(1568, 1), 0.14], [bell(2093, 1.2, 3), 0.21, 0.9]),
  ding: () => bell(1319, 1.1, 3.5),
  chime: () => mixArr([bell(1319, 0.9)], [bell(1976, 1.1, 3), 0.11]),
  sparkle: (r) => { const parts = []; for (let k = 0; k < 9; k++) parts.push([tone(0.25, (t) => Math.sin(TAU * (2600 + r() * 2600) * t) * 0.18, 18), k * 0.04 + r() * 0.03]); return mixArr(...parts); },
  whoosh: (r) => noiseSweep(r, 0.5, 350, 3800, 0.9),
  swish: (r) => noiseSweep(r, 0.26, 900, 5200, 1.1),
  swoosh: (r) => noiseSweep(r, 0.42, 3000, 420, 0.9),
  riser: (r) => mixArr([noiseSweep(r, 1.4, 300, 6000, 0.7, (x) => x * x)], [tone(1.4, (t) => Math.sin(TAU * (180 + 900 * (t / 1.4) ** 2) * t) * 0.12 * (t / 1.4), 0)]),
  impact: (r) => { let ph = 0; const lp = new Biquad("lp", 380); return mixArr([tone(1.1, (t) => { ph += (TAU * (38 + 70 * Math.exp(-t * 14))) / SR; return Math.sin(ph); }, 3.2)], [make(0.5, (t) => lp.run(r() * 2 - 1) * Math.exp(-t * 9) * 1.1)]); },
  scan: () => mixArr([tone(0.09, (t) => Math.sign(Math.sin(TAU * 1760 * t)) * 0.18 + Math.sin(TAU * 1760 * t) * 0.2, 6)], [tone(0.12, (t) => Math.sin(TAU * 2637 * t) * 0.3, 14), 0.1]),
  buzz: () => tone(0.45, (t) => Math.tanh(3 * Math.sin(TAU * (110 + 6 * Math.sin(TAU * 9 * t)) * t)) * 0.4, 3),
  boing: () => { let ph = 0; return tone(0.6, (t) => { ph += (TAU * (240 + 160 * Math.sin(TAU * 11 * t) * Math.exp(-t * 4))) / SR; return Math.sin(ph) * 0.6; }, 5); },
  msg: () => mixArr([tone(0.1, (t) => Math.sin(TAU * 880 * t) * 0.5, 30)], [tone(0.14, (t) => Math.sin(TAU * 1320 * t) * 0.5, 25), 0.08]),
  coin: () => mixArr([bell(1976, 0.5, 8)], [bell(2637, 0.8, 5), 0.08]),
  shutter: (r) => { const f = new Biquad("bp", 2400, 0.8); const c = () => make(0.05, (t) => f.run(r() * 2 - 1) * Math.exp(-t * 120)); return mixArr([c()], [c(), 0.07, 0.8]); },
  tick: () => tone(0.03, (t) => Math.sin(TAU * 2200 * t) * 0.4, 160),
  thud: () => { let ph = 0; return tone(0.3, (t) => { ph += (TAU * (60 + 60 * Math.exp(-t * 30))) / SR; return Math.sin(ph) * 0.9; }, 14); },
  scratch: (r) => noiseSweep(r, 0.18, 2500, 900, 2),
};
// how loud each one sits under a voice (dB)
const LEVEL = { pop: -14, tap: -15, key: -20, stamp: -10, win: -12, ding: -14, chime: -13, sparkle: -18, whoosh: -15, swish: -17, swoosh: -15, riser: -16, impact: -9, scan: -14, buzz: -15, boing: -13, msg: -12, coin: -13, shutter: -14, tick: -16, thud: -11, scratch: -16 };

/* ---------- the mix ---------- */

export async function makeSound({ film, timing, total, sfx, out, ff = FFMPEG }) {
  // the music may follow the lines: music(T) with T.a5.start, T.a9.end…
  const T = Object.fromEntries(timing.map((l) => [l.id, l]));
  const M = (typeof film.music === "function" ? film.music(T, total) : film.music) ?? { style: "bounce" };
  const voiced = timing.filter((l) => l.voice);
  const mus = M.style === "none" ? bus(total + 2) : music(M.style, total, M);
  const mix = bus(total + 2);
  // the voice, each line where it starts — and an envelope of it, for the ducking
  const vbus = new Float32Array(mix.L.length);
  for (const l of voiced) {
    const v = decode(l.voice);
    const at = Math.round(l.start * SR);
    for (let i = 0; i < v.length && at + i < vbus.length; i++) vbus[at + i] += v[i] * db(film.voiceGain ?? 0);
  }
  const duck = new Float32Array(mix.L.length).fill(1);
  if (voiced.length) {
    let envv = 0;
    const a = Math.exp(-1 / (0.02 * SR)), rel = Math.exp(-1 / (0.35 * SR));
    for (let i = 0; i < vbus.length; i++) {
      const x = Math.abs(vbus[i]);
      envv = x > envv ? a * envv + (1 - a) * x : rel * envv + (1 - rel) * x;
      duck[i] = 1 - Math.min(0.62, envv * 6);
    }
  }
  const mg = db(M.gain ?? (voiced.length ? -15 : -7));
  for (let i = 0; i < mix.L.length; i++) {
    mix.L[i] = mus.L[i] * mg * duck[i] + vbus[i];
    mix.R[i] = mus.R[i] * mg * duck[i] + vbus[i];
  }
  // the effects
  const r = rng(11);
  const cache = {};
  for (const c of sfx) {
    const make1 = SOUNDS[c.name];
    if (!make1) { console.log(`  (no sound «${c.name}»)`); continue; }
    const s = c.name === "key" || c.name === "sparkle" ? make1(r) : (cache[c.name] ??= make1(r));
    put(mix, s, c.t, db((LEVEL[c.name] ?? -14) + (c.gain ?? 0) + (voiced.length ? 0 : 3)), c.name === "whoosh" || c.name === "swish" ? (r() - 0.5) * 0.6 : 0);
  }
  // to a file, then to Instagram's loudness
  const N = Math.round(total * SR);
  let peak = 0;
  for (let i = 0; i < N; i++) peak = Math.max(peak, Math.abs(mix.L[i]), Math.abs(mix.R[i]));
  const g = peak > 0 ? 0.89 / peak : 1;
  const pcm = Buffer.alloc(N * 8);
  for (let i = 0; i < N; i++) { pcm.writeFloatLE(Math.tanh(mix.L[i] * g * 1.1) / 1.1, i * 8); pcm.writeFloatLE(Math.tanh(mix.R[i] * g * 1.1) / 1.1, i * 8 + 4); }
  const raw = out.replace(/\.wav$/, ".raw.wav");
  writeFileSync(raw, Buffer.concat([wavHeader(N, 2), pcm]));
  execFileSync(ff, ["-v", "error", "-y", "-i", raw, "-af", "loudnorm=I=-14:TP=-1.5:LRA=11", "-ar", String(SR), "-ac", "2", "-c:a", "pcm_s16le", out]);
  return out;
}
function wavHeader(frames, ch) {
  const h = Buffer.alloc(44), bytes = frames * ch * 4;
  h.write("RIFF", 0); h.writeUInt32LE(36 + bytes, 4); h.write("WAVE", 8); h.write("fmt ", 12);
  h.writeUInt32LE(16, 16); h.writeUInt16LE(3, 20); h.writeUInt16LE(ch, 22); h.writeUInt32LE(SR, 24);
  h.writeUInt32LE(SR * ch * 4, 28); h.writeUInt16LE(ch * 4, 32); h.writeUInt16LE(32, 34); h.write("data", 36); h.writeUInt32LE(bytes, 40);
  return h;
}
