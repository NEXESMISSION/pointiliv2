/**
 * Pointili's Android app (android/) for real, in an Android emulator, on the live site:
 *
 *   - version 2 (Android's WebView) installs over version 1 (the Chrome TWA) as an update, same key;
 *   - it opens Pointili, and the page knows it is in the app (no install button, counted as the app);
 *   - an owner signs in, and is still signed in once the app is closed and opened again;
 *   - the scanner gets the camera; the back button goes back a page; a WhatsApp link leaves the app;
 *   - no network: «ما فمّاش إنترنت», and «عاود» brings the page back.
 *
 * The update is tried with the signed release builds; the rest with the debug build, whose page can be
 * driven from here (Playwright's Android). A throwaway owner, deleted at the end; pictures in .e2e/android/.
 *
 * The emulator needs the PC's hypervisor (the Android Emulator hypervisor driver, or Windows Hypervisor
 * Platform). On the founder's PC neither was installed (8 Nov 2026: «hypervisor driver is not installed»),
 * so this has not run there yet; a real phone was the test.
 *
 *   node scripts/android.mjs     (from v2/)
 *   SDK (default C:/Users/ayoub/pointili-android/sdk, with the emulator and system-images;android-34;google_apis;x86_64),
 *   JAVA_HOME for the AVD's first making; V1, V2 (release APKs), DEBUG (debug APK) to try other builds.
 */
import { execFileSync, spawn } from "node:child_process";
import { existsSync, mkdirSync, writeFileSync } from "node:fs";
import { config } from "dotenv";
import { _android as android } from "playwright-core";
import { createClient } from "@supabase/supabase-js";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const BASE = "https://www.pointili.online";
const OUT = ".e2e/android";
mkdirSync(OUT, { recursive: true });
const HOME = "C:/Users/ayoub/pointili-android";
const SDK = process.env.SDK || `${HOME}/sdk`;
const ADB = `${SDK}/platform-tools/adb.exe`;
const EMU = `${SDK}/emulator/emulator.exe`;
const V1 = process.env.V1 || `${HOME}/app/app-release-signed.apk`;
// built here (android/) or in the build folder beside the tools
const built = (kind, file) => [`android/app/build/outputs/apk/${kind}/${file}`, `${HOME}/webapp/app/build/outputs/apk/${kind}/${file}`].find((p) => existsSync(p));
const V2 = process.env.V2 || built("release", "app-release.apk");
const DEBUG = process.env.DEBUG_APK || built("debug", "app-debug.apk");
const PKG = "online.pointili.app";
const AVD = "pointili";

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let passed = 0;
const failed = [];
const check = (name, ok, detail) => {
  if (ok) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failed.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail).slice(0, 300)}` : ""}`);
  }
};
const adb = (...args) => execFileSync(ADB, args, { encoding: "utf8", timeout: 180000 }).trim();
const sh = (cmd) => adb("shell", cmd);
const wait = (ms) => new Promise((r) => setTimeout(r, ms));
const resumed = () => sh("dumpsys activity activities").split("\n").find((l) => /mResumedActivity|topResumedActivity/.test(l)) ?? "";
async function screenshot(name) {
  const png = execFileSync(ADB, ["exec-out", "screencap", "-p"], { maxBuffer: 64 * 1024 * 1024 });
  writeFileSync(`${OUT}/${name}.png`, png);
}

// ── the emulator: an AVD made once, booted without a window ──
adb("start-server");
if (!execFileSync(EMU, ["-list-avds"], { encoding: "utf8" }).split(/\r?\n/).includes(AVD)) {
  const avdmanager = `${SDK}/cmdline-tools/latest/bin/avdmanager.bat`;
  execFileSync("cmd", ["/c", avdmanager, "create", "avd", "-n", AVD, "-k", "system-images;android-34;google_apis;x86_64", "-d", "pixel_6", "--force"], { input: "no\n", encoding: "utf8" });
}
let emulator = null;
if (!adb("devices").split("\n").some((l) => /^emulator-\d+\s+device/.test(l))) {
  emulator = spawn(EMU, ["-avd", AVD, "-no-window", "-no-audio", "-no-boot-anim", "-no-snapshot", "-gpu", "swiftshader_indirect", "-camera-back", "emulated"], { stdio: "ignore", detached: false });
  adb("wait-for-device");
  for (let i = 0; i < 120 && sh("getprop sys.boot_completed") !== "1"; i++) await wait(5000);
}
check("the emulator is up (Android 14)", sh("getprop sys.boot_completed") === "1" && sh("getprop ro.build.version.release") === "14");
sh("settings put global window_animation_scale 0; settings put global transition_animation_scale 0; settings put global animator_duration_scale 0");
sh("input keyevent KEYCODE_WAKEUP; wm dismiss-keyguard");

