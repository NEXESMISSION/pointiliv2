-- ═══ Pointili: the whole database, one file ══════════════════════════════════
-- Six tables: people, shops (with their one card), cards (a customer's card
-- at a shop), codes (the counter's one-use QR codes), moments (a stamp, or a
-- gift — waiting until the shop gives it) and tries (the doors that count).
-- Everything goes through the functions below; nobody reads a table directly.
--
-- The rules, all of them:
--   · a shop has one card: N stamps = one gift;
--   · a customer's card is a promise: it keeps the goal and the gift it
--     started with until that gift is handed over, so a change of card never
--     takes anything away. A card at rest (no stamps) takes the new card at
--     once, and the same gift for fewer stamps is for everyone at once;
--   · a counter code works once, for 60 seconds;
--   · a phone without an account can hold a code for 20 minutes, the time to
--     make one — the stamp is theirs when they come back signed in;
--   · one stamp per shop per hour, per customer;
--   · when a card reaches its goal a gift waits; the shop taps «عطيتو», the
--     goal's stamps leave the card and the rest carries over to the next one;
--   · an owner never stamps his own card;
--   · a paused shop (the founder's switch) gives no stamps until resumed;
--   · signing in and making accounts are counted: too many tries, a pause;
--   · the founder (people.is_admin) sees and steers every shop.
-- Re-runnable: every statement is safe to apply again.

create table if not exists public.people (
  id          uuid primary key references auth.users (id) on delete cascade,
  name        text not null default '' check (char_length(name) <= 60),
  phone       text,
  is_admin    boolean not null default false,
  created_at  timestamptz not null default now()
);

-- every person's own code: 6 digits, shown with its QR in the wallet — the
-- shop types it (or scans it) to give a tampon; and the founder's test
-- accounts, kept out of the numbers
alter table public.people add column if not exists code text;
alter table public.people add column if not exists is_tester boolean not null default false;
create unique index if not exists people_code_idx on public.people (code);
create or replace function public.new_person_code() returns text
language plpgsql volatile set search_path = '' as $$
declare v text;
begin
  loop
    v := lpad((floor(random() * 1000000))::int::text, 6, '0');
    exit when not exists (select 1 from public.people where code = v);
  end loop;
  return v;
end $$;
alter table public.people alter column code set default public.new_person_code();
update public.people set code = public.new_person_code() where code is null;

-- the one-time notes this person has seen (the bravo after the first card,
-- the card's hello, the logo tip): kept here, not on the phone, so none ever
-- shows twice — not after a reload, not on another phone
alter table public.people add column if not exists seen text[] not null default '{}';

-- the machines' accounts (the walk, the sizes, the rule checks): a script
-- writes its number here BEFORE it makes the account, so the console never
-- shows one among the real shops — not even while a run is going. The script
-- takes the line away with the account; a line still here with its account is
-- a leftover (a run cut off), swept from the console's «التجربة» page.
create table if not exists public.robots (
  phone    text primary key check (phone ~ '^\+216[0-9]{8}$'),
  made_at  timestamptz not null default now()
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

-- the year paid for: until when (null: not paid yet); the offer's clock starts the first time the owner sees it
alter table public.shops add column if not exists paid_until timestamptz;
alter table public.shops add column if not exists offer_at timestamptz;

-- an owner's payment: the way they chose, then the founder's word (paid or not);
-- 15 months for the price of 12 when it came within 48 hours of opening the shop
create table if not exists public.payments (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  method      text not null,
  amount      int not null default 120,
  months      int not null default 12 check (months between 1 and 36),
  status      text not null default 'pending' check (status in ('pending', 'paid', 'refused')),
  created_at  timestamptz not null default now(),
  decided_at  timestamptz
);
create index if not exists payments_shop_idx on public.payments (shop_id, created_at desc);
-- the ways: the five, and "contact" (the owner called or wrote on WhatsApp to pay)
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('card', 'd17', 'virement', 'versement', 'mandat', 'contact'));

-- the shop's logo (optional): a picture in the public «logos» box, set by the owner
alter table public.shops add column if not exists logo text check (logo is null or (logo ~ '^https://' and char_length(logo) <= 300));

-- how long a customer waits between two tampons here, in minutes, the owner's
-- choice on the card: 60 (an hour) by default; 0 = no wait; 1440 = once a day
-- (a new day in Tunis, not 24 hours); up to 72 hours
alter table public.shops add column if not exists stamp_gap int not null default 60;
alter table public.shops drop constraint if exists shops_stamp_gap_check;
alter table public.shops add constraint shops_stamp_gap_check check (stamp_gap between 0 and 4320);

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
-- the card this customer is on: the shop's goal and gift on the day it started
alter table public.cards add column if not exists goal int check (goal between 3 and 30);
alter table public.cards add column if not exists gift text;
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
-- the counter's private radio: Realtime topic "pointili:<signal>", told of every scan
alter table public.shops add column if not exists signal text not null default encode(extensions.gen_random_bytes(16), 'hex');

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
-- a gift remembers what it was, whatever the card says later
alter table public.moments add column if not exists gift text;

-- every door that counts (signing in, making an account): one row per try
create table if not exists public.tries (
  id          bigint generated always as identity primary key,
  key         text not null,
  at          timestamptz not null default now()
);
create index if not exists tries_key_idx on public.tries (key, at desc);

-- the founder's settings: the number owners call, the two videos
create table if not exists public.settings (
  key         text primary key check (key in ('support_phone', 'video1_url', 'video1_label', 'video2_url', 'video2_label')),
  value       text not null default '' check (char_length(value) <= 300),
  updated_at  timestamptz not null default now()
);
-- the founder's payment details (where the owners pay), kept with the other settings
alter table public.settings drop constraint if exists settings_key_check;
alter table public.settings add constraint settings_key_check check (key in (
  'support_phone', 'video1_url', 'video1_label', 'video2_url', 'video2_label',
  'pay_card_url', 'pay_d17', 'pay_name', 'pay_bank', 'pay_rib', 'pay_mandat'));

-- ═══ traffic: who came, from where, what they did, how long, where they left
-- a visit is one sitting (30 minutes of quiet ends it); a view is one screen
-- of it (a page, or a step inside one: the card's questions, the scan's
-- answers); a tap is where a finger landed (0..1 of the screen); a signal is
-- anything else worth counting (a form refused, a video played)
create table if not exists public.visits (
  id          uuid primary key,
  visitor     text not null check (char_length(visitor) between 8 and 64),
  user_id     uuid references auth.users (id) on delete set null,
  started_at  timestamptz not null default now(),
  last_at     timestamptz not null default now(),
  landing     text,
  referrer    text,
  source      text,
  medium      text,
  campaign    text,
  content     text,
  term        text,
  fbclid      boolean not null default false,
  device      text,
  os          text,
  browser     text,
  screen      text,
  lang        text,
  country     text,
  city        text,
  is_admin    boolean not null default false,
  is_bot      boolean not null default false
);
create index if not exists visits_started_idx on public.visits (started_at desc);
create index if not exists visits_visitor_idx on public.visits (visitor);

create table if not exists public.views (
  id          uuid primary key,
  visit_id    uuid not null references public.visits (id) on delete cascade,
  path        text not null,
  route       text not null,
  screen      text,
  entered_at  timestamptz not null,
  left_at     timestamptz,
  active_ms   int not null default 0,
  vw          int,
  vh          int,
  next_route  text
);
create index if not exists views_visit_idx on public.views (visit_id, entered_at);
create index if not exists views_route_idx on public.views (route, screen, entered_at desc);

create table if not exists public.taps (
  id          bigint generated always as identity primary key,
  view_id     uuid not null references public.views (id) on delete cascade,
  visit_id    uuid not null references public.visits (id) on delete cascade,
  route       text not null,
  screen      text,
  at          timestamptz not null,
  x           real not null check (x between 0 and 1),
  y           real not null check (y between 0 and 1),
  target      text,
  kind        text,
  rage        boolean not null default false,
  dead        boolean not null default false,
  external    boolean not null default false
);
create index if not exists taps_route_idx on public.taps (route, screen, at desc);
create index if not exists taps_view_idx on public.taps (view_id);

create table if not exists public.signals (
  id          bigint generated always as identity primary key,
  visit_id    uuid not null references public.visits (id) on delete cascade,
  view_id     uuid,
  route       text,
  screen      text,
  at          timestamptz not null default now(),
  name        text not null check (char_length(name) <= 40),
  detail      text check (char_length(detail) <= 200)
);
create index if not exists signals_visit_idx on public.signals (visit_id, at);

-- ═══ news for the owners: something new to know, shown once to each ═══════
-- a piece of news (written by the founder in the console): a title, a few
-- words, a picture, and maybe a button that leads to the thing itself;
-- `only_people` keeps it to a few accounts (the tests use it)
create table if not exists public.news (
  id            uuid primary key default gen_random_uuid(),
  title         text not null check (char_length(title) between 2 and 80),
  body          text not null default '' check (char_length(body) <= 400),
  icon          text not null default 'sparkles' check (icon ~ '^[a-z0-9]{2,20}$'),
  cta_label     text check (cta_label is null or char_length(cta_label) between 2 and 30),
  cta_href      text check (cta_href is null or (char_length(cta_href) <= 300 and (cta_href ~ '^/([^/\\]|$)' or cta_href ~ '^https://'))),
  only_people   uuid[],
  active        boolean not null default true,
  published_at  timestamptz not null default now()
);
-- who saw which (the first time is the only time), and who tapped its button
create table if not exists public.news_views (
  news_id     uuid not null references public.news (id) on delete cascade,
  person_id   uuid not null references auth.users (id) on delete cascade,
  seen_at     timestamptz not null default now(),
  clicked_at  timestamptz,
  primary key (news_id, person_id)
);
create index if not exists news_views_person_idx on public.news_views (person_id, seen_at desc);
-- a small tour: a few steps, each a picture, a title and a few words (the card's button comes last)
alter table public.news add column if not exists steps jsonb check (steps is null or jsonb_typeof(steps) = 'array');
-- for the test accounts only (a news piece tried before it goes to everyone)
alter table public.news add column if not exists only_testers boolean not null default false;
-- the first slide's screen (a screenshot in public/news), like a step's `pic`
alter table public.news add column if not exists pic text check (pic is null or pic ~ '^/news/[a-z0-9-]{2,60}\.(webp|png|jpg)$');

-- cards and gifts from before cards were promises
update public.cards c set goal = s.goal, gift = s.gift from public.shops s where s.id = c.shop_id and c.goal is null and s.goal is not null;
update public.moments m set gift = c.gift from public.cards c where c.id = m.card_id and m.kind = 'gift' and m.gift is null;

do $$
declare t text;
begin
  foreach t in array array['people', 'shops', 'cards', 'codes', 'moments', 'tries', 'settings', 'visits', 'views', 'taps', 'signals', 'news', 'news_views', 'payments', 'robots'] loop
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
  select array[
    -- food and drink
    'cafe', 'juice', 'bakery', 'pastry', 'viennoiserie', 'crepes', 'restaurant', 'fastfood', 'snack', 'pizza', 'grill',
    -- the house's shopping
    'grocery', 'market', 'butcher', 'fish', 'veggies', 'roastery',
    -- beauty and health
    'barber', 'hair', 'beauty', 'nails', 'perfume', 'parapharmacy', 'hammam', 'optics', 'gym',
    -- things
    'clothes', 'fripe', 'shoes', 'bags', 'jewelry', 'phones', 'electronics', 'books', 'toys', 'gifts', 'flowers', 'pets', 'hardware',
    -- services and fun
    'carwash', 'mechanic', 'laundry', 'tailor', 'print', 'photo', 'courses', 'games', 'pitch', 'events', 'other']
$$;

-- «قهوة بلاش» and «  قهوة   بلاش » are the same gift
create or replace function public.same_gift(a text, b text) returns boolean
language sql immutable set search_path = '' as $$
  select lower(regexp_replace(trim(coalesce(a, '')), '\s+', ' ', 'g')) = lower(regexp_replace(trim(coalesce(b, '')), '\s+', ' ', 'g'))
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

-- is a gift waiting on this card?
-- when a customer may take the next tampon at a shop, after one at p_last: never
-- held back (null) with no wait; the next day in Tunis for «once a day»
create or replace function public.next_stamp_at(p_last timestamptz, p_gap int) returns timestamptz
language sql stable set search_path = '' as $$
  select case
    when p_last is null or coalesce(p_gap, 60) <= 0 then null
    when p_gap = 1440 then (date_trunc('day', p_last at time zone 'Africa/Tunis') + interval '1 day') at time zone 'Africa/Tunis'
    else p_last + make_interval(mins => p_gap)
  end
$$;

create or replace function public.waits(p_card uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.moments m where m.card_id = p_card and m.kind = 'gift' and m.given_at is null)
$$;

-- what a customer's card looks like, everywhere it is shown: the goal and the
-- gift are this card's own (the promise); "next" is the shop's card of today
-- when it differs — it starts for this customer after this gift
create or replace function public.card_view(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'stamps', c.stamps, 'gifts', c.gifts, 'last_at', c.last_at,
    'ready', w.waiting, 'waiting', w.waiting,
    'shop', jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo,
                               'goal', coalesce(c.goal, s.goal), 'gift', coalesce(c.gift, s.gift)),
    'next', case when s.goal is not null
                  and (coalesce(c.goal, s.goal) <> s.goal or not public.same_gift(coalesce(c.gift, s.gift), s.gift))
                 then jsonb_build_object('goal', s.goal, 'gift', s.gift) end)
  from public.cards c join public.shops s on s.id = c.shop_id
  cross join lateral (select public.waits(c.id) as waiting) w
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
    -- the account is gone (deleted while this phone was still signed in): nobody
    if p.id is null then return null; end if;
  end if;
  select * into s from public.shops where owner_id = v_uid;
  return jsonb_build_object(
    'id', v_uid, 'name', p.name, 'phone', p.phone, 'admin', p.is_admin, 'seen', to_jsonb(p.seen), 'code', p.code, 'tester', p.is_tester,
    'shop', case when s.id is null then null else jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'goal', s.goal, 'gift', s.gift, 'color', s.color, 'paused', s.paused,
      'signal', s.signal, 'logo', s.logo, 'stamp_gap', s.stamp_gap) end);
end $$;

-- a one-time note seen: added once to the person's list (unknown notes refused)
create or replace function public.see(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  if p_key is null or p_key not in ('coach', 'logo_tip', 'card_hello', 'offer') then return public.err('invalid'); end if;
  update public.people set seen = array_append(seen, p_key) where id = auth.uid() and not (p_key = any (seen));
  return jsonb_build_object('ok', true);
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

-- the card, made or changed. What happens to the customers' cards:
--   · at rest (no stamps, no gift waiting): the new card, at once;
--   · on the way, same gift, fewer stamps: the easier goal, at once — and a
--     card that it fills gets its gift waiting now;
--   · on the way otherwise (more stamps, another gift): they finish the card
--     they started; the new one is theirs after that gift.
-- the owner's card: how many tampons, which gift, the colour, the wait. The
-- customers on their way keep the card they started (an easier one — the
-- same gift for fewer — reaches them at once) unless the owner says `move`:
-- then everyone on their way takes the new card now, their tampons kept (and
-- the gift at once for whoever already has enough). A gift waiting stays.
drop function if exists public.save_card(int, text, text);
drop function if exists public.save_card(int, text, text, int);
create or replace function public.save_card(p_goal int, p_gift text, p_color text, p_gap int default null, p_move boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_gift text := trim(coalesce(p_gift, '')); v_eased int; v_filled int; v_kept int; v_moved int := 0;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if p_goal is null or p_goal not between 3 and 30 then return public.err('invalid_goal'); end if;
  if char_length(v_gift) not between 2 and 60 then return public.err('invalid_gift'); end if;
  if p_gap is not null and p_gap not between 0 and 4320 then return public.err('invalid_gap'); end if;
  if coalesce(p_color, '') !~ '^#[0-9A-Fa-f]{6}$' then p_color := s.color; end if;
  update public.shops set goal = p_goal, gift = v_gift, color = upper(p_color), stamp_gap = coalesce(p_gap, stamp_gap) where id = s.id;

  update public.cards c set goal = p_goal, gift = v_gift
  where c.shop_id = s.id and c.stamps = 0 and not public.waits(c.id);

  if coalesce(p_move, false) then
    update public.cards c set goal = p_goal, gift = v_gift
    where c.shop_id = s.id and c.stamps > 0 and not public.waits(c.id)
      and (c.goal is distinct from p_goal or not public.same_gift(c.gift, v_gift));
    get diagnostics v_moved = row_count;
  end if;

  update public.cards c set goal = p_goal
  where c.shop_id = s.id and c.stamps > 0 and coalesce(c.goal, 999) > p_goal and public.same_gift(c.gift, v_gift) and not public.waits(c.id);
  get diagnostics v_eased = row_count;

  insert into public.moments (shop_id, card_id, kind, gift)
  select s.id, c.id, 'gift', coalesce(c.gift, v_gift) from public.cards c
  where c.shop_id = s.id and c.stamps >= coalesce(c.goal, p_goal) and not public.waits(c.id);
  get diagnostics v_filled = row_count;

  select count(*) into v_kept from public.cards c
  where c.shop_id = s.id and c.stamps > 0 and not public.waits(c.id)
    and (c.goal is distinct from p_goal or not public.same_gift(c.gift, v_gift));
  return jsonb_build_object('ok', true, 'eased', v_eased, 'filled', v_filled, 'kept', v_kept, 'moved', v_moved);
end $$;

-- before a change of card is saved: what it would do to the customers. `way`:
-- on their way with a card that differs; `eased`: of them, the same gift for
-- fewer tampons (it reaches them anyway); `win_now`: of them, already enough
-- tampons for the new goal (they would win at once if moved); `waiting`: a
-- gift waiting, kept whatever happens
create or replace function public.card_change(p_goal int, p_gift text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype; v_gift text := trim(coalesce(p_gift, ''));
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return (
    select jsonb_build_object('ok', true,
      'way', count(*) filter (where c.stamps > 0 and not w.waiting and (c.goal is distinct from p_goal or not public.same_gift(c.gift, v_gift))),
      'eased', count(*) filter (where c.stamps > 0 and not w.waiting and coalesce(c.goal, 999) > p_goal and public.same_gift(c.gift, v_gift)),
      'win_now', count(*) filter (where c.stamps > 0 and not w.waiting and c.stamps >= p_goal and (c.goal is distinct from p_goal or not public.same_gift(c.gift, v_gift))),
      'waiting', count(*) filter (where w.waiting))
    from public.cards c cross join lateral (select public.waits(c.id) as waiting) w
    where c.shop_id = s.id);
end $$;

-- how many customers are on their way (stamps, no gift waiting): what a change of card would touch
create or replace function public.in_progress() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'n', (select count(*) from public.cards c where c.shop_id = s.id and c.stamps > 0 and not public.waits(c.id)));
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
    'given_today', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at >= public.tunis_today()),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''), 'gift', coalesce(m.gift, c.gift, s.gift)) order by m.created_at)
      from public.moments m join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id
      where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'kind', m.kind, 'given', m.given_at is not null,
                                          'name', nullif(split_part(p.name, ' ', 1), ''), 'stamps', c.stamps, 'goal', coalesce(c.goal, s.goal),
                                          'gift', coalesce(m.gift, c.gift, s.gift))
                       order by m.created_at desc)
      from (select * from public.moments where shop_id = s.id order by created_at desc limit 8) m
      join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb));
