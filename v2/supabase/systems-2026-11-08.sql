-- ═══ the systems, one by one — and the golden ticket (8 Nov 2026) ═══════════
-- The founder: «we will separate the systems: the tampon, the roulette, the store, the golden ticket,
-- the link — all managed by the admin, shop by shop». Each one is its own switch on the founder's
-- console. The tampon is the ground they all stand on (a visit counted); the roulette (wheel_allowed)
-- and the store (store_on) had their switches already. New here: the link (links_allowed) and the
-- golden ticket (draw_allowed, and everything under it).
--
-- ONLY NEW THINGS. Not one function, table or column that is already there is changed or replaced:
-- the site as it runs today never calls any of this, so no shop and no customer sees a difference.
-- The defaults keep every shop as it is: the link stays on for all (every shop has it today), the
-- golden ticket is off for all until the founder turns it on for a shop.

alter table public.shops add column if not exists links_allowed boolean not null default true;
alter table public.shops add column if not exists draw_allowed boolean not null default false;

-- ═══ the golden ticket ═══════════════════════════════════════════════════════
-- The owner makes a draw: one gift or several (each with how many winners), and the moment it is
-- drawn (Monday 8:00). Until then the customers see the countdown on their card, and every tampon
-- they take here is one more ticket in the pool (rule 'stamps') — or every customer with a card here
-- is in it once (rule 'cards'). At the moment, the draw picks the winners at random, a ticket one
-- chance: never the same customer twice. Each one sees on their card that they won, and what; the
-- others see who won nothing this time. The owner hands each prize over from the draw's page.
--
-- Nothing runs at the moment itself (no clock on the server): the first look after it — the owner's
-- page, a customer's card — draws, once (a lock: two looks at once never draw twice). The pool is the
-- tampons BEFORE the moment, whoever looks first and whenever, so it is the same draw either way.
create table if not exists public.draws (
  id            uuid primary key default gen_random_uuid(),
  shop_id       uuid not null references public.shops (id) on delete cascade,
  title         text check (title is null or char_length(btrim(title)) between 1 and 40),
  rule          text not null default 'stamps' check (rule in ('stamps', 'cards')),
  starts_at     timestamptz not null default now(),
  draw_at       timestamptz not null,
  status        text not null default 'open' check (status in ('open', 'drawn', 'cancelled')),
  drawn_at      timestamptz,
  cancelled_at  timestamptz,
  -- who was in it, counted at the draw (kept: the tampons can be undone later)
  pool_people   int,
  pool_tickets  int,
  created_at    timestamptz not null default now(),
  constraint draws_after_start check (draw_at > starts_at)
);
-- one draw waiting at a time, per shop
create unique index if not exists draws_one_open on public.draws (shop_id) where status = 'open';
create index if not exists draws_shop_idx on public.draws (shop_id, created_at desc);

create table if not exists public.draw_gifts (
  id       bigint generated always as identity primary key,
  draw_id  uuid not null references public.draws (id) on delete cascade,
  name     text not null check (char_length(btrim(name)) between 1 and 40),
  n        int  not null check (n between 1 and 50),
  rank     int  not null default 0
);
create index if not exists draw_gifts_draw_idx on public.draw_gifts (draw_id, rank, id);

