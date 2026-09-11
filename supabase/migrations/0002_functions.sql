-- Pointili V1 — business logic. Every value-changing operation lives here, runs
-- atomically inside one transaction, and identifies the caller with auth.uid():
-- a browser-supplied user id, business id or role is never trusted.
-- Re-runnable (create or replace).

-- ═══ helpers ═══════════════════════════════════════════════════════════════

create or replace function public.sha256_hex(p text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(convert_to(p, 'UTF8'), 'sha256'), 'hex')
$$;

create or replace function public.tunis_today_start() returns timestamptz
language sql stable set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis'
$$;

create or replace function public.mask_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case when p is null then null else '+216 •• ••• ' || right(p, 3) end
$$;

create or replace function public.random_digits(n int) returns text
language sql volatile set search_path = '' as $$
  select lpad(((('x' || encode(extensions.gen_random_bytes(3), 'hex'))::bit(24)::int) % (10 ^ n)::int)::text, n, '0')
$$;

-- Fixed-window counter. Returns true while the caller is under the limit.
create or replace function public.rate_limit_hit(p_key text, p_max int, p_window_seconds int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_hits int;
begin
  insert into public.rate_limits as r (key, window_start, hits) values (p_key, now(), 1)
  on conflict (key) do update set
    hits = case when r.window_start < now() - make_interval(secs => p_window_seconds) then 1 else r.hits + 1 end,
    window_start = case when r.window_start < now() - make_interval(secs => p_window_seconds) then now() else r.window_start end
  returning hits into v_hits;
  return v_hits <= p_max;
end $$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.profiles where id = auth.uid() and role = 'admin')
$$;

create or replace function public.is_business_member(p_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.business_members where business_id = p_business and user_id = auth.uid())
$$;

create or replace function public.is_business_customer(p_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.customers where business_id = p_business and user_id = auth.uid())
$$;

create or replace function public.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  if not public.is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
end $$;

-- The caller's business. Owner membership wins over staff.
create or replace function public.require_business(p_owner_only boolean default false) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select bm.business_id into v
  from public.business_members bm
  where bm.user_id = auth.uid() and (not p_owner_only or bm.role = 'owner')
  order by (bm.role = 'owner') desc, bm.created_at
  limit 1;
  if v is null then raise exception 'not_merchant' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function public.err(p_code text, p_extra jsonb default '{}'::jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false, 'error', p_code) || coalesce(p_extra, '{}'::jsonb)
$$;

-- What a reward costs THIS customer. The card's main reward costs the customer's
-- own goal (card_target) when that is lower than today's setting — so raising
-- the stamps required never takes a reward away from someone mid-card — and
-- today's setting when it is lower, so lowering it helps everyone at once.
create or replace function public.reward_cost(p_is_primary boolean, p_required int, p_target int) returns int
language sql immutable set search_path = '' as $$
  select case when p_is_primary and p_target is not null then least(p_target, p_required) else p_required end
$$;

-- ═══ subscriptions ═════════════════════════════════════════════════════════

create or replace function public.plan_price(p_plan text) returns numeric
language sql immutable set search_path = '' as $$
  select case p_plan when 'six_month' then 80 when 'yearly' then 120 else 0 end::numeric
$$;

create or replace function public.business_is_open(p_business uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.businesses where id = p_business and status = 'active')
     and exists (select 1 from public.subscriptions
                 where business_id = p_business and status = 'active'
                   and starts_at <= now() and expires_at > now())
$$;

create or replace function public.subscription_state(p_business uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_cur  public.subscriptions%rowtype;
  v_last public.subscriptions%rowtype;
  v_max  timestamptz;
  v_status text;
begin
  select * into v_cur from public.subscriptions
  where business_id = p_business and status = 'active' and starts_at <= now() and expires_at > now()
  order by expires_at desc limit 1;

  select max(expires_at) into v_max from public.subscriptions
  where business_id = p_business and status = 'active';

  select * into v_last from public.subscriptions
  where business_id = p_business
  order by expires_at desc, created_at desc limit 1;

  if v_cur.id is not null then
    v_status := case when v_max < now() + interval '7 days' then 'expiring_soon' else 'active' end;
  elsif v_last.id is null then
    v_status := 'none';
  elsif v_last.status = 'cancelled' then
    v_status := 'cancelled';
  else
    v_status := 'expired';
  end if;

  return jsonb_build_object(
    'status', v_status,
    'open', v_cur.id is not null,
    'plan', v_last.plan,
    'price', v_last.price,
    'currency', coalesce(v_last.currency, 'TND'),
    'starts_at', coalesce(v_cur.starts_at, v_last.starts_at),
    'expires_at', case when v_cur.id is not null then v_max else v_last.expires_at end,
    'days_left', case when v_cur.id is not null
                      then greatest(0, ceil(extract(epoch from (v_max - now())) / 86400))::int
                      else 0 end
  );
end $$;

-- Adds a paid period after whatever is already covered (a renewal never eats trial days).
create or replace function public.activate_plan(p_business uuid, p_plan text) returns uuid
language plpgsql security definer set search_path = '' as $$
declare v_start timestamptz; v_id uuid;
begin
  if p_plan not in ('six_month', 'yearly') then raise exception 'invalid_plan'; end if;
  -- serialise concurrent activations for one business
  perform 1 from public.businesses where id = p_business for update;
  select greatest(now(), coalesce(max(expires_at), now())) into v_start
  from public.subscriptions where business_id = p_business and status = 'active';
  insert into public.subscriptions (business_id, plan, price, starts_at, expires_at)
  values (p_business, p_plan, public.plan_price(p_plan), v_start,
          v_start + case p_plan when 'six_month' then interval '6 months' else interval '1 year' end)
  returning id into v_id;
  return v_id;
end $$;

-- ═══ card payload (shared by customer screens and the stamp result) ════════

create or replace function public.card_payload(p_customer_id uuid, p_old_balance int default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c public.customers%rowtype;
  b public.businesses%rowtype;
  k public.loyalty_cards%rowtype;
  v_rewards jsonb;
  v_next jsonb;
  v_new jsonb := '[]'::jsonb;
begin
  select * into c from public.customers where id = p_customer_id;
  if c.id is null then return null; end if;
  select * into b from public.businesses where id = c.business_id;
  select * into k from public.loyalty_cards where business_id = c.business_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'name', r.name, 'description', r.description,
           'stamps_required', public.reward_cost(r.is_primary, r.stamps_required, c.card_target), 'is_primary', r.is_primary,
           'unlocked', c.stamps_balance >= public.reward_cost(r.is_primary, r.stamps_required, c.card_target),
           'pending', (select jsonb_build_object('id', x.id, 'code', x.code, 'expires_at', x.expires_at)
                       from public.reward_redemptions x
                       where x.customer_id = c.id and x.reward_id = r.id and x.status = 'pending' and x.expires_at > now()
                       limit 1)
         ) order by r.stamps_required, r.created_at), '[]'::jsonb)
  into v_rewards
  from public.rewards r where r.business_id = c.business_id and r.active;

  select jsonb_build_object('id', r.id, 'name', r.name, 'stamps_required', x.cost, 'remaining', x.cost - c.stamps_balance)
  into v_next
  from public.rewards r
  cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
  where r.business_id = c.business_id and r.active and x.cost > c.stamps_balance
  order by x.cost limit 1;

  if p_old_balance is not null then
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'stamps_required', x.cost)
                              order by x.cost), '[]'::jsonb)
    into v_new
    from public.rewards r
    cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
    where r.business_id = c.business_id and r.active
      and x.cost > p_old_balance and x.cost <= c.stamps_balance;
  end if;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', c.id, 'code', c.code, 'balance', c.stamps_balance, 'total_stamps', c.total_stamps,
      'rewards_redeemed', c.rewards_redeemed, 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at),
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category,
      'address', b.address, 'status', b.status),
    'card', case when k.id is null then null else jsonb_build_object(
      'id', k.id, 'name', k.name, 'description', k.description,
      'stamps_required', public.reward_cost(true, k.stamps_required, c.card_target),
      'card_stamps_required', k.stamps_required,
      'design', k.design,
      'color', k.color, 'icon', k.icon, 'cooldown_minutes', k.cooldown_minutes, 'active', k.active) end,
    'rewards', v_rewards,
    'next_reward', v_next,
    'newly_unlocked', v_new
  );
