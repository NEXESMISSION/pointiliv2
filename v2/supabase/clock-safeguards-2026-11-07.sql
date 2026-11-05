-- The card's clock, its safeguards (2026-11-07): the founder's switch for every shop (off), the owner's
-- pause, what the clock took given back, the customer told the day before, 7 days at the least, no
-- clock while a shop cannot stamp. Built from v2/supabase/schema.sql; applied on top of
-- clock-insights-2026-11-06.sql. Safe live: the switch starts off and no shop has a clock.
begin;

-- ═══ the card's clock (6 Nov 2026) ═══════════════════════════════════════════
-- A shop may have its cards start over when a customer stays away (the founder: «the owner sets a
-- timer: if the customer does not get a tampon in like 7 days, the card is zeroed — so a half-full
-- card is not left hanging»). shops.reset_days: that many days with no tampon and the card goes back
-- to zero — null for every shop until its owner chooses it (the card's questions, or «المحل»). The
-- days count from the card's last tampon, or from the day the owner set the clock when that is later
-- (reset_since): a clock set today never wipes a card for the weeks before it. Only the tampons on
-- their way go: a gift already earned stays. Kept by scripts/db.mjs: no re-run ever changes them.
alter table public.shops add column if not exists reset_days int check (reset_days is null or reset_days between 7 and 365);
alter table public.shops add column if not exists reset_since timestamptz;
-- 7 days at the least (it was 3): a short clock is one slip from wiping a week of customers (7 Nov 2026,
-- the founder: «safeguards for the owner and his customers, so he does not mess it up»)
alter table public.shops drop constraint if exists shops_reset_days_check;
alter table public.shops add constraint shops_reset_days_check check (reset_days is null or reset_days between 7 and 365);
-- the owner's pause («وقّف العدّاد»: a holiday, Ramadan, the shop closed): while it is set no card goes
-- back to zero, and when it is lifted the clock starts again from that day for everyone (reset_since)
alter table public.shops add column if not exists reset_paused_at timestamptz;
-- when a card last went back to zero by the clock (its customer is told once)
alter table public.cards add column if not exists reset_at timestamptz;
-- what the clock took from it: the owner can give it back within 14 days (restore_reset); null once given back
alter table public.cards add column if not exists reset_from int;
-- a card given back its tampons starts its own clock again from that day
alter table public.cards add column if not exists clock_from timestamptz;
-- its customer told the day before (a push, from the daily job): once for each stretch of the clock
alter table public.cards add column if not exists reset_warned_at timestamptz;

-- the moment a card goes back to zero: null when it never will (no clock on the shop, nothing on the card)
create or replace function public.reset_due(p_last timestamptz, p_stamps int, p_days int, p_since timestamptz) returns timestamptz
language sql immutable set search_path = '' as $$
  select case when p_days is not null and p_stamps > 0 and p_last is not null
              then greatest(p_last, coalesce(p_since, p_last)) + make_interval(days => p_days) end
$$;

-- The clock as it runs today for a shop — its days, or null when it stands still: no clock set; the
-- founder's switch off for every shop (settings.clock_on: off until the founder turns it on); the
-- owner's pause; or a shop that cannot give a tampon (stopped by the founder, or past its subscription —
-- a customer never loses a card while the shop could not have stamped it).
create or replace function public.shop_clock(s public.shops) returns int
language plpgsql stable security definer set search_path = '' as $$
begin
  if s.reset_days is null or s.reset_paused_at is not null or s.paused then return null; end if;
  if coalesce((select value from public.settings where key = 'clock_on'), '') <> '1' then return null; end if;
  if public.shut(s) then return null; end if;
  return s.reset_days;
end $$;

-- a card's moment back to zero, everything above counted (null: never): from its last tampon, the day the
-- clock was set or started again, or the day its tampons were given back — whichever is latest
create or replace function public.card_due(c public.cards, s public.shops) returns timestamptz
language plpgsql stable security definer set search_path = '' as $$
begin
  return public.reset_due(c.last_at, c.stamps, public.shop_clock(s), greatest(s.reset_since, c.clock_from));
