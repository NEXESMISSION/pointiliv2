-- Pointili — no Abonili, anywhere. Re-runnable.
--
-- Abonili (a membership product for gyms) was tried twice and cancelled on
-- 2026-09-27. The first version (0006, 0007) lived inside the Pointili shop:
-- two flags on businesses, a shared scan_token, a counter screen and a session
-- that described both. The second (0010, 0011) had its own `abonili` schema
-- and public.ab_* functions. Neither exists any more; this file makes sure no
-- database carries anything of them, and puts the three shared functions back
-- to knowing about stamps only.
--
-- Order matters: the shared functions are rewritten BEFORE the tables and
-- columns they used to read are dropped, so there is never a moment where
-- session_context points at a table that no longer exists.
--
-- On a fresh database none of the old objects exist and every drop is a no-op.

-- ── 1. the three shared functions, back to one system ──────────────────────

create or replace function public.session_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_biz uuid; v_role text;
begin
  if v_uid is null then return null; end if;
  select bm.business_id, bm.role into v_biz, v_role
  from public.business_members bm where bm.user_id = v_uid
  order by (bm.role = 'owner') desc, bm.created_at limit 1;

  return jsonb_build_object(
    'user', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone,
                                       'email', p.email, 'role', p.role, 'created_at', p.created_at)
             from public.profiles p where p.id = v_uid),
    'member_role', v_role,
    'business', (select jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
                                           'phone', b.phone, 'address', b.address, 'instagram', b.instagram,
                                           'status', b.status, 'created_at', b.created_at,
                                           'cover_url', b.cover_url, 'join_code', b.join_code)
                 from public.businesses b where b.id = v_biz),
    'card', (select jsonb_build_object('id', k.id, 'name', k.name, 'description', k.description,
                                       'stamps_required', k.stamps_required, 'color', k.color, 'icon', k.icon,
                                       'cooldown_minutes', k.cooldown_minutes, 'valid_days', k.valid_days,
                                       'active', k.active, 'design', k.design,
                                       'reward', (select jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description)
                                                  from public.rewards r where r.loyalty_card_id = k.id and r.is_primary))
             from public.loyalty_cards k where k.business_id = v_biz),
    'subscription', case when v_biz is null then null else public.subscription_state(v_biz) end
  );
end $$;

-- A shop with no card has nothing to put behind a QR.
create or replace function public.mint_qr_token() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_b public.businesses%rowtype;
  v_token text;
  v_id uuid;
  v_exp timestamptz := now() + interval '60 seconds';
begin
  select * into v_b from public.businesses where id = v_biz;
  if v_b.status <> 'active' then return public.err('business_suspended'); end if;
  if not public.business_is_open(v_biz) then return public.err('subscription_expired'); end if;
  if not exists (select 1 from public.loyalty_cards where business_id = v_biz and active) then
    return public.err('no_card');
  end if;
  if not public.rate_limit_hit('mint:' || v_biz, 300, 600) then return public.err('rate_limited'); end if;

  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.qr_tokens (business_id, token_hash, created_by, expires_at)
  values (v_biz, public.sha256_hex(v_token), auth.uid(), v_exp)
  returning id into v_id;

  -- housekeeping: unused tokens have no audit value once long expired
  delete from public.qr_tokens
  where business_id = v_biz and used_at is null and claim_hash is null and expires_at < now() - interval '1 day';

  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_token, 'expires_at', v_exp,
                            'ttl_seconds', 60, 'business_name', v_b.name);
end $$;

-- The counter poll: has the shown token been used, and which stamps landed.
create or replace function public.qr_token_state(p_id uuid, p_since timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  t public.qr_tokens%rowtype;
begin
  select * into t from public.qr_tokens where id = p_id and business_id = v_biz;
  return jsonb_build_object(
    'found', t.id is not null,
    'consumed', t.id is not null and (t.used_at is not null or t.claim_hash is not null),
    'expired', t.id is null or t.expires_at <= now(),
    'expires_at', t.expires_at,
    'open', public.business_is_open(v_biz),
    'stamps', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'at', s.created_at, 'code', c.code, 'balance', c.stamps_balance) order by s.created_at)
      from (select * from public.stamps where business_id = v_biz and created_at > coalesce(p_since, now()) order by created_at desc limit 20) s
      join public.customers c on c.id = s.customer_id
    ), '[]'::jsonb)
  );
end $$;

-- ── 2. every function the first Abonili added, whatever its signature ──────
do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'scan_token', 'membership_checkin', 'membership_view', 'membership_status', 'gen_membership_code',
        'normalise_phone', 'merchant_membership_plans', 'save_membership_plan', 'merchant_memberships',
        'merchant_membership', 'add_membership', 'renew_membership', 'add_membership_days',
        'cancel_membership', 'merchant_memberships_expiring', 'my_memberships', 'admin_set_systems')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end $$;

-- ── 3. its tables (policies, indexes and triggers go with them) ────────────
drop table if exists public.checkins cascade;
drop table if exists public.memberships cascade;
drop table if exists public.membership_plans cascade;

-- the log lines that described them: every one points at a row that is gone
delete from public.activity_logs
where type in ('checkin', 'membership_added', 'membership_renewed', 'membership_extended',
               'membership_cancelled', 'systems_changed');

-- ── 4. the two flags that made one business two products ───────────────────
alter table public.businesses drop column if exists memberships_enabled;
alter table public.businesses drop column if exists loyalty_enabled;

-- ── 5. the second Abonili: its schema, its functions, and the unfinished ────
--       console controls that leaned on it
drop schema if exists abonili cascade;

do $$
declare r record;
begin
  for r in
    select p.oid::regprocedure as sig
    from pg_proc p
    where p.pronamespace = 'public'::regnamespace
      and p.proname in (
        'ab_context', 'ab_update_club', 'ab_plans', 'ab_save_plan', 'ab_members', 'ab_member', 'ab_add_member',
        'ab_update_member', 'ab_renew', 'ab_add_days', 'ab_cancel_period', 'ab_door', 'ab_checkin', 'ab_today',
        'ab_money', 'ab_card', 'ab_admin_clubs', 'ab_admin_create_club', 'ab_admin_set_club', 'ab_admin_set_club_plan',
        'admin_set_plan', 'admin_update_subscription', 'admin_extend_subscription', 'admin_end_subscription',
        'admin_record_payment', 'admin_update_business', 'tunis_day_start', 'tunis_day_end')
  loop
    execute format('drop function if exists %s cascade', r.sig);
  end loop;
end $$;

-- the plans go back to the three Pointili sells
alter table public.subscriptions drop constraint if exists subscriptions_plan_check;
alter table public.subscriptions add constraint subscriptions_plan_check check (plan in ('trial', 'six_month', 'yearly'));
alter table public.payments drop constraint if exists payments_plan_check;
alter table public.payments add constraint payments_plan_check check (plan in ('six_month', 'yearly'));

-- nothing here may be reachable by anon (0003's tripwire, re-run)
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
