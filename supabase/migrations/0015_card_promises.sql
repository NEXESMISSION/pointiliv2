-- ═══ when a shop changes its card (board 8): a promise is a promise ═════════
-- A customer's card keeps what it was promised when its first stamp landed:
-- the main gift's name and the levels on the way. The owner's changes reach
-- that card only where they are better for the customer:
--   · a lower goal applies at once (card_target, since 0001);
--   · a level moved earlier applies at once; moved later, it stays where it was;
--   · a level taken off stays on the cards that were promised it;
--   · a level added counts for whoever has not passed it yet — the ones who
--     have get it on their next card (levels_skipped);
--   · a new main gift reaches running cards only if the owner says «للكل»;
--   · a longer life for cards reaches running cards; a shorter one only new cards.
-- public.card_offer() is the one place that says what a customer's card offers
-- today; every read below goes through it. Every save is a numbered version
-- (card_versions), a stale save is refused (card_changed), any version can come
-- back, and a suspended shop's card clocks stop while it is suspended.

alter table public.customers add column if not exists card_reward text;
alter table public.customers add column if not exists card_levels jsonb;
alter table public.customers add column if not exists levels_skipped uuid[] not null default '{}';
alter table public.customers add column if not exists card_started_at timestamptz;
comment on column public.customers.card_reward is 'the main gift this card was promised (null: today''s)';
comment on column public.customers.card_levels is 'the levels this card was promised: [{id, stamps, name}] (null: today''s)';
comment on column public.customers.levels_skipped is 'levels added after this card had passed them: they come with the next card';

alter table public.loyalty_cards add column if not exists version int not null default 1;
alter table public.businesses add column if not exists suspended_at timestamptz;

create table if not exists public.card_versions (
  id              uuid primary key default gen_random_uuid(),
  business_id     uuid not null references public.businesses (id) on delete cascade,
  version         int  not null,
  stamps_required int  not null,
  reward_name     text not null,
  levels          jsonb not null default '[]'::jsonb,
  valid_days      int  not null default 0,
  created_by      uuid references public.profiles (id) on delete set null,
  created_at      timestamptz not null default now(),
  unique (business_id, version)
);
alter table public.card_versions enable row level security;
alter table public.card_versions force row level security;
revoke all on public.card_versions from public, anon, authenticated;

-- today's levels of a card, as a promise: [{id, stamps, name}]
create or replace function public.live_levels(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'stamps', r.stamps_required, 'name', r.name) order by r.stamps_required), '[]'::jsonb)
  from public.rewards r join public.loyalty_cards k on k.id = r.loyalty_card_id
  where r.loyalty_card_id = p_card and r.active and not r.is_primary and r.stamps_required < k.stamps_required
$$;

-- every card that already exists is version 1 of itself
insert into public.card_versions (business_id, version, stamps_required, reward_name, levels, valid_days, created_at)
select k.business_id, k.version, k.stamps_required,
       coalesce((select r.name from public.rewards r where r.loyalty_card_id = k.id and r.is_primary), k.name),
       public.live_levels(k.id), k.valid_days, k.updated_at
from public.loyalty_cards k
where not exists (select 1 from public.card_versions v where v.business_id = k.business_id);

-- cards already running are promised what they offer today
update public.customers c
set card_reward = coalesce(c.card_reward, (select r.name from public.rewards r where r.business_id = c.business_id and r.is_primary)),
    card_levels = coalesce(c.card_levels, (select public.live_levels(k.id) from public.loyalty_cards k where k.business_id = c.business_id)),
    card_started_at = coalesce(c.card_started_at, c.last_stamp_at, c.first_stamp_at, now())
where c.stamps_balance > 0 and c.card_levels is null;

