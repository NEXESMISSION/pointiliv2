/** SCRIPTS.md, made from the films themselves (node scripts.mjs): what to say, line by line, to record a voice. */
import { readdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { pathToFileURL } from "node:url";
const DIR = import.meta.dirname;
const MODEL = {
  f1: "a two-cafés story reel (Daayem's): an illustrated story, a voice telling it, subtitles under it",
  f2: "a barber-shop reel (QuickStamp's): flat motion graphics, big words, «send this to a friend»",
  f3: "a «reply to a comment» reel (menuos's): the question stickered on, the product answering",
  f4: "an «idea for your business» reel (forsa's): one big word at a time over the pictures",
  f5: "a café-chaos comic reel (Ayyatli's): the problem in bursts, then «the fix is simple»",
  f6: "kinetic numbers on a dark board: 200 customers, one more visit, 2400 coffees a year",
  f7: "a prize wheel under stadium lights: the app's wheel (الروليت)",
  f8: "a chat story for online sellers: a tampon sent as a link on WhatsApp",
  f9: "a little noir: the photographed code that no longer works",
  f10: "a stopwatch speedrun: the card made in under two minutes",
  f11: "trading cards: the regular, the drifting one, the lost one — and «شكون رجع؟»",
  f12: "a countdown: the reset clock the owner turns on (and pauses)",
  f13: "quick cuts on the beat: your colour and your logo on every tampon",
  f14: "a photo tour of the trades (ChatGPT photos), each with its own gift",
  f15: "an arcade store: tampons spent on things from the shop (الماغازة)",
};
let md = `# Pointili — the video ads: what is said\n\nEach film is said in Derja, a line at a time — the lines below are the ones the voices say now (a person reading, one take a film). To give a film another voice: record its lines **in one take**, on any phone (a quiet room, the phone 20 cm away), then\n\n\`\`\`\nnode take.mjs f1 "C:/path/to/take.wav"\nnode retime.mjs f1\nnode render.mjs f1\n\`\`\`\n\nThe take is heard on this computer and kept whole; the film re-times to it: scenes and subtitles follow the real voice. Say a line another way than it is written and the film's line must change with it (edit it in films/, then \`node scripts.mjs\`): the subtitle shows what is heard.\n\nNothing in these films promises a notification: the customer sees the card on his phone, the owner writes to him himself, on WhatsApp.\n`;
for (const f of readdirSync(join(DIR, "films")).filter((x) => x.endsWith(".mjs")).sort()) {
  const film = (await import(pathToFileURL(join(DIR, "films", f)).href)).default;
  const id = f.split("-")[0];
  md += `\n## ${id} — ${film.title}\n\n_Built like ${MODEL[id] ?? "a reel"}._ File: \`out/${f.replace(".mjs", ".mp4")}\`\n\n`;
  film.lines.forEach((l, i) => { md += `${i + 1}. ${l.say.replace(/[*~]/g, "")}\n`; });
}
writeFileSync(join(DIR, "SCRIPTS.md"), md);
console.log("SCRIPTS.md written");
