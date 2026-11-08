/**
 * The same shop, the same customer, two builds of the site side by side: every page they open must
 * read the same — the words on it and where its links go. For a change that must not show to the
 * shops as they are (the systems separated, 8 Nov 2026): run the site as it is on one port, the change
 * on another, and this says what differs. Its own throwaway accounts — an ordinary shop, a shop on the
 * roulette, a shop on the store, and a customer of each — on the robots list first, removed at the end.
 *
 *   node scripts/same-pages.mjs http://localhost:3301 http://localhost:3302      (from v2/)
 */
import { randomBytes } from "node:crypto";
import { writeFileSync } from "node:fs";
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";
import { createServerClient } from "@supabase/ssr";
import { robot, unrobot } from "./robots.mjs";

config({ path: ".env.local", quiet: true });
const [A, B] = process.argv.slice(2);
if (!A || !B) throw new Error("usage: node scripts/same-pages.mjs <site as it is> <site changed>");
const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL_, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const users = [];
const phones = [];
/** an account, signed in as the site signs in: its cookies, and a client to set it up with */
async function person(name) {
  const digits = await robot(admin, `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`);
  phones.push(digits);
  const password = randomBytes(12).toString("base64url");
  const email = `216${digits}@phone.pointidi.app`;
  const { data, error } = await admin.auth.admin.createUser({ email, password, email_confirm: true, app_metadata: { phone: `+216${digits}` } });
  if (error) throw error;
  users.push(data.user.id);
  let jar = [];
  const ssr = createServerClient(URL_, ANON, { cookies: { getAll: () => jar, setAll: (list) => (jar = list.map(({ name, value }) => ({ name, value }))) } });
  const { error: e2 } = await ssr.auth.signInWithPassword({ email, password });
  if (e2) throw e2;
  const client = createClient(URL_, ANON, { auth: { persistSession: false } });
  await client.auth.signInWithPassword({ email, password });
  await client.rpc("me");
  await client.rpc("set_name", { p_name: name });
  // the one-time notes seen, so each page shows what it shows every day (not a note that opens once)
  for (const k of ["coach", "logo_tip", "card_hello", "offer", "push", "install", "fix_tip", "first_scan", "first_gift", "mission", "links_tip", "reset_tip", "new_insights"]) await client.rpc("see", { p_key: k });
  return { id: data.user.id, client, cookie: () => jar.map((c) => `${c.name}=${c.value}`).join("; ") };
}
const rpc = async (who, fn, args = {}) => {
  const { data, error } = await who.client.rpc(fn, args);
  if (error) throw new Error(`${fn}: ${error.message}`);
  return data;
};
const tampon = async (owner, customer) => rpc(customer, "stamp", { p_token: (await rpc(owner, "new_code")).token });

