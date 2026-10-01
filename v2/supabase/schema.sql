-- ═══ Pointili: the whole database, one file ══════════════════════════════════
-- Five tables: people, shops (with their one card), cards (a customer's card
-- at a shop), codes (the counter's one-use QR codes) and moments (a stamp, or
-- a gift — waiting until the shop gives it). Everything goes through the
-- functions below; nobody reads a table directly.
--
-- The rules, all of them:
--   · a shop has one card: N stamps = one gift;
--   · a counter code works once, for 60 seconds;
--   · a phone without an account can hold a code for 20 minutes, the time to
--     make one — the stamp is theirs when they come back signed in;
--   · one stamp per shop per hour, per customer;
--   · when a card reaches the goal a gift waits; the shop taps «عطيتو», the
--     goal's stamps leave the card and the rest carries over;
--   · an owner never stamps his own card;
--   · a paused shop (the founder's switch) gives no stamps until resumed;
--   · the founder (people.is_admin) sees and steers every shop.
-- Re-runnable: every statement is safe to apply again.

create table if not exists public.people (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 60),
  phone       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.shops (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 60),
  kind        text not null default 'other',
  -- the card: null until the owner makes it
  goal        int  check (goal between 3 and 30),
  gift        text check (char_length(gift) between 2 and 60),
  color       text not null default '#6C47FF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  paused      boolean not null default false,
  created_at  timestamptz not null default now()
);

create table if not exists public.cards (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  stamps      int  not null default 0 check (stamps >= 0),
  gifts       int  not null default 0 check (gifts >= 0),
  last_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (shop_id, user_id)
);
create index if not exists cards_user_idx on public.cards (user_id, last_at desc);
create index if not exists cards_shop_idx on public.cards (shop_id, last_at desc);

