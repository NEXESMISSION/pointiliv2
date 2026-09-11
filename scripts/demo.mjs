/**
 * Demo merchant "Café Bonheur" for trying Pointili without a second phone.
 *
 *   node scripts/demo.mjs            # ensure the demo merchant exists, print a fresh scan URL
 *   node scripts/demo.mjs --url-only # just the scan URL (for scripting)
 *
 * The password lives in .env.local as DEMO_MERCHANT_PASSWORD (created on first run).
 */
import { appendFileSync } from "node:fs";
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import "./sql.mjs"; // loads .env.local

const PHONE = "+21620000001";
const EMAIL = "21620000001@phone.pointidi.app";
const SITE = process.env.DEMO_SITE_URL || "http://localhost:3100";
const urlOnly = process.argv.includes("--url-only");
const log = (...a) => !urlOnly && console.log(...a);

const admin = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
let password = process.env.DEMO_MERCHANT_PASSWORD;

const { data: found } = await admin.rpc("auth_lookup", { p_identifier: PHONE });
if (!found) {
  password ||= randomBytes(9).toString("base64url");
  const { error } = await admin.auth.admin.createUser({ email: EMAIL, password, email_confirm: true, app_metadata: { phone: PHONE, full_name: "Sarah Demo" } });
  if (error) throw error;
  if (!process.env.DEMO_MERCHANT_PASSWORD) appendFileSync(".env.local", `DEMO_MERCHANT_PASSWORD=${password}\n`);
  log("created demo merchant account");
} else if (!password) {
  password = randomBytes(9).toString("base64url");
  await admin.auth.admin.updateUserById(found.user_id, { password });
  appendFileSync(".env.local", `DEMO_MERCHANT_PASSWORD=${password}\n`);
}

const merchant = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
const { error: signErr } = await merchant.auth.signInWithPassword({ email: EMAIL, password });
if (signErr) throw signErr;

const { data: ctx } = await merchant.rpc("session_context");
if (!ctx.business) {
  await merchant.rpc("create_business", { p_name: "Café Bonheur", p_category: "cafe", p_owner_name: "Sarah Demo", p_phone: null, p_email: null });
  log("created business Café Bonheur");
}
if (!ctx.card) {
  await merchant.rpc("save_loyalty_card", {
    p_name: "Café Bonheur Loyalty", p_description: "Coffee & more", p_stamps_required: 10, p_reward_name: "Free Coffee",
    p_reward_description: "Get a free regular coffee when you collect 10 stamps.", p_color: "emerald", p_icon: "coffee",
    // demo only: no wait between stamps so the whole card can be tried in one sitting
    p_cooldown_minutes: 0,
  });
  log("created loyalty card: 10 stamps → Free Coffee");
}

const { data: t, error: mintErr } = await merchant.rpc("mint_qr_token");
if (mintErr || !t?.ok) throw new Error(mintErr?.message ?? t?.error);
const url = `${SITE}/scan/${t.token}`;
if (urlOnly) console.log(url);
else console.log(`\nDemo merchant login: phone ${PHONE} (20 000 001), password in .env.local (DEMO_MERCHANT_PASSWORD)\nFresh scan URL (valid 60s, single use):\n${url}`);
