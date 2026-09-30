-- ═══ Points: the second system, beside the stamps (board 2) ═════════════════
-- A shop runs one system at a time: stamps (with or without levels) or points.
-- With points, the owner types what the customer paid; a one-use QR carries the
-- points and the customer scans it — the same gesture as a stamp. Gifts are a
-- catalog priced in points. The balance is the sum of an append-only ledger,
-- cached on customers.points_balance and moved only together with a ledger row.
--
-- The promises (board 8), for points:
--   · a new rate reaches only the purchases after it;
--   · a price drop applies at once, a price rise waits 14 days;
--   · a gift taken off the catalog stays on offer 14 more days;
--   · expiry, when turned on, counts from that day (a year without a visit);
--   · a code shown at the till keeps its price for its 15 minutes.

alter table public.loyalty_cards add column if not exists system text not null default 'stamps';
alter table public.loyalty_cards drop constraint if exists loyalty_cards_system_check;
alter table public.loyalty_cards add constraint loyalty_cards_system_check check (system in ('stamps', 'points'));
alter table public.loyalty_cards add column if not exists dinars_per_point numeric(7, 3) not null default 1;
alter table public.loyalty_cards drop constraint if exists loyalty_cards_dinars_per_point_check;
alter table public.loyalty_cards add constraint loyalty_cards_dinars_per_point_check check (dinars_per_point between 0.1 and 100);
alter table public.loyalty_cards add column if not exists points_expire boolean not null default false;
comment on column public.loyalty_cards.dinars_per_point is 'points: how many dinars paid make one point';
comment on column public.loyalty_cards.points_expire is 'points: a year without a visit and the points are gone';

create table if not exists public.point_rewards (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  name         text not null check (char_length(name) between 2 and 60),
  points       int  not null check (points between 1 and 100000),
  -- a rise waits 14 days: until next_at the old price holds
  next_points  int  check (next_points between 1 and 100000),
  next_at      timestamptz,
  -- a gift taken off stays on offer until then
  ends_at      timestamptz,
  created_at   timestamptz not null default now()
);
create index if not exists point_rewards_business_idx on public.point_rewards (business_id);

create table if not exists public.points_ledger (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  customer_id    uuid not null references public.customers (id) on delete cascade,
  delta          int  not null check (delta <> 0),
  reason         text not null check (reason in ('purchase', 'redeem', 'expire', 'convert', 'adjust')),
  amount         numeric(10, 3),
  redemption_id  uuid references public.reward_redemptions (id) on delete set null,
  qr_token_id    uuid unique references public.qr_tokens (id) on delete set null,
  actor_id       uuid references public.profiles (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists points_ledger_customer_idx on public.points_ledger (customer_id, created_at desc);
create index if not exists points_ledger_business_idx on public.points_ledger (business_id, created_at desc);

alter table public.point_rewards enable row level security;
alter table public.point_rewards force row level security;
alter table public.points_ledger enable row level security;
alter table public.points_ledger force row level security;
revoke all on public.point_rewards, public.points_ledger from public, anon, authenticated;

alter table public.customers add column if not exists points_balance int not null default 0;
alter table public.customers drop constraint if exists customers_points_balance_check;
alter table public.customers add constraint customers_points_balance_check check (points_balance >= 0);
alter table public.customers add column if not exists total_points int not null default 0;

-- a points QR carries its points and what was paid
alter table public.qr_tokens add column if not exists points int check (points between 1 and 100000);
alter table public.qr_tokens add column if not exists amount numeric(10, 3);

-- a redemption is of a stamps gift (reward_id) or of a catalog gift (point_reward_id)
alter table public.reward_redemptions alter column reward_id drop not null;
alter table public.reward_redemptions add column if not exists point_reward_id uuid references public.point_rewards (id) on delete cascade;
alter table public.reward_redemptions add column if not exists points_spent int not null default 0;
alter table public.reward_redemptions drop constraint if exists reward_redemptions_one_kind;
alter table public.reward_redemptions add constraint reward_redemptions_one_kind check ((reward_id is null) <> (point_reward_id is null));
create unique index if not exists redemptions_pending_one_point on public.reward_redemptions (customer_id, point_reward_id)
  where status = 'pending' and point_reward_id is not null;

-- versions of a points card keep their terms (rate, expiry, catalog)
alter table public.card_versions add column if not exists system text not null default 'stamps';
alter table public.card_versions add column if not exists terms jsonb;

-- ═══ small helpers ═════════════════════════════════════════════════════════
create or replace function public.point_cost(p_points int, p_next int, p_next_at timestamptz) returns int
language sql stable set search_path = '' as $$
  select case when p_next is not null and p_next_at is not null and p_next_at <= now() then p_next else p_points end
$$;

create or replace function public.points_for(p_amount numeric, p_rate numeric) returns int
language sql immutable set search_path = '' as $$
  select greatest(floor(coalesce(p_amount, 0) / nullif(p_rate, 0)), 0)::int
$$;

-- the catalog as a customer sees it today: price in force, the rise to come, the end if taken off
create or replace function public.point_catalog(p_biz uuid)
returns table (id uuid, name text, cost int, next_cost int, next_at timestamptz, ends_at timestamptz, created_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select r.id, r.name, public.point_cost(r.points, r.next_points, r.next_at),
         case when r.next_at > now() then r.next_points end, case when r.next_at > now() then r.next_at end,
         r.ends_at, r.created_at
  from public.point_rewards r
  where r.business_id = p_biz and (r.ends_at is null or r.ends_at > now())
$$;

create or replace function public.is_points_shop(p_biz uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select k.system = 'points' from public.loyalty_cards k where k.business_id = p_biz), false)
$$;

-- ═══ a dead card (or a year without a visit) forgets its points too ═════════
create or replace function public.expire_card(p_customer uuid) returns public.customers
language plpgsql security definer set search_path = '' as $$
declare c public.customers%rowtype;
begin
  select * into c from public.customers where id = p_customer for update;
  if c.id is null or c.card_expires_at is null or c.card_expires_at > now() then return c; end if;
  if c.stamps_balance > 0 then
    insert into public.activity_logs (business_id, customer_id, type, data)
    values (c.business_id, c.id, 'card_expired', jsonb_build_object('balance', c.stamps_balance, 'code', c.code));
  end if;
  if c.points_balance > 0 then
    insert into public.points_ledger (business_id, customer_id, delta, reason)
    values (c.business_id, c.id, -c.points_balance, 'expire');
    insert into public.activity_logs (business_id, customer_id, type, data)
    values (c.business_id, c.id, 'points_expired', jsonb_build_object('points', c.points_balance, 'code', c.code));
  end if;
  update public.customers
  set stamps_balance = 0, points_balance = 0, card_target = null, card_expires_at = null, levels_claimed = '{}',
      card_reward = null, card_levels = null, levels_skipped = '{}', card_started_at = null
  where id = c.id
  returning * into c;
  return c;
end $$;

-- ═══ the counter: what was paid, as a one-use QR ═══════════════════════════
create or replace function public.mint_points_token(p_amount numeric, p_replace uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  b public.businesses%rowtype;
  k public.loyalty_cards%rowtype;
  v_amount numeric(10, 3);
  v_points int;
  v_token text;
  v_id uuid;
  v_exp timestamptz := now() + interval '3 minutes';
begin
  select * into b from public.businesses where id = v_biz;
  if b.status <> 'active' then return public.err('business_suspended'); end if;
  if not public.business_is_open(v_biz) then return public.err('subscription_expired'); end if;
  select * into k from public.loyalty_cards where business_id = v_biz and active;
  if k.id is null then return public.err('no_card'); end if;
  if k.system <> 'points' then return public.err('not_points'); end if;
  v_amount := round(coalesce(p_amount, 0), 3);
  if v_amount <= 0 or v_amount > 100000 then return public.err('invalid_amount'); end if;
  v_points := public.points_for(v_amount, k.dinars_per_point);
  if v_points < 1 then return public.err('amount_too_small'); end if;
  if not public.rate_limit_hit('mint:' || v_biz, 300, 600) then return public.err('rate_limited'); end if;

  -- a code for a wrong amount dies when the right one is made
  if p_replace is not null then
    update public.qr_tokens set active = false
    where id = p_replace and business_id = v_biz and used_at is null and claim_hash is null;
  end if;

  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.qr_tokens (business_id, token_hash, created_by, expires_at, points, amount)
  values (v_biz, public.sha256_hex(v_token), auth.uid(), v_exp, v_points, v_amount)
  returning id into v_id;

  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_token, 'expires_at', v_exp, 'ttl_seconds', 180,
                            'points', v_points, 'amount', v_amount, 'business_name', b.name);
end $$;

-- the counter closes a code nobody scanned
create or replace function public.void_qr_token(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false);
begin
  update public.qr_tokens set active = false
  where id = p_id and business_id = v_biz and used_at is null and claim_hash is null;
  return jsonb_build_object('ok', found);
end $$;

-- the stamps screen only makes stamps codes
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
  if public.is_points_shop(v_biz) then return public.err('points_card'); end if;
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

-- The counter poll: has the shown code been used — and, for points, by whom and how many.
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
    'claimed', t.id is not null and t.used_at is null and t.claim_hash is not null,
    'expired', t.id is null or (t.expires_at <= now() and t.claim_hash is null) or (t.used_at is null and not t.active),
    'expires_at', t.expires_at,
    'open', public.business_is_open(v_biz),
    'points', t.points,
    'amount', t.amount,
    'earned', (select jsonb_build_object('points', l.delta, 'code', c.code, 'balance', c.points_balance,
                                         'name', nullif(split_part(coalesce(p.full_name, ''), ' ', 1), ''))
               from public.points_ledger l
               join public.customers c on c.id = l.customer_id
               join public.profiles p on p.id = c.user_id
               where l.qr_token_id = t.id and t.id is not null),
    'stamps', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'at', s.created_at, 'code', c.code, 'balance', c.stamps_balance) order by s.created_at)
      from (select * from public.stamps where business_id = v_biz and created_at > coalesce(p_since, now()) order by created_at desc limit 20) s
      join public.customers c on c.id = s.customer_id
    ), '[]'::jsonb)
  );