create table if not exists public.codes (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  hash        text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     uuid references auth.users (id) on delete set null,
  held_hash   text,
  held_until  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists codes_shop_idx on public.codes (shop_id, created_at desc);

create table if not exists public.moments (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  card_id     uuid not null references public.cards (id) on delete cascade,
  kind        text not null check (kind in ('stamp', 'gift')),
  given_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists moments_shop_idx on public.moments (shop_id, created_at desc);
create index if not exists moments_card_idx on public.moments (card_id, created_at desc);
create unique index if not exists moments_one_waiting_gift on public.moments (card_id) where kind = 'gift' and given_at is null;

do $$
declare t text;
begin
  foreach t in array array['people', 'shops', 'cards', 'codes', 'moments'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;
revoke all on all tables in schema public from anon, authenticated, public;
grant all on all tables in schema public to service_role;
grant usage, select on all sequences in schema public to service_role;

-- ═══ helpers ═══════════════════════════════════════════════════════════════
create or replace function public.err(p_code text, p_extra jsonb default '{}'::jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false, 'error', p_code) || coalesce(p_extra, '{}'::jsonb)
$$;

create or replace function public.sha(p_text text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_text, 'sha256'), 'hex')
$$;

-- the caller's shop (an owner has exactly one)
create or replace function public.my_shop() returns public.shops
language sql stable security definer set search_path = '' as $$
  select * from public.shops where owner_id = auth.uid()
$$;

create or replace function public.is_admin() returns boolean
language sql stable security definer set search_path = '' as $$
  select coalesce((select p.is_admin from public.people p where p.id = auth.uid()), false)
$$;

create or replace function public.kinds() returns text[]
language sql immutable set search_path = '' as $$
  select array['cafe', 'juice', 'bakery', 'pastry', 'viennoiserie', 'restaurant', 'fastfood', 'pizza', 'grill',
               'barber', 'hair', 'beauty', 'nails', 'clothes', 'phones', 'grocery', 'gym', 'games', 'events',
               'carwash', 'gifts', 'other']
$$;

create or replace function public.tunis_today() returns timestamptz
language sql stable set search_path = '' as $$
  select (date_trunc('day', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis'
$$;

-- 22 123 456 → 22 ••• 456
create or replace function public.masked(p_phone text) returns text
language sql immutable set search_path = '' as $$
  select case when p_phone is null or length(p_phone) < 8 then null
              else substr(right(p_phone, 8), 1, 2) || ' ••• ' || right(p_phone, 3) end
$$;

-- what a customer's card looks like, everywhere it is shown
create or replace function public.card_view(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'stamps', c.stamps, 'gifts', c.gifts, 'last_at', c.last_at,
    'ready', s.goal is not null and c.stamps >= s.goal,
    'waiting', exists (select 1 from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null),
    'shop', jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind, 'goal', s.goal, 'gift', s.gift, 'color', s.color))
  from public.cards c join public.shops s on s.id = c.shop_id
  where c.id = p_card
$$;

-- ═══ who am I ═══════════════════════════════════════════════════════════════
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
  end if;
  select * into s from public.shops where owner_id = v_uid;
  return jsonb_build_object(
    'id', v_uid, 'name', p.name, 'phone', p.phone, 'admin', p.is_admin,
    'shop', case when s.id is null then null else jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'goal', s.goal, 'gift', s.gift, 'color', s.color, 'paused', s.paused) end);
end $$;

create or replace function public.set_name(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  if char_length(trim(coalesce(p_name, ''))) > 60 then return public.err('invalid_name'); end if;
  insert into public.people (id, name) values (auth.uid(), trim(coalesce(p_name, '')))
  on conflict (id) do update set name = excluded.name;
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the owner: the shop, its card, its home ═══════════════════════════════
create or replace function public.open_shop(p_name text, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); s public.shops%rowtype;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then return public.err('invalid_name'); end if;
  if not (coalesce(p_kind, '') = any(public.kinds())) then p_kind := 'other'; end if;
  insert into public.shops (owner_id, name, kind) values (v_uid, trim(p_name), p_kind)
  on conflict (owner_id) do update set name = excluded.name, kind = excluded.kind
  returning * into s;
  return jsonb_build_object('ok', true, 'id', s.id);
end $$;

create or replace function public.save_card(p_goal int, p_gift text, p_color text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if p_goal is null or p_goal not between 3 and 30 then return public.err('invalid_goal'); end if;
  if char_length(trim(coalesce(p_gift, ''))) not between 2 and 60 then return public.err('invalid_gift'); end if;
  if coalesce(p_color, '') !~ '^#[0-9A-Fa-f]{6}$' then p_color := s.color; end if;
  update public.shops set goal = p_goal, gift = trim(p_gift), color = upper(p_color) where id = s.id;
  -- a lower goal can fill cards at once: their gift waits now
  insert into public.moments (shop_id, card_id, kind)
  select s.id, c.id, 'gift' from public.cards c
  where c.shop_id = s.id and c.stamps >= p_goal
    and not exists (select 1 from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null);
  return jsonb_build_object('ok', true);
end $$;

-- the owner's home: today, the gifts waiting, who came lately
create or replace function public.shop_home() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true,
    'customers', (select count(*) from public.cards where shop_id = s.id),
    'today', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'visitors_today', (select count(distinct card_id) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'given', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''), 'gift', s.gift) order by m.created_at)
      from public.moments m join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id
      where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'kind', m.kind, 'given', m.given_at is not null,
                                          'name', nullif(split_part(p.name, ' ', 1), ''), 'stamps', c.stamps, 'goal', s.goal)
                       order by m.created_at desc)
      from (select * from public.moments where shop_id = s.id order by created_at desc limit 8) m
      join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb));
end $$;

-- the owner's customers, the latest visit first
create or replace function public.shop_customers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'goal', s.goal, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', nullif(p.name, ''), 'phone', public.masked(p.phone),
                                        'stamps', c.stamps, 'gifts', c.gifts, 'last_at', c.last_at,
                                        'ready', s.goal is not null and c.stamps >= s.goal)
                     order by c.last_at desc nulls last, c.created_at desc)
    from public.cards c left join public.people p on p.id = c.user_id
    where c.shop_id = s.id), '[]'::jsonb));
