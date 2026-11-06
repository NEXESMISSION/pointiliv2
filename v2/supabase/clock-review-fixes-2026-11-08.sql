-- The card's clock, fixes from the review before going live (2026-11-08): a card goes back to zero at the
-- end of its day in Tunis; the clock starts again when a shop can stamp again (renewed, unpaused, out of the
-- store) and never runs on a store; what a card past its clock lost is said and can be given back before the
-- daily sweep; the clock taken off takes its pause with it; a gift handed over counts as a visit; the warning
-- reaches the day before; a removed customer cannot move a trial's start. Built from v2/supabase/schema.sql.
-- Functions: reset_due, shop_clock, shops_clock_restart, card_view, shop_customers, trial_start, give, set_reset_days, restore_reset, my_clock, reset_warnings, remove_customer.
begin;

alter table public.shops add column if not exists trial_from timestamptz;

create or replace function public.reset_due(p_last timestamptz, p_stamps int, p_days int, p_since timestamptz) returns timestamptz
language sql stable set search_path = '' as $$
  select case when p_days is not null and p_stamps > 0 and p_last is not null
              then (date_trunc('day', (greatest(p_last, coalesce(p_since, p_last)) + make_interval(days => p_days)) at time zone 'Africa/Tunis')
                    + interval '1 day' - interval '1 second') at time zone 'Africa/Tunis' end
$$;

create or replace function public.shop_clock(s public.shops) returns int
language plpgsql stable security definer set search_path = '' as $$
begin
  if s.reset_days is null or s.reset_paused_at is not null or s.paused or s.store_on then return null; end if;
  if coalesce((select value from public.settings where key = 'clock_on'), '') <> '1' then return null; end if;
  if public.shut(s) then return null; end if;
  return s.reset_days;
end $$;

create or replace function public.shops_clock_restart() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  -- a shop with no clock (every shop until its owner sets one): nothing to look at, nothing else touched
  if new.reset_days is null then return new; end if;
  if (old.paused or old.store_on or public.shut(old)) and not (new.paused or new.store_on or public.shut(new)) then
    new.reset_since := now();
  end if;
  return new;
end $$;