end $$;

-- ═══ what a points card shows a customer ════════════════════════════════════
create or replace function public.points_payload(p_customer_id uuid, p_old_balance int default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c record; b record; k record; v_bal int; v_rewards jsonb; v_next jsonb; v_new jsonb; v_goal int;
begin
  select * into c from public.customers where id = p_customer_id;
  if c.id is null then return null; end if;
  select * into b from public.businesses where id = c.business_id;
  select * into k from public.loyalty_cards where business_id = c.business_id;
  v_bal := public.live_balance(c.points_balance, c.card_expires_at);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'name', o.name, 'description', null,
           'stamps_required', o.cost, 'points', o.cost, 'next_points', o.next_cost, 'next_at', o.next_at, 'ends_at', o.ends_at,
           'is_primary', false, 'level', false, 'claimed', false,
           'unlocked', v_bal >= o.cost,
           'pending', (select jsonb_build_object('id', p.id, 'code', p.code, 'expires_at', p.expires_at)
                       from public.reward_redemptions p
                       where p.customer_id = c.id and p.point_reward_id = o.id and p.status = 'pending' and p.expires_at > now()
                       limit 1)
         ) order by o.cost, o.created_at), '[]'::jsonb)
  into v_rewards
  from public.point_catalog(c.business_id) o;

  select jsonb_build_object('id', o.id, 'name', o.name, 'stamps_required', o.cost, 'points', o.cost, 'remaining', o.cost - v_bal)
  into v_next
  from public.point_catalog(c.business_id) o
  where o.cost > v_bal
  order by o.cost, o.created_at limit 1;

  v_new := '[]'::jsonb;
  if p_old_balance is not null then
    select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'stamps_required', o.cost, 'points', o.cost, 'level', false) order by o.cost), '[]'::jsonb)
    into v_new
    from public.point_catalog(c.business_id) o
    where o.cost > p_old_balance and o.cost <= v_bal;
  end if;

  -- the meter runs to the next gift, or the dearest one once they are all within reach
  v_goal := coalesce((v_next ->> 'points')::int, (select max(o.cost) from public.point_catalog(c.business_id) o), 100);

  return jsonb_build_object(
    'system', 'points',
    'customer', jsonb_build_object(
      'id', c.id, 'code', c.code, 'balance', v_bal, 'total_stamps', c.total_stamps, 'total_points', c.total_points,
      'rewards_redeemed', c.rewards_redeemed, 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at,
      'expires_at', case when v_bal > 0 then c.card_expires_at end),
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category,
      'address', b.address, 'instagram', b.instagram, 'status', b.status),
    'card', case when k.id is null then null else jsonb_build_object(
      'id', k.id, 'name', k.name, 'description', k.description, 'system', 'points',
      'dinars_per_point', k.dinars_per_point, 'points_expire', k.points_expire,
      'stamps_required', v_goal, 'card_stamps_required', v_goal,
      'design', k.design, 'valid_days', 0, 'color', k.color, 'icon', k.icon, 'cooldown_minutes', 0, 'active', k.active,
      'levels', '[]'::jsonb) end,
    'rewards', v_rewards,
    'next_reward', v_next,
    'newly_unlocked', v_new
  );
end $$;

-- one read for both systems: a points shop answers with its points
create or replace function public.card_payload(p_customer_id uuid, p_old_balance int default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c record; b record; k record; v_rewards jsonb; v_next jsonb; v_new jsonb; v_bal int; v_goal int;
begin
  select * into c from public.customers where id = p_customer_id;
  if c.id is null then return null; end if;
  if public.is_points_shop(c.business_id) then return public.points_payload(p_customer_id, p_old_balance); end if;
  select * into b from public.businesses where id = c.business_id;
  select * into k from public.loyalty_cards where business_id = c.business_id;
  v_bal := public.live_balance(c.stamps_balance, c.card_expires_at);
  v_goal := public.reward_cost(true, coalesce(k.stamps_required, 10), c.card_target);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', o.id, 'name', o.name, 'description', o.description,
           'stamps_required', o.cost, 'is_primary', o.is_primary,
           'level', o.is_level, 'claimed', o.taken,
           'unlocked', v_bal >= o.cost and not o.taken,
           'pending', (select jsonb_build_object('id', p.id, 'code', p.code, 'expires_at', p.expires_at)
                       from public.reward_redemptions p
                       where p.customer_id = c.id and p.reward_id = o.id and p.status = 'pending' and p.expires_at > now()
                       limit 1)
         ) order by o.cost, o.sort_at), '[]'::jsonb)
  into v_rewards
  from public.card_offer(c.id) o;

  select jsonb_build_object('id', o.id, 'name', o.name, 'stamps_required', o.cost, 'remaining', o.cost - v_bal)
  into v_next
  from public.card_offer(c.id) o
  where o.cost > v_bal and not o.taken
  order by o.cost, o.sort_at limit 1;

  v_new := '[]'::jsonb;
  if p_old_balance is not null then
    select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'stamps_required', o.cost, 'level', o.is_level) order by o.cost), '[]'::jsonb)
    into v_new
    from public.card_offer(c.id) o
    where o.cost > p_old_balance and o.cost <= v_bal and not o.taken;
  end if;

  return jsonb_build_object(
    'system', 'stamps',
    'customer', jsonb_build_object(
      'id', c.id, 'code', c.code, 'balance', v_bal, 'total_stamps', c.total_stamps,
      'rewards_redeemed', c.rewards_redeemed, 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at,
      'expires_at', case when v_bal > 0 then c.card_expires_at end),
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category,
      'address', b.address, 'instagram', b.instagram, 'status', b.status),
    'card', case when k.id is null then null else jsonb_build_object(
      'id', k.id, 'name', k.name, 'description', k.description, 'system', 'stamps',
      'stamps_required', v_goal,
      'card_stamps_required', k.stamps_required,
      'design', k.design, 'valid_days', k.valid_days,
      'color', k.color, 'icon', k.icon, 'cooldown_minutes', k.cooldown_minutes, 'active', k.active,
      'levels', coalesce((select jsonb_agg(o.cost order by o.cost) from public.card_offer(c.id) o where o.is_level), '[]'::jsonb)) end,
    'rewards', v_rewards,
    'next_reward', v_next,
    'newly_unlocked', v_new
  );
end $$;

-- what happened on a points card, newest first
create or replace function public.points_history(p_customer uuid, p_limit int default 20) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(h order by at desc), '[]'::jsonb) from (
    select l.created_at as at, jsonb_build_object(
             'type', case l.reason when 'purchase' then 'points' when 'redeem' then 'reward_redeemed' else l.reason end,
             'at', l.created_at, 'points', l.delta, 'amount', l.amount,
             'reward_name', (select x.reward_name from public.reward_redemptions x where x.id = l.redemption_id)) as h
    from public.points_ledger l
    where l.customer_id = p_customer
    order by l.created_at desc
    limit greatest(1, least(coalesce(p_limit, 20), 100))
  ) q
$$;

