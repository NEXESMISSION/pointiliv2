/**
 * What to give OpenAI's voice studio (openai.fm, gpt-4o-mini-tts) for a film's voice:
 * `node tts.mjs f1` → voice/<film>/take.txt (the instructions and the lines) and, printed, a
 * snippet to paste in the browser's console on https://www.openai.fm/ — it asks the studio for
 * the voice, exactly as its Play button does, and downloads it (pointili-voice-f1.mp3).
 *
 * The studio refuses scripts (a bot check): this runs in a real browser, the site's own way.
 * Then: `node voice.mjs f1 <the mp3>` cuts it into the film's lines, `node render.mjs f1` films it.
 *
 * The lines go one per line (a pause at each); «Pointili» is written «بوانتيلي» so it is said the
 * French way; the instructions ask for Tunisian Derja, not Modern Standard Arabic. Voice: Ash.
 */
import { mkdirSync, readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";

const DIR = import.meta.dirname;
const [id, voice = "ash"] = process.argv.slice(2);
const file = readdirSync(join(DIR, "films")).find((f) => f === `${id}.mjs` || f.startsWith(`${id}-`));
if (!file) throw new Error(`no film «${id}»`);
const film = (await import(pathToFileURL(join(DIR, "films", file)).href)).default;
const NAME = file.replace(/\.mjs$/, "");

const spoken = (s) => s.replace(/[*~]/g, "").replace(/Pointili/g, "بوانتيلي");
const input = film.lines.map((l) => spoken(l.say)).join("\n");
export const PROMPT = [
  "Accent: Tunisian Arabic (Derja, Tounsi), a young man from Tunis. Read the Arabic-script Derja exactly as written, the way Tunisians speak it every day: Tunisian vowels, rhythm and melody. Not Modern Standard Arabic, not Egyptian, not Gulf, not Levantine.",
  "French words used in Tunisia (كارط, تامبون, كونتوار, أبليكاسيون, سيستام, كومونتار, ريميز, كادو) are said the Tunisian way, close to French. The brand «بوانتيلي» is said like the French «Pointili» (pwan-tee-lee).",
  "Tone: warm, friendly and confident — a popular Instagram ad voice-over telling a short story to café and shop owners.",
  "Pacing: lively but clear. A short pause at every line break. A little weight on the key words.",
].join("\n");
if (input.length > 1000 || PROMPT.length > 1000) throw new Error(`too long for the studio: input ${input.length}, prompt ${PROMPT.length} (max 1000 each)`);

const out = join(DIR, "voice", NAME);
mkdirSync(out, { recursive: true });
writeFileSync(join(out, "take.txt"), `voice: ${voice}\n\n${PROMPT}\n\n${input}\n`);
console.log(`// on https://www.openai.fm/, in the console (F12):
const r = await fetch("/api/generate?" + new URLSearchParams(${JSON.stringify({ input, prompt: PROMPT, voice, vibe: "pointili" })}));
const a = document.createElement("a"); a.href = URL.createObjectURL(await r.blob()); a.download = "pointili-voice-${id}.mp3"; a.click();`);
