/**
 * The founder's Telegram, set up once (see lib/telegram.ts):
 *   1. In Telegram, @BotFather → /newbot → copy the token into v2/.env.local as TELEGRAM_BOT_TOKEN=…
 *   2. Open the new bot and press Start (or send it any message).
 *   3. node scripts/telegram.mjs   → finds the chat, writes TELEGRAM_CHAT_ID to .env.local, sends a test.
 * The token and the chat id stay in .env.local (and Vercel's environment), never in git.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { config } from "dotenv";

config({ path: ".env.local", quiet: true });
const token = process.env.TELEGRAM_BOT_TOKEN;
if (!token) throw new Error("TELEGRAM_BOT_TOKEN missing in v2/.env.local (step 1)");
const api = async (method, body) => (await fetch(`https://api.telegram.org/bot${token}/${method}`, { method: "POST", headers: { "content-type": "application/json" }, body: JSON.stringify(body ?? {}) })).json();

const me = await api("getMe");
if (!me.ok) throw new Error(`the token is refused: ${me.description}`);
let chat = process.env.TELEGRAM_CHAT_ID;
if (!chat) {
  const up = await api("getUpdates");
  const last = [...(up.result ?? [])].reverse().find((u) => u.message?.chat?.id ?? u.my_chat_member?.chat?.id);
  chat = String(last?.message?.chat?.id ?? last?.my_chat_member?.chat?.id ?? "");
  if (!chat) throw new Error(`no message to @${me.result.username} yet: open it in Telegram, press Start, then run this again`);
  const env = readFileSync(".env.local", "utf8");
  writeFileSync(".env.local", env.replace(/\s*$/, "") + `\nTELEGRAM_CHAT_ID=${chat}\n`);
  console.log(`chat found and written to .env.local`);
}
const sent = await api("sendMessage", { chat_id: chat, parse_mode: "HTML", text: "✅ <b>Pointili</b>: الإشعارات خدّامة. كي يتحلّ محل، كي يجي أوّل حريف، كي يطلب واحد يخلّص ولا ينزل على «كلّمنا»، وكل صباح على 8 ملخّص البارح." });
console.log(sent.ok ? `test sent to @${me.result.username}` : `test refused: ${sent.description}`);