end $$;

-- the owner's numbers: today, this week, all of it, the last seven days one
-- by one, and the customers who come back the most
create or replace function public.shop_stats() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true,
    'customers',  (select count(*) from public.cards where shop_id = s.id),
    'stamps',     (select count(*) from public.moments where shop_id = s.id and kind = 'stamp'),
    'today',      (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'week',       (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today() - interval '6 days'),
    'given',      (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null),
    'waiting',    (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is null),
    -- a customer who came back: more than one tampon on their card
    'returning',  (select count(*) from public.cards where shop_id = s.id and stamps > 1),
    'new_week',   (select count(*) from public.cards where shop_id = s.id and created_at >= public.tunis_today() - interval '6 days'),
    'days', coalesce((
      select jsonb_agg(jsonb_build_object('day', d::date, 'stamps', (
        select count(*) from public.moments m
        where m.shop_id = s.id and m.kind = 'stamp'
          and m.created_at >= d and m.created_at < d + interval '1 day')) order by d)
      from generate_series(public.tunis_today() - interval '6 days', public.tunis_today(), interval '1 day') d), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(x) from (
        select jsonb_build_object('name', nullif(split_part(p.name, ' ', 1), ''), 'stamps', c.stamps,
                                  'goal', coalesce(c.goal, s.goal), 'gifts', c.gifts, 'last_at', c.last_at) as x
        from public.cards c left join public.people p on p.id = c.user_id
        where c.shop_id = s.id
        order by c.stamps desc, c.last_at desc nulls last
        limit 8) q), '[]'::jsonb));
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
                                        'goal', coalesce(c.goal, s.goal), 'gift', coalesce(c.gift, s.gift), 'ready', public.waits(c.id))
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
                                          'stamps', c.stamps, 'goal', coalesce(c.goal, s.goal)) order by m.created_at)
      from (select * from public.moments where shop_id = s.id and kind = 'stamp' and created_at > coalesce(p_since, now())
            order by created_at desc limit 20) m
      join public.cards c on c.id = m.card_id
      left join public.people p on p.id = c.user_id
    ), '[]'::jsonb),
    'gifts', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''),
                                          'gift', coalesce(m.gift, c.gift, s.gift)) order by m.created_at)
      from public.moments m
      join public.cards c on c.id = m.card_id
      left join public.people p on p.id = c.user_id
      where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null
    ), '[]'::jsonb)
  );
