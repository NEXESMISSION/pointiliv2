-- How long a card stays alive.
--
-- The owner says "this card is good for 30 days". The clock starts on the
-- customer's FIRST stamp of a card, not on the day they signed up, and the
-- customer sees the days left on the card itself. Miss the deadline and the
-- card goes back to zero — the next stamp starts a fresh one.
--
-- Nothing runs on a schedule: the deadline lives on the customer row, every
-- read reports the balance through live_balance(), and the next write clears
-- the dead card with expire_card(). A card nobody touches is simply zero the
-- moment it is looked at.

alter table public.loyalty_cards add column if not exists valid_days int not null default 0;
do $$ begin
  alter table public.loyalty_cards add constraint loyalty_cards_valid_days_ck check (valid_days between 0 and 365);
exception when duplicate_object then null; end $$;
comment on column public.loyalty_cards.valid_days is '0 = the card never expires';

alter table public.customers add column if not exists card_expires_at timestamptz;
comment on column public.customers.card_expires_at is 'when THIS card dies; null = no deadline';

-- 0004 created a new signature for update_business and never granted it; the
-- old one is gone now, so the settings form calls a function it may execute.
drop function if exists public.update_business(text, text, text, text);
grant execute on function public.update_business(text, text, text, text, text) to authenticated;

-- ═══ the two helpers every screen goes through ═════════════════════════════

-- What the card is worth right now: a card past its deadline is worth nothing,
-- whatever the column still says.
create or replace function public.live_balance(p_balance int, p_expires timestamptz) returns int
language sql stable set search_path = '' as $$
  select case when p_expires is not null and p_expires <= now() then 0 else coalesce(p_balance, 0) end
$$;

-- The deadline a card started today would get.
create or replace function public.card_window(p_valid_days int) returns timestamptz
language sql stable set search_path = '' as $$
  select case when coalesce(p_valid_days, 0) > 0 then now() + make_interval(days => p_valid_days) end
$$;

-- Clears a card whose time ran out, and says so in the shop's activity. Every
-- write that touches a balance calls this first, so nothing is ever spent or
-- added on top of a card that should have been zero.
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
  set stamps_balance = 0, card_target = null, card_expires_at = null
  where id = c.id
  returning * into c;
  return c;
end $$;

-- ═══ writes ════════════════════════════════════════════════════════════════

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

  -- a card whose time ran out goes back to zero before this stamp lands on it
  c := public.expire_card(c.id);

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
      last_stamp_at = now(),
      -- the deadline is set by the stamp that opens the card, and never moves after
      card_expires_at = case when v_old = 0 then public.card_window(k.valid_days) else card_expires_at end
  where id = c.id
  returning * into c;

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (b.id, v_uid, c.id, 'stamp', jsonb_build_object('balance', c.stamps_balance, 'code', c.code));

  return jsonb_build_object('ok', true, 'stamp_id', v_stamp) || public.card_payload(c.id, v_old);
end $$;

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
  if c.id is null then return public.err('not_enough_stamps'); end if;
  c := public.expire_card(c.id); -- an expired card cannot pay for anything
  v_cost := public.reward_cost(r.is_primary, r.stamps_required, c.card_target);
  if c.stamps_balance < v_cost then return public.err('not_enough_stamps'); end if;

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

create or replace function public.merchant_confirm_redemption(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  x public.reward_redemptions%rowtype;
  c public.customers%rowtype;
  v_primary boolean;
  v_days int;
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

  select coalesce(is_primary, false) into v_primary from public.rewards where id = x.reward_id;
  select valid_days into v_days from public.loyalty_cards where business_id = v_biz;

  -- Redeeming the main reward closes this card; the next one takes today's goal,
  -- and its clock starts over on whatever stamps were left.
  update public.customers
  set stamps_balance = stamps_balance - x.stamps_spent, rewards_redeemed = rewards_redeemed + 1,
      card_target = case when v_primary then null else card_target end,
      card_expires_at = case when not v_primary then card_expires_at
                             when stamps_balance - x.stamps_spent > 0 then public.card_window(v_days) end
  where id = c.id;
  update public.reward_redemptions
  set status = 'redeemed', redeemed_by = auth.uid(), redeemed_at = now()
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
  r public.rewards%rowtype;
  x public.reward_redemptions%rowtype;
  v_cost int;
  v_days int;
begin
  select * into c from public.customers where id = p_customer_id and business_id = v_biz for update;
  if c.id is null then return public.err('not_found'); end if;
  c := public.expire_card(c.id);
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

  select valid_days into v_days from public.loyalty_cards where business_id = v_biz;

  update public.customers
  set stamps_balance = stamps_balance - v_cost, rewards_redeemed = rewards_redeemed + 1,
      card_target = case when r.is_primary then null else card_target end,
      card_expires_at = case when not r.is_primary then card_expires_at
                             when stamps_balance - v_cost > 0 then public.card_window(v_days) end
  where id = c.id;

  insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
  values (v_biz, auth.uid(), c.id, 'reward_redeemed',
          jsonb_build_object('reward_name', r.name, 'stamps_spent', v_cost, 'code', c.code, 'redemption_id', x.id));

  return jsonb_build_object('ok', true, 'redemption', public.redemption_view(x));
end $$;

-- The owner sets the validity here, and the change is applied to the cards
-- people are already holding: switching it on gives everyone a full window from
-- today (nobody is wiped by a rule that did not exist yesterday), changing the
-- number shifts the deadlines by the difference, switching it off clears them.
drop function if exists public.save_loyalty_card(text, text, int, text, text, text, text, int);
create or replace function public.save_loyalty_card(
  p_name text, p_description text, p_stamps_required int, p_reward_name text, p_reward_description text,
  p_color text, p_icon text, p_cooldown_minutes int, p_valid_days int default 0) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); v_card uuid; v_created boolean := false; v_was int;