create table if not exists public.draw_wins (
  id          bigint generated always as identity primary key,
  draw_id     uuid not null references public.draws (id) on delete cascade,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  -- the card it was won on (a customer removed later: the win stays theirs, by their account)
  card_id     uuid references public.cards (id) on delete set null,
  user_id     uuid references auth.users (id) on delete set null,
  gift        text not null,
  tickets     int  not null,
  given_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists draw_wins_draw_idx on public.draw_wins (draw_id, id);
create index if not exists draw_wins_user_idx on public.draw_wins (user_id, shop_id);
create index if not exists draw_wins_card_idx on public.draw_wins (card_id);
create index if not exists draw_wins_waiting_idx on public.draw_wins (shop_id) where given_at is null;

-- like every table: closed to the browser, read and written only through the functions below
alter table public.draws enable row level security;
alter table public.draws force row level security;
revoke all on public.draws from anon, authenticated, public;
alter table public.draw_gifts enable row level security;
alter table public.draw_gifts force row level security;
revoke all on public.draw_gifts from anon, authenticated, public;
alter table public.draw_wins enable row level security;
alter table public.draw_wins force row level security;
revoke all on public.draw_wins from anon, authenticated, public;

-- who is in a draw, and with how many tickets: every customer of the shop (never its owner, never the
-- founder's own or test accounts) — a ticket a tampon between its start and its moment, or one each
-- for every card made here before the moment
create or replace function public.draw_pool(d public.draws) returns table (card_id uuid, user_id uuid, tickets int)
language sql stable security definer set search_path = '' as $$
  select c.id, c.user_id, count(*)::int
  from public.moments m join public.cards c on c.id = m.card_id
  where d.rule = 'stamps' and m.shop_id = d.shop_id and m.kind = 'stamp'
    and m.created_at >= d.starts_at and m.created_at < d.draw_at
    and c.user_id <> (select s.owner_id from public.shops s where s.id = d.shop_id)
    and not exists (select 1 from public.people p where p.id = c.user_id and (p.is_admin or p.is_tester))
  group by c.id, c.user_id
  union all
  select c.id, c.user_id, 1
  from public.cards c
  where d.rule = 'cards' and c.shop_id = d.shop_id and c.created_at < d.draw_at
    and c.user_id <> (select s.owner_id from public.shops s where s.id = d.shop_id)
    and not exists (select 1 from public.people p where p.id = c.user_id and (p.is_admin or p.is_tester))
$$;

-- the gifts of a draw, in the owner's order
create or replace function public.draw_gift_list(p_draw uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('name', g.name, 'n', g.n) order by g.rank, g.id), '[]'::jsonb)
  from public.draw_gifts g where g.draw_id = p_draw
$$;

-- The draws of a shop whose moment has come: drawn now, once. A ticket is one chance: each customer
-- gets a random number shrunk by their tickets (an exponential, rate = tickets — the smallest wins,
-- the chance of being first is exactly tickets / all the tickets), the smallest take the gifts in the
-- owner's order, one gift each. Fewer customers than gifts: the gifts left over are nobody's.
-- `skip locked`: a draw another look is drawing right now is left to it. Returns how many it drew.
create or replace function public.draw_settle(p_shop uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare d public.draws%rowtype; v_n int := 0; v_total int; v_people int; v_tickets int;
begin
  for d in select * from public.draws x where x.shop_id = p_shop and x.status = 'open' and x.draw_at <= now()
           order by x.draw_at for update skip locked loop
    select coalesce(sum(g.n), 0)::int into v_total from public.draw_gifts g where g.draw_id = d.id;
    select count(*)::int, coalesce(sum(p.tickets), 0)::int into v_people, v_tickets from public.draw_pool(d) p;
    with pool as materialized (
      select p.card_id, p.user_id, p.tickets, -ln(1 - random()) / p.tickets as k from public.draw_pool(d) p
    ), picked as (
      select pool.card_id, pool.user_id, pool.tickets, row_number() over (order by pool.k) as rn from pool
    ), slots as (
      select g.name, row_number() over (order by g.rank, g.id, i) as rn
      from public.draw_gifts g cross join lateral generate_series(1, g.n) i
      where g.draw_id = d.id
    )
    insert into public.draw_wins (draw_id, shop_id, card_id, user_id, gift, tickets)
    select d.id, d.shop_id, p.card_id, p.user_id, s.name, p.tickets
    from picked p join slots s on s.rn = p.rn
    where p.rn <= v_total
    order by p.rn;
    update public.draws set status = 'drawn', drawn_at = now(), pool_people = v_people, pool_tickets = v_tickets where id = d.id;
    v_n := v_n + 1;
  end loop;
  return v_n;
end $$;

-- ═══ the owner ═══════════════════════════════════════════════════════════════
-- which systems the founder gave this shop (the owner's screens show only those)
create or replace function public.my_systems() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'links', s.links_allowed, 'draw', s.draw_allowed,
    'draw_open', (select d.draw_at from public.draws d where d.shop_id = s.id and d.status = 'open' limit 1))
  from public.shops s where s.owner_id = auth.uid()
$$;

-- the owner's golden ticket: the draw waiting (how many are in it so far), the last one drawn and its
-- winners, every prize still to hand over, and the draws before. Draws first what is due.
create or replace function public.my_draw() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; d public.draws%rowtype; v_open jsonb; v_last jsonb;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  perform public.draw_settle(s.id);
  select * into d from public.draws where shop_id = s.id and status = 'open' limit 1;
  if d.id is not null then
    v_open := jsonb_build_object('id', d.id, 'title', d.title, 'rule', d.rule, 'starts_at', d.starts_at, 'draw_at', d.draw_at,
      'gifts', public.draw_gift_list(d.id),
      'people', (select count(*) from public.draw_pool(d)), 'tickets', (select coalesce(sum(p.tickets), 0) from public.draw_pool(d) p));
  end if;
  select * into d from public.draws where shop_id = s.id and status = 'drawn' order by drawn_at desc limit 1;
  if d.id is not null then
    v_last := jsonb_build_object('id', d.id, 'title', d.title, 'rule', d.rule, 'draw_at', d.draw_at, 'drawn_at', d.drawn_at,
      'people', d.pool_people, 'tickets', d.pool_tickets, 'gifts', public.draw_gift_list(d.id));
  end if;
  return jsonb_build_object('ok', true, 'allowed', s.draw_allowed, 'card', s.goal is not null, 'open', v_open, 'last', v_last,
    -- the prizes of every draw, the last one's first: who, what, and whether it was handed over
    'wins', coalesce((
      select jsonb_agg(jsonb_build_object('id', w.id, 'draw', w.draw_id, 'gift', w.gift, 'tickets', w.tickets, 'given_at', w.given_at,
                                          'card', w.card_id, 'name', nullif(p.name, ''), 'phone', public.masked(p.phone), 'at', w.created_at)
                       order by w.created_at desc, w.id)
      from public.draw_wins w left join public.people p on p.id = w.user_id
      where w.shop_id = s.id and (w.given_at is null or w.draw_id = d.id)), '[]'::jsonb),
    -- the draws before, the latest first (ten)
    'past', coalesce((
      select jsonb_agg(x.j order by x.at desc) from (
        select jsonb_build_object('id', o.id, 'title', o.title, 'status', o.status, 'draw_at', o.draw_at, 'people', o.pool_people,
                                  'winners', (select count(*) from public.draw_wins w where w.draw_id = o.id)) as j,
               coalesce(o.drawn_at, o.cancelled_at, o.created_at) as at
        from public.draws o where o.shop_id = s.id and o.status <> 'open' order by coalesce(o.drawn_at, o.cancelled_at, o.created_at) desc limit 10) x), '[]'::jsonb));
end $$;

-- a new draw: its gifts ([{name, n}], 1 to 10 lines, 100 winners at most), its moment (at least 10 minutes
-- away, 90 days at most), who is in it ('stamps': a ticket a tampon; 'cards': every customer once)
create or replace function public.draw_new(p_title text, p_at timestamptz, p_rule text, p_gifts jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_id uuid; x jsonb; v_rank int := 0; v_total int := 0; v_name text; v_n int; v_title text;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if not s.draw_allowed then return public.err('not_allowed'); end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused or public.shut(s) then return public.err('paused'); end if;
  if p_at is null or p_at < now() + interval '10 minutes' or p_at > now() + interval '90 days' then return public.err('bad_time'); end if;
  if coalesce(p_rule, '') not in ('stamps', 'cards') then return public.err('invalid'); end if;
  if jsonb_typeof(p_gifts) <> 'array' or jsonb_array_length(p_gifts) not between 1 and 10 then return public.err('bad_gifts'); end if;
  for x in select * from jsonb_array_elements(p_gifts) loop
    v_name := btrim(coalesce(x ->> 'name', ''));
    v_n := case when coalesce(x ->> 'n', '') ~ '^\d{1,3}$' then (x ->> 'n')::int else 0 end;
    if char_length(v_name) not between 1 and 40 or v_n not between 1 and 50 then return public.err('bad_gifts'); end if;
    v_total := v_total + v_n;
  end loop;
  if v_total > 100 then return public.err('bad_gifts'); end if;
  if exists (select 1 from public.draws where shop_id = s.id and status = 'open') then return public.err('one_open'); end if;
  if not public.try_once('draw:' || s.id, 10, 60) then return public.err('too_many'); end if;
  v_title := nullif(btrim(coalesce(p_title, '')), '');
  if v_title is not null and char_length(v_title) > 40 then return public.err('invalid'); end if;
  insert into public.draws (shop_id, title, rule, draw_at) values (s.id, v_title, p_rule, p_at) returning id into v_id;
  for x in select * from jsonb_array_elements(p_gifts) loop
    insert into public.draw_gifts (draw_id, name, n, rank) values (v_id, btrim(x ->> 'name'), (x ->> 'n')::int, v_rank);
    v_rank := v_rank + 1;
  end loop;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- the draw waiting, called off by its owner (nobody wins anything; the customers see it no more)
create or replace function public.draw_cancel(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  update public.draws set status = 'cancelled', cancelled_at = now() where id = p_id and shop_id = s.id and status = 'open';
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- a prize handed over to its winner. A customer who came for it came: their card's clock starts again
-- from today, as when a gift is handed over (public.give)
create or replace function public.draw_give(p_win bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; w public.draw_wins%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select * into w from public.draw_wins where id = p_win and shop_id = s.id for update;
  if w.id is null then return public.err('not_found'); end if;
  if w.given_at is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  update public.draw_wins set given_at = now() where id = w.id;
  if w.card_id is not null then update public.cards set clock_from = now() where id = w.card_id; end if;
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the customer ════════════════════════════════════════════════════════════
-- one card's golden ticket: the draw waiting at its shop (while the founder allows it) and this
-- customer's tickets in it so far; the last draw (a week after it, or for as long as a prize of theirs
-- waits) and what they won in it; and every prize of theirs here still to take. Draws first what is due.
create or replace function public.card_draw(p_card uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cards%rowtype; s public.shops%rowtype; d public.draws%rowtype; v_open jsonb; v_last jsonb;
begin
  select * into c from public.cards where id = p_card and user_id = auth.uid();
  if c.id is null then return null; end if;
  select * into s from public.shops where id = c.shop_id;
  -- a shop with no draw at all (nearly every one): one look, nothing else
  if not exists (select 1 from public.draws x where x.shop_id = s.id and x.status <> 'cancelled') then return null; end if;
  perform public.draw_settle(s.id);
  if s.draw_allowed then
    select * into d from public.draws where shop_id = s.id and status = 'open' limit 1;
    if d.id is not null then
      v_open := jsonb_build_object('id', d.id, 'title', d.title, 'rule', d.rule, 'starts_at', d.starts_at, 'draw_at', d.draw_at,
        'gifts', public.draw_gift_list(d.id), 'people', (select count(*) from public.draw_pool(d)),
        'mine', (select coalesce(sum(p.tickets), 0) from public.draw_pool(d) p where p.user_id = c.user_id));
    end if;
  end if;
  select * into d from public.draws x where x.shop_id = s.id and x.status = 'drawn'
    and (x.drawn_at > now() - interval '7 days' or exists (select 1 from public.draw_wins w where w.draw_id = x.id and w.user_id = c.user_id and w.given_at is null))
    order by x.drawn_at desc limit 1;
  if d.id is not null then
    v_last := jsonb_build_object('id', d.id, 'title', d.title, 'draw_at', d.draw_at, 'drawn_at', d.drawn_at, 'people', d.pool_people,
      'gifts', public.draw_gift_list(d.id), 'winners', (select count(*) from public.draw_wins w where w.draw_id = d.id),
      'mine', (select coalesce(sum(p.tickets), 0) from public.draw_pool(d) p where p.user_id = c.user_id),
      'won', (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'gift', w.gift, 'given', w.given_at is not null) order by w.id), '[]'::jsonb)
              from public.draw_wins w where w.draw_id = d.id and w.user_id = c.user_id));
  end if;
  return jsonb_build_object('ok', true, 'open', v_open, 'last', v_last,
    'waiting', (select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'gift', w.gift, 'at', w.created_at) order by w.id), '[]'::jsonb)
                from public.draw_wins w where w.shop_id = s.id and w.user_id = c.user_id and w.given_at is null));
