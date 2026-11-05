-- The card's clock, the customer removed, the owner's insights (2026-11-06) — apply once in the
-- Supabase SQL Editor (scripts/db.mjs needs SUPABASE_ACCESS_TOKEN, not set yet). Built from
-- v2/supabase/schema.sql. Safe for the live site: every shop's clock is off (reset_days null), and
-- with it off the changed functions answer exactly as before, with a few more keys.
begin;

-- ═══ the card's clock (6 Nov 2026) ═══════════════════════════════════════════
-- A shop may have its cards start over when a customer stays away (the founder: «the owner sets a
-- timer: if the customer does not get a tampon in like 7 days, the card is zeroed — so a half-full
-- card is not left hanging»). shops.reset_days: that many days with no tampon and the card goes back
-- to zero — null for every shop until its owner chooses it (the card's questions, or «المحل»). The
-- days count from the card's last tampon, or from the day the owner set the clock when that is later
-- (reset_since): a clock set today never wipes a card for the weeks before it. Only the tampons on
-- their way go: a gift already earned stays. Kept by scripts/db.mjs: no re-run ever changes them.
alter table public.shops add column if not exists reset_days int check (reset_days is null or reset_days between 3 and 365);
alter table public.shops add column if not exists reset_since timestamptz;
-- when a card last went back to zero by the clock (its customer is told once)
alter table public.cards add column if not exists reset_at timestamptz;

-- the moment a card goes back to zero: null when it never will (no clock on the shop, nothing on the card)
create or replace function public.reset_due(p_last timestamptz, p_stamps int, p_days int, p_since timestamptz) returns timestamptz
language sql immutable set search_path = '' as $$
  select case when p_days is not null and p_stamps > 0 and p_last is not null
              then greatest(p_last, coalesce(p_since, p_last)) + make_interval(days => p_days) end
$$;


-- the functions that now read the clock (unchanged otherwise)
create or replace function public.me() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); p public.people%rowtype; s public.shops%rowtype;
begin
  if v_uid is null then return null; end if;
  select * into p from public.people where id = v_uid;
  if p.id is null then
    insert into public.people (id, phone)
    select v_uid, nullif(u.raw_app_meta_data ->> 'phone', '') from auth.users u where u.id = v_uid
    on conflict (id) do nothing;
    select * into p from public.people where id = v_uid;
    -- the account is gone (deleted while this phone was still signed in): nobody
    if p.id is null then return null; end if;
  end if;
  select * into s from public.shops where owner_id = v_uid;
  return jsonb_build_object(
    'id', v_uid, 'name', p.name, 'phone', p.phone, 'admin', p.is_admin, 'seen', to_jsonb(p.seen), 'code', p.code, 'tester', p.is_tester,
    'password_set', p.password_set,
    'phone_check', public.phone_state(p),
    'shop', case when s.id is null then null else jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'goal', s.goal, 'gift', s.gift, 'color', s.color, 'paused', s.paused,
      'signal', s.signal, 'logo', s.logo, 'stamp_logo', s.stamp_logo, 'items_on', s.items_on, 'stamp_gap', s.stamp_gap, 'store_on', s.store_on, 'wheel_on', s.wheel_on, 'wheel_allowed', s.wheel_allowed,
      'reset_days', s.reset_days) end);
end $$;

