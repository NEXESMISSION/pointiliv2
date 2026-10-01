-- ═══ Pointili v2: the whole database, one file ═══════════════════════════════
-- Its own schema, so it shares nothing with the first version but the logins.
-- Five tables: people, shops (with their one card), cards (a customer's card
-- at a shop), codes (the counter's one-use QR codes) and moments (a stamp, or
-- a gift — waiting until the shop gives it). Everything goes through the
-- functions at the bottom; nobody reads a table directly.
--
-- The rules, all of them:
--   · a shop has one card: N stamps = one gift;
--   · a counter code works once, for 60 seconds;
--   · a phone without an account can hold a code for 20 minutes, the time to
--     make one — the stamp is theirs when they come back signed in;
--   · one stamp per shop per hour, per customer;
--   · when a card reaches the goal a gift waits; the shop taps «تعطى», the
--     goal's stamps leave the card and the rest carries over;
--   · an owner never stamps his own card.
-- Re-runnable: every statement is safe to apply again.

create schema if not exists v2;
grant usage on schema v2 to anon, authenticated, service_role;

create table if not exists v2.people (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 60),
  phone       text,
  created_at  timestamptz not null default now()
);

create table if not exists v2.shops (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null unique references auth.users (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 60),
  kind        text not null default 'cafe',
  -- the card: null until the owner makes it
  goal        int  check (goal between 3 and 30),
  gift        text check (char_length(gift) between 2 and 60),
  color       text not null default '#6C47FF' check (color ~ '^#[0-9A-Fa-f]{6}$'),
  created_at  timestamptz not null default now()
);

create table if not exists v2.cards (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references v2.shops (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  stamps      int  not null default 0 check (stamps >= 0),
  gifts       int  not null default 0 check (gifts >= 0),
  last_at     timestamptz,
  created_at  timestamptz not null default now(),
  unique (shop_id, user_id)
);
create index if not exists cards_user_idx on v2.cards (user_id, last_at desc);

create table if not exists v2.codes (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references v2.shops (id) on delete cascade,
  hash        text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     uuid references auth.users (id) on delete set null,
  held_hash   text,
  held_until  timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists codes_shop_idx on v2.codes (shop_id, created_at desc);

create table if not exists v2.moments (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references v2.shops (id) on delete cascade,
  card_id     uuid not null references v2.cards (id) on delete cascade,
  kind        text not null check (kind in ('stamp', 'gift')),
  given_at    timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists moments_shop_idx on v2.moments (shop_id, created_at desc);
create index if not exists moments_card_idx on v2.moments (card_id, created_at desc);
create unique index if not exists moments_one_waiting_gift on v2.moments (card_id) where kind = 'gift' and given_at is null;

do $$
declare t text;
begin
  foreach t in array array['people', 'shops', 'cards', 'codes', 'moments'] loop
    execute format('alter table v2.%I enable row level security', t);
    execute format('alter table v2.%I force row level security', t);
  end loop;
end $$;
revoke all on all tables in schema v2 from anon, authenticated, public;
grant all on all tables in schema v2 to service_role;
grant usage, select on all sequences in schema v2 to service_role;

-- ═══ helpers ═══════════════════════════════════════════════════════════════
create or replace function v2.err(p_code text, p_extra jsonb default '{}'::jsonb) returns jsonb
language sql immutable set search_path = '' as $$
  select jsonb_build_object('ok', false, 'error', p_code) || coalesce(p_extra, '{}'::jsonb)
$$;

create or replace function v2.sha(p_text text) returns text
language sql immutable set search_path = '' as $$
  select encode(extensions.digest(p_text, 'sha256'), 'hex')
$$;

-- the caller's shop (an owner has exactly one)
create or replace function v2.my_shop() returns v2.shops
language sql stable security definer set search_path = '' as $$
  select * from v2.shops where owner_id = auth.uid()
$$;

-- what a customer's card looks like, everywhere it is shown
create or replace function v2.card_view(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'stamps', c.stamps, 'gifts', c.gifts, 'last_at', c.last_at,
    'ready', s.goal is not null and c.stamps >= s.goal,
    'waiting', exists (select 1 from v2.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null),
    'shop', jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind, 'goal', s.goal, 'gift', s.gift, 'color', s.color))
  from v2.cards c join v2.shops s on s.id = c.shop_id
  where c.id = p_card
$$;

-- ═══ who am I ═══════════════════════════════════════════════════════════════
create or replace function v2.me() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); p v2.people%rowtype; s v2.shops%rowtype;
begin
  if v_uid is null then return null; end if;
  select * into p from v2.people where id = v_uid;
  if p.id is null then
    -- a login from the first version: a v2 profile on first sight
    insert into v2.people (id, phone)
    select v_uid, nullif(u.raw_app_meta_data ->> 'phone', '') from auth.users u where u.id = v_uid
    on conflict (id) do nothing;
    select * into p from v2.people where id = v_uid;
  end if;
  select * into s from v2.shops where owner_id = v_uid;
  return jsonb_build_object(
    'id', v_uid, 'name', p.name, 'phone', p.phone,
    'shop', case when s.id is null then null else jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'goal', s.goal, 'gift', s.gift, 'color', s.color) end);
