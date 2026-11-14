/**
 * One page to watch the fifteen ads: `node gallery.mjs` → out/index.html (open it in a browser),
 * with a still of each film in out/posters/.
 *
 * Each film: its number and name, how long it is, what it says in one line, the film itself, and
 * its lines as the voice says them. With `--before <git ref>` (the films before their voice
 * changed, e.g. 19c0e66), each film also lists the lines that were written another way then.
 *
 *   node gallery.mjs --before 19c0e66
 *   node gallery.mjs --bare <file>     the same page without its <head>, for a claude.ai Artifact
 */
import { execFileSync } from "node:child_process";
import { existsSync, mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DIR = import.meta.dirname;
const OUT = join(DIR, "out");
const argv = process.argv.slice(2);
const opt = (name) => { const i = argv.indexOf(`--${name}`); return i >= 0 ? argv[i + 1] : null; };
const BEFORE = opt("before");
const BARE = opt("bare");
const FF = process.env.FFMPEG || "ffmpeg";
const FFPROBE = FF.replace(/ffmpeg(\.exe)?$/, "ffprobe$1");

// what each film says, in a line
const ABOUT = {
  f1: "زوز قهاوي في نفس الشارع، وحدة يرجعولها الحرفاء: عندها سيستام.",
  f2: "الحريف اللي غاب، الكارط في تليفونو، وتامبون هدية في الواتساب.",
  f3: "«لازمو يحمّل أبليكاسيون؟» لا: يسكاني، كونت في عشر ثواني، والتامبون يطيح.",
  f4: "فكرة لمحلّك: كارط فيدليتي بسيطة، والكادو موش بعيد برشا.",
  f5: "فوضى الكارط الكرتون، والحل: الكود على الكونتوار.",
  f6: "200 حريف، مرّة زايدة في الشهر: 2400 قهوة في العام.",
  f7: "يكمّل الكارط، يدوّر الروليت، والكادو يطلع بالحظ.",
  f8: "تبيع في الأنستغرام؟ تامبون برابط في الواتساب بعد كل كوموند.",
  f9: "الكود يتبدّل وحدو ويخدم مرّة برك: التصويرة ما تنفعش.",
  f10: "الكارط حاضرة في دقيقتين، من التليفون.",
  f11: "ديما يجي، بدا يبعد، ضاع: Pointili يقسّمهم وحدو.",
  f12: "العدّاد: الكارط ترجع للصفر كان غاب، وتوقفو في رمضان.",
  f13: "الكارط بلونك، واللوغو متاعك على كل تامبون.",
  f14: "حجّام، حلواني، بارفيمري… كل محل وكادو متاعو.",
  f15: "التامبونات تولّي فلوس في الماغازة متاعك.",
};

const esc = (s) => String(s).replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;").replace(/"/g, "&quot;");
const marked = (s) => esc(s).replace(/\*([^*]+)\*/g, '<b class="hl">$1</b>').replace(/~([^~]+)~/g, "<s>$1</s>");
const plain = (s) => s.replace(/[*~]/g, "");
const linesOf = (src) => {
  const a = src.indexOf("  lines: [");
  const block = src.slice(a, src.indexOf("  ],", a));
  return [...block.matchAll(/\{ id: "(\w+)", say: "([^"]*)"/g)].map((m) => ({ id: m[1], say: m[2] }));
};

mkdirSync(join(OUT, "posters"), { recursive: true });
const files = readdirSync(join(DIR, "films")).filter((f) => /^f\d+-.*\.mjs$/.test(f)).sort((a, b) => parseInt(a.slice(1)) - parseInt(b.slice(1)));
const films = [];
for (const file of files) {
  const name = file.replace(/\.mjs$/, "");
  const id = name.split("-")[0];
  const mp4 = join(OUT, `${name}.mp4`);
  if (!existsSync(mp4)) { console.log(`  (${name}: no film in out/ yet)`); continue; }
  const film = (await import(pathToFileURL(join(DIR, "films", file)).href)).default;
  const duration = Number(execFileSync(FFPROBE, ["-v", "error", "-show_entries", "format=duration", "-of", "csv=p=0", mp4]).toString());
  // a still from its middle, small: the page loads them, not the films
  execFileSync(FF, ["-v", "error", "-y", "-ss", (duration * 0.4).toFixed(2), "-i", mp4, "-frames:v", "1", "-vf", "scale=540:-2", "-q:v", "5", join(OUT, "posters", `${name}.jpg`)]);
  let changed = [];
  if (BEFORE) {
    try {
      const was = linesOf(execFileSync("git", ["show", `${BEFORE}:social/ads/films/${file}`], { cwd: DIR, maxBuffer: 1 << 24 }).toString());
      const now = film.lines;
      changed = was.flatMap((w) => {
        const n = now.find((x) => x.id === w.id);
        if (!n) return [{ was: plain(w.say), now: null }];
        return plain(n.say) !== plain(w.say) ? [{ was: plain(w.say), now: plain(n.say) }] : [];
      });
    } catch { /* not in that ref */ }
  }
  films.push({ id, name, title: film.title, about: ABOUT[id] ?? "", duration, lines: film.lines.map((l) => l.say), changed });
}
const total = films.reduce((s, f) => s + f.duration, 0);
const sec = (s) => `${Math.round(s)} ث`;

const card = (f) => `
  <article class="film" id="${f.id}">
    <div class="screen"><video controls playsinline preload="none" poster="posters/${f.name}.jpg" src="${f.name}.mp4" aria-label="${esc(f.title)}"></video></div>
    <div class="meta">
      <div class="head"><span class="num">${f.id.slice(1)}</span><h2>${esc(f.title)}</h2><span class="len">${sec(f.duration)}</span></div>
      <p class="about">${esc(f.about)}</p>
      <details><summary>النص كيما يتقال <span class="count">${f.lines.length} جمل</span></summary>
        <ol class="lines">${f.lines.map((l) => `<li>${marked(l)}</li>`).join("")}</ol>
        <button type="button" class="copy" data-copy="${esc(f.lines.map(plain).join("\n"))}">انسخ النص</button>
      </details>
      ${f.changed.length ? `<details class="diff"><summary>اللي تبدّل في النص <span class="count">${f.changed.length}</span></summary>
        <ul>${f.changed.map((c) => `<li><del>${esc(c.was)}</del>${c.now ? `<ins>${esc(c.now)}</ins>` : `<em>ما تقالتش: تنحّات</em>`}</li>`).join("")}</ul>
      </details>` : ""}
      <span class="file">out/${f.name}.mp4</span>
    </div>
  </article>`;

const body = `<title>فيديوات Pointili</title>
<meta name="claude:viewport-fit-sides" content="cover">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link rel="stylesheet" href="https://fonts.googleapis.com/css2?family=Readex+Pro:wght@300;400;500;600;700&display=swap">
<style>
/* layout: a contact sheet of vertical films — each its screen, then its name and what it says */
:root{
  --bg:#f5f3fb; --card:#ffffff; --fg:#17142a; --muted:#686483; --line:#e3dff0;
  --accent:#6c47ff; --accent-soft:#efeaff; --coral:#e2543a; --coral-soft:#fff0ec; --ok:#0f8a55; --ok-soft:#e7f7ef;
  --screen:#0f0e17;
  --font:"Readex Pro",system-ui,"Segoe UI",Tahoma,sans-serif;
}
@media (prefers-color-scheme: dark){:root:not([data-theme="light"]){
  --bg:#110f18; --card:#1a1724; --fg:#ece9f7; --muted:#9a95b5; --line:#2b2740;
  --accent:#a48dff; --accent-soft:#262040; --coral:#ff8c73; --coral-soft:#2e1d1a; --ok:#4fd39a; --ok-soft:#14281f; --screen:#000;
  color-scheme:dark}}
:root[data-theme="dark"]{
  --bg:#110f18; --card:#1a1724; --fg:#ece9f7; --muted:#9a95b5; --line:#2b2740;
  --accent:#a48dff; --accent-soft:#262040; --coral:#ff8c73; --coral-soft:#2e1d1a; --ok:#4fd39a; --ok-soft:#14281f; --screen:#000;
  color-scheme:dark}
body{background:var(--bg);color:var(--fg);font-family:var(--font);font-size:15px;line-height:1.6;direction:rtl;
  padding-left:max(16px,env(safe-area-inset-left,0px));padding-right:max(16px,env(safe-area-inset-right,0px));padding-block:28px 48px}
.wrap{max-width:1240px;margin:0 auto;display:flex;flex-direction:column;gap:26px}
header{display:flex;flex-wrap:wrap;align-items:flex-end;justify-content:space-between;gap:12px 24px}
header h1{margin:0;font-size:clamp(26px,4vw,38px);font-weight:700;letter-spacing:-.01em;text-wrap:balance}
header h1 span{color:var(--accent)}
header p{margin:6px 0 0;color:var(--muted);max-width:62ch}
.facts{display:flex;gap:8px;flex-wrap:wrap}
.facts span{background:var(--card);border:1px solid var(--line);border-radius:999px;padding:4px 14px;font-size:14px;font-variant-numeric:tabular-nums;white-space:nowrap}
.grid{display:grid;grid-template-columns:repeat(auto-fill,minmax(250px,1fr));gap:22px}
.film{background:var(--card);border:1px solid var(--line);border-radius:18px;overflow:hidden;display:flex;flex-direction:column;min-width:0}
.screen{background:var(--screen);aspect-ratio:9/16;max-width:100%}
.screen video{display:block;width:100%;height:100%;object-fit:contain;background:var(--screen)}
.meta{padding:14px 16px 16px;display:flex;flex-direction:column;gap:10px;min-width:0}
.head{display:flex;align-items:center;gap:10px}
.num{flex:none;width:30px;height:30px;border-radius:9px;background:var(--accent-soft);color:var(--accent);display:grid;place-items:center;font-weight:600;font-size:14px;font-variant-numeric:tabular-nums}
.head h2{margin:0;font-size:18px;font-weight:600;flex:1;min-width:0;text-wrap:balance}
.len{color:var(--muted);font-size:13px;font-variant-numeric:tabular-nums;white-space:nowrap}
.about{margin:0;color:var(--muted);font-size:14px}
details{border-top:1px solid var(--line);padding-top:8px}
summary{cursor:pointer;font-weight:500;font-size:14px;list-style:none;display:flex;align-items:center;gap:8px}
summary::-webkit-details-marker{display:none}
summary::before{content:"";width:7px;height:7px;border-left:2px solid currentColor;border-bottom:2px solid currentColor;transform:rotate(45deg);transition:transform .15s}
details[open]>summary::before{transform:rotate(-45deg)}
summary:focus-visible,.copy:focus-visible,video:focus-visible{outline:2px solid var(--accent);outline-offset:3px;border-radius:6px}
.count{color:var(--muted);font-weight:400;font-size:12px}
.lines{margin:10px 0 0;padding-inline-start:22px;display:flex;flex-direction:column;gap:6px;font-size:14.5px}
.lines li::marker{color:var(--muted);font-size:12px;font-variant-numeric:tabular-nums}
.hl{color:var(--accent);font-weight:600}
.copy{margin-top:10px;font:inherit;font-size:13px;color:var(--accent);background:var(--accent-soft);border:0;border-radius:999px;padding:5px 14px;cursor:pointer}
.diff summary{color:var(--coral)}
.diff ul{margin:10px 0 0;padding:0;list-style:none;display:flex;flex-direction:column;gap:10px;font-size:14px}
.diff li{display:flex;flex-direction:column;gap:2px}
.diff del{color:var(--muted);text-decoration-color:var(--coral)}
.diff ins{text-decoration:none;color:var(--ok);background:var(--ok-soft);border-radius:6px;padding:1px 6px;align-self:flex-start}
.diff em{font-style:normal;color:var(--coral);background:var(--coral-soft);border-radius:6px;padding:1px 6px;align-self:flex-start}
.file{color:var(--muted);font-size:12px;direction:ltr;text-align:left;word-break:break-all}
@media (prefers-reduced-motion: reduce){summary::before{transition:none}}
</style>
<div class="wrap">
  <header>
    <div>
      <h1>فيديوات <span>Pointili</span></h1>
      <p>${films.length} فيديو بالصوت الجديد: كل جملة مكتوبة كيما تتقال، وكل حاجة تطلع في التصويرة وقت الكلمة متاعها.</p>
    </div>
    <div class="facts"><span>${films.length} فيديو</span><span>${Math.floor(total / 60)} دقايق و ${Math.round(total % 60)} ثانية في الكل</span><span dir="ltr">1080 × 1920 · 9:16</span></div>
  </header>
  <section class="grid">${films.map(card).join("")}
  </section>
</div>
<script>
// one film plays at a time
const vids = [...document.querySelectorAll("video")];
vids.forEach((v) => v.addEventListener("play", () => vids.forEach((o) => { if (o !== v) o.pause(); })));
document.querySelectorAll(".copy").forEach((b) => b.addEventListener("click", async () => {
  const text = b.dataset.copy, label = b.textContent;
  try { await navigator.clipboard.writeText(text); b.textContent = "تنسخ ✓"; }
  catch { const r = document.createRange(); r.selectNodeContents(b.previousElementSibling); getSelection().removeAllRanges(); getSelection().addRange(r); b.textContent = "مختار: انسخو"; }
  setTimeout(() => (b.textContent = label), 1600);
}));
</script>
`;
writeFileSync(join(OUT, "index.html"), `<!doctype html>\n<html lang="ar" dir="rtl"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width,initial-scale=1,viewport-fit=cover">\n${body}`);
if (BARE) writeFileSync(BARE, body);
console.log(`out/index.html: ${films.length} films, ${Math.round(total)} s${BARE ? ` · ${BARE}` : ""}`);