end $$;

-- the shop hands the gift over: the card's goal of stamps leaves it, and the
-- rest carries over to the next card — the shop's card as it is today
create or replace function public.give(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; m public.moments%rowtype; c public.cards%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select * into m from public.moments where id = p_moment and shop_id = s.id and kind = 'gift' for update;
  if m.id is null then return public.err('not_found'); end if;
  if m.given_at is not null then return jsonb_build_object('ok', true, 'already', true); end if;
  perform 1 from public.cards where id = m.card_id for update;
  update public.moments set given_at = now() where id = m.id;
  update public.cards set stamps = greatest(stamps - coalesce(goal, s.goal), 0), gifts = gifts + 1, goal = s.goal, gift = s.gift
  where id = m.card_id returning * into c;
  if c.stamps >= c.goal then
    insert into public.moments (shop_id, card_id, kind, gift) values (s.id, c.id, 'gift', c.gift);
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
    return jsonb_build_object('ok', true, 'shop', s.name, 'color', s.color, 'kind', s.kind, 'logo', s.logo);
  end if;
  if k.used_at is not null or k.held_hash is not null then return public.err('used'); end if;
  if k.expires_at <= now() then return public.err('expired'); end if;
  if s.paused then return public.err('paused'); end if;
  update public.codes set held_hash = public.sha(p_hold), held_until = now() + interval '20 minutes' where id = k.id;
  return jsonb_build_object('ok', true, 'shop', s.name, 'color', s.color, 'kind', s.kind, 'logo', s.logo);
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
  insert into public.cards (shop_id, user_id, goal, gift) values (s.id, v_uid, s.goal, s.gift) on conflict (shop_id, user_id) do nothing;
  select * into c from public.cards where shop_id = s.id and user_id = v_uid for update;

  if public.next_stamp_at(c.last_at, s.stamp_gap) > now() then
    return public.err('too_soon', jsonb_build_object('next_at', public.next_stamp_at(c.last_at, s.stamp_gap), 'card', public.card_view(c.id)));
  end if;

  v_waiting := public.waits(c.id);
  update public.codes set used_at = now(), used_by = v_uid where id = k.id;
  -- a card at rest follows the shop's card of today; a card on its way keeps the one it started
  update public.cards set
    goal = case when (stamps = 0 and not v_waiting) or goal is null then s.goal else goal end,
    gift = case when (stamps = 0 and not v_waiting) or gift is null then s.gift else gift end,
    stamps = stamps + 1, last_at = now()
  where id = c.id returning * into c;
  insert into public.moments (shop_id, card_id, kind) values (s.id, c.id, 'stamp');
  if c.stamps >= c.goal and not v_waiting then
    insert into public.moments (shop_id, card_id, kind, gift) values (s.id, c.id, 'gift', c.gift);
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
           select jsonb_agg(jsonb_build_object('kind', m.kind, 'at', coalesce(m.given_at, m.created_at), 'given', m.given_at is not null, 'gift', m.gift)
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

-- three kinds of account, for the founder's eyes:
--   · real: an owner or a customer out there;
--   · test: the founder's own (an admin) and the ones marked as a test
--     (is_tester) — shown apart, under «التجربة», out of every number;
--   · robot: made by a script (its number is on the robots list) — never
--     shown to a real founder at all.
-- (known by the login itself — its number is in the login's address — because a
-- person's row can exist without its phone: set_name() makes one that way)
drop function if exists public.is_robot(text);
create or replace function public.is_robot(p_id uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (
    select 1 from auth.users u join public.robots r
      on r.phone in (u.raw_app_meta_data ->> 'phone', '+' || split_part(u.email, '@', 1))
    where u.id = p_id)
$$;
-- a script's own admin (the walk's) sees everything, the way the console was
-- before: its checks open the shops and the accounts the same run made
create or replace function public.sees_robots() returns boolean
language sql stable security definer set search_path = '' as $$
  select public.is_robot(auth.uid())
$$;

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_all boolean;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  return (
    with real_people as (
      select p.id from public.people p where v_all or not (p.is_admin or p.is_tester or public.is_robot(p.id))
    ), real_shops as (
      select s.id, s.goal, s.paused from public.shops s where v_all or s.owner_id in (select id from real_people)
    ), real_moments as (
      select m.kind, m.created_at, m.given_at from public.moments m where v_all or m.shop_id in (select id from real_shops)
    )
    select jsonb_build_object(
      'shops', (select count(*) from real_shops),
      'live', (select count(*) from real_shops where goal is not null and not paused),
      'paused', (select count(*) from real_shops where paused),
      'customers', (select count(distinct c.user_id) from public.cards c
                    where v_all or (c.shop_id in (select id from real_shops) and c.user_id in (select id from real_people))),
      'people', (select count(*) from real_people),
      'stamps', (select count(*) from real_moments where kind = 'stamp'),
      'today', (select count(*) from real_moments where kind = 'stamp' and created_at >= public.tunis_today()),
      'given', (select count(*) from real_moments where kind = 'gift' and given_at is not null),
      'waiting', (select count(*) from real_moments where kind = 'gift' and given_at is null),
      'tests', (select count(*) from public.shops s join public.people p on p.id = s.owner_id
                where (p.is_admin or p.is_tester) and not public.is_robot(p.id)),
      'week', coalesce((
        select jsonb_agg(jsonb_build_object('day', d.day, 'stamps', coalesce(x.n, 0)) order by d.day)
        from (select ((now() at time zone 'Africa/Tunis')::date - g)::date as day from generate_series(0, 6) g) d
        left join (select (created_at at time zone 'Africa/Tunis')::date as day, count(*) n from real_moments
                   where kind = 'stamp' and created_at >= now() - interval '8 days' group by 1) x on x.day = d.day), '[]'::jsonb)));
end $$;

-- the shops: the real ones, or (p_tests) the test ones — never both in one list
drop function if exists public.admin_shops(text);
create or replace function public.admin_shops(p_q text default null, p_tests boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_q), ''), '%', ''), '_', '') || '%'; v_all boolean;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo, 'goal', s.goal, 'gift', s.gift, 'paused', s.paused,
      'created_at', s.created_at, 'owner', jsonb_build_object('name', p.name, 'phone', p.phone),
      'test', coalesce(p.is_admin or p.is_tester, false),
      'customers', (select count(*) from public.cards c where c.shop_id = s.id),
      'stamps', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'stamp'),
      'today', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'stamp' and m.created_at >= public.tunis_today()),
      'last_at', (select max(m.created_at) from public.moments m where m.shop_id = s.id)) order by s.created_at desc)
    from public.shops s left join public.people p on p.id = s.owner_id
    where (p_q is null or trim(p_q) = '' or s.name ilike v_like or coalesce(p.phone, '') like v_like or coalesce(p.name, '') ilike v_like)
      and (v_all or (not public.is_robot(s.owner_id) and coalesce(p.is_admin or p.is_tester, false) = coalesce(p_tests, false)))
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
    'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo, 'goal', s.goal, 'gift', s.gift, 'paused', s.paused, 'created_at', s.created_at,
    'owner', (select jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'tester', p.is_tester, 'admin', p.is_admin, 'robot', public.is_robot(p.id))
              from public.people p where p.id = s.owner_id),
    'customers', (select count(*) from public.cards where shop_id = s.id),
    'stamps', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp'),
    'today', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'given', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null),
    'waiting', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is null),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('at', m.created_at, 'kind', m.kind, 'given', m.given_at is not null, 'gift', m.gift,
                                          'name', nullif(p.name, ''), 'phone', public.masked(p.phone)) order by m.created_at desc)
      from (select * from public.moments where shop_id = s.id order by created_at desc limit 15) m
      join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('name', nullif(p.name, ''), 'phone', public.masked(p.phone), 'stamps', c.stamps, 'gifts', c.gifts,
                                          'goal', coalesce(c.goal, s.goal)) order by c.gifts desc, c.stamps desc)
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

