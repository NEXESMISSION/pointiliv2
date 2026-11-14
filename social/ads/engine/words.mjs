/**
 * Words: the ones a film's line shows, the way they are said, and which heard word is which.
 * take.mjs matches a script to what was heard in a take; retime.mjs matches a line as it was
 * said by one voice to the same line said by another. One way of comparing words for both.
 */

/** a word as it is compared: no vowel marks, one alef, no punctuation */
export const norm = (s) =>
  s.replace(/[ً-ٰٟـ]/g, "").replace(/[إأآٱ]/g, "ا").replace(/ى/g, "ي").replace(/ة/g, "ه").replace(/[^\p{L}\p{N}]+/gu, " ").trim().toLowerCase();
/** a line as it is said: its marks off, «Pointili» the way a voice says it (and Whisper writes it) */
export const spoken = (s) => s.replace(/[*~«»"]/g, "").replace(/Pointili/gi, "بوانتيلي");
/** the words of a line as the film shows them (engine/kit.js tokens): *…* and ~…~ are marks, not letters */
export const shown = (s) => s.replace(/[*~]/g, "").split(/\s+/).filter(Boolean);

/** how alike two words are, 0…1 (1 − their edit distance over the longer one) */
export const lev = (a, b) => {
  if (!a.length || !b.length) return 0;
  const d = Array.from({ length: a.length + 1 }, (_, i) => [i, ...Array(b.length).fill(0)]);
  for (let j = 1; j <= b.length; j++) d[0][j] = j;
  for (let i = 1; i <= a.length; i++) for (let j = 1; j <= b.length; j++) d[i][j] = Math.min(d[i - 1][j] + 1, d[i][j - 1] + 1, d[i - 1][j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
  return 1 - d[a.length][b.length] / Math.max(a.length, b.length);
};
// a number is heard as its word («200» ← «ميتين»): any word may stand for it, at a small price
const isNum = (s) => /^\d+$/.test(s);
export const like = (a, b) => (isNum(a) !== isNum(b) ? 0.5 : lev(a, b));

/**
 * Two lists of words ({ n }: the word, normed), each in its own order: which of the second each of
 * the first is. One alignment for the whole of both — a word that has no like sits out, on either
 * side. → for every word of `a`, its index in `b`, or null.
 */
export function match(a, b) {
  const n = a.length, m = b.length;
  const S = Array.from({ length: n + 1 }, () => new Float32Array(m + 1));
  const B = Array.from({ length: n + 1 }, () => new Uint8Array(m + 1));
  for (let i = 1; i <= n; i++) { S[i][0] = -0.6 * i; B[i][0] = 1; }
  for (let j = 1; j <= m; j++) { S[0][j] = -0.4 * j; B[0][j] = 2; }
  for (let i = 1; i <= n; i++)
    for (let j = 1; j <= m; j++) {
      const sim = like(a[i - 1].n, b[j - 1].n);
      const diag = S[i - 1][j - 1] + (sim >= 0.5 ? sim : -0.7);
      const up = S[i - 1][j] - 0.6, left = S[i][j - 1] - 0.4;
      [S[i][j], B[i][j]] = diag >= up && diag >= left ? [diag, 0] : up >= left ? [up, 1] : [left, 2];
    }
  const hit = new Array(n).fill(null);
  for (let i = n, j = m; i > 0 || j > 0; ) {
    if (i > 0 && j > 0 && B[i][j] === 0) { if (like(a[i - 1].n, b[j - 1].n) >= 0.5) hit[i - 1] = j - 1; i--; j--; }
    else if (i > 0 && (j === 0 || B[i][j] === 1)) i--;
    else j--;
  }
  return hit;
}

/**
 * Every word of a script gets a time: its heard word's (`a`, `z` already set), or — not heard —
 * its share, by its length, of the room between its neighbours (`from`…`to` at the two ends).
 */
export function spread(words, from, to) {
  for (let k = 0; k < words.length; ) {
    if (words[k].a != null) { k++; continue; }
    let e = k;
    while (e < words.length && words[e].a == null) e++;
    const lo = k > 0 ? words[k - 1].z : from, hi = e < words.length ? words[e].a : to;
    const total = words.slice(k, e).reduce((x, w) => x + w.text.length + 1, 0);
    let at = 0;
    for (let q = k; q < e; q++) {
      words[q].a = lo + (Math.max(0, hi - lo) * at) / total;
      at += words[q].text.length + 1;
      words[q].z = lo + (Math.max(0, hi - lo) * at) / total;
    }
    k = e;
  }
  return words;
}