end $$;

-- ═══ QR tokens ═════════════════════════════════════════════════════════════

-- Merchant screen: a fresh single-use token. The raw token is returned exactly
-- once; only its hash is stored.
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

-- Merchant screen poll: has the shown token been consumed, and which stamps
-- landed since the screen opened.
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

-- Someone opened a QR link without being logged in. Reserve the token for that
-- browser (it proves possession with p_claim later) so the scan survives the
-- time it takes to register. SERVICE ROLE ONLY.
create or replace function public.claim_qr_token(p_token text, p_claim text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.qr_tokens%rowtype; v_name text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' or p_claim is null or length(p_claim) < 32 then
    return public.err('invalid');
  end if;
  select * into t from public.qr_tokens where token_hash = public.sha256_hex(p_token) for update;
  if t.id is null or not t.active then return public.err('invalid'); end if;
  if t.claim_hash = public.sha256_hex(p_claim) and t.claim_expires_at > now() then
    return jsonb_build_object('ok', true, 'already', true);
  end if;
  if t.used_at is not null or t.claim_hash is not null then return public.err('already_used'); end if;
  if t.expires_at <= now() then return public.err('expired'); end if;
  select name into v_name from public.businesses where id = t.business_id;
  if not public.business_is_open(t.business_id) then return public.err('business_paused', jsonb_build_object('business_name', v_name)); end if;

  update public.qr_tokens
  set claim_hash = public.sha256_hex(p_claim), claim_expires_at = now() + interval '20 minutes'
  where id = t.id;
  return jsonb_build_object('ok', true, 'business_name', v_name);
end $$;

-- ═══ THE STAMP ═════════════════════════════════════════════════════════════
-- 1 identify customer · 2 identify token · 3 exists · 4 business · 5 not expired
-- 6 card active · 7 duplicate/replay · 8 create stamp · 9 progress · 10 unlocks
-- All under row locks on the token and the customer's card: two simultaneous
-- scans serialise, so a balance can never skip or double-count.
create or replace function public.collect_stamp(p_token text, p_claim text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  t public.qr_tokens%rowtype;
  b public.businesses%rowtype;
  k public.loyalty_cards%rowtype;
  c public.customers%rowtype;
  v_old int;
  v_stamp uuid;
  v_try int := 0;
begin
  if v_uid is null then return public.err('not_authenticated'); end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  if not exists (select 1 from public.profiles where id = v_uid) then return public.err('not_authenticated'); end if;
  if not public.rate_limit_hit('stamp:' || v_uid, 30, 600) then return public.err('rate_limited'); end if;

  select * into t from public.qr_tokens where token_hash = public.sha256_hex(p_token) for update;
  if t.id is null or (not t.active and t.used_at is null) then return public.err('invalid'); end if;

  select * into b from public.businesses where id = t.business_id;

  if t.used_at is not null then
    if t.used_by = v_uid then
      select * into c from public.customers where business_id = t.business_id and user_id = v_uid;
      return public.err('already_processed', coalesce(public.card_payload(c.id), '{}'::jsonb));
    end if;
    return public.err('already_used', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;

  if t.claim_hash is not null then
    if p_claim is null or public.sha256_hex(p_claim) <> t.claim_hash then
      return public.err('already_used', jsonb_build_object('business', jsonb_build_object('name', b.name)));
    end if;
    if t.claim_expires_at <= now() then return public.err('expired'); end if;
  elsif t.expires_at <= now() then
    return public.err('expired', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;

  if b.status <> 'active' then return public.err('business_unavailable'); end if;
  if not public.business_is_open(b.id) then
    return public.err('business_paused', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;
  if exists (select 1 from public.business_members where business_id = b.id and user_id = v_uid) then
    return public.err('own_business');
  end if;

  select * into k from public.loyalty_cards where business_id = b.id;
  if k.id is null or not k.active then return public.err('card_inactive'); end if;

  -- the customer's card at this business (created on first stamp)
  select * into c from public.customers where business_id = b.id and user_id = v_uid for update;
  while c.id is null loop
    v_try := v_try + 1;
    begin
      insert into public.customers (business_id, user_id, code)
      values (b.id, v_uid, public.gen_customer_code(b.id));
    exception when unique_violation then
      if v_try > 5 then raise; end if;
    end;
    select * into c from public.customers where business_id = b.id and user_id = v_uid for update;
  end loop;

  -- one stamp per visit: the merchant-configured cooldown
  if k.cooldown_minutes > 0 and c.last_stamp_at is not null
     and c.last_stamp_at > now() - make_interval(mins => k.cooldown_minutes) then
    return public.err('too_soon', jsonb_build_object(
      'next_at', c.last_stamp_at + make_interval(mins => k.cooldown_minutes)) || public.card_payload(c.id));
  end if;

  v_old := c.stamps_balance;

  insert into public.stamps (customer_id, business_id, user_id, loyalty_card_id, qr_token_id)
  values (c.id, b.id, v_uid, k.id, t.id)
  returning id into v_stamp;

  update public.qr_tokens set used_at = now(), used_by = v_uid, active = false where id = t.id;

  update public.customers
  set stamps_balance = stamps_balance + 1,
      total_stamps = total_stamps + 1,
      card_target = coalesce(card_target, k.stamps_required),
      first_stamp_at = coalesce(first_stamp_at, now()),
      last_stamp_at = now()
  where id = c.id
  returning * into c;

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (b.id, v_uid, c.id, 'stamp', jsonb_build_object('balance', c.stamps_balance, 'code', c.code));

  return jsonb_build_object('ok', true, 'stamp_id', v_stamp) || public.card_payload(c.id, v_old);
end $$;

create or replace function public.gen_customer_code(p_business uuid) returns int
language plpgsql volatile security definer set search_path = '' as $$
declare v int; i int := 0;
begin
  loop
    i := i + 1;
    v := case when i <= 30 then 1000 + floor(random() * 9000)::int else 10000 + floor(random() * 90000)::int end;
    exit when not exists (select 1 from public.customers where business_id = p_business and code = v);
  end loop;
  return v;
end $$;

-- ═══ customer ══════════════════════════════════════════════════════════════

create or replace function public.customer_home() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', full_name, 'phone', phone, 'role', role) from public.profiles where id = v_uid),
    'cards', coalesce((
      select jsonb_agg(item order by sort_at desc nulls last)
      from (
        select c.last_stamp_at as sort_at, jsonb_build_object(
          'customer_id', c.id, 'code', c.code, 'balance', c.stamps_balance,
          'total_stamps', c.total_stamps, 'last_stamp_at', c.last_stamp_at,
          'business', jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category),
          'card', jsonb_build_object('name', k.name, 'stamps_required', public.reward_cost(true, coalesce(k.stamps_required, 10), c.card_target),
                                     'color', coalesce(k.color, 'indigo'), 'icon', coalesce(k.icon, 'coffee'),
                                     'description', k.description, 'design', coalesce(k.design, '{}'::jsonb)),
          'next_reward', (select jsonb_build_object('name', r.name, 'stamps_required', x.cost, 'remaining', x.cost - c.stamps_balance)
                          from public.rewards r
                          cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
                          where r.business_id = c.business_id and r.active and x.cost > c.stamps_balance
                          order by x.cost limit 1),
          'unlocked', coalesce((select jsonb_agg(r.name order by r.stamps_required) from public.rewards r
                                where r.business_id = c.business_id and r.active
                                  and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= c.stamps_balance), '[]'::jsonb),
          'primary_reward', (select r.name from public.rewards r where r.business_id = c.business_id and r.is_primary)
        ) as item
        from public.customers c
        join public.businesses b on b.id = c.business_id
        left join public.loyalty_cards k on k.business_id = c.business_id
        where c.user_id = v_uid
      ) s
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.customer_card(p_customer_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.customers%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into c from public.customers where id = p_customer_id and user_id = v_uid;
  if c.id is null then return null; end if;
  return public.card_payload(c.id) || jsonb_build_object(
    'history', coalesce((
      select jsonb_agg(h order by at desc) from (
        select s.created_at as at, jsonb_build_object('type', 'stamp', 'at', s.created_at) as h
        from public.stamps s where s.customer_id = c.id
        union all
        select x.redeemed_at, jsonb_build_object('type', 'reward_redeemed', 'at', x.redeemed_at, 'reward_name', x.reward_name)
        from public.reward_redemptions x where x.customer_id = c.id and x.status = 'redeemed'
        order by 1 desc limit 20
      ) q
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.customer_rewards() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object(
    'unlocked', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reward_id', r.id, 'name', r.name, 'description', r.description,
        'stamps_required', public.reward_cost(r.is_primary, r.stamps_required, c.card_target),
        'customer_id', c.id, 'balance', c.stamps_balance,
        'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
        'card', jsonb_build_object('color', k.color, 'icon', k.icon)
      ) order by c.last_stamp_at desc, r.stamps_required)
      from public.customers c
      join public.rewards r on r.business_id = c.business_id and r.active
        and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= c.stamps_balance
      join public.businesses b on b.id = c.business_id
      left join public.loyalty_cards k on k.business_id = c.business_id
      where c.user_id = v_uid
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(u.item order by u.remaining) from (
        select distinct on (c.id) (x.cost - c.stamps_balance) as remaining, jsonb_build_object(
          'reward_id', r.id, 'name', r.name, 'stamps_required', x.cost,
          'customer_id', c.id, 'balance', c.stamps_balance, 'remaining', x.cost - c.stamps_balance,
          'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
          'card', jsonb_build_object('color', k.color, 'icon', k.icon)
        ) as item
        from public.customers c
        join public.rewards r on r.business_id = c.business_id and r.active
        cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
        join public.businesses b on b.id = c.business_id
        left join public.loyalty_cards k on k.business_id = c.business_id
        where c.user_id = v_uid and x.cost > c.stamps_balance
        order by c.id, x.cost
      ) u
    ), '[]'::jsonb),
    'history', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'reward_name', x.reward_name, 'business_name', b.name,
                                          'redeemed_at', x.redeemed_at) order by x.redeemed_at desc)
      from (select * from public.reward_redemptions where user_id = v_uid and status = 'redeemed'
            order by redeemed_at desc limit 20) x
      join public.businesses b on b.id = x.business_id
    ), '[]'::jsonb)
  );
end $$;

-- Customer taps "Use reward": a short code the merchant confirms at the counter.
-- Nothing is deducted until the merchant confirms, so a remote request is harmless.
create or replace function public.request_redemption(p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r public.rewards%rowtype;
  c public.customers%rowtype;
  x public.reward_redemptions%rowtype;
  v_code text;
  v_i int := 0;
  v_cost int;
begin
  if v_uid is null then return public.err('not_authenticated'); end if;
  if not public.rate_limit_hit('redeem_req:' || v_uid, 20, 600) then return public.err('rate_limited'); end if;

  select * into r from public.rewards where id = p_reward_id and active;
  if r.id is null then return public.err('reward_not_found'); end if;
  if exists (select 1 from public.businesses where id = r.business_id and status <> 'active') then
    return public.err('business_unavailable');
  end if;

  select * into c from public.customers where business_id = r.business_id and user_id = v_uid for update;
  v_cost := public.reward_cost(r.is_primary, r.stamps_required, c.card_target);
  if c.id is null or c.stamps_balance < v_cost then return public.err('not_enough_stamps'); end if;

  update public.reward_redemptions set status = 'expired'
  where customer_id = c.id and status = 'pending' and expires_at <= now();

  select * into x from public.reward_redemptions
  where customer_id = c.id and reward_id = r.id and status = 'pending';

  if x.id is not null and x.expires_at > now() + interval '3 minutes' then
    return jsonb_build_object('ok', true, 'id', x.id, 'code', x.code, 'expires_at', x.expires_at,
                              'reward_name', x.reward_name,
                              'business_name', (select name from public.businesses where id = r.business_id));
  end if;
  if x.id is not null then
    update public.reward_redemptions set status = 'cancelled' where id = x.id;
  end if;

  loop
    v_i := v_i + 1;
    v_code := public.random_digits(6);
    exit when not exists (select 1 from public.reward_redemptions
                          where business_id = r.business_id and code = v_code and status = 'pending');
    if v_i > 20 then raise exception 'code_space_exhausted'; end if;
  end loop;

  insert into public.reward_redemptions (reward_id, customer_id, business_id, user_id, reward_name, stamps_spent, code, expires_at)
  values (r.id, c.id, r.business_id, v_uid, r.name, v_cost, v_code, now() + interval '15 minutes')
  returning * into x;

  return jsonb_build_object('ok', true, 'id', x.id, 'code', x.code, 'expires_at', x.expires_at,
                            'reward_name', x.reward_name,
                            'business_name', (select name from public.businesses where id = r.business_id));
end $$;

create or replace function public.redemption_status(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', x.id, 'status',
           case when x.status = 'pending' and x.expires_at <= now() then 'expired' else x.status end,
           'code', x.code, 'reward_name', x.reward_name, 'business_name', b.name,
           'expires_at', x.expires_at, 'redeemed_at', x.redeemed_at, 'customer_id', x.customer_id)
  from public.reward_redemptions x join public.businesses b on b.id = x.business_id
  where x.id = p_id and x.user_id = auth.uid()
$$;

create or replace function public.cancel_redemption(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.reward_redemptions set status = 'cancelled'
  where id = p_id and user_id = auth.uid() and status = 'pending';
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.update_my_profile(p_full_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_authenticated'); end if;
  update public.profiles set full_name = nullif(trim(left(p_full_name, 80)), '') where id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- ═══ merchant ══════════════════════════════════════════════════════════════

create or replace function public.create_business(p_name text, p_category text, p_owner_name text,
                                                  p_phone text default null, p_email text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_id uuid; v_name text := trim(coalesce(p_name, ''));
begin
  if v_uid is null then return public.err('not_authenticated'); end if;
  if not public.rate_limit_hit('create_business:' || v_uid, 5, 3600) then return public.err('rate_limited'); end if;
  if exists (select 1 from public.business_members where user_id = v_uid) then return public.err('already_has_business'); end if;
  if char_length(v_name) < 2 or char_length(v_name) > 60 then return public.err('invalid_name'); end if;

  insert into public.businesses (name, category, phone, owner_id)
  values (v_name, coalesce(nullif(p_category, ''), 'cafe'),
          coalesce(nullif(p_phone, ''), (select phone from public.profiles where id = v_uid)), v_uid)
  returning id into v_id;

  insert into public.business_members (business_id, user_id, role) values (v_id, v_uid, 'owner');

  update public.profiles
  set role = case when role = 'admin' then 'admin' else 'merchant' end,
      full_name = coalesce(nullif(trim(left(p_owner_name, 80)), ''), full_name),
      email = coalesce(nullif(lower(trim(p_email)), ''), email)
  where id = v_uid;

  -- "Start free": 30 days before a paid plan is needed
  insert into public.subscriptions (business_id, plan, price, starts_at, expires_at)
  values (v_id, 'trial', 0, now(), now() + interval '30 days');

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_id, v_uid, 'business_created', jsonb_build_object('name', v_name));

  return jsonb_build_object('ok', true, 'business_id', v_id);
end $$;

-- Everything a merchant screen's layout needs, in one round trip.
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
                                           'phone', b.phone, 'address', b.address, 'status', b.status, 'created_at', b.created_at,
                                           'cover_url', b.cover_url)
                 from public.businesses b where b.id = v_biz),
    'card', (select jsonb_build_object('id', k.id, 'name', k.name, 'description', k.description,
                                       'stamps_required', k.stamps_required, 'color', k.color, 'icon', k.icon,
                                       'cooldown_minutes', k.cooldown_minutes, 'active', k.active, 'design', k.design,
                                       'reward', (select jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description)
                                                  from public.rewards r where r.loyalty_card_id = k.id and r.is_primary))
             from public.loyalty_cards k where k.business_id = v_biz),
    'subscription', case when v_biz is null then null else public.subscription_state(v_biz) end
  );
end $$;

create or replace function public.save_loyalty_card(
  p_name text, p_description text, p_stamps_required int, p_reward_name text, p_reward_description text,
  p_color text, p_icon text, p_cooldown_minutes int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v_card uuid; v_created boolean := false;
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 then return public.err('invalid_name'); end if;
  if p_stamps_required is null or p_stamps_required not between 2 and 30 then return public.err('invalid_stamps'); end if;
  if char_length(trim(coalesce(p_reward_name, ''))) < 2 then return public.err('invalid_reward'); end if;
  if p_color not in ('indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'orange', 'slate') then p_color := 'indigo'; end if;
  if p_icon not in ('coffee', 'pizza', 'burger', 'cake', 'croissant', 'scissors', 'sparkles', 'ice-cream', 'shopping-bag', 'heart', 'star', 'utensils') then p_icon := 'coffee'; end if;
  p_cooldown_minutes := least(greatest(coalesce(p_cooldown_minutes, 60), 0), 10080);

  select id into v_card from public.loyalty_cards where business_id = v_biz;
  if v_card is null then
    insert into public.loyalty_cards (business_id, name, description, stamps_required, color, icon, cooldown_minutes)
    values (v_biz, trim(p_name), nullif(trim(p_description), ''), p_stamps_required, p_color, p_icon, p_cooldown_minutes)
    returning id into v_card;
    v_created := true;
  else
    -- Customers mid-card keep the goal they started with (see reward_cost).
    update public.customers c
    set card_target = (select stamps_required from public.loyalty_cards where id = v_card)
    where c.business_id = v_biz and c.card_target is null and c.stamps_balance > 0;

    update public.loyalty_cards
    set name = trim(p_name), description = nullif(trim(p_description), ''), stamps_required = p_stamps_required,
        color = p_color, icon = p_icon, cooldown_minutes = p_cooldown_minutes, active = true
    where id = v_card;
  end if;

  update public.rewards
  set name = trim(p_reward_name), description = nullif(trim(p_reward_description), ''),
      stamps_required = p_stamps_required, active = true
  where loyalty_card_id = v_card and is_primary;
  if not found then
    insert into public.rewards (loyalty_card_id, business_id, name, description, stamps_required, is_primary)
    values (v_card, v_biz, trim(p_reward_name), nullif(trim(p_reward_description), ''), p_stamps_required, true);
  end if;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), case when v_created then 'card_created' else 'card_updated' end,
          jsonb_build_object('stamps_required', p_stamps_required, 'reward', trim(p_reward_name)));

  return jsonb_build_object('ok', true, 'card_id', v_card, 'created', v_created);
end $$;

create or replace function public.merchant_rewards() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false);
begin
  return jsonb_build_object(
    'card', (select jsonb_build_object('id', id, 'name', name, 'stamps_required', stamps_required) from public.loyalty_cards where business_id = v_biz),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object(
        'id', r.id, 'name', r.name, 'description', r.description, 'stamps_required', r.stamps_required,
        'is_primary', r.is_primary, 'active', r.active,
        'redeemed', (select count(*) from public.reward_redemptions x where x.reward_id = r.id and x.status = 'redeemed')
      ) order by r.active desc, r.stamps_required)
      from public.rewards r where r.business_id = v_biz
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.save_reward(p_id uuid, p_name text, p_description text, p_stamps_required int, p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v_card uuid; r public.rewards%rowtype;
begin
  select id into v_card from public.loyalty_cards where business_id = v_biz;
  if v_card is null then return public.err('no_card'); end if;
  if char_length(trim(coalesce(p_name, ''))) < 2 then return public.err('invalid_name'); end if;
  if p_stamps_required is null or p_stamps_required not between 1 and 100 then return public.err('invalid_stamps'); end if;

  if p_id is null then
    if (select count(*) from public.rewards where business_id = v_biz) >= 10 then return public.err('too_many_rewards'); end if;
    insert into public.rewards (loyalty_card_id, business_id, name, description, stamps_required, active)
    values (v_card, v_biz, trim(p_name), nullif(trim(p_description), ''), p_stamps_required, coalesce(p_active, true))
    returning * into r;
    insert into public.activity_logs (business_id, actor_id, type, data)
    values (v_biz, auth.uid(), 'reward_created', jsonb_build_object('name', r.name, 'stamps_required', r.stamps_required));
  else
    select * into r from public.rewards where id = p_id and business_id = v_biz for update;
    if r.id is null then return public.err('reward_not_found'); end if;
    if r.is_primary then
      if p_stamps_required not between 2 and 30 then return public.err('invalid_stamps'); end if;
      p_active := true; -- the card's own reward stays on
      update public.customers c
      set card_target = (select stamps_required from public.loyalty_cards where id = v_card)
      where c.business_id = v_biz and c.card_target is null and c.stamps_balance > 0;
      update public.loyalty_cards set stamps_required = p_stamps_required where id = v_card;
    end if;
    update public.rewards
    set name = trim(p_name), description = nullif(trim(p_description), ''),
        stamps_required = p_stamps_required, active = coalesce(p_active, active)
    where id = r.id returning * into r;
  end if;
  return jsonb_build_object('ok', true, 'id', r.id);
end $$;

create or replace function public.merchant_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_month timestamptz := (date_trunc('month', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis';
begin
  return jsonb_build_object(
    'customers', (select count(*) from public.customers where business_id = v_biz),
    'stamps_this_month', (select count(*) from public.stamps where business_id = v_biz and created_at >= v_month),
    'stamps_today', (select count(*) from public.stamps where business_id = v_biz and created_at >= public.tunis_today_start()),
    'rewards_redeemed', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed'),
    'returning_rate', (select case when count(*) = 0 then 0
                                   else round(100.0 * count(*) filter (where total_stamps >= 2) / count(*)) end
                       from public.customers where business_id = v_biz),
    'pending_redemptions', (select count(*) from public.reward_redemptions
                            where business_id = v_biz and status = 'pending' and expires_at > now()),
    'recent', public.activity_items(v_biz, null, null, 6)
  );
end $$;

create or replace function public.activity_items(p_biz uuid, p_from timestamptz, p_to timestamptz, p_limit int) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', a.id, 'type', a.type, 'at', a.created_at, 'customer_id', a.customer_id,
           'customer_code', c.code, 'data', a.data) order by a.created_at desc), '[]'::jsonb)
  from (select * from public.activity_logs
        where business_id = p_biz and type in ('stamp', 'reward_redeemed')
          and (p_from is null or created_at >= p_from) and (p_to is null or created_at < p_to)
        order by created_at desc limit greatest(1, least(p_limit, 500))) a
  left join public.customers c on c.id = a.customer_id