end $$;

-- the owner's three numbers (kept for older screens)
create or replace function public.shop_numbers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true,
    'customers', (select count(*) from public.cards where shop_id = s.id),
    'today', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'gifts', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null));
end $$;

-- ═══ the counter: a code that works once ═══════════════════════════════════
create or replace function public.new_code() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_token text; v_id uuid; v_exp timestamptz := now() + interval '60 seconds';
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused then return public.err('paused'); end if;
  if (select count(*) from public.codes where shop_id = s.id and created_at > now() - interval '10 minutes') > 400 then
    return public.err('slow_down');
  end if;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.codes (shop_id, hash, expires_at) values (s.id, public.sha(v_token), v_exp) returning id into v_id;
  delete from public.codes where shop_id = s.id and used_at is null and held_hash is null and expires_at < now() - interval '1 day';
  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_token, 'expires_at', v_exp);
end $$;

-- what the counter needs to know, every second: was the code taken, who came, which gifts wait
create or replace function public.counter(p_code uuid, p_since timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype; k public.codes%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select * into k from public.codes where id = p_code and shop_id = s.id;
  return jsonb_build_object(
    'ok', true,
    'paused', s.paused,
    'taken', k.id is not null and (k.used_at is not null or k.held_hash is not null),
    'expired', k.id is null or k.expires_at <= now(),
    'stamps', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''),
                                          'stamps', c.stamps, 'goal', s.goal) order by m.created_at)
      from (select * from public.moments where shop_id = s.id and kind = 'stamp' and created_at > coalesce(p_since, now())
            order by created_at desc limit 20) m
      join public.cards c on c.id = m.card_id
      left join public.people p on p.id = c.user_id
    ), '[]'::jsonb),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''),
                                          'gift', s.gift) order by m.created_at)
      from public.moments m
      join public.cards c on c.id = m.card_id
      left join public.people p on p.id = c.user_id
      where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null
    ), '[]'::jsonb)
  );
end $$;