-- ═══ what a customer's card offers today ═══════════════════════════════════
create or replace function public.card_offer(p_customer uuid)
returns table (id uuid, name text, description text, cost int, is_primary boolean, is_level boolean, taken boolean, sort_at timestamptz)
language plpgsql stable security definer set search_path = '' as $$
declare c public.customers%rowtype; v_card uuid; v_req int; v_goal int;
begin
  select * into c from public.customers x where x.id = p_customer;
  if c.id is null then return; end if;
  select k.id, k.stamps_required into v_card, v_req from public.loyalty_cards k where k.business_id = c.business_id;
  v_goal := public.reward_cost(true, coalesce(v_req, 10), c.card_target);

  -- the main gift, under the name this card was promised
  return query
    select r.id, coalesce(c.card_reward, r.name), r.description, v_goal, true, false, false, r.created_at
    from public.rewards r where r.business_id = c.business_id and r.is_primary;

  -- the levels this card was promised: where they were, or earlier if moved earlier since
  return query
    select q.lid, q.lname, null::text, q.lcost, false, true, q.lid = any(c.levels_claimed), q.lat
    from (
      select (e ->> 'id')::uuid as lid, e ->> 'name' as lname,
             least((e ->> 'stamps')::int,
                   coalesce(case when r.active and not r.is_primary then r.stamps_required end, (e ->> 'stamps')::int)) as lcost,
             coalesce(r.created_at, now()) as lat
      from jsonb_array_elements(coalesce(c.card_levels, '[]'::jsonb)) e
      left join public.rewards r on r.id = (e ->> 'id')::uuid
    ) q
    where q.lcost >= 1 and q.lcost < v_goal;

  -- today's levels this card was not promised: for whoever had not passed them
  return query
    select r.id, r.name, r.description, r.stamps_required, false, true, r.id = any(c.levels_claimed), r.created_at
    from public.rewards r
    where r.business_id = c.business_id and r.active and not r.is_primary and r.stamps_required < v_goal
      and not (r.id = any(c.levels_skipped))
      and not exists (select 1 from jsonb_array_elements(coalesce(c.card_levels, '[]'::jsonb)) e where (e ->> 'id')::uuid = r.id);

  -- gifts that cost stamps beyond the goal (shops from before levels): as they are
  return query
    select r.id, r.name, r.description, r.stamps_required, false, false, false, r.created_at
    from public.rewards r
    where r.business_id = c.business_id and r.active and not r.is_primary and r.stamps_required >= v_goal;
end $$;

-- a new card's promise: today's gift and levels
create or replace function public.promise_card(p_customer uuid) returns void
language sql security definer set search_path = '' as $$
  update public.customers c
  set card_reward = (select r.name from public.rewards r where r.business_id = c.business_id and r.is_primary),
      card_levels = (select public.live_levels(k.id) from public.loyalty_cards k where k.business_id = c.business_id),
      levels_skipped = '{}',
      card_started_at = now()
  where c.id = p_customer
$$;

-- ═══ a dead card forgets its promise too ═══════════════════════════════════
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
  update public.customers
  set stamps_balance = 0, card_target = null, card_expires_at = null, levels_claimed = '{}',
      card_reward = null, card_levels = null, levels_skipped = '{}', card_started_at = null
  where id = c.id
  returning * into c;
  return c;
end $$;

-- ═══ a stamp: the first one of a card fixes its promise ════════════════════
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

-- ═══ what a gift does to the card ══════════════════════════════════════════
create or replace function public.apply_reward(p_customer uuid, p_reward uuid, p_spent int) returns void
language plpgsql security definer set search_path = '' as $$
declare v_primary boolean; v_days int; v_biz uuid; v_left int;
begin
  select coalesce(r.is_primary, false), r.business_id into v_primary, v_biz from public.rewards r where r.id = p_reward;
  select valid_days into v_days from public.loyalty_cards where business_id = v_biz;
  if p_spent = 0 then
    update public.customers
    set rewards_redeemed = rewards_redeemed + 1,
        levels_claimed = array_append(array_remove(levels_claimed, p_reward), p_reward)
    where id = p_customer;
    return;
  end if;
  -- the goal closes this card; what is left over opens the next one on today's terms
  update public.customers
  set stamps_balance = stamps_balance - p_spent, rewards_redeemed = rewards_redeemed + 1,
      card_target = case when v_primary then null else card_target end,
      levels_claimed = case when v_primary then '{}' else levels_claimed end,
      card_reward = case when v_primary then null else card_reward end,
      card_levels = case when v_primary then null else card_levels end,
      levels_skipped = case when v_primary then '{}' else levels_skipped end,
      card_started_at = case when v_primary then null else card_started_at end,
      card_expires_at = case when not v_primary then card_expires_at
                             when stamps_balance - p_spent > 0 then public.card_window(v_days) end
  where id = p_customer
  returning stamps_balance into v_left;
  if v_primary and v_left > 0 then
    update public.customers c set card_target = (select k.stamps_required from public.loyalty_cards k where k.business_id = c.business_id)
    where c.id = p_customer;
    perform public.promise_card(p_customer);
  end if;
end $$;

