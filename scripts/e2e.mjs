/**
 * Pointili acceptance test (spec §50) + the security properties that matter,
 * run against the real Supabase project through the same RPCs the app calls.
 *
 *   npm run test:e2e
 *
 * Creates throwaway users/business (random +2169xxxxxxx numbers) and deletes
 * them at the end, pass or fail.
 */
import { randomBytes } from "node:crypto";
import { createClient } from "@supabase/supabase-js";
import { asFounder, runSql } from "./sql.mjs";

const URL_ = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const SERVICE = process.env.SUPABASE_SERVICE_ROLE_KEY;
const admin = createClient(URL_, SERVICE, { auth: { persistSession: false, autoRefreshToken: false } });

let passed = 0;
const failures = [];
function check(name, cond, detail) {
  if (cond) {
    passed++;
    console.log(`  ✓ ${name}`);
  } else {
    failures.push(name);
    console.log(`  ✗ ${name}${detail !== undefined ? ` — ${JSON.stringify(detail)}` : ""}`);
  }
}
const section = (s) => console.log(`\n${s}`);

const created = { users: [], businesses: [] };
const phone = () => `+2169${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
const authEmail = (p) => `${p.slice(1)}@phone.pointidi.app`;

async function makeUser(label) {
  const p = phone();
  const password = randomBytes(12).toString("base64url");
  const { data, error } = await admin.auth.admin.createUser({ email: authEmail(p), password, email_confirm: true, app_metadata: { phone: p } });
  if (error) throw new Error(`${label}: ${error.message}`);
  created.users.push(data.user.id);
  const client = createClient(URL_, ANON, { auth: { persistSession: false, autoRefreshToken: false } });
  const { error: e2 } = await client.auth.signInWithPassword({ email: authEmail(p), password });
  if (e2) throw new Error(`${label} sign-in: ${e2.message}`);
  return { id: data.user.id, phone: p, client, password };
}

const rpc = async (who, fn, args) => {
  const { data, error } = await who.client.rpc(fn, args);
  return { data, error };
};

async function main() {
  section("1 · Pointili opens the shop — owners never sign up");
  const merchant = await makeUser("merchant");
  const selfOpen = await rpc(merchant, "create_business", { p_name: "Sneaky", p_category: "cafe", p_owner_name: "x", p_phone: null, p_email: null });
  check("an owner cannot open a shop himself (create_business is gone)", !!selfOpen.error, selfOpen.data);
  const notFounder = await rpc(merchant, "admin_create_business", { p_owner: merchant.id, p_name: "Sneaky", p_category: "cafe", p_owner_name: "x" });
  check("only the founder can call admin_create_business", !!notFounder.error, notFounder.data);
  const biz = await asFounder(`select public.admin_create_business('${merchant.id}', 'E2E Café', 'cafe', 'Test Owner') as r`);
  check("the founder opens the shop from the console", biz?.ok, biz);
  created.businesses.push(biz?.business_id);
  const again = await asFounder(`select public.admin_create_business('${merchant.id}', 'Second', 'cafe', 'x') as r`);
  check("a second shop on the same account is refused", again?.error === "already_has_business", again);
  const noCardMint = await rpc(merchant, "mint_qr_token", {});
  check("QR refuses before a loyalty card exists", noCardMint.data?.error === "no_card", noCardMint.data);

  section("2 · Merchant creates 10 stamps → Free Coffee");
  const card = await rpc(merchant, "save_loyalty_card", {
    p_name: "E2E Loyalty", p_description: "", p_stamps_required: 10, p_reward_name: "Free Coffee",
    p_reward_description: "One regular coffee", p_color: "emerald", p_icon: "coffee", p_cooldown_minutes: 60,
  });
  check("save_loyalty_card ok (created)", card.data?.ok && card.data?.created, card.data);
  const ctx = await rpc(merchant, "session_context", {});
  check("session_context shows business, card, trial", ctx.data?.business?.name === "E2E Café" && ctx.data?.card?.stamps_required === 10 && ctx.data?.subscription?.plan === "trial" && ctx.data?.subscription?.open, ctx.data);
  check("merchant role set", ctx.data?.user?.role === "merchant", ctx.data?.user);

  section("3–8 · Merchant opens QR, customer registers and scans");
  const customer = await makeUser("customer");
  const other = await makeUser("other customer");
  const t1 = await rpc(merchant, "mint_qr_token", {});
  check("mint_qr_token returns a token", t1.data?.ok && /^[A-Za-z0-9_-]{32}$/.test(t1.data.token), t1.data);
  const raw = await runSql(`select count(*)::int n from public.qr_tokens where token_hash = '${t1.data.token}'`);
  check("raw token is not stored (only its hash)", raw[0].n === 0, raw);

  const s1 = await rpc(customer, "collect_stamp", { p_token: t1.data.token, p_claim: null });
  check("customer receives +1 stamp", s1.data?.ok && s1.data.customer.balance === 1, s1.data);
  const st = await rpc(merchant, "qr_token_state", { p_id: t1.data.id, p_since: new Date(Date.now() - 60000).toISOString() });
  check("merchant screen sees the token consumed + the stamp", st.data?.consumed && st.data.stamps.length === 1, st.data);

  section("QR security: replay, sharing, expiry, cooldown");
  const replay = await rpc(customer, "collect_stamp", { p_token: t1.data.token, p_claim: null });
  check("same customer re-scanning the same QR → already processed, no stamp", replay.data?.error === "already_processed" && replay.data.customer.balance === 1, replay.data);
  const shared = await rpc(other, "collect_stamp", { p_token: t1.data.token, p_claim: null });
  check("another customer using a used QR → refused", shared.data?.error === "already_used", shared.data);
  const bogus = await rpc(customer, "collect_stamp", { p_token: "A".repeat(32), p_claim: null });
  check("made-up token → invalid", bogus.data?.error === "invalid", bogus.data);

  const t2 = await rpc(merchant, "mint_qr_token", {});
  const soon = await rpc(customer, "collect_stamp", { p_token: t2.data.token, p_claim: null });
  check("second scan within cooldown → too_soon", soon.data?.error === "too_soon" && soon.data.next_at, soon.data);

  const t3 = await rpc(merchant, "mint_qr_token", {});
  await runSql(`update public.qr_tokens set expires_at = now() - interval '1 second' where id = '${t3.data.id}'`);
  const exp = await rpc(other, "collect_stamp", { p_token: t3.data.token, p_claim: null });
  check("expired QR → expired", exp.data?.error === "expired", exp.data);

  const own = await rpc(merchant, "collect_stamp", { p_token: t2.data.token, p_claim: null });
  check("merchant cannot stamp their own card", own.data?.error === "own_business", own.data);

  // Demo mode for the rest of the run: no cooldown between visits.
  await rpc(merchant, "save_loyalty_card", {
    p_name: "E2E Loyalty", p_description: "", p_stamps_required: 10, p_reward_name: "Free Coffee",
    p_reward_description: "One regular coffee", p_color: "emerald", p_icon: "coffee", p_cooldown_minutes: 0,
  });

  section("Race conditions");
  const tr = await rpc(merchant, "mint_qr_token", {});
  const both = await Promise.all([
    rpc(customer, "collect_stamp", { p_token: tr.data.token, p_claim: null }),
    rpc(other, "collect_stamp", { p_token: tr.data.token, p_claim: null }),
  ]);
  check("one QR scanned by two phones at once → exactly one stamp", both.filter((r) => r.data?.ok).length === 1, both.map((r) => r.data?.error ?? "ok"));
  const winnerIsCustomer = both[0].data?.ok;

  const [ta, tb] = await Promise.all([rpc(merchant, "mint_qr_token", {}), rpc(merchant, "mint_qr_token", {})]);
  const par = await Promise.all([
    rpc(other, "collect_stamp", { p_token: ta.data.token, p_claim: null }),
    rpc(other, "collect_stamp", { p_token: tb.data.token, p_claim: null }),
  ]);
  const otherCard = await rpc(other, "customer_home", {});
  const otherBalance = otherCard.data.cards[0]?.balance ?? 0;
  const expectedOther = (winnerIsCustomer ? 0 : 1) + par.filter((r) => r.data?.ok).length;
  check("two simultaneous scans by one customer keep an exact balance", otherBalance === expectedOther && par.every((r) => r.data?.ok), { otherBalance, expectedOther });

  section("Anonymous scan → register → stamp (claim)");
  const tc = await rpc(merchant, "mint_qr_token", {});
  const claimSecret = randomBytes(32).toString("base64url");
  const claim = await admin.rpc("claim_qr_token", { p_token: tc.data.token, p_claim: claimSecret });
  check("signed-out scan reserves the token", claim.data?.ok, claim.data);
  const stc = await rpc(merchant, "qr_token_state", { p_id: tc.data.id, p_since: null });
  check("merchant screen rotates after the reservation", stc.data?.consumed === true, stc.data);
  const thief = await rpc(other, "collect_stamp", { p_token: tc.data.token, p_claim: null });
  check("someone else cannot use a reserved token", thief.data?.error === "already_used", thief.data);
  const newcomer = await makeUser("newcomer");
  const claimed = await rpc(newcomer, "collect_stamp", { p_token: tc.data.token, p_claim: claimSecret });
  check("the new account collects the reserved stamp", claimed.data?.ok && claimed.data.customer.balance === 1, claimed.data);
  const anonClient = createClient(URL_, ANON, { auth: { persistSession: false } });
  const anonClaim = await anonClient.rpc("claim_qr_token", { p_token: tc.data.token, p_claim: claimSecret });
  check("claim_qr_token is not callable with the public key", !!anonClaim.error, anonClaim.data);

  section("Counter QR (printed, never changes, join only)");
  const joinCode = (await rpc(merchant, "session_context", {})).data?.business?.join_code;
  check("business has a permanent join code", /^[A-Za-z0-9_-]{12}$/.test(joinCode ?? ""), joinCode);
  const preview = await admin.rpc("join_card_preview", { p_code: joinCode });
  check("join page preview shows the card and reward", preview.data?.ok && preview.data.card.stamps_required === 10 && preview.data.reward?.name === "Free Coffee", preview.data);
  const anonPreview = await anonClient.rpc("join_card_preview", { p_code: joinCode });
  check("join preview is not callable with the public key", !!anonPreview.error, anonPreview.data);
  const anonJoin = await anonClient.rpc("join_card", { p_code: joinCode });
  check("public key cannot join a card", !!anonJoin.error, anonJoin.data);
  const joiner = await makeUser("joiner");
  const j1 = await rpc(joiner, "join_card", { p_code: joinCode });
  check("scanning the counter QR adds the card", j1.data?.ok && j1.data.created === true, j1.data);
  const jHome = await rpc(joiner, "customer_home", {});
  check("the new card shows 0 / 10 on the customer's home", jHome.data?.cards?.length === 1 && jHome.data.cards[0].balance === 0 && jHome.data.cards[0].card.stamps_required === 10, jHome.data?.cards);
  const j2 = await rpc(joiner, "join_card", { p_code: joinCode });
  check("scanning it again opens the same card — no second card, no stamp", j2.data?.ok && j2.data.created === false && j2.data.customer_id === j1.data.customer_id, j2.data);
  const jBalance = (await rpc(joiner, "customer_card", { p_customer_id: j1.data.customer_id })).data?.customer?.balance;
  check("the counter QR never gives a stamp", jBalance === 0, jBalance);
  const jOwn = await rpc(merchant, "join_card", { p_code: joinCode });
  check("the owner cannot join their own card", jOwn.data?.error === "own_business", jOwn.data);
  const jBad = await rpc(joiner, "join_card", { p_code: "made-up-code-1" });
  check("made-up join code → invalid", jBad.data?.error === "invalid", jBad.data);
  const tj = await rpc(merchant, "mint_qr_token", {});
  const jStamp = await rpc(joiner, "collect_stamp", { p_token: tj.data.token, p_claim: null });
  check("the joined card then collects stamps from the live QR", jStamp.data?.ok && jStamp.data.customer.balance === 1 && jStamp.data.customer.id === j1.data.customer_id, jStamp.data?.customer);

  section("9–11 · Customer reaches 10 / 10 and unlocks Free Coffee");
  let last;
  let home = await rpc(customer, "customer_home", {});
  let balance = home.data.cards[0].balance;
  while (balance < 10) {
    const t = await rpc(merchant, "mint_qr_token", {});
    last = await rpc(customer, "collect_stamp", { p_token: t.data.token, p_claim: null });
    if (!last.data?.ok) break;
    balance = last.data.customer.balance;
  }
  check("card shows 10 / 10", balance === 10, last?.data);
  check("🎉 Free Coffee unlocked on the 10th stamp", last?.data?.newly_unlocked?.[0]?.name === "Free Coffee", last?.data?.newly_unlocked);
  const cardView = await rpc(customer, "customer_card", { p_customer_id: last.data.customer.id });
  check("customer_card: reward unlocked, history has 10 stamps", cardView.data?.rewards?.[0]?.unlocked && cardView.data.history.filter((h) => h.type === "stamp").length === 10, cardView.data?.rewards);

  section("12–14 · Redemption confirmed by merchant, once");
  const rewardId = cardView.data.rewards[0].id;
  const req = await rpc(customer, "request_redemption", { p_reward_id: rewardId });
  check("customer requests redemption → 6-digit code", req.data?.ok && /^\d{6}$/.test(req.data.code), req.data);
  const req2 = await rpc(customer, "request_redemption", { p_reward_id: rewardId });
  check("asking twice returns the same pending code", req2.data?.id === req.data.id, req2.data);
  const selfConfirm = await rpc(customer, "merchant_confirm_redemption", { p_id: req.data.id });
  check("customer cannot confirm their own redemption", !!selfConfirm.error, selfConfirm.data);
  const stranger = await rpc(other, "request_redemption", { p_reward_id: rewardId });
  check("customer without enough stamps cannot request", stranger.data?.error === "not_enough_stamps", stranger.data);

  const look = await rpc(merchant, "merchant_lookup_redemption", { p_code: req.data.code });
  check("merchant finds the request by code", look.data?.ok && look.data.redemption.reward_name === "Free Coffee", look.data);
  const pendingList = await rpc(merchant, "merchant_pending_redemptions", {});
  check("request appears in the live pending list", pendingList.data?.some((r) => r.id === req.data.id), pendingList.data);

  const [c1, c2] = await Promise.all([
    rpc(merchant, "merchant_confirm_redemption", { p_id: req.data.id }),
    rpc(merchant, "merchant_confirm_redemption", { p_id: req.data.id }),
  ]);
  const oks = [c1, c2].filter((r) => r.data?.ok);
  check("double-tap confirm → recorded exactly once", oks.length === 1 && [c1, c2].some((r) => r.data?.error === "already_redeemed"), [c1.data, c2.data]);
  const rec = await runSql(`select reward_id, customer_id, business_id, redeemed_by, redeemed_at, status from public.reward_redemptions where id = '${req.data.id}'`);
  check("backend recorded reward_id, customer_id, business_id, redeemed_by, redeemed_at", rec[0]?.status === "redeemed" && rec[0].redeemed_by === merchant.id && rec[0].redeemed_at && rec[0].business_id === created.businesses[0], rec);
  const status = await rpc(customer, "redemption_status", { p_id: req.data.id });
  check("customer screen sees 'redeemed'", status.data?.status === "redeemed", status.data);
  const reuse = await rpc(customer, "request_redemption", { p_reward_id: rewardId });
  check("customer cannot redeem the same reward again", reuse.data?.error === "not_enough_stamps", reuse.data);
  home = await rpc(customer, "customer_home", {});
  check("balance back to 0, card keeps total visits", home.data.cards[0].balance === 0 && home.data.cards[0].total_stamps === 10, home.data.cards[0]);

  section("15 · Merchant dashboard");
  const dash = await rpc(merchant, "merchant_dashboard", {});
  check("dashboard counts customers (4, incl. the one who joined by counter QR) and 1 redemption", dash.data?.customers === 4 && dash.data.rewards_redeemed === 1, dash.data);
  check("dashboard shows stamps this month", dash.data?.stamps_this_month >= 12, dash.data?.stamps_this_month);
  const list = await rpc(merchant, "merchant_customers", { p_search: null, p_sort: "active", p_limit: 50, p_offset: 0 });
  const top = list.data?.items?.[0];
  check("customer list: most active has 10 visits, masked phone", top?.total_stamps === 10 && /^\+216 •• ••• \d{3}$/.test(top.phone_masked), top);
  const detail = await rpc(merchant, "merchant_customer", { p_customer_id: top.id });
  check("customer detail: 10 total stamps, 1 redeemed", detail.data?.customer?.total_stamps === 10 && detail.data.customer.rewards_redeemed === 1, detail.data?.customer);
  const act = await rpc(merchant, "merchant_activity", { p_range: "today", p_from: null, p_to: null });
  check("activity today: stamps + reward redeemed", act.data?.items?.some((i) => i.type === "reward_redeemed") && act.data.stamps >= 12, { stamps: act.data?.stamps });
  const ana = await rpc(merchant, "merchant_analytics", { p_days: 30 });
  check("analytics: 30-day series, stamps counted", ana.data?.series?.length === 30 && ana.data.stamps >= 12, { len: ana.data?.series?.length, stamps: ana.data?.stamps });

  section("Authorization (server-side, never the browser)");
  const anonStamp = await anonClient.rpc("collect_stamp", { p_token: "A".repeat(32) });
  check("public key cannot call collect_stamp", !!anonStamp.error);
  const anonRead = await anonClient.from("customers").select("*");
  check("public key cannot read tables", !!anonRead.error || (anonRead.data ?? []).length === 0, anonRead.error?.message);
  const custDash = await rpc(customer, "merchant_dashboard", {});
  check("customer cannot open merchant dashboard", !!custDash.error, custDash.error?.message);
  const custAdmin = await rpc(customer, "admin_overview", {});
  check("customer cannot call admin functions", !!custAdmin.error, custAdmin.error?.message);
  const merchAdmin = await rpc(merchant, "admin_overview", {});
  check("merchant cannot call admin functions", !!merchAdmin.error, merchAdmin.error?.message);
  const since = new Date(Date.now() - 86_400_000).toISOString();
  const custTraffic = await rpc(customer, "admin_traffic", { p_from: since, p_to: new Date().toISOString(), p_all: true });
  check("customer cannot read the traffic page", !!custTraffic.error, custTraffic.error?.message);
  const merchVisit = await rpc(merchant, "admin_traffic_session", { p_session: "A".repeat(16) });
  check("merchant cannot open a visit", !!merchVisit.error, merchVisit.error?.message);
  const anonTraffic = await anonClient.rpc("admin_traffic", { p_from: since, p_to: new Date().toISOString(), p_all: true });
  check("public key cannot read traffic", !!anonTraffic.error, anonTraffic.error?.message);
  const events = await customer.client.from("analytics_events").select("id").limit(1);
  check("customer cannot read raw analytics events", !!events.error || (events.data ?? []).length === 0, events.error?.message);
  const forged = await customer.client.from("analytics_events").insert({ kind: "view", path: "/forged" }).select();
  check("customer cannot write analytics events", !!forged.error || (forged.data ?? []).length === 0, forged.error?.message);
  const founderTraffic = await asFounder(`select public.admin_traffic(now() - interval '1 day', now(), true) as r`);
  check("the founder reads the traffic page", typeof founderTraffic?.kpis?.visitors === "number", founderTraffic?.kpis);
  const profiles = await customer.client.from("profiles").select("id");
  check("customer reads only their own profile", profiles.data?.length === 1 && profiles.data[0].id === customer.id, profiles.data?.length);
  const tokens = await customer.client.from("qr_tokens").select("*");
  check("customer cannot read QR tokens", !!tokens.error || tokens.data.length === 0, tokens.error?.message);
  const otherCustomerCard = await rpc(other, "customer_card", { p_customer_id: last.data.customer.id });
  check("customer cannot open someone else's card", otherCustomerCard.data === null, otherCustomerCard.data);
  const upd = await customer.client.from("customers").update({ stamps_balance: 99 }).eq("user_id", customer.id).select();
  check("customer cannot write their own balance", !!upd.error || (upd.data ?? []).length === 0, upd.error?.message);
  const roleHack = await customer.client.from("profiles").update({ role: "admin" }).eq("id", customer.id).select();
  check("customer cannot make themselves admin", !!roleHack.error || (roleHack.data ?? []).length === 0, roleHack.error?.message);
  const signup = await anonClient.auth.signUp({ email: `hack${Date.now()}@example.com`, password: "password1234" });
  check("public sign-up through the auth API is closed", !!signup.error, signup.data?.user?.id);

  section("Billing: expired subscription pauses the QR");
  await runSql(`update public.subscriptions set expires_at = now() - interval '1 minute', starts_at = now() - interval '31 days' where business_id = '${created.businesses[0]}'`);
  const paused = await rpc(merchant, "mint_qr_token", {});
  check("mint refused: subscription_expired", paused.data?.error === "subscription_expired", paused.data);
  const selfPlan = await rpc(merchant, "request_plan", { p_plan: "yearly", p_method: "bank_transfer" });
  check("an owner cannot choose or file a plan himself (request_plan is gone)", !!selfPlan.error, selfPlan.data);
  const selfGrant = await rpc(merchant, "admin_grant_plan", { p_business: created.businesses[0], p_plan: "yearly", p_method: "cash" });
  check("an owner cannot grant himself a plan", !!selfGrant.error);
  const grant = await asFounder(`select public.admin_grant_plan('${created.businesses[0]}', 'yearly', 'cash') as r`);
  check("the founder takes the payment and activates Yearly", grant?.ok === true, grant);
  const bill = await rpc(merchant, "merchant_billing", {});
  check("subscription active on Yearly again, ~1 year left", bill.data?.subscription?.open && bill.data.subscription.plan === "yearly" && bill.data.subscription.days_left >= 364, bill.data?.subscription);
  const back = await rpc(merchant, "mint_qr_token", {});
  check("QR works again after renewal", back.data?.ok, back.data);

  section("Changing the card is fair to customers mid-card");
  const saveCard = (n, reward = "Free Coffee") =>
    rpc(merchant, "save_loyalty_card", {
      p_name: "E2E Loyalty", p_description: "", p_stamps_required: n, p_reward_name: reward,
      p_reward_description: "", p_color: "emerald", p_icon: "coffee", p_cooldown_minutes: 0,
    });
  const stampAs = async (who) => {
    const t = await rpc(merchant, "mint_qr_token", {});
    return rpc(who, "collect_stamp", { p_token: t.data.token, p_claim: null });
  };
  // newcomer has 1 stamp: bring them to a complete 10-stamp card
  let nb;
  for (let i = 0; i < 9; i++) nb = await stampAs(newcomer);
  check("newcomer completes 10 / 10", nb.data?.customer?.balance === 10 && nb.data.newly_unlocked?.length === 1, nb.data?.customer);

  await saveCard(12);
  const afterRaise = await rpc(newcomer, "customer_card", { p_customer_id: nb.data.customer.id });
  check("owner raises 10 → 12: the customer at 10 keeps their unlocked reward", afterRaise.data?.rewards?.[0]?.unlocked === true && afterRaise.data.card.stamps_required === 10, { card: afterRaise.data?.card, reward: afterRaise.data?.rewards?.[0] });
  const imp = await rpc(merchant, "merchant_card_impact", {});
  check("impact report shows their protected goal", imp.data?.stamps_required === 12 && imp.data.progress.some((r) => r.target === 10 && r.balance === 10), imp.data);

  const newStranger = await makeUser("fresh customer");
  const fs = await stampAs(newStranger);
  check("a new customer after the change needs 12", fs.data?.card?.stamps_required === 12, fs.data?.card);

  const nreq = await rpc(newcomer, "request_redemption", { p_reward_id: afterRaise.data.rewards[0].id });
  check("protected customer redeems at their old price (10)", nreq.data?.ok, nreq.data);
  const nconf = await rpc(merchant, "merchant_confirm_redemption", { p_id: nreq.data.id });
  check("merchant confirms; 10 stamps spent", nconf.data?.ok && nconf.data.redemption.stamps_spent === 10, nconf.data?.redemption);
  const next = await stampAs(newcomer);
  check("their next card uses the new goal of 12", next.data?.ok && next.data.card.stamps_required === 12 && next.data.customer.balance === 1, { card: next.data?.card, balance: next.data?.customer?.balance });

  const otherNow = (await rpc(other, "customer_home", {})).data.cards[0];
  await saveCard(Math.max(2, otherNow.balance));
  const afterLower = (await rpc(other, "customer_home", {})).data.cards[0];
  check(`owner lowers to ${Math.max(2, otherNow.balance)}: a customer with ${otherNow.balance} stamps unlocks right away`, afterLower.unlocked.includes("Free Coffee") && afterLower.card.stamps_required === Math.max(2, otherNow.balance), afterLower);

  const renamed = await saveCard(Math.max(2, otherNow.balance), "Free Cappuccino");
  const afterRename = (await rpc(other, "customer_home", {})).data.cards[0];
  check("renaming the gift: a running card keeps the gift it was promised", renamed.data?.ok && afterRename.unlocked.includes("Free Coffee"), afterRename.unlocked);
  const forAll = await rpc(merchant, "save_loyalty_card", {
    p_name: "E2E Loyalty", p_description: "", p_stamps_required: Math.max(2, otherNow.balance), p_reward_name: "Free Cappuccino",
    p_reward_description: "", p_color: "emerald", p_icon: "coffee", p_cooldown_minutes: 0, p_reward_for_all: true,
  });
  const afterForAll = (await rpc(other, "customer_home", {})).data.cards[0];
  check("«للكل»: the owner can give running cards the new gift", forAll.data?.ok && afterForAll.unlocked.includes("Free Cappuccino"), afterForAll.unlocked);

  section("The card has a life: 30 days from the first stamp");
  const withLife = (days) =>
    rpc(merchant, "save_loyalty_card", {
      p_name: "E2E Loyalty", p_description: "", p_stamps_required: 10, p_reward_name: "Free Coffee",
      p_reward_description: "", p_color: "emerald", p_icon: "coffee", p_cooldown_minutes: 0, p_valid_days: days,
    });
  check("owner sets a 30-day card", (await withLife(30)).data?.ok);
  const mayfly = await makeUser("mayfly");
  const m1 = await stampAs(mayfly);
  const deadline = new Date(m1.data?.customer?.expires_at ?? 0).getTime();
  const wanted = Date.now() + 30 * 86400000;
  check("the first stamp starts the clock (~30 days out)", Math.abs(deadline - wanted) < 120000, m1.data?.customer?.expires_at);
  const m2 = await stampAs(mayfly);
  check("the second stamp does not push the deadline back", m2.data?.customer?.expires_at === m1.data.customer.expires_at, m2.data?.customer?.expires_at);

  await runSql(`update public.customers set card_expires_at = now() - interval '1 second' where id = '${m1.data.customer.id}'`);
  const deadHome = (await rpc(mayfly, "customer_home", {})).data.cards[0];
  check("a card past its day reads as zero", deadHome.balance === 0 && deadHome.expires_at === null, deadHome);
  const m3 = await stampAs(mayfly);
  check("the next stamp starts a brand-new card at 1", m3.data?.ok && m3.data.customer.balance === 1, m3.data?.customer);
  check("and a fresh 30 days with it", new Date(m3.data.customer.expires_at).getTime() > Date.now() + 29 * 86400000, m3.data?.customer?.expires_at);
  const logged = await runSql(`select count(*)::int n from public.activity_logs where customer_id = '${m1.data.customer.id}' and type = 'card_expired'`);
  check("the shop's log records the card that ran out", logged[0].n === 1, logged);

  const dying = await makeUser("nearly out of time");
  const d1 = await stampAs(dying);
  await runSql(`update public.customers set stamps_balance = 10, card_target = 10, card_expires_at = now() - interval '1 second' where id = '${d1.data.customer.id}'`);
  const noPay = await rpc(dying, "request_redemption", { p_reward_id: (await rpc(dying, "customer_card", { p_customer_id: d1.data.customer.id })).data.rewards[0].id });
  check("an expired card cannot pay for a reward", noPay.data?.error === "not_enough_stamps", noPay.data);

  check("owner switches the limit off", (await withLife(0)).data?.ok);
  const freed = await runSql(`select count(*)::int n from public.customers where business_id = '${created.businesses[0]}' and card_expires_at is not null`);
  check("no card is left with a deadline", freed[0].n === 0, freed);

  section("The shop's Instagram, and the follow after a stamp");
  const shop = { p_name: "E2E Café", p_category: "cafe", p_phone: null, p_address: null };
  const ig = await rpc(merchant, "update_business", { ...shop, p_instagram: "https://www.instagram.com/E2E.Cafe/?hl=fr" });
  const igCtx = await rpc(merchant, "session_context", {});
  check("a pasted profile link is stored as a bare handle", ig.data?.ok && igCtx.data?.business?.instagram === "e2e.cafe", { ig: ig.data, saved: igCtx.data?.business?.instagram });
  const igBad = await rpc(merchant, "update_business", { ...shop, p_instagram: "not a handle!" });
  check("a name that is not a handle is refused", igBad.data?.error === "invalid_instagram", igBad.data);
  const follower = await makeUser("follower");
  const fStamp = await stampAs(follower);
  check("the stamp screen knows where to send them", fStamp.data?.business?.instagram === "e2e.cafe", fStamp.data?.business);
  const igOff = await rpc(merchant, "update_business", { ...shop, p_instagram: "" });
  check("clearing the field removes it", igOff.data?.ok && (await rpc(merchant, "session_context", {})).data.business.instagram === null, igOff.data);

  section("Levels: gifts on the way to the goal");
  const levelCard = (levels, goal = 10) =>
    rpc(merchant, "save_loyalty_card", {
      p_name: "E2E Loyalty", p_description: "", p_stamps_required: goal, p_reward_name: "Free Coffee",
      p_reward_description: "", p_color: "emerald", p_icon: "coffee", p_cooldown_minutes: 0, p_valid_days: 0, p_levels: levels,
    });
  const tooFar = await levelCard([{ name: "Too far", stamps: 10 }]);
  check("a level must sit below the goal", tooFar.data?.error === "invalid_levels", tooFar.data);
  const twins = await levelCard([{ name: "Cookie", stamps: 3 }, { name: "Muffin", stamps: 3 }]);
  check("two levels on the same number are refused", twins.data?.error === "invalid_levels", twins.data);
  const laddered = await levelCard([{ name: "Croissant", stamps: 3 }, { name: "Orange juice", stamps: 6 }]);
  const lctx = await rpc(merchant, "session_context", {});
  check("owner sets two levels (3, 6) on a 10-stamp card", laddered.data?.ok && lctx.data?.card?.levels?.map((l) => l.stamps).join(",") === "3,6", lctx.data?.card?.levels);

  const climber = await makeUser("climber");
  let cl;
  for (let i = 0; i < 3; i++) cl = await stampAs(climber);
  const lvl1 = cl.data?.newly_unlocked?.[0];
  check("the 3rd stamp unlocks level 1", cl.data?.customer?.balance === 3 && lvl1?.name === "Croissant" && lvl1?.level === true, cl.data?.newly_unlocked);
  const l1req = await rpc(climber, "request_redemption", { p_reward_id: lvl1?.id });
  const l1conf = await rpc(merchant, "merchant_confirm_redemption", { p_id: l1req.data?.id });
  check("the shop hands level 1 over: no stamp spent", l1req.data?.ok && l1conf.data?.ok && l1conf.data.redemption.stamps_spent === 0, { req: l1req.error?.message ?? l1req.data, conf: l1conf.error?.message ?? l1conf.data });
  const afterL1 = await rpc(climber, "customer_card", { p_customer_id: cl.data.customer.id });
  const l1row = afterL1.data?.rewards?.find((r) => r.name === "Croissant");
  check("the card keeps its 3 stamps and shows level 1 as taken", afterL1.data?.customer?.balance === 3 && l1row?.claimed === true && l1row?.unlocked === false, { balance: afterL1.data?.customer?.balance, l1row });
  const twice = await rpc(climber, "request_redemption", { p_reward_id: lvl1?.id });
  check("level 1 cannot be taken twice on one card", twice.data?.error === "already_claimed", twice.data);
  check("the next gift is level 2, three stamps away", afterL1.data?.next_reward?.name === "Orange juice" && afterL1.data.next_reward.remaining === 3, afterL1.data?.next_reward);

  for (let i = 0; i < 7; i++) cl = await stampAs(climber);
  const atGoal = await rpc(climber, "customer_card", { p_customer_id: cl.data.customer.id });
  const waiting = (atGoal.data?.rewards ?? []).filter((r) => r.unlocked).map((r) => r.name).sort().join(",");
  check("at 10: level 2 and the goal are both waiting", atGoal.data?.customer?.balance === 10 && waiting === "Free Coffee,Orange juice", waiting);
  const goal = atGoal.data.rewards.find((r) => r.is_primary);
  const direct = await rpc(merchant, "merchant_redeem_direct", { p_customer_id: cl.data.customer.id, p_reward_id: goal.id });
  check("the goal spends its 10 stamps", direct.data?.ok && direct.data.redemption.stamps_spent === 10, direct.data?.redemption);
  const nextCard = await rpc(climber, "customer_card", { p_customer_id: cl.data.customer.id });
  check("a new card: zero stamps, every level open again", nextCard.data?.customer?.balance === 0 && nextCard.data.rewards.every((r) => !r.claimed), nextCard.data?.rewards);
  const cleared = await levelCard([]);
  check("owner takes the levels off", cleared.data?.ok && (await rpc(merchant, "session_context", {})).data?.card?.levels?.length === 0, cleared.data);


  section("A promise is a promise: changing the card later (board 8)");
  const promiseCard = (o = {}) =>
    rpc(merchant, "save_loyalty_card", {
      p_name: "E2E Loyalty", p_description: "", p_stamps_required: o.goal ?? 10, p_reward_name: o.reward ?? "Free Coffee",
      p_reward_description: "", p_color: "emerald", p_icon: "coffee", p_cooldown_minutes: 0, p_valid_days: o.days ?? 0,
      p_levels: o.levels ?? [], p_expected_version: o.expected ?? null, p_reward_for_all: o.forAll ?? false,
    });
  const cardOf = async (who, id) => (await rpc(who, "customer_card", { p_customer_id: id })).data;
  await promiseCard({ levels: [{ name: "Cookie", stamps: 4 }] });
  const cookieId = (await rpc(merchant, "session_context", {})).data.card.levels[0].id;
  const keeper = await makeUser("promised a cookie");
  let kp;
  for (let i = 0; i < 2; i++) kp = await stampAs(keeper);
  const kid = kp.data.customer.id;

  await promiseCard({ levels: [{ id: cookieId, name: "Cookie", stamps: 6 }] });
  check("a level moved later stays where this card was promised it (4)", (await cardOf(keeper, kid)).rewards.find((r) => r.id === cookieId)?.stamps_required === 4, (await cardOf(keeper, kid)).rewards);
  const fresh = await makeUser("new after the move");
  const fr = await stampAs(fresh);
  check("a card started after the move finds the level at 6", (await cardOf(fresh, fr.data.customer.id)).rewards.find((r) => r.id === cookieId)?.stamps_required === 6, (await cardOf(fresh, fr.data.customer.id)).rewards);

  await promiseCard({ levels: [] });
  check("a level taken off stays on the card that was promised it", (await cardOf(keeper, kid)).rewards.some((r) => r.id === cookieId && r.level), (await cardOf(keeper, kid)).rewards);
  const later = await makeUser("new after the removal");
  const lt = await stampAs(later);
  check("and a card started after the removal does not have it", !(await cardOf(later, lt.data.customer.id)).rewards.some((r) => r.id === cookieId), (await cardOf(later, lt.data.customer.id)).rewards);

  for (let i = 0; i < 2; i++) kp = await stampAs(keeper);
  const kreq = await rpc(keeper, "request_redemption", { p_reward_id: cookieId });
  const kconf = await rpc(merchant, "merchant_confirm_redemption", { p_id: kreq.data?.id });
  check("the promised level is handed over at 4, no stamp spent", kreq.data?.ok && kconf.data?.ok && kconf.data.redemption.stamps_spent === 0, { req: kreq.data, conf: kconf.data });

  await promiseCard({ levels: [{ name: "Muffin", stamps: 3 }] });
  const muffinId = (await rpc(merchant, "session_context", {})).data.card.levels[0].id;
  check("a level added below this card's stamps waits for its next card", !(await cardOf(keeper, kid)).rewards.some((r) => r.id === muffinId), (await cardOf(keeper, kid)).rewards);
  const early = await makeUser("not there yet");
  const er = await stampAs(early);
  check("a card that has not passed it can reach it on this card", (await cardOf(early, er.data.customer.id)).rewards.some((r) => r.id === muffinId && r.stamps_required === 3), (await cardOf(early, er.data.customer.id)).rewards);

  const muffin = [{ id: muffinId, name: "Muffin", stamps: 3 }];
  await promiseCard({ reward: "Free Tea", levels: muffin });
  const primaryOf = async (who, id) => (await cardOf(who, id)).rewards.find((r) => r.is_primary)?.name;
  check("a new main gift: the running card keeps the one it was promised", (await primaryOf(keeper, kid)) === "Free Coffee", await primaryOf(keeper, kid));
  const teaFan = await makeUser("new after the rename");
  const tf = await stampAs(teaFan);
  check("a card started after it gets the new gift", (await primaryOf(teaFan, tf.data.customer.id)) === "Free Tea", await primaryOf(teaFan, tf.data.customer.id));

  const pv = await rpc(merchant, "preview_card_change", { p_stamps_required: 12, p_reward_name: "Free Tea", p_valid_days: 0, p_levels: muffin });
  check("the preview counts the running cards that keep their goal", pv.data?.ok && pv.data.running >= 3 && pv.data.keep_goal === pv.data.running && pv.data.goal_to === 12, pv.data);
  const sess = (await rpc(merchant, "session_context", {})).data;
  check("the session carries the card's version, the one a screen saves against", sess.card?.version === pv.data.version, { session: sess.card?.version, preview: pv.data.version });
  const lower = await rpc(merchant, "preview_card_change", { p_stamps_required: 3, p_reward_name: "Free Tea", p_valid_days: 0, p_levels: [] });
  check("a lower goal: the preview splits the running cards into ready now and on the way", lower.data?.ok && typeof lower.data.on_the_way === "number" && lower.data.unlock_now + lower.data.on_the_way <= lower.data.running, lower.data);
  const stale = await promiseCard({ reward: "Free Tea", levels: muffin, expected: pv.data.version - 1 });
  check("a save made on an old screen is refused (card_changed)", stale.data?.error === "card_changed", stale.data);
  const fine = await promiseCard({ reward: "Free Tea", levels: muffin, expected: pv.data.version });
  check("a save on the current version goes through, as the next version", fine.data?.ok && fine.data.version === pv.data.version + 1, fine.data);

  await promiseCard({ reward: "Free Tea", levels: muffin, days: 60 });
  const sixty = await makeUser("sixty days");
  const sx = await stampAs(sixty);
  const d60 = new Date(sx.data.customer.expires_at).getTime();
  await promiseCard({ reward: "Free Tea", levels: muffin, days: 30 });
  const still = (await cardOf(sixty, sx.data.customer.id)).customer.expires_at;
  check("a shorter life waits for new cards: the running one keeps its 60 days", new Date(still).getTime() === d60, { before: sx.data.customer.expires_at, after: still });
  await promiseCard({ reward: "Free Tea", levels: muffin, days: 0 });

  const hist = await rpc(merchant, "card_history", {});
  check("every save is a version in the history, newest first", hist.data?.ok && hist.data.items.length >= 8 && hist.data.items[0].version === hist.data.live, { live: hist.data?.live, n: hist.data?.items?.length });
  const oldest = hist.data.items[hist.data.items.length - 1];
  const restored = await rpc(merchant, "restore_card_version", { p_version: oldest.version, p_expected_version: hist.data.live, p_reward_for_all: false });
  const afterBack = await rpc(merchant, "session_context", {});
  check("an old version comes back as a new one", restored.data?.ok && restored.data.version === hist.data.live + 1 && afterBack.data.card.stamps_required === oldest.stamps_required, restored.data);
  const lateBack = await rpc(merchant, "restore_card_version", { p_version: oldest.version, p_expected_version: hist.data.live });
  check("a restore from an old screen is refused too (card_changed)", lateBack.data?.error === "card_changed", lateBack.data);

  section("10 → 6 → 10: what turned ready stays ready (board 8)");
  await promiseCard({ goal: 10, reward: "Free Tea", levels: [{ name: "Cookie", stamps: 5 }] });
  const yoyo = await makeUser("yo-yo");
  let yy;
  for (let i = 0; i < 7; i++) yy = await stampAs(yoyo);
  const yid = yy.data.customer.id;
  const cookie = (await rpc(merchant, "session_context", {})).data.card.levels[0].id;
  await promiseCard({ goal: 6, reward: "Free Tea", levels: [{ id: cookie, name: "Cookie", stamps: 3 }] });
  const at6 = (await cardOf(yoyo, yid)).rewards;
  check("lowered to 6: the gift of a card at 7 is ready", at6.find((r) => r.is_primary)?.unlocked === true && at6.find((r) => r.is_primary)?.stamps_required === 6, at6);
  await promiseCard({ goal: 10, reward: "Free Tea", levels: [{ id: cookie, name: "Cookie", stamps: 5 }] });
  const at10 = (await cardOf(yoyo, yid)).rewards;
  check("raised back to 10: it stays ready at 6", at10.find((r) => r.is_primary)?.unlocked === true && at10.find((r) => r.is_primary)?.stamps_required === 6, at10);
  check("and the level moved 5 → 3 → 5 stays at 3 for this card", at10.find((r) => r.id === cookie)?.stamps_required === 3, at10);
  const newbie = await makeUser("after the yo-yo");
  const nw = await stampAs(newbie);
  check("a card started after it finds the goal at 10", (await cardOf(newbie, nw.data.customer.id)).rewards.find((r) => r.is_primary)?.stamps_required === 10);

  section("The owner's welcome: only what the founder could not know");
  const pre = await rpc(merchant, "session_context", {});
  check("a shop the founder opened starts not set up", pre.data?.business?.onboarded_at === null, pre.data?.business?.onboarded_at);
  const welcome = await rpc(merchant, "finish_welcome", { p_address: "Rue de Marseille, Tunis", p_instagram: "@e2e.cafe" });
  const post = await rpc(merchant, "session_context", {});
  check("finishing the welcome marks it done, with the address", welcome.data?.ok && !!post.data?.business?.onboarded_at && post.data.business.address === "Rue de Marseille, Tunis", post.data?.business);
  const custWelcome = await rpc(customer, "finish_welcome", { p_address: "x", p_instagram: null });
  check("a customer cannot call the owner's welcome", !!custWelcome.error, custWelcome.data);


  section("«ادخل كمحل»: the founder inside a shop (0013)");
  const biz0 = created.businesses[0];
  const inside = await asFounder(`select public.admin_act_as('${biz0}') as r`);
  const ctxIn = await asFounder(`select public.session_context() as r`);
  check("the founder enters a shop: its context, the owner's role, «acting»", inside?.ok && ctxIn?.acting === true && ctxIn?.business?.id === biz0 && ctxIn?.member_role === "owner", { acting: ctxIn?.acting, role: ctxIn?.member_role });
  const powers = await asFounder(`select public.preview_card_change(10, 'Free Tea', 0, '[]'::jsonb) as r`);
  check("inside, the founder has the owner's powers", powers?.ok === true, powers);
  const out = await asFounder(`select public.admin_stop_acting() as r`);
  const ctxOut = await asFounder(`select public.session_context() as r`);
  check("leaving the shop ends it", out?.ok && ctxOut?.acting === false && ctxOut?.business?.id !== biz0, { acting: ctxOut?.acting });
  const custIn = await rpc(customer, "admin_act_as", { p_business: biz0 });
  check("a customer cannot enter a shop", !!custIn.error || custIn.data?.ok !== true, custIn.data);

  section("A suspended shop's clocks stop (board 8)");
  await promiseCard({ reward: "Free Tea", levels: muffin, days: 30 });
  const sleeper = await makeUser("card on hold");
  const sl = await stampAs(sleeper);
  const before = new Date(sl.data.customer.expires_at).getTime();
  await asFounder(`select public.admin_set_business_status('${biz0}', 'suspended') as r`);
  await runSql(`update public.businesses set suspended_at = now() - interval '3 days' where id = '${biz0}'`);
  await asFounder(`select public.admin_set_business_status('${biz0}', 'active') as r`);
  const after = new Date((await cardOf(sleeper, sl.data.customer.id)).customer.expires_at).getTime();
  check("back from suspension, the card got its 3 days back", Math.abs(after - before - 3 * 86400000) < 120000, { before, after });
  await promiseCard({ reward: "Free Tea", levels: muffin, days: 0 });

  section("The founder's hand on a subscription");
  const until = new Date(Date.now() + 45 * 86400000).toISOString();
  const setSub = await asFounder(`select public.admin_set_subscription('${created.businesses[0]}', 'six_month', '${until}'::timestamptz, 55, 'd17') as r`);
  const bill45 = await rpc(merchant, "merchant_billing", {});
  check("the founder sets 6 months until a date he picks", setSub?.ok && bill45.data?.subscription?.plan === "six_month" && Math.abs(bill45.data.subscription.days_left - 45) <= 1, bill45.data?.subscription);
  const paid = await runSql(`select amount::float as amount, method from public.payments where subscription_id = '${setSub?.subscription_id}'`);
  check("his price is recorded as a payment", paid[0]?.amount === 55 && paid[0]?.method === "d17", paid);
  const ext = await asFounder(`select public.admin_extend_subscription('${created.businesses[0]}', 30) as r`);
  const bill75 = await rpc(merchant, "merchant_billing", {});
  check("+30 days moves the end by a month", ext?.ok && Math.abs(bill75.data?.subscription?.days_left - 75) <= 1, bill75.data?.subscription);
  const selfSet = await rpc(merchant, "admin_set_subscription", { p_business: created.businesses[0], p_plan: "yearly", p_expires_at: until, p_price: 0, p_method: "cash" });
  check("an owner cannot set his own subscription", !!selfSet.error, selfSet.data);
  const past = await asFounder(`select public.admin_set_subscription('${created.businesses[0]}', 'yearly', now() - interval '1 day', 0, 'cash') as r`);
  check("an end date in the past is refused", past?.error === "invalid_date", past);
}

try {
  await main();
} catch (e) {
  failures.push(`crashed: ${e.message}`);
  console.error(e);
} finally {
  section("Cleanup");
  for (const b of created.businesses.filter(Boolean)) await admin.from("businesses").delete().eq("id", b);
  for (const u of created.users) await admin.auth.admin.deleteUser(u);
  await runSql(`delete from public.rate_limits where key like 'stamp:%' and window_start < now() - interval '1 hour'`);
  console.log(`  removed ${created.users.length} users, ${created.businesses.length} business`);
  console.log(`\n${passed} passed, ${failures.length} failed`);
  if (failures.length) {
    console.log(failures.map((f) => ` - ${f}`).join("\n"));
    process.exit(1);
  }
}