$$;

-- p_range: today | week (7 days) | month (30 days) | custom (p_from..p_to inclusive dates, Tunis time)
create or replace function public.merchant_activity(p_range text, p_from date default null, p_to date default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_today date := (now() at time zone 'Africa/Tunis')::date;
  v_start date; v_end date;
  v_f timestamptz; v_t timestamptz;
begin
  v_end := v_today;
  v_start := case p_range when 'week' then v_today - 6 when 'month' then v_today - 29
                          when 'custom' then coalesce(p_from, v_today) else v_today end;
  if p_range = 'custom' then v_end := coalesce(p_to, v_today); end if;
  if v_end < v_start then v_end := v_start; end if;
  if v_end - v_start > 366 then v_start := v_end - 366; end if;
  v_f := v_start::timestamp at time zone 'Africa/Tunis';
  v_t := (v_end + 1)::timestamp at time zone 'Africa/Tunis';

  return jsonb_build_object(
    'from', v_start, 'to', v_end,
    'stamps', (select count(*) from public.stamps where business_id = v_biz and created_at >= v_f and created_at < v_t),
    'redemptions', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_f and redeemed_at < v_t),
    'items', public.activity_items(v_biz, v_f, v_t, 300)
  );
end $$;

create or replace function public.merchant_customers(p_search text default null, p_sort text default 'recent',
                                                     p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_digits text;
  v_like text;
begin
  v_digits := regexp_replace(coalesce(v_q, ''), '\D', '', 'g');
  v_like := '%' || replace(replace(coalesce(v_q, ''), '%', ''), '_', '') || '%';
  return jsonb_build_object(
    'stamps_required', (select stamps_required from public.loyalty_cards where business_id = v_biz),
    'total', (select count(*) from public.customers where business_id = v_biz),
    'items', coalesce((
      select jsonb_agg(item order by rn) from (
        select row_number() over (order by
                 case when p_sort = 'active' then c.total_stamps end desc nulls last,
                 case when p_sort = 'stamps' then c.stamps_balance end desc nulls last,
                 case when p_sort = 'rewards' then c.rewards_redeemed end desc nulls last,
                 c.last_stamp_at desc nulls last, c.created_at desc) as rn,
               jsonb_build_object(
                 'id', c.id, 'code', c.code, 'name', p.full_name, 'phone_masked', public.mask_phone(p.phone),
                 'balance', c.stamps_balance, 'total_stamps', c.total_stamps, 'rewards_redeemed', c.rewards_redeemed,
                 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at,
                 'target', public.reward_cost(true, coalesce((select stamps_required from public.loyalty_cards where business_id = v_biz), 10), c.card_target),
                 'reward_ready', exists (select 1 from public.rewards r where r.business_id = v_biz and r.active
                                         and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= c.stamps_balance)) as item
        from public.customers c join public.profiles p on p.id = c.user_id
        where c.business_id = v_biz
          and (v_q is null
               or (v_digits <> '' and c.code::text like v_digits || '%')
               or p.full_name ilike v_like
               or (length(v_digits) >= 3 and right(p.phone, 3) = right(v_digits, 3)))
        order by rn
        limit least(greatest(coalesce(p_limit, 50), 1), 200) offset greatest(coalesce(p_offset, 0), 0)
      ) s
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.merchant_customer(p_customer_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false); c public.customers%rowtype;
begin
  select * into c from public.customers where id = p_customer_id and business_id = v_biz;
  if c.id is null then return null; end if;
  return public.card_payload(c.id) || jsonb_build_object(
    'profile', (select jsonb_build_object('name', full_name, 'phone_masked', public.mask_phone(phone)) from public.profiles where id = c.user_id),
    'rewards_earned', c.rewards_redeemed + (select count(*) from public.rewards r where r.business_id = v_biz and r.active
                                              and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= c.stamps_balance),
    'history', coalesce((
      select jsonb_agg(h order by at desc) from (
        select s.created_at as at, jsonb_build_object('type', 'stamp', 'at', s.created_at) as h
        from public.stamps s where s.customer_id = c.id
        union all
        select x.redeemed_at, jsonb_build_object('type', 'reward_redeemed', 'at', x.redeemed_at, 'reward_name', x.reward_name)
        from public.reward_redemptions x where x.customer_id = c.id and x.status = 'redeemed'
        order by 1 desc limit 30
      ) q
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.redemption_view(x public.reward_redemptions) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', x.id, 'code', x.code, 'status', case when x.status = 'pending' and x.expires_at <= now() then 'expired' else x.status end,
    'reward_name', x.reward_name, 'stamps_spent', x.stamps_spent, 'expires_at', x.expires_at, 'redeemed_at', x.redeemed_at,
    'customer', (select jsonb_build_object('id', c.id, 'code', c.code, 'balance', c.stamps_balance,
                                           'name', p.full_name, 'phone_masked', public.mask_phone(p.phone))
                 from public.customers c join public.profiles p on p.id = c.user_id where c.id = x.customer_id))
$$;

create or replace function public.merchant_lookup_redemption(p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false); x public.reward_redemptions%rowtype;
begin
  if not public.rate_limit_hit('redeem_lookup:' || v_biz, 60, 600) then return public.err('rate_limited'); end if;
  select * into x from public.reward_redemptions
  where business_id = v_biz and code = regexp_replace(coalesce(p_code, ''), '\D', '', 'g') and status = 'pending'
  order by requested_at desc limit 1;
  if x.id is null then return public.err('not_found'); end if;
  if x.expires_at <= now() then
    update public.reward_redemptions set status = 'expired' where id = x.id;
    return public.err('expired');
  end if;
  return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
end $$;

create or replace function public.merchant_pending_redemptions() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.redemption_view(x) order by x.requested_at desc), '[]'::jsonb)
  from public.reward_redemptions x
  where x.business_id = public.require_business(false) and x.status = 'pending' and x.expires_at > now()
$$;

-- The merchant confirms at the counter. Locks the request and the card: a
-- reward can be redeemed once, and never with stamps the customer no longer has.
create or replace function public.merchant_confirm_redemption(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  x public.reward_redemptions%rowtype;
  c public.customers%rowtype;
begin
  select * into x from public.reward_redemptions where id = p_id and business_id = v_biz for update;
  if x.id is null then return public.err('not_found'); end if;
  if x.status = 'redeemed' then return public.err('already_redeemed', jsonb_build_object('redemption', public.redemption_view(x))); end if;
  if x.status <> 'pending' then return public.err(x.status); end if;
  if x.expires_at <= now() then
    update public.reward_redemptions set status = 'expired' where id = x.id;
    return public.err('expired');
  end if;

  select * into c from public.customers where id = x.customer_id for update;
  if c.stamps_balance < x.stamps_spent then return public.err('not_enough_stamps'); end if;

  -- Redeeming the main reward closes this card; the next one takes today's goal.
  update public.customers
  set stamps_balance = stamps_balance - x.stamps_spent, rewards_redeemed = rewards_redeemed + 1,
      card_target = case when (select is_primary from public.rewards where id = x.reward_id) then null else card_target end
  where id = c.id;
  update public.reward_redemptions
  set status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
  where id = x.id returning * into x;

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (v_biz, auth.uid(), c.id, 'reward_redeemed',
          jsonb_build_object('reward_name', x.reward_name, 'stamps_spent', x.stamps_spent, 'code', c.code, 'redemption_id', x.id));

  return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
end $$;

-- Customer is standing at the counter without their phone out: redeem from their customer page.
create or replace function public.merchant_redeem_direct(p_customer_id uuid, p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  c public.customers%rowtype;
  r public.rewards%rowtype;
  x public.reward_redemptions%rowtype;
  v_cost int;
begin
  select * into c from public.customers where id = p_customer_id and business_id = v_biz for update;
  if c.id is null then return public.err('not_found'); end if;
  select * into r from public.rewards where id = p_reward_id and business_id = v_biz and active;
  if r.id is null then return public.err('reward_not_found'); end if;
  v_cost := public.reward_cost(r.is_primary, r.stamps_required, c.card_target);
  if c.stamps_balance < v_cost then return public.err('not_enough_stamps'); end if;

  update public.reward_redemptions set status = 'cancelled'
  where customer_id = c.id and reward_id = r.id and status = 'pending';

  insert into public.reward_redemptions (reward_id, customer_id, business_id, user_id, reward_name, stamps_spent,
                                         code, status, expires_at, redeemed_by, redeemed_at)
  values (r.id, c.id, v_biz, c.user_id, r.name, v_cost, public.random_digits(6), 'redeemed', now(), auth.uid(), now())
  returning * into x;

  update public.customers
  set stamps_balance = stamps_balance - v_cost, rewards_redeemed = rewards_redeemed + 1,
      card_target = case when r.is_primary then null else card_target end
  where id = c.id;

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (v_biz, auth.uid(), c.id, 'reward_redeemed',
          jsonb_build_object('reward_name', r.name, 'stamps_spent', v_cost, 'code', c.code, 'redemption_id', x.id));

  return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
end $$;

create or replace function public.merchant_analytics(p_days int default 30) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_days int := case when p_days in (7, 30, 90) then p_days else 30 end;
  v_today date := (now() at time zone 'Africa/Tunis')::date;
  v_from timestamptz;
  v_prev timestamptz;
begin
  v_from := (v_today - (v_days - 1))::timestamp at time zone 'Africa/Tunis';
  v_prev := v_from - make_interval(days => v_days);
  return jsonb_build_object(
    'days', v_days,
    'customers_total', (select count(*) from public.customers where business_id = v_biz),
    'new_customers', (select count(*) from public.customers where business_id = v_biz and first_stamp_at >= v_from),
    'new_customers_prev', (select count(*) from public.customers where business_id = v_biz and first_stamp_at >= v_prev and first_stamp_at < v_from),
    'active_customers', (select count(distinct customer_id) from public.stamps where business_id = v_biz and created_at >= v_from),
    'returning_customers', (select count(distinct s.customer_id) from public.stamps s join public.customers c on c.id = s.customer_id
                            where s.business_id = v_biz and s.created_at >= v_from and c.first_stamp_at < v_from),
    'stamps', (select count(*) from public.stamps where business_id = v_biz and created_at >= v_from),
    'stamps_prev', (select count(*) from public.stamps where business_id = v_biz and created_at >= v_prev and created_at < v_from),
    'redemptions', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_from),
    'redemptions_prev', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_prev and redeemed_at < v_from),
    'returning_rate', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where total_stamps >= 2) / count(*)) end
                       from public.customers where business_id = v_biz),
    'series', (
      select jsonb_agg(jsonb_build_object('date', d.day, 'stamps', coalesce(s.n, 0), 'redemptions', coalesce(r.n, 0),
                                          'new_customers', coalesce(nc.n, 0)) order by d.day)
      from (select (v_today - g)::date as day from generate_series(0, v_days - 1) g) d
      left join (select (created_at at time zone 'Africa/Tunis')::date as day, count(*) n from public.stamps
                 where business_id = v_biz and created_at >= v_from group by 1) s on s.day = d.day
      left join (select (redeemed_at at time zone 'Africa/Tunis')::date as day, count(*) n from public.reward_redemptions
                 where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_from group by 1) r on r.day = d.day
      left join (select (first_stamp_at at time zone 'Africa/Tunis')::date as day, count(*) n from public.customers
                 where business_id = v_biz and first_stamp_at >= v_from group by 1) nc on nc.day = d.day
    )
  );
end $$;

create or replace function public.update_business(p_name text, p_category text, p_phone text, p_address text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true);
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then return public.err('invalid_name'); end if;
  update public.businesses
  set name = trim(p_name), category = coalesce(nullif(p_category, ''), category),
      phone = nullif(trim(p_phone), ''), address = nullif(trim(left(p_address, 160)), '')
  where id = v_biz;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.merchant_billing() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false);