end $$;

create or replace function v2.set_name(p_name text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return v2.err('not_signed_in'); end if;
  if char_length(trim(coalesce(p_name, ''))) > 60 then return v2.err('invalid_name'); end if;
  insert into v2.people (id, name) values (auth.uid(), trim(coalesce(p_name, '')))
  on conflict (id) do update set name = excluded.name;
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the owner: the shop, then its card ═══════════════════════════════════
create or replace function v2.open_shop(p_name text, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); s v2.shops%rowtype;
begin
  if v_uid is null then return v2.err('not_signed_in'); end if;
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then return v2.err('invalid_name'); end if;
  if p_kind not in ('cafe', 'bakery', 'restaurant', 'pizza', 'salon', 'beauty', 'shop', 'other') then p_kind := 'other'; end if;
  insert into v2.shops (owner_id, name, kind) values (v_uid, trim(p_name), p_kind)
  on conflict (owner_id) do update set name = excluded.name, kind = excluded.kind
  returning * into s;
  return jsonb_build_object('ok', true, 'id', s.id);
end $$;

create or replace function v2.save_card(p_goal int, p_gift text, p_color text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s v2.shops%rowtype;
begin
  s := v2.my_shop();
  if s.id is null then return v2.err('no_shop'); end if;
  if p_goal is null or p_goal not between 3 and 30 then return v2.err('invalid_goal'); end if;
  if char_length(trim(coalesce(p_gift, ''))) not between 2 and 60 then return v2.err('invalid_gift'); end if;
  if coalesce(p_color, '') !~ '^#[0-9A-Fa-f]{6}$' then p_color := s.color; end if;
  update v2.shops set goal = p_goal, gift = trim(p_gift), color = upper(p_color) where id = s.id;
  -- a lower goal can fill cards at once: their gift waits now
  insert into v2.moments (shop_id, card_id, kind)
  select s.id, c.id, 'gift' from v2.cards c
  where c.shop_id = s.id and c.stamps >= p_goal
    and not exists (select 1 from v2.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null);
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the counter: a code that works once ═══════════════════════════════════
create or replace function v2.new_code() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s v2.shops%rowtype; v_token text; v_id uuid; v_exp timestamptz := now() + interval '60 seconds';
begin
  s := v2.my_shop();
  if s.id is null then return v2.err('no_shop'); end if;
  if s.goal is null then return v2.err('no_card'); end if;
  if (select count(*) from v2.codes where shop_id = s.id and created_at > now() - interval '10 minutes') > 400 then
    return v2.err('slow_down');
  end if;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into v2.codes (shop_id, hash, expires_at) values (s.id, v2.sha(v_token), v_exp) returning id into v_id;
  delete from v2.codes where shop_id = s.id and used_at is null and held_hash is null and expires_at < now() - interval '1 day';
  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_token, 'expires_at', v_exp);
end $$;

-- what the counter needs to know, every second: was the code taken, who came, which gifts wait
create or replace function v2.counter(p_code uuid, p_since timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s v2.shops%rowtype; k v2.codes%rowtype;
begin
  s := v2.my_shop();
  if s.id is null then return v2.err('no_shop'); end if;
  select * into k from v2.codes where id = p_code and shop_id = s.id;
  return jsonb_build_object(
    'ok', true,
    'taken', k.id is not null and (k.used_at is not null or k.held_hash is not null),
    'expired', k.id is null or k.expires_at <= now(),
    'stamps', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''),
                                          'stamps', c.stamps, 'goal', s.goal) order by m.created_at)
      from (select * from v2.moments where shop_id = s.id and kind = 'stamp' and created_at > coalesce(p_since, now())
            order by created_at desc limit 20) m
      join v2.cards c on c.id = m.card_id
      left join v2.people p on p.id = c.user_id
    ), '[]'::jsonb),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''),
                                          'gift', s.gift) order by m.created_at)
      from v2.moments m
      join v2.cards c on c.id = m.card_id
      left join v2.people p on p.id = c.user_id
      where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null
    ), '[]'::jsonb)
  );
