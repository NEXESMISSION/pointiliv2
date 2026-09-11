-- Pointidi V1 — Row Level Security, grants, storage. Re-runnable.
--
-- Model: the browser never writes a table. Every mutation is a security-definer
-- function that identifies the caller with auth.uid(). Tables are readable only
-- through RLS policies scoped to the caller (defense in depth for the
-- functions, which enforce the same rules themselves).

-- ── RLS on every table ─────────────────────────────────────────────────────
do $$
declare t text;
begin
  foreach t in array array['profiles', 'businesses', 'business_members', 'loyalty_cards', 'rewards', 'customers',
                           'qr_tokens', 'stamps', 'reward_redemptions', 'subscriptions', 'payments',
                           'activity_logs', 'rate_limits', 'password_resets'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

-- ── table privileges: read-only for signed-in users, nothing for anon ──────
revoke all on all tables in schema public from anon, authenticated, public;
revoke all on all sequences in schema public from anon, authenticated, public;
grant select on public.profiles, public.businesses, public.business_members, public.loyalty_cards,
                public.rewards, public.customers, public.stamps, public.reward_redemptions,
                public.subscriptions, public.payments
  to authenticated;
grant all on all tables in schema public to service_role;
grant all on all sequences in schema public to service_role;

alter default privileges in schema public revoke all on tables from anon, authenticated, public;
alter default privileges in schema public revoke all on sequences from anon, authenticated, public;

-- ── policies ────────────────────────────────────────────────────────────────
drop policy if exists profiles_read on public.profiles;
create policy profiles_read on public.profiles for select to authenticated
  using (id = (select auth.uid()) or public.is_admin());

drop policy if exists businesses_read on public.businesses;
create policy businesses_read on public.businesses for select to authenticated
  using (public.is_business_member(id) or public.is_business_customer(id) or public.is_admin());

drop policy if exists members_read on public.business_members;
create policy members_read on public.business_members for select to authenticated
  using (user_id = (select auth.uid()) or public.is_admin());

drop policy if exists cards_read on public.loyalty_cards;
create policy cards_read on public.loyalty_cards for select to authenticated
  using (public.is_business_member(business_id) or public.is_business_customer(business_id) or public.is_admin());

drop policy if exists rewards_read on public.rewards;
create policy rewards_read on public.rewards for select to authenticated
  using (public.is_business_member(business_id) or public.is_business_customer(business_id) or public.is_admin());

drop policy if exists customers_read on public.customers;
create policy customers_read on public.customers for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_member(business_id) or public.is_admin());

drop policy if exists stamps_read on public.stamps;
create policy stamps_read on public.stamps for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_member(business_id) or public.is_admin());

drop policy if exists redemptions_read on public.reward_redemptions;
create policy redemptions_read on public.reward_redemptions for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_member(business_id) or public.is_admin());

drop policy if exists subscriptions_read on public.subscriptions;
create policy subscriptions_read on public.subscriptions for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());

drop policy if exists payments_read on public.payments;
create policy payments_read on public.payments for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());

-- qr_tokens, activity_logs, rate_limits, password_resets: RLS on, no policy,
-- no grant — reachable only through functions.

-- ── function privileges: closed by default, opened one by one ──────────────
revoke execute on all functions in schema public from public, anon, authenticated;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
grant execute on all functions in schema public to service_role;

-- used inside RLS policies, so the querying role must be able to call them
grant execute on function public.is_admin(), public.is_business_member(uuid), public.is_business_customer(uuid) to authenticated;

-- customer
grant execute on function
  public.collect_stamp(text, text),
  public.customer_home(),
  public.customer_card(uuid),
  public.customer_rewards(),
  public.request_redemption(uuid),
  public.redemption_status(uuid),
  public.cancel_redemption(uuid),
  public.update_my_profile(text),
  public.session_context(),
  public.create_business(text, text, text, text, text)
to authenticated;

-- merchant (each function checks membership itself)
grant execute on function
  public.mint_qr_token(),
  public.qr_token_state(uuid, timestamptz),
  public.save_loyalty_card(text, text, int, text, text, text, text, int),
  public.merchant_rewards(),
  public.save_reward(uuid, text, text, int, boolean),
  public.merchant_dashboard(),
  public.merchant_activity(text, date, date),
  public.merchant_customers(text, text, int, int),
  public.merchant_customer(uuid),
  public.merchant_lookup_redemption(text),
  public.merchant_pending_redemptions(),
  public.merchant_confirm_redemption(uuid),
  public.merchant_redeem_direct(uuid, uuid),
  public.merchant_analytics(int),
  public.update_business(text, text, text, text),
  public.merchant_billing(),
  public.request_plan(text, text),
  public.cancel_plan_request(uuid)
to authenticated;

-- admin (each function calls require_admin())
grant execute on function
  public.admin_overview(),
  public.admin_activity(text, int),
  public.admin_businesses(text, text),
  public.admin_business(uuid),
  public.admin_set_business_status(uuid, text),
  public.admin_grant_plan(uuid, text, text),
  public.admin_cancel_subscription(uuid),
  public.admin_subscriptions(text),
  public.admin_payments(text),
  public.admin_confirm_payment(uuid),
  public.admin_reject_payment(uuid),
  public.admin_customers(text),
  public.admin_system(),
  public.admin_cleanup()
to authenticated;

-- Tripwire: anon must not be able to execute anything in public.
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then
    raise exception 'anon can execute: %', v_bad;
  end if;
end $$;

-- ── storage: business logos (public read, uploads only via the server) ─────
insert into storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
values ('logos', 'logos', true, 1048576, array['image/png', 'image/jpeg', 'image/webp'])
on conflict (id) do update
  set public = excluded.public, file_size_limit = excluded.file_size_limit, allowed_mime_types = excluded.allowed_mime_types;
