/**
 * The six type sizes of the owner's and the customer's screens — 12, 13, 15,
 * 17, 20 and 24 px at a 16px rem (0.75 · 0.8125 · 0.9375 · 1.0625 · 1.25 ·
 * 1.5rem). Display sizes (2rem and up: the counter's title, a price, a
 * bravo) and 16–17px inputs (iOS zooms into anything smaller) are allowed.
 * The founder's console, the card itself (Pass), the wheel, the front door
 * and the reading pages are their own designs and are left out.
 *
 *   node scripts/type-scale.mjs        (from v2/: lists every size off the scale, exits 1 if any)
 */
import { readFileSync } from "node:fs";
import { execSync } from "node:child_process";

const SCALE = new Set(["0.75", "0.8125", "0.9375", "1.0625", "1.25", "1.5"]);
const OUT = /^(app\/admin|components\/(Admin|console|Console|Crm|Traffic|HeatMap|Pass\.tsx|Wheel\.tsx|Welcome|SiteFrame|PlanImage|Presence)|app\/(prix|faq|guide|privacy|llms))/;
const files = execSync("git ls-files app components", { encoding: "utf8" })
  .split("\n")
  .filter((f) => f.endsWith(".tsx") && !OUT.test(f));
let off = 0;
for (const f of files) {
  const lines = readFileSync(f, "utf8").split("\n");
  lines.forEach((line, i) => {
    for (const m of line.matchAll(/text-\[([0-9.]+)(rem|px)\]/g)) {
      const [, v, unit] = m;
      const ok = unit === "px" ? v === "16" || v === "17" : SCALE.has(v) || Number(v) >= 2;
      if (!ok) {
        off++;
        console.log(`${f}:${i + 1}  text-[${v}${unit}]`);
      }
    }
  });
}
console.log(off ? `\n${off} sizes off the scale` : `every size on the scale (${files.length} files)`);
process.exit(off ? 1 : 0);
