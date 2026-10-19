/**
 * Puts Facebook's Conversions API token where the site reads it (lib/meta.ts),
 * without it ever being shown, printed or committed:
 *
 *   node scripts/meta-token.mjs        (from v2/; paste the token when asked, then Enter)
 *
 * The token: Events Manager → the dataset «Pointili site» → Settings →
 * Conversions API → «Generate access token». The script checks it against
 * the dataset, writes META_CAPI_TOKEN into .env.local (git-ignored) and into
 * the Vercel project «pointidi» (production + preview, encrypted). The next
 * deploy uses it.
 */
import { readFileSync, writeFileSync, existsSync } from "node:fs";
import { spawnSync } from "node:child_process";

const PIXEL = "1465380232102710";
const ENV = ".env.local";

/** The token typed or pasted, shown as dots. */
function ask(prompt) {
  return new Promise((resolve) => {
    process.stdout.write(prompt);
    const input = process.stdin;
    let value = "";
    if (input.isTTY) input.setRawMode(true);
    input.resume();
    input.setEncoding("utf8");
    const onData = (chunk) => {
      for (const ch of chunk) {
        if (ch === "\r" || ch === "\n") {
          if (input.isTTY) input.setRawMode(false);
          input.pause();
          input.off("data", onData);
          process.stdout.write("\n");
          return resolve(value.trim());
        }
        if (ch === "\u0003") process.exit(1);
        if (ch === "\u007f" || ch === "\b") {
          value = value.slice(0, -1);
          continue;
        }
        value += ch;
        process.stdout.write("•");
      }
    };
    input.on("data", onData);
  });
}

if (!existsSync(ENV)) throw new Error("run it from v2/ (no .env.local here)");
const token = await ask("Paste the Conversions API token, then Enter: ");
if (!/^[A-Za-z0-9]{40,}$/.test(token)) {
  console.log("✗ that does not look like a Meta access token (letters and digits, long). Nothing saved.");
  process.exit(1);
}

// 1. does the dataset take an event with it? (a test event: it shows only under Events Manager → Test events)
const res = await fetch(`https://graph.facebook.com/v21.0/${PIXEL}/events?access_token=${encodeURIComponent(token)}`, {
  method: "POST",
  headers: { "content-type": "application/json" },
  body: JSON.stringify({ test_event_code: "POINTILI", data: [{ event_name: "PageView", event_time: Math.floor(Date.now() / 1000), action_source: "system_generated", user_data: { external_id: ["0".repeat(64)] } }] }),
});
const body = await res.json().catch(() => ({}));
if (!res.ok || !body.events_received) {
  console.log(`✗ Meta refused it for the dataset ${PIXEL}: ${body.error?.message ?? res.status}. Nothing saved.`);
  process.exit(1);
}
console.log(`✓ the dataset ${PIXEL} took a test event with it`);

// 2. .env.local
const lines = readFileSync(ENV, "utf8").split(/\r?\n/).filter((l) => !l.startsWith("META_CAPI_TOKEN="));
while (lines.length && lines[lines.length - 1] === "") lines.pop();
lines.push(`META_CAPI_TOKEN=${token}`, "");
writeFileSync(ENV, lines.join("\n"));
console.log("✓ .env.local");

// 3. Vercel (the value goes through stdin, never on a command line)
const vercel = spawnSync(
  process.platform === "win32" ? "npx.cmd" : "npx",
  ["vercel", "api", "/v10/projects/pointidi/env?upsert=true", "-X", "POST", "--input", "-", "--scope", "nexesmissions-projects", "--silent"],
  { input: JSON.stringify({ key: "META_CAPI_TOKEN", value: token, type: "encrypted", target: ["production", "preview"] }), encoding: "utf8", shell: process.platform === "win32", env: { ...process.env, MSYS_NO_PATHCONV: "1" } },
);
if (vercel.status !== 0) {
  console.log("✗ Vercel did not take it:", (vercel.stderr || vercel.stdout || "").replace(token, "•••").slice(0, 300));
  process.exit(1);
}
console.log("✓ Vercel «pointidi» (production + preview): live with the next deploy");
