/**
 * When each line of a film is said. One place for it: render.mjs films to these times, and the
 * videos page (social/videos/make.mjs) writes them down.
 *
 *   1. a whole take — voice/<film>/take.wav + take.json (take.mjs): the voice as it was said, every
 *      line and every word where it really is in it;
 *   2. else a file per line — voice/<film>/<line id>.wav (voice.mjs), one after the other, each
 *      line's `after` (or the film's `gap`) between them;
 *   3. else nothing: each line lasts as long as it takes to say.
 */
import { existsSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { voiceLength } from "./sound.mjs";

// a Derja line said in an ad, brisk: ~0.34 s a word, a breath before the next
const estimate = (text) => {
  const words = text.replace(/[*_~«»"]/g, "").split(/\s+/).filter(Boolean).length;
  return Math.max(0.8, 0.2 + words * 0.34);
};

/**
 * → { lines: [{ id, say, sub, start, end, voice, words? }], total, take, stale }
 *   take:  { file, at, source } when the voice is a whole take (it starts `at` seconds in)
 *   stale: the scenes were timed for another voice than the take (drawn.json — retime.mjs)
 */
export function whenSaid(film, voiceDir, { mute = false } = {}) {
  const lead = film.lead ?? 0.35;
  const TAKE = !mute && existsSync(join(voiceDir, "take.json")) && existsSync(join(voiceDir, "take.wav")) ? JSON.parse(readFileSync(join(voiceDir, "take.json"), "utf8")) : null;
  const lines = [];
  let cursor = lead, stale = false;
  if (TAKE) {
    const r3 = (x) => +(lead + x).toFixed(3);
    for (const l of film.lines) {
      const t = TAKE.lines.find((x) => x.id === l.id);
      if (!t) throw new Error(`the take has no line «${l.id}»: node take.mjs again, on the take`);
      lines.push({ id: l.id, say: l.say, sub: l.sub, start: r3(t.start), end: r3(t.end), voice: null, words: t.words.map((w) => ({ a: r3(w.a), z: r3(w.z) })) });
    }
    cursor = lead + TAKE.duration;
    const drawn = existsSync(join(voiceDir, "drawn.json")) ? JSON.parse(readFileSync(join(voiceDir, "drawn.json"), "utf8")).lines : null;
    stale = !!drawn && TAKE.lines.some((t) => Math.abs((drawn.find((d) => d.id === t.id)?.len ?? -1) - (t.end - t.start)) > 0.03);
  } else {
    for (const l of film.lines) {
      const v = mute ? null : ["wav", "mp3", "m4a"].map((x) => join(voiceDir, `${l.id}.${x}`)).find(existsSync);
      const len = l.dur ?? (v ? voiceLength(v) : estimate(l.say));
      cursor += l.before ?? 0;
      lines.push({ id: l.id, say: l.say, sub: l.sub, start: +cursor.toFixed(3), end: +(cursor + len).toFixed(3), voice: v ?? null });
      cursor += len + (l.after ?? film.gap ?? 0.16);
    }
  }
  return {
    lines,
    total: +(cursor + (film.tail ?? 1.2)).toFixed(3),
    take: TAKE ? { file: join(voiceDir, "take.wav"), at: lead, source: TAKE.source } : null,
    stale,
  };
}