create or replace function public.customer_card(p_customer_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.customers%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into c from public.customers where id = p_customer_id and user_id = v_uid;
  if c.id is null then return null; end if;
  if public.is_points_shop(c.business_id) then
    return public.card_payload(c.id) || jsonb_build_object('history', public.points_history(c.id, 20));
  end if;
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

-- ═══ the scan: a stamp, or the points of a purchase ═════════════════════════
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
  v_entry uuid;
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
  -- a code made for the other system (the shop switched meanwhile) is a missed code
  if (t.points is not null) <> (k.system = 'points') then
    return public.err('expired', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;

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

  c := public.expire_card(c.id);

  -- ── points: what was paid, no waiting between two purchases ──
  if t.points is not null then
    v_old := c.points_balance;
    insert into public.points_ledger (business_id, customer_id, delta, reason, amount, qr_token_id, actor_id)
    values (b.id, c.id, t.points, 'purchase', t.amount, t.id, t.created_by)
    returning id into v_entry;
    update public.qr_tokens set used_at = now(), used_by = v_uid, active = false where id = t.id;
    update public.customers
    set points_balance = points_balance + t.points,
        total_points = total_points + t.points,
        first_stamp_at = coalesce(first_stamp_at, now()),
        last_stamp_at = now(),
        card_expires_at = case when k.points_expire then now() + interval '365 days' end
    where id = c.id
    returning * into c;
    insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
    values (b.id, v_uid, c.id, 'points',
            jsonb_build_object('points', t.points, 'amount', t.amount, 'balance', c.points_balance, 'code', c.code));
    return jsonb_build_object('ok', true, 'points_id', v_entry, 'earned', jsonb_build_object('points', t.points, 'amount', t.amount))
           || public.card_payload(c.id, v_old);
  end if;

  -- ── a stamp ──
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
      last_stamp_at = now(),
      card_expires_at = case when v_old = 0 then public.card_window(k.valid_days) else card_expires_at end
  where id = c.id
  returning * into c;

  -- the stamp that opens a card fixes what the card promises
  if v_old = 0 or c.card_levels is null then perform public.promise_card(c.id); end if;

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (b.id, v_uid, c.id, 'stamp', jsonb_build_object('balance', c.stamps_balance, 'code', c.code));

  return jsonb_build_object('ok', true, 'stamp_id', v_stamp) || public.card_payload(c.id, v_old);
end $$;

-- the sign-up screen can say what is waiting: a stamp or N points
create or replace function public.claim_qr_token(p_token text, p_claim text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.qr_tokens%rowtype; v_name text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' or p_claim is null or length(p_claim) < 32 then
    return public.err('invalid');
  end if;
  select * into t from public.qr_tokens where token_hash = public.sha256_hex(p_token) for update;
  if t.id is null or not t.active then return public.err('invalid'); end if;
  select name into v_name from public.businesses where id = t.business_id;
  if t.claim_hash = public.sha256_hex(p_claim) and t.claim_expires_at > now() then
    return jsonb_build_object('ok', true, 'already', true, 'business_name', v_name, 'points', t.points);
  end if;
  if t.used_at is not null or t.claim_hash is not null then return public.err('already_used'); end if;
  if t.expires_at <= now() then return public.err('expired'); end if;
  if not public.business_is_open(t.business_id) then return public.err('business_paused', jsonb_build_object('business_name', v_name)); end if;

  update public.qr_tokens
  set claim_hash = public.sha256_hex(p_claim), claim_expires_at = now() + interval '20 minutes'
  where id = t.id;
  return jsonb_build_object('ok', true, 'business_name', v_name, 'points', t.points);
end $$;

-- ═══ asking for a catalog gift, giving it ═══════════════════════════════════
create or replace function public.request_points_redemption(p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  r record;
  c public.customers%rowtype;
  x public.reward_redemptions%rowtype;
  v_code text;
  v_i int := 0;
begin
  select * into r from public.point_catalog((select business_id from public.point_rewards where id = p_reward_id)) o where o.id = p_reward_id;
  if r.id is null then return public.err('reward_not_found'); end if;
  select * into c from public.customers
  where business_id = (select business_id from public.point_rewards where id = p_reward_id) and user_id = v_uid for update;
  if c.id is null then return public.err('not_enough_points'); end if;
  if exists (select 1 from public.businesses where id = c.business_id and status <> 'active') then return public.err('business_unavailable'); end if;
  if not public.is_points_shop(c.business_id) then return public.err('reward_not_found'); end if;
  c := public.expire_card(c.id);
  if c.points_balance < r.cost then return public.err('not_enough_points'); end if;

  update public.reward_redemptions set status = 'expired'
  where customer_id = c.id and status = 'pending' and expires_at <= now();

  select * into x from public.reward_redemptions where customer_id = c.id and point_reward_id = p_reward_id and status = 'pending';
  if x.id is not null and x.expires_at > now() + interval '3 minutes' then
    return jsonb_build_object('ok', true, 'id', x.id, 'code', x.code, 'expires_at', x.expires_at, 'reward_name', x.reward_name,
                              'points_spent', x.points_spent, 'business_name', (select name from public.businesses where id = c.business_id));
  end if;
  if x.id is not null then update public.reward_redemptions set status = 'cancelled' where id = x.id; end if;

  loop
    v_i := v_i + 1;
    v_code := public.random_digits(6);
    exit when not exists (select 1 from public.reward_redemptions where business_id = c.business_id and code = v_code and status = 'pending');
    if v_i > 20 then raise exception 'code_space_exhausted'; end if;
  end loop;

  -- the price is the one in force now: the code keeps it for its 15 minutes
  insert into public.reward_redemptions (point_reward_id, customer_id, business_id, user_id, reward_name, stamps_spent, points_spent, code, expires_at)
  values (p_reward_id, c.id, c.business_id, v_uid, r.name, 0, r.cost, v_code, now() + interval '15 minutes')
  returning * into x;

  return jsonb_build_object('ok', true, 'id', x.id, 'code', x.code, 'expires_at', x.expires_at, 'reward_name', x.reward_name,
                            'points_spent', x.points_spent, 'business_name', (select name from public.businesses where id = c.business_id));
end $$;

create or replace function public.request_redemption(p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  v_biz uuid;
  c public.customers%rowtype;
  o record;
  x public.reward_redemptions%rowtype;
  v_code text;
  v_i int := 0;
  v_spend int;
begin
  if v_uid is null then return public.err('not_authenticated'); end if;
  if not public.rate_limit_hit('redeem_req:' || v_uid, 20, 600) then return public.err('rate_limited'); end if;

  select business_id into v_biz from public.rewards where id = p_reward_id;
  if v_biz is null then
    if exists (select 1 from public.point_rewards where id = p_reward_id) then return public.request_points_redemption(p_reward_id); end if;
    return public.err('reward_not_found');
  end if;
  if exists (select 1 from public.businesses where id = v_biz and status <> 'active') then return public.err('business_unavailable'); end if;

  select * into c from public.customers where business_id = v_biz and user_id = v_uid for update;
  if c.id is null then return public.err('not_enough_stamps'); end if;
  c := public.expire_card(c.id);

  select * into o from public.card_offer(c.id) f where f.id = p_reward_id;
  if o.id is null then return public.err('reward_not_found'); end if;
  if c.stamps_balance < o.cost then return public.err('not_enough_stamps'); end if;
  if o.taken then return public.err('already_claimed'); end if;
  v_spend := case when o.is_level then 0 else o.cost end;

  update public.reward_redemptions set status = 'expired'
  where customer_id = c.id and status = 'pending' and expires_at <= now();

  select * into x from public.reward_redemptions where customer_id = c.id and reward_id = p_reward_id and status = 'pending';
  if x.id is not null and x.expires_at > now() + interval '3 minutes' then
    return jsonb_build_object('ok', true, 'id', x.id, 'code', x.code, 'expires_at', x.expires_at, 'reward_name', x.reward_name,
                              'business_name', (select name from public.businesses where id = v_biz));
  end if;
  if x.id is not null then update public.reward_redemptions set status = 'cancelled' where id = x.id; end if;

  loop
    v_i := v_i + 1;
    v_code := public.random_digits(6);
    exit when not exists (select 1 from public.reward_redemptions where business_id = v_biz and code = v_code and status = 'pending');
    if v_i > 20 then raise exception 'code_space_exhausted'; end if;
  end loop;

  insert into public.reward_redemptions (reward_id, customer_id, business_id, user_id, reward_name, stamps_spent, code, expires_at)
  values (p_reward_id, c.id, v_biz, v_uid, o.name, v_spend, v_code, now() + interval '15 minutes')
  returning * into x;

  return jsonb_build_object('ok', true, 'id', x.id, 'code', x.code, 'expires_at', x.expires_at, 'reward_name', x.reward_name,
                            'business_name', (select name from public.businesses where id = v_biz));
end $$;

-- the points leave the card when the gift is handed over, not before
create or replace function public.spend_points(p_customer uuid, p_points int, p_redemption uuid) returns void
language plpgsql security definer set search_path = '' as $$
begin
  update public.customers
  set points_balance = points_balance - p_points, rewards_redeemed = rewards_redeemed + 1
  where id = p_customer;
  insert into public.points_ledger (business_id, customer_id, delta, reason, redemption_id, actor_id)
  select c.business_id, c.id, -p_points, 'redeem', p_redemption, auth.uid() from public.customers c where c.id = p_customer;
end $$;

create or replace function public.merchant_confirm_redemption(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  x public.reward_redemptions%rowtype;
  c public.customers%rowtype;
  o record;
begin
  select * into x from public.reward_redemptions where id = p_id and business_id = v_biz for update;
  if x.id is null then return public.err('not_found'); end if;
  if x.status = 'redeemed' then return public.err('already_redeemed', jsonb_build_object('redemption', public.redemption_view(x))); end if;
  if x.status <> 'pending' then return public.err(x.status); end if;
  if x.expires_at <= now() then
    update public.reward_redemptions set status = 'expired' where id = x.id;
    return public.err('expired');
  end if;

  c := public.expire_card(x.customer_id);

  if x.point_reward_id is not null then
    if c.points_balance < x.points_spent then return public.err('not_enough_points'); end if;
    update public.reward_redemptions set status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
    where id = x.id returning * into x;
    perform public.spend_points(c.id, x.points_spent, x.id);
    insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
    values (v_biz, auth.uid(), c.id, 'reward_redeemed',
            jsonb_build_object('reward_name', x.reward_name, 'points_spent', x.points_spent, 'code', c.code, 'redemption_id', x.id));
    return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
  end if;

  if c.stamps_balance < x.stamps_spent then return public.err('not_enough_stamps'); end if;
  if x.stamps_spent = 0 then
    -- a level: the card's promise decides, so a code shown at the till holds even if the owner moved the level meanwhile
    select * into o from public.card_offer(c.id) f where f.id = x.reward_id;
    if o.id is null or c.stamps_balance < o.cost then return public.err('not_enough_stamps'); end if;
    if o.taken then return public.err('already_claimed'); end if;
  end if;

  perform public.apply_reward(c.id, x.reward_id, x.stamps_spent);
  update public.reward_redemptions set status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
  where id = x.id returning * into x;

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (v_biz, auth.uid(), c.id, 'reward_redeemed',
          jsonb_build_object('reward_name', x.reward_name, 'stamps_spent', x.stamps_spent, 'code', c.code, 'redemption_id', x.id));
  return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
end $$;

create or replace function public.merchant_redeem_direct(p_customer_id uuid, p_reward_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  c public.customers%rowtype;
  o record;
  x public.reward_redemptions%rowtype;
  v_spend int;
begin
  select * into c from public.customers where id = p_customer_id and business_id = v_biz for update;
  if c.id is null then return public.err('not_found'); end if;
  c := public.expire_card(c.id);

  if exists (select 1 from public.point_rewards where id = p_reward_id and business_id = v_biz) then
    select * into o from public.point_catalog(v_biz) f where f.id = p_reward_id;
    if o.id is null then return public.err('reward_not_found'); end if;
    if c.points_balance < o.cost then return public.err('not_enough_points'); end if;
    update public.reward_redemptions set status = 'cancelled'
    where customer_id = c.id and point_reward_id = p_reward_id and status = 'pending';
    insert into public.reward_redemptions (point_reward_id, customer_id, business_id, user_id, reward_name, stamps_spent, points_spent,
                                           code, status, expires_at, redeemed_by, redeemed_at)
    values (p_reward_id, c.id, v_biz, c.user_id, o.name, 0, o.cost, public.random_digits(6), 'redeemed', now(), auth.uid(), now())
    returning * into x;
    perform public.spend_points(c.id, o.cost, x.id);
    insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
    values (v_biz, auth.uid(), c.id, 'reward_redeemed',
            jsonb_build_object('reward_name', o.name, 'points_spent', o.cost, 'code', c.code, 'redemption_id', x.id));
    return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
  end if;

  select * into o from public.card_offer(c.id) f where f.id = p_reward_id;
  if o.id is null then return public.err('reward_not_found'); end if;
  if c.stamps_balance < o.cost then return public.err('not_enough_stamps'); end if;
  if o.taken then return public.err('already_claimed'); end if;
  v_spend := case when o.is_level then 0 else o.cost end;

  update public.reward_redemptions set status = 'cancelled'
  where customer_id = c.id and reward_id = p_reward_id and status = 'pending';

  insert into public.reward_redemptions (reward_id, customer_id, business_id, user_id, reward_name, stamps_spent,
                                         code, status, expires_at, redeemed_by, redeemed_at)
  values (p_reward_id, c.id, v_biz, c.user_id, o.name, v_spend, public.random_digits(6), 'redeemed', now(), auth.uid(), now())
  returning * into x;

  perform public.apply_reward(c.id, p_reward_id, v_spend);

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (v_biz, auth.uid(), c.id, 'reward_redeemed',
          jsonb_build_object('reward_name', o.name, 'stamps_spent', v_spend, 'code', c.code, 'redemption_id', x.id));
  return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
end $$;

create or replace function public.redemption_view(x public.reward_redemptions) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', x.id, 'code', x.code, 'status', case when x.status = 'pending' and x.expires_at <= now() then 'expired' else x.status end,
    'reward_name', x.reward_name, 'stamps_spent', x.stamps_spent, 'points_spent', x.points_spent,
    'system', case when x.point_reward_id is not null then 'points' else 'stamps' end,
    'expires_at', x.expires_at, 'redeemed_at', x.redeemed_at,
    'customer', (select jsonb_build_object('id', c.id, 'code', c.code,
                                           'balance', case when x.point_reward_id is not null then c.points_balance else c.stamps_balance end,
                                           'name', p.full_name, 'phone_masked', public.mask_phone(p.phone))
                 from public.customers c join public.profiles p on p.id = c.user_id where c.id = x.customer_id))
$$;

-- ═══ the customer's side: the lobby and the gifts ══════════════════════════
create or replace function public.home_card(p_customer uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c public.customers%rowtype; b public.businesses%rowtype; k public.loyalty_cards%rowtype; v_bal int; v_goal int; v_next jsonb;
begin
  select * into c from public.customers where id = p_customer;
  select * into b from public.businesses where id = c.business_id;
  select * into k from public.loyalty_cards where business_id = c.business_id;

  if k.system = 'points' then
    v_bal := public.live_balance(c.points_balance, c.card_expires_at);
    select jsonb_build_object('name', o.name, 'stamps_required', o.cost, 'remaining', o.cost - v_bal)
    into v_next from public.point_catalog(c.business_id) o where o.cost > v_bal order by o.cost, o.created_at limit 1;
    v_goal := coalesce((v_next ->> 'stamps_required')::int, (select max(o.cost) from public.point_catalog(c.business_id) o), 100);
    return jsonb_build_object(
      'customer_id', c.id, 'code', c.code, 'balance', v_bal, 'system', 'points',
      'total_stamps', c.total_stamps, 'total_points', c.total_points, 'last_stamp_at', c.last_stamp_at,
      'expires_at', case when v_bal > 0 then c.card_expires_at end,
      'business', jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category),
      'card', jsonb_build_object('name', k.name, 'system', 'points', 'stamps_required', v_goal, 'dinars_per_point', k.dinars_per_point,
                                 'color', coalesce(k.color, 'indigo'), 'icon', coalesce(k.icon, 'coffee'),
                                 'description', k.description, 'design', coalesce(k.design, '{}'::jsonb), 'levels', '[]'::jsonb),
      'next_reward', v_next,
      'unlocked', coalesce((select jsonb_agg(o.name order by o.cost) from public.point_catalog(c.business_id) o where o.cost <= v_bal), '[]'::jsonb),
      'primary_reward', null);
  end if;

  v_bal := public.live_balance(c.stamps_balance, c.card_expires_at);
  v_goal := public.reward_cost(true, coalesce(k.stamps_required, 10), c.card_target);
  return jsonb_build_object(
    'customer_id', c.id, 'code', c.code, 'balance', v_bal, 'system', 'stamps',
    'total_stamps', c.total_stamps, 'last_stamp_at', c.last_stamp_at,
    'expires_at', case when v_bal > 0 then c.card_expires_at end,
    'business', jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category),
    'card', jsonb_build_object('name', k.name, 'system', 'stamps', 'stamps_required', v_goal,
                               'color', coalesce(k.color, 'indigo'), 'icon', coalesce(k.icon, 'coffee'),
                               'description', k.description, 'design', coalesce(k.design, '{}'::jsonb),
                               'levels', coalesce((select jsonb_agg(o.cost order by o.cost) from public.card_offer(c.id) o where o.is_level), '[]'::jsonb)),
    'next_reward', (select jsonb_build_object('name', o.name, 'stamps_required', o.cost, 'remaining', o.cost - v_bal)
                    from public.card_offer(c.id) o where o.cost > v_bal and not o.taken order by o.cost limit 1),
    'unlocked', coalesce((select jsonb_agg(o.name order by o.cost) from public.card_offer(c.id) o
                          where o.cost <= v_bal and not o.taken), '[]'::jsonb),
    'primary_reward', (select o.name from public.card_offer(c.id) o where o.is_primary limit 1));
end $$;

create or replace function public.customer_home() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object(
    'profile', (select jsonb_build_object('full_name', full_name, 'phone', phone, 'role', role) from public.profiles where id = v_uid),
    'cards', coalesce((
      select jsonb_agg(public.home_card(c.id) order by coalesce(c.last_stamp_at, c.created_at) desc nulls last)
      from public.customers c
      where c.user_id = v_uid
    ), '[]'::jsonb)
  );
end $$;

-- every gift a customer can take or is close to, across both systems
create or replace function public.customer_offers(p_uid uuid)
returns table (customer_id uuid, reward_id uuid, name text, description text, cost int, level boolean, bal int, points boolean, last_at timestamptz)
language sql stable security definer set search_path = '' as $$
  select c.id, o.id, o.name, o.description, o.cost, o.is_level, v.bal, false, c.last_stamp_at
  from public.customers c
  cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
  cross join lateral public.card_offer(c.id) o
  where c.user_id = p_uid and not public.is_points_shop(c.business_id) and not o.taken
  union all
  select c.id, o.id, o.name, null, o.cost, false, v.bal, true, c.last_stamp_at
  from public.customers c
  cross join lateral (select public.live_balance(c.points_balance, c.card_expires_at) as bal) v
  cross join lateral public.point_catalog(c.business_id) o
  where c.user_id = p_uid and public.is_points_shop(c.business_id)
$$;

create or replace function public.customer_rewards() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  return jsonb_build_object(
    'unlocked', coalesce((
      select jsonb_agg(jsonb_build_object(
        'reward_id', o.reward_id, 'name', o.name, 'description', o.description,
        'stamps_required', o.cost, 'level', o.level, 'points', o.points,
        'customer_id', o.customer_id, 'balance', o.bal,
        'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
        'card', jsonb_build_object('color', k.color, 'icon', k.icon)
      ) order by o.last_at desc, o.cost)
      from public.customer_offers(v_uid) o
      join public.customers c on c.id = o.customer_id
      join public.businesses b on b.id = c.business_id
      left join public.loyalty_cards k on k.business_id = c.business_id
      where o.cost <= o.bal
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(u.item order by u.remaining) from (
        select distinct on (o.customer_id) (o.cost - o.bal) as remaining, jsonb_build_object(
          'reward_id', o.reward_id, 'name', o.name, 'stamps_required', o.cost, 'points', o.points,
          'customer_id', o.customer_id, 'balance', o.bal, 'remaining', o.cost - o.bal,
          'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
          'card', jsonb_build_object('color', k.color, 'icon', k.icon)
        ) as item
        from public.customer_offers(v_uid) o
        join public.customers c on c.id = o.customer_id
        join public.businesses b on b.id = c.business_id
        left join public.loyalty_cards k on k.business_id = c.business_id
        where o.cost > o.bal
        order by o.customer_id, o.cost
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

-- ═══ the owner's side: customers, home, numbers ════════════════════════════
create or replace function public.merchant_customers(p_search text default null, p_sort text default 'recent',
                                                     p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_digits text;
  v_like text;
  v_req int;
  v_points boolean := public.is_points_shop(v_biz);
begin
  v_digits := regexp_replace(coalesce(v_q, ''), '\D', '', 'g');
  v_like := '%' || replace(replace(coalesce(v_q, ''), '%', ''), '_', '') || '%';
  select stamps_required into v_req from public.loyalty_cards where business_id = v_biz;
  return jsonb_build_object(
    'system', case when v_points then 'points' else 'stamps' end,
    'stamps_required', v_req,
    'total', (select count(*) from public.customers where business_id = v_biz),
    'items', coalesce((
      select jsonb_agg(item order by rn) from (
        select row_number() over (order by
                 case when p_sort = 'active' then c.total_stamps + c.total_points end desc nulls last,
                 case when p_sort = 'stamps' then v.bal end desc nulls last,
                 case when p_sort = 'rewards' then c.rewards_redeemed end desc nulls last,
                 c.last_stamp_at desc nulls last, c.created_at desc) as rn,
               jsonb_build_object(
                 'id', c.id, 'code', c.code, 'name', p.full_name, 'phone_masked', public.mask_phone(p.phone),
                 'balance', v.bal, 'total_stamps', c.total_stamps, 'total_points', c.total_points, 'rewards_redeemed', c.rewards_redeemed,
                 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at,
                 'target', case when v_points then null else g.goal end,
                 'reward_ready', case when v_points
                                      then exists (select 1 from public.point_catalog(v_biz) o where o.cost <= v.bal)
                                      else exists (select 1 from public.card_offer(c.id) o where o.cost <= v.bal and not o.taken) end) as item
        from public.customers c
        cross join lateral (select public.live_balance(case when v_points then c.points_balance else c.stamps_balance end, c.card_expires_at) as bal) v
        cross join lateral (select public.reward_cost(true, coalesce(v_req, 10), c.card_target) as goal) g
        join public.profiles p on p.id = c.user_id
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
declare v_biz uuid := public.require_business(false); c public.customers%rowtype; v_bal int;
begin
  select * into c from public.customers where id = p_customer_id and business_id = v_biz;
  if c.id is null then return null; end if;
  if public.is_points_shop(v_biz) then
    return public.card_payload(c.id) || jsonb_build_object(
      'profile', (select jsonb_build_object('name', full_name, 'phone_masked', public.mask_phone(phone)) from public.profiles where id = c.user_id),
      'rewards_earned', c.rewards_redeemed,
      'history', public.points_history(c.id, 30));
  end if;
  v_bal := public.live_balance(c.stamps_balance, c.card_expires_at);
  return public.card_payload(c.id) || jsonb_build_object(
    'profile', (select jsonb_build_object('name', full_name, 'phone_masked', public.mask_phone(phone)) from public.profiles where id = c.user_id),
    'rewards_earned', c.rewards_redeemed + (select count(*) from public.card_offer(c.id) o where o.cost <= v_bal and not o.taken),
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

-- a visit is a stamp or a purchase with points: the numbers read both
create or replace function public.merchant_dashboard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_month timestamptz := (date_trunc('month', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis';
  v_today timestamptz := public.tunis_today_start();
begin
  return jsonb_build_object(
    'system', case when public.is_points_shop(v_biz) then 'points' else 'stamps' end,
    'customers', (select count(*) from public.customers where business_id = v_biz),
    'stamps_this_month', (select count(*) from public.stamps where business_id = v_biz and created_at >= v_month),
    'stamps_today', (select count(*) from public.stamps where business_id = v_biz and created_at >= v_today),
    'points_today', (select coalesce(sum(delta), 0) from public.points_ledger where business_id = v_biz and reason = 'purchase' and created_at >= v_today),
    'visitors_today', (select count(distinct customer_id) from (
                         select customer_id from public.stamps where business_id = v_biz and created_at >= v_today
                         union all
                         select customer_id from public.points_ledger where business_id = v_biz and reason = 'purchase' and created_at >= v_today) v),
    'rewards_today', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_today),
    'rewards_redeemed', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed'),
    'returning_rate', (select case when count(*) = 0 then 0
                                   else round(100.0 * count(*) filter (where total_stamps >= 2 or total_points > 0 and
                                     (select count(*) from public.points_ledger l where l.customer_id = c.id and l.reason = 'purchase') >= 2) / count(*)) end
                       from public.customers c where c.business_id = v_biz),
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
        where business_id = p_biz and type in ('stamp', 'points', 'reward_redeemed')
          and (p_from is null or created_at >= p_from) and (p_to is null or created_at < p_to)
        order by created_at desc limit greatest(1, least(p_limit, 500))) a
  left join public.customers c on c.id = a.customer_id
$$;

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
    'system', case when public.is_points_shop(v_biz) then 'points' else 'stamps' end,
    'stamps', (select count(*) from public.stamps where business_id = v_biz and created_at >= v_f and created_at < v_t),
    'purchases', (select count(*) from public.points_ledger where business_id = v_biz and reason = 'purchase' and created_at >= v_f and created_at < v_t),
    'points', (select coalesce(sum(delta), 0) from public.points_ledger where business_id = v_biz and reason = 'purchase' and created_at >= v_f and created_at < v_t),
    'redemptions', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_f and redeemed_at < v_t),
    'items', public.activity_items(v_biz, v_f, v_t, 300)
  );
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
  return (
    with visits as (
      select customer_id, created_at from public.stamps where business_id = v_biz and created_at >= v_prev
      union all
      select customer_id, created_at from public.points_ledger where business_id = v_biz and reason = 'purchase' and created_at >= v_prev
    ), per_customer as (
      select c.id, (select count(*) from public.stamps s where s.customer_id = c.id)
                   + (select count(*) from public.points_ledger l where l.customer_id = c.id and l.reason = 'purchase') as n
      from public.customers c where c.business_id = v_biz
    )
    select jsonb_build_object(
      'days', v_days,
      'system', case when public.is_points_shop(v_biz) then 'points' else 'stamps' end,
      'customers_total', (select count(*) from public.customers where business_id = v_biz),
      'new_customers', (select count(*) from public.customers where business_id = v_biz and first_stamp_at >= v_from),
      'new_customers_prev', (select count(*) from public.customers where business_id = v_biz and first_stamp_at >= v_prev and first_stamp_at < v_from),
      'active_customers', (select count(distinct customer_id) from visits where created_at >= v_from),
      'returning_customers', (select count(distinct v.customer_id) from visits v join public.customers c on c.id = v.customer_id
                              where v.created_at >= v_from and c.first_stamp_at < v_from),
      'stamps', (select count(*) from visits where created_at >= v_from),
      'stamps_prev', (select count(*) from visits where created_at >= v_prev and created_at < v_from),
      'points', (select coalesce(sum(delta), 0) from public.points_ledger where business_id = v_biz and reason = 'purchase' and created_at >= v_from),
      'redemptions', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_from),
      'redemptions_prev', (select count(*) from public.reward_redemptions where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_prev and redeemed_at < v_from),
      'returning_rate', (select case when count(*) = 0 then 0 else round(100.0 * count(*) filter (where n >= 2) / count(*)) end from per_customer),
      'series', (
        select jsonb_agg(jsonb_build_object('date', d.day, 'stamps', coalesce(s.n, 0), 'redemptions', coalesce(r.n, 0),
                                            'new_customers', coalesce(nc.n, 0)) order by d.day)
        from (select (v_today - g)::date as day from generate_series(0, v_days - 1) g) d
        left join (select (created_at at time zone 'Africa/Tunis')::date as day, count(*) n from visits
                   where created_at >= v_from group by 1) s on s.day = d.day
        left join (select (redeemed_at at time zone 'Africa/Tunis')::date as day, count(*) n from public.reward_redemptions
                   where business_id = v_biz and status = 'redeemed' and redeemed_at >= v_from group by 1) r on r.day = d.day
        left join (select (first_stamp_at at time zone 'Africa/Tunis')::date as day, count(*) n from public.customers
                   where business_id = v_biz and first_stamp_at >= v_from group by 1) nc on nc.day = d.day
      )
    )
  );
end $$;

-- ═══ the owner sets the points up: rate, catalog, expiry ═══════════════════
-- p_catalog: [{id?, name, points}], 1 to 12 gifts. Returns the new version.
create or replace function public.save_points_card(p_name text, p_dinars_per_point numeric, p_points_expire boolean,
                                                   p_catalog jsonb, p_expected_version int default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(true);
  k public.loyalty_cards%rowtype;
  v_created boolean := false;
  v_version int;
  v_rate numeric(7, 3) := round(coalesce(p_dinars_per_point, 1), 3);
  e jsonb;
  r public.point_rewards%rowtype;
  v_id uuid;
  v_name text;
  v_pts int;
  v_now_cost int;
  v_keep uuid[] := '{}';
  v_cat record;
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 then return public.err('invalid_name'); end if;
  if v_rate < 0.1 or v_rate > 100 then return public.err('invalid_rate'); end if;
  if p_catalog is null or jsonb_typeof(p_catalog) <> 'array' or jsonb_array_length(p_catalog) not between 1 and 12 then
    return public.err('invalid_catalog');
  end if;
  if exists (select 1 from jsonb_array_elements(p_catalog) x
             where char_length(trim(coalesce(x ->> 'name', ''))) not between 2 and 60
                or coalesce((x ->> 'points')::int, 0) not between 1 and 100000) then
    return public.err('invalid_catalog');
  end if;

  select * into k from public.loyalty_cards where business_id = v_biz for update;
  if k.id is not null and p_expected_version is not null and p_expected_version <> k.version then
    return public.err('card_changed', jsonb_build_object('version', k.version));
  end if;
  if k.id is not null and k.system <> 'points' then return public.err('other_system'); end if;

  if k.id is null then
    insert into public.loyalty_cards (business_id, name, stamps_required, system, dinars_per_point, points_expire)
    values (v_biz, trim(p_name), 10, 'points', v_rate, coalesce(p_points_expire, false))
    returning * into k;
    v_created := true;
    v_version := k.version;
  else
    -- expiry counts from the day it is turned on; turned off, nothing expires
    if coalesce(p_points_expire, false) and not k.points_expire then
      update public.customers set card_expires_at = now() + interval '365 days'
      where business_id = v_biz and points_balance > 0;
    elsif not coalesce(p_points_expire, false) and k.points_expire then
      update public.customers set card_expires_at = null where business_id = v_biz;
    end if;
    update public.loyalty_cards
    set name = trim(p_name), dinars_per_point = v_rate, points_expire = coalesce(p_points_expire, false),
        active = true, version = version + 1, updated_at = now()
    where id = k.id
    returning version into v_version;
  end if;

  for e in select * from jsonb_array_elements(p_catalog) loop
    v_name := trim(e ->> 'name');
    v_pts := (e ->> 'points')::int;
    v_id := null;
    if coalesce(e ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
      select * into r from public.point_rewards where id = (e ->> 'id')::uuid and business_id = v_biz for update;
      if r.id is not null then
        v_id := r.id;
        v_now_cost := public.point_cost(r.points, r.next_points, r.next_at);
        if v_pts <= v_now_cost then
          -- cheaper (or the same): at once
          update public.point_rewards set name = v_name, points = v_pts, next_points = null, next_at = null, ends_at = null where id = r.id;
        elsif r.next_points = v_pts and r.next_at > now() then
          -- the same rise, already on its way: its date stays
          update public.point_rewards set name = v_name, points = v_now_cost, ends_at = null where id = r.id;
        else
          -- dearer: the points already earned keep their worth for 14 days
          update public.point_rewards
          set name = v_name, points = v_now_cost, next_points = v_pts, next_at = now() + interval '14 days', ends_at = null
          where id = r.id;
        end if;
      end if;
    end if;
    if v_id is null then
      insert into public.point_rewards (business_id, name, points) values (v_biz, v_name, v_pts) returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
  end loop;

  -- a gift taken off stays on offer 14 more days
  update public.point_rewards
  set ends_at = now() + interval '14 days'
  where business_id = v_biz and not (id = any(v_keep)) and (ends_at is null);

  insert into public.card_versions (business_id, version, stamps_required, reward_name, levels, valid_days, system, terms, created_by)
  values (v_biz, v_version, 0, coalesce((select name from public.point_rewards where id = v_keep[1]), trim(p_name)), '[]'::jsonb, 0, 'points',
          jsonb_build_object('dinars_per_point', v_rate, 'points_expire', coalesce(p_points_expire, false),
                             'catalog', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name,
                                                                                      'points', coalesce(x.next_points, x.points)) order by coalesce(x.next_points, x.points)), '[]'::jsonb)
                                         from public.point_rewards x where x.id = any(v_keep))),
          auth.uid())
  on conflict (business_id, version) do update
    set stamps_required = excluded.stamps_required, reward_name = excluded.reward_name, levels = excluded.levels,
        valid_days = excluded.valid_days, system = excluded.system, terms = excluded.terms,
        created_by = excluded.created_by, created_at = now();

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), case when v_created then 'card_created' else 'card_updated' end,
          jsonb_build_object('system', 'points', 'dinars_per_point', v_rate, 'catalog', jsonb_array_length(p_catalog), 'version', v_version));

  return jsonb_build_object('ok', true, 'card_id', k.id, 'created', v_created, 'version', v_version);
end $$;

-- before saving: what the change does to the points already earned, in numbers
create or replace function public.preview_points_change(p_dinars_per_point numeric, p_points_expire boolean, p_catalog jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(true);
  k public.loyalty_cards%rowtype;
  v_holders int;
  v_raised jsonb; v_lowered jsonb; v_removed jsonb;
begin
  select * into k from public.loyalty_cards where business_id = v_biz;
  if k.id is null then return jsonb_build_object('ok', true, 'new_card', true); end if;
  if k.system <> 'points' then return public.err('other_system'); end if;
  if p_catalog is null or jsonb_typeof(p_catalog) <> 'array' then p_catalog := '[]'::jsonb; end if;

  select count(*) into v_holders from public.customers c
  where c.business_id = v_biz and public.live_balance(c.points_balance, c.card_expires_at) > 0;

  with wanted as (
    select (e ->> 'id') as id, trim(e ->> 'name') as name, (e ->> 'points')::int as pts
    from jsonb_array_elements(p_catalog) e
  ), cur as (
    select o.id::text as id, o.name, o.cost, o.next_cost from public.point_catalog(v_biz) o
  )
  select
    coalesce(jsonb_agg(jsonb_build_object('name', w.name, 'from', c.cost, 'to', w.pts,
             'can_afford', (select count(*) from public.customers x where x.business_id = v_biz
                            and public.live_balance(x.points_balance, x.card_expires_at) >= c.cost))) filter (where w.pts > c.cost and w.pts is distinct from c.next_cost), '[]'::jsonb),
    coalesce(jsonb_agg(jsonb_build_object('name', w.name, 'from', c.cost, 'to', w.pts,
             'now_afford', (select count(*) from public.customers x where x.business_id = v_biz
                            and public.live_balance(x.points_balance, x.card_expires_at) >= w.pts
                            and public.live_balance(x.points_balance, x.card_expires_at) < c.cost))) filter (where w.pts < c.cost), '[]'::jsonb)
  into v_raised, v_lowered
  from wanted w join cur c on c.id = w.id;

  select coalesce(jsonb_agg(jsonb_build_object('name', c.name, 'points', c.cost,
                 'can_afford', (select count(*) from public.customers x where x.business_id = v_biz
                                and public.live_balance(x.points_balance, x.card_expires_at) >= c.cost))), '[]'::jsonb)
  into v_removed
  from public.point_catalog(v_biz) c
  where c.ends_at is null
    and not exists (select 1 from jsonb_array_elements(p_catalog) e where e ->> 'id' = c.id::text);

  return jsonb_build_object(
    'ok', true,
    'version', k.version,
    'holders', v_holders,
    'rate_from', k.dinars_per_point, 'rate_to', round(coalesce(p_dinars_per_point, k.dinars_per_point), 3),
    'expire_on', coalesce(p_points_expire, false) and not k.points_expire,
    'expire_off', not coalesce(p_points_expire, false) and k.points_expire,
    'raised', v_raised, 'lowered', v_lowered, 'removed', v_removed,
    'until', now() + interval '14 days'
  );
end $$;

-- the owner's page for a points card: its terms and its catalog as the customers see it
create or replace function public.points_card() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false); k public.loyalty_cards%rowtype;
begin
  select * into k from public.loyalty_cards where business_id = v_biz;
  if k.id is null then return null; end if;
  return jsonb_build_object(
    'system', k.system, 'name', k.name, 'version', k.version,
    'dinars_per_point', k.dinars_per_point, 'points_expire', k.points_expire,
    'holders', (select count(*) from public.customers c where c.business_id = v_biz
                and public.live_balance(c.points_balance, c.card_expires_at) > 0),
    'catalog', coalesce((select jsonb_agg(jsonb_build_object('id', o.id, 'name', o.name, 'points', coalesce(o.next_cost, o.cost),
                                                             'now', o.cost, 'next_points', o.next_cost, 'next_at', o.next_at, 'ends_at', o.ends_at)
                                          order by o.cost, o.created_at)
                         from public.point_catalog(v_biz) o), '[]'::jsonb)
  );
end $$;

-- ═══ the session and the history know which system a card runs ═════════════
create or replace function public.session_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_biz uuid; v_role text; v_acting boolean := false;
begin
  if v_uid is null then return null; end if;
  v_biz := public.acting_business();
  if v_biz is not null then
    v_role := 'owner';
    v_acting := true;
  else
    select bm.business_id, bm.role into v_biz, v_role
    from public.business_members bm where bm.user_id = v_uid
    order by (bm.role = 'owner') desc, bm.created_at limit 1;
  end if;

  return jsonb_build_object(
    'user', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone,
                                       'email', p.email, 'role', p.role, 'created_at', p.created_at)
             from public.profiles p where p.id = v_uid),
    'member_role', v_role,
    'acting', v_acting,
    'business', (select jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
                                           'phone', b.phone, 'address', b.address, 'instagram', b.instagram,
                                           'status', b.status, 'created_at', b.created_at,
                                           'cover_url', b.cover_url, 'join_code', b.join_code,
                                           'onboarded_at', b.onboarded_at)
                 from public.businesses b where b.id = v_biz),
    'card', (select jsonb_build_object('id', k.id, 'name', k.name, 'description', k.description,
                                       'stamps_required', k.stamps_required, 'color', k.color, 'icon', k.icon,
                                       'cooldown_minutes', k.cooldown_minutes, 'valid_days', k.valid_days,
                                       'active', k.active, 'design', k.design, 'version', k.version,
                                       'system', k.system, 'dinars_per_point', k.dinars_per_point, 'points_expire', k.points_expire,
                                       'reward', (select jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description)
                                                  from public.rewards r where r.loyalty_card_id = k.id and r.is_primary),
                                       'levels', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'stamps', r.stamps_required)
                                                                            order by r.stamps_required)
                                                           from public.rewards r
                                                           where r.loyalty_card_id = k.id and not r.is_primary and r.active
                                                             and r.stamps_required < k.stamps_required), '[]'::jsonb))
             from public.loyalty_cards k where k.business_id = v_biz),
    'subscription', case when v_biz is null then null else public.subscription_state(v_biz) end
  );
end $$;

create or replace function public.card_history() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v_live int; v_system text;
begin
  select version, system into v_live, v_system from public.loyalty_cards where business_id = v_biz;
  return jsonb_build_object('ok', true, 'live', v_live, 'system', v_system, 'items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'version', v.version, 'system', v.system, 'terms', v.terms,
      'stamps_required', v.stamps_required, 'reward_name', v.reward_name,
      'levels', v.levels, 'valid_days', v.valid_days, 'created_at', v.created_at,
      'by', coalesce((select case when p.role = 'admin' then 'Pointili' else coalesce(p.full_name, '') end
                      from public.profiles p where p.id = v.created_by), ''),
      'by_admin', coalesce((select p.role = 'admin' from public.profiles p where p.id = v.created_by), false),
      'until', (select n.created_at from public.card_versions n where n.business_id = v_biz and n.version > v.version order by n.version limit 1),
      -- customers still finishing a card they started under this version
      'running', case when v.system = 'points' then 0 else (select count(*) from public.customers c
                  where c.business_id = v_biz and c.stamps_balance > 0 and c.card_started_at >= v.created_at
                    and c.card_started_at < coalesce((select n.created_at from public.card_versions n
                                                      where n.business_id = v_biz and n.version > v.version order by n.version limit 1), 'infinity')) end
    ) order by v.version desc)
    from public.card_versions v where v.business_id = v_biz
  ), '[]'::jsonb));