-- the accounts: the real ones, or (p_tests) the test ones
drop function if exists public.admin_people(text);
create or replace function public.admin_people(p_q text default null, p_tests boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_q), ''), '%', ''), '_', '') || '%'; v_all boolean;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  return coalesce((
    select jsonb_agg(item order by created_at desc) from (
      select p.created_at, jsonb_build_object(
        'id', p.id, 'name', p.name, 'phone', p.phone, 'admin', p.is_admin, 'tester', p.is_tester, 'created_at', p.created_at,
        'shop', (select s.name from public.shops s where s.owner_id = p.id),
        'cards', (select count(*) from public.cards c where c.user_id = p.id),
        'stamps', (select count(*) from public.moments m join public.cards c on c.id = m.card_id where c.user_id = p.id and m.kind = 'stamp')) as item
      from public.people p
      where (p_q is null or trim(p_q) = '' or p.name ilike v_like or coalesce(p.phone, '') like v_like)
        and (v_all or (not public.is_robot(p.id) and (p.is_admin or p.is_tester) = coalesce(p_tests, false)))
      order by p.created_at desc limit 300
    ) x
  ), '[]'::jsonb);
end $$;

-- one person: who, their shop, their cards
create or replace function public.admin_person(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare p public.people%rowtype;
begin
  perform public.require_admin();
  select * into p from public.people where id = p_id;
  if p.id is null then return null; end if;
  return jsonb_build_object(
    'id', p.id, 'name', p.name, 'phone', p.phone, 'admin', p.is_admin, 'tester', p.is_tester, 'robot', public.is_robot(p.id), 'created_at', p.created_at,
    'shop', (select jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo) from public.shops s where s.owner_id = p.id),
    'cards', coalesce((
      select jsonb_agg(jsonb_build_object('shop', s.name, 'kind', s.kind, 'color', s.color, 'stamps', c.stamps,
                                          'goal', coalesce(c.goal, s.goal), 'gifts', c.gifts, 'last_at', c.last_at)
                       order by c.last_at desc nulls last)
      from public.cards c join public.shops s on s.id = c.shop_id where c.user_id = p.id), '[]'::jsonb));