// a throwaway owner with a shop
const PASS = "android-e2e-2026";
const NOTES = ["card_hello", "coach", "logo_tip", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"];
const d = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
const { data: u, error: ue } = await admin.auth.admin.createUser({ email: `216${d}@phone.pointidi.app`, password: PASS, email_confirm: true, app_metadata: { phone: `+216${d}` } });
if (ue) throw ue;
await admin.from("people").upsert({ id: u.user.id, name: "Android", phone: `+216${d}`, seen: NOTES });
await admin.from("shops").insert({ owner_id: u.user.id, name: "Boutique Android", kind: "clothes", goal: 5, gift: "تخفيض", color: "#6C47FF", created_at: new Date(Date.now() - 30 * 86_400_000).toISOString(), paid_until: new Date(Date.now() + 300 * 86_400_000).toISOString() });
const { data: live } = await admin.from("news").select("id").eq("active", true);
if (live?.length) await admin.from("news_views").insert(live.map((n) => ({ news_id: n.id, person_id: u.user.id })));

let device = null;
try {
  console.log("\nVersion 2 over version 1, the same key");
  try {
    adb("uninstall", PKG);
  } catch {
    /* not there */
  }
  if (existsSync(V1)) {
    check("version 1 (the Chrome TWA) installs", /Success/.test(adb("install", V1)));
    check("version 2 (the WebView) installs over it, as an update", /Success/.test(adb("install", "-r", V2)));
    const dump = sh(`dumpsys package ${PKG}`);
    check("…it is version 2 now", /versionCode=2\b/.test(dump), dump.match(/versionCode=\d+/)?.[0]);
  } else {
    check("version 2 installs", /Success/.test(adb("install", V2)));
  }
  sh(`am start -W -n ${PKG}/.LauncherActivity`);
  await wait(9000);
  check("the released app opens on its own screen", resumed().includes(PKG), resumed());
  await screenshot("1-release-opened");

  console.log("\nThe app itself (the debug build, whose page can be driven)");
  adb("uninstall", PKG);
  check("the debug build installs", /Success/.test(adb("install", DEBUG)));
  sh(`pm grant ${PKG} android.permission.CAMERA`);
  sh(`am start -W -n ${PKG}/.LauncherActivity`);
  [device] = await android.devices();
  let webview = await device.webView({ pkg: PKG });
  let page = await webview.page();
  await page.waitForLoadState("load");
  await wait(2500);
  check("it opens Pointili", page.url().startsWith(BASE), page.url());
  check("…and the page knows it is in the app", await page.evaluate(() => /PointiliApp\/2/.test(navigator.userAgent)));
  check("…no install offered on the front door", (await page.getByRole("button", { name: /حطّ Pointili في تليفونك/ }).count()) === 0);
  await screenshot("2-front-door");

  await page.goto(`${BASE}/login`, { waitUntil: "networkidle" });
  await page.locator('input[name="phone"]').fill(d);
  await page.locator('input[name="password"]').fill(PASS);
  await Promise.all([page.waitForURL((x) => !x.pathname.startsWith("/login"), { timeout: 60000 }), page.locator('button[type="submit"]').click()]);
  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  await wait(2500);
  check("the owner signs in, his home opens", (await page.getByText("Boutique Android").count()) > 0);
  check("…with no install button: he is in the app", (await page.locator('button[aria-label="حطّ Pointili في تليفونك"]').count()) === 0);
  await screenshot("3-home");

  sh(`am force-stop ${PKG}`);
  await wait(1500);
  sh(`am start -W -n ${PKG}/.LauncherActivity`);
  webview = await device.webView({ pkg: PKG });
  page = await webview.page();
  await page.waitForLoadState("load");
  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  await wait(2500);
  check("closed and opened again: still signed in", page.url().startsWith(`${BASE}/shop`) && (await page.getByText("Boutique Android").count()) > 0, page.url());

  await page.goto(`${BASE}/shop/collect?by=scan`, { waitUntil: "load" });
  await wait(6000);
  const cam = await page.evaluate(() => {
    const v = document.querySelector("video");
    return { video: !!v, playing: !!v && v.readyState >= 2 && !!v.srcObject };
  });
  check("the scanner gets the camera", cam.video && cam.playing, cam);
  await screenshot("4-scanner");

  await page.goto(`${BASE}/shop`, { waitUntil: "load" });
  await page.goto(`${BASE}/shop/links`, { waitUntil: "load" });
  await wait(1000);
  sh("input keyevent KEYCODE_BACK");
  await wait(2500);
  check("the back button goes back a page", page.url().replace(/\/$/, "") === `${BASE}/shop`, page.url());

  const before = page.url();
  await page.evaluate(() => {
    location.href = "https://wa.me/?text=Pointili";
  });
  await wait(4000);
  check("a WhatsApp link leaves the app, the app stays on its page", !resumed().includes(`${PKG}/`) && page.url() === before, { resumed: resumed(), url: page.url() });
  sh(`am start -n ${PKG}/.LauncherActivity`);
  await wait(2500);

  sh("cmd connectivity airplane-mode enable");
  await wait(3000);
  await page.reload().catch(() => {});
  await wait(4000);
  check("no network: «ما فمّاش إنترنت»", (await page.getByText("ما فمّاش إنترنت").count()) > 0);
  await screenshot("5-offline");
  sh("cmd connectivity airplane-mode disable");
  await wait(8000);
  await page.getByText("عاود").click();
  await page.waitForLoadState("load").catch(() => {});
  await wait(3000);
  check("…«عاود», the network back: the page again", (await page.getByText("Boutique Android").count()) > 0, page.url());
} catch (e) {
  failed.push(`crashed: ${e.message}`);
  console.log(`  ✗ crashed: ${e.message}`);
  await screenshot("crash").catch(() => {});
} finally {
  try {
    sh("cmd connectivity airplane-mode disable");
  } catch {
    /* the emulator is gone */
  }
  await device?.close().catch(() => {});
  if (emulator) {
    try {
      adb("emu", "kill");
    } catch {
      emulator.kill();
    }
  }
  await admin.from("shops").delete().eq("owner_id", u.user.id);
  await admin.auth.admin.deleteUser(u.user.id);
  await unrobot(admin, [d]);
  console.log(`\n${passed} passed, ${failed.length} failed (removed 1 account) · pictures in ${OUT}/`);
  if (failed.length) process.exit(1);
}