create or replace function public.card_view(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    -- a card past its clock is at zero already, swept or not (the daily sweep and the next tampon write it)
    'id', c.id, 'stamps', case when r.due <= now() then 0 else c.stamps end, 'gifts', c.gifts, 'last_at', c.last_at,
    -- the card's clock: when it goes back to zero (null: never), and when it last did
    'reset_due', r.due, 'reset_at', c.reset_at,
    -- what the clock took and the owner can still give back (restore_reset): past the clock and not yet
    -- swept, or taken within 14 days — said at the counter, beside the card (8 Nov 2026)
    'reset_lost', case when r.due <= now() then c.stamps when c.reset_from > 0 and c.reset_at > now() - interval '14 days' then c.reset_from end,
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
                                        -- — past its clock and not yet swept counts too (the sweep is once a day)
                                        'restorable', case when public.card_due(c, s) <= now() then c.stamps
                                                           when c.reset_from > 0 and c.reset_at > now() - interval '14 days' then c.reset_from end,
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

create or replace function public.trial_start(s public.shops) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select case when not s.trial_first then s.created_at
    else coalesce(s.trial_from, (select min(m.created_at) from public.moments m join public.cards c on c.id = m.card_id
                   where m.shop_id = s.id and m.kind = 'stamp' and c.user_id <> s.owner_id), now()) end
$$;

create or replace function public.give(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; m public.moments%rowtype; c public.cards%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select * into m from public.moments where id = p_moment and shop_id = s.id and kind = 'gift' for update;
  if m.id is null then return public.err('not_found'); end if;
  if m.given_at is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  -- a turn of the wheel: the prize first, then it is handed over
  if m.wheel and m.spun_at is null then return public.err('spin_first'); end if;
  perform 1 from public.cards where id = m.card_id for update;
  update public.moments set given_at = now() where id = m.id;
  -- a voucher took its stamps when it was written; a gift from before takes them now. A customer who came
  -- for the gift came: the card's clock starts again from today (8 Nov 2026)
  update public.cards set stamps = case when m.banked then stamps else greatest(stamps - coalesce(goal, s.goal), 0) end, gifts = gifts + 1,
    clock_from = now()
  where id = m.card_id returning * into c;
  -- the last gift taken: the card follows the shop's card of today (the stamps left over carry on to it)
  if not public.waits(c.id) then
    update public.cards set goal = s.goal, gift = s.gift where id = c.id;
  end if;
  perform public.bank(c.id);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.set_reset_days(p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if p_days is not null and (p_days < 7 or p_days > 365) then return public.err('bad_days'); end if;
  if p_days is distinct from s.reset_days then
    -- the clock taken off takes its pause with it: set again later, it runs as the card's question says
    update public.shops set reset_days = p_days, reset_since = case when p_days is null then null else now() end,
      reset_paused_at = case when p_days is null then null else reset_paused_at end
    where id = s.id;
  end if;
  return jsonb_build_object('ok', true, 'days', p_days);
end $$;

create or replace function public.restore_reset(p_card uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_id uuid; v_n int := 0;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  -- a card past its clock but not yet swept (the sweep is once a day): written as taken first, then given back
  update public.cards c set reset_from = c.stamps, stamps = 0, reset_at = now()
  where c.shop_id = s.id and (p_card is null or c.id = p_card) and c.stamps > 0 and public.card_due(c, s) <= now();
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

create or replace function public.my_clock() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'days', s.reset_days, 'paused', s.reset_paused_at is not null,
    'running', public.shop_clock(s) is not null,
    'soon', (select count(*) from public.cards c where c.shop_id = s.id and public.card_due(c, s) > now() and public.card_due(c, s) <= now() + interval '3 days'),
    -- taken: within 14 days, or past the clock and not yet swept (restore_reset gives both back)
    'taken', (select count(*) from public.cards c where c.shop_id = s.id
               and ((c.reset_from > 0 and c.reset_at > now() - interval '14 days') or (c.stamps > 0 and public.card_due(c, s) <= now()))),
    'taken_stamps', (select coalesce(sum(case when c.stamps > 0 and public.card_due(c, s) <= now() then c.stamps else c.reset_from end), 0)
                     from public.cards c where c.shop_id = s.id
                       and ((c.reset_from > 0 and c.reset_at > now() - interval '14 days') or (c.stamps > 0 and public.card_due(c, s) <= now()))));
end $$;

create or replace function public.reset_warnings() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v jsonb;
begin
  with soon as (
    select c.id, c.user_id, c.stamps, s.name as shop, public.card_due(c, s) as at
    from public.cards c join public.shops s on s.id = c.shop_id
    where s.reset_days is not null and c.stamps > 0
      and (c.reset_warned_at is null or c.reset_warned_at < greatest(c.last_at, s.reset_since, c.clock_from))
      -- two days ahead: the morning job reaches the day before (a card goes back at the end of its day)
      and public.card_due(c, s) > now() and public.card_due(c, s) <= now() + interval '48 hours'),
  told as (update public.cards c set reset_warned_at = now() from soon where c.id = soon.id returning c.id)
  select coalesce(jsonb_agg(jsonb_build_object('card', soon.id, 'user_id', soon.user_id, 'shop', soon.shop, 'stamps', soon.stamps, 'at', soon.at)), '[]'::jsonb)
  into v from soon;
  return v;
end $$;

create or replace function public.remove_customer(p_card uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_n int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  -- the card's history goes with it: a trial counted from the first customer keeps the day it started
  if s.trial_first and s.trial_from is null and exists (select 1 from public.cards where id = p_card and shop_id = s.id) then
    update public.shops set trial_from = (select min(m.created_at) from public.moments m join public.cards c on c.id = m.card_id
                                          where m.shop_id = s.id and m.kind = 'stamp' and c.user_id <> s.owner_id)
    where id = s.id;
  end if;
  delete from public.cards where id = p_card and shop_id = s.id;
  get diagnostics v_n = row_count;
  if v_n = 0 then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

drop trigger if exists shops_clock_restart on public.shops;
create trigger shops_clock_restart before update on public.shops for each row execute function public.shops_clock_restart();
revoke execute on function public.shops_clock_restart() from public, anon, authenticated;
commit;
notify pgrst, 'reload schema';