begin
  return jsonb_build_object(
    'subscription', public.subscription_state(v_biz),
    'subscriptions', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'plan', plan, 'price', price, 'starts_at', starts_at,
                                                                   'expires_at', expires_at, 'status', status) order by expires_at desc)
                               from public.subscriptions where business_id = v_biz), '[]'::jsonb),
    'payments', coalesce((select jsonb_agg(jsonb_build_object('id', id, 'plan', plan, 'amount', amount, 'currency', currency,
                                                              'method', method, 'status', status, 'payment_reference', payment_reference,
                                                              'created_at', created_at, 'confirmed_at', confirmed_at) order by created_at desc)
                          from public.payments where business_id = v_biz), '[]'::jsonb)
  );
end $$;

-- Merchant chooses a plan: a pending payment with a reference to quote when paying.
-- Pointili confirms it from the admin panel, which activates the period.
create or replace function public.request_plan(p_plan text, p_method text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v_ref text; v_i int := 0; v_id uuid;
begin
  if p_plan not in ('six_month', 'yearly') then return public.err('invalid_plan'); end if;
  if p_method not in ('bank_transfer', 'cash', 'd17', 'other') then p_method := 'bank_transfer'; end if;
  if not public.rate_limit_hit('plan_req:' || v_biz, 10, 3600) then return public.err('rate_limited'); end if;

  update public.payments set status = 'cancelled' where business_id = v_biz and status = 'pending';

  loop
    v_i := v_i + 1;
    v_ref := 'PTD-' || upper(encode(extensions.gen_random_bytes(3), 'hex'));
    exit when not exists (select 1 from public.payments where payment_reference = v_ref);
    if v_i > 20 then raise exception 'reference_space_exhausted'; end if;
  end loop;

  insert into public.payments (business_id, plan, amount, method, payment_reference)
  values (v_biz, p_plan, public.plan_price(p_plan), p_method, v_ref)
  returning id into v_id;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'payment_requested', jsonb_build_object('plan', p_plan, 'reference', v_ref));

  return jsonb_build_object('ok', true, 'id', v_id, 'payment_reference', v_ref, 'amount', public.plan_price(p_plan), 'plan', p_plan);