/** a page as its person sees it: the words (scripts, styles and tags taken out) and where its links go */
async function page(base, path, who) {
  const res = await fetch(base + path, { headers: { cookie: who.cookie() }, redirect: "manual" });
  if (res.status >= 300 && res.status < 400) return { status: res.status, words: `→ ${new globalThis.URL(res.headers.get("location"), base).pathname}`, links: [] };
  const html = await res.text();
  const body = html.replace(/<script[\s\S]*?<\/script>/g, "").replace(/<style[\s\S]*?<\/style>/g, "").replace(/<template[\s\S]*?<\/template>/g, "");
  const links = [...body.matchAll(/href="([^"]+)"/g)].map((m) => m[1]).filter((h) => !h.startsWith("/_next") && !h.includes("fonts.") && !h.endsWith(".css") && !h.endsWith(".webmanifest"));
  const words = body
    .replace(/<[^>]+>/g, " ")
    .replace(/&nbsp;/g, " ")
    .replace(/&amp;/g, "&")
    .replace(/&quot;/g, '"')
    .replace(/&#x27;/g, "'")
    .replace(/\s+/g, " ")
    .trim();
  return { status: res.status, words, links: [...new Set(links)] };
}

let same = 0;
const differs = [];
const report = [];
async function compare(label, path, who) {
  // the first look at a page compiles it in a dev server: ask twice, keep the second
  await page(A, path, who).catch(() => null);
  await page(B, path, who).catch(() => null);
  const [a, b] = [await page(A, path, who), await page(B, path, who)];
  const ok = a.status === b.status && a.words === b.words && a.links.join() === b.links.join();
  report.push({ label, path, ok, a: { status: a.status, words: a.words.length, links: a.links.length }, b: { status: b.status, words: b.words.length, links: b.links.length } });
  if (ok) {
    same++;
    console.log(`  = ${label} (${path}) — ${a.status}, ${a.words.length} chars, ${a.links.length} links`);
  } else {
    differs.push(label);
    console.log(`  ≠ ${label} (${path}) — ${a.status}/${b.status}`);
    const wa = a.words.split(" "), wb = b.words.split(" ");
    let i = 0;
    while (i < wa.length && wa[i] === wb[i]) i++;
    console.log(`      as it is: …${wa.slice(Math.max(0, i - 6), i + 14).join(" ")}`);
    console.log(`      changed:  …${wb.slice(Math.max(0, i - 6), i + 14).join(" ")}`);
    const la = new Set(a.links), lb = new Set(b.links);
    const gone = a.links.filter((x) => !lb.has(x)), more = b.links.filter((x) => !la.has(x));
    if (gone.length || more.length) console.log(`      links: −${JSON.stringify(gone)} +${JSON.stringify(more)}`);
  }
}

try {
  console.log("\nThree shops as they are today, and a customer of each");
  const plain = await person("Plain Owner");
  await rpc(plain, "open_shop", { p_name: "Plain Café", p_kind: "cafe" });
  await rpc(plain, "save_card", { p_goal: 5, p_gift: "قهوة بلاش", p_color: "#6c47ff", p_gap: 0 });
  const wheel = await person("Wheel Owner");
  await rpc(wheel, "open_shop", { p_name: "Wheel Shop", p_kind: "perfume" });
  await rpc(wheel, "save_card", { p_goal: 4, p_gift: "الروليت", p_color: "#e11d48", p_gap: 0 });
  await rpc(wheel, "wheel_save", { p_prizes: [{ name: "عطر صغير", chance: 50 }, { name: "عينة", chance: 50 }] });
  await rpc(wheel, "set_wheel", { p_on: true });
  const store = await person("Store Owner");
  await rpc(store, "open_shop", { p_name: "Store Shop", p_kind: "grocery" });
  await rpc(store, "save_card", { p_goal: 10, p_gift: "x x", p_color: "#0e9f6e", p_gap: 0 });
  await admin.from("shops").update({ store_on: true }).eq("owner_id", store.id);
  await rpc(store, "store_save", { p_items: [{ name: "حليب", cost: 3 }, { name: "خبز", cost: 1 }] });
  const sami = await person("Sami Customer");
  for (let i = 0; i < 6; i++) await tampon(plain, sami); // a gift waiting, and one on the next card
  for (let i = 0; i < 2; i++) await tampon(wheel, sami);
  for (let i = 0; i < 4; i++) await tampon(store, sami);
  // one link sent by the plain shop, so its links page has a row
  await rpc(plain, "link_new", { p_label: "Facebook", p_item: null });
  const cards = await rpc(sami, "wallet");
  const cardAt = (name) => cards.find((c) => c.shop.name === name).id;

  for (const [who, label] of [[plain, "ordinary shop"], [wheel, "roulette shop"], [store, "store shop"]]) {
    console.log(`\nThe ${label}'s owner`);
    for (const p of ["/shop", "/shop/settings", "/shop/links", "/shop/customers", "/shop/card", "/shop/stats", "/shop/qr", "/shop/collect?by=phone", "/wallet", "/me"]) await compare(`${label}: ${p}`, p, who);
    if (who === wheel) await compare(`${label}: /shop/wheel`, "/shop/wheel", who);
    if (who === store) await compare(`${label}: /shop/store`, "/shop/store", who);
  }
  console.log("\nThe customer");
  for (const p of ["/", "/me", "/scan", `/c/${cardAt("Plain Café")}`, `/c/${cardAt("Wheel Shop")}`, `/c/${cardAt("Store Shop")}`]) await compare(`customer: ${p}`, p, sami);
  console.log("\nThe new page, for a shop that does not have the golden ticket");
  const drawPage = await page(B, "/shop/draw", plain);
  console.log(`  /shop/draw on the changed site: ${drawPage.status} ${drawPage.words}`);
  report.push({ label: "ordinary shop: /shop/draw (changed site only)", path: "/shop/draw", ok: drawPage.words === "→ /shop", b: { status: drawPage.status, words: drawPage.words } });
} finally {
  for (const id of users) await admin.from("shops").delete().eq("owner_id", id);
  for (const id of users) await admin.auth.admin.deleteUser(id);
  await unrobot(admin, phones);
  if (process.env.SAME_REPORT) writeFileSync(process.env.SAME_REPORT, JSON.stringify(report, null, 2));
  console.log(`\n${same} pages the same, ${differs.length} different (removed ${users.length} accounts)`);
  if (differs.length) process.exit(1);
}