end $$;

-- the founder's word on an account: a test (kept apart from the real ones, out
-- of the numbers) or a real one again
create or replace function public.admin_set_tester(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.people set is_tester = coalesce(p_on, false) where id = p_id;
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- the machines' leftovers: accounts whose number is still on the robots list
-- (a run cut off before it cleaned up)
create or replace function public.admin_robots() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'accounts', (select count(*) from auth.users u where public.is_robot(u.id)),
    'shops', (select count(*) from public.shops s where public.is_robot(s.owner_id)),
    'oldest', (select min(r.made_at) from public.robots r join auth.users u on '+' || split_part(u.email, '@', 1) = r.phone));
end $$;

-- …and the sweep: every robot account goes (its shop, its cards, its login), and the list is emptied of the gone
create or replace function public.admin_sweep_robots() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_n int;
begin
  perform public.require_admin();
  delete from auth.users u where public.is_robot(u.id);
  get diagnostics v_n = row_count;
  delete from public.robots r where not exists (select 1 from auth.users u where '+' || split_part(u.email, '@', 1) = r.phone);
  return jsonb_build_object('ok', true, 'removed', v_n);
end $$;

-- ═══ the shop gives the tampon itself ══════════════════════════════════════
-- the customer behind a code (typed, or scanned from their wallet) or a
-- phone number: 6 digits are a code, 8 (or 216 + 8) a number
create or replace function public.person_of(p_who text) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare d text := regexp_replace(coalesce(p_who, ''), '\D', '', 'g'); v uuid;
begin
  if length(d) = 6 then select id into v from public.people where code = d;
  elsif length(d) = 8 then select id into v from public.people where phone = '+216' || d;
  elsif length(d) = 11 and d like '216%' then select id into v from public.people where phone = '+' || d;
  end if;
  return v;
end $$;

-- the gift a card holds for the shop to hand over, if any: which one, and what
create or replace function public.waiting_gift(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('id', m.id, 'gift', coalesce(m.gift, c.gift))
  from public.moments m join public.cards c on c.id = m.card_id
  where m.card_id = p_card and m.kind = 'gift' and m.given_at is null
  order by m.created_at limit 1
$$;

-- who a code is, for the shop about to give them a tampon: the first name, their card here, and a gift waiting
create or replace function public.customer_at(p_who text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); s public.shops%rowtype; v_person uuid; c public.cards%rowtype; v_name text;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  select * into s from public.shops where owner_id = v_uid;
  if s.id is null then return public.err('no_shop'); end if;
  if not public.try_once('look:' || v_uid, 60, 10) then return public.err('too_many'); end if;
  v_person := public.person_of(p_who);
  if v_person is null then return public.err('unknown'); end if;
  if v_person = v_uid then return public.err('own_shop'); end if;
  select split_part(coalesce(nullif(trim(name), ''), ''), ' ', 1) into v_name from public.people where id = v_person;
  select * into c from public.cards where shop_id = s.id and user_id = v_person;
  return jsonb_build_object('ok', true, 'name', nullif(v_name, ''),
    'card', case when c.id is null then null else public.card_view(c.id) end,
    'waiting', case when c.id is null then null else public.waiting_gift(c.id) end);
end $$;

-- the tampon, given by the shop: the same rules as a scan (one an hour, the
-- card's promise, the gift at the goal); thirty tries in ten minutes at most
create or replace function public.give_stamp(p_who text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  s public.shops%rowtype;
  c public.cards%rowtype;
  v_person uuid;
  v_name text;
  v_gift boolean := false;
  v_waiting boolean;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  select * into s from public.shops where owner_id = v_uid;
  if s.id is null then return public.err('no_shop'); end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused then return public.err('paused'); end if;
  if not public.try_once('give:' || v_uid, 30, 10) then return public.err('too_many'); end if;
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
  update public.cards set
    goal = case when (stamps = 0 and not v_waiting) or goal is null then s.goal else goal end,
    gift = case when (stamps = 0 and not v_waiting) or gift is null then s.gift else gift end,
    stamps = stamps + 1, last_at = now()
  where id = c.id returning * into c;
  insert into public.moments (shop_id, card_id, kind) values (s.id, c.id, 'stamp');
  if c.stamps >= c.goal and not v_waiting then
    insert into public.moments (shop_id, card_id, kind, gift) values (s.id, c.id, 'gift', c.gift);
    v_gift := true;
  end if;
  return jsonb_build_object('ok', true, 'gift', v_gift, 'name', nullif(v_name, ''), 'card', public.card_view(c.id), 'waiting', public.waiting_gift(c.id));
end $$;

-- ═══ paying for the year ═══════════════════════════════════════════════════
-- the shop's year: paid until when, the offer's end (48 hours from the first
-- time the owner sees it: 3 more months), and the last payment asked
create or replace function public.my_payment() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); s public.shops%rowtype; y public.payments%rowtype;
begin
  if v_uid is null then return null; end if;
  select * into s from public.shops where owner_id = v_uid;
  if s.id is null then return null; end if;
  if s.offer_at is null and (s.paid_until is null or s.paid_until < now()) then
    update public.shops set offer_at = now() where id = s.id returning * into s;
  end if;
  select * into y from public.payments where shop_id = s.id order by created_at desc limit 1;
  return jsonb_build_object(
    'paid_until', s.paid_until,
    'paid', s.paid_until is not null and s.paid_until > now(),
    'offer_until', s.offer_at + interval '48 hours',
    'offer', (s.paid_until is null or s.paid_until <= now()) and s.offer_at is not null and now() <= s.offer_at + interval '48 hours',
    'last', case when y.id is null then null else jsonb_build_object('id', y.id, 'method', y.method, 'months', y.months, 'status', y.status, 'at', y.created_at) end);
end $$;

-- the owner chose a way to pay and says it is sent: one waiting at a time
create or replace function public.pay_request(p_method text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); s public.shops%rowtype; v_months int; v_id uuid;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  select * into s from public.shops where owner_id = v_uid;
  if s.id is null then return public.err('no_shop'); end if;
  if p_method is null or p_method not in ('card', 'd17', 'virement', 'versement', 'mandat', 'contact') then return public.err('invalid'); end if;
  v_months := case when s.offer_at is not null and now() <= s.offer_at + interval '48 hours' then 15 else 12 end;
  select id into v_id from public.payments where shop_id = s.id and status = 'pending' order by created_at desc limit 1;
  if v_id is null then
    insert into public.payments (shop_id, method, months) values (s.id, p_method, v_months) returning id into v_id;
  else
    update public.payments set method = p_method, created_at = now() where id = v_id;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id, 'months', v_months);
end $$;

-- the founder's list: every payment asked, the newest first, with the shop and its owner
create or replace function public.admin_payments() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', y.id, 'method', y.method, 'amount', y.amount, 'months', y.months, 'status', y.status, 'at', y.created_at, 'decided_at', y.decided_at,
      'shop', jsonb_build_object('id', s.id, 'name', s.name, 'paid_until', s.paid_until, 'logo', s.logo, 'kind', s.kind, 'color', s.color),
      'owner', jsonb_build_object('name', p.name, 'phone', p.phone, 'tester', p.is_tester)) order by y.created_at desc)
    from public.payments y join public.shops s on s.id = y.shop_id left join public.people p on p.id = s.owner_id
    where public.sees_robots() or not public.is_robot(s.owner_id)
  ), '[]'::jsonb);
end $$;