end $$;

-- the customer's cards with a golden ticket on them — a draw waiting, or a prize to take — for the
-- wallet's line over each card. Draws first what is due, at those shops only.
create or replace function public.my_draws() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); x record;
begin
  if v_uid is null then return '[]'::jsonb; end if;
  for x in select distinct d.shop_id from public.draws d join public.cards c on c.shop_id = d.shop_id and c.user_id = v_uid
           where d.status = 'open' and d.draw_at <= now() loop
    perform public.draw_settle(x.shop_id);
  end loop;
  return coalesce((
    select jsonb_agg(jsonb_build_object('card', c.id, 'draw_at', o.draw_at, 'won', coalesce(w.n, 0)) order by c.last_at desc nulls last)
    from public.cards c
    join public.shops s on s.id = c.shop_id
    left join lateral (select d.draw_at from public.draws d where d.shop_id = c.shop_id and d.status = 'open' and s.draw_allowed limit 1) o on true
    left join lateral (select count(*)::int as n from public.draw_wins w where w.shop_id = c.shop_id and w.user_id = v_uid and w.given_at is null) w on true
    where c.user_id = v_uid and (o.draw_at is not null or w.n > 0)), '[]'::jsonb);
end $$;

-- ═══ the founder ═════════════════════════════════════════════════════════════
-- a shop's systems as the console shows them (the ones that already had a switch are read with the shop)
create or replace function public.admin_systems(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true, 'links', s.links_allowed, 'draw', s.draw_allowed,
    'links_made', (select count(*) from public.codes k where k.shop_id = s.id and k.online),
    'draw_open', (select d.draw_at from public.draws d where d.shop_id = s.id and d.status = 'open' limit 1),
    'draws', (select count(*) from public.draws d where d.shop_id = s.id and d.status = 'drawn'));