create or replace function public.card_view(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    -- a card past its clock is at zero already, swept or not (the daily sweep and the next tampon write it)
    'id', c.id, 'stamps', case when r.due <= now() then 0 else c.stamps end, 'gifts', c.gifts, 'last_at', c.last_at,
    -- the card's clock: when it goes back to zero (null: never), and when it last did
    'reset_due', r.due, 'reset_at', c.reset_at,
    'ready', w.waiting, 'waiting', w.waiting,
    -- how many gifts wait on it (full cards not yet taken)
    'waiting_n', (select count(*) from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null),
    'shop', jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo, 'stamp_logo', s.stamp_logo,
                               -- a wheel shop: «الروليت», or the prize already fallen and waiting
                               'goal', coalesce(c.goal, s.goal),
                               'gift', case when s.wheel_on then coalesce((select m.gift from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null
                                                                             and m.wheel and m.spun_at is not null order by m.created_at, m.id limit 1), 'الروليت')
                                            else coalesce(c.gift, s.gift) end,
                               'store', s.store_on, 'wheel', s.wheel_on,
                               -- two things a customer could not know and met only as a refusal (18 Oct 2026):
                               -- how long between two tampons here, and whether this shop is stopped at all
                               'gap', s.stamp_gap, 'paused', s.paused, 'reset_days', s.reset_days),
    -- the gift waiting, by its own name (a wheel's prize once spun; the card's gift otherwise)
    'won', (select m.gift from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null order by m.created_at, m.id limit 1),
    -- all the gifts waiting, by name and how many of each, oldest first: two turns of the wheel rarely fall on the
    -- same prize, and a card changed between two full cards leaves two gifts (a wheel's turn not spun yet is not one)
    'won_list', (select coalesce(jsonb_agg(jsonb_build_object('gift', g.gift, 'n', g.n) order by g.first, g.first_id), '[]'::jsonb)
                 from (select coalesce(m.gift, c.gift, s.gift) as gift, count(*) as n, min(m.created_at) as first, min(m.id) as first_id
                       from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null and not (m.wheel and m.spun_at is null)
                       group by 1) g),
    -- a wheel shop: the turn waiting to be spun (its gift is the prize once spun), and how many turns wait («دورات»)
    'spin', (select m.id from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.wheel and m.spun_at is null and m.given_at is null
             order by m.created_at, m.id limit 1),
    'spins_n', (select count(*) from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.wheel and m.spun_at is null and m.given_at is null),
    -- a shop with a store: what this customer ordered and has not taken yet
    'orders_n', (select count(distinct o.batch) from public.orders o where o.card_id = c.id and o.status = 'waiting'),
    'next', case when s.goal is not null
                  and (coalesce(c.goal, s.goal) <> s.goal or not public.same_gift(coalesce(c.gift, s.gift), s.gift))
                 then jsonb_build_object('goal', s.goal, 'gift', s.gift) end)
  from public.cards c join public.shops s on s.id = c.shop_id
  cross join lateral (select public.waits(c.id) as waiting) w
  cross join lateral (select public.reset_due(c.last_at, c.stamps, s.reset_days, s.reset_since) as due) r
  where c.id = p_card
$$;

create or replace function public.shop_customers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'goal', s.goal, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', nullif(p.name, ''), 'phone', public.masked(p.phone),
                                        -- past the card's clock it is at zero already (the sweep writes it within a day)
                                        'stamps', case when public.reset_due(c.last_at, c.stamps, s.reset_days, s.reset_since) <= now() then 0 else c.stamps end,
                                        'gifts', c.gifts, 'last_at', c.last_at,
                                        'reset_due', public.reset_due(c.last_at, c.stamps, s.reset_days, s.reset_since),
                                        -- what this customer took last (a shop that says what it sells)
                                        'last_item', (select i.name from public.moments m join public.items i on i.id = m.item_id
                                                      where m.card_id = c.id and m.kind = 'stamp' order by m.created_at desc limit 1),
                                        -- everything this customer took, by thing, the most first
                                        'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'n', x.n) order by x.n desc, i.name)
                                                           from (select m.item_id, count(*) as n from public.moments m
                                                                 where m.card_id = c.id and m.kind = 'stamp' and m.item_id is not null group by m.item_id) x
                                                           join public.items i on i.id = x.item_id), '[]'::jsonb),
                                        'goal', coalesce(c.goal, s.goal), 'gift', coalesce(c.gift, s.gift), 'ready', public.waits(c.id),
                                        -- the gifts waiting on this card, so the owner can hand one over from the list
                                        -- itself, without the customer's code («spin»: a turn of the wheel nobody has
                                        -- spun yet — nothing to hand over until it has a prize on it)
                                        'waiting', coalesce((select jsonb_agg(jsonb_build_object('id', m.id, 'gift', coalesce(m.gift, c.gift, s.gift), 'spin', m.wheel and m.spun_at is null)
                                                             order by m.created_at, m.id)
                                                            from public.moments m
                                                            where m.card_id = c.id and m.kind = 'gift' and m.given_at is null), '[]'::jsonb))
                     order by c.last_at desc nulls last, c.created_at desc)
    from public.cards c left join public.people p on p.id = c.user_id
    where c.shop_id = s.id), '[]'::jsonb));