end $$;


alter table public.settings drop constraint if exists settings_key_check;
alter table public.settings add constraint settings_key_check check (key in (
  'support_phone', 'video1_url', 'video1_label', 'video2_url', 'video2_label',
  'pay_card_url', 'pay_d17', 'pay_name', 'pay_bank', 'pay_rib', 'pay_mandat',
  -- a second account, at another bank
  'pay_bank2', 'pay_rib2',
  'facebook_url', 'instagram_url', 'tiktok_url',
  -- the ads: Facebook's pixel, and the code that tells Facebook the domain is ours
  'meta_pixel', 'fb_domain_verify',
  -- the visits as videos: Microsoft Clarity's project id
  'clarity_id',
  -- the card's clock for every shop: '1' on, anything else off (off until the founder turns it on)
  'clock_on'));


-- the functions that read the clock through card_due / shop_clock now
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
      'reset_days', s.reset_days, 'reset_paused', s.reset_paused_at is not null,
      -- the founder's switch for the card's clock: off, the owner never sees it at all
      'clock_on', coalesce((select x.value from public.settings x where x.key = 'clock_on'), '') = '1') end);
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
                               'gap', s.stamp_gap, 'paused', s.paused, 'reset_days', public.shop_clock(s)),
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
  cross join lateral (select public.card_due(c, s) as due) r
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
                                        'stamps', case when public.card_due(c, s) <= now() then 0 else c.stamps end,
                                        'gifts', c.gifts, 'last_at', c.last_at,
                                        'reset_due', public.card_due(c, s),
                                        -- what the clock took from this card lately: the owner may give it back (restore_reset)
                                        'restorable', case when c.reset_from > 0 and c.reset_at > now() - interval '14 days' then c.reset_from end,
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

