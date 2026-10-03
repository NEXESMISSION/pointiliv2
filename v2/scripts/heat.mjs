/**
 * The pictures under the founder's heat maps: every screen as it looks on a
 * 390×844 phone, taken by the walk, saved small in public/heat/<screen>.webp
 * (the name the traffic page asks for: "/shop/card:goal" → shop-card-goal).
 *
 *   SIZE=390x844 OUT=.e2e/heat-src node scripts/walk.mjs
 *   node scripts/heat.mjs .e2e/heat-src        (from v2/)
 */
import { existsSync, mkdirSync } from "node:fs";
import sharp from "sharp";

const from = process.argv[2] || ".e2e/heat-src";
const to = "public/heat";
mkdirSync(to, { recursive: true });

// the walk's picture → the screen it shows
const SCREENS = {
  "01-welcome": "welcome",
  "02-owner-account": "shop-new",
  "03-owner-shop": "shop-setup",
  "04a-card-hello": "shop-card-hello",
  "04b-card-goal": "shop-card-goal",
  "04c-card-gift": "shop-card-gift",
  "04d-card-color": "shop-card-color",
  "04-owner-card": "shop-card-ready",
  "05a-bravo": "shop-qr-bravo",
  "05b-tip": "shop-qr-tip",
  "05-counter": "shop-qr-code",
  "06-reserved": "s-token-held",
  "07-join": "join",
  "08-stamped": "s-token-stamped",
  "13-wallet": "wallet",
  "14-card": "c-id",
  "15-scanner": "scan",
  "16-account": "me",
  "17-owner-home": "shop",
  "19-owner-customers": "shop-customers",
  "17b-card-change": "shop-card-edit-ready",
  "18-login": "login",
  "18b-forgot": "forgot",
};

let n = 0;
for (const [shot, screen] of Object.entries(SCREENS)) {
  const src = `${from}/${shot}.png`;
  if (!existsSync(src)) {
    console.log(`  · ${shot}: no picture`);
    continue;
  }
  const { size } = await sharp(src).resize({ width: 390 }).webp({ quality: 68 }).toFile(`${to}/${screen}.webp`);
  console.log(`  ✓ ${screen}.webp (${Math.round(size / 1024)} KB)`);
  n++;
}
console.log(`${n} pictures in ${to}`);