end $$;

create or replace function public.see(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  if p_key is null or p_key not in ('coach', 'logo_tip', 'card_hello', 'offer', 'push', 'install', 'fix_tip', 'first_scan', 'first_gift', 'mission', 'links_tip', 'reset_tip') then return public.err('invalid'); end if;
  update public.people set seen = array_append(seen, p_key) where id = auth.uid() and not (p_key = any (seen));
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.stamp(p_token text, p_hold text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  k public.codes%rowtype;
  s public.shops%rowtype;
  c public.cards%rowtype;
  v_gift boolean := false;
  v_waiting boolean;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  select * into k from public.codes where hash = public.sha(p_token) for update;
  if k.id is null then return public.err('invalid'); end if;
  select * into s from public.shops where id = k.shop_id;

  if k.used_at is not null then
    if k.used_by = v_uid then
      select * into c from public.cards where shop_id = s.id and user_id = v_uid;
      return public.err('done', jsonb_build_object('card', public.card_view(c.id), 'link', k.online));
    end if;
    return public.err('used', jsonb_build_object('shop', s.name, 'link', k.online));
  end if;
  -- a link the owner cancelled (a code never is)
  if k.cancelled_at is not null then return public.err('cancelled', jsonb_build_object('shop', s.name, 'link', true)); end if;
  if k.held_hash is not null and not (k.online and k.held_until <= now()) then
    -- held by a phone without an account: only that phone, back signed in, takes it (a link's
    -- hold that ran out holds nothing: the link is anybody's again, below)
    if p_hold is null or public.sha(p_hold) <> k.held_hash then return public.err('used', jsonb_build_object('shop', s.name, 'link', k.online)); end if;
    if k.held_until <= now() then return public.err('expired', jsonb_build_object('shop', s.name)); end if;
  elsif not k.online and k.expires_at + interval '2 minutes' <= now() then
    return public.err('expired', jsonb_build_object('shop', s.name));
  end if;
  if s.owner_id = v_uid then
    update public.codes set tried_at = now(), tried_by = v_uid, tried_why = 'own_shop' where id = k.id;
    return public.err('own_shop', jsonb_build_object('link', k.online));
  end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused or public.shut(s) then return public.err('paused', jsonb_build_object('shop', s.name, 'link', k.online)); end if;

  insert into public.people (id) values (v_uid) on conflict (id) do nothing;
  insert into public.cards (shop_id, user_id, goal, gift) values (s.id, v_uid, s.goal, s.gift) on conflict (shop_id, user_id) do nothing;
  select * into c from public.cards where shop_id = s.id and user_id = v_uid for update;

  if public.next_stamp_at(c.last_at, s.stamp_gap) > now() then
    -- the counter hears it too, and says why (the code stays good for the next customer)
    update public.codes set tried_at = now(), tried_by = v_uid, tried_why = 'too_soon' where id = k.id;
    -- a link stays good: opened again once the time has come, it gives its tampon
    return public.err('too_soon', jsonb_build_object('next_at', public.next_stamp_at(c.last_at, s.stamp_gap), 'card', public.card_view(c.id), 'link', k.online));
  end if;

  v_waiting := public.waits(c.id);
  update public.codes set used_at = now(), used_by = v_uid where id = k.id;
  -- a card past the shop's clock goes back to zero first: this tampon starts it over
  perform public.reset_if_due(c.id);
  -- a card at rest follows the shop's card of today (a voucher waiting keeps its own gift); a card on its way keeps the one it started
  update public.cards set
    goal = case when (stamps = 0 and not public.holds_stamps(c.id)) or goal is null then s.goal else goal end,
    gift = case when (stamps = 0 and not public.holds_stamps(c.id)) or gift is null then s.gift else gift end,
    stamps = stamps + 1, last_at = now()
  where id = c.id returning * into c;
  insert into public.moments (shop_id, card_id, kind, item_id) values (s.id, c.id, 'stamp', k.item_id);
  -- a full card (again): another gift waits, beside any already there
  v_gift := public.bank(c.id) > 0;
  -- the thing it was for goes back with the answer, so the phone that just
  -- scanned can say «كابوسة» and not only «+1»
  return jsonb_build_object('ok', true, 'gift', v_gift, 'card', public.card_view(c.id),
                            'item', (select i.name from public.items i where i.id = k.item_id),
                            -- a wheel shop whose card this scan filled: the prizes ride back with the
                            -- answer, so the turn is spun on the scan screen itself and the customer
                            -- sees what he won where he won it (18 Oct 2026), not a page away
                            'prizes', case when v_gift and s.wheel_on then public.wheel_list(s.id) end);
end $$;

create or replace function public.give_stamp(p_who text, p_item bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.shops%rowtype;
  c public.cards%rowtype;
  v_person uuid;
  v_name text;
  v_gift boolean := false;
  v_waiting boolean;
  v_moment bigint;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  select * into s from public.shops where owner_id = v_uid;
  if s.id is null then return public.err('no_shop'); end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused then return public.err('paused'); end if;
  if public.shut(s) then return public.err('shut'); end if;
  if not public.try_once('give:' || v_uid, 30, 10) then return public.err('too_many'); end if;
  -- the same question, asked of the hand that gives it
  if s.items_on then
    if p_item is null then return public.err('pick_item'); end if;
    if not exists (select 1 from public.items where id = p_item and shop_id = s.id and rank < 999) then
      return public.err('pick_item');
    end if;
  else
    p_item := null;
  end if;
  v_person := public.person_of(p_who);
  if v_person is null then return public.err('unknown'); end if;
  if v_person = v_uid then return public.err('own_shop'); end if;
  select split_part(coalesce(nullif(trim(name), ''), ''), ' ', 1) into v_name from public.people where id = v_person;

  insert into public.cards (shop_id, user_id, goal, gift) values (s.id, v_person, s.goal, s.gift) on conflict (shop_id, user_id) do nothing;
  select * into c from public.cards where shop_id = s.id and user_id = v_person for update;
  if public.next_stamp_at(c.last_at, s.stamp_gap) > now() then
    return public.err('too_soon', jsonb_build_object('next_at', public.next_stamp_at(c.last_at, s.stamp_gap), 'name', nullif(v_name, ''), 'card', public.card_view(c.id), 'waiting', public.waiting_gift(c.id)));
  end if;

  v_waiting := public.waits(c.id);
  -- a card past the shop's clock goes back to zero first: this tampon starts it over
  perform public.reset_if_due(c.id);
  update public.cards set
    goal = case when (stamps = 0 and not public.holds_stamps(c.id)) or goal is null then s.goal else goal end,
    gift = case when (stamps = 0 and not public.holds_stamps(c.id)) or gift is null then s.gift else gift end,
    stamps = stamps + 1, last_at = now()
  where id = c.id returning * into c;
  insert into public.moments (shop_id, card_id, kind, item_id) values (s.id, c.id, 'stamp', p_item) returning id into v_moment;
  -- a full card (again): another gift waits, beside any already there
  v_gift := public.bank(c.id) > 0;
  return jsonb_build_object('ok', true, 'gift', v_gift, 'name', nullif(v_name, ''), 'card', public.card_view(c.id), 'waiting', public.waiting_gift(c.id), 'moment', v_moment);
end $$;

-- ═══ the card's clock, the customer removed, the owner's insights (6 Nov 2026) ═══
-- (the clock's columns and reset_due() are with the cards, above: card_view reads them)

-- one card past its clock, back to zero now (from stamp() and give_stamp(), before the tampon lands)
create or replace function public.reset_if_due(p_card uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.cards c set stamps = 0, reset_at = now()
  from public.shops s
  where c.id = p_card and s.id = c.shop_id and c.stamps > 0
    and public.reset_due(c.last_at, c.stamps, s.reset_days, s.reset_since) <= now();
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- every card past its clock, back to zero: once a day, from the daily job (app/api/cron/remind, service role)
create or replace function public.reset_sweep() returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.cards c set stamps = 0, reset_at = now()
  from public.shops s
  where s.id = c.shop_id and s.reset_days is not null and c.stamps > 0
    and public.reset_due(c.last_at, c.stamps, s.reset_days, s.reset_since) <= now();
  get diagnostics v_n = row_count;
  return v_n;
end $$;

-- the owner's clock: so many days without a tampon and a card starts over (null: never). A new clock
-- counts from today for every card (reset_since): nobody loses a card for the days before it was set.
create or replace function public.set_reset_days(p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if p_days is not null and (p_days < 3 or p_days > 365) then return public.err('bad_days'); end if;
  if p_days is distinct from s.reset_days then
    update public.shops set reset_days = p_days, reset_since = case when p_days is null then null else now() end where id = s.id;
  end if;
  return jsonb_build_object('ok', true, 'days', p_days);
end $$;

-- the owner takes a customer off the shop's list: their card here and everything on it, for good
-- (the customer's account and their cards elsewhere stay; a scan later starts a new card)
create or replace function public.remove_customer(p_card uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_n int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  delete from public.cards where id = p_card and shop_id = s.id;
  get diagnostics v_n = row_count;
  if v_n = 0 then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- The owner's insights («شكون رجع؟»): who comes back, who stopped, how long between two visits.
-- One call when the page opens, nothing kept, nothing polled. A visit is a day (Tunis) with a tampon
-- on a card. The shop's rhythm is the median number of days between two visits (3 to 30): a customer
-- is active within twice that, cooling within four times, lost after.
create or replace function public.shop_insights() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype; v_out jsonb; v_today date := (now() at time zone 'Africa/Tunis')::date;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  with v as (
    select m.card_id, (m.created_at at time zone 'Africa/Tunis')::date as d, max(m.created_at) as at
    from public.moments m where m.shop_id = s.id and m.kind = 'stamp'
    group by 1, 2),
  g as (select d - lag(d) over (partition by card_id order by d) as gap from v),
  per as (
    select v.card_id, count(*)::int as n, min(v.d) as first_d, max(v.at) as last_at, (array_agg(v.d order by v.d))[2] as second_d
    from v group by 1),
  t as (
    select percentile_cont(0.5) within group (order by gap) as median,
           greatest(3, least(30, coalesce(round(percentile_cont(0.5) within group (order by gap))::int, 7))) as days
    from g where gap is not null),
  x as (
    select p.*, coalesce(c.goal, s.goal) as goal, nullif(split_part(pp.name, ' ', 1), '') as name,
           case when public.reset_due(c.last_at, c.stamps, s.reset_days, s.reset_since) <= now() then 0 else c.stamps end as stamps,
           public.reset_due(c.last_at, c.stamps, s.reset_days, s.reset_since) as due,
           extract(epoch from now() - p.last_at) / 86400 as since
    from per p join public.cards c on c.id = p.card_id left join public.people pp on pp.id = c.user_id)
  select jsonb_build_object('ok', true,
    'customers', (select count(*) from public.cards where shop_id = s.id),
    'visited', (select count(*) from x),
    'returning', (select count(*) from x where n >= 2),
    'visits', (select coalesce(sum(n), 0) from x),
    'back_visits', (select coalesce(sum(n - 1), 0) from x),
    'median_gap', (select round(median::numeric, 1) from t),
    'rhythm', (select days from t),
    'active', (select count(*) from x, t where x.since <= 2 * t.days),
    'cooling', (select count(*) from x, t where x.since > 2 * t.days and x.since <= 4 * t.days),
    'lost', (select count(*) from x, t where x.since > 4 * t.days),
    -- of the customers who first came a month ago or more, how many came back within that first month
    'early', (select count(*) from x where first_d <= v_today - 30 and second_d is not null and second_d - first_d <= 30),
    'early_of', (select count(*) from x where first_d <= v_today - 30),
    'new_30', (select count(*) from public.cards where shop_id = s.id and created_at >= now() - interval '30 days'),
    'new_prev', (select count(*) from public.cards where shop_id = s.id and created_at >= now() - interval '60 days' and created_at < now() - interval '30 days'),
    'near', (select count(*) from x where stamps > 0 and goal - stamps between 1 and 2),
    'given', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null),
    'reset_days', s.reset_days,
    'resetting', (select count(*) from x where due > now() and due <= now() + interval '3 days'),
    -- the week and the day, these 90 days: tampons by weekday (0 = Sunday) and by hour, Tunis time
    'weekdays', (select coalesce(jsonb_agg(w.n order by w.dow), '[]'::jsonb) from (
        select dow, count(m.id) as n from generate_series(0, 6) dow
        left join public.moments m on m.shop_id = s.id and m.kind = 'stamp' and m.created_at >= now() - interval '90 days'
          and extract(dow from m.created_at at time zone 'Africa/Tunis') = dow
        group by dow) w),
    'hours', (select coalesce(jsonb_agg(h.n order by h.hr), '[]'::jsonb) from (
        select hr, count(m.id) as n from generate_series(0, 23) hr
        left join public.moments m on m.shop_id = s.id and m.kind = 'stamp' and m.created_at >= now() - interval '90 days'
          and extract(hour from m.created_at at time zone 'Africa/Tunis') = hr
        group by hr) h),
    -- who is slipping away, the nearest their gift first: worth a word at the counter
    'cooling_list', (select coalesce(jsonb_agg(jsonb_build_object('name', q.name, 'days', floor(q.since)::int, 'stamps', q.stamps, 'goal', q.goal, 'n', q.n)), '[]'::jsonb)
        from (select x.* from x, t where x.since > 2 * t.days and x.since <= 4 * t.days
              order by x.stamps::numeric / greatest(x.goal, 1) desc, x.since limit 6) q),
    'champions', (select coalesce(jsonb_agg(jsonb_build_object('name', q.name, 'n', q.n, 'days', floor(q.since)::int)), '[]'::jsonb)
        from (select * from x order by n desc, last_at desc limit 5) q)
  ) into v_out;
  return v_out;
end $$;


revoke execute on function public.reset_due(timestamptz, int, int, timestamptz), public.reset_if_due(uuid), public.reset_sweep(), public.set_reset_days(int), public.remove_customer(uuid), public.shop_insights() from public, anon;
grant execute on function public.set_reset_days(int), public.remove_customer(uuid), public.shop_insights() to authenticated;
grant execute on function public.reset_due(timestamptz, int, int, timestamptz), public.reset_if_due(uuid), public.reset_sweep(), public.set_reset_days(int), public.remove_customer(uuid), public.shop_insights() to service_role;
commit;
notify pgrst, 'reload schema';
