/**
 * Installs Pointili Typo as an app you open from the desktop, the Start menu or the taskbar.
 *
 *   node social/typo/install-app.mjs            → install, then open it (a running window is closed first)
 *   node social/typo/install-app.mjs --no-open  → install only
 *
 * The app window opens THIS folder's index.html straight from the repo, in a Chromium app window
 * with its own profile, so it has its own icon in the taskbar, no tabs and no address bar. The
 * page watches its own file: when index.html changes, the window puts the work aside, reloads,
 * and picks the work up again — no closing and reopening. Chromium needs one flag for a file:
 * page to read files (--allow-file-access-from-files); the shortcut carries it.
 *
 * %LOCALAPPDATA%\Pointili Typo holds only the icon and the browser profile. Delete it and the
 * two shortcuts and the app is gone.
 */
import { mkdir, writeFile, rm } from "node:fs/promises";
import { existsSync } from "node:fs";
import { execFile } from "node:child_process";
import { promisify } from "node:util";
import { pathToFileURL } from "node:url";
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

/**
 * A real .ico: 16, 24, 32 and 48 px as classic 32-bit bitmaps (what Explorer and the taskbar
 * read at small sizes), and 256 px as PNG. Bitmap entries are BGRA rows bottom-up, followed by
 * an all-clear AND mask; the alpha channel does the transparency.
 */
async function buildIco(pngPath, outPath) {
  const sizes = [16, 24, 32, 48];
  const entries = [];
  for (const size of sizes) {
    const rgba = await sharp(pngPath).resize(size, size, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).ensureAlpha().raw().toBuffer();
    const header = Buffer.alloc(40);
    header.writeUInt32LE(40, 0); header.writeInt32LE(size, 4); header.writeInt32LE(size * 2, 8); header.writeUInt16LE(1, 12); header.writeUInt16LE(32, 14);
    const maskRow = Math.ceil(size / 32) * 4; const mask = Buffer.alloc(maskRow * size);
    header.writeUInt32LE(size * size * 4 + mask.length, 20);
    const pixels = Buffer.alloc(size * size * 4);
    for (let y = 0; y < size; y++) for (let x = 0; x < size; x++) {
      const src = ((size - 1 - y) * size + x) * 4, dst = (y * size + x) * 4;   // bottom-up
      pixels[dst] = rgba[src + 2]; pixels[dst + 1] = rgba[src + 1]; pixels[dst + 2] = rgba[src]; pixels[dst + 3] = rgba[src + 3];
    }
    entries.push({ size, data: Buffer.concat([header, pixels, mask]) });
  }
  entries.push({ size: 256, data: await sharp(pngPath).resize(256, 256, { fit: "contain", background: { r: 0, g: 0, b: 0, alpha: 0 } }).png().toBuffer() });
  const dir = Buffer.alloc(6); dir.writeUInt16LE(0, 0); dir.writeUInt16LE(1, 2); dir.writeUInt16LE(entries.length, 4);
  let offset = 6 + 16 * entries.length; const table = [];
  for (const e of entries) {
    const t = Buffer.alloc(16); t[0] = e.size === 256 ? 0 : e.size; t[1] = e.size === 256 ? 0 : e.size; t[2] = 0; t[3] = 0;
    t.writeUInt16LE(1, 4); t.writeUInt16LE(32, 6); t.writeUInt32LE(e.data.length, 8); t.writeUInt32LE(offset, 12);
    table.push(t); offset += e.data.length;
  }
  await writeFile(outPath, Buffer.concat([dir, ...table, ...entries.map((e) => e.data)]));
}

const q = (s) => `'${String(s).replace(/'/g, "''")}'`;
const ps = (script) => run("powershell.exe", ["-NoProfile", "-ExecutionPolicy", "Bypass", "-Command", script]);

/** Closes a running app window (the page has put its work aside by then only if it is the new page; the old one is simply closed). */
async function closeRunning() {
  const { stdout } = await ps(`
$n = 0
Get-CimInstance Win32_Process -Filter "Name = 'chrome.exe' OR Name = 'msedge.exe'" | Where-Object { $_.CommandLine -like '*--app=*' -and $_.CommandLine -like '*${NAME}*' } | ForEach-Object {
  $p = Get-Process -Id $_.ProcessId -ErrorAction SilentlyContinue
  if ($p -and $p.MainWindowHandle -ne 0) { $null = $p.CloseMainWindow(); $n++ }
}
if ($n -gt 0) { Start-Sleep -Seconds 2 }
Write-Output $n`);
  return Number(stdout.trim()) || 0;
}

async function main() {
  const browser = BROWSERS.find((b) => b && existsSync(b));
  if (!browser) throw new Error("No Chrome or Edge found — install either one, then run this again.");

  await mkdir(APP, { recursive: true });
  for (const stale of ["index.html", "vendor"]) await rm(path.join(APP, stale), { recursive: true, force: true });   // older installs ran from a copy
  await sharp(path.join(DIR, "icon.svg"), { density: 384 }).resize(512, 512).png().toFile(path.join(APP, "icon.png"));
  await buildIco(path.join(APP, "icon.png"), path.join(APP, "icon.ico"));

  const url = pathToFileURL(path.join(DIR, "index.html")).href;
  const args = `--app="${url}" --window-size=1500,940 --user-data-dir="${path.join(APP, "profile")}" --allow-file-access-from-files --no-first-run --no-default-browser-check`;
  const exe = browser.replace(/\//g, "\\");
  for (const link of [LINK, START]) {
    await mkdir(path.dirname(link), { recursive: true });
    await ps(`
$s = (New-Object -ComObject WScript.Shell).CreateShortcut(${q(link)})
$s.TargetPath = ${q(exe)}
$s.Arguments = ${q(args)}
$s.WorkingDirectory = ${q(DIR)}
$s.IconLocation = ${q(path.join(APP, "icon.ico") + ",0")}
$s.Description = 'Arabic typography for the reels: words, paper, accents, transparent PNG'
$s.Save()`);
  }

  console.log(`page        ${path.join(DIR, "index.html")}  (opened straight from the repo; the window reloads itself when it changes)`);
  console.log(`icon        ${path.join(APP, "icon.ico")}`);
  console.log(`desktop     ${LINK}  ${existsSync(LINK) ? "✓" : "MISSING"}`);
  console.log(`start menu  ${START}  ${existsSync(START) ? "✓" : "MISSING"}`);
  console.log(`window      ${path.basename(browser)} in app mode, own profile, own icon`);
  if (!process.argv.includes("--no-open")) {
    const closed = await closeRunning(); if (closed) console.log(`closed      ${closed} open window${closed > 1 ? "s" : ""} of the old build`);
    // open it the way the shortcut does: one argument string, quotes and all — the paths have spaces
    await run("powershell.exe", ["-NoProfile", "-Command", `Start-Process -FilePath ${q(exe)} -ArgumentList ${q(args)} -WorkingDirectory ${q(DIR)}`]);
    console.log(`opened      the app window`);
  }
  console.log(`\nTo pin it: while the window is open, right-click its icon in the taskbar → Pin to taskbar.`);
}

await main();