-- the shop hands the gift over: the goal's stamps leave the card, the rest carries over
create or replace function public.give(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; m public.moments%rowtype; c public.cards%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select * into m from public.moments where id = p_moment and shop_id = s.id and kind = 'gift' for update;
  if m.id is null then return public.err('not_found'); end if;
  if m.given_at is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  update public.moments set given_at = now() where id = m.id;
  update public.cards set stamps = greatest(stamps - s.goal, 0), gifts = gifts + 1 where id = m.card_id returning * into c;
  if c.stamps >= s.goal then
    insert into public.moments (shop_id, card_id, kind) values (s.id, c.id, 'gift');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the customer: hold a code, take the stamp, see the cards ══════════════
-- (server only) a phone without an account keeps the code 20 minutes
create or replace function public.hold(p_token text, p_hold text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k public.codes%rowtype; s public.shops%rowtype;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' or coalesce(length(p_hold), 0) < 32 then return public.err('invalid'); end if;
  select * into k from public.codes where hash = public.sha(p_token) for update;
  if k.id is null then return public.err('invalid'); end if;
  select * into s from public.shops where id = k.shop_id;
  if k.held_hash = public.sha(p_hold) and k.held_until > now() then
    return jsonb_build_object('ok', true, 'shop', s.name, 'color', s.color, 'kind', s.kind);
  end if;
  if k.used_at is not null or k.held_hash is not null then return public.err('used'); end if;
  if k.expires_at <= now() then return public.err('expired'); end if;
  if s.paused then return public.err('paused'); end if;
  update public.codes set held_hash = public.sha(p_hold), held_until = now() + interval '20 minutes' where id = k.id;
  return jsonb_build_object('ok', true, 'shop', s.name, 'color', s.color, 'kind', s.kind);
end $$;

create or replace function public.stamp(p_token text, p_hold text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  k public.codes%rowtype;
  s public.shops%rowtype;
  c public.cards%rowtype;
  v_gift boolean := false;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  select * into k from public.codes where hash = public.sha(p_token) for update;
  if k.id is null then return public.err('invalid'); end if;
  select * into s from public.shops where id = k.shop_id;

  if k.used_at is not null then
    if k.used_by = v_uid then
      select * into c from public.cards where shop_id = s.id and user_id = v_uid;
      return public.err('done', jsonb_build_object('card', public.card_view(c.id)));
    end if;
    return public.err('used', jsonb_build_object('shop', s.name));
  end if;
  if k.held_hash is not null then
    -- held by a phone without an account: only that phone, back signed in, takes it
    if p_hold is null or public.sha(p_hold) <> k.held_hash then return public.err('used', jsonb_build_object('shop', s.name)); end if;
    if k.held_until <= now() then return public.err('expired', jsonb_build_object('shop', s.name)); end if;
  elsif k.expires_at <= now() then
    return public.err('expired', jsonb_build_object('shop', s.name));
  end if;
  if s.owner_id = v_uid then return public.err('own_shop'); end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused then return public.err('paused', jsonb_build_object('shop', s.name)); end if;

  insert into public.people (id) values (v_uid) on conflict (id) do nothing;
  insert into public.cards (shop_id, user_id) values (s.id, v_uid) on conflict (shop_id, user_id) do nothing;
  select * into c from public.cards where shop_id = s.id and user_id = v_uid for update;

  if c.last_at is not null and c.last_at > now() - interval '60 minutes' then
    return public.err('too_soon', jsonb_build_object('next_at', c.last_at + interval '60 minutes', 'card', public.card_view(c.id)));
  end if;

  update public.codes set used_at = now(), used_by = v_uid where id = k.id;
  update public.cards set stamps = stamps + 1, last_at = now() where id = c.id returning * into c;
  insert into public.moments (shop_id, card_id, kind) values (s.id, c.id, 'stamp');
  if c.stamps >= s.goal and not exists (select 1 from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null) then
    insert into public.moments (shop_id, card_id, kind) values (s.id, c.id, 'gift');
    v_gift := true;
  end if;
  return jsonb_build_object('ok', true, 'gift', v_gift, 'card', public.card_view(c.id));
end $$;

create or replace function public.wallet() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.card_view(c.id) order by coalesce(c.last_at, c.created_at) desc), '[]'::jsonb)
  from public.cards c where c.user_id = auth.uid()
$$;

create or replace function public.card(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.card_view(c.id) || jsonb_build_object('history', coalesce((
           select jsonb_agg(jsonb_build_object('kind', m.kind, 'at', coalesce(m.given_at, m.created_at), 'given', m.given_at is not null)
                            order by coalesce(m.given_at, m.created_at) desc)
           from (select * from public.moments where card_id = c.id order by created_at desc limit 30) m), '[]'::jsonb))
  from public.cards c where c.id = p_id and c.user_id = auth.uid()
$$;

-- ═══ the founder: every shop, every customer ═══════════════════════════════
create or replace function public.require_admin() returns void
language plpgsql stable security definer set search_path = '' as $$
begin
  if not public.is_admin() then raise exception 'not_admin' using errcode = '42501'; end if;
end $$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'shops', (select count(*) from public.shops),
    'live', (select count(*) from public.shops where goal is not null and not paused),
    'paused', (select count(*) from public.shops where paused),
    'customers', (select count(distinct user_id) from public.cards),
    'people', (select count(*) from public.people),
    'stamps', (select count(*) from public.moments where kind = 'stamp'),
    'today', (select count(*) from public.moments where kind = 'stamp' and created_at >= public.tunis_today()),
    'given', (select count(*) from public.moments where kind = 'gift' and given_at is not null),
    'waiting', (select count(*) from public.moments where kind = 'gift' and given_at is null),
    'week', coalesce((
      select jsonb_agg(jsonb_build_object('day', d.day, 'stamps', coalesce(x.n, 0)) order by d.day)
      from (select ((now() at time zone 'Africa/Tunis')::date - g)::date as day from generate_series(0, 6) g) d
      left join (select (created_at at time zone 'Africa/Tunis')::date as day, count(*) n from public.moments
                 where kind = 'stamp' and created_at >= now() - interval '8 days' group by 1) x on x.day = d.day), '[]'::jsonb));
end $$;

create or replace function public.admin_shops(p_q text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_q), ''), '%', ''), '_', '') || '%';
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'goal', s.goal, 'gift', s.gift, 'paused', s.paused,
      'created_at', s.created_at, 'owner', jsonb_build_object('name', p.name, 'phone', p.phone),
      'customers', (select count(*) from public.cards c where c.shop_id = s.id),
      'stamps', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'stamp'),
      'today', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'stamp' and m.created_at >= public.tunis_today()),
      'last_at', (select max(m.created_at) from public.moments m where m.shop_id = s.id)) order by s.created_at desc)
    from public.shops s left join public.people p on p.id = s.owner_id
    where p_q is null or trim(p_q) = '' or s.name ilike v_like or coalesce(p.phone, '') like v_like or coalesce(p.name, '') ilike v_like
  ), '[]'::jsonb);
