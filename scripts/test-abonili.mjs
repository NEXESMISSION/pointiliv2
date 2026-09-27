/**
 * Abonili, end to end through the real functions, as the real roles:
 *   founder → club → formules → members → the door → renewals → money → card
 * plus the walls: a second club sees nothing of the first, anon sees nothing.
 *
 *   node --env-file=.env.local scripts/test-abonili.mjs
 *
 * Everything it makes (three accounts, two clubs) is removed at the end, even
 * when a check fails.
 */
import { createClient } from "@supabase/supabase-js";
import { randomBytes } from "node:crypto";
import { runSql } from "./sql.mjs";

const URL = process.env.NEXT_PUBLIC_SUPABASE_URL;
const ANON = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY;
const service = createClient(URL, process.env.SUPABASE_SERVICE_ROLE_KEY, { auth: { persistSession: false } });
const fresh = () => createClient(URL, ANON, { auth: { persistSession: false } });

let failed = 0;
const ok = (label, cond, extra = "") => {
  if (!cond) failed++;
  console.log(`${cond ? "  ✓" : "  ✗"} ${label}${extra ? " — " + extra : ""}`);
};
const digits = () => `5${String(Math.floor(Math.random() * 1e7)).padStart(7, "0")}`;

async function account(label) {
  const d = digits();
  const password = "T-" + randomBytes(9).toString("hex");
  const { data, error } = await service.auth.admin.createUser({
    email: `216${d}@phone.pointidi.app`, password, email_confirm: true,
    app_metadata: { phone: `+216${d}`, full_name: label },
  });
  if (error) throw new Error(`createUser ${label}: ${error.message}`);
  const c = fresh();
  const { error: e2 } = await c.auth.signInWithPassword({ email: `216${d}@phone.pointidi.app`, password });
  if (e2) throw new Error(`sign in ${label}: ${e2.message}`);
  return { id: data.user.id, digits: d, client: c };
}

