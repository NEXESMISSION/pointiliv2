-- Pointili — only the founder opens a shop. Re-runnable.
--
-- Accounts are made by hand, at the door, by the founder: he takes the money,
-- installs the QR, sets the plan and leaves the owner able to sign in. Owners
-- never sign up, never open a shop and never choose or pay for a plan by
-- themselves — the console does all of it.
--
-- The auth user itself is created by the server (service role, the only key
-- allowed to mint one); admin_create_business takes it from there.

-- ── the owner's own doors, closed ──────────────────────────────────────────
-- create_business let any signed-in account open a shop for itself, and
-- request_plan / cancel_plan_request let an owner file his own plan purchase.
-- Removing the /register page was not enough: these answered straight from the
-- API. They are no longer defined in 0002; this removes them from any database
-- created before that.
drop function if exists public.create_business(text, text, text, text, text);
drop function if exists public.request_plan(text, text);
drop function if exists public.cancel_plan_request(uuid);

-- ── admin_business: one shop, everything the console shows about it ────────
create or replace function public.admin_business(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return (
    select jsonb_build_object(
      'id', b.id, 'name', b.name, 'category', b.category, 'status', b.status, 'phone', b.phone, 'address', b.address,
      'logo_url', b.logo_url, 'created_at', b.created_at,
      'owner', jsonb_build_object('id', p.id, 'name', p.full_name, 'phone', p.phone, 'email', p.email),
      'card', (select jsonb_build_object('name', k.name, 'stamps_required', k.stamps_required, 'active', k.active,
                                         'cooldown_minutes', k.cooldown_minutes)
               from public.loyalty_cards k where k.business_id = b.id),
      'rewards', (select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'stamps_required', r.stamps_required, 'active', r.active)), '[]'::jsonb)
                  from public.rewards r where r.business_id = b.id),
      'stats', jsonb_build_object(
        'customers', (select count(*) from public.customers where business_id = b.id),
        'stamps', (select count(*) from public.stamps where business_id = b.id),
        'stamps_today', (select count(*) from public.stamps where business_id = b.id and created_at >= public.tunis_today_start()),
        'redemptions', (select count(*) from public.reward_redemptions where business_id = b.id and status = 'redeemed'),
        'last_stamp_at', (select max(created_at) from public.stamps where business_id = b.id)),
      'subscription', public.subscription_state(b.id),
      'subscriptions', (select coalesce(jsonb_agg(jsonb_build_object('id', s.id, 'plan', s.plan, 'price', s.price, 'starts_at', s.starts_at,
                                                                     'expires_at', s.expires_at, 'status', s.status) order by s.expires_at desc), '[]'::jsonb)
                        from public.subscriptions s where s.business_id = b.id),
      'payments', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'plan', x.plan, 'amount', x.amount, 'method', x.method,
                                                                'status', x.status, 'payment_reference', x.payment_reference,
                                                                'created_at', x.created_at, 'confirmed_at', x.confirmed_at) order by x.created_at desc), '[]'::jsonb)
                   from public.payments x where x.business_id = b.id)
    )
    from public.businesses b join public.profiles p on p.id = b.owner_id
    where b.id = p_id
  );
end $$;

-- ── admin_businesses: the roster ───────────────────────────────────────────
-- Copied from 0002 as it stands; its filters and owner.email are what the list
-- page reads.
create or replace function public.admin_businesses(p_filter text default 'all', p_search text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_search), ''), '%', ''), '_', '') || '%';
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(item order by created_at desc) from (
      select b.created_at, jsonb_build_object(
        'id', b.id, 'name', b.name, 'category', b.category, 'status', b.status, 'logo_url', b.logo_url,
        'created_at', b.created_at, 'owner', jsonb_build_object('name', p.full_name, 'phone', p.phone, 'email', p.email),
        'customers', (select count(*) from public.customers c where c.business_id = b.id),
        'stamps', (select count(*) from public.stamps s where s.business_id = b.id),
        'subscription', st.state
      ) as item
      from public.businesses b
      join public.profiles p on p.id = b.owner_id
      cross join lateral (select public.subscription_state(b.id) as state) st
      where (p_search is null or trim(p_search) = '' or b.name ilike v_like or p.phone like v_like or p.full_name ilike v_like)
        and case coalesce(p_filter, 'all')
              when 'active' then b.status = 'active' and (st.state ->> 'open')::boolean
              when 'expiring' then st.state ->> 'status' = 'expiring_soon'
              when 'expired' then st.state ->> 'status' in ('expired', 'cancelled', 'none')
              when 'suspended' then b.status = 'suspended'
              when 'trial' then st.state ->> 'plan' = 'trial' and (st.state ->> 'open')::boolean
              else true end
    ) s
  ), '[]'::jsonb);
end $$;

-- ── open a shop for somebody else ──────────────────────────────────────────
-- The profile already exists (the server made the auth user a moment ago);
-- this hands it a business and a 30-day window to work in.
drop function if exists public.admin_create_business(uuid, text, text, text, boolean, boolean);

create or replace function public.admin_create_business(
  p_owner uuid, p_name text, p_category text, p_owner_name text
) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_name text := trim(coalesce(p_name, ''));
begin
  perform public.require_admin();
  if char_length(v_name) < 2 or char_length(v_name) > 60 then return public.err('invalid_name'); end if;
  if not exists (select 1 from public.profiles where id = p_owner) then return public.err('not_found'); end if;
  if exists (select 1 from public.business_members where user_id = p_owner) then return public.err('already_has_business'); end if;

  insert into public.businesses (name, category, owner_id, phone)
  values (v_name, coalesce(nullif(p_category, ''), 'cafe'), p_owner,
          (select phone from public.profiles where id = p_owner))
  returning id into v_id;

  insert into public.business_members (business_id, user_id, role) values (v_id, p_owner, 'owner');

  update public.profiles
  set role = case when role = 'admin' then 'admin' else 'merchant' end,
      full_name = coalesce(nullif(trim(left(p_owner_name, 80)), ''), full_name)
  where id = p_owner;

  insert into public.subscriptions (business_id, plan, price, starts_at, expires_at)
  values (v_id, 'trial', 0, now(), now() + interval '30 days');

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_id, auth.uid(), 'business_created', jsonb_build_object('name', v_name, 'by_admin', true));

  return jsonb_build_object('ok', true, 'business_id', v_id);
end $$;

grant execute on function
  public.admin_create_business(uuid, text, text, text)
to authenticated;

-- nothing added here may be reachable by anon (0003's tripwire, re-run)
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