end $$;

create or replace function public.admin_shop(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return null; end if;
  return jsonb_build_object(
    'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'goal', s.goal, 'gift', s.gift, 'paused', s.paused, 'created_at', s.created_at,
    'owner', (select jsonb_build_object('name', p.name, 'phone', p.phone) from public.people p where p.id = s.owner_id),
    'customers', (select count(*) from public.cards where shop_id = s.id),
    'stamps', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp'),
    'today', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'given', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null),
    'waiting', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is null),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('at', m.created_at, 'kind', m.kind, 'given', m.given_at is not null,
                                          'name', nullif(p.name, ''), 'phone', public.masked(p.phone)) order by m.created_at desc)
      from (select * from public.moments where shop_id = s.id order by created_at desc limit 15) m
      join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('name', nullif(p.name, ''), 'phone', public.masked(p.phone), 'stamps', c.stamps, 'gifts', c.gifts) order by c.gifts desc, c.stamps desc)
      from (select * from public.cards where shop_id = s.id order by gifts desc, stamps desc limit 5) c
      left join public.people p on p.id = c.user_id), '[]'::jsonb));
end $$;

create or replace function public.admin_set_paused(p_id uuid, p_paused boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.shops set paused = coalesce(p_paused, false) where id = p_id;
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- a shop goes, with its cards and its story (the owner's login stays)
create or replace function public.admin_delete_shop(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.shops where id = p_id;
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_people(p_q text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_q), ''), '%', ''), '_', '') || '%';
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(item order by created_at desc) from (
      select p.created_at, jsonb_build_object(
        'id', p.id, 'name', p.name, 'phone', p.phone, 'admin', p.is_admin, 'created_at', p.created_at,
        'shop', (select s.name from public.shops s where s.owner_id = p.id),
        'cards', (select count(*) from public.cards c where c.user_id = p.id),
        'stamps', (select count(*) from public.moments m join public.cards c on c.id = m.card_id where c.user_id = p.id and m.kind = 'stamp')) as item
      from public.people p
      where p_q is null or trim(p_q) = '' or p.name ilike v_like or coalesce(p.phone, '') like v_like
      order by p.created_at desc limit 300
    ) x
  ), '[]'::jsonb);
end $$;

-- ═══ who may call what ═════════════════════════════════════════════════════
revoke execute on all functions in schema public from public, anon, authenticated;
grant execute on function public.me(), public.set_name(text), public.open_shop(text, text), public.save_card(int, text, text),
  public.shop_home(), public.shop_customers(), public.shop_numbers(),
  public.new_code(), public.counter(uuid, timestamptz), public.give(bigint),
  public.stamp(text, text), public.wallet(), public.card(uuid),
  public.admin_overview(), public.admin_shops(text), public.admin_shop(uuid), public.admin_set_paused(uuid, boolean),
  public.admin_delete_shop(uuid), public.admin_people(text) to authenticated;
grant execute on all functions in schema public to service_role;

-- nothing a visitor without an account can call
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