end $$;

-- the founder turns one of a shop's new systems on or off: 'links' (a tampon sent as a link) or 'draw'
-- (the golden ticket). The golden ticket taken away: its draw waiting is called off (nobody would see it
-- drawn); prizes already won stay to hand over
create or replace function public.admin_set_system(p_id uuid, p_key text, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_on boolean := coalesce(p_on, false);
begin
  perform public.require_admin();
  if p_key not in ('links', 'draw') then return public.err('invalid'); end if;
  if not exists (select 1 from public.shops where id = p_id) then return public.err('not_found'); end if;
  if p_key = 'links' then
    update public.shops set links_allowed = v_on where id = p_id;
  else
    update public.shops set draw_allowed = v_on where id = p_id;
    if not v_on then
      update public.draws set status = 'cancelled', cancelled_at = now() where shop_id = p_id and status = 'open';
    end if;
  end if;
  return jsonb_build_object('ok', true, 'on', v_on);
end $$;

-- ═══ who may call what (these functions only) ═══════════════════════════════
revoke execute on function public.draw_pool(public.draws), public.draw_gift_list(uuid), public.draw_settle(uuid),
  public.my_systems(), public.my_draw(), public.draw_new(text, timestamptz, text, jsonb), public.draw_cancel(uuid), public.draw_give(bigint),
  public.card_draw(uuid), public.my_draws(), public.admin_systems(uuid), public.admin_set_system(uuid, text, boolean)
  from public, anon, authenticated;
grant execute on function public.my_systems(), public.my_draw(), public.draw_new(text, timestamptz, text, jsonb), public.draw_cancel(uuid),
  public.draw_give(bigint), public.card_draw(uuid), public.my_draws(), public.admin_systems(uuid), public.admin_set_system(uuid, text, boolean)
  to authenticated;
grant execute on function public.draw_pool(public.draws), public.draw_gift_list(uuid), public.draw_settle(uuid),
  public.my_systems(), public.my_draw(), public.draw_new(text, timestamptz, text, jsonb), public.draw_cancel(uuid), public.draw_give(bigint),
  public.card_draw(uuid), public.my_draws(), public.admin_systems(uuid), public.admin_set_system(uuid, text, boolean)
  to service_role;

notify pgrst, 'reload schema';