const users = [];
try {
  // ── the founder opens a club ────────────────────────────────────────────
  console.log("founder");
  const founder = await account("Founder Test"); users.push(founder.id);
  await runSql(`update public.profiles set role = 'admin' where id = '${founder.id}'`);
  const owner = await account("Owner Test"); users.push(owner.id);
  const stranger = await account("Stranger Test"); users.push(stranger.id);

  const { data: made } = await founder.client.rpc("ab_admin_create_club", {
    p_owner: owner.id, p_name: "Salle Test", p_kind: "gym", p_owner_name: "Hédi Test" });
  ok("ab_admin_create_club", made?.ok, made?.error);
  const clubId = made.club_id;
  const { data: again } = await founder.client.rpc("ab_admin_create_club", {
    p_owner: owner.id, p_name: "Twice", p_kind: "gym", p_owner_name: "" });
  ok("one club per account", again?.error === "already_has_club", again?.error);
  const { data: notAdmin, error: notAdminErr } = await owner.client.rpc("ab_admin_create_club", {
    p_owner: stranger.id, p_name: "Sneaky", p_kind: "gym", p_owner_name: "" });
  ok("an owner cannot open clubs", !notAdmin?.ok && !!notAdminErr, notAdminErr?.message);

  // a second club, to prove the walls between clubs
  const { data: made2 } = await founder.client.rpc("ab_admin_create_club", {
    p_owner: stranger.id, p_name: "Autre Salle", p_kind: "salon", p_owner_name: "" });
  ok("a second club", made2?.ok, made2?.error);

  // ── the owner's context ─────────────────────────────────────────────────
  console.log("owner");
  const o = owner.client;
  const { data: ctx } = await o.rpc("ab_context");
  ok("ab_context finds the club", ctx?.club?.id === clubId, ctx?.club?.name);
  ok("  30 days to start", !!ctx?.club?.paid_until, ctx?.club?.paid_until);
  const { data: noCtx } = await fresh().rpc("ab_context");
  ok("  anon has no context", noCtx === null);

  // ── formules ────────────────────────────────────────────────────────────
  const { data: p1 } = await o.rpc("ab_save_plan", { p_id: null, p_name: "Chahri", p_price: 60, p_days: 30, p_sessions: null, p_active: true });
  const { data: p2 } = await o.rpc("ab_save_plan", { p_id: null, p_name: "10 séances", p_price: 50, p_days: null, p_sessions: 10, p_active: true });
  ok("two formules", p1?.ok && p2?.ok, p1?.error ?? p2?.error);
  const { data: bad } = await o.rpc("ab_save_plan", { p_id: null, p_name: "Forever", p_price: 10, p_days: null, p_sessions: null, p_active: true });
  ok("a formule must end on something", bad?.error === "plan_unlimited", bad?.error);
  const { data: plans } = await o.rpc("ab_plans");
  ok("ab_plans", plans?.length === 2, `${plans?.length}`);

  // ── members ─────────────────────────────────────────────────────────────
  const salahPhone = digits();
  const { data: a1 } = await o.rpc("ab_add_member", { p_name: "Salah Test", p_phone: salahPhone, p_plan: p1.id, p_amount: 60, p_method: "cash", p_starts: null, p_note: null });
  ok("add Salah (monthly, cash)", a1?.ok && a1.code === 1, a1?.error ?? `#${a1?.code}`);
  const { data: dup } = await o.rpc("ab_add_member", { p_name: "Salah Twice", p_phone: salahPhone, p_plan: null, p_amount: 0, p_method: "cash", p_starts: null, p_note: null });
  ok("same phone twice is refused", dup?.error === "phone_taken" && dup.member_id === a1.id, dup?.error);
  const { data: a2 } = await o.rpc("ab_add_member", { p_name: "Amira Test", p_phone: "", p_plan: p2.id, p_amount: 50, p_method: "d17", p_starts: null, p_note: null });
  ok("add Amira (10 séances, D17, no phone)", a2?.ok && a2.code === 2, a2?.error);
  const { data: a3 } = await o.rpc("ab_add_member", { p_name: "Nour Test", p_phone: null, p_plan: null, p_amount: 0, p_method: "cash", p_starts: null, p_note: "pas encore payé" });
  ok("add Nour (no formule yet)", a3?.ok && a3.code === 3, a3?.error);
  const { data: badPlan } = await o.rpc("ab_add_member", { p_name: "Ghost", p_phone: null, p_plan: "00000000-0000-0000-0000-000000000000", p_amount: 10, p_method: "cash", p_starts: null, p_note: null });
  ok("a bad formule leaves no member behind", badPlan?.error === "plan_not_found", badPlan?.error);

  const { data: roster } = await o.rpc("ab_members", { p_filter: "all", p_search: null });
  ok("roster has 3", roster?.items?.length === 3, JSON.stringify(roster?.counts));
  ok("  2 in, 1 not", roster?.counts?.active === 2 && roster?.counts?.expired === 1);
  const salah = roster.items.find((x) => x.code === 1);
  ok("  Salah is in for 30 days", salah?.status === "active" && salah.days_left === 30, `${salah?.status} ${salah?.days_left}`);
  const nour = roster.items.find((x) => x.code === 3);
  ok("  Nour has no abonnement", nour?.status === "none");

  // ── the door ────────────────────────────────────────────────────────────
  console.log("door");
  const { data: byCode } = await o.rpc("ab_door", { p_q: "1" });
  ok("door: by number", byCode?.matches?.[0]?.id === a1.id);
  const { data: byName } = await o.rpc("ab_door", { p_q: "sal" });
  ok("door: by name", byName?.matches?.some((m) => m.id === a1.id));
  const { data: byPhone } = await o.rpc("ab_door", { p_q: salahPhone.slice(2) });
  ok("door: by phone digits", byPhone?.matches?.some((m) => m.id === a1.id));
  const { data: byCard } = await o.rpc("ab_door", { p_q: `https://pointili.online/abonili/c/${salah.card_token}` });
  ok("door: by scanned card URL", byCard?.kind === "card" && byCard.matches?.[0]?.id === a1.id);

  const { data: in1 } = await o.rpc("ab_checkin", { p_member: a1.id, p_force: false });
  ok("Salah walks in", in1?.ok && in1.member.visited_today, in1?.error);
  const { data: in2 } = await o.rpc("ab_checkin", { p_member: a1.id, p_force: false });
  ok("  twice the same day needs a yes", in2?.error === "already_in", in2?.error);
  const { data: in3 } = await o.rpc("ab_checkin", { p_member: a1.id, p_force: true });
  ok("  and goes through with it", in3?.ok);

  const { data: amira } = await o.rpc("ab_checkin", { p_member: a2.id, p_force: false });
  ok("Amira spends a séance", amira?.ok && amira.member.sessions_left === 9, `${amira?.member?.sessions_left} left`);
  const { data: nourIn } = await o.rpc("ab_checkin", { p_member: a3.id, p_force: false });
  ok("Nour is turned away", nourIn?.error === "not_valid", nourIn?.error);

  // séances run out → expired
  await runSql(`update abonili.periods set used = sessions where member_id = '${a2.id}'`);
  const { data: amiraOut } = await o.rpc("ab_checkin", { p_member: a2.id, p_force: true });
  ok("séances used up → turned away", amiraOut?.error === "not_valid" && amiraOut.member?.status === "expired", amiraOut?.member?.status);

  // ── renewals, extensions, cancellations ─────────────────────────────────
  console.log("renewals");
  const { data: ren } = await o.rpc("ab_renew", { p_member: a1.id, p_plan: p1.id, p_amount: 60, p_method: "cash" });
  ok("Salah renews early", ren?.ok, ren?.error);
  const { data: afterRen } = await o.rpc("ab_member", { p_id: a1.id });
  ok("  the renewal queues after the current month", afterRen?.member?.days_left === 60, `${afterRen?.member?.days_left} days`);
  ok("  two periods in the history", afterRen?.periods?.length === 2);
  ok("  paid 120 in total", Number(afterRen?.paid_total) === 120, afterRen?.paid_total);

  const { data: gift } = await o.rpc("ab_add_days", { p_member: a1.id, p_days: 5 });
  const { data: afterGift } = await o.rpc("ab_member", { p_id: a1.id });
  ok("+5 days as a gift", gift?.ok && afterGift.member.days_left === 65, `${afterGift?.member?.days_left}`);

  const queued = afterGift.periods.find((p) => p.state === "upcoming");
  const { data: cancel } = await o.rpc("ab_cancel_period", { p_period: queued.id });
  const { data: afterCancel } = await o.rpc("ab_member", { p_id: a1.id });
  ok("cancelling a sale voids its money", cancel?.ok && Number(afterCancel.paid_total) === 60, afterCancel?.paid_total);
  ok("  and its days", afterCancel.member.days_left === 30, `${afterCancel?.member?.days_left}`);

  // ── money and today ─────────────────────────────────────────────────────
  console.log("money");
  const { data: money } = await o.rpc("ab_money", { p_month: null });
  ok("this month: 110 in, 2 sales", Number(money?.total) === 110 && money.count === 2, `${money?.total} / ${money?.count}`);
  ok("  split by method", Number(money?.by_method?.cash) === 60 && Number(money?.by_method?.d17) === 50, JSON.stringify(money?.by_method));
  const { data: today } = await o.rpc("ab_today");
  ok("today: 3 entries", today?.visits_today === 3, `${today?.visits_today}`);

  // ── the card ────────────────────────────────────────────────────────────
  console.log("card");
  const { data: card } = await service.rpc("ab_card", { p_token: salah.card_token });
  ok("the card opens with its token", card?.ok && card.member.name === "Salah Test");
  ok("  and does not show the phone", card?.ok && !("phone" in card.member));
  const { data: noCard } = await service.rpc("ab_card", { p_token: "x".repeat(24) });
  ok("a wrong token opens nothing", noCard?.error === "not_found");
  const { error: anonCard } = await fresh().rpc("ab_card", { p_token: salah.card_token });
  ok("anon cannot call the card function", !!anonCard, anonCard?.message);

  // ── the walls ───────────────────────────────────────────────────────────
  console.log("walls");
  const s = stranger.client;
  const { data: peek } = await s.rpc("ab_member", { p_id: a1.id });
  ok("another club cannot open Salah", peek?.error === "not_found", peek?.error);
  const { data: peekDoor } = await s.rpc("ab_door", { p_q: "1" });
  ok("  nor find him at its door", (peekDoor?.matches ?? []).length === 0);
  const { data: peekIn } = await s.rpc("ab_checkin", { p_member: a1.id, p_force: true });
  ok("  nor let him in", peekIn?.error === "not_found", peekIn?.error);
  const { error: noClub } = await fresh().rpc("ab_door", { p_q: "1" });
  ok("anon cannot use the door", !!noClub, noClub?.message);
  const { error: rawTable } = await o.schema("abonili").from("members").select("id");
  ok("the tables are not reachable through the API", !!rawTable, rawTable?.message);

  // ── suspended ───────────────────────────────────────────────────────────
  await founder.client.rpc("ab_admin_set_club", { p_id: clubId, p_status: "suspended", p_paid_until: null });
  const { data: susp } = await o.rpc("ab_checkin", { p_member: a1.id, p_force: true });
  ok("a suspended club cannot let people in", susp?.error === "club_suspended", susp?.error);
  const { data: clubs } = await founder.client.rpc("ab_admin_clubs");
  ok("the founder sees both clubs", clubs?.filter((c) => c.id === clubId || c.id === made2.club_id).length === 2);
} catch (e) {
  failed++;
  console.error("✗ crashed:", e.message);
} finally {
  await runSql(`delete from abonili.clubs where owner_id in (${users.map((u) => `'${u}'`).join(",") || "null"})`);
  for (const id of users) await service.auth.admin.deleteUser(id);
  console.log(`\ncleaned up ${users.length} accounts`);
  console.log(failed ? `${failed} FAILED` : "all passed");
  process.exit(failed ? 1 : 0);
}
