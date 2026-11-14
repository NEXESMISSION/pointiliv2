/**
 * A film's scenes, moved to the voice it has now: `node retime.mjs f6`.
 *
 * A film places its scenes by its voice: at("c4", 0.8) is 0.8 s into line c4 — the moment the
 * voice the film was drawn for said «2400». Another voice says the line faster, breathes
 * elsewhere, says a word more: 0.8 s is no longer that moment. This rewrites those numbers, in
 * the film's own file.
 *
 * voice/<film>/drawn.json keeps, line by line, how long the voice the scenes were drawn for took
 * and when it said each word; take.json (take.mjs) says the same of the voice now. The words of
 * both are matched, and every moment of the old line is carried to the same place between the
 * same two words of the new one:
 *
 *   at("c4", 0.8)             the same word, in the new voice
 *   at("c4", -0.1)            kept: a lead before the line is a lead
 *   at("c4", 0.2 + i * 0.3)   the start carried, the step scaled as the line shrank or grew
 *   typeAt in K.endcard(…)    carried as a moment of the end card's line
 *   at("c4", "الحساب")        kept: a word is already its own moment
 *   end("c4", …), at(x, …)    left alone (and said)
 *
 * Then drawn.json becomes this voice: the film is drawn for it now. Look at the film after
 * (`node render.mjs f6 --sheet --step 0.5`): a beat that had a second to itself may have a third of
 * it now — give its line a `hold` (take.mjs), or draw the beat shorter.
 *
 *   node retime.mjs f6 --dry    only say what would change
 */