-- the founder's word on a payment: paid (the shop's year starts, or goes on) or not
create or replace function public.admin_payment_decide(p_id uuid, p_paid boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y public.payments%rowtype;
begin
  perform public.require_admin();
  select * into y from public.payments where id = p_id for update;
  if y.id is null then return public.err('invalid'); end if;
  if y.status <> 'pending' then return public.err('done'); end if;
  update public.payments set status = case when p_paid then 'paid' else 'refused' end, decided_at = now() where id = p_id;
  if p_paid then
    update public.shops set paid_until = greatest(coalesce(paid_until, now()), now()) + make_interval(months => y.months) where id = y.shop_id;
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- ═══ news: the owner's side ════════════════════════════════════════════════
-- the one piece of news to show this owner now, or null: live, published
-- after their shop opened (a new owner gets no old news), never shown to
-- them before — and one a day at the most, the newest first
create or replace function public.news_next() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_opened timestamptz;
begin
  if v_uid is null then return null; end if;
  select created_at into v_opened from public.shops where owner_id = v_uid;
  if v_opened is null then return null; end if;
  if exists (select 1 from public.news_views where person_id = v_uid and seen_at >= public.tunis_today()) then return null; end if;
  return (
    select jsonb_build_object('id', n.id, 'title', n.title, 'body', n.body, 'icon', n.icon, 'cta_label', n.cta_label, 'cta_href', n.cta_href, 'steps', n.steps, 'pic', n.pic)
    from public.news n
    where n.active and n.published_at <= now() and n.published_at > v_opened
      and (n.only_people is null or v_uid = any (n.only_people))
      and (not n.only_testers or exists (select 1 from public.people t where t.id = v_uid and t.is_tester))
      and not exists (select 1 from public.news_views w where w.news_id = n.id and w.person_id = v_uid)
    order by n.published_at desc
    limit 1);
end $$;

-- shown to this person: written the first time, never again
create or replace function public.news_seen(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  insert into public.news_views (news_id, person_id)
  select p_id, auth.uid() where exists (select 1 from public.news where id = p_id)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

-- its button tapped
create or replace function public.news_clicked(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  insert into public.news_views (news_id, person_id, clicked_at)
  select p_id, auth.uid(), now() where exists (select 1 from public.news where id = p_id)
  on conflict (news_id, person_id) do update set clicked_at = coalesce(public.news_views.clicked_at, now());
  return jsonb_build_object('ok', true);
end $$;

-- ═══ news: the founder's side ══════════════════════════════════════════════
-- the owners a piece of news is for: every shop opened before it was
-- published (the founder's own shops too, marked admin — left out of the counts;
-- a script's shops as well, except in the eyes of that script's own founder)
create or replace function public.news_audience(p_id uuid) returns table (person_id uuid, name text, phone text, shop text, admin boolean)
language sql stable security definer set search_path = '' as $$
  select p.id, p.name, p.phone, s.name, p.is_admin or p.is_tester or (public.is_robot(p.id) and not public.sees_robots())
  from public.news n
  join public.shops s on s.created_at < n.published_at
  join public.people p on p.id = s.owner_id
  where n.id = p_id and (n.only_people is null or p.id = any (n.only_people)) and (not n.only_testers or p.is_tester)
$$;

drop function if exists public.admin_news_save(text, text, text, text, text, uuid[]);
create or replace function public.admin_news_save(p_title text, p_body text, p_icon text, p_cta_label text, p_cta_href text, p_only uuid[] default null, p_steps jsonb default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_admin();
  insert into public.news (title, body, icon, cta_label, cta_href, only_people, steps)
  values (trim(p_title), coalesce(trim(p_body), ''), coalesce(nullif(trim(p_icon), ''), 'sparkles'),
          nullif(trim(coalesce(p_cta_label, '')), ''), nullif(trim(coalesce(p_cta_href, '')), ''), p_only, p_steps)
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
exception when check_violation then
  return public.err('invalid');
end $$;

create or replace function public.admin_news_list() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', n.id, 'title', n.title, 'body', n.body, 'icon', n.icon, 'cta_label', n.cta_label, 'cta_href', n.cta_href, 'steps', n.steps,
      'active', n.active, 'published_at', n.published_at, 'only', n.only_people is not null,
      'audience', (select count(*) from public.news_audience(n.id) a where not a.admin),
      'seen', (select count(*) from public.news_audience(n.id) a join public.news_views w on w.news_id = n.id and w.person_id = a.person_id where not a.admin),
      'clicked', (select count(*) from public.news_audience(n.id) a join public.news_views w on w.news_id = n.id and w.person_id = a.person_id where not a.admin and w.clicked_at is not null))
      order by n.published_at desc)
    from public.news n
  ), '[]'::jsonb);
end $$;