-- ═══ the card's clock, the customer removed, the owner's insights (6 Nov 2026) ═══
-- (the clock's columns and reset_due() are with the cards, above: card_view reads them)

-- one card past its clock, back to zero now (from stamp() and give_stamp(), before the tampon lands)
create or replace function public.reset_if_due(p_card uuid) returns boolean
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.cards c set reset_from = c.stamps, stamps = 0, reset_at = now()
  from public.shops s
  where c.id = p_card and s.id = c.shop_id and c.stamps > 0
    and public.card_due(c, s) <= now();
  get diagnostics v_n = row_count;
  return v_n > 0;
end $$;

-- every card past its clock, back to zero: once a day, from the daily job (app/api/cron/remind, service role)
create or replace function public.reset_sweep() returns int
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  update public.cards c set reset_from = c.stamps, stamps = 0, reset_at = now()
  from public.shops s
  where s.id = c.shop_id and s.reset_days is not null and c.stamps > 0
    and public.card_due(c, s) <= now();
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
  if p_days is not null and (p_days < 7 or p_days > 365) then return public.err('bad_days'); end if;
  if p_days is distinct from s.reset_days then
    update public.shops set reset_days = p_days, reset_since = case when p_days is null then null else now() end where id = s.id;
  end if;
  return jsonb_build_object('ok', true, 'days', p_days);
end $$;

-- The owner's pause («وقّف العدّاد»): on, no card goes back to zero; off, the clock starts again from
-- that day for everyone — the days it stood still are never held against anybody.
create or replace function public.set_reset_paused(p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if s.reset_days is null then return public.err('no_clock'); end if;
  if coalesce(p_on, false) then
    update public.shops set reset_paused_at = coalesce(reset_paused_at, now()) where id = s.id;
  elsif s.reset_paused_at is not null then
    update public.shops set reset_paused_at = null, reset_since = now() where id = s.id;
  end if;
  return jsonb_build_object('ok', true, 'paused', coalesce(p_on, false));
end $$;

-- The owner gives back what the clock took, within 14 days: one card (p_card), or every card it took.
-- The tampons go back on top of any new ones, a full card becomes its gift (bank), and the card's own
-- clock starts again from today, so it is not taken again tomorrow.
create or replace function public.restore_reset(p_card uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_id uuid; v_n int := 0;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  for v_id in
    update public.cards set stamps = stamps + reset_from, reset_from = null, reset_at = null, clock_from = now()
    where shop_id = s.id and reset_from > 0 and reset_at > now() - interval '14 days' and (p_card is null or id = p_card)
    returning id
  loop
    perform public.bank(v_id);
    v_n := v_n + 1;
  end loop;
  if p_card is not null and v_n = 0 then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

-- the owner's clock page (/shop/clock): how it stands, and what it does these days
create or replace function public.my_clock() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'days', s.reset_days, 'paused', s.reset_paused_at is not null,
    'running', public.shop_clock(s) is not null,
    'soon', (select count(*) from public.cards c where c.shop_id = s.id and public.card_due(c, s) > now() and public.card_due(c, s) <= now() + interval '3 days'),
    'taken', (select count(*) from public.cards c where c.shop_id = s.id and c.reset_from > 0 and c.reset_at > now() - interval '14 days'),
    'taken_stamps', (select coalesce(sum(c.reset_from), 0) from public.cards c where c.shop_id = s.id and c.reset_from > 0 and c.reset_at > now() - interval '14 days'));
end $$;

-- The customers to tell before their card goes back to zero (the daily job sends a push): a card whose
-- clock runs out within the next 36 hours, not told yet for this stretch — written down as told as it
-- is read, so two runs never tell anyone twice.
create or replace function public.reset_warnings() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  with soon as (
    select c.id, c.user_id, c.stamps, s.name as shop, public.card_due(c, s) as at
    from public.cards c join public.shops s on s.id = c.shop_id
    where s.reset_days is not null and c.stamps > 0
      and (c.reset_warned_at is null or c.reset_warned_at < greatest(c.last_at, s.reset_since, c.clock_from))
      and public.card_due(c, s) > now() and public.card_due(c, s) <= now() + interval '36 hours'),
  told as (update public.cards c set reset_warned_at = now() from soon where c.id = soon.id returning c.id)
  select coalesce(jsonb_agg(jsonb_build_object('card', soon.id, 'user_id', soon.user_id, 'shop', soon.shop, 'stamps', soon.stamps, 'at', soon.at)), '[]'::jsonb)
  into v from soon;
  return v;
end $$;

-- The founder's switch for the card's clock, for every shop (settings.clock_on): off, no owner sees it
-- and no card ever goes back to zero. Turned on (again), every clock counts from that day.
create or replace function public.admin_set_clock(p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  insert into public.settings (key, value, updated_at) values ('clock_on', case when coalesce(p_on, false) then '1' else '' end, now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  if coalesce(p_on, false) then update public.shops set reset_since = now() where reset_days is not null; end if;
  return jsonb_build_object('ok', true, 'on', coalesce(p_on, false));
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
           case when public.card_due(c, s) <= now() then 0 else c.stamps end as stamps,
           public.card_due(c, s) as due,
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
    'reset_days', public.shop_clock(s),
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


revoke execute on function public.shop_clock(public.shops), public.card_due(public.cards, public.shops), public.set_reset_paused(boolean), public.restore_reset(uuid), public.my_clock(), public.reset_warnings(), public.admin_set_clock(boolean) from public, anon;
grant execute on function public.set_reset_paused(boolean), public.restore_reset(uuid), public.my_clock(), public.admin_set_clock(boolean) to authenticated;
grant execute on function public.shop_clock(public.shops), public.card_due(public.cards, public.shops), public.set_reset_paused(boolean), public.restore_reset(uuid), public.my_clock(), public.reset_warnings(), public.admin_set_clock(boolean) to service_role;
commit;
notify pgrst, 'reload schema';