begin
  if char_length(trim(coalesce(p_name, ''))) < 2 then return public.err('invalid_name'); end if;
  if p_stamps_required is null or p_stamps_required not between 2 and 30 then return public.err('invalid_stamps'); end if;
  if char_length(trim(coalesce(p_reward_name, ''))) < 2 then return public.err('invalid_reward'); end if;
  if p_color not in ('indigo', 'emerald', 'amber', 'rose', 'sky', 'violet', 'orange', 'slate') then p_color := 'indigo'; end if;
  if p_icon not in ('coffee', 'pizza', 'burger', 'cake', 'croissant', 'scissors', 'sparkles', 'ice-cream', 'shopping-bag', 'heart', 'star', 'utensils') then p_icon := 'coffee'; end if;
  p_cooldown_minutes := least(greatest(coalesce(p_cooldown_minutes, 60), 0), 10080);
  p_valid_days := least(greatest(coalesce(p_valid_days, 0), 0), 365);

  select id, valid_days into v_card, v_was from public.loyalty_cards where business_id = v_biz;
  if v_card is null then
    insert into public.loyalty_cards (business_id, name, description, stamps_required, color, icon, cooldown_minutes, valid_days)
    values (v_biz, trim(p_name), nullif(trim(p_description), ''), p_stamps_required, p_color, p_icon, p_cooldown_minutes, p_valid_days)
    returning id into v_card;
    v_created := true;
  else
    -- Customers mid-card keep the goal they started with (see reward_cost).
    update public.customers c
    set card_target = (select stamps_required from public.loyalty_cards where id = v_card)
    where c.business_id = v_biz and c.card_target is null and c.stamps_balance > 0;

    if p_valid_days <> v_was then
      update public.customers c
      set card_expires_at = case
            when p_valid_days = 0 then null
            when c.card_expires_at is null then public.card_window(p_valid_days)
            else c.card_expires_at + make_interval(days => p_valid_days - v_was) end
      where c.business_id = v_biz and c.stamps_balance > 0;
    end if;

    update public.loyalty_cards
    set name = trim(p_name), description = nullif(trim(p_description), ''), stamps_required = p_stamps_required,
        color = p_color, icon = p_icon, cooldown_minutes = p_cooldown_minutes, valid_days = p_valid_days, active = true
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
          jsonb_build_object('stamps_required', p_stamps_required, 'reward', trim(p_reward_name), 'valid_days', p_valid_days));

  return jsonb_build_object('ok', true, 'card_id', v_card, 'created', v_created);
end $$;

grant execute on function public.save_loyalty_card(text, text, int, text, text, text, text, int, int) to authenticated;

-- ═══ reads: every balance goes through live_balance ════════════════════════

