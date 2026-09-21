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
import { runSql } from "./sql.mjs";

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
  section("1 · Merchant creates account and business");
  const merchant = await makeUser("merchant");
  const biz = await rpc(merchant, "create_business", { p_name: "E2E Café", p_category: "cafe", p_owner_name: "Test Owner", p_phone: null, p_email: null });
  check("create_business ok", biz.data?.ok, biz);
  created.businesses.push(biz.data?.business_id);
  const again = await rpc(merchant, "create_business", { p_name: "Second", p_category: "cafe", p_owner_name: "x" });
  check("a second business is refused", again.data?.error === "already_has_business", again.data);
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
  const plan = await rpc(merchant, "request_plan", { p_plan: "yearly", p_method: "bank_transfer" });
  check("merchant requests Yearly → pending payment 120 TND", plan.data?.ok && Number(plan.data.amount) === 120 && /^PTD-/.test(plan.data.payment_reference), plan.data);
  const cantConfirm = await rpc(merchant, "admin_confirm_payment", { p_id: plan.data.id });
  check("merchant cannot confirm their own payment", !!cantConfirm.error);
  // confirm as admin via SQL session emulation
  const adminRow = await runSql(`select id from public.profiles where role = 'admin' limit 1`);
  const conf = await runSql(`select set_config('request.jwt.claims', '{"sub":"${adminRow[0].id}","role":"authenticated"}', true); select public.admin_confirm_payment('${plan.data.id}') as r;`);
  check("admin confirms payment", conf?.[0]?.r?.ok === true, conf);
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
  check("renaming the reward shows the new name", renamed.data?.ok && afterRename.unlocked.includes("Free Cappuccino"), afterRename.unlocked);

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