-- one piece of news: who it was for, who saw it (and when), who tapped its button, who not yet
create or replace function public.admin_news(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return (
    select jsonb_build_object(
      'id', n.id, 'title', n.title, 'body', n.body, 'icon', n.icon, 'cta_label', n.cta_label, 'cta_href', n.cta_href, 'steps', n.steps,
      'active', n.active, 'published_at', n.published_at, 'only', n.only_people is not null,
      'people', coalesce((
        select jsonb_agg(jsonb_build_object('id', a.person_id, 'name', a.name, 'phone', a.phone, 'shop', a.shop, 'admin', a.admin,
                                            'seen_at', w.seen_at, 'clicked_at', w.clicked_at)
                         order by w.seen_at desc nulls last, a.shop)
        from public.news_audience(n.id) a
        left join public.news_views w on w.news_id = n.id and w.person_id = a.person_id), '[]'::jsonb))
    from public.news n where n.id = p_id);
end $$;

create or replace function public.admin_news_set_active(p_id uuid, p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.news set active = p_active where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

create or replace function public.admin_news_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.news where id = p_id;
  return jsonb_build_object('ok', found);
end $$;

-- ═══ the founder's settings ════════════════════════════════════════════════
create or replace function public.admin_set_setting(p_key text, p_value text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  insert into public.settings (key, value, updated_at) values (p_key, coalesce(trim(p_value), ''), now())
  on conflict (key) do update set value = excluded.value, updated_at = now();
  return jsonb_build_object('ok', true);
exception when check_violation then
  return public.err('invalid');
end $$;

-- ═══ the founder's traffic ═════════════════════════════════════════════════
-- p_all: with the founder's own visits and the robots (headless browsers, the
-- test walks, crawlers); without them by default
create or replace function public.admin_traffic(p_days int default 7, p_all boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 7), 90)));
begin
  perform public.require_admin();
  return (
    with v as (select * from public.visits where started_at >= v_from and (p_all or (not is_admin and not is_bot))),
    w as (
      select w.*, row_number() over (partition by w.visit_id order by w.entered_at desc) = 1 as last
      from public.views w join v on v.id = w.visit_id
    ),
    pv as (select v.id, count(w.id) as pages, coalesce(sum(w.active_ms), 0) as ms from v left join w on w.visit_id = v.id group by v.id),
    tp as (select tp.* from public.taps tp join v on v.id = tp.visit_id)
    select jsonb_build_object(
      'visitors', (select count(distinct visitor) from v),
      'visits', (select count(*) from v),
      'views', (select count(*) from w),
      'avg_ms', (select coalesce(avg(ms), 0)::bigint from pv),
      'bounce', (select coalesce(avg(case when pages <= 1 then 1.0 else 0 end), 0) from pv),
      'taps', (select count(*) from tp),
      'rage', (select count(*) from tp where rage),
      'from_ads', (select count(*) from v where source in ('facebook', 'instagram', 'fb', 'ig') or fbclid),
      'accounts', (select count(*) from public.people p where p.created_at >= v_from and not p.is_admin),
      'shops', (select count(*) from public.shops s where s.created_at >= v_from),
      'signed', (select count(*) from v where user_id is not null),
      'video_s', (select coalesce(avg(substring(s.detail from '^(\d+)s')::int), 0)::int
                  from public.signals s join v on v.id = s.visit_id where s.name = 'video_close' and s.detail ~ '^\d+s'),
      'signals', coalesce((
        select jsonb_agg(row_to_json(x) order by x.n desc) from (
          select s.name, case when s.name = 'video_close' then null else s.detail end as detail, count(*) as n, count(distinct s.visit_id) as visits
          from public.signals s join v on v.id = s.visit_id group by 1, 2 order by n desc limit 25) x), '[]'::jsonb),
      'days', coalesce((
        select jsonb_agg(jsonb_build_object('day', d.day, 'visits', coalesce(x.n, 0)) order by d.day)
        from (select ((now() at time zone 'Africa/Tunis')::date - g)::date as day from generate_series(0, least(coalesce(p_days, 7), 30) - 1) g) d
        left join (select (started_at at time zone 'Africa/Tunis')::date as day, count(*) n from v group by 1) x on x.day = d.day), '[]'::jsonb),
      'sources', coalesce((
        select jsonb_agg(row_to_json(x) order by x.visits desc) from (
          select coalesce(v.source, 'direct') as source, v.campaign, count(*) as visits, count(distinct v.visitor) as visitors,
                 round(avg(pv.pages), 1) as pages, coalesce(avg(pv.ms), 0)::bigint as ms, count(v.user_id) as signed
          from v join pv on pv.id = v.id group by 1, 2 order by visits desc limit 30) x), '[]'::jsonb),
      'devices', coalesce((
        select jsonb_agg(row_to_json(x) order by x.visits desc) from (
          select coalesce(device, '?') as device, coalesce(os, '?') as os, coalesce(browser, '?') as browser, count(*) as visits
          from v group by 1, 2, 3 order by visits desc limit 12) x), '[]'::jsonb),
      'places', coalesce((
        select jsonb_agg(row_to_json(x) order by x.visits desc) from (
          select coalesce(country, '?') as country, coalesce(city, '') as city, count(*) as visits from v group by 1, 2 order by visits desc limit 12) x), '[]'::jsonb),
      'pages', coalesce((
        select jsonb_agg(row_to_json(x) order by x.views desc) from (
          select w.route, w.screen, count(*) as views, count(distinct w.visit_id) as visits,
                 coalesce(avg(w.active_ms), 0)::bigint as ms, count(*) filter (where w.last) as exits,
                 (select count(*) from tp where tp.route = w.route and tp.screen is not distinct from w.screen) as taps,
                 (select count(*) from tp where tp.route = w.route and tp.screen is not distinct from w.screen and tp.rage) as rage
          from w group by w.route, w.screen order by views desc limit 60) x), '[]'::jsonb),
      -- each step counts the visits that also went through every step before it
      'funnel', (
        select jsonb_build_object(
          'owner', jsonb_build_array(
            jsonb_build_object('step', '/', 'visits', count(*) filter (where o1)),
            jsonb_build_object('step', '/shop/new', 'visits', count(*) filter (where o1 and o2)),
            jsonb_build_object('step', '/shop/setup', 'visits', count(*) filter (where o1 and o2 and o3)),
            jsonb_build_object('step', '/shop/card', 'visits', count(*) filter (where o1 and o2 and o3 and o4)),
            jsonb_build_object('step', '/shop/qr', 'visits', count(*) filter (where o1 and o2 and o3 and o4 and o5))),
          'customer', jsonb_build_array(
            jsonb_build_object('step', '/s/[token]', 'visits', count(*) filter (where c1)),
            jsonb_build_object('step', 's:held', 'visits', count(*) filter (where c1 and c2)),
            jsonb_build_object('step', '/join', 'visits', count(*) filter (where c1 and c2 and c3)),
            jsonb_build_object('step', 's:stamped', 'visits', count(*) filter (where c1 and c2 and c3 and c4))))
        from (
          select visit_id,
                 bool_or(route = '/' and coalesce(screen, 'welcome') = 'welcome') as o1, bool_or(route = '/shop/new') as o2,
                 bool_or(route = '/shop/setup') as o3, bool_or(route = '/shop/card') as o4, bool_or(route = '/shop/qr') as o5,
                 bool_or(route = '/s/[token]') as c1, bool_or(route = '/s/[token]' and screen = 'held') as c2,
                 bool_or(route = '/join') as c3, bool_or(route = '/s/[token]' and screen = 'stamped') as c4
          from w group by visit_id) f),
      'recent', coalesce((
        select jsonb_agg(row_to_json(x) order by x.started_at desc) from (
          select v.id, v.started_at, coalesce(v.source, 'direct') as source, v.campaign, v.device, v.os, v.browser, v.country, v.city,
                 v.landing, v.user_id is not null as signed, pv.pages, pv.ms,
                 (select count(*) from tp where tp.visit_id = v.id) as taps,
                 (select count(*) from tp where tp.visit_id = v.id and tp.rage) as rage,
                 (select jsonb_agg(coalesce(w2.route || coalesce(':' || w2.screen, ''), '') order by w2.entered_at) from (select * from w where w.visit_id = v.id order by entered_at limit 14) w2) as trail
          from v join pv on pv.id = v.id order by v.started_at desc limit 80) x), '[]'::jsonb)
    )
  );
end $$;