create or replace function public.card_payload(p_customer_id uuid, p_old_balance int default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c record; b record; k record; v_rewards jsonb; v_next jsonb; v_new jsonb; v_bal int;
begin
  select * into c from public.customers where id = p_customer_id;
  if c.id is null then return null; end if;
  select * into b from public.businesses where id = c.business_id;
  select * into k from public.loyalty_cards where business_id = c.business_id;
  v_bal := public.live_balance(c.stamps_balance, c.card_expires_at);

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'name', r.name, 'description', r.description,
           'stamps_required', public.reward_cost(r.is_primary, r.stamps_required, c.card_target), 'is_primary', r.is_primary,
           'unlocked', v_bal >= public.reward_cost(r.is_primary, r.stamps_required, c.card_target),
           'pending', (select jsonb_build_object('id', x.id, 'code', x.code, 'expires_at', x.expires_at)
                       from public.reward_redemptions x
                       where x.customer_id = c.id and x.reward_id = r.id and x.status = 'pending' and x.expires_at > now()
                       limit 1)
         ) order by r.stamps_required, r.created_at), '[]'::jsonb)
  into v_rewards
  from public.rewards r where r.business_id = c.business_id and r.active;

  select jsonb_build_object('id', r.id, 'name', r.name, 'stamps_required', x.cost, 'remaining', x.cost - v_bal)
  into v_next
  from public.rewards r
  cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
  where r.business_id = c.business_id and r.active and x.cost > v_bal
  order by x.cost, r.created_at limit 1;

  v_new := '[]'::jsonb;
  if p_old_balance is not null then
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)), '[]'::jsonb) into v_new
    from public.rewards r
    cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
    where r.business_id = c.business_id and r.active
      and x.cost > p_old_balance and x.cost <= v_bal;
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
      'stamps_required', public.reward_cost(true, k.stamps_required, c.card_target),
      'card_stamps_required', k.stamps_required,
      'design', k.design, 'valid_days', k.valid_days,
      'color', k.color, 'icon', k.icon, 'cooldown_minutes', k.cooldown_minutes, 'active', k.active) end,
    'rewards', v_rewards,
    'next_reward', v_next,
    'newly_unlocked', v_new
  );
end $$;

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
          'card', jsonb_build_object('name', k.name, 'stamps_required', public.reward_cost(true, coalesce(k.stamps_required, 10), c.card_target),
                                     'color', coalesce(k.color, 'indigo'), 'icon', coalesce(k.icon, 'coffee'),
                                     'description', k.description, 'design', coalesce(k.design, '{}'::jsonb)),
          'next_reward', (select jsonb_build_object('name', r.name, 'stamps_required', x.cost, 'remaining', x.cost - v.bal)
                          from public.rewards r
                          cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
                          where r.business_id = c.business_id and r.active and x.cost > v.bal
                          order by x.cost limit 1),
          'unlocked', coalesce((select jsonb_agg(r.name order by r.stamps_required) from public.rewards r
                                where r.business_id = c.business_id and r.active
                                  and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= v.bal), '[]'::jsonb),
          'primary_reward', (select r.name from public.rewards r where r.business_id = c.business_id and r.is_primary)
        ) as item
        from public.customers c
        cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
        join public.businesses b on b.id = c.business_id
        left join public.loyalty_cards k on k.business_id = c.business_id
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
        'reward_id', r.id, 'name', r.name, 'description', r.description,
        'stamps_required', public.reward_cost(r.is_primary, r.stamps_required, c.card_target),
        'customer_id', c.id, 'balance', v.bal,
        'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
        'card', jsonb_build_object('color', k.color, 'icon', k.icon)
      ) order by c.last_stamp_at desc, r.stamps_required)
      from public.customers c
      cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
      join public.rewards r on r.business_id = c.business_id and r.active
        and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= v.bal
      join public.businesses b on b.id = c.business_id
      left join public.loyalty_cards k on k.business_id = c.business_id
      where c.user_id = v_uid
    ), '[]'::jsonb),
    'upcoming', coalesce((
      select jsonb_agg(u.item order by u.remaining) from (
        select distinct on (c.id) (x.cost - v.bal) as remaining, jsonb_build_object(
          'reward_id', r.id, 'name', r.name, 'stamps_required', x.cost,
          'customer_id', c.id, 'balance', v.bal, 'remaining', x.cost - v.bal,
          'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url, 'category', b.category),
          'card', jsonb_build_object('color', k.color, 'icon', k.icon)
        ) as item
        from public.customers c
        cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
        join public.rewards r on r.business_id = c.business_id and r.active
        cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
        join public.businesses b on b.id = c.business_id
        left join public.loyalty_cards k on k.business_id = c.business_id
        where c.user_id = v_uid and x.cost > v.bal
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
                 case when p_sort = 'stamps' then v.bal end desc nulls last,
                 case when p_sort = 'rewards' then c.rewards_redeemed end desc nulls last,
                 c.last_stamp_at desc nulls last, c.created_at desc) as rn,
               jsonb_build_object(
                 'id', c.id, 'code', c.code, 'name', p.full_name, 'phone_masked', public.mask_phone(p.phone),
                 'balance', v.bal, 'total_stamps', c.total_stamps, 'rewards_redeemed', c.rewards_redeemed,
                 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at,
                 'target', public.reward_cost(true, coalesce((select stamps_required from public.loyalty_cards where business_id = v_biz), 10), c.card_target),
                 'reward_ready', exists (select 1 from public.rewards r where r.business_id = v_biz and r.active
                                         and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= v.bal)) as item
        from public.customers c
        cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) v
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
    'rewards_earned', c.rewards_redeemed + (select count(*) from public.rewards r where r.business_id = v_biz and r.active
                                              and public.reward_cost(r.is_primary, r.stamps_required, c.card_target) <= v_bal),
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
