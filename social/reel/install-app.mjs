/**
 * Installs Pointili Captions as an app you open from the desktop.
 *
 *   node social/reel/install-app.mjs
 *
 * It copies the app to %LOCALAPPDATA%\Pointili Captions, builds an .ico from
 * the product mark, and writes a desktop shortcut that opens it in a Chromium
 * app window — no tabs, no address bar, its own icon in the taskbar. That is
 * the whole trick: a browser in --app mode IS the window, and because the page
 * is local and top-level it can write files with the real Save dialog.
 *
 * Nothing is installed system-wide and nothing runs in the background; delete
 * the folder and the shortcut and it is gone.
 */
import { mkdir, copyFile, writeFile, readFile } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import path from "node:path";
import os from "node:os";
import sharp from "sharp";

const run = promisify(execFile);
const DIR = import.meta.dirname;
const SRC = path.join(DIR, "app");
const HOME = os.homedir();
const APP = path.join(process.env.LOCALAPPDATA || path.join(HOME, "AppData", "Local"), "Pointili Captions");
const LINK = path.join(HOME, "Desktop", "Pointili Captions.lnk");

/** The browsers that can run a page as its own window, best first. */
const BROWSERS = [
  "C:/Program Files/Google/Chrome/Application/chrome.exe",
  "C:/Program Files (x86)/Google/Chrome/Application/chrome.exe",
  path.join(process.env.LOCALAPPDATA || "", "Google/Chrome/Application/chrome.exe"),
  "C:/Program Files (x86)/Microsoft/Edge/Application/msedge.exe",
  "C:/Program Files/Microsoft/Edge/Application/msedge.exe",
];

/**
 * A .ico is a tiny directory of images; since Vista each entry may simply BE a
 * PNG, so one 256px PNG and a 22-byte header is a complete, correct icon.
 */
async function buildIco(pngPath, outPath) {
  const png = await sharp(pngPath).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer();
  const header = Buffer.alloc(6);
  header.writeUInt16LE(0, 0); // reserved
  header.writeUInt16LE(1, 2); // 1 = icon
  header.writeUInt16LE(1, 4); // one image
  const entry = Buffer.alloc(16);
  entry[0] = 0; // width 0 means 256
  entry[1] = 0; // height 0 means 256
  entry[2] = 0; // no palette
  entry[3] = 0; // reserved
  entry.writeUInt16LE(1, 4);  // colour planes
  entry.writeUInt16LE(32, 6); // bits per pixel
  entry.writeUInt32LE(png.length, 8);
  entry.writeUInt32LE(header.length + entry.length, 12);
  await writeFile(outPath, Buffer.concat([header, entry, png]));
}

async function main() {
  const browser = BROWSERS.find((b) => b && existsSync(b));
  if (!browser) throw new Error("No Chrome or Edge found — install either one, then run this again.");

  await mkdir(APP, { recursive: true });
  await copyFile(path.join(SRC, "index.html"), path.join(APP, "index.html"));

  const mark = path.join(DIR, "..", "..", "public", "icon-512.png");
  await sharp(mark).resize(128, 128).png().toFile(path.join(APP, "icon.png"));
  await buildIco(mark, path.join(APP, "icon.ico"));

  const url = "file:///" + path.join(APP, "index.html").replace(/\\/g, "/");
  // A separate profile folder keeps the app window out of the browser's session
  // restore, so closing it never offers to reopen it as a tab.
  const args = `--app="${url}" --window-size=1360,900 --user-data-dir="${path.join(APP, "profile")}" --no-first-run --no-default-browser-check`;

  // PowerShell escapes with a backtick, not a backslash, so JSON.stringify is
  // the wrong quoter here: single-quoted literals with doubled quotes are right.
  const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
  const ps = `
$s = (New-Object -ComObject WScript.Shell).CreateShortcut(${q(LINK)})
$s.TargetPath = ${q(browser.replace(/\//g, "\\"))}
$s.Arguments = ${q(args)}
$s.WorkingDirectory = ${q(APP)}
$s.IconLocation = ${q(path.join(APP, "icon.ico"))}
$s.Description = 'Make a caption, export a transparent PNG'
$s.Save()
`;
  await run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", ps]);

  console.log(`installed   ${APP}`);
  console.log(`shortcut    ${LINK}`);
  console.log(`window      ${path.basename(browser)} in app mode`);
  console.log(`\nDouble-click "Pointili Captions" on your desktop. To pin it: right-click the`);
  console.log(`taskbar icon while it is open and choose Pin to taskbar.`);
}

await main();