import { existsSync, readdirSync, readFileSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { match, norm, spoken } from "./engine/words.mjs";

const DIR = import.meta.dirname;
const argv = process.argv.slice(2);
const DRY = argv.includes("--dry");
const [id] = argv.filter((a) => !a.startsWith("--"));
const file = id && readdirSync(join(DIR, "films")).find((f) => f === `${id}.mjs` || f.startsWith(`${id}-`));
if (!file) {
  console.log("node retime.mjs <film> [--dry]");
  process.exit(1);
}
const NAME = file.replace(/\.mjs$/, "");
const VOICE = join(DIR, "voice", NAME);
const PATH = join(DIR, "films", file);
if (!existsSync(join(VOICE, "take.json"))) throw new Error(`${NAME} has no take (node take.mjs ${id} "<take>")`);
const take = JSON.parse(readFileSync(join(VOICE, "take.json"), "utf8"));
const r3 = (x) => +x.toFixed(3);
/** the voice now, line by line: how long each is, the pause after it, when it says each word (from the line's start) */
const now = take.lines.map((l, i) => ({
  id: l.id,
  len: r3(l.end - l.start),
  gap: r3(i < take.lines.length - 1 ? take.lines[i + 1].start - l.end : 0),
  words: l.words.map((w) => ({ w: w.w, a: r3(w.a - l.start), z: r3(w.z - l.start) })),
}));
const save = () => writeFileSync(join(VOICE, "drawn.json"), JSON.stringify({ voice: take.source, lines: now }, null, 1));
if (!existsSync(join(VOICE, "drawn.json"))) {
  // nothing says what the scenes were drawn for: they are taken as drawn for this voice
  if (!DRY) save();
  console.log(`${NAME}: no drawn.json — the scenes are taken as drawn for this voice (${take.source})`);
  process.exit(0);
}
const was = JSON.parse(readFileSync(join(VOICE, "drawn.json"), "utf8")).lines;

/* ---------- a moment of the old line → the same moment of the new one ---------- */

const carry = Object.fromEntries(
  was.map((b) => {
    const a = now.find((x) => x.id === b.id);
    if (!a) return [b.id, null];
    const key = (w) => ({ n: norm(spoken(w.w)) });
    const hit = match(b.words.map(key), a.words.map(key));
    // the knots: the line's two ends, and both ends of every word said by both voices. The line's
    // start stands for its first word's: a voice file opens on a little quiet, and what a scene does
    // in its first instants (one thing in, then the next) keeps its order and its spacing.
    const knots = [[0, 0]];
    b.words.forEach((w, k) => {
      if (hit[k] == null) return;
      for (const [x, y] of [...(k ? [[w.a, a.words[hit[k]].a]] : []), [w.z, a.words[hit[k]].z]]) if (x > knots.at(-1)[0] + 0.005 && y >= knots.at(-1)[1] && x < b.len - 0.005 && y <= a.len) knots.push([x, y]);
    });
    knots.push([b.len, a.len]);
    const f = (d) => {
      if (d <= 0) return d; // a lead before the line
      if (d >= b.len) return a.len + (d - b.len); // after it is over: as long after
      const k = knots.findIndex(([x]) => x >= d);
      const [x0, y0] = knots[k - 1], [x1, y1] = knots[k];
      return y0 + ((y1 - y0) * (d - x0)) / (x1 - x0);
    };
    return [b.id, { f, k: a.len / b.len, was: b, now: a, same: hit.filter((x) => x != null).length }];
  }),
);

/* ---------- the film's file: every at("line", …) read, and written again ---------- */

let src = readFileSync(PATH, "utf8");
const num = (x) => String(+x.toFixed(2));
const NUM = /^-?(\d+\.?\d*|\.\d+)$/;
// the end of a call's arguments, from just inside its «(»
const close = (s, from) => {
  let depth = 0, q = null;
  for (let i = from; i < s.length; i++) {
    const c = s[i];
    if (q) { if (c === "\\") i++; else if (c === q) q = null; continue; }
    if (c === '"' || c === "'" || c === "`") q = c;
    else if ("([{".includes(c)) depth++;
    else if (")]}".includes(c)) { if (depth === 0) return i; depth--; }
  }
  return -1;
};
// «0.2 + i * 0.3» → its terms, each with its sign
const terms = (s) => {
  const out = [];
  let depth = 0, cur = "", sign = "+";
  for (const c of s) {
    if ("([{".includes(c)) depth++;
    if (")]}".includes(c)) depth--;
    if (depth === 0 && (c === "+" || c === "-") && cur.trim() && !/[*/(,]\s*$/.test(cur)) { out.push({ sign, text: cur.trim() }); cur = ""; sign = c; }
    else if (depth === 0 && (c === "+" || c === "-") && !cur.trim()) sign = c === "-" ? (sign === "-" ? "+" : "-") : sign;
    else cur += c;
  }
  if (cur.trim()) out.push({ sign, text: cur.trim() });
  return out;
};
const changes = [], left = [];
const where = (c, d) => {
  if (d < 0) return "before the line";
  if (d >= c.now.len) return d < c.now.len + c.now.gap ? "in the pause after" : "after the line — in the next one";
  const w = c.now.words.find((x) => d < x.z) ?? c.now.words.at(-1);
  return `«${w.w}»`;
};
const rewrite = (line, arg) => {
  const c = carry[line];
  const text = arg.trim();
  if (/^["'`]/.test(text)) return null; // a word: already its own moment
  if (c === undefined) return void left.push(`at("${line}", ${text}) — the line was not in the film the scenes were drawn for`);
  if (c === null) return void left.push(`at("${line}", ${text}) — the line is not in the voice now`);
  if (NUM.test(text)) {
    const d = +text, to = c.f(d);
    if (Math.abs(to - d) < 0.005) return null;
    changes.push(`  ${line.padEnd(4)} ${text.padStart(6)} → ${num(to).padEnd(6)} ${where(c, to)}`);
    return num(to);
  }
  // a start and steps: the start is carried, a step is scaled
  const ts = terms(text);
  let ok = true;
  const out = ts.map((t) => {
    if (NUM.test(t.text)) return { ...t, text: t.sign === "-" ? t.text : num(c.f(+t.text)) };
    const m = t.text.match(/^([\w.$\[\]]+)\s*\*\s*(\d*\.?\d+)$/) ?? t.text.match(/^(\d*\.?\d+)\s*\*\s*([\w.$\[\]]+)$/);
    if (!m) { ok = false; return t; }
    const [x, n] = NUM.test(m[1]) ? [m[2], m[1]] : [m[1], m[2]];
    return { ...t, text: `${x} * ${num(+n * c.k)}` };
  });
  if (!ok) return void left.push(`at("${line}", ${text}) — not a start and steps: by hand`);
  const to = out.map((t, i) => (i === 0 ? (t.sign === "-" ? "-" : "") : ` ${t.sign} `) + t.text).join("");
  if (to === text) return null;
  changes.push(`  ${line.padEnd(4)} ${text} → ${to}   (steps × ${c.k.toFixed(2)})`);
  return to;
};
// the end card types its keyword a moment into its line: K.endcard(at("c10", -0.1), { …, typeAt: 1.2 })
src = src.replace(/(K\.endcard\(at\("([^"]+)",\s*(-?[\d.]+)\)\s*,\s*\{[^}]*?typeAt:\s*)([\d.]+)/g, (all, head, line, lead, t) => {
  const c = carry[line];
  if (!c) return all;
  const to = Math.max(0.2, c.f(+lead + +t) - +lead);
  if (Math.abs(to - +t) < 0.005) return all;
  changes.push(`  ${line.padEnd(4)} typeAt ${t} → ${num(to)}`);
  return head + num(to);
});
let out = "", i = 0;
const AT = /(?<![\w.$])at\(\s*"([^"]+)"\s*,/g;
for (let m; (m = AT.exec(src)); ) {
  if (m.index < i) continue; // inside a call already written again
  const from = m.index + m[0].length, to = close(src, from);
  if (to < 0) continue;
  const next = rewrite(m[1], src.slice(from, to));
  if (next == null) continue;
  out += src.slice(i, from) + " " + next;
  i = to;
}
src = out + src.slice(i);
for (const m of src.matchAll(/(?<![\w.$])at\(\s*([^"\s)][^,)]*),/g)) if (!/^-?[\d.]+$/.test(m[1].trim())) left.push(`at(${m[1].trim()}, …) — its line is not written there: by hand`);

/* ---------- said, and written ---------- */

console.log(`${NAME}: the scenes, from the voice they were drawn for to ${take.source}`);
for (const b of was) {
  const c = carry[b.id];
  console.log(c ? `  ${b.id.padEnd(4)} ${b.len.toFixed(2)} s → ${c.now.len.toFixed(2)} s  (× ${c.k.toFixed(2)}, ${c.same}/${b.words.length} words the same)  pause after ${(b.gap ?? 0).toFixed(2)} → ${c.now.gap.toFixed(2)}` : `  ${b.id.padEnd(4)} is not said any more`);
}
for (const a of now) if (!was.some((b) => b.id === a.id)) console.log(`  ${a.id.padEnd(4)} is new: ${a.len.toFixed(2)} s`);
console.log(changes.length ? `\n${changes.length} moments moved:\n${changes.join("\n")}` : "\nnothing to move");
if (left.length) console.log(`\nleft alone:\n${[...new Set(left)].map((x) => "  " + x).join("\n")}`);
if (DRY) process.exit(0);
writeFileSync(PATH, src);
save();
console.log(`\n${join("films", file)} written; drawn.json is this voice now.\nnow: node render.mjs ${id} --sheet --step 0.5`);
