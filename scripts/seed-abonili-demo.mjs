/**
 * A demo Abonili club, full of believable members, for trying the product or
 * showing it to a salle owner. The login goes to .e2e/abonili-demo.json
 * (gitignored) — never to the console.
 *
 *   node --env-file=.env.local scripts/seed-abonili-demo.mjs            # make it (or reuse it)
 *   node --env-file=.env.local scripts/seed-abonili-demo.mjs --cleanup  # remove it entirely
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { existsSync, mkdirSync, readFileSync, rmSync, writeFileSync } from "node:fs";
import { runSql } from "./sql.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const FILE = ".e2e/abonili-demo.json";
const saved = existsSync(FILE) ? JSON.parse(readFileSync(FILE, "utf8")) : null;

if (process.argv.includes("--cleanup")) {
  if (!saved) {
    console.log("nothing to clean");
    process.exit(0);
  }
  await runSql(`delete from abonili.clubs where owner_id = '${saved.user_id}'`);
  await service.auth.admin.deleteUser(saved.user_id);
  rmSync(FILE);
  console.log("demo club and its account removed");
  process.exit(0);
}

if (saved) {
  console.log(`demo already exists — login in ${FILE}`);
  process.exit(0);
}

const digits = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const password = "Demo-" + randomBytes(6).toString("hex");
const { data: made, error } = await service.auth.admin.createUser({
  email: `216${digits}@phone.pointidi.app`, password, email_confirm: true,
  app_metadata: { phone: `+216${digits}`, full_name: "Karim Démo" },
});
if (error) throw new Error(error.message);
const userId = made.user.id;
mkdirSync(".e2e", { recursive: true });
writeFileSync(FILE, JSON.stringify({ phone: digits, password, user_id: userId }, null, 2));

await runSql(`insert into abonili.clubs (owner_id, name, kind, phone, address, paid_until)
              values ('${userId}', 'Iron Gym Ennasr', 'gym', '+216${digits}', 'Ennasr 2, Ariana', abonili.today() + 300)`);

const owner = createClient(URL, process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY, { auth: { persistSession: false } });
await owner.auth.signInWithPassword({ email: `216${digits}@phone.pointidi.app`, password });
const rpc = async (fn, args) => {
  const { data, error: e } = await owner.rpc(fn, args);
  if (e || data?.ok === false) throw new Error(`${fn}: ${e?.message ?? data.error}`);
  return data;
};

const month = await rpc("ab_save_plan", { p_id: null, p_name: "Chahri", p_price: 60, p_days: 30, p_sessions: null, p_active: true });
const quarter = await rpc("ab_save_plan", { p_id: null, p_name: "3 chhour", p_price: 160, p_days: 90, p_sessions: null, p_active: true });
const ten = await rpc("ab_save_plan", { p_id: null, p_name: "10 séances", p_price: 45, p_days: 60, p_sessions: 10, p_active: true });

const people = [
  ["Salah Ben Ali", month.id, 60, "cash"],
  ["Amira Trabelsi", quarter.id, 160, "d17"],
  ["Youssef Gharbi", ten.id, 45, "cash"],
  ["Nour Hammami", month.id, 60, "cash"],
  ["Mehdi Jaziri", month.id, 60, "transfer"],
  ["Rania Bouzid", quarter.id, 150, "cash"],
  ["Hamza Sassi", month.id, 60, "cash"],
  ["Ines Mabrouk", ten.id, 45, "d17"],
];
const ids = [];
for (const [name, plan, amount, method] of people) {
  const phone = `9${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const r = await rpc("ab_add_member", { p_name: name, p_phone: phone, p_plan: plan, p_amount: amount, p_method: method, p_starts: null, p_note: null });
  ids.push(r.id);
}

// make the roster look lived-in: one ends in 3 days, two ended, one spent most séances
const [salah, , youssef, nour, mehdi, , hamza] = ids;
await runSql(`
  update abonili.periods set starts_on = abonili.today() - 27, ends_on = abonili.today() + 2 where member_id = '${nour}';
  update abonili.periods set starts_on = abonili.today() - 40, ends_on = abonili.today() - 10 where member_id = '${mehdi}';
  update abonili.periods set starts_on = abonili.today() - 33, ends_on = abonili.today() - 3 where member_id = '${hamza}';
  update abonili.periods set used = 8 where member_id = '${youssef}';
  update abonili.payments set paid_at = now() - interval '35 days' where member_id in ('${mehdi}', '${hamza}');
  insert into abonili.visits (club_id, member_id, at)
    select m.club_id, m.id, now() - (d || ' days')::interval - (random() * interval '6 hours')
    from abonili.members m cross join generate_series(1, 9) d
    where m.id in ('${salah}', '${nour}', '${youssef}') and random() < 0.7;
`);
await rpc("ab_checkin", { p_member: salah, p_force: false });

console.log(`demo club "Iron Gym Ennasr" ready — ${ids.length} members, 3 formules. Login in ${FILE}`);