end $$;

create or replace function public.restore_card_version(p_version int, p_expected_version int default null,
                                                       p_reward_for_all boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v public.card_versions%rowtype; k public.loyalty_cards%rowtype; v_desc text;
begin
  select * into v from public.card_versions where business_id = v_biz and version = p_version;
  if v.id is null then return public.err('not_found'); end if;
  select * into k from public.loyalty_cards where business_id = v_biz;
  if v.system <> k.system then return public.err('other_system'); end if;
  -- a restore is a new version like any other save: same checks, same promises
  if v.system = 'points' then
    return public.save_points_card(k.name, (v.terms ->> 'dinars_per_point')::numeric, (v.terms ->> 'points_expire')::boolean,
                                   v.terms -> 'catalog', p_expected_version);
  end if;
  select description into v_desc from public.rewards where loyalty_card_id = k.id and is_primary;
  return public.save_loyalty_card(k.name, k.description, v.stamps_required, v.reward_name, v_desc, k.color, k.icon,
                                  k.cooldown_minutes, v.valid_days, v.levels, p_expected_version, coalesce(p_reward_for_all, false));
end $$;

-- a stamps save never lands on a points card
create or replace function public.save_loyalty_card(
  p_name text, p_description text, p_stamps_required int, p_reward_name text, p_reward_description text,
  p_color text, p_icon text, p_cooldown_minutes int, p_valid_days int default 0, p_levels jsonb default null,
  p_expected_version int default null, p_reward_for_all boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(true);
  v_card uuid; v_created boolean := false; v_was int; v_version int;
  v_level jsonb; v_keep uuid[] := '{}'; v_new uuid[] := '{}'; v_id uuid; v_lname text; v_lstamps int;
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 then return public.err('invalid_name'); end if;
  if p_stamps_required is null or p_stamps_required not between 2 and 30 then return public.err('invalid_stamps'); end if;
  if char_length(trim(coalesce(p_reward_name, ''))) < 2 then return public.err('invalid_reward'); end if;
  if p_color not in ('indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'orange', 'slate') then p_color := 'indigo'; end if;
  if p_icon not in ('coffee', 'pizza', 'burger', 'cake', 'croissant', 'scissors', 'sparkles', 'ice-cream', 'shopping-bag', 'heart', 'star', 'utensils') then p_icon := 'coffee'; end if;
  p_cooldown_minutes := least(greatest(coalesce(p_cooldown_minutes, 60), 0), 10080);
  p_valid_days := least(greatest(coalesce(p_valid_days, 0), 0), 365);

  if p_levels is not null then
    if jsonb_typeof(p_levels) <> 'array' or jsonb_array_length(p_levels) > 4 then return public.err('invalid_levels'); end if;
    if exists (select 1 from jsonb_array_elements(p_levels) e
               where char_length(trim(coalesce(e ->> 'name', ''))) not between 2 and 60
                  or coalesce((e ->> 'stamps')::int, 0) not between 1 and p_stamps_required - 1) then
      return public.err('invalid_levels');
    end if;
    if (select count(distinct (e ->> 'stamps')::int) from jsonb_array_elements(p_levels) e) <> jsonb_array_length(p_levels) then
      return public.err('invalid_levels');
    end if;
  end if;

  select id, valid_days, version into v_card, v_was, v_version from public.loyalty_cards where business_id = v_biz for update;
  -- a points card changes through save_points_card (or the switch), never here
  if v_card is not null and public.is_points_shop(v_biz) then return public.err('other_system'); end if;
  -- somebody saved since this screen was opened (the owner and the founder at once)
  if v_card is not null and p_expected_version is not null and p_expected_version <> v_version then
    return public.err('card_changed', jsonb_build_object('version', v_version));
  end if;

  if v_card is null then
    insert into public.loyalty_cards (business_id, name, description, stamps_required, color, icon, cooldown_minutes, valid_days)
    values (v_biz, trim(p_name), nullif(trim(p_description), ''), p_stamps_required, p_color, p_icon, p_cooldown_minutes, p_valid_days)
    returning id, version into v_card, v_version;
    v_created := true;
  else
    -- running cards keep the best they have been offered so far, taken from before this change:
    -- the lowest goal they have seen and every level where it stands for them today. Only
    -- that way does 10 → 6 → 10 leave a gift that turned ready at 6 where it is.
    update public.customers c
    set card_target = least(coalesce(c.card_target, k.stamps_required), k.stamps_required),
        card_reward = coalesce(c.card_reward, (select r.name from public.rewards r where r.loyalty_card_id = v_card and r.is_primary)),
        card_levels = (select coalesce(jsonb_agg(jsonb_build_object('id', o.id, 'stamps', o.cost, 'name', o.name) order by o.cost), '[]'::jsonb)
                       from public.card_offer(c.id) o where o.is_level),
        card_started_at = coalesce(c.card_started_at, c.last_stamp_at, now())
    from public.loyalty_cards k
    where k.id = v_card and c.business_id = v_biz and c.stamps_balance > 0;

    -- a longer life reaches running cards; a shorter one waits for new cards
    if p_valid_days = 0 and v_was > 0 then
      update public.customers c set card_expires_at = null where c.business_id = v_biz and c.stamps_balance > 0;
    elsif p_valid_days > v_was and v_was > 0 then
      update public.customers c set card_expires_at = c.card_expires_at + make_interval(days => p_valid_days - v_was)
      where c.business_id = v_biz and c.stamps_balance > 0 and c.card_expires_at is not null;
    end if;

    update public.loyalty_cards
    set name = trim(p_name), description = nullif(trim(p_description), ''), stamps_required = p_stamps_required,
        color = p_color, icon = p_icon, cooldown_minutes = p_cooldown_minutes, valid_days = p_valid_days, active = true,
        version = version + 1
    where id = v_card
    returning version into v_version;
  end if;

  update public.rewards
  set name = trim(p_reward_name), description = nullif(trim(p_reward_description), ''), stamps_required = p_stamps_required, active = true
  where loyalty_card_id = v_card and is_primary;
  if not found then
    insert into public.rewards (loyalty_card_id, business_id, name, description, stamps_required, is_primary)
    values (v_card, v_biz, trim(p_reward_name), nullif(trim(p_reward_description), ''), p_stamps_required, true);
  end if;
  -- «للكل»: running cards take the new main gift too
  if p_reward_for_all then
    update public.customers c set card_reward = null where c.business_id = v_biz and c.stamps_balance > 0;
  end if;

  if p_levels is not null then
    for v_level in select * from jsonb_array_elements(p_levels) loop
      v_lname := trim(v_level ->> 'name');
      v_lstamps := (v_level ->> 'stamps')::int;
      v_id := null;
      if coalesce(v_level ->> 'id', '') ~ '^[0-9a-f-]{36}$' then
        update public.rewards set name = v_lname, stamps_required = v_lstamps, active = true
        where id = (v_level ->> 'id')::uuid and loyalty_card_id = v_card and not is_primary
        returning id into v_id;
      end if;
      if v_id is null then
        insert into public.rewards (loyalty_card_id, business_id, name, stamps_required, is_primary)
        values (v_card, v_biz, v_lname, v_lstamps, false)
        returning id into v_id;
        v_new := v_new || v_id;
        -- whoever has already passed a new level gets it with the next card
        update public.customers c set levels_skipped = array_append(c.levels_skipped, v_id)
        where c.business_id = v_biz and c.stamps_balance >= v_lstamps;
      end if;
      v_keep := v_keep || v_id;
    end loop;
    update public.rewards set active = false
    where loyalty_card_id = v_card and not is_primary and active and not (id = any(v_keep));
  end if;

  insert into public.card_versions (business_id, version, stamps_required, reward_name, levels, valid_days, created_by)
  values (v_biz, v_version, p_stamps_required, trim(p_reward_name), public.live_levels(v_card), p_valid_days, auth.uid())
  on conflict (business_id, version) do update
    set stamps_required = excluded.stamps_required, reward_name = excluded.reward_name, levels = excluded.levels,
        valid_days = excluded.valid_days, created_by = excluded.created_by, created_at = now();

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), case when v_created then 'card_created' else 'card_updated' end,
          jsonb_build_object('stamps_required', p_stamps_required, 'reward', trim(p_reward_name), 'valid_days', p_valid_days,
                             'levels', coalesce(jsonb_array_length(p_levels), 0), 'version', v_version));

  return jsonb_build_object('ok', true, 'card_id', v_card, 'created', v_created, 'version', v_version);
end $$;


-- ═══ the counter QR and the founder's view know the system too ═════════════
create or replace function public.join_card_preview(p_code text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare b public.businesses%rowtype; k public.loyalty_cards%rowtype;
begin
  if p_code is null or p_code !~ '^[A-Za-z0-9_-]{8,32}$' then return public.err('invalid'); end if;
  select * into b from public.businesses where join_code = p_code;
  if b.id is null then return public.err('invalid'); end if;
  if b.status <> 'active' then return public.err('business_unavailable'); end if;
  select * into k from public.loyalty_cards where business_id = b.id;
  if k.id is null or not k.active then
    return public.err('card_inactive', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;
  return jsonb_build_object(
    'ok', true,
    'open', public.business_is_open(b.id),
    'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url,
                                   'category', b.category, 'address', b.address),
    'card', jsonb_build_object('name', k.name, 'description', k.description, 'stamps_required', k.stamps_required,
                               'color', k.color, 'icon', k.icon, 'design', k.design,
                               'system', k.system, 'dinars_per_point', k.dinars_per_point),
    'reward', case when k.system = 'points'
                   then (select jsonb_build_object('name', o.name, 'points', o.cost) from public.point_catalog(b.id) o order by o.cost limit 1)
                   else (select jsonb_build_object('name', r.name, 'description', r.description)
                         from public.rewards r where r.loyalty_card_id = k.id and r.is_primary) end,
    'catalog', case when k.system = 'points'
                    then (select coalesce(jsonb_agg(jsonb_build_object('name', o.name, 'points', o.cost) order by o.cost), '[]'::jsonb)
                          from public.point_catalog(b.id) o) end
  );
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
                                         'cooldown_minutes', k.cooldown_minutes, 'system', k.system,
                                         'dinars_per_point', k.dinars_per_point, 'points_expire', k.points_expire)
               from public.loyalty_cards k where k.business_id = b.id),
      'rewards', (select coalesce(jsonb_agg(jsonb_build_object('name', r.name, 'stamps_required', r.stamps_required, 'active', r.active)), '[]'::jsonb)
                  from public.rewards r where r.business_id = b.id),
      'catalog', (select coalesce(jsonb_agg(jsonb_build_object('name', o.name, 'points', o.cost) order by o.cost), '[]'::jsonb)
                  from public.point_catalog(b.id) o),
      'stats', jsonb_build_object(
        'customers', (select count(*) from public.customers where business_id = b.id),
        'stamps', (select count(*) from public.stamps where business_id = b.id)
                  + (select count(*) from public.points_ledger where business_id = b.id and reason = 'purchase'),
        'stamps_today', (select count(*) from public.stamps where business_id = b.id and created_at >= public.tunis_today_start())
                        + (select count(*) from public.points_ledger where business_id = b.id and reason = 'purchase'
                           and created_at >= public.tunis_today_start()),
        'points', (select coalesce(sum(delta), 0) from public.points_ledger where business_id = b.id and reason = 'purchase'),
        'redemptions', (select count(*) from public.reward_redemptions where business_id = b.id and status = 'redeemed'),
        'last_stamp_at', greatest((select max(created_at) from public.stamps where business_id = b.id),
                                  (select max(created_at) from public.points_ledger where business_id = b.id and reason = 'purchase'))),
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

-- ═══ who may call what ═════════════════════════════════════════════════════
revoke execute on function public.point_cost(int, int, timestamptz) from public, anon, authenticated;
revoke execute on function public.points_for(numeric, numeric) from public, anon, authenticated;
revoke execute on function public.point_catalog(uuid) from public, anon, authenticated;
revoke execute on function public.is_points_shop(uuid) from public, anon, authenticated;
revoke execute on function public.points_payload(uuid, int) from public, anon, authenticated;
revoke execute on function public.points_history(uuid, int) from public, anon, authenticated;
revoke execute on function public.request_points_redemption(uuid) from public, anon, authenticated;
revoke execute on function public.spend_points(uuid, int, uuid) from public, anon, authenticated;
revoke execute on function public.home_card(uuid) from public, anon, authenticated;
revoke execute on function public.customer_offers(uuid) from public, anon, authenticated;
grant execute on function public.mint_points_token(numeric, uuid) to authenticated;
grant execute on function public.void_qr_token(uuid) to authenticated;
grant execute on function public.save_points_card(text, numeric, boolean, jsonb, int) to authenticated;
grant execute on function public.preview_points_change(numeric, boolean, jsonb) to authenticated;
grant execute on function public.points_card() to authenticated;

do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