end $$;

create or replace function public.cancel_plan_request(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true);
begin
  update public.payments set status = 'cancelled' where id = p_id and business_id = v_biz and status = 'pending';
  return jsonb_build_object('ok', found);
end $$;

-- ═══ admin ═════════════════════════════════════════════════════════════════

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_month timestamptz := (date_trunc('month', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis';
begin
  perform public.require_admin();
  return jsonb_build_object(
    'businesses', (select count(*) from public.businesses),
    'active_businesses', (select count(*) from public.businesses b where public.business_is_open(b.id)),
    'suspended_businesses', (select count(*) from public.businesses where status = 'suspended'),
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'new_customers_month', (select count(*) from public.profiles where role = 'customer' and created_at >= v_month),
    'stamps_today', (select count(*) from public.stamps where created_at >= public.tunis_today_start()),
    'stamps_total', (select count(*) from public.stamps),
    'active_subscriptions', (select count(distinct business_id) from public.subscriptions
                             where status = 'active' and plan <> 'trial' and starts_at <= now() and expires_at > now()),
    'trials', (select count(distinct s.business_id) from public.subscriptions s
               where s.status = 'active' and s.plan = 'trial' and s.starts_at <= now() and s.expires_at > now()
                 and not exists (select 1 from public.subscriptions p where p.business_id = s.business_id and p.plan <> 'trial'
                                 and p.status = 'active' and p.starts_at <= now() and p.expires_at > now())),
    'expiring_soon', (select count(*) from public.businesses b where (public.subscription_state(b.id) ->> 'status') = 'expiring_soon'),
    'revenue', (select coalesce(sum(amount), 0) from public.payments where status = 'paid'),
    'revenue_month', (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and confirmed_at >= v_month),
    'pending_payments', (select count(*) from public.payments where status = 'pending'),
    'recent', public.admin_activity_items(null, 8)
  );
end $$;

create or replace function public.admin_activity_items(p_type text, p_limit int) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', a.id, 'type', a.type, 'at', a.created_at, 'business_id', a.business_id,
                                               'business_name', b.name, 'customer_code', c.code, 'data', a.data)
                            order by a.created_at desc), '[]'::jsonb)
  from (select * from public.activity_logs where p_type is null or type = p_type
        order by created_at desc limit greatest(1, least(p_limit, 500))) a
  left join public.businesses b on b.id = a.business_id
  left join public.customers c on c.id = a.customer_id
