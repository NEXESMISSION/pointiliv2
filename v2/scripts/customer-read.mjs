/**
 * The customer side, read rather than guessed: how far a customer gets, which
 * screens they see and for how long, where they leave — and the taps that
 * answer nothing, both in time (is it still happening?) and in place (what did
 * they expect to be there?).
 *
 *   node scripts/customer-read.mjs                 (from v2/)
 *   SINCE=2026-10-15 node scripts/customer-read.mjs
 *
 * SINCE splits the dead taps into «ever» and «since», which matters more than
 * it sounds: a screen fixed last week still carries every tap it earned before
 * the fix, and reading the total alone sends you to rebuild what already works.
 *
 * Robots, testers and the founder's own visits are left out throughout.
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const all = async (t, sel, b = (q) => q) => {
  const out = [];
  for (let f = 0; ; f += 1000) {
    const { data, error } = await b(db.from(t).select(sel)).range(f, f + 999);
    if (error) throw new Error(`${t}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
};
const pct = (a, b) => `${Math.round((a / Math.max(b, 1)) * 100)}%`;
const mid = (xs) => (xs.length ? xs.slice().sort((a, b) => a - b)[Math.floor(xs.length / 2)] : 0);
const secs = (ms) => `${(ms / 1000).toFixed(1)}s`;

// ── who counts ────────────────────────────────────────────────────────────
const robots = new Set((await all("robots", "phone")).map((r) => r.phone));
const people = await all("people", "id,phone,name,created_at,is_tester,code");
const shops = await all("shops", "id,owner_id,name,created_at");
const owners = new Set(shops.map((s) => s.owner_id));
const real = people.filter((p) => !robots.has(p.phone) && !p.is_tester);
const customers = real.filter((p) => !owners.has(p.id));
const custId = new Set(customers.map((p) => p.id));

const cards = await all("cards", "id,shop_id,user_id,stamps,gifts,created_at,last_at");
const moments = await all("moments", "id,card_id,shop_id,kind,created_at,given_at");

console.log(`══ who ══`);
console.log(`real people: ${real.length} — owners ${owners.size}, customers ${customers.length}`);

// ── a customer's life ─────────────────────────────────────────────────────
const byUser = new Map();
for (const c of cards) {
  if (!custId.has(c.user_id)) continue;
  if (!byUser.has(c.user_id)) byUser.set(c.user_id, []);
  byUser.get(c.user_id).push(c);
}
const stampsOf = new Map();
for (const m of moments) if (m.kind === "stamp") stampsOf.set(m.card_id, (stampsOf.get(m.card_id) ?? 0) + 1);

let withCard = 0, oneStamp = 0, twoPlus = 0, gotGift = 0, twoShops = 0;
const gaps = [];
for (const [, cs] of byUser) {
  withCard++;
  const st = cs.reduce((a, c) => a + (stampsOf.get(c.id) ?? 0), 0);
  if (st >= 1) oneStamp++;
  if (st >= 2) twoPlus++;
  if (cs.some((c) => (c.gifts ?? 0) > 0)) gotGift++;
  if (cs.length > 1) twoShops++;
  // the gap between the card being made and the last tampon on it
  for (const c of cs) if (c.last_at && c.created_at) gaps.push(Date.parse(c.last_at) - Date.parse(c.created_at));
}
console.log(`\n══ a customer's life ══`);
console.log(`made an account: ${customers.length}`);
console.log(`has a card:      ${withCard} (${pct(withCard, customers.length)})`);
console.log(`1 tampon:        ${oneStamp} (${pct(oneStamp, customers.length)})`);
console.log(`2 or more:       ${twoPlus} (${pct(twoPlus, customers.length)})  ← came back at least once`);
console.log(`took a gift:     ${gotGift}`);
console.log(`cards at 2+ shops: ${twoShops}`);
console.log(`median days between a card opening and its last tampon: ${(mid(gaps) / 86400000).toFixed(1)}`);

// ── the screens they see ──────────────────────────────────────────────────
const visits = await all("visits", "id,user_id,started_at,is_admin,is_bot,standalone,landing");
const good = new Map();
for (const v of visits) {
  if (v.is_admin || v.is_bot) continue;
  // a visit is a customer's when nobody is signed in, or the person is one
  if (v.user_id && !custId.has(v.user_id)) continue;
  good.set(v.id, v);
}
const views = await all("views", "id,visit_id,route,screen,active_ms,next_route,entered_at");
const mine = views.filter((w) => good.has(w.visit_id));
const CUSTOMER = /^\/(s\/|c\/|u\/|wallet|scan|me|join|login|$)/;
const byScreen = new Map();
for (const w of mine) {
  if (!CUSTOMER.test(w.route)) continue;
  const key = `${w.route}${w.screen ? ` · ${w.screen}` : ""}`;
  if (!byScreen.has(key)) byScreen.set(key, { n: 0, ms: [], left: 0, next: new Map() });
  const s = byScreen.get(key);
  s.n++;
  s.ms.push(w.active_ms ?? 0);
  if (!w.next_route) s.left++;
  else s.next.set(w.next_route, (s.next.get(w.next_route) ?? 0) + 1);
}
console.log(`\n══ the customer's screens (${mine.length} views) ══`);
console.log("screen".padEnd(34), "seen".padStart(6), "median".padStart(8), "left".padStart(7), " then");
for (const [key, s] of [...byScreen].sort((a, b) => b[1].n - a[1].n).slice(0, 18)) {
  const then = [...s.next].sort((a, b) => b[1] - a[1]).slice(0, 2).map(([r, n]) => `${r} ${n}`).join(", ");
  console.log(key.slice(0, 33).padEnd(34), String(s.n).padStart(6), secs(mid(s.ms)).padStart(8), pct(s.left, s.n).padStart(7), ` ${then}`);
}

// ── what they tap that answers nothing ───────────────────────────────────
const SINCE = process.env.SINCE || "2026-10-15";
const taps = await all("taps", "visit_id,route,screen,target,dead,rage,at,x,y");
const mineTaps = taps.filter((tp) => good.has(tp.visit_id) && CUSTOMER.test(tp.route));
const byRoute = new Map();
for (const tp of mineTaps) {
  if (!byRoute.has(tp.route)) byRoute.set(tp.route, { all: 0, dead: 0, allSince: 0, deadSince: 0, rage: 0 });
  const b = byRoute.get(tp.route);
  b.all++;
  if (tp.dead) b.dead++;
  if (tp.rage) b.rage++;
  if (tp.at >= SINCE) {
    b.allSince++;
    if (tp.dead) b.deadSince++;
  }
}
console.log(`
══ taps that answer nothing — ever, and since ${SINCE} ══`);
console.log("screen".padEnd(14), "taps".padStart(6), "dead".padStart(6), "".padStart(6), "taps".padStart(6), "dead".padStart(6));
for (const [route, b] of [...byRoute].sort((a, b) => b[1].dead - a[1].dead)) {
  const rate = (d, n) => (n ? `${Math.round((d / n) * 100)}%` : "—");
  console.log(route.slice(0, 13).padEnd(14), String(b.all).padStart(6), String(b.dead).padStart(6), rate(b.dead, b.all).padStart(6), String(b.allSince).padStart(6), String(b.deadSince).padStart(6), rate(b.deadSince, b.allSince).padStart(6));
}

// where they land: a 4x8 grid over the screen, right to left like the app, so a
// cluster reads as a picture — that is what says what people expected to be there
const grid = (route) => {
  const rows = 8, cols = 4, box = Array.from({ length: rows }, () => Array(cols).fill(0));
  let n = 0;
  for (const tp of mineTaps) {
    if (tp.route !== route || !tp.dead || tp.at < SINCE) continue;
    box[Math.min(rows - 1, Math.floor(tp.y * rows))][Math.min(cols - 1, Math.floor(tp.x * cols))]++;
    n++;
  }
  if (!n) return;
  console.log(`
── ${route}, where the dead taps land since ${SINCE} (${n}; top of the screen first)`);
  for (const row of box) console.log("   " + row.slice().reverse().map((v) => (v ? String(v).padStart(3) : "  ·")).join(" "));
};
for (const [route] of [...byRoute].sort((a, b) => b[1].deadSince - a[1].deadSince).slice(0, 4)) grid(route);
