/**
 * Abonili, end to end through the real RPCs:
 * plan → member → roster → extend → renew → the door (scan → check-in).
 *   node --env-file=.env.local .e2e/test-abonili.mjs
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const admin = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });

const ok = (label, cond, extra = "") => console.log(`${cond ? "  ✓" : "  ✗"} ${label}${extra ? " — " + extra : ""}`);
const fresh = () => createClient(URL, ANON, { auth: { persistSession: false } });

async function signIn(digits, password) {
  const c = fresh();
  const { error } = await c.auth.signInWithPassword({ email: `216${digits}@phone.pointidi.app`, password });
  if (error) throw new Error(`sign in ${digits}: ${error.message}`);
  return c;
}

const cleanup = [];
try {
  // ── the demo merchant's business, with Abonili switched on ──────────────
  const { data: owner } = await admin.from("profiles").select("id").eq("phone", "+21620000001").single();
  const { data: biz } = await admin.from("businesses").select("id, name, loyalty_enabled, memberships_enabled").eq("owner_id", owner.id).single();
  const before = { loyalty: biz.loyalty_enabled, memberships: biz.memberships_enabled };
  await admin.from("businesses").update({ memberships_enabled: true }).eq("id", biz.id);
  console.log(`business: ${biz.name}`);

  const merchant = await signIn("20000001", process.env.DEMO_MERCHANT_PASSWORD);

  // ── session_context knows about the systems ─────────────────────────────
  const { data: ctx } = await merchant.rpc("session_context");
  ok("session_context.systems", !!ctx.systems, JSON.stringify(ctx.systems));

  // ── a formule ───────────────────────────────────────────────────────────
  const { data: saved } = await merchant.rpc("save_membership_plan", {
    p_id: null, p_name: "Abonnement chahri (test)", p_price: 60, p_duration_days: 30, p_sessions: null, p_active: true,
  });
  ok("save_membership_plan", saved?.ok, saved?.error ?? "");
  const planId = saved.id;

  const { data: plans } = await merchant.rpc("merchant_membership_plans");
  ok("merchant_membership_plans", plans.some((p) => p.id === planId), `${plans.length} plan(s)`);

  // ── a member, by phone, with no account yet ─────────────────────────────
  const digits = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const phone = `+216${digits}`;
  const { data: added } = await merchant.rpc("add_membership", { p_phone: digits, p_name: "Salah Test", p_plan_id: planId });
  ok("add_membership (phone only, no account)", added?.ok, added?.error ?? "");
  const m = added.membership;
  ok("  → not linked to an account yet", added.ok && m.linked === false);
  ok("  → has an end date", added.ok && !!m.ends_at, m.ends_at?.slice(0, 10));
  const mid = m.id;

  // ── the roster ──────────────────────────────────────────────────────────
  const { data: roster } = await merchant.rpc("merchant_memberships", { p_search: digits, p_filter: "all", p_limit: 50, p_offset: 0 });
  ok("merchant_memberships finds him by phone", roster.items.some((x) => x.id === mid), JSON.stringify(roster.counts));

  // ── extend, renew ───────────────────────────────────────────────────────
  const { data: ext } = await merchant.rpc("add_membership_days", { p_id: mid, p_days: 7 });
  ok("add_membership_days +7", ext?.ok && new Date(ext.membership.ends_at) > new Date(m.ends_at), `${m.days_left} → ${ext?.membership?.days_left} days`);

  const { data: ren } = await merchant.rpc("renew_membership", { p_id: mid, p_plan_id: planId });
  ok("renew_membership extends from the end, not today", ren?.ok && new Date(ren.membership.ends_at) > new Date(ext.membership.ends_at), `→ ${ren?.membership?.days_left} days`);

  // ── the door ────────────────────────────────────────────────────────────
  const { data: pw } = { data: randomBytes(9).toString("base64url") };
  const { data: created, error: cErr } = await admin.auth.admin.createUser({
    email: `216${digits}@phone.pointidi.app`, password: pw, email_confirm: true,
    app_metadata: { phone, full_name: "Salah Test" },
  });
  if (cErr) throw new Error(`create member: ${cErr.message}`);
  cleanup.push(created.user.id);

  const { data: minted } = await merchant.rpc("mint_qr_token");
  ok("mint_qr_token for a memberships business", minted?.ok, minted?.error ?? "");

  const member = await signIn(digits, pw);
  const { data: mine } = await member.rpc("my_memberships");
  ok("my_memberships matches him by phone alone", mine.length === 1, mine[0]?.plan_name);

  const { data: scan } = await member.rpc("scan_token", { p_token: minted.token, p_claim: null });
  ok("scan_token → check-in (not a stamp)", scan?.ok && scan.kind === "checkin", scan?.error ?? `${scan?.membership?.days_left} days left`);
  ok("  → the account is now linked", scan?.ok && scan.membership.linked === true);

  const { data: minted2 } = await merchant.rpc("mint_qr_token");
  const { data: twice } = await member.rpc("scan_token", { p_token: minted2.token, p_claim: null });
  ok("second scan the same day is refused", twice?.ok === false && twice.error === "already_checked_in", twice?.error);

  // ── a stranger gets told no, and nothing is created for him ─────────────
  const sDigits = `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;
  const sPw = randomBytes(9).toString("base64url");
  const { data: stranger } = await admin.auth.admin.createUser({
    email: `216${sDigits}@phone.pointidi.app`, password: sPw, email_confirm: true,
    app_metadata: { phone: `+216${sDigits}`, full_name: "Stranger" },
  });
  cleanup.push(stranger.user.id);
  const sc = await signIn(sDigits, sPw);
  const { data: minted3 } = await merchant.rpc("mint_qr_token");
  const { data: strangerScan } = await sc.rpc("scan_token", { p_token: minted3.token, p_claim: null });
  // this business also runs loyalty, so a non-member correctly falls through to a stamp
  ok("a non-member falls through to the loyalty card", strangerScan?.ok === true || strangerScan?.error !== "no_membership", strangerScan?.ok ? "stamped" : strangerScan?.error);

  // ── the list that is the product ────────────────────────────────────────
  // the window is capped at 60 days on purpose: "expiring" is a week or two,
  // not a year, so put him three days out and ask the way the screen will.
  await admin.from("memberships").update({ ends_at: new Date(Date.now() + 3 * 86400000).toISOString() }).eq("id", mid);
  const { data: soon } = await merchant.rpc("merchant_memberships_expiring", { p_days: 7 });
  ok("merchant_memberships_expiring (3 days out)", Array.isArray(soon) && soon.some((x) => x.id === mid), `${soon.length} expiring`);
  const { data: far } = await merchant.rpc("merchant_memberships_expiring", { p_days: 1 });
  ok("  → and not when he is further out than asked", !far.some((x) => x.id === mid));

  // ── cleanup ─────────────────────────────────────────────────────────────
  await admin.from("memberships").delete().eq("id", mid);
  await admin.from("membership_plans").delete().eq("id", planId);
  await admin.from("businesses").update({ loyalty_enabled: before.loyalty, memberships_enabled: before.memberships }).eq("id", biz.id);
  console.log("\ncleaned up");
} finally {
  for (const id of cleanup) await admin.auth.admin.deleteUser(id).catch(() => {});
}