$$;

create or replace function public.admin_activity(p_type text default null, p_limit int default 200) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return public.admin_activity_items(nullif(p_type, ''), p_limit);
end $$;

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

create or replace function public.admin_set_business_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_status not in ('active', 'suspended') then return public.err('invalid_status'); end if;
  update public.businesses set status = p_status where id = p_id;
  if not found then return public.err('not_found'); end if;
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (p_id, auth.uid(), case when p_status = 'active' then 'business_activated' else 'business_suspended' end, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_grant_plan(p_business uuid, p_plan text, p_method text default 'cash') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sub uuid; v_ref text;
begin
  perform public.require_admin();
  if p_plan not in ('six_month', 'yearly') then return public.err('invalid_plan'); end if;
  if not exists (select 1 from public.businesses where id = p_business) then return public.err('not_found'); end if;
  v_sub := public.activate_plan(p_business, p_plan);
  v_ref := 'PTD-M' || upper(encode(extensions.gen_random_bytes(3), 'hex'));
  insert into public.payments (business_id, subscription_id, plan, amount, method, status, payment_reference, confirmed_by, confirmed_at, notes)
  values (p_business, v_sub, p_plan, public.plan_price(p_plan),
          case when p_method in ('bank_transfer', 'cash', 'd17', 'other') then p_method else 'cash' end,
          'paid', v_ref, auth.uid(), now(), 'Recorded by admin');
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (p_business, auth.uid(), 'subscription_activated', jsonb_build_object('plan', p_plan, 'reference', v_ref));
  return jsonb_build_object('ok', true, 'subscription_id', v_sub);
end $$;

create or replace function public.admin_cancel_subscription(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid;
begin
  perform public.require_admin();
  update public.subscriptions set status = 'cancelled' where id = p_id and status = 'active' returning business_id into v_biz;
  if v_biz is null then return public.err('not_found'); end if;
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'subscription_cancelled', jsonb_build_object('subscription_id', p_id));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_subscriptions(p_filter text default 'all') returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(item order by sort_at nulls first) from (
      select (st.state ->> 'expires_at')::timestamptz as sort_at, jsonb_build_object(
        'business_id', b.id, 'business_name', b.name, 'business_status', b.status,
        'owner_phone', p.phone, 'subscription', st.state,
        'pending_payment', (select jsonb_build_object('id', x.id, 'plan', x.plan, 'amount', x.amount, 'payment_reference', x.payment_reference)
                            from public.payments x where x.business_id = b.id and x.status = 'pending' order by x.created_at desc limit 1)
      ) as item
      from public.businesses b
      join public.profiles p on p.id = b.owner_id
      cross join lateral (select public.subscription_state(b.id) as state) st
      where case coalesce(p_filter, 'all')
              when 'active' then st.state ->> 'status' = 'active'
              when 'expiring_soon' then st.state ->> 'status' = 'expiring_soon'
              when 'expired' then st.state ->> 'status' in ('expired', 'none')
              when 'cancelled' then st.state ->> 'status' = 'cancelled'
              else true end
    ) s
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_payments(p_status text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'total_paid', (select coalesce(sum(amount), 0) from public.payments where status = 'paid'),
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'business_id', x.business_id, 'business_name', b.name, 'plan', x.plan,
                                          'amount', x.amount, 'currency', x.currency, 'method', x.method, 'status', x.status,
                                          'payment_reference', x.payment_reference, 'notes', x.notes,
                                          'created_at', x.created_at, 'confirmed_at', x.confirmed_at) order by x.created_at desc)
      from (select * from public.payments where p_status is null or p_status = '' or status = p_status
            order by created_at desc limit 300) x
      join public.businesses b on b.id = x.business_id
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_confirm_payment(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.payments%rowtype; v_sub uuid;
begin
  perform public.require_admin();
  select * into x from public.payments where id = p_id for update;
  if x.id is null then return public.err('not_found'); end if;
  if x.status = 'paid' then return public.err('already_paid'); end if;
  if x.status <> 'pending' then return public.err('not_pending'); end if;
  v_sub := public.activate_plan(x.business_id, x.plan);
  update public.payments set status = 'paid', subscription_id = v_sub, confirmed_by = auth.uid(), confirmed_at = now() where id = x.id;
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (x.business_id, auth.uid(), 'subscription_activated', jsonb_build_object('plan', x.plan, 'reference', x.payment_reference));
  return jsonb_build_object('ok', true, 'subscription_id', v_sub);
end $$;

create or replace function public.admin_reject_payment(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.payments set status = 'failed', confirmed_by = auth.uid(), confirmed_at = now() where id = p_id and status = 'pending';
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.admin_customers(p_search text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_search), ''), '%', ''), '_', '') || '%';
begin
  perform public.require_admin();
  return jsonb_build_object(
    'total', (select count(*) from public.profiles where role = 'customer'),
    'items', coalesce((
      select jsonb_agg(item order by created_at desc) from (
        select p.created_at, jsonb_build_object(
          'id', p.id, 'phone', p.phone, 'name', p.full_name, 'role', p.role, 'created_at', p.created_at,
          'cards', (select count(*) from public.customers c where c.user_id = p.id),
          'stamps', (select coalesce(sum(total_stamps), 0) from public.customers c where c.user_id = p.id),
          'redemptions', (select count(*) from public.reward_redemptions x where x.user_id = p.id and x.status = 'redeemed'),
          'last_stamp_at', (select max(last_stamp_at) from public.customers c where c.user_id = p.id)
        ) as item
        from public.profiles p
        where (p_search is null or trim(p_search) = ''
               or p.phone like '%' || regexp_replace(p_search, '\D', '', 'g') || '%' and regexp_replace(p_search, '\D', '', 'g') <> ''
               or p.full_name ilike v_like)
        order by p.created_at desc limit 300
      ) s
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.admin_system() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'database_size', pg_size_pretty(pg_database_size(current_database())),
    'server_time', now(),
    'tables', jsonb_build_object(
      'profiles', (select count(*) from public.profiles),
      'businesses', (select count(*) from public.businesses),
      'customers', (select count(*) from public.customers),
      'stamps', (select count(*) from public.stamps),
      'qr_tokens', (select count(*) from public.qr_tokens),
      'reward_redemptions', (select count(*) from public.reward_redemptions),
      'subscriptions', (select count(*) from public.subscriptions),
      'payments', (select count(*) from public.payments),
      'activity_logs', (select count(*) from public.activity_logs),
      'rate_limits', (select count(*) from public.rate_limits)),
    'last_hour', jsonb_build_object(
      'qr_minted', (select count(*) from public.qr_tokens where created_at > now() - interval '1 hour'),
      'stamps', (select count(*) from public.stamps where created_at > now() - interval '1 hour'),
      'claims_pending', (select count(*) from public.qr_tokens where claim_hash is not null and used_at is null and claim_expires_at > now()),
      'signups', (select count(*) from public.profiles where created_at > now() - interval '1 hour')),
    'admins', (select coalesce(jsonb_agg(jsonb_build_object('phone', phone, 'email', email, 'name', full_name)), '[]'::jsonb)
               from public.profiles where role = 'admin')
  );
end $$;

create or replace function public.admin_cleanup() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_tokens int; v_rl int; v_red int; v_resets int;
begin
  perform public.require_admin();
  delete from public.qr_tokens where used_at is null and expires_at < now() - interval '1 day'
    and (claim_hash is null or claim_expires_at < now() - interval '1 day');
  get diagnostics v_tokens = row_count;
  delete from public.rate_limits where window_start < now() - interval '1 day';
  get diagnostics v_rl = row_count;
  update public.reward_redemptions set status = 'expired' where status = 'pending' and expires_at <= now();
  get diagnostics v_red = row_count;
  delete from public.password_resets where created_at < now() - interval '2 days';
  get diagnostics v_resets = row_count;
  return jsonb_build_object('ok', true, 'qr_tokens', v_tokens, 'rate_limits', v_rl, 'redemptions_expired', v_red, 'password_resets', v_resets);
end $$;

-- ═══ auth support (SERVICE ROLE ONLY) ══════════════════════════════════════

-- Which auth email to sign in with, for a phone (E.164) or a contact email.
create or replace function public.auth_lookup(p_identifier text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_row record;
begin
  if p_identifier like '%@%' then
    select u.id, u.email, p.role into v_row
    from public.profiles p join auth.users u on u.id = p.id
    where lower(p.email) = lower(trim(p_identifier)) or lower(u.email) = lower(trim(p_identifier))
    order by (p.role = 'merchant') desc, p.created_at limit 1;
  else
    select u.id, u.email, p.role into v_row
    from public.profiles p join auth.users u on u.id = p.id
    where p.phone = p_identifier limit 1;
  end if;
  if v_row.id is null then return null; end if;
  return jsonb_build_object('user_id', v_row.id, 'auth_email', v_row.email, 'role', v_row.role);
end $$;

create or replace function public.reset_request(p_phone text, p_code text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; v_last timestamptz;
begin
  if not public.rate_limit_hit('reset_req:' || coalesce(p_phone, ''), 5, 3600) then return public.err('rate_limited'); end if;
  select id into v_uid from public.profiles where phone = p_phone;
  if v_uid is null then return jsonb_build_object('ok', true, 'sent', false); end if;
  select max(created_at) into v_last from public.password_resets where user_id = v_uid;
  if v_last > now() - interval '60 seconds' then
    return public.err('resend_wait', jsonb_build_object('wait_seconds', ceil(extract(epoch from (v_last + interval '60 seconds' - now())))::int));
  end if;
  update public.password_resets set used_at = now() where user_id = v_uid and used_at is null;
  insert into public.password_resets (user_id, code_hash, expires_at)
  values (v_uid, public.sha256_hex(v_uid::text || ':' || p_code), now() + interval '10 minutes');
  return jsonb_build_object('ok', true, 'sent', true);
end $$;

create or replace function public.reset_verify(p_phone text, p_code text, p_reset_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid; x public.password_resets%rowtype;
begin
  if not public.rate_limit_hit('reset_verify:' || coalesce(p_phone, ''), 15, 3600) then return public.err('rate_limited'); end if;
  select id into v_uid from public.profiles where phone = p_phone;
  if v_uid is null then return public.err('invalid_code'); end if;
  select * into x from public.password_resets
  where user_id = v_uid and used_at is null and verified_at is null
  order by created_at desc limit 1 for update;
  if x.id is null or x.expires_at <= now() then return public.err('expired'); end if;
  if x.attempts >= 5 then return public.err('too_many_attempts'); end if;
  if x.code_hash <> public.sha256_hex(v_uid::text || ':' || coalesce(p_code, '')) then
    update public.password_resets set attempts = attempts + 1 where id = x.id;
    return public.err('invalid_code', jsonb_build_object('attempts_left', 4 - x.attempts));
  end if;
  update public.password_resets
  set verified_at = now(), reset_token_hash = public.sha256_hex(p_reset_token), reset_expires_at = now() + interval '15 minutes'
  where id = x.id;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.reset_consume(p_reset_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x public.password_resets%rowtype;
begin
  select * into x from public.password_resets
  where reset_token_hash = public.sha256_hex(coalesce(p_reset_token, '')) and used_at is null for update;
  if x.id is null or x.reset_expires_at <= now() then return public.err('expired'); end if;
  update public.password_resets set used_at = now() where id = x.id;
  return jsonb_build_object('ok', true, 'user_id', x.user_id,
                            'auth_email', (select email from auth.users where id = x.user_id));
end $$;

-- ═══ card changes: who is affected ═════════════════════════════════════════
-- Progress of every customer mid-card, grouped by (their goal, their stamps), so
-- the loyalty page can say exactly what a change would do before it is saved.
-- ═══ card design ═══════════════════════════════════════════════════════════
-- Mirrors lib/card-design.ts: unknown keys dropped, bad values replaced, so the
-- customer app can render any stored design without defensive code.
create or replace function public.clean_card_design(p jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object(
    'template', case when p ->> 'template' in ('bold', 'classic', 'pastel', 'midnight', 'photo', 'minimal') then p ->> 'template' else 'bold' end,
    'bg', case when p ->> 'bg' ~ '^#[0-9A-Fa-f]{6}$' then upper(p ->> 'bg') else '#6535E0' end,
    'bg2', case when p ->> 'bg2' ~ '^#[0-9A-Fa-f]{6}$' then upper(p ->> 'bg2') end,
    'accent', case when p ->> 'accent' ~ '^#[0-9A-Fa-f]{6}$' then upper(p ->> 'accent') else '#FFFFFF' end,
    'text', case when p ->> 'text' in ('light', 'dark') then p ->> 'text' else 'light' end,
    'pattern', case when p ->> 'pattern' in ('none', 'dots', 'waves', 'grid', 'confetti') then p ->> 'pattern' else 'none' end,
    'stamp', case when p ->> 'stamp' in ('icon', 'logo', 'check', 'heart', 'star') then p ->> 'stamp' else 'icon' end,
    'icon', case when p ->> 'icon' in ('coffee', 'pizza', 'burger', 'cake', 'croissant', 'scissors', 'sparkles', 'ice-cream', 'shopping-bag', 'heart', 'star', 'utensils') then p ->> 'icon' else 'coffee' end,
    'use_cover', coalesce(p ->> 'use_cover', 'false') = 'true'
  )
$$;

create or replace function public.save_card_design(p_description text, p_design jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v_design jsonb;
begin
  if not exists (select 1 from public.loyalty_cards where business_id = v_biz) then return public.err('no_card'); end if;
  if not public.rate_limit_hit('design:' || v_biz, 60, 600) then return public.err('rate_limited'); end if;
  v_design := public.clean_card_design(coalesce(p_design, '{}'::jsonb));
  update public.loyalty_cards
  set design = v_design, icon = v_design ->> 'icon', description = nullif(trim(left(coalesce(p_description, ''), 200)), '')
  where business_id = v_biz;
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'card_designed', jsonb_build_object('template', v_design ->> 'template'));
  return jsonb_build_object('ok', true, 'design', v_design);
end $$;

create or replace function public.merchant_card_impact() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false); v_req int;
begin
  select stamps_required into v_req from public.loyalty_cards where business_id = v_biz;
  return jsonb_build_object(
    'stamps_required', v_req,
    'customers', (select count(*) from public.customers where business_id = v_biz),
    'pending_redemptions', (select count(*) from public.reward_redemptions
                            where business_id = v_biz and status = 'pending' and expires_at > now()),
    'progress', coalesce((
      select jsonb_agg(jsonb_build_object('target', t, 'balance', b, 'n', n))
      from (select public.reward_cost(true, coalesce(v_req, 10), c.card_target) as t, least(c.stamps_balance, 100) as b, count(*) as n
            from public.customers c
            where c.business_id = v_biz and c.stamps_balance > 0
            group by 1, 2) s
    ), '[]'::jsonb)
  );
end $$;
