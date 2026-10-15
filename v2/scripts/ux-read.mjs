/**
 * The plan's numbers («خطة البساطة», 14 Oct 2026), before and after: the shops
 * opened since the new way in went live, against the ones opened before it
 * (from 1 Oct). Real people only — not the robots, the testers, the founder,
 * nor any visit from a phone the founder used or the local server.
 *
 *   node scripts/ux-read.mjs                          (from v2/)
 *   FROM=2026-10-14T22:05:00Z node scripts/ux-read.mjs
 *
 * What it says, with the plan's targets:
 *   the card made · the code opened (stays over 93%)
 *   the first real customer within 48 h of opening (10% → 35%)
 *   the owner back another day, 8 h or more after opening (22% → 50%)
 *   the minutes from the first sign-up screen to the code (goes down)
 *   at the counter, a scan without an account: the tampon taken (lost: 10 of 48 → 3), and the seconds it took (58 → 20)
 */
import { config } from "dotenv";
import { createClient } from "@supabase/supabase-js";

config({ path: ".env.local", quiet: true });
const db = createClient(process.env.NEXT_PUBLIC_SUPABASE_URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const LIVE = process.env.FROM || "2026-10-14T22:05:00Z";
const START = "2026-10-01T00:00:00Z";
const H = 3600_000;

async function all(table, select, build = (q) => q) {
  const out = [];
  for (let from = 0; ; from += 1000) {
    const { data, error } = await build(db.from(table).select(select)).range(from, from + 999);
    if (error) throw new Error(`${table}: ${error.message}`);
    out.push(...data);
    if (data.length < 1000) return out;
  }
}
const inIds = async (table, select, col, ids) => {
  const out = [];
  for (let i = 0; i < ids.length; i += 200) out.push(...(await all(table, select, (q) => q.in(col, ids.slice(i, i + 200)))));
  return out;
};

// who never counts
const [robots, people] = await Promise.all([all("robots", "phone"), all("people", "id, phone, is_admin, is_tester")]);
const robotPhones = new Set(robots.map((r) => r.phone));
const out = new Set(people.filter((p) => p.is_admin || p.is_tester || (p.phone && robotPhones.has(p.phone))).map((p) => p.id));

const shops = (await all("shops", "id, name, owner_id, created_at, goal", (q) => q.gte("created_at", START))).filter((s) => !out.has(s.owner_id));
const cohorts = { before: shops.filter((s) => s.created_at < LIVE), after: shops.filter((s) => s.created_at >= LIVE) };

// the owners' visits and screens (a phone the founder used, a robot's browser, the local server: out)
const owners = [...new Set(shops.map((s) => s.owner_id))];
const ownVisits = (await inIds("visits", "id, visitor, user_id, started_at, last_at, is_admin, is_bot", "user_id", owners)).filter((v) => !v.is_admin && !v.is_bot);
const visitors = [...new Set(ownVisits.map((v) => v.visitor))];
// the same browsers before they signed up (the first sign-up screen is seen signed out)
const browserVisits = (await inIds("visits", "id, visitor, user_id, started_at, is_admin, is_bot", "visitor", visitors)).filter((v) => !v.is_admin && !v.is_bot);
const views = await inIds("views", "visit_id, route, entered_at", "visit_id", browserVisits.map((v) => v.id));
const visitOf = new Map(browserVisits.map((v) => [v.id, v]));
const visitorOf = new Map(ownVisits.map((v) => [v.user_id, v.visitor]));

// the tampons: to whom (a card that is not the owner's, nor a robot's, a tester's or the founder's)
const shopIds = shops.map((s) => s.id);
const cards = await inIds("cards", "id, shop_id, user_id", "shop_id", shopIds);
const cardOwner = new Map(cards.map((c) => [c.id, c.user_id]));
const stamps = await inIds("moments", "shop_id, card_id, kind, created_at", "shop_id", shopIds);
const codes = await inIds("codes", "shop_id, held_hash, held_until, used_at, back_at", "shop_id", shopIds);

const pct = (n, d) => (d ? `${Math.round((100 * n) / d)}%` : "—");
const median = (xs) => {
  if (!xs.length) return null;
  const s = [...xs].sort((a, b) => a - b);
  return s[Math.floor(s.length / 2)];
};

function read(list) {
  const n = list.length;
  let card = 0, code = 0, first48 = 0, back = 0;
  const toCode = [];
  for (const s of list) {
    const opened = Date.parse(s.created_at);
    if (s.goal) card++;
    const mine = views.filter((v) => {
      const visit = visitOf.get(v.visit_id);
      return visit && (visit.user_id === s.owner_id || (!visit.user_id && visit.visitor === visitorOf.get(s.owner_id)));
    });
    const qr = mine.filter((v) => v.route === "/shop/qr").map((v) => Date.parse(v.entered_at)).sort((a, b) => a - b)[0];
    if (qr) code++;
    const door = mine.filter((v) => v.route === "/shop/new" && Date.parse(v.entered_at) <= opened + H).map((v) => Date.parse(v.entered_at)).sort((a, b) => a - b)[0];
    if (qr && door && qr > door) toCode.push((qr - door) / 60_000);
    // a real customer: not the owner, not out, a tampon an hour or more after the opening (the first hour is a try), within 48 h
    const real = stamps.some((m) => m.shop_id === s.id && m.kind === "stamp" && (() => {
      const who = cardOwner.get(m.card_id);
      const at = Date.parse(m.created_at);
      return who && who !== s.owner_id && !out.has(who) && at >= opened + H && at <= opened + 48 * H;
    })());
    if (real) first48++;
    if (ownVisits.some((v) => v.user_id === s.owner_id && Date.parse(v.started_at) >= opened + 8 * H)) back++;
  }
  // the counter: scans without an account
  const ids = new Set(list.map((s) => s.id));
  const held = codes.filter((c) => ids.has(c.shop_id) && c.held_hash && c.held_until && Date.parse(c.held_until) < Date.now());
  const taken = held.filter((c) => c.used_at);
  const lost = held.filter((c) => !c.used_at && !c.back_at);
  const secs = taken.map((c) => (Date.parse(c.used_at) - (Date.parse(c.held_until) - 20 * 60_000)) / 1000).filter((x) => x >= 0);
  return { n, card, code, first48, back, toCode: median(toCode), held: held.length, taken: taken.length, lost: lost.length, secs: median(secs) };
}

const b = read(cohorts.before);
const a = read(cohorts.after);
const row = (label, x, y, target = "") => console.log(`${label.padEnd(40)} ${String(x).padStart(12)} ${String(y).padStart(12)}   ${target}`);
console.log(`real shops opened from ${START.slice(0, 10)} · the new way in since ${LIVE}\n`);
row("", "before", "after");
row("shops opened", b.n, a.n);
row("the card made", pct(b.card, b.n), pct(a.card, a.n));
row("the code opened", pct(b.code, b.n), pct(a.code, a.n), "stays over 93%");
row("a real customer within 48 h", pct(b.first48, b.n), pct(a.first48, a.n), "10% → 35%");
row("the owner back another day", pct(b.back, b.n), pct(a.back, a.n), "22% → 50%");
row("minutes, first screen → the code", b.toCode?.toFixed(1) ?? "—", a.toCode?.toFixed(1) ?? "—", "goes down");
row("counter: scans without an account", b.held, a.held);
row("…the tampon taken", pct(b.taken, b.held), pct(a.taken, a.held));
row("…lost (walked away)", `${b.lost} of ${b.held}`, `${a.lost} of ${a.held}`, "10 of 48 → 3");
row("…seconds from the scan to the tampon", b.secs?.toFixed(0) ?? "—", a.secs?.toFixed(0) ?? "—", "58 → 20");
console.log(`\nA shop opened less than 48 h ago has not had its 48 hours yet: the «after» column grows for two days.`);