-- one visit, step by step: every screen with its time and taps, every signal
create or replace function public.admin_visit(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return (
    select jsonb_build_object(
      'visit', to_jsonb(v) - 'visitor',
      'visits_before', (select count(*) from public.visits o where o.visitor = v.visitor and o.started_at < v.started_at),
      'views', coalesce((
        select jsonb_agg(jsonb_build_object('route', w.route, 'screen', w.screen, 'path', w.path, 'entered_at', w.entered_at, 'left_at', w.left_at,
                                            'ms', w.active_ms, 'vw', w.vw, 'vh', w.vh,
                                            'taps', coalesce((select jsonb_agg(jsonb_build_object('at', t.at, 'x', t.x, 'y', t.y, 'target', t.target, 'kind', t.kind, 'rage', t.rage, 'dead', t.dead, 'external', t.external) order by t.at)
                                                              from public.taps t where t.view_id = w.id), '[]'::jsonb))
                         order by w.entered_at)
        from public.views w where w.visit_id = v.id), '[]'::jsonb),
      'signals', coalesce((select jsonb_agg(jsonb_build_object('at', s.at, 'name', s.name, 'detail', s.detail, 'route', s.route, 'screen', s.screen) order by s.at)
                           from public.signals s where s.visit_id = v.id), '[]'::jsonb))
    from public.visits v where v.id = p_id
  );
end $$;

-- where fingers land on one screen: the taps, and what was tapped most
create or replace function public.admin_heat(p_route text, p_screen text, p_days int default 30, p_all boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_from timestamptz := now() - make_interval(days => greatest(1, least(coalesce(p_days, 30), 90)));
begin
  perform public.require_admin();
  return (
    with t as (
      select t.* from public.taps t join public.visits v on v.id = t.visit_id
      where t.route = p_route and t.screen is not distinct from nullif(p_screen, '') and t.at >= v_from
        and (p_all or (not v.is_admin and not v.is_bot))
    ),
    w as (
      select w.* from public.views w join public.visits v on v.id = w.visit_id
      where w.route = p_route and w.screen is not distinct from nullif(p_screen, '') and w.entered_at >= v_from
        and (p_all or (not v.is_admin and not v.is_bot))
    )
    select jsonb_build_object(
      'views', (select count(*) from w),
      'ms', (select coalesce(avg(active_ms), 0)::bigint from w),
      'taps', coalesce((select jsonb_agg(jsonb_build_array(round(x::numeric, 4), round(y::numeric, 4), case when rage then 2 when dead then 1 else 0 end)) from (select * from t order by at desc limit 4000) t2), '[]'::jsonb),
      'top', coalesce((select jsonb_agg(row_to_json(x) order by x.n desc) from (
        select coalesce(target, '—') as target, coalesce(kind, '') as kind, count(*) as n, count(*) filter (where rage) as rage, bool_or(dead) as dead
        from t group by 1, 2 order by n desc limit 15) x), '[]'::jsonb)
    )
  );
end $$;

-- ═══ the server's own doors (service role only) ════════════════════════════
-- the traffic beacon: one visit, its screens, its taps and its signals, in one go
create or replace function public.track(p jsonb) returns void
language plpgsql security definer set search_path = '' as $$
declare v jsonb := p -> 'visit'; v_id uuid;
begin
  if v is null or coalesce(v ->> 'id', '') !~ '^[0-9a-f-]{36}$' then return; end if;
  v_id := (v ->> 'id')::uuid;
  insert into public.visits (id, visitor, user_id, landing, referrer, source, medium, campaign, content, term, fbclid,
                             device, os, browser, screen, lang, country, city, is_admin, is_bot)
  values (v_id, left(v ->> 'visitor', 64), nullif(v ->> 'user_id', '')::uuid, left(v ->> 'landing', 300), left(v ->> 'referrer', 300),
          left(v ->> 'source', 60), left(v ->> 'medium', 60), left(v ->> 'campaign', 120), left(v ->> 'content', 120), left(v ->> 'term', 120),
          coalesce((v ->> 'fbclid')::boolean, false), left(v ->> 'device', 20), left(v ->> 'os', 30), left(v ->> 'browser', 40),
          left(v ->> 'screen', 20), left(v ->> 'lang', 20), left(v ->> 'country', 4), left(v ->> 'city', 60),
          coalesce((v ->> 'is_admin')::boolean, false), coalesce((v ->> 'is_bot')::boolean, false))
  on conflict (id) do update set
    last_at = now(),
    user_id = coalesce(excluded.user_id, public.visits.user_id),
    is_admin = public.visits.is_admin or excluded.is_admin,
    is_bot = public.visits.is_bot or excluded.is_bot;

  insert into public.views (id, visit_id, path, route, screen, entered_at, left_at, active_ms, vw, vh, next_route)
  select (x ->> 'id')::uuid, v_id, left(x ->> 'path', 300), left(x ->> 'route', 120), nullif(left(x ->> 'screen', 60), ''),
         (x ->> 'entered_at')::timestamptz, nullif(x ->> 'left_at', '')::timestamptz,
         least(greatest(coalesce((x ->> 'active_ms')::int, 0), 0), 86400000),
         (x ->> 'vw')::int, (x ->> 'vh')::int, nullif(left(x ->> 'next', 120), '')
  from (select x from jsonb_array_elements(coalesce(p -> 'views', '[]'::jsonb)) x limit 30) xs
  where coalesce(x ->> 'id', '') ~ '^[0-9a-f-]{36}$'
  on conflict (id) do update set
    screen = coalesce(excluded.screen, public.views.screen),
    left_at = coalesce(excluded.left_at, public.views.left_at),
    active_ms = greatest(excluded.active_ms, public.views.active_ms),
    next_route = coalesce(excluded.next_route, public.views.next_route)
  where public.views.visit_id = v_id;

  insert into public.taps (view_id, visit_id, route, screen, at, x, y, target, kind, rage, dead, external)
  select w.id, v_id, w.route, w.screen, (x ->> 'at')::timestamptz,
         least(greatest((x ->> 'x')::real, 0), 1), least(greatest((x ->> 'y')::real, 0), 1),
         left(x ->> 'target', 80), left(x ->> 'kind', 12),
         coalesce((x ->> 'rage')::boolean, false), coalesce((x ->> 'dead')::boolean, false), coalesce((x ->> 'external')::boolean, false)
  from (select x from jsonb_array_elements(coalesce(p -> 'taps', '[]'::jsonb)) x limit 200) xs
  join public.views w on w.id = (case when coalesce(x ->> 'view', '') ~ '^[0-9a-f-]{36}$' then (x ->> 'view')::uuid end) and w.visit_id = v_id;

  insert into public.signals (visit_id, view_id, route, screen, at, name, detail)
  select v_id, nullif(x ->> 'view', '')::uuid, left(x ->> 'route', 120), nullif(left(x ->> 'screen', 60), ''),
         coalesce((x ->> 'at')::timestamptz, now()), left(x ->> 'name', 40), left(x ->> 'detail', 200)
  from (select x from jsonb_array_elements(coalesce(p -> 'signals', '[]'::jsonb)) x limit 50) xs
  where coalesce(x ->> 'name', '') <> '' and (coalesce(x ->> 'view', '') = '' or (x ->> 'view') ~ '^[0-9a-f-]{36}$');

  -- old traffic goes after half a year
  if random() < 0.002 then delete from public.visits where started_at < now() - interval '180 days'; end if;
end $$;
-- one more try at something that has a limit: false when there were too many lately
create or replace function public.try_once(p_key text, p_max int, p_minutes int) returns boolean
language plpgsql security definer set search_path = '' as $$
declare n int;
begin
  delete from public.tries where key = p_key and at < now() - make_interval(mins => p_minutes);
  select count(*) into n from public.tries where key = p_key;
  if n >= p_max then return false; end if;
  insert into public.tries (key) values (p_key);
  if random() < 0.02 then delete from public.tries where at < now() - interval '1 day'; end if;
  return true;
end $$;

create or replace function public.forget_tries(p_key text) returns void
language sql security definer set search_path = '' as $$
  delete from public.tries where key = p_key
$$;

-- a new password from the founder: every phone signed in with the old one is signed out
create or replace function public.end_sessions(p_user uuid) returns void
language sql security definer set search_path = '' as $$
  delete from auth.sessions where user_id = p_user
$$;

-- ═══ the counter's radio ═══════════════════════════════════════════════════
-- every scan (a stamp, a gift, a code held for a phone without an account)
-- pings the shop's counter at once over Realtime, and the counter asks what
-- happened. A ping that fails never fails the scan.
create or replace function public.ping_counter() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  begin
    -- a code taken (held or used): its id, so the counter puts the next one up at once
    perform realtime.send(case when tg_table_name = 'codes' then jsonb_build_object('code', new.id) else '{}'::jsonb end,
      'ping', 'pointili:' || (select s.signal from public.shops s where s.id = new.shop_id), false);
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists moments_ping on public.moments;
create trigger moments_ping after insert on public.moments for each row execute function public.ping_counter();
drop trigger if exists codes_ping on public.codes;
create trigger codes_ping after update of held_hash, used_at on public.codes for each row
  when ((old.held_hash is null and new.held_hash is not null) or (old.used_at is null and new.used_at is not null))
  execute function public.ping_counter();

-- ═══ who may call what ═════════════════════════════════════════════════════
revoke execute on all functions in schema public from public, anon, authenticated;
-- ═══ once: the owners from before the notes were kept here ═════════════════
-- (2026-10-03) never get them — they met the hello and the bravo already, and
-- the logo tip is for new owners. Re-runnable: only shops from before then.
update public.people p
set seen = array(select distinct x from unnest(p.seen || case when s.goal is not null then array['card_hello', 'coach', 'logo_tip'] else array['card_hello', 'logo_tip'] end) x)
from public.shops s
where s.owner_id = p.id and s.created_at < '2026-10-03 19:05:00+00'
  and not (p.seen @> case when s.goal is not null then array['card_hello', 'coach', 'logo_tip'] else array['card_hello', 'logo_tip'] end);

grant execute on function public.me(), public.see(text), public.set_name(text), public.open_shop(text, text), public.save_card(int, text, text, int, boolean), public.card_change(int, text),
  public.in_progress(), public.shop_home(), public.shop_customers(), public.shop_numbers(), public.shop_stats(),
  public.new_code(), public.counter(uuid, timestamptz), public.give(bigint),
  public.stamp(text, text), public.wallet(), public.card(uuid),
  public.admin_overview(), public.admin_shops(text, boolean), public.admin_shop(uuid), public.admin_set_paused(uuid, boolean),
  public.admin_delete_shop(uuid), public.admin_people(text, boolean), public.admin_person(uuid),
  public.admin_set_tester(uuid, boolean), public.admin_robots(), public.admin_sweep_robots(),
  public.admin_set_setting(text, text), public.admin_traffic(int, boolean), public.admin_visit(uuid), public.admin_heat(text, text, int, boolean),
  public.news_next(), public.news_seen(uuid), public.news_clicked(uuid),
  public.admin_news_save(text, text, text, text, text, uuid[], jsonb), public.admin_news_list(), public.admin_news(uuid),
  public.admin_news_set_active(uuid, boolean), public.admin_news_delete(uuid),
  public.customer_at(text), public.give_stamp(text),
  public.my_payment(), public.pay_request(text), public.admin_payments(), public.admin_payment_decide(uuid, boolean) to authenticated;
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