-- ═══ asking for a gift, giving it: the promise decides ═════════════════════
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
  if v_biz is null then return public.err('reward_not_found'); end if;
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

-- ═══ reads: every screen asks card_offer() ═════════════════════════════════
create or replace function public.card_payload(p_customer_id uuid, p_old_balance int default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c record; b record; k record; v_rewards jsonb; v_next jsonb; v_new jsonb; v_bal int; v_goal int;
begin
  select * into c from public.customers where id = p_customer_id;
  if c.id is null then return null; end if;
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
    'customer', jsonb_build_object(
      'id', c.id, 'code', c.code, 'balance', v_bal, 'total_stamps', c.total_stamps,
      'rewards_redeemed', c.rewards_redeemed, 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at,
      'expires_at', case when v_bal > 0 then c.card_expires_at end),
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category,
      'address', b.address, 'instagram', b.instagram, 'status', b.status),
    'card', case when k.id is null then null else jsonb_build_object(
      'id', k.id, 'name', k.name, 'description', k.description,
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
        select coalesce(c.last_stamp_at, c.created_at) as sort_at, jsonb_build_object(
          'customer_id', c.id, 'code', c.code, 'balance', v.bal,
          'total_stamps', c.total_stamps, 'last_stamp_at', c.last_stamp_at,
          'expires_at', case when v.bal > 0 then c.card_expires_at end,
          'business', jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category),
          'card', jsonb_build_object('name', k.name, 'stamps_required', g.goal,
                                     'color', coalesce(k.color, 'indigo'), 'icon', coalesce(k.icon, 'coffee'),
                                     'description', k.description, 'design', coalesce(k.design, '{}'::jsonb),
                                     'levels', coalesce((select jsonb_agg(o.cost order by o.cost) from public.card_offer(c.id) o where o.is_level), '[]'::jsonb)),
          'next_reward', (select jsonb_build_object('name', o.name, 'stamps_required', o.cost, 'remaining', o.cost - v.bal)
                          from public.card_offer(c.id) o where o.cost > v.bal and not o.taken order by o.cost limit 1),
          'unlocked', coalesce((select jsonb_agg(o.name order by o.cost) from public.card_offer(c.id) o
                                where o.cost <= v.bal and not o.taken), '[]'::jsonb),
          'primary_reward', (select o.name from public.card_offer(c.id) o where o.is_primary limit 1)
        ) as item
        from public.customers c
        cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
        join public.businesses b on b.id = c.business_id
        left join public.loyalty_cards k on k.business_id = c.business_id
        cross join lateral (select public.reward_cost(true, coalesce(k.stamps_required, 10), c.card_target) as goal) g
        where c.user_id = v_uid
      ) s
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
        'reward_id', o.id, 'name', o.name, 'description', o.description,
        'stamps_required', o.cost, 'level', o.is_level,
        'customer_id', c.id, 'balance', v.bal,
        'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
        'card', jsonb_build_object('color', k.color, 'icon', k.icon)
      ) order by c.last_stamp_at desc, o.cost)
      from public.customers c
      cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
      join public.businesses b on b.id = c.business_id
      left join public.loyalty_cards k on k.business_id = c.business_id
      cross join lateral public.card_offer(c.id) o
      where c.user_id = v_uid and o.cost <= v.bal and not o.taken
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(u.item order by u.remaining) from (
        select distinct on (c.id) (o.cost - v.bal) as remaining, jsonb_build_object(
          'reward_id', o.id, 'name', o.name, 'stamps_required', o.cost,
          'customer_id', c.id, 'balance', v.bal, 'remaining', o.cost - v.bal,
          'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
          'card', jsonb_build_object('color', k.color, 'icon', k.icon)
        ) as item
        from public.customers c
        cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
        cross join lateral public.card_offer(c.id) o
        join public.businesses b on b.id = c.business_id
        left join public.loyalty_cards k on k.business_id = c.business_id
        where c.user_id = v_uid and o.cost > v.bal and not o.taken
        order by c.id, o.cost
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

create or replace function public.merchant_customers(p_search text default null, p_sort text default 'recent',
                                                     p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_digits text;
  v_like text;
  v_req int;
begin
  v_digits := regexp_replace(coalesce(v_q, ''), '\D', '', 'g');
  v_like := '%' || replace(replace(coalesce(v_q, ''), '%', ''), '_', '') || '%';
  select stamps_required into v_req from public.loyalty_cards where business_id = v_biz;
  return jsonb_build_object(
    'stamps_required', v_req,
    'total', (select count(*) from public.customers where business_id = v_biz),
    'items', coalesce((
      select jsonb_agg(item order by rn) from (
        select row_number() over (order by
                 case when p_sort = 'active' then c.total_stamps end desc nulls last,
                 case when p_sort = 'stamps' then v.bal end desc nulls last,
                 case when p_sort = 'rewards' then c.rewards_redeemed end desc nulls last,
                 c.last_stamp_at desc nulls last, c.created_at desc) as rn,
               jsonb_build_object(
                 'id', c.id, 'code', c.code, 'name', p.full_name, 'phone_masked', public.mask_phone(p.phone),
                 'balance', v.bal, 'total_stamps', c.total_stamps, 'rewards_redeemed', c.rewards_redeemed,
                 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at,
                 'target', g.goal,
                 'reward_ready', exists (select 1 from public.card_offer(c.id) o where o.cost <= v.bal and not o.taken)) as item
        from public.customers c
        cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
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

-- ═══ the owner saves the card: a new version, promises kept ════════════════
drop function if exists public.save_loyalty_card(text, text, int, text, text, text, text, int, int, jsonb);
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

-- ═══ before saving: what the change does to the customers, in numbers ══════
create or replace function public.preview_card_change(p_stamps_required int, p_reward_name text, p_valid_days int default 0,
                                                      p_levels jsonb default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(true);
  k public.loyalty_cards%rowtype;
  v_reward text;
  v_running int; v_keep_goal int; v_unlock_now int; v_on_the_way int; v_ready int; v_level_next int := 0; v_level_now int := 0;
begin
  select * into k from public.loyalty_cards where business_id = v_biz;
  if k.id is null then return jsonb_build_object('ok', true, 'new_card', true); end if;
  select name into v_reward from public.rewards where loyalty_card_id = k.id and is_primary;

  with running as (
    select c.id, public.live_balance(c.stamps_balance, c.card_expires_at) as bal,
           public.reward_cost(true, k.stamps_required, c.card_target) as goal
    from public.customers c where c.business_id = v_biz
  )
  select count(*) filter (where bal > 0),
         count(*) filter (where bal > 0 and p_stamps_required > goal),
         count(*) filter (where bal > 0 and bal >= p_stamps_required and bal < goal),
         -- a lower goal: still on the way, but closer
         count(*) filter (where bal > 0 and bal < p_stamps_required and p_stamps_required < goal)
  into v_running, v_keep_goal, v_unlock_now, v_on_the_way
  from running;

  select count(distinct c.id) into v_ready
  from public.customers c cross join lateral public.card_offer(c.id) o
  where c.business_id = v_biz and o.cost <= public.live_balance(c.stamps_balance, c.card_expires_at) and not o.taken;

  if p_levels is not null and jsonb_typeof(p_levels) = 'array' then
    -- new levels: who has passed them waits for the next card; the others can reach them on this one
    select coalesce(sum((select count(*) from public.customers c where c.business_id = v_biz and c.stamps_balance > 0
                                              and c.stamps_balance >= (e ->> 'stamps')::int)), 0)
    into v_level_next
    from jsonb_array_elements(p_levels) e
    where coalesce(e ->> 'id', '') !~ '^[0-9a-f-]{36}$';
    -- levels moved earlier: who is already past the new point gets it now
    select coalesce(sum((select count(*) from public.customers c where c.business_id = v_biz and c.stamps_balance > 0
                                              and c.stamps_balance >= (e ->> 'stamps')::int
                                              and not (r.id = any(c.levels_claimed))
                                              and c.stamps_balance < r.stamps_required)), 0)
    into v_level_now
    from jsonb_array_elements(p_levels) e
    join public.rewards r on r.id = (case when coalesce(e ->> 'id', '') ~ '^[0-9a-f-]{36}$' then (e ->> 'id')::uuid end)
    where (e ->> 'stamps')::int < r.stamps_required;
  end if;

  return jsonb_build_object(
    'ok', true,
    'version', k.version,
    'goal_from', k.stamps_required, 'goal_to', p_stamps_required,
    'running', v_running,
    'keep_goal', v_keep_goal,
    'unlock_now', v_unlock_now,
    'on_the_way', v_on_the_way,
    'ready', v_ready,
    'reward_changed', trim(coalesce(p_reward_name, '')) <> coalesce(v_reward, ''),
    'reward_from', v_reward,
    'level_next_card', v_level_next,
    'level_now', v_level_now,
    'valid_shorter', p_valid_days > 0 and (k.valid_days = 0 or p_valid_days < k.valid_days)
  );
end $$;

-- ═══ the versions, and bringing one back ═══════════════════════════════════
create or replace function public.card_history() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v_live int;
begin
  select version into v_live from public.loyalty_cards where business_id = v_biz;
  return jsonb_build_object('ok', true, 'live', v_live, 'items', coalesce((
    select jsonb_agg(jsonb_build_object(
      'version', v.version, 'stamps_required', v.stamps_required, 'reward_name', v.reward_name,
      'levels', v.levels, 'valid_days', v.valid_days, 'created_at', v.created_at,
      'by', coalesce((select case when p.role = 'admin' then 'Pointili' else coalesce(p.full_name, '') end
                      from public.profiles p where p.id = v.created_by), ''),
      'by_admin', coalesce((select p.role = 'admin' from public.profiles p where p.id = v.created_by), false),
      'until', (select n.created_at from public.card_versions n where n.business_id = v_biz and n.version > v.version order by n.version limit 1),
      -- customers still finishing a card they started under this version
      'running', (select count(*) from public.customers c
                  where c.business_id = v_biz and c.stamps_balance > 0 and c.card_started_at >= v.created_at
                    and c.card_started_at < coalesce((select n.created_at from public.card_versions n
                                                      where n.business_id = v_biz and n.version > v.version order by n.version limit 1), 'infinity'))
    ) order by v.version desc)
    from public.card_versions v where v.business_id = v_biz
  ), '[]'::jsonb));
end $$;

-- (the first cut took no «للكل»: the restore goes through the same sheet as any save)
drop function if exists public.restore_card_version(int, int);
create or replace function public.restore_card_version(p_version int, p_expected_version int default null,
                                                       p_reward_for_all boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v public.card_versions%rowtype; k public.loyalty_cards%rowtype; v_desc text;
begin
  select * into v from public.card_versions where business_id = v_biz and version = p_version;
  if v.id is null then return public.err('not_found'); end if;
  select * into k from public.loyalty_cards where business_id = v_biz;
  select description into v_desc from public.rewards where loyalty_card_id = k.id and is_primary;
  -- a restore is a new version like any other save: same checks, same promises
  return public.save_loyalty_card(k.name, k.description, v.stamps_required, v.reward_name, v_desc, k.color, k.icon,
                                  k.cooldown_minutes, v.valid_days, v.levels, p_expected_version, coalesce(p_reward_for_all, false));
end $$;

-- ═══ a suspended shop's clocks stop, and start again where they were ═══════
create or replace function public.admin_set_business_status(p_id uuid, p_status text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_since timestamptz;
begin
  perform public.require_admin();
  if p_status not in ('active', 'suspended') then return public.err('invalid_status'); end if;
  select suspended_at into v_since from public.businesses where id = p_id;
  if not found then return public.err('not_found'); end if;
  if p_status = 'suspended' then
    update public.businesses set status = 'suspended', suspended_at = coalesce(suspended_at, now()) where id = p_id;
  else
    -- every running card and waiting gift gets back the days the shop was stopped
    if v_since is not null then
      update public.customers c set card_expires_at = c.card_expires_at + (now() - v_since)
      where c.business_id = p_id and c.card_expires_at is not null;
    end if;
    update public.businesses set status = 'active', suspended_at = null where id = p_id;
  end if;
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (p_id, auth.uid(), case when p_status = 'active' then 'business_activated' else 'business_suspended' end, '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the session carries the card's version: a screen saves against what it showed ═══
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

-- ═══ who may call what ═════════════════════════════════════════════════════
revoke execute on function public.card_offer(uuid) from public, anon, authenticated;
revoke execute on function public.promise_card(uuid) from public, anon, authenticated;
revoke execute on function public.live_levels(uuid) from public, anon, authenticated;
revoke execute on function public.apply_reward(uuid, uuid, int) from public, anon, authenticated;
grant execute on function public.save_loyalty_card(text, text, int, text, text, text, text, int, int, jsonb, int, boolean) to authenticated;
grant execute on function public.preview_card_change(int, text, int, jsonb) to authenticated;
grant execute on function public.card_history() to authenticated;
grant execute on function public.restore_card_version(int, int, boolean) to authenticated;

do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