end $$;

-- the shop hands the gift over: the goal's stamps leave the card, the rest carries over
create or replace function v2.give(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s v2.shops%rowtype; m v2.moments%rowtype; c v2.cards%rowtype;
begin
  s := v2.my_shop();
  if s.id is null then return v2.err('no_shop'); end if;
  select * into m from v2.moments where id = p_moment and shop_id = s.id and kind = 'gift' for update;
  if m.id is null then return v2.err('not_found'); end if;
  if m.given_at is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  update v2.moments set given_at = now() where id = m.id;
  update v2.cards set stamps = greatest(stamps - s.goal, 0), gifts = gifts + 1 where id = m.card_id returning * into c;
  if c.stamps >= s.goal then
    insert into v2.moments (shop_id, card_id, kind) values (s.id, c.id, 'gift');
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- the owner's numbers, for the settings sheet
create or replace function v2.shop_numbers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s v2.shops%rowtype; v_today timestamptz := (date_trunc('day', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis';
begin
  s := v2.my_shop();
  if s.id is null then return v2.err('no_shop'); end if;
  return jsonb_build_object('ok', true,
    'customers', (select count(*) from v2.cards where shop_id = s.id),
    'today', (select count(*) from v2.moments where shop_id = s.id and kind = 'stamp' and created_at >= v_today),
    'gifts', (select count(*) from v2.moments where shop_id = s.id and kind = 'gift' and given_at is not null));
end $$;

-- ═══ the customer: hold a code, take the stamp, see the cards ══════════════
-- (server only) a phone without an account keeps the code 20 minutes
create or replace function v2.hold(p_token text, p_hold text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare k v2.codes%rowtype; s v2.shops%rowtype;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' or coalesce(length(p_hold), 0) < 32 then return v2.err('invalid'); end if;
  select * into k from v2.codes where hash = v2.sha(p_token) for update;
  if k.id is null then return v2.err('invalid'); end if;
  select * into s from v2.shops where id = k.shop_id;
  if k.held_hash = v2.sha(p_hold) and k.held_until > now() then
    return jsonb_build_object('ok', true, 'shop', s.name, 'color', s.color, 'kind', s.kind);
  end if;
  if k.used_at is not null or k.held_hash is not null then return v2.err('used'); end if;
  if k.expires_at <= now() then return v2.err('expired'); end if;
  update v2.codes set held_hash = v2.sha(p_hold), held_until = now() + interval '20 minutes' where id = k.id;
  return jsonb_build_object('ok', true, 'shop', s.name, 'color', s.color, 'kind', s.kind);
end $$;

create or replace function v2.stamp(p_token text, p_hold text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  k v2.codes%rowtype;
  s v2.shops%rowtype;
  c v2.cards%rowtype;
  v_gift boolean := false;
begin
  if v_uid is null then return v2.err('not_signed_in'); end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return v2.err('invalid'); end if;
  select * into k from v2.codes where hash = v2.sha(p_token) for update;
  if k.id is null then return v2.err('invalid'); end if;
  select * into s from v2.shops where id = k.shop_id;

  if k.used_at is not null then
    if k.used_by = v_uid then
      select * into c from v2.cards where shop_id = s.id and user_id = v_uid;
      return v2.err('done', jsonb_build_object('card', v2.card_view(c.id)));
    end if;
    return v2.err('used', jsonb_build_object('shop', s.name));
  end if;
  if k.held_hash is not null then
    -- held by a phone without an account: only that phone, back signed in, takes it
    if p_hold is null or v2.sha(p_hold) <> k.held_hash then return v2.err('used', jsonb_build_object('shop', s.name)); end if;
    if k.held_until <= now() then return v2.err('expired', jsonb_build_object('shop', s.name)); end if;
  elsif k.expires_at <= now() then
    return v2.err('expired', jsonb_build_object('shop', s.name));
  end if;
  if s.owner_id = v_uid then return v2.err('own_shop'); end if;
  if s.goal is null then return v2.err('no_card'); end if;

  insert into v2.people (id) values (v_uid) on conflict (id) do nothing;
  insert into v2.cards (shop_id, user_id) values (s.id, v_uid) on conflict (shop_id, user_id) do nothing;
  select * into c from v2.cards where shop_id = s.id and user_id = v_uid for update;

  if c.last_at is not null and c.last_at > now() - interval '60 minutes' then
    return v2.err('too_soon', jsonb_build_object('next_at', c.last_at + interval '60 minutes', 'card', v2.card_view(c.id)));
  end if;

  update v2.codes set used_at = now(), used_by = v_uid where id = k.id;
  update v2.cards set stamps = stamps + 1, last_at = now() where id = c.id returning * into c;
  insert into v2.moments (shop_id, card_id, kind) values (s.id, c.id, 'stamp');
  if c.stamps >= s.goal and not exists (select 1 from v2.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null) then
    insert into v2.moments (shop_id, card_id, kind) values (s.id, c.id, 'gift');
    v_gift := true;
  end if;
  return jsonb_build_object('ok', true, 'gift', v_gift, 'card', v2.card_view(c.id));
end $$;

create or replace function v2.wallet() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(v2.card_view(c.id) order by coalesce(c.last_at, c.created_at) desc), '[]'::jsonb)
  from v2.cards c where c.user_id = auth.uid()
$$;

create or replace function v2.card(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select v2.card_view(c.id) || jsonb_build_object('history', coalesce((
           select jsonb_agg(jsonb_build_object('kind', m.kind, 'at', coalesce(m.given_at, m.created_at), 'given', m.given_at is not null)
                            order by coalesce(m.given_at, m.created_at) desc)
           from (select * from v2.moments where card_id = c.id order by created_at desc limit 30) m), '[]'::jsonb))
  from v2.cards c where c.id = p_id and c.user_id = auth.uid()
$$;

-- ═══ who may call what ═════════════════════════════════════════════════════
revoke execute on all functions in schema v2 from public, anon, authenticated;
grant execute on function v2.me(), v2.set_name(text), v2.open_shop(text, text), v2.save_card(int, text, text),
  v2.new_code(), v2.counter(uuid, timestamptz), v2.give(bigint), v2.shop_numbers(),
  v2.stamp(text, text), v2.wallet(), v2.card(uuid) to authenticated;
grant execute on all functions in schema v2 to service_role;

notify pgrst, 'reload schema';
