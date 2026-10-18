/**
 * The clip that shows an owner how the wheel is set up, filmed off the real
 * screen: three prizes written, the chances shared out, saved, and the switch
 * turned on. It lands in public/clips as the others do — 540×960, no sound,
 * H.264, small enough for a phone on a data plan — with a still beside it for
 * the first frame.
 *
 *   node scripts/wheel-clip.mjs      (from v2/, dev server on :3200 — or BASE=)
 *
 * A new cut is a new name: wheel-set-v2.mp4.
 */
import { execFileSync } from "node:child_process";
import { mkdirSync, readdirSync, renameSync, rmSync } from "node:fs";
import { join } from "node:path";
import { config } from "dotenv";
import sharp from "sharp";
import { chromium } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = process.env.BASE || "http://localhost:3200";
const NAME = process.env.NAME || "wheel-set-v1";
const OUT = "public/clips";
const RAW = ".e2e/wheel-clip";
mkdirSync(OUT, { recursive: true });
rmSync(RAW, { recursive: true, force: true });
mkdirSync(RAW, { recursive: true });
const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const PASS = "wheel-clip-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "first_scan", "first_gift", "mission"];
const PRIZES = ["قهوة بلاش", "كرواسون", "ريميز 20%"];
const made = [];
const phones = [];

for (const ip of ["local", "::1", "127.0.0.1"]) await admin.rpc("forget_tries", { p_key: `login-ip:${ip}` });

async function person(name) {
  const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(d);
  const { data, error } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
  if (error) throw error;
  made.push(data.user.id);
  await admin.from("people").upsert({ id: data.user.id, name, phone: `+216${d}`, seen: NOTES });
  return { id: data.user.id, digits: d };
}

console.log("setting up…");
const owner = await person("صاحب المحل");
const { error: shopErr } = await admin.from("shops").insert({ owner_id: owner.id, name: "Café Pointili", kind: "cafe", color: "#6C47FF", goal: 8, gift: "قهوة بلاش", wheel_allowed: true, created_at: new Date(Date.now() - 9 * 86_400_000).toISOString() });
if (shopErr) throw shopErr;

const browser = await chromium.launch({ executablePath: "C:/Program Files/Google/Chrome/Application/chrome.exe", headless: true });
// the dev server's own badge would be filmed with everything else
const HIDE = "nextjs-portal{display:none!important}";
try {
  // signed in first, in a context that is not filmed: the clip starts on the wheel
  const warm = await browser.newContext({ viewport: { width: 540, height: 960 }, locale: "ar-TN" });
  const lead = await warm.newPage();
  await lead.goto(`${BASE}/login`, { waitUntil: "load", timeout: 90000 });
  await lead.locator('input[name="phone"]').fill(owner.digits);
  await lead.locator('input[name="password"]').fill(PASS);
  await Promise.all([lead.waitForURL((u) => !u.pathname.startsWith("/login"), { timeout: 90000 }), lead.locator('button[type="submit"]').click()]);
  const state = await warm.storageState();
  await warm.close();

  const ctx = await browser.newContext({
    viewport: { width: 540, height: 960 },
    locale: "ar-TN",
    storageState: { cookies: state.cookies, origins: [] },
    recordVideo: { dir: RAW, size: { width: 540, height: 960 } },
  });
  await ctx.addInitScript(() => {
    const css = document.createElement("style");
    css.textContent = "nextjs-portal{display:none!important}";
    document.documentElement.append(css);
  });
  const p = await ctx.newPage();
  await p.goto(`${BASE}/shop/wheel`, { waitUntil: "load", timeout: 90000 });
  await p.addStyleTag({ content: HIDE }).catch(() => {});
  await p.waitForTimeout(1200);

  // three prizes, typed the way a thumb types them
  const field = p.getByPlaceholder("زيد كادو");
  for (const name of PRIZES) {
    await field.click();
    await field.type(name, { delay: 110 });
    await p.waitForTimeout(260);
    await p.getByRole("button", { name: "زيد كادو" }).click();
    await p.waitForTimeout(520);
  }

  // the chances shared out in one tap, then saved
  await p.waitForTimeout(500);
  const even = p.getByRole("button", { name: "قسّم بالتساوي" });
  if (await even.count()) {
    await even.click();
    await p.waitForTimeout(900);
  }
  await p.getByRole("button", { name: "سجّل" }).click();
  await p.waitForTimeout(1500);

  // and turned on for the customers
  const sw = p.getByRole("switch", { name: "خدّم الروليت للحرفاء" }).or(p.getByLabel("خدّم الروليت للحرفاء"));
  await sw.first().click({ timeout: 20000 });
  await p.waitForTimeout(2200);

  await ctx.close();
  const webm = readdirSync(RAW).find((f) => f.endsWith(".webm"));
  if (!webm) throw new Error("nothing was filmed");
  const src = join(RAW, webm);

  // The same shape as the other clips: H.264 so an iPhone plays it, no sound, small. The first
  // seconds are the page still painting, so they go; and it is played at 1.6x — a browser driven
  // by a script types at a crawl, and nobody watches a popup for twenty seconds. 13 s, half a MB.
  // Cut to the wheel, the prizes and the save button: the header and the foot of the screen carry
  // nothing, and a 9:16 clip inside a popup's card shrinks to a thumbnail nobody can follow.
  execFileSync("ffmpeg", ["-y", "-ss", "2.4", "-i", src, "-t", "19.6", "-an", "-c:v", "libx264", "-preset", "slow", "-b:v", "430k", "-maxrate", "600k", "-bufsize", "1200k", "-vf", "setpts=PTS/1.6,crop=540:720:0:170,scale=540:720:flags=lanczos,fps=24", "-pix_fmt", "yuv420p", "-movflags", "+faststart", mp4], { stdio: "pipe" });
  // the still shown before it plays: late enough that the wheel is already drawn
  const png = join(RAW, "poster.png");
  execFileSync("ffmpeg", ["-y", "-ss", "5", "-i", mp4, "-vframes", "1", png], { stdio: "pipe" });
  await sharp(png).webp({ quality: 72 }).toFile(join(OUT, `${NAME}.webp`));
  renameSync(src, join(RAW, "raw.webm"));
  console.log(`\n${NAME}.mp4 and ${NAME}.webp are in ${OUT}`);
} finally {
  await browser.close();
  for (const id of made) await admin.auth.admin.deleteUser(id).catch(() => {});
  await unrobot(admin, phones);
  console.log("(accounts removed)");
}
