/**
 * Installs Pointili Typo as an app you open from the taskbar.
 *
 *   node social/typo/install-app.mjs            → install, then open it
 *   node social/typo/install-app.mjs --no-open  → install only
 *
 * Same trick as Pointili Captions: the page is copied to
 * %LOCALAPPDATA%\Pointili Typo, an .ico is built from the Typo mark, and a
 * shortcut opens it in a Chromium app window with its own profile, so it has
 * its own icon in the taskbar, no tabs and no address bar. Fabric.js ships in
 * the folder; only the Google fonts still come from the web (cached after the
 * first run). Delete the folder and the shortcuts and it is gone.
 */
import { mkdir, copyFile, writeFile, cp } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile, spawn } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const HOME = os.homedir();
const NAME = "Pointili Typo";
const APP = path.join(process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local"), NAME);
const LINK = path.join(HOME, "Desktop", `${NAME}.lnk`);
const START = path.join(process.env.APPDATA || path.join(HOME, "AppData", "Roaming"), "Microsoft", "Windows", "Start Menu", "Programs", `${NAME}.lnk`);

const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

/** A .ico may simply hold a PNG since Vista: one 256px PNG and a 22-byte header is a complete icon. */
async function buildIco(pngPath, outPath) {
  const png = await sharp(pngPath).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const header = Buffer.alloc(6); header.writeUInt16LE(0, 0); header.writeUInt16LE(1, 2); header.writeUInt16LE(1, 4);
  const entry = Buffer.alloc(16); entry[0] = 0; entry[1] = 0; entry[2] = 0; entry[3] = 0; entry.writeUInt16LE(1, 4); entry.writeUInt16LE(32, 6); entry.writeUInt32LE(png.length, 8); entry.writeUInt32LE(header.length + entry.length, 12);
  await writeFile(outPath, Buffer.concat([header, entry, png]));
}

async function main() {
  const browser = BROWSERS.find((b) => b && existsSync(b));
  if (!browser) throw new Error("No Chrome or Edge found — install either one, then run this again.");

  await mkdir(APP, { recursive: true });
  await copyFile(path.join(DIR, "index.html"), path.join(APP, "index.html"));
  await cp(path.join(DIR, "vendor"), path.join(APP, "vendor"), { recursive: true });
  await sharp(path.join(DIR, "icon.svg"), { density: 384 }).resize(512, 512).png().toFile(path.join(APP, "icon.png"));
  await buildIco(path.join(APP, "icon.png"), path.join(APP, "icon.ico"));

  const url = "file:///" + path.join(APP, "index.html").replace(/\\/g, "/");
  const args = `--app="${url}" --window-size=1500,940 --user-data-dir="${path.join(APP, "profile")}" --no-first-run --no-default-browser-check`;
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const ps = `
$s = (New-Object -ComObject WScript.Shell).CreateShortcut(${q(LINK)})
$s.TargetPath = ${q(browser.replace(/\//g, "\\"))}
$s.Arguments = ${q(args)}
$s.WorkingDirectory = ${q(APP)}
$s.IconLocation = ${q(path.join(APP, "icon.ico"))}
$s.Description = 'Arabic typography for the reels: words, paper, accents, transparent PNG'
$s.Save()
`;
  await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps]);
  await mkdir(path.dirname(START), { recursive: true });
  await copyFile(LINK, START);

  console.log(`installed   ${APP}`);
  console.log(`shortcut    ${LINK}`);
  console.log(`start menu  ${START}`);
  console.log(`window      ${path.basename(browser)} in app mode, own profile, own icon`);
  if (!process.argv.includes("--no-open")) {
    // open it the way the shortcut does (same browser, same arguments, same profile)
    const argList = [`--app=${url}`, "--window-size=1500,940", `--user-data-dir=${path.join(APP, "profile")}`, "--no-first-run", "--no-default-browser-check"];
    await run("powershell.exe", ["-NoProfile", "-Command", `Start-Process -FilePath ${q(browser.replace(/\//g, "\\"))} -ArgumentList @(${argList.map((a) => q(a)).join(", ")})`]);
    console.log(`opened      the app window`);
  }
  console.log(`\nTo pin it: while the window is open, right-click its icon in the taskbar → Pin to taskbar.`);
  console.log(`It is in the Start menu too: press Windows and type Typo.`);
}

await main();
