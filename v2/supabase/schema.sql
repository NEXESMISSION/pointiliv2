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
-- an account made at the counter in twenty seconds (since 15 Oct 2026): a name and a phone, a password
-- the person never saw. false until they choose one — their wallet asks for it, gently
alter table public.people add column if not exists password_set boolean not null default true;

-- the machines' accounts (the walk, the sizes, the rule checks): a script
-- writes its number here BEFORE it makes the account, so the console never
-- shows one among the real shops — not even while a run is going. The script
-- takes the line away with the account; a line still here with its account is
-- a leftover (a run cut off), swept from the console's tools page («حساب التجربة»).
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

-- the trial: a shop works this many days from its opening, then waits for its
-- year (paid_until, turned on by the founder). The shops opened before
-- 2026-10-07 keep 7 days; from then on, 3. (The column came with 7 for the
-- rows already there, and 3 is the default for every new one.)
alter table public.shops add column if not exists trial_days int not null default 7;
alter table public.shops alter column trial_days set default 3;
alter table public.shops drop constraint if exists shops_trial_days_check;
alter table public.shops add constraint shops_trial_days_check check (trial_days between 0 and 365);
-- the trial's clock (since 2026-10-14, for the shops opened from then on): it starts with the shop's first
-- customer — a tampon to somebody else than the owner — not at the sign-up, so an owner who opens at night
-- or takes a few days to start loses none of it. The shops opened before keep their clock from the opening.
alter table public.shops add column if not exists trial_first boolean not null default false;
-- the founder lets this shop have the wheel (17 Oct 2026; its owner turns it on: wheel_on, «the wheel» below).
-- Since 18 Oct every new shop is allowed it — the default is set where the wheel is explained, below
alter table public.shops add column if not exists wheel_allowed boolean not null default false;
-- a number an owner gave a tampon to before it had an account (17 Oct 2026): the account is made for it,
-- with no password anyone knows; the person signing up with that number later takes it, cards and all
alter table public.people add column if not exists made_by_shop uuid references public.shops (id) on delete set null;
alter table public.shops alter column trial_first set default true;

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

-- every change of a shop's year by the founder: the owner paid by hand (cash,
-- D17, a transfer…) and the founder turns the access on — so many months, or
-- until a date — or stops it; a payment the owner announced lands here too
-- once the founder confirms it. `amount` is the founder's books: the dinars
-- that came in for it (null: not noted; 0: months added with no money).
-- `show_owner`: the owner's home says it once (seen_at).
create table if not exists public.plan_log (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  kind        text not null,
  months      int check (months is null or months between 1 and 120),
  until_at    timestamptz,
  note        text check (note is null or char_length(note) <= 200),
  show_owner  boolean not null default false,
  seen_at     timestamptz,
  created_at  timestamptz not null default now()
);
create index if not exists plan_log_shop_idx on public.plan_log (shop_id, created_at desc);
alter table public.plan_log add column if not exists method text check (method is null or method in ('cash', 'd17', 'virement', 'versement', 'mandat'));
alter table public.plan_log add column if not exists amount int check (amount is null or amount between 0 and 100000);
-- the kinds: months turned on, an end date, stopped (never called a gift) — and
-- days of trial added by the founder (not a subscription: no money, no year)
alter table public.plan_log drop constraint if exists plan_log_kind_check;
alter table public.plan_log add constraint plan_log_kind_check check (kind in ('paid', 'until', 'end', 'trial'));
-- the ways: the five, and "contact" (the owner called or wrote on WhatsApp to pay)
alter table public.payments drop constraint if exists payments_method_check;
alter table public.payments add constraint payments_method_check check (method in ('card', 'd17', 'virement', 'versement', 'mandat', 'contact'));

-- the founder's own lines in the books, both sides: what came in that no
-- shop's subscription wrote by itself (a service sold, a sponsor…), and what
-- the business spent (an ad, a tool, printing, a trip). In dinars (millimes
-- allowed), on the day it happened. `robot`: written by a script's admin —
-- never in the founder's books, and swept with the script's accounts.
-- (2026-10-06: the first shape, `expenses`, lived an hour, empty.)
drop table if exists public.expenses;
create table if not exists public.books (
  id          bigint generated always as identity primary key,
  side        text not null check (side in ('in', 'out')),
  on_day      date not null,
  amount      numeric(10,3) not null check (amount > 0 and amount <= 1000000),
  what        text not null check (char_length(what) between 2 and 120),
  kind        text not null default 'other' check (kind in ('sub', 'service', 'other', 'ads', 'tools', 'print', 'move', 'people')),
  robot       boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists books_day_idx on public.books (on_day desc, id desc);

-- a customer's phone that said «إيه، فكّروني»: where a word reaches it (the
-- browser's own address and keys). One line a phone; a person may have a few
create table if not exists public.push_subs (
  id          bigint generated always as identity primary key,
  user_id     uuid not null references auth.users (id) on delete cascade,
  endpoint    text not null unique check (char_length(endpoint) between 20 and 2000),
  p256dh      text not null check (char_length(p256dh) between 20 and 200),
  auth        text not null check (char_length(auth) between 10 and 100),
  created_at  timestamptz not null default now()
);
create index if not exists push_subs_user_idx on public.push_subs (user_id);

-- ═══ the follow-up: the founder's CRM ══════════════════════════════════════════
-- One line per shop the founder follows: where it stands (his own word, not the
-- numbers'), the day to come back to it, and a note; and under it the log —
-- every call, WhatsApp, visit or note, with what came of it. Read and written
-- by the founder alone (require_admin); a robot's shop takes its lines with it.
create table if not exists public.crm (
  shop_id     uuid primary key references public.shops (id) on delete cascade,
  stage       text not null default 'new' check (stage in ('new', 'tried', 'talked', 'interested', 'promised', 'later', 'refused')),
  next_at     date,
  note        text not null default '' check (char_length(note) <= 2000),
  updated_at  timestamptz not null default now()
);
create table if not exists public.crm_log (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  kind        text not null check (kind in ('call', 'whatsapp', 'visit', 'note', 'stage')),
  outcome     text check (outcome in ('answered', 'no_answer', 'busy', 'wrong', 'sent', 'replied')),
  text        text not null default '' check (char_length(text) <= 2000),
  at          timestamptz not null default now()
);
create index if not exists crm_log_shop_idx on public.crm_log (shop_id, at desc);
alter table public.crm enable row level security;
alter table public.crm force row level security;
alter table public.crm_log enable row level security;
alter table public.crm_log force row level security;
revoke all on public.crm, public.crm_log from anon, authenticated, public;
-- a shop's owner nudged the morning after: once (the card's own reminder date is with the cards)
alter table public.shops add column if not exists nudged_at timestamptz;

-- the shop's logo (optional): a picture in the public «logos» box, set by the owner
alter table public.shops add column if not exists logo text check (logo is null or (logo ~ '^https://' and char_length(logo) <= 300));
-- the stamps on the card drawn as the shop's own logo (its owner's choice), not the tick
alter table public.shops add column if not exists stamp_logo boolean not null default false;

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
-- a card reminded: once a month at most
alter table public.cards add column if not exists reminded_at timestamptz;

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
-- a code scanned by a phone without an account is held 20 minutes for it: the
-- owner gave that tampon back by hand (the customer never finished) — when
alter table public.codes add column if not exists back_at timestamptz;
-- a scan the code refused (the customer's tampon came too soon after the last, or the owner scanned their
-- own code): written on the code, so the counter says why and puts the next code up all the same
alter table public.codes add column if not exists tried_at timestamptz;
alter table public.codes add column if not exists tried_by uuid references auth.users (id) on delete set null;
alter table public.codes add column if not exists tried_why text;
-- the counter's private radio: Realtime topic "pointili:<signal>", told of every scan
alter table public.shops add column if not exists signal text not null default encode(extensions.gen_random_bytes(16), 'hex');
-- «شنوّة يبيع»: the counter asks which thing before it makes a code. Withdrawn
-- on 2026-10-09, back since 2026-10-14 as the founder's switch, shop by shop
-- (admin_set_items). The line that turned every shop's switch off on each run
-- of this file (from the withdrawal) is gone: it switched Sultan al oud off
-- the night after the founder turned it on at the owner's request.
alter table public.shops add column if not exists items_on boolean not null default false;

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
-- a card can hold several gifts waiting now (public.bank: every full card is one), so no longer one at most
drop index if exists public.moments_one_waiting_gift;
create index if not exists moments_waiting_idx on public.moments (card_id) where kind = 'gift' and given_at is null;
-- a gift remembers what it was, whatever the card says later
alter table public.moments add column if not exists gift text;
-- a gift that took its stamps off the card the moment it was written (since 15 Oct 2026): the card
-- starts again from zero at once and the gift waits on its own, like a voucher — several can wait.
-- false: a gift from before, whose stamps stay on the card until it is handed over
alter table public.moments add column if not exists banked boolean not null default false;

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
  'pay_card_url', 'pay_d17', 'pay_name', 'pay_bank', 'pay_rib', 'pay_mandat',
  -- a second account, at another bank
  'pay_bank2', 'pay_rib2',
  'facebook_url', 'instagram_url', 'tiktok_url',
  -- the ads: Facebook's pixel, and the code that tells Facebook the domain is ours
  'meta_pixel', 'fb_domain_verify',
  -- the visits as videos: Microsoft Clarity's project id
  'clarity_id'));

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
-- opened from the home screen (the installed app) rather than a browser tab:
-- only the page itself can tell, so the browser says so when the visit opens
alter table public.visits add column if not exists standalone boolean not null default false;
create index if not exists visits_started_idx on public.visits (started_at desc);
create index if not exists visits_visitor_idx on public.visits (visitor);
-- where someone is right now: while a page of the site is on their screen the
-- tracker says so every ~25 seconds (here: touched lately; idle: open, left
-- alone — the counter on the till), and «away» the moment it is hidden or
-- closed. Server time only. Kept apart from last_at, so a page left open
-- never makes a visit look longer than it was.
alter table public.visits add column if not exists here_at timestamptz;
alter table public.visits add column if not exists here_since timestamptz;
alter table public.visits add column if not exists here_state text;
alter table public.visits add column if not exists here_path text;
alter table public.visits drop constraint if exists visits_here_state_check;
alter table public.visits add constraint visits_here_state_check check (here_state is null or here_state in ('here', 'idle', 'away'));
create index if not exists visits_here_idx on public.visits (here_at desc) where here_at is not null;
-- the sign-in the visit was made under (the access token's session_id): auth.sessions
-- only knows the server that signed in («node», a Vercel address), so the phone, its
-- browser and its city — what the console shows for each phone an owner is signed
-- in on — come from the visits made under that session
alter table public.visits add column if not exists session_id uuid;
create index if not exists visits_session_idx on public.visits (session_id, started_at desc) where session_id is not null;

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
-- …or a short clip of the thing being done (public/clips, as the owner's first story uses): some
-- news is a setting with several steps, and watching it done once is shorter than reading it
alter table public.news drop constraint if exists news_pic_check;
alter table public.news add constraint news_pic_check check (pic is null or pic ~ '^/(news|clips)/[a-z0-9-]{2,60}\.(webp|png|jpg|mp4)$');

-- cards and gifts from before cards were promises
update public.cards c set goal = s.goal, gift = s.gift from public.shops s where s.id = c.shop_id and c.goal is null and s.goal is not null;
update public.moments m set gift = c.gift from public.cards c where c.id = m.card_id and m.kind = 'gift' and m.gift is null;

do $$
declare t text;
begin
  foreach t in array array['people', 'shops', 'cards', 'codes', 'moments', 'tries', 'settings', 'visits', 'views', 'taps', 'signals', 'news', 'news_views', 'payments', 'robots', 'plan_log', 'books', 'crm', 'crm_log', 'push_subs'] loop
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
    -- قهاوي وماكلة
    'cafe', 'tea', 'juice', 'icecream', 'bakery', 'pastry', 'tunsweets', 'chocolate', 'viennoiserie', 'crepes', 'restaurant', 'fastfood', 'snack', 'lablabi', 'pizza', 'grill', 'chicken', 'seafood', 'healthy', 'catering',
    -- قضية الدار
    'grocery', 'market', 'butcher', 'poultry', 'fish', 'veggies', 'dairy', 'roastery', 'spices', 'oil', 'drinks', 'organic',
    -- جمال
    'barber', 'hair', 'beauty', 'nails', 'cosmetics', 'makeup', 'perfume', 'hammam', 'spa', 'henna',
    -- صحّة
    'pharmacy', 'parapharmacy', 'optics', 'doctor', 'dentist', 'physio', 'lab', 'vet', 'herbalist',
    -- رياضة وتفرهيد
    'gym', 'dance', 'martial', 'pool', 'pitch', 'padel', 'games', 'kids', 'cinema', 'bikes', 'events',
    -- لبسة وأكسسوار
    'clothes', 'fripe', 'kidswear', 'sportswear', 'traditional', 'wedding', 'hijab', 'shoes', 'bags', 'jewelry', 'watches', 'fabric',
    -- حوايج ودار
    'phones', 'repair', 'electronics', 'computers', 'appliances', 'furniture', 'decor', 'kitchen', 'baby', 'toys', 'books', 'stationery', 'gifts', 'flowers', 'pets', 'hardware', 'paint', 'carparts',
    -- خدمات
    'carwash', 'mechanic', 'tires', 'carrental', 'driving', 'laundry', 'tailor', 'cobbler', 'keys', 'print', 'photo', 'courses', 'language', 'nursery', 'travel', 'hotel', 'cyber', 'cleaning', 'other']
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

-- a gift from before 15 Oct 2026 still holds its stamps on the card: the card keeps the goal it started with until it is handed over
create or replace function public.holds_stamps(p_card uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.moments m where m.card_id = p_card and m.kind = 'gift' and m.given_at is null and not m.banked)
$$;

create or replace function public.waits(p_card uuid) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from public.moments m where m.card_id = p_card and m.kind = 'gift' and m.given_at is null)
$$;

-- the gifts a card has earned and not yet taken: one per full card. A card
-- that fills (again) gives its stamps to a gift written down at once, and
-- starts again from zero (what is past the goal carries on): the gift waits
-- on its own, like a voucher — the customer's code takes it at the counter,
-- any day — and several can wait side by side. A gift from before 15 Oct
-- 2026 (not `banked`) still holds its stamps on the card until handed over.
-- Called after every tampon and every change of card; returns how many it
-- just wrote.
create or replace function public.bank(p_card uuid) returns int
language plpgsql security definer set search_path = '' as $$
declare c public.cards%rowtype; s public.shops%rowtype; v_goal int; v_held int; v_made int := 0;
begin
  select * into c from public.cards where id = p_card for update;
  if c.id is null then return 0; end if;
  select * into s from public.shops where id = c.shop_id;
  -- a shop switched to the store: no gift at a goal, every tampon stays on the card to spend
  if s.store_on then return 0; end if;
  v_goal := coalesce(c.goal, s.goal);
  if v_goal is null or v_goal < 1 then return 0; end if;
  select count(*) into v_held from public.moments where card_id = c.id and kind = 'gift' and given_at is null and not banked;
  while c.stamps - v_held * v_goal >= v_goal and v_made < 50 loop
    -- a wheel shop: a turn of the wheel, «الروليت» until it is spun
    insert into public.moments (shop_id, card_id, kind, gift, wheel, banked)
    values (s.id, c.id, 'gift', case when s.wheel_on then 'الروليت' else coalesce(c.gift, s.gift) end, s.wheel_on, true);
    c.stamps := c.stamps - v_goal;
    v_made := v_made + 1;
  end loop;
  if v_made > 0 then
    -- the card starts again — on the shop's card of today when nothing is left over (the gift keeps its own name)
    update public.cards set stamps = c.stamps,
      goal = case when c.stamps = 0 and v_held = 0 and s.goal is not null then s.goal else goal end,
      gift = case when c.stamps = 0 and v_held = 0 and s.goal is not null then s.gift else gift end
    where id = c.id;
  end if;
  return v_made;
end $$;

-- what a customer's card looks like, everywhere it is shown: the goal and the
-- gift are this card's own (the promise); "next" is the shop's card of today
-- when it differs — it starts for this customer after this gift
create or replace function public.card_view(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', c.id, 'stamps', c.stamps, 'gifts', c.gifts, 'last_at', c.last_at,
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
                               'gap', s.stamp_gap, 'paused', s.paused),
    -- the gift waiting, by its own name (a wheel's prize once spun; the card's gift otherwise)
    'won', (select m.gift from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null order by m.created_at, m.id limit 1),
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
    'password_set', p.password_set,
    'phone_check', public.phone_state(p),
    'shop', case when s.id is null then null else jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'goal', s.goal, 'gift', s.gift, 'color', s.color, 'paused', s.paused,
      'signal', s.signal, 'logo', s.logo, 'stamp_logo', s.stamp_logo, 'items_on', s.items_on, 'stamp_gap', s.stamp_gap, 'store_on', s.store_on, 'wheel_on', s.wheel_on, 'wheel_allowed', s.wheel_allowed) end);
end $$;

-- the owner's choice for the stamps on the card: the tick, or the shop's logo
-- (only with a logo to draw: none yet, refused)
create or replace function public.set_stamp_logo(p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if coalesce(p_on, false) and s.logo is null then return public.err('no_logo'); end if;
  update public.shops set stamp_logo = coalesce(p_on, false) where id = s.id;
  return jsonb_build_object('ok', true, 'on', coalesce(p_on, false));
end $$;

-- a one-time note seen: added once to the person's list (unknown notes refused)
create or replace function public.see(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  if p_key is null or p_key not in ('coach', 'logo_tip', 'card_hello', 'offer', 'push', 'install', 'fix_tip', 'first_scan', 'first_gift', 'mission') then return public.err('invalid'); end if;
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
create or replace function public.card_apply(p_shop uuid, p_goal int, p_gift text, p_color text, p_gap int, p_move boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_gift text := trim(coalesce(p_gift, '')); v_eased int; v_filled int; v_kept int; v_moved int := 0;
begin
  select * into s from public.shops where id = p_shop;
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

  -- the cards the new card fills: their gift written down now, as vouchers, and the card starts again
  select count(*) into v_filled from public.cards c
  where c.shop_id = s.id and not s.store_on and c.stamps >= coalesce(c.goal, p_goal) and not public.waits(c.id);
  perform public.bank(c.id) from public.cards c where c.shop_id = s.id and not s.store_on and c.stamps >= coalesce(c.goal, p_goal);

  select count(*) into v_kept from public.cards c
  where c.shop_id = s.id and c.stamps > 0 and not public.waits(c.id)
    and (c.goal is distinct from p_goal or not public.same_gift(c.gift, v_gift));
  return jsonb_build_object('ok', true, 'eased', v_eased, 'filled', v_filled, 'kept', v_kept, 'moved', v_moved);
end $$;

-- the owner's own card
create or replace function public.save_card(p_goal int, p_gift text, p_color text, p_gap int default null, p_move boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return public.card_apply(s.id, p_goal, p_gift, p_color, p_gap, p_move);
end $$;

-- the founder's hand on a shop: its card (the same rules as the owner's), its name and kind
create or replace function public.admin_save_card(p_shop uuid, p_goal int, p_gift text, p_color text default null, p_gap int default null, p_move boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return public.card_apply(p_shop, p_goal, p_gift, p_color, p_gap, p_move);
end $$;

create or replace function public.admin_shop_edit(p_shop uuid, p_name text, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_name text := trim(coalesce(p_name, ''));
begin
  perform public.require_admin();
  if char_length(v_name) not between 2 and 60 then return public.err('invalid_name'); end if;
  if p_kind is null or not (p_kind = any (public.kinds())) then return public.err('invalid_kind'); end if;
  update public.shops set name = v_name, kind = p_kind where id = p_shop;
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- before a change of card is saved: what it would do to the customers. `way`:
-- on their way with a card that differs; `eased`: of them, the same gift for
-- fewer tampons (it reaches them anyway); `win_now`: of them, already enough
-- tampons for the new goal (they would win at once if moved); `win_eased`: of
-- the eased ones, already enough (they win at once whatever the owner
-- chooses); `waiting`: a gift waiting, kept whatever happens
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
      'win_eased', count(*) filter (where c.stamps > 0 and not w.waiting and c.stamps >= p_goal and coalesce(c.goal, 999) > p_goal and public.same_gift(c.gift, v_gift)),
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

-- the scans by phones without an account, lately: the customer had to make an
-- account to keep the tampon. waiting: still inside its 20 minutes; done: they
-- did, and took it; lost: they never did; back: the owner gave it by hand since.
-- So a scan never vanishes without the owner knowing.
create or replace function public.held_list(p_shop uuid, p_days int) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object(
           'id', k.id, 'at', k.held_until - interval '20 minutes', 'until', k.held_until,
           'state', case when k.used_at is not null then 'done' when k.back_at is not null then 'back' when k.held_until > now() then 'waiting' else 'lost' end,
           'name', (select nullif(split_part(p.name, ' ', 1), '') from public.people p where p.id = k.used_by),
           'item', (select i.name from public.items i where i.id = k.item_id)) order by k.held_until desc), '[]'::jsonb)
  from (select * from public.codes where shop_id = p_shop and held_hash is not null
          and held_until > now() - make_interval(days => greatest(p_days, 1))
        order by held_until desc limit 12) k
$$;

-- the owner gave by hand the tampon of a scan that never finished
create or replace function public.held_back(p_code uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  update public.codes set back_at = now() where id = p_code and shop_id = s.id and held_hash is not null and used_at is null and back_at is null;
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
    -- the customers who are not the owner (a card of their own is a try): the home's first steps count these
    'served', (select count(*) from public.cards where shop_id = s.id and user_id <> s.owner_id),
    'today', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'visitors_today', (select count(distinct card_id) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'given', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null),
    'given_today', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at >= public.tunis_today()),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(split_part(p.name, ' ', 1), ''), 'gift', coalesce(m.gift, c.gift, s.gift)) order by m.created_at)
      from public.moments m join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id
      where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null), '[]'::jsonb),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'card', m.card_id, 'at', m.created_at, 'kind', m.kind, 'given', m.given_at is not null,
                                          'name', nullif(split_part(p.name, ' ', 1), ''), 'stamps', c.stamps, 'goal', coalesce(c.goal, s.goal),
                                          -- a gift of this card waits to be handed over (its stamps may have left the card already)
                                          'waiting', public.waits(c.id),
                                          'gift', coalesce(m.gift, c.gift, s.gift),
                                          -- what the tampon was for (a shop that says what it sells)
                                          'item', (select i.name from public.items i where i.id = m.item_id))
                       order by m.created_at desc)
      from (select * from public.moments where shop_id = s.id order by created_at desc limit 8) m
      join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb),
    -- scans without an account these three days, and how each ended
    'held', public.held_list(s.id, 3));
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
      -- the day as Tunis says it: d is Tunis midnight, which the database (on UTC) calls the evening before
      select jsonb_agg(jsonb_build_object('day', (d at time zone 'Africa/Tunis')::date, 'stamps', (
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
-- (the owner) one customer's card, every tampon and gift on it, newest first, with what each tampon was for
create or replace function public.shop_card_moments(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', m.id, 'kind', m.kind, 'at', m.created_at, 'given', m.given_at is not null,
                                               'gift', coalesce(m.gift, c.gift, s.gift),
                                               'item', (select i.name from public.items i where i.id = m.item_id))
                            order by m.created_at desc), '[]'::jsonb)
  from public.moments m join public.cards c on c.id = m.card_id join public.shops s on s.id = c.shop_id
  where m.card_id = p_card and s.owner_id = auth.uid()
$$;

create or replace function public.shop_customers() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'goal', s.goal, 'items', coalesce((
    select jsonb_agg(jsonb_build_object('id', c.id, 'name', nullif(p.name, ''), 'phone', public.masked(p.phone),
                                        'stamps', c.stamps, 'gifts', c.gifts, 'last_at', c.last_at,
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

-- a shop past its trial, its year not turned on: no code at the counter, no
-- tampon by the customer's code, until the founder turns the year on. The
-- founder's own shop and the test accounts never stop.
-- when the trial's clock started: the opening, or (trial_first) the first customer's tampon — not yet: now
create or replace function public.trial_start(s public.shops) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select case when not s.trial_first then s.created_at
    else coalesce((select min(m.created_at) from public.moments m join public.cards c on c.id = m.card_id
                   where m.shop_id = s.id and m.kind = 'stamp' and c.user_id <> s.owner_id), now()) end
$$;

-- the trial's end. A clock waiting for the first customer still runs out two weeks after the
-- usual end, customer or not: a trial is for trying, it is not kept forever
create or replace function public.trial_end(s public.shops) returns timestamptz
language sql stable security definer set search_path = '' as $$
  select case when not s.trial_first then s.created_at + make_interval(days => s.trial_days)
    else least(public.trial_start(s) + make_interval(days => s.trial_days), s.created_at + make_interval(days => s.trial_days + 14)) end
$$;

-- has the clock started (a shop of the old clock: always)
create or replace function public.trial_started(s public.shops) returns boolean
language sql stable security definer set search_path = '' as $$
  select not s.trial_first or exists (select 1 from public.moments m join public.cards c on c.id = m.card_id
                                      where m.shop_id = s.id and m.kind = 'stamp' and c.user_id <> s.owner_id)
$$;

-- every shop's trial end, for the founder's morning digest (the service's key only)
create or replace function public.trial_ends() returns table (id uuid, ends timestamptz, started boolean)
language sql stable security definer set search_path = '' as $$
  select s.id, public.trial_end(s), public.trial_started(s) from public.shops s
$$;

create or replace function public.shut(s public.shops) returns boolean
language sql stable security definer set search_path = '' as $$
  select (s.paid_until is null or s.paid_until <= now())
     and now() >= public.trial_end(s)
     and not exists (select 1 from public.people p where p.id = s.owner_id and (p.is_admin or p.is_tester))
$$;

-- ═══ what the stamp was for ═══════════════════════════════════════════════
--
-- A shop may say what it sells. When it does, the counter asks which one
-- before it shows a code at all — so a code never exists without an answer,
-- and nothing can be written down against the wrong thing. A shop that says
-- nothing works exactly as it always did: this whole section sleeps.

create table if not exists public.items (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  rank        int not null default 0,
  created_at  timestamptz not null default now()
);
create index if not exists items_shop_idx on public.items (shop_id, rank, id);
-- like every table: closed to the browser, read and written only through the functions below
-- (made after the loop that closes the others, so it closes itself)
alter table public.items enable row level security;
alter table public.items force row level security;
revoke all on public.items from anon, authenticated, public;
alter table public.codes   add column if not exists item_id bigint references public.items (id) on delete set null;
alter table public.moments add column if not exists item_id bigint references public.items (id) on delete set null;
create index if not exists moments_item_idx on public.moments (item_id) where item_id is not null;

-- the owner's own list
create or replace function public.my_items() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name) order by i.rank, i.id), '[]'::jsonb)
  from public.items i join public.shops s on s.id = i.shop_id
  where s.owner_id = auth.uid() and i.rank < 999
$$;

-- the list, rewritten whole: a name already known keeps its id, so its
-- history holds. A name taken away is retired rather than deleted while a
-- moment still points at it.
create or replace function public.set_items(p_names text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_name text; v_rank int := 0; v_keep bigint[] := '{}'; v_id bigint;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if coalesce(array_length(p_names, 1), 0) > 20 then return public.err('too_many'); end if;

  foreach v_name in array coalesce(p_names, '{}') loop
    v_name := btrim(v_name);
    continue when v_name = '' or char_length(v_name) > 40;
    select id into v_id from public.items where shop_id = s.id and lower(btrim(name)) = lower(v_name) limit 1;
    if v_id is null then
      insert into public.items (shop_id, name, rank) values (s.id, v_name, v_rank) returning id into v_id;
    else
      update public.items set name = v_name, rank = v_rank where id = v_id;
    end if;
    v_keep := v_keep || v_id;
    v_rank := v_rank + 1;
  end loop;

  delete from public.items i where i.shop_id = s.id and not (i.id = any (v_keep))
    and not exists (select 1 from public.moments m where m.item_id = i.id);
  update public.items set rank = 999 where shop_id = s.id and not (id = any (v_keep));
  -- an empty list cannot leave the counter asking a question with no answers
  update public.shops set items_on = items_on and coalesce(array_length(v_keep, 1), 0) > 0 where id = s.id;
  return jsonb_build_object('ok', true, 'items', public.my_items());
end $$;

-- the switch, kept apart from the list, so turning it off keeps the names
create or replace function public.set_items_on(p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_n int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select count(*) into v_n from public.items where shop_id = s.id and rank < 999;
  if p_on and v_n = 0 then return public.err('no_items'); end if;
  update public.shops set items_on = p_on where id = s.id;
  return jsonb_build_object('ok', true, 'on', p_on);
end $$;

-- Not «what sells most» — the till says that. What the till cannot say: of
-- the people whose FIRST stamp was this thing, how many ever came again.
create or replace function public.item_report(p_days int default 30) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_from timestamptz;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  v_from := now() - make_interval(days => greatest(1, least(365, coalesce(p_days, 30))));
  return (
    with stamps as (
      select m.card_id, m.item_id, m.created_at from public.moments m
      where m.shop_id = s.id and m.kind = 'stamp'
    ),
    firsts as (
      select distinct on (card_id) card_id, item_id from stamps order by card_id, created_at
    ),
    backs as (
      select f.item_id, count(*) as started,
             count(*) filter (where (select count(*) from stamps x where x.card_id = f.card_id) > 1) as came_back
      from firsts f group by f.item_id
    )
    select coalesce(jsonb_agg(jsonb_build_object(
             'id', i.id, 'name', i.name,
             'n', (select count(*) from stamps x where x.item_id = i.id and x.created_at >= v_from),
             'started', coalesce(b.started, 0), 'came_back', coalesce(b.came_back, 0)
           ) order by (select count(*) from stamps x where x.item_id = i.id and x.created_at >= v_from) desc, i.rank), '[]'::jsonb)
    from public.items i left join backs b on b.item_id = i.id
    where i.shop_id = s.id and i.rank < 999
  );
end $$;

-- ═══ the counter: a code that works once ═══════════════════════════════════
-- The old new_code() took nothing. It is replaced rather than added beside,
-- so PostgREST sees one function of this name; the default answers a call
-- with no arguments, so a counter running the previous build keeps minting
-- right through the deploy.
-- ═══ points and the store, taken out (2026-10-10) ═════════════════════
-- Asked for, built, and then cancelled: one card, one kind of tampon, the way
-- it always was. The functions go so that two of a name never confuse
-- PostgREST — new_code(bigint, int) beside new_code(bigint) would make a call
-- with no arguments ambiguous and stop every counter. The tables stay: the
-- few shops that wrote a reward keep what they wrote, as the products did.
drop function if exists public.new_code(bigint, int);
drop function if exists public.give_stamp(text, bigint, int);
drop function if exists public.set_mode(text);
drop function if exists public.set_per_visit(int);
drop function if exists public.set_ask_points(boolean);
drop function if exists public.card_store(uuid);
drop function if exists public.order_reward(uuid, bigint);
drop function if exists public.cancel_order(uuid);
drop function if exists public.serve_order(uuid);
drop function if exists public.waiting_order(uuid);
drop function if exists public.store_log(int);
drop function if exists public.my_rewards();
drop function if exists public.reward_save(bigint, text, int);
drop function if exists public.reward_drop(bigint);
drop function if exists public.sells(uuid);

drop function if exists public.new_code();
create or replace function public.new_code(p_item bigint default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_token text; v_id uuid; v_exp timestamptz := now() + interval '60 seconds';
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused then return public.err('paused'); end if;
  if public.shut(s) then return public.err('shut'); end if;
  if (select count(*) from public.codes where shop_id = s.id and created_at > now() - interval '10 minutes') > 400 then
    return public.err('slow_down');
  end if;
  -- a shop that says what it sells is asked which one, and nothing is made
  -- until it answers: a code that exists at all has a thing attached to it,
  -- so a tampon can never be written down against the wrong one.
  if s.items_on then
    if p_item is null then return public.err('pick_item'); end if;
    if not exists (select 1 from public.items where id = p_item and shop_id = s.id and rank < 999) then
      return public.err('pick_item');
    end if;
  else
    p_item := null;
  end if;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.codes (shop_id, hash, expires_at, item_id) values (s.id, public.sha(v_token), v_exp, p_item) returning id into v_id;
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
    'taken', k.id is not null and (k.used_at is not null or k.held_hash is not null or k.tried_at is not null),
    -- scans the code refused since the counter opened: who, why, and (too soon) when they can come back
    'tried', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'why', x.tried_why, 'name', nullif(split_part(p.name, ' ', 1), ''),
                                          'next_at', case when x.tried_why = 'too_soon' then public.next_stamp_at(cc.last_at, s.stamp_gap) end)
                       order by x.tried_at)
      from public.codes x
      left join public.people p on p.id = x.tried_by
      left join public.cards cc on cc.shop_id = s.id and cc.user_id = x.tried_by
      where x.shop_id = s.id and x.tried_at > coalesce(p_since, now())), '[]'::jsonb),
    -- the customers who are not the owner: the counter celebrates the very first one
    'served', (select count(*) from public.cards where shop_id = s.id and user_id <> s.owner_id),
    -- scanned by a phone without an account (held, not yet a tampon): the counter says so
    'held', coalesce((select jsonb_agg(x.id) from public.codes x where x.shop_id = s.id and x.held_hash is not null and x.used_at is null
                        and x.held_until > coalesce(p_since, now()) + interval '20 minutes'), '[]'::jsonb),
    'expired', k.id is null or k.expires_at <= now(),
    -- a customer who filled one of the shop's forms: who they are, for the owner to check (kept on screen until «next»)
    'ids', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(p.name, ''), 'phone', p.phone,
                                          'said', public.id_said(s.id, c.user_id)) order by m.created_at)
      from (select * from public.moments where shop_id = s.id and kind = 'stamp' and created_at > coalesce(p_since, now())
            order by created_at desc limit 20) m
      join public.cards c on c.id = m.card_id
      left join public.people p on p.id = c.user_id
      where exists (select 1 from public.id_entries e where e.shop_id = s.id and e.user_id = c.user_id)
    ), '[]'::jsonb),
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

-- the shop hands the gift over (a voucher: its stamps left the card when it
-- was written; a gift from before: its goal of stamps leaves the card now)
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
  -- a voucher took its stamps when it was written; a gift from before takes them now
  update public.cards set stamps = case when m.banked then stamps else greatest(stamps - coalesce(goal, s.goal), 0) end, gifts = gifts + 1
  where id = m.card_id returning * into c;
  -- the last gift taken: the card follows the shop's card of today (the stamps left over carry on to it)
  if not public.waits(c.id) then
    update public.cards set goal = s.goal, gift = s.gift where id = c.id;
  end if;
  perform public.bank(c.id);
  return jsonb_build_object('ok', true);
end $$;

-- every gift waiting on that card, handed over at once (a customer who saved several)
create or replace function public.give_all(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_card uuid; v_n int := 0; x record;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select card_id into v_card from public.moments where id = p_moment and shop_id = s.id and kind = 'gift';
  if v_card is null then return public.err('not_found'); end if;
  for x in select id from public.moments where card_id = v_card and kind = 'gift' and given_at is null and not (wheel and spun_at is null) order by created_at, id loop
    perform public.give(x.id);
    v_n := v_n + 1;
  end loop;
  return jsonb_build_object('ok', true, 'n', v_n);
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
  -- a code is judged by when it was on the screen: a slow phone's page can take a while to open, so two
  -- minutes of grace past its minute (it stays one-use: a code taken is taken)
  if k.expires_at + interval '2 minutes' <= now() then return public.err('expired'); end if;
  -- past its trial, to the customer the shop is simply stopped
  if s.paused or public.shut(s) then return public.err('paused'); end if;
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
  elsif k.expires_at + interval '2 minutes' <= now() then
    return public.err('expired', jsonb_build_object('shop', s.name));
  end if;
  if s.owner_id = v_uid then
    update public.codes set tried_at = now(), tried_by = v_uid, tried_why = 'own_shop' where id = k.id;
    return public.err('own_shop');
  end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.paused or public.shut(s) then return public.err('paused', jsonb_build_object('shop', s.name)); end if;

  insert into public.people (id) values (v_uid) on conflict (id) do nothing;
  insert into public.cards (shop_id, user_id, goal, gift) values (s.id, v_uid, s.goal, s.gift) on conflict (shop_id, user_id) do nothing;
  select * into c from public.cards where shop_id = s.id and user_id = v_uid for update;

  if public.next_stamp_at(c.last_at, s.stamp_gap) > now() then
    -- the counter hears it too, and says why (the code stays good for the next customer)
    update public.codes set tried_at = now(), tried_by = v_uid, tried_why = 'too_soon' where id = k.id;
    return public.err('too_soon', jsonb_build_object('next_at', public.next_stamp_at(c.last_at, s.stamp_gap), 'card', public.card_view(c.id)));
  end if;

  v_waiting := public.waits(c.id);
  update public.codes set used_at = now(), used_by = v_uid where id = k.id;
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

create or replace function public.wallet() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(public.card_view(c.id) order by coalesce(c.last_at, c.created_at) desc), '[]'::jsonb)
  from public.cards c where c.user_id = auth.uid()
$$;

create or replace function public.card(p_id uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select public.card_view(c.id) || jsonb_build_object('history', coalesce((
           select jsonb_agg(jsonb_build_object('kind', m.kind, 'at', coalesce(m.given_at, m.created_at), 'given', m.given_at is not null, 'gift', m.gift,
                                               -- what the tampon was for, when the shop says what it sells
                                               'item', (select i.name from public.items i where i.id = m.item_id))
                            order by coalesce(m.given_at, m.created_at) desc)
           from (select * from public.moments where card_id = c.id order by created_at desc limit 30) m), '[]'::jsonb),
         'orders', public.orders_story(c.id),
         -- a wheel shop: the prizes, to draw the wheel
         'prizes', (select case when s.wheel_on or s.wheel_allowed then public.wheel_list(s.id) end from public.shops s where s.id = c.shop_id))
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
--     (is_tester) — kept off the console's board, out of every number;
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
-- the shop list reads every owner's own visits (how interested they are)
create index if not exists visits_user_idx on public.visits (user_id) where user_id is not null;
create or replace function public.admin_shops(p_q text default null, p_tests boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_q), ''), '%', ''), '_', '') || '%'; v_all boolean;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo, 'goal', s.goal, 'gift', s.gift, 'paused', s.paused,
      'created_at', s.created_at, 'owner', jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone),
      -- the year, or the trial and its end
      'paid', s.paid_until is not null and s.paid_until > now(), 'shut', public.shut(s),
      'trial_hours', greatest(0, ceil(extract(epoch from (public.trial_end(s) - now())) / 3600))::int,
      'test', coalesce(p.is_admin or p.is_tester, false),
      'customers', (select count(*) from public.cards c where c.shop_id = s.id),
      'stamps', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'stamp'),
      'today', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'stamp' and m.created_at >= public.tunis_today()),
      'last_at', (select max(m.created_at) from public.moments m where m.shop_id = s.id),
      -- how interested the owner is, read off what they did, not what they said:
      -- last seen, on the site right now, on how many days, for how long, the
      -- payment page opened, Pointili put on the phone, the notifications on,
      -- the demo watched; and the customers — «real» ones got a tampon more
      -- than an hour after the shop opened (a shop in use), «early» ones only
      -- within that first hour (a cousin at the owner's side, at sign-up)
      'seen_at', o.seen_at, 'online', coalesce(o.online, false), 'visits', coalesce(o.visits, 0), 'days', coalesce(o.days, 0),
      'ms', coalesce(ow.ms, 0), 'pay', coalesce(ow.pay, false), 'app', coalesce(og.app, false), 'tried', coalesce(og.tried, false),
      'push', exists (select 1 from public.push_subs ps where ps.user_id = s.owner_id),
      'real', coalesce(oc.real, 0), 'early', coalesce(oc.early, 0), 'real_stamps', coalesce(oc.stamps, 0),
      -- the founder's own line about the shop, written in the list itself (crm.note; the full follow-up page is gone)
      'note', coalesce(cn.note, '')) order by s.created_at desc)
    from public.shops s left join public.people p on p.id = s.owner_id
    left join public.crm cn on cn.shop_id = s.id
    left join lateral (
      select greatest(max(v.last_at), max(v.here_at)) as seen_at, count(*) as visits,
             count(distinct (v.started_at at time zone 'Africa/Tunis')::date) as days,
             bool_or(v.here_state in ('here', 'idle') and v.here_at > now() - interval '75 seconds') as online
      from public.visits v where v.user_id = s.owner_id) o on true
    left join lateral (
      select sum(w.active_ms) as ms, bool_or(w.route = '/shop/pay') as pay
      from public.visits v join public.views w on w.visit_id = v.id where v.user_id = s.owner_id) ow on true
    left join lateral (
      select bool_or(g.name in ('pwa_installed', 'pwa_accepted', 'pwa_open')) as app, bool_or(g.name = 'tryit') as tried
      from public.visits v join public.signals g on g.visit_id = v.id where v.user_id = s.owner_id) og on true
    left join lateral (
      select count(*) filter (where x.late > 0) as real, count(*) filter (where x.late = 0) as early, sum(x.late) as stamps
      from (select (select count(*) from public.moments m where m.card_id = c.id and m.kind = 'stamp' and m.created_at > s.created_at + interval '1 hour') as late
            from public.cards c join public.people cp on cp.id = c.user_id
            where c.shop_id = s.id and c.user_id <> s.owner_id and not (cp.is_admin or cp.is_tester or public.is_robot(cp.id))) x) oc on true
    where (p_q is null or trim(p_q) = '' or s.name ilike v_like or coalesce(p.phone, '') like v_like or coalesce(p.name, '') ilike v_like
           or coalesce(cn.note, '') ilike v_like)
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
    'owner', (select jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone, 'tester', p.is_tester, 'admin', p.is_admin, 'robot', public.is_robot(p.id),
                                        'phone_check', public.phone_state(p), 'phone_given', p.phone_given, 'phone_given_at', p.phone_given_at, 'phone_ok_at', p.phone_ok_at)
              from public.people p where p.id = s.owner_id),
    'stamp_gap', s.stamp_gap, 'stamp_logo', s.stamp_logo, 'items_on', s.items_on,
    -- what the owner wrote in «شنوّة تبيع» (removed ones too, rank 999), and the tampons each one got
    'items', coalesce((
      select jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'gone', i.rank >= 999, 'at', i.created_at,
                                          'n', (select count(*) from public.moments m where m.item_id = i.id and m.kind = 'stamp'),
                                          'n30', (select count(*) from public.moments m where m.item_id = i.id and m.kind = 'stamp' and m.created_at > now() - interval '30 days'),
                                          'last_at', (select max(m.created_at) from public.moments m where m.item_id = i.id and m.kind = 'stamp'))
                       order by i.rank >= 999, i.rank, i.id)
      from public.items i where i.shop_id = s.id), '[]'::jsonb),
    -- every phone or computer the owner is signed in on right now (one per sign-in; a
    -- sign-out ends it): what it is and where, from the last visit made under it
    'devices', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'since', x.created_at,
                                          'last_at', greatest(coalesce(x.refreshed_at, x.updated_at, x.created_at), v.last_at, v.here_at),
                                          'device', v.device, 'os', v.os, 'browser', v.browser, 'city', v.city, 'app', v.standalone,
                                          'here', v.here_at > now() - interval '2 minutes' and v.here_state in ('here', 'idle'))
                       order by greatest(coalesce(x.refreshed_at, x.updated_at, x.created_at), v.last_at, v.here_at) desc nulls last)
      from auth.sessions x
      left join lateral (select * from public.visits w where w.session_id = x.id order by w.started_at desc limit 1) v on true
      where x.user_id = s.owner_id and (x.not_after is null or x.not_after > now())), '[]'::jsonb),
    'plan', jsonb_build_object(
      'paid_until', s.paid_until,
      'paid', s.paid_until is not null and s.paid_until > now(),
      'offer_until', s.offer_at + interval '48 hours',
      'offer', (s.paid_until is null or s.paid_until <= now()) and s.offer_at is not null and now() <= s.offer_at + interval '48 hours',
      'log', coalesce((select jsonb_agg(jsonb_build_object('id', l.id, 'kind', l.kind, 'months', l.months, 'until', l.until_at, 'note', l.note, 'method', l.method, 'amount', l.amount,
                                                           'shown', l.show_owner, 'seen', l.seen_at, 'at', l.created_at) order by l.created_at desc)
                       from (select * from public.plan_log where shop_id = s.id order by created_at desc limit 20) l), '[]'::jsonb),
      'payments', coalesce((select jsonb_agg(jsonb_build_object('id', y.id, 'method', y.method, 'months', y.months, 'status', y.status, 'at', y.created_at) order by y.created_at desc)
                            from (select * from public.payments where shop_id = s.id order by created_at desc limit 10) y), '[]'::jsonb)),
    -- the owner's own comings and goings, read off the traffic the app already
    -- keeps: when the account was opened, when they were last here, and every
    -- visit with how long they actually stayed (the sum of the time on each
    -- screen, counted the same way the traffic page counts it)
    'seen', (select jsonb_build_object(
        'created_at', p.created_at,
        'first_at', (select min(v.started_at) from public.visits v where v.user_id = p.id),
        -- last seen: a page on their screen counts too (the presence pings), so it never argues with «متّصل توّا»
        'last_at',  (select greatest(max(v.last_at), max(v.here_at)) from public.visits v where v.user_id = p.id),
        'n',        (select count(*) from public.visits v where v.user_id = p.id),
        'ms',       (select coalesce(sum(w.active_ms), 0) from public.views w join public.visits v on v.id = w.visit_id where v.user_id = p.id),
        -- day by day over the last 30 days (Tunis time): how many times and how long — the console draws it as a strip
        'days', coalesce((select jsonb_agg(jsonb_build_object('day', d.day, 'n', d.n, 'ms', d.ms) order by d.day)
                          from (select (v.started_at at time zone 'Africa/Tunis')::date as day, count(*) as n,
                                       coalesce(sum((select coalesce(sum(w.active_ms), 0) from public.views w where w.visit_id = v.id)), 0) as ms
                                from public.visits v
                                where v.user_id = p.id and v.started_at > now() - interval '30 days'
                                group by 1) d), '[]'::jsonb),
        'visits', coalesce((
          select jsonb_agg(jsonb_build_object(
                   'id', x.id, 'at', x.started_at, 'end_at', x.last_at, 'ms', x.ms, 'pages', x.pages,
                   'device', x.device, 'os', x.os, 'browser', x.browser,
                   'city', x.city, 'country', x.country, 'source', coalesce(x.source, 'direct'),
                   -- the tampons the shop gave while the owner was in (the counter open, or not): what the visit was for
                   'stamps', x.stamps,
                   -- the pages of the visit, in order, with the time on each
                   'path', coalesce((select jsonb_agg(jsonb_build_object('route', w.route, 'screen', w.screen, 'ms', w.active_ms) order by w.entered_at)
                                     from (select * from public.views w where w.visit_id = x.id order by w.entered_at limit 40) w), '[]'::jsonb)) order by x.started_at desc)
          from (select v.*,
                       (select count(*) from public.views w where w.visit_id = v.id) as pages,
                       (select coalesce(sum(w.active_ms), 0) from public.views w where w.visit_id = v.id) as ms,
                       (select count(*) from public.moments m
                         where m.shop_id = s.id and m.kind = 'stamp'
                           and m.created_at >= v.started_at
                           and m.created_at <= coalesce(greatest(v.last_at, v.here_at), v.started_at) + interval '1 minute') as stamps
                from public.visits v where v.user_id = p.id order by v.started_at desc limit 30) x), '[]'::jsonb))
      from public.people p where p.id = s.owner_id),
    'customers', (select count(*) from public.cards where shop_id = s.id),
    'stamps', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp'),
    'today', (select count(*) from public.moments where shop_id = s.id and kind = 'stamp' and created_at >= public.tunis_today()),
    'given', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is not null),
    'waiting', (select count(*) from public.moments where shop_id = s.id and kind = 'gift' and given_at is null),
    'recent', coalesce((
      select jsonb_agg(jsonb_build_object('at', m.created_at, 'kind', m.kind, 'given', m.given_at is not null, 'gift', m.gift,
                                          'name', nullif(p.name, ''), 'phone', public.masked(p.phone),
                                          'item', (select i.name from public.items i where i.id = m.item_id)) order by m.created_at desc)
      from (select * from public.moments where shop_id = s.id order by created_at desc limit 15) m
      join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb),
    'top', coalesce((
      select jsonb_agg(jsonb_build_object('name', nullif(p.name, ''), 'phone', public.masked(p.phone), 'stamps', c.stamps, 'gifts', c.gifts,
                                          'goal', coalesce(c.goal, s.goal)) order by c.gifts desc, c.stamps desc)
      from (select * from public.cards where shop_id = s.id order by gifts desc, stamps desc limit 5) c
      left join public.people p on p.id = c.user_id), '[]'::jsonb))
    -- (a second object: one jsonb_build_object takes 100 arguments at most)
    || jsonb_build_object('held', public.held_list(s.id, 14), 'store_on', s.store_on,
         'trial_until', public.trial_end(s), 'trial_started', public.trial_started(s),
         'wheel_on', s.wheel_on, 'wheel_allowed', s.wheel_allowed, 'wheel', public.wheel_list(s.id),
         'wheel_fell', coalesce((select jsonb_agg(jsonb_build_object('name', x.gift, 'n', x.n) order by x.n desc)
                                 from (select m.gift, count(*) as n from public.moments m where m.shop_id = s.id and m.wheel and m.spun_at is not null group by m.gift) x), '[]'::jsonb), 'trial_over', now() >= public.trial_end(s), 'store', public.store_list(s.id),
         'orders', coalesce((select jsonb_agg(jsonb_build_object('at', o.created_at, 'name', o.name, 'qty', o.qty, 'cost', o.cost, 'status', o.status,
                                                                 'who', nullif(split_part(p.name, ' ', 1), '')) order by o.created_at desc)
                             from (select * from public.orders where shop_id = s.id order by created_at desc limit 20) o
                             join public.cards c on c.id = o.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb));
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
  -- and what a script wrote in the books
  delete from public.books where robot;
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
  select jsonb_build_object('id', m.id, 'gift', coalesce(m.gift, c.gift), 'spin', m.wheel and m.spun_at is null,
                            -- the ones ready to hand over (a turn of the wheel not spun yet is not one)
                            'n', (select count(*) from public.moments x where x.card_id = p_card and x.kind = 'gift' and x.given_at is null
                                    and not (x.wheel and x.spun_at is null)))
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
    'waiting', case when c.id is null then null else public.waiting_gift(c.id) end,
    'orders', case when c.id is null then '[]'::jsonb else public.orders_waiting(c.id) end,
    'said', public.id_said(s.id, v_person));
end $$;

-- the tampon, given by the shop: the same rules as a scan (one an hour, the
-- card's promise, the gift at the goal); thirty tries in ten minutes at most
drop function if exists public.give_stamp(text);
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

-- a tampon taken back: the shop gave it by hand to the wrong customer, or
-- twice. Only the card's latest tampon, within ten minutes; the gift it had
-- just filled goes with it while it waits — one already handed over is too
-- late, and so is the tampon under it. The card's last visit steps back too.
create or replace function public.unstamp(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; m public.moments%rowtype; c public.cards%rowtype; v_prev timestamptz; v_back int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select * into m from public.moments where id = p_moment and shop_id = s.id and kind = 'stamp' for update;
  if m.id is null then return public.err('not_found'); end if;
  if m.created_at < now() - interval '10 minutes' then return public.err('too_late'); end if;
  select * into c from public.cards where id = m.card_id for update;
  if exists (select 1 from public.moments x where x.card_id = c.id and x.kind = 'stamp' and x.id > m.id) then return public.err('not_last'); end if;
  if exists (select 1 from public.moments g where g.card_id = c.id and g.kind = 'gift' and g.id > m.id and g.given_at is not null) then return public.err('too_late'); end if;
  -- the vouchers that tampon filled go too, and give their stamps back to the card
  select coalesce(count(*), 0) * coalesce(c.goal, s.goal) into v_back
  from public.moments g where g.card_id = c.id and g.kind = 'gift' and g.id > m.id and g.given_at is null and g.banked;
  delete from public.moments g where g.card_id = c.id and g.kind = 'gift' and g.id > m.id and g.given_at is null;
  delete from public.moments where id = m.id;
  select max(created_at) into v_prev from public.moments where card_id = c.id and kind = 'stamp';
  update public.cards set stamps = greatest(stamps + coalesce(v_back, 0) - 1, 0), last_at = v_prev where id = c.id returning * into c;
  return jsonb_build_object('ok', true, 'card', public.card_view(c.id));
end $$;

-- ═══ a word to the customer's phone ════════════════════════════════════════
-- the phone said «إيه، فكّروني»: written down (again, if it is the same
-- address: the keys may be new)
create or replace function public.push_subscribe(p_endpoint text, p_p256dh text, p_auth text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid();
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  if p_endpoint !~ '^https://' or char_length(p_endpoint) > 2000 or char_length(coalesce(p_p256dh, '')) not between 20 and 200 or char_length(coalesce(p_auth, '')) not between 10 and 100 then return public.err('invalid'); end if;
  if not public.try_once('push:' || v_uid, 20, 60) then return public.err('too_many'); end if;
  insert into public.push_subs (user_id, endpoint, p256dh, auth) values (v_uid, p_endpoint, p_p256dh, p_auth)
  on conflict (endpoint) do update set user_id = excluded.user_id, p256dh = excluded.p256dh, auth = excluded.auth, created_at = now();
  return jsonb_build_object('ok', true);
end $$;

-- the phone takes its word back
create or replace function public.push_unsubscribe(p_endpoint text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  delete from public.push_subs where endpoint = p_endpoint and user_id = auth.uid();
  return jsonb_build_object('ok', true);
end $$;

-- (the morning's clock, through the server only) who to remind today: a
-- customer with a phone written down, whose card in a running, paid shop is on
-- its way — a tampon at least, none for two weeks, the last within two months
-- — or holds a gift for three days; and not reminded these thirty days
-- …and the owners: a card made, no tampon yet after half a day to three
-- days (made at night at home, never shown at the counter), the phone written
-- down — one word, the morning after (`kind` owner, `card` the shop's id)
create or replace function public.push_reminders() returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(x.line), '[]'::jsonb) from (
    select jsonb_build_object(
        'user_id', c.user_id, 'card', c.id, 'shop', s.name,
        'left', greatest(coalesce(c.goal, s.goal) - c.stamps, 0), 'gift', coalesce(c.gift, s.gift),
        'kind', case when w.waiting then 'gift' else 'near' end) as line
    from public.cards c join public.shops s on s.id = c.shop_id
    cross join lateral (select public.waits(c.id) as waiting) w
    where exists (select 1 from public.push_subs p where p.user_id = c.user_id)
      and not s.paused and s.paid_until > now() and s.goal is not null
      and (c.reminded_at is null or c.reminded_at < now() - interval '30 days')
      and ((w.waiting and c.last_at < now() - interval '3 days')
        or (not w.waiting and c.stamps >= 1 and c.last_at between now() - interval '60 days' and now() - interval '14 days'))
    union all
    select jsonb_build_object('user_id', s.owner_id, 'card', s.id, 'shop', s.name, 'left', 0, 'gift', coalesce(s.gift, ''), 'kind', 'owner')
    from public.shops s
    where s.goal is not null and not s.paused and s.nudged_at is null and not public.shut(s)
      -- the morning after the owner said yes (the phone written down eight hours or more before the run), the card still without a tampon
      and exists (select 1 from public.push_subs p where p.user_id = s.owner_id and p.created_at < now() - interval '8 hours')
      and not exists (select 1 from public.moments m where m.shop_id = s.id and m.kind = 'stamp')
  ) x
$$;

-- an owner's word claimed before it goes: «ok» only to the one clock that takes it (a cron delivered
-- twice, or a hand on «Run» during the morning's, sends one word, not two); once an owner, never again
create or replace function public.push_nudged(p_shop uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.shops set nudged_at = now() where id = p_shop and nudged_at is null;
  return jsonb_build_object('ok', found);
end $$;

-- a card's reminder claimed the same way: once a month at most, whoever asks first
create or replace function public.push_remembered(p_card uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  update public.cards set reminded_at = now() where id = p_card and (reminded_at is null or reminded_at < now() - interval '30 days');
  return jsonb_build_object('ok', found);
end $$;

-- the follow-up list: every shop with where it stands, the last word with its owner, the next day due
create or replace function public.admin_crm(p_q text default null, p_tests boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_like text := '%' || replace(replace(coalesce(trim(p_q), ''), '%', ''), '_', '') || '%'; v_all boolean;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo, 'goal', s.goal, 'created_at', s.created_at,
      'owner', jsonb_build_object('id', p.id, 'name', p.name, 'phone', p.phone),
      'paid', s.paid_until is not null and s.paid_until > now(), 'shut', public.shut(s),
      'trial_hours', greatest(0, ceil(extract(epoch from (public.trial_end(s) - now())) / 3600))::int,
      'test', coalesce(p.is_admin or p.is_tester, false),
      'stamps', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'stamp'),
      'last_stamp_at', (select max(m.created_at) from public.moments m where m.shop_id = s.id and m.kind = 'stamp'),
      'stage', coalesce(c.stage, 'new'), 'next_at', c.next_at, 'note', coalesce(c.note, ''), 'updated_at', c.updated_at,
      'tries', coalesce(l.tries, 0), 'talks', coalesce(l.talks, 0), 'talked_at', l.talked_at,
      'last', case when l.last_at is null then null else jsonb_build_object('kind', l.last_kind, 'outcome', l.last_outcome, 'text', l.last_text, 'at', l.last_at) end
      ) order by s.created_at desc)
    from public.shops s left join public.people p on p.id = s.owner_id
    left join public.crm c on c.shop_id = s.id
    left join lateral (
      select count(*) filter (where g.kind in ('call', 'whatsapp', 'visit')) as tries,
             count(*) filter (where g.kind = 'visit' or g.outcome in ('answered', 'replied')) as talks,
             max(g.at) filter (where g.kind = 'visit' or g.outcome in ('answered', 'replied')) as talked_at,
             max(g.at) as last_at,
             (array_agg(g.kind order by g.at desc))[1] as last_kind,
             (array_agg(g.outcome order by g.at desc))[1] as last_outcome,
             (array_agg(g.text order by g.at desc))[1] as last_text
      from public.crm_log g where g.shop_id = s.id and g.kind <> 'stage') l on true
    where (p_q is null or trim(p_q) = '' or s.name ilike v_like or coalesce(p.phone, '') like v_like or coalesce(p.name, '') ilike v_like)
      and (v_all or (not public.is_robot(s.owner_id) and coalesce(p.is_admin or p.is_tester, false) = coalesce(p_tests, false)))
  ), '[]'::jsonb);
end $$;

-- one shop's follow-up, whole: where it stands and every line of its log, newest first
create or replace function public.admin_crm_of(p_shop uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'stage', coalesce((select stage from public.crm where shop_id = p_shop), 'new'),
    'next_at', (select next_at from public.crm where shop_id = p_shop),
    'note', coalesce((select note from public.crm where shop_id = p_shop), ''),
    'log', coalesce((select jsonb_agg(jsonb_build_object('id', g.id, 'kind', g.kind, 'outcome', g.outcome, 'text', g.text, 'at', g.at) order by g.at desc)
                     from public.crm_log g where g.shop_id = p_shop), '[]'::jsonb));
end $$;

-- where a shop stands, by the founder's hand: the stage, the day to come back (p_clear_next empties it), the
-- note — a null leaves a thing as it was. A stage that changed is a line in the log too.
create or replace function public.admin_crm_set(p_shop uuid, p_stage text default null, p_next date default null, p_clear_next boolean default false, p_note text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_old text;
begin
  perform public.require_admin();
  if p_stage is not null and p_stage not in ('new', 'tried', 'talked', 'interested', 'promised', 'later', 'refused') then return public.err('bad_stage'); end if;
  if p_note is not null and char_length(p_note) > 2000 then return public.err('too_long'); end if;
  if not exists (select 1 from public.shops where id = p_shop) then return public.err('no_shop'); end if;
  select stage into v_old from public.crm where shop_id = p_shop;
  insert into public.crm (shop_id, stage, next_at, note)
  values (p_shop, coalesce(p_stage, 'new'), case when p_clear_next then null else p_next end, coalesce(p_note, ''))
  on conflict (shop_id) do update set
    stage = coalesce(p_stage, public.crm.stage),
    next_at = case when p_clear_next then null else coalesce(p_next, public.crm.next_at) end,
    note = coalesce(p_note, public.crm.note),
    updated_at = now();
  if p_stage is not null and p_stage is distinct from coalesce(v_old, 'new') then
    insert into public.crm_log (shop_id, kind, text) values (p_shop, 'stage', p_stage);
  end if;
  return (select jsonb_build_object('ok', true, 'stage', c.stage, 'next_at', c.next_at, 'note', c.note) from public.crm c where c.shop_id = p_shop);
end $$;

-- a word with the owner written down: a call (answered, no answer, busy, a wrong number), a WhatsApp (sent,
-- replied), a visit, or a note. The first words move the stage on their own — a try that got nobody makes a
-- «new» shop «tried», a talk makes a «new» or «tried» one «talked» — and a stage the founder chose stays.
create or replace function public.admin_crm_log(p_shop uuid, p_kind text, p_outcome text default null, p_text text default '') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id bigint; v_now text; v_stage text;
begin
  perform public.require_admin();
  if p_kind not in ('call', 'whatsapp', 'visit', 'note') then return public.err('bad_kind'); end if;
  if p_outcome is not null and p_outcome not in ('answered', 'no_answer', 'busy', 'wrong', 'sent', 'replied') then return public.err('bad_outcome'); end if;
  if char_length(coalesce(p_text, '')) > 2000 then return public.err('too_long'); end if;
  if not exists (select 1 from public.shops where id = p_shop) then return public.err('no_shop'); end if;
  insert into public.crm_log (shop_id, kind, outcome, text) values (p_shop, p_kind, p_outcome, coalesce(trim(p_text), '')) returning id into v_id;
  select stage into v_now from public.crm where shop_id = p_shop;
  v_stage := case
    when p_kind in ('call', 'whatsapp') and p_outcome in ('no_answer', 'busy', 'wrong', 'sent') and coalesce(v_now, 'new') = 'new' then 'tried'
    when (p_kind = 'visit' or p_outcome in ('answered', 'replied')) and coalesce(v_now, 'new') in ('new', 'tried') then 'talked'
    else null end;
  insert into public.crm (shop_id, stage) values (p_shop, coalesce(v_stage, 'new'))
  on conflict (shop_id) do update set stage = coalesce(v_stage, public.crm.stage), updated_at = now();
  return jsonb_build_object('ok', true, 'id', v_id, 'stage', coalesce(v_stage, v_now, 'new'));
end $$;

-- a line of the log taken back (a slip)
create or replace function public.admin_crm_unlog(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.crm_log where id = p_id;
  return jsonb_build_object('ok', found);
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
  -- the offer's 48 hours start the first time the owner's home asks — once the trial's clock runs
  if s.offer_at is null and (s.paid_until is null or s.paid_until < now()) and public.trial_started(s) then
    update public.shops set offer_at = now() where id = s.id returning * into s;
  end if;
  select * into y from public.payments where shop_id = s.id order by created_at desc limit 1;
  return jsonb_build_object(
    'paid_until', s.paid_until,
    'paid', s.paid_until is not null and s.paid_until > now(),
    'grant', (select jsonb_build_object('id', l.id, 'kind', l.kind, 'months', l.months, 'until', l.until_at, 'note', l.note, 'method', l.method, 'amount', l.amount)
              from public.plan_log l where l.shop_id = s.id and l.show_owner and l.seen_at is null order by l.created_at desc limit 1),
    'offer_until', s.offer_at + interval '48 hours',
    'offer', (s.paid_until is null or s.paid_until <= now()) and s.offer_at is not null and now() <= s.offer_at + interval '48 hours',
    -- the trial's end (its clock on the owner's home), and whether it is over
    'trial_until', public.trial_end(s),
    -- a clock that waits for the first customer has not started yet: the home says so instead of a countdown
    'trial_started', public.trial_started(s),
    'shut', public.shut(s),
    'exempt', exists (select 1 from public.people p where p.id = s.owner_id and (p.is_admin or p.is_tester)),
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

-- the founder's word on a payment: paid (the shop's year starts, or goes on) or
-- not. Paid, it goes in the books, and the owner's home says it once
create or replace function public.admin_payment_decide(p_id uuid, p_paid boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare y public.payments%rowtype; v_until timestamptz;
begin
  perform public.require_admin();
  select * into y from public.payments where id = p_id for update;
  if y.id is null then return public.err('invalid'); end if;
  if y.status <> 'pending' then return public.err('done'); end if;
  update public.payments set status = case when p_paid then 'paid' else 'refused' end, decided_at = now() where id = p_id;
  if p_paid then
    update public.shops set paid_until = greatest(coalesce(paid_until, now()), now()) + make_interval(months => y.months) where id = y.shop_id
    returning paid_until into v_until;
    insert into public.plan_log (shop_id, kind, months, until_at, method, amount, show_owner)
    values (y.shop_id, 'paid', y.months, v_until, case when y.method in ('d17', 'virement', 'versement', 'mandat') then y.method end, y.amount, true);
  end if;
  return jsonb_build_object('ok', true);
end $$;

-- the founder turns a shop's access on by hand, once the owner paid: so many
-- months more (from today, or from the end of the year already paid), or until
-- a date; or stops it now. Written in plan_log with how it was paid and what
-- came in (`p_amount`, in dinars; 0 for months added with no money);
-- `p_show`: the owner's home says it once («الأبونمان متاعك تفعّل»)
drop function if exists public.admin_plan(uuid, text, int, timestamptz, text, boolean);
drop function if exists public.admin_plan(uuid, text, int, timestamptz, text, boolean, text);
create or replace function public.admin_plan(p_shop uuid, p_kind text, p_months int default null, p_until timestamptz default null, p_note text default null, p_show boolean default true, p_method text default null, p_amount int default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_until timestamptz; v_note text := nullif(trim(coalesce(p_note, '')), '');
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_shop for update;
  if s.id is null then return public.err('not_found'); end if;
  if p_method is not null and p_method not in ('cash', 'd17', 'virement', 'versement', 'mandat') then return public.err('invalid'); end if;
  if p_amount is not null and p_amount not between 0 and 100000 then return public.err('invalid'); end if;
  if p_kind = 'paid' then
    if p_months is null or p_months not between 1 and 120 then return public.err('invalid'); end if;
    v_until := greatest(coalesce(s.paid_until, now()), now()) + make_interval(months => p_months);
  elsif p_kind = 'until' then
    if p_until is null or p_until <= now() or p_until > now() + interval '10 years' then return public.err('invalid'); end if;
    v_until := p_until;
  elsif p_kind = 'end' then
    v_until := now();
  else
    return public.err('invalid');
  end if;
  if v_note is not null and char_length(v_note) > 200 then return public.err('invalid'); end if;
  update public.shops set paid_until = v_until where id = s.id;
  -- months added with no money came no way at all
  insert into public.plan_log (shop_id, kind, months, until_at, note, show_owner, method, amount)
  values (s.id, p_kind, case when p_kind = 'paid' then p_months end, v_until, v_note, coalesce(p_show, false) and p_kind <> 'end',
          case when p_kind <> 'end' and coalesce(p_amount, 1) > 0 then p_method end, case when p_kind <> 'end' then p_amount end);
  -- money taken by hand settles the payment the owner said was coming
  if p_kind in ('paid', 'until') and coalesce(p_amount, 1) > 0 then
    update public.payments set status = 'paid', decided_at = now() where shop_id = s.id and status = 'pending';
  end if;
  return jsonb_build_object('ok', true, 'paid_until', v_until);
end $$;

-- the founder gives a shop more days of trial: added onto the trial still
-- running, or from now when it is over. Not a subscription — nothing paid, the
-- year stays as it was; the owner is told once, plainly, until when.
create or replace function public.admin_trial(p_shop uuid, p_days int, p_show boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_end timestamptz; v_days int; v_start timestamptz;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_shop for update;
  if s.id is null then return public.err('not_found'); end if;
  if p_days is null or p_days not between 1 and 60 then return public.err('invalid'); end if;
  -- the days count from the clock's start: the opening, or the first customer (not yet: from now)
  v_start := public.trial_start(s);
  v_end := greatest(public.trial_end(s), now()) + make_interval(days => p_days);
  v_days := ceil(extract(epoch from (v_end - v_start)) / 86400)::int;
  if v_days > 365 then return public.err('invalid'); end if;
  update public.shops set trial_days = v_days where id = s.id returning * into s;
  v_end := public.trial_end(s);
  insert into public.plan_log (shop_id, kind, months, until_at, show_owner) values (s.id, 'trial', null, v_end, coalesce(p_show, true));
  return jsonb_build_object('ok', true, 'trial_until', v_end);
end $$;

-- the owner saw the access the founder turned on: said once
create or replace function public.plan_seen(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  -- this one and any older one: the newest said it all
  update public.plan_log set seen_at = now() where id <= p_id and shop_id = s.id and seen_at is null;
  return jsonb_build_object('ok', true);
end $$;

-- the founder writes a line in the books: which side (in: what came in, out:
-- what the business spent), on what, how much, which day (today in Tunis
-- when not said; never a day to come), and its kind (one the side does not
-- know is «other»)
drop function if exists public.admin_expense_add(text, numeric, date, text);
drop function if exists public.admin_expense_delete(bigint);
create or replace function public.admin_book_add(p_side text, p_what text, p_amount numeric, p_on date default null, p_kind text default 'other') returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_what text := trim(regexp_replace(coalesce(p_what, ''), '\s+', ' ', 'g'));
  v_today date := (now() at time zone 'Africa/Tunis')::date;
  v_on date := coalesce(p_on, (now() at time zone 'Africa/Tunis')::date);
  v_kinds text[] := case when p_side = 'in' then array['sub', 'service'] else array['ads', 'tools', 'print', 'move', 'people'] end;
  v_id bigint;
begin
  perform public.require_admin();
  if p_side is null or p_side not in ('in', 'out') then return public.err('invalid'); end if;
  if char_length(v_what) not between 2 and 120 then return public.err('invalid'); end if;
  if p_amount is null or round(p_amount, 3) <= 0 or p_amount > 1000000 then return public.err('invalid'); end if;
  if v_on > v_today or v_on < v_today - 3660 then return public.err('invalid'); end if;
  insert into public.books (side, on_day, amount, what, kind, robot)
  values (p_side, v_on, round(p_amount, 3), v_what, case when p_kind = any (v_kinds) then p_kind else 'other' end, public.sees_robots())
  returning id into v_id;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- a line taken back (a slip of the finger). A script's admin takes back its
-- own lines only, the founder his
create or replace function public.admin_book_delete(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.books where id = p_id and robot = public.sees_robots();
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- the founder's books. What came in: every time a shop's access was turned
-- on or stopped, with what came in for it — the real shops only (a script's
-- admin sees everything) — and the lines he wrote himself. What went out: the
-- lines he wrote. The dinars of this month, of this year (Tunis time) and
-- since the start, each side; the months added with no money; the shops paid
-- right now; the payments the owners said are on their way; his own lines,
-- both sides, the newest day first (a script's lines only for a script);
-- `today`: the day in Tunis, for the form that adds a line.
create or replace function public.admin_ledger() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_all boolean; v_month timestamptz; v_year timestamptz; v_today date; v_month_d date; v_year_d date;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  v_month := date_trunc('month', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis';
  v_year := date_trunc('year', now() at time zone 'Africa/Tunis') at time zone 'Africa/Tunis';
  v_today := (now() at time zone 'Africa/Tunis')::date;
  v_month_d := date_trunc('month', v_today)::date;
  v_year_d := date_trunc('year', v_today)::date;
  return (
    with real_shops as (
      select s.* from public.shops s left join public.people p on p.id = s.owner_id
      where v_all or (not public.is_robot(s.owner_id) and not coalesce(p.is_admin or p.is_tester, false))
    ), lines as (
      -- money and access only: days of trial added are no sale
      select l.* from public.plan_log l where l.shop_id in (select id from real_shops) and l.kind <> 'trial'
    ), mine as (
      select b.* from public.books b where v_all or not b.robot
    )
    select jsonb_build_object(
      'today', v_today,
      'month', coalesce((select sum(amount) from lines where created_at >= v_month), 0) + coalesce((select sum(amount) from mine where side = 'in' and on_day >= v_month_d), 0),
      'year', coalesce((select sum(amount) from lines where created_at >= v_year), 0) + coalesce((select sum(amount) from mine where side = 'in' and on_day >= v_year_d), 0),
      'all', coalesce((select sum(amount) from lines), 0) + coalesce((select sum(amount) from mine where side = 'in'), 0),
      'out_month', coalesce((select sum(amount) from mine where side = 'out' and on_day >= v_month_d), 0),
      'out_year', coalesce((select sum(amount) from mine where side = 'out' and on_day >= v_year_d), 0),
      'out_all', coalesce((select sum(amount) from mine where side = 'out'), 0),
      'lines', coalesce((
        select jsonb_agg(jsonb_build_object('id', b.id, 'side', b.side, 'on', b.on_day, 'amount', b.amount, 'what', b.what, 'kind', b.kind) order by b.on_day desc, b.id desc)
        from mine b), '[]'::jsonb),
      'extra_months', coalesce((select sum(months) from lines where amount = 0), 0),
      'paying', (select count(*) from real_shops where paid_until > now()),
      'rows', coalesce((
        select jsonb_agg(jsonb_build_object('id', l.id, 'at', l.created_at, 'kind', l.kind, 'months', l.months, 'until', l.until_at,
                                            'amount', l.amount, 'method', l.method, 'note', l.note,
                                            'shop', jsonb_build_object('id', s.id, 'name', s.name),
                                            'owner', jsonb_build_object('name', nullif(p.name, ''), 'phone', p.phone)) order by l.created_at desc, l.id desc)
        from lines l join public.shops s on s.id = l.shop_id left join public.people p on p.id = s.owner_id), '[]'::jsonb),
      'waiting', coalesce((
        select jsonb_agg(jsonb_build_object('id', y.id, 'method', y.method, 'months', y.months, 'amount', y.amount, 'at', y.created_at,
                                            'shop', jsonb_build_object('id', s.id, 'name', s.name),
                                            'owner', jsonb_build_object('name', nullif(p.name, ''), 'phone', p.phone)) order by y.created_at desc)
        from public.payments y join real_shops s on s.id = y.shop_id left join public.people p on p.id = s.owner_id
        where y.status = 'pending'), '[]'::jsonb)));
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
  -- only somebody who is already set up and running: a shop with its card made.
  -- Halfway through opening, nothing is «new» yet — it is all new — and a note
  -- across the middle of it is an interruption, not news.
  select created_at into v_opened from public.shops where owner_id = v_uid and goal is not null;
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
-- The stretch a traffic page looks at: the last p_days days (1 to 90), or the
-- founder's own days, p_f.from to p_f.to (Tunis dates, both counted, 90 days
-- at the most; a date that is not one: the last p_days days). p_day0 – p_day1:
-- the days it shows as bars (a stretch of 7 days: today and the 6 before).
create or replace function public.traffic_span(p_days int, p_f jsonb, out p_from timestamptz, out p_to timestamptz, out p_day0 date, out p_day1 date)
language plpgsql stable set search_path = '' as $$
declare v_a date; v_b date; v_n int := greatest(1, least(coalesce(p_days, 7), 90));
begin
  begin
    if coalesce(p_f ->> 'from', '') ~ '^\d{4}-\d{2}-\d{2}$' then
      v_a := (p_f ->> 'from')::date;
      v_b := case when coalesce(p_f ->> 'to', '') ~ '^\d{4}-\d{2}-\d{2}$' then (p_f ->> 'to')::date else v_a end;
    end if;
  exception when others then
    v_a := null;
  end;
  if v_a is not null then
    if v_b < v_a then select v_b, v_a into v_a, v_b; end if;
    v_a := greatest(v_a, v_b - 89);
    p_from := v_a::timestamp at time zone 'Africa/Tunis';
    p_to := (v_b + 1)::timestamp at time zone 'Africa/Tunis';
    p_day0 := v_a;
    p_day1 := v_b;
  else
    p_to := now();
    p_day1 := (now() at time zone 'Africa/Tunis')::date;
    p_day0 := p_day1 - (v_n - 1);
    -- «24 ساعة» is the last 24 hours; a stretch of days starts at its first
    -- day's midnight, so the numbers count exactly the days the bars show
    p_from := case when v_n = 1 then now() - interval '1 day' else p_day0::timestamp at time zone 'Africa/Tunis' end;
  end if;
end $$;

-- Every visit of a stretch, with what the traffic page's filters ask about it,
-- and «misses»: the filters it fails (none: the page keeps it). A filter's own
-- menu counts the visits that miss nothing but that filter: what each choice in
-- it would give, the other filters kept. The filters (p_f), each one optional:
--   src   where it came from (facebook, instagram, direct…), or «meta»: Facebook
--         and Instagram together, the ads' visits with them (an fbclid)
--   camp  the ad (utm_campaign)
--   who   anon (no account), acct (an account, any), owner (a shop's), client (a card's, no shop)
--   seen  new (the phone's first visit ever) or back
--   dev, os, br, city   the phone, its system, its browser, the city (else the country)
--   page  went through this page: a route, or route:screen
--   did   did this: a signal's name, or rage (three taps on one spot), signup
--         (made an account on this visit), shop (opened a shop on it)
--   hour  began in this hour of the day (Tunis, 0 to 23)
--   same  on the same phone as this visit (its id)
-- p_all: with the founder's own visits (signed in as the founder, or on a
-- phone the founder ever used the site on, or on a tester's account) and the
-- robots'. Only the console's own functions call it (no grant).
drop function if exists public.traffic_visits(timestamptz, timestamptz, boolean, jsonb);
create or replace function public.traffic_visits(p_from timestamptz, p_to timestamptz, p_all boolean, p_f jsonb)
returns table (id uuid, visitor text, user_id uuid, started_at timestamptz, last_at timestamptz, src text, camp text, meta boolean,
               dev text, os text, br text, app boolean, city text, hour int, back boolean, who text, keys text[], did text[], misses text[])
language plpgsql stable set search_path = '' as $$
#variable_conflict use_column
declare
  f jsonb := coalesce(p_f, '{}'::jsonb);
  f_src text := nullif(f ->> 'src', '');
  f_camp text := nullif(f ->> 'camp', '');
  f_who text := nullif(f ->> 'who', '');
  f_seen text := nullif(f ->> 'seen', '');
  f_dev text := nullif(f ->> 'dev', '');
  f_os text := nullif(f ->> 'os', '');
  f_br text := nullif(f ->> 'br', '');
  f_city text := nullif(f ->> 'city', '');
  f_page text := nullif(f ->> 'page', '');
  f_did text := nullif(f ->> 'did', '');
  f_hour int := case when coalesce(f ->> 'hour', '') ~ '^\d{1,2}$' then (f ->> 'hour')::int end;
  f_same text;
begin
  if coalesce(f ->> 'same', '') ~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then
    -- a visit that is gone: nothing matches
    select coalesce((select x.visitor from public.visits x where x.id = (f ->> 'same')::uuid), '') into f_same;
  end if;
  return query
  with win as (
    select x.* from public.visits x
    where x.started_at >= p_from and x.started_at < p_to
      and (p_all or not (x.is_admin or x.is_bot
        or exists (select 1 from public.visits o where o.visitor = x.visitor and o.is_admin)
        or exists (select 1 from public.people t where t.id = x.user_id and t.is_tester)))
  ),
  firsts as (select o.visitor, min(o.started_at) as at from public.visits o where o.visitor in (select win.visitor from win) group by o.visitor),
  pg as (
    select w.visit_id, array_agg(distinct kk.k) as ks
    from public.views w join win on win.id = w.visit_id
    cross join lateral (values (w.route), (w.route || coalesce(':' || w.screen, ''))) kk(k)
    group by w.visit_id
  ),
  sg as (select s.visit_id, array_agg(distinct s.name) as ns from public.signals s join win on win.id = s.visit_id group by s.visit_id),
  rg as (select distinct t.visit_id from public.taps t join win on win.id = t.visit_id where t.rage),
  a as (
    select win.id, win.visitor, win.user_id, win.started_at, win.last_at,
      coalesce(win.source, 'direct') as src, win.campaign as camp,
      win.fbclid or coalesce(win.source, '') in ('facebook', 'instagram', 'fb', 'ig') as meta,
      coalesce(win.device, '?') as dev, coalesce(win.os, '?') as os, coalesce(win.browser, '?') as br, win.standalone as app,
      coalesce(nullif(win.city, ''), win.country, '?') as city,
      extract(hour from win.started_at at time zone 'Africa/Tunis')::int as hour,
      win.started_at > firsts.at as back,
      case when win.user_id is null then 'anon' when sh.id is not null then 'owner'
           when exists (select 1 from public.cards c where c.user_id = win.user_id) then 'client' else 'acct' end as who,
      coalesce(pg.ks, '{}'::text[]) as keys,
      coalesce(sg.ns, '{}'::text[])
        || case when rg.visit_id is not null then array['rage'] else '{}'::text[] end
        || case when pe.created_at between win.started_at - interval '2 minutes' and win.last_at + interval '10 minutes' then array['signup'] else '{}'::text[] end
        || case when sh.created_at between win.started_at - interval '2 minutes' and win.last_at + interval '10 minutes' then array['shop'] else '{}'::text[] end as did
    from win
    join firsts on firsts.visitor = win.visitor
    left join public.people pe on pe.id = win.user_id
    left join public.shops sh on sh.owner_id = win.user_id
    left join pg on pg.visit_id = win.id
    left join sg on sg.visit_id = win.id
    left join rg on rg.visit_id = win.id
  )
  select a.id, a.visitor, a.user_id, a.started_at, a.last_at, a.src, a.camp, a.meta, a.dev, a.os, a.br, a.app, a.city, a.hour, a.back, a.who, a.keys, a.did,
    array_remove(array[
      case when f_src is not null and not (case when f_src = 'meta' then a.meta else a.src = f_src end) then 'src' end,
      case when f_camp is not null and a.camp is distinct from f_camp then 'camp' end,
      case when f_who is not null and not (a.who = f_who or (f_who = 'acct' and a.who <> 'anon')) then 'who' end,
      case when f_seen is not null and a.back is distinct from (f_seen = 'back') then 'seen' end,
      case when f_dev is not null and a.dev <> f_dev then 'dev' end,
      case when f_os is not null and a.os <> f_os then 'os' end,
      case when f_br is not null and a.br <> f_br then 'br' end,
      case when f_city is not null and a.city <> f_city then 'city' end,
      case when f_page is not null and not (f_page = any (a.keys)) then 'page' end,
      case when f_did is not null and not (f_did = any (a.did)) then 'did' end,
      case when f_hour is not null and a.hour <> f_hour then 'hour' end,
      case when f_same is not null and a.visitor <> f_same then 'same' end
    ], null)
  from a;
end $$;

-- The traffic page, all of it, for one stretch and one set of filters (see
-- traffic_visits): the numbers, each with the stretch just before it (the same
-- filters, the same length); the days and the hours; where they came from, with
-- the accounts and the shops each source made; the phones, the places, the
-- pages, the two funnels; the visits themselves (p_limit, the newest first);
-- and each filter's menu.
drop function if exists public.admin_traffic(int, boolean);
create or replace function public.admin_traffic(p_days int default 7, p_all boolean default false, p_f jsonb default '{}'::jsonb, p_limit int default 100) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_from timestamptz; v_to timestamptz; v_day0 date; v_day1 date; v_before timestamptz;
begin
  perform public.require_admin();
  select x.p_from, x.p_to, x.p_day0, x.p_day1 into v_from, v_to, v_day0, v_day1 from public.traffic_span(p_days, p_f) x;
  v_before := v_from - (v_to - v_from);
  return (
    with t as (select * from public.traffic_visits(v_before, v_to, p_all, p_f)),
    a as (select * from t where t.started_at >= v_from),
    k as (select * from a where cardinality(a.misses) = 0),
    b as (select * from t where t.started_at < v_from and cardinality(t.misses) = 0),
    v as (select x.* from public.visits x join k on k.id = x.id),
    w as (
      select w.*, row_number() over (partition by w.visit_id order by w.entered_at desc) = 1 as last
      from public.views w join k on k.id = w.visit_id
    ),
    pv as (select k.id, count(w.id) as pages, coalesce(sum(w.active_ms), 0) as ms from k left join w on w.visit_id = k.id group by k.id),
    bv as (select b.id, count(w.id) as pages, coalesce(sum(w.active_ms), 0) as ms from b left join public.views w on w.visit_id = b.id group by b.id),
    tp as (select tp.* from public.taps tp join k on k.id = tp.visit_id),
    tc as (select tp.visit_id, count(*) as n, count(*) filter (where tp.rage) as rage from tp group by tp.visit_id),
    tr as (select w.visit_id, (array_agg(w.route || coalesce(':' || w.screen, '') order by w.entered_at))[1:14] as trail from w group by w.visit_id),
    -- what each filter's menu offers, and how many visits each choice keeps
    fv as (
      select a.id, f.k, f.v from a
      cross join lateral (values ('src', a.src), ('camp', a.camp), ('who', a.who), ('seen', case when a.back then 'back' else 'new' end),
                                 ('dev', a.dev), ('os', a.os), ('br', a.br), ('city', a.city)) f(k, v)
      where f.v is not null and a.misses <@ array[f.k]
      union all select a.id, 'src', 'meta' from a where a.meta and a.misses <@ array['src']
      union all select a.id, 'who', 'acct' from a where a.who in ('owner', 'client') and a.misses <@ array['who']
      union all select a.id, 'page', u.v from a cross join lateral unnest(a.keys) u(v) where a.misses <@ array['page']
      union all select a.id, 'did', u.v from a cross join lateral unnest(a.did) u(v) where a.misses <@ array['did']
    )
    select jsonb_build_object(
      'from', v_from, 'to', v_to,
      'visitors', (select count(distinct k.visitor) from k),
      'visits', (select count(*) from k),
      'views', (select count(*) from w),
      'avg_ms', (select coalesce(avg(pv.ms), 0)::bigint from pv),
      'bounce', (select coalesce(avg(case when pv.pages <= 1 then 1.0 else 0 end), 0) from pv),
      'taps', (select count(*) from tp),
      'rage', (select count(*) from tp where tp.rage),
      'from_ads', (select count(*) from k where k.meta),
      -- where they are using it from: the installed app, an ad's own browser, or the web
      'as_app', (select count(*) from k where k.app),
      'as_inapp', (select count(*) from k where not k.app and k.br in ('Facebook', 'Instagram', 'TikTok')),
      'as_web', (select count(*) from k where not k.app and k.br not in ('Facebook', 'Instagram', 'TikTok')),
      'app_people', (select count(distinct k.visitor) from k where k.app),
      'accounts', (select count(distinct k.user_id) from k where 'signup' = any (k.did)),
      'shops', (select count(distinct k.user_id) from k where 'shop' = any (k.did)),
      'signed', (select count(*) from k where k.user_id is not null),
      'before', jsonb_build_object(
        'visitors', (select count(distinct b.visitor) from b),
        'visits', (select count(*) from b),
        'avg_ms', (select coalesce(avg(bv.ms), 0)::bigint from bv),
        'bounce', (select coalesce(avg(case when bv.pages <= 1 then 1.0 else 0 end), 0) from bv),
        'from_ads', (select count(*) from b where b.meta),
        'as_app', (select count(*) from b where b.app),
        'accounts', (select count(distinct b.user_id) from b where 'signup' = any (b.did)),
        'shops', (select count(distinct b.user_id) from b where 'shop' = any (b.did))),
      -- a browser writes this detail: six digits at the most, or one forged «99999999999s» empties the page
      'video_s', (select coalesce(avg(substring(s.detail from '^(\d{1,6})s')::int), 0)::int
                  from public.signals s join k on k.id = s.visit_id where s.name = 'video_close' and s.detail ~ '^\d{1,6}s'),
      'signals', coalesce((
        select jsonb_agg(row_to_json(x) order by x.n desc) from (
          select s.name, case when s.name = 'video_close' then null else s.detail end as detail, count(*) as n, count(distinct s.visit_id) as visits
          from public.signals s join k on k.id = s.visit_id group by 1, 2 order by n desc limit 25) x), '[]'::jsonb),
      'days', coalesce((
        select jsonb_agg(jsonb_build_object('day', d.day, 'visits', coalesce(x.n, 0), 'accounts', coalesce(x.s, 0)) order by d.day)
        from (select v_day0 + g as day from generate_series(0, v_day1 - v_day0) g) d
        left join (select (k.started_at at time zone 'Africa/Tunis')::date as day, count(*) as n, count(distinct k.user_id) filter (where 'signup' = any (k.did)) as s
                   from k group by 1) x on x.day = d.day), '[]'::jsonb),
      -- the hours: their own filter left out, so every hour stays on the chart
      'hours', (
        select jsonb_agg(jsonb_build_object('h', h.h, 'visits', coalesce(x.n, 0), 'accounts', coalesce(x.s, 0)) order by h.h)
        from generate_series(0, 23) h(h)
        left join (select a.hour, count(*) as n, count(distinct a.user_id) filter (where 'signup' = any (a.did)) as s
                   from a where a.misses <@ array['hour'] group by a.hour) x on x.hour = h.h),
      'sources', coalesce((
        select jsonb_agg(row_to_json(x) order by x.visits desc) from (
          select k.src as source, k.camp as campaign, count(*) as visits, count(distinct k.visitor) as visitors,
                 round(avg(pv.pages), 1) as pages, coalesce(avg(pv.ms), 0)::bigint as ms, count(k.user_id) as signed,
                 count(distinct k.user_id) filter (where 'signup' = any (k.did)) as accounts,
                 count(distinct k.user_id) filter (where 'shop' = any (k.did)) as shops
          from k join pv on pv.id = k.id group by k.src, k.camp order by visits desc limit 30) x), '[]'::jsonb),
      'devices', coalesce((
        select jsonb_agg(row_to_json(x) order by x.visits desc) from (
          select k.dev as device, k.os, k.br as browser, count(*) as visits
          from k group by 1, 2, 3 order by visits desc limit 12) x), '[]'::jsonb),
      'places', coalesce((
        select jsonb_agg(row_to_json(x) order by x.visits desc) from (
          select coalesce(v.country, '?') as country, coalesce(v.city, '') as city, count(*) as visits from v group by 1, 2 order by visits desc limit 12) x), '[]'::jsonb),
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
          select w.visit_id,
                 bool_or(w.route = '/' and coalesce(w.screen, 'welcome') = 'welcome') as o1, bool_or(w.route = '/shop/new') as o2,
                 bool_or(w.route = '/shop/setup') as o3, bool_or(w.route = '/shop/card') as o4, bool_or(w.route = '/shop/qr') as o5,
                 bool_or(w.route = '/s/[token]') as c1, bool_or(w.route = '/s/[token]' and w.screen = 'held') as c2,
                 bool_or(w.route = '/join') as c3, bool_or(w.route = '/s/[token]' and w.screen = 'stamped') as c4
          from w group by w.visit_id) f),
      'recent', coalesce((
        select jsonb_agg(row_to_json(x) order by x.started_at desc) from (
          select v.id, v.started_at, k.src as source, v.campaign, v.device, v.os, v.browser, v.country, v.city, v.landing,
                 v.user_id is not null as signed, v.user_id, k.who, k.back, 'signup' = any (k.did) as signup, 'shop' = any (k.did) as opened,
                 nullif(pe.name, '') as person, sh.id as shop_id, sh.name as shop,
                 pv.pages, pv.ms, coalesce(tc.n, 0) as taps, coalesce(tc.rage, 0) as rage, to_jsonb(tr.trail) as trail
          from v join k on k.id = v.id join pv on pv.id = v.id
          left join tc on tc.visit_id = v.id left join tr on tr.visit_id = v.id
          left join public.people pe on pe.id = v.user_id left join public.shops sh on sh.owner_id = v.user_id
          order by v.started_at desc limit greatest(10, least(coalesce(p_limit, 100), 500))) x), '[]'::jsonb),
      'options', coalesce((
        select jsonb_object_agg(o.k, o.items) from (
          select y.k, jsonb_agg(jsonb_build_object('v', y.v, 'n', y.n) order by y.n desc, y.v) as items
          from (select fv.k, fv.v, count(distinct fv.id) as n, row_number() over (partition by fv.k order by count(distinct fv.id) desc, fv.v) as r
                from fv group by fv.k, fv.v) y
          where y.r <= 40 group by y.k) o), '{}'::jsonb)
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
      'visits_after', (select count(*) from public.visits o where o.visitor = v.visitor and o.started_at > v.started_at),
      -- whose visit it was, when signed in: the name, the phone to call, the shop
      'who', (select jsonb_build_object('id', pe.id, 'name', nullif(pe.name, ''), 'phone', pe.phone,
                                        'shop', (select jsonb_build_object('id', sh.id, 'name', sh.name) from public.shops sh where sh.owner_id = pe.id))
              from public.people pe where pe.id = v.user_id),
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

-- where fingers land on one screen: the taps, and what was tapped most — on the
-- visits the traffic page's filters keep (see traffic_visits)
drop function if exists public.admin_heat(text, text, int, boolean);
create or replace function public.admin_heat(p_route text, p_screen text, p_days int default 30, p_all boolean default false, p_f jsonb default '{}'::jsonb) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_from timestamptz; v_to timestamptz;
begin
  perform public.require_admin();
  select x.p_from, x.p_to into v_from, v_to from public.traffic_span(p_days, p_f) x;
  return (
    with k as (select x.id from public.traffic_visits(v_from, v_to, p_all, p_f) x where cardinality(x.misses) = 0),
    t as (select t.* from public.taps t join k on k.id = t.visit_id where t.route = p_route and t.screen is not distinct from nullif(p_screen, '')),
    w as (select w.* from public.views w join k on k.id = w.visit_id where w.route = p_route and w.screen is not distinct from nullif(p_screen, ''))
    select jsonb_build_object(
      'views', (select count(*) from w),
      'ms', (select coalesce(avg(w.active_ms), 0)::bigint from w),
      'taps', coalesce((select jsonb_agg(jsonb_build_array(round(t2.x::numeric, 4), round(t2.y::numeric, 4), case when t2.rage then 2 when t2.dead then 1 else 0 end))
                        from (select * from t order by t.at desc limit 4000) t2), '[]'::jsonb),
      'top', coalesce((select jsonb_agg(row_to_json(x) order by x.n desc) from (
        select coalesce(t.target, '—') as target, coalesce(t.kind, '') as kind, count(*) as n, count(*) filter (where t.rage) as rage, bool_or(t.dead) as dead
        from t group by 1, 2 order by n desc limit 15) x), '[]'::jsonb)
    )
  );
end $$;

-- (2026-10-08) a few visits from the ad came with its words encoded twice
-- («POINTILI+TEST2+%7C+Site»), and a few counted pointili.online as a site of
-- its own: read as written, and as direct. The beacon reads both right since.
update public.visits set
  campaign = case when campaign ~ '%[0-9A-Fa-f]{2}' then replace(replace(replace(campaign, '+', ' '), '%7C', '|'), '%20', ' ') else campaign end,
  content = case when content ~ '%[0-9A-Fa-f]{2}' then replace(replace(replace(content, '+', ' '), '%7C', '|'), '%20', ' ') else content end
where campaign ~ '%[0-9A-Fa-f]{2}' or content ~ '%[0-9A-Fa-f]{2}';
update public.visits set source = 'direct' where source = 'pointili.online';

-- who is on the site right now, as the console shows it. Online: a ping in the
-- last 75 seconds that was not «away» (here: touched lately; idle: the page open,
-- untouched). Gone: seen in the last half hour, not now. One line per person —
-- their liveliest visit (several phones: any one online makes them online) —
-- plus how many strangers (no account) are on a page right now.
create or replace function public.admin_online() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'now', now(),
    'people', coalesce((
      select jsonb_agg(jsonb_build_object('user', x.user_id, 'state', x.state, 'path', x.here_path, 'since', x.here_since, 'at', x.here_at,
                                          'name', p.name, 'phone', p.phone, 'shop', case when s.id is null then null else jsonb_build_object('id', s.id, 'name', s.name) end)
                       order by (x.state = 'here') desc, (x.state = 'idle') desc, x.here_at desc)
      from (
        select distinct on (v.user_id) v.user_id, v.here_path, v.here_since, v.here_at,
          case when v.here_state in ('here', 'idle') and v.here_at > now() - interval '75 seconds' then v.here_state else 'gone' end as state
        from public.visits v
        where v.user_id is not null and v.here_at > now() - interval '30 minutes' and not v.is_admin and not v.is_bot
        order by v.user_id,
          (v.here_state in ('here', 'idle') and v.here_at > now() - interval '75 seconds') desc,
          (v.here_state = 'here') desc,
          v.here_at desc
      ) x
      join public.people p on p.id = x.user_id
      left join public.shops s on s.owner_id = x.user_id
      -- the machines' accounts and the founder's test account stay out (as from
      -- every other number), unless a machine is asking (its own run)
      where not p.is_admin and (public.sees_robots() or (not public.is_robot(p.id) and not p.is_tester))
    ), '[]'::jsonb),
    -- and a phone the founder ever used the site on is the founder's, signed in or not
    'strangers', (select count(*) from public.visits v
                  where v.user_id is null and v.here_state in ('here', 'idle') and v.here_at > now() - interval '75 seconds'
                    and not v.is_admin and not v.is_bot
                    and not exists (select 1 from public.visits o where o.visitor = v.visitor and o.is_admin))
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
                             device, os, browser, screen, lang, country, city, is_admin, is_bot, standalone, session_id)
  values (v_id, left(v ->> 'visitor', 64), nullif(v ->> 'user_id', '')::uuid, left(v ->> 'landing', 300), left(v ->> 'referrer', 300),
          left(v ->> 'source', 60), left(v ->> 'medium', 60), left(v ->> 'campaign', 120), left(v ->> 'content', 120), left(v ->> 'term', 120),
          coalesce((v ->> 'fbclid')::boolean, false), left(v ->> 'device', 20), left(v ->> 'os', 30), left(v ->> 'browser', 40),
          left(v ->> 'screen', 20), left(v ->> 'lang', 20), left(v ->> 'country', 4), left(v ->> 'city', 60),
          coalesce((v ->> 'is_admin')::boolean, false), coalesce((v ->> 'is_bot')::boolean, false),
          coalesce((v ->> 'standalone')::boolean, false),
          case when coalesce(v ->> 'session_id', '') ~ '^[0-9a-f-]{36}$' then (v ->> 'session_id')::uuid end)
  on conflict (id) do update set
    last_at = now(),
    user_id = coalesce(excluded.user_id, public.visits.user_id),
    session_id = coalesce(excluded.session_id, public.visits.session_id),
    is_admin = public.visits.is_admin or excluded.is_admin,
    is_bot = public.visits.is_bot or excluded.is_bot;
  -- where the person is right now, sent with every batch too (the pings come between batches)
  if coalesce(p -> 'here' ->> 'state', '') in ('here', 'idle', 'away') then
    perform public.here(v_id, p -> 'here' ->> 'state', coalesce(p -> 'here' ->> 'path', ''), nullif(v ->> 'user_id', '')::uuid);
  end if;

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
-- the presence ping (server only, from /api/here): this visit's page is on a
-- screen right now (here / idle), or just left it (away). A streak starts
-- again after 75 quiet seconds — the moment someone came back.
create or replace function public.here(p_visit uuid, p_state text, p_path text, p_user uuid) returns void
language sql security definer set search_path = '' as $$
  update public.visits set
    here_since = case when p_state <> 'away' and (here_state is null or here_state = 'away' or here_at < now() - interval '75 seconds') then now() else here_since end,
    here_at = now(),
    here_state = p_state,
    here_path = left(p_path, 300),
    user_id = coalesce(user_id, p_user)
  where id = p_visit and p_state in ('here', 'idle', 'away') and not is_admin;
$$;

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
  -- and the person it happened to, on a topic of their own uuid (18 Oct 2026): their
  -- cards are open on a phone at the counter while the shop scans, and they should
  -- see the tampon land without being told to pull the page down. Their own id only,
  -- never a shop's signal, which stays the counter's private radio.
  begin
    if tg_table_name = 'moments' then
      perform realtime.send('{}'::jsonb, 'ping', 'pointili:p:' || (select c.user_id from public.cards c where c.id = new.card_id and c.user_id is not null), false);
    end if;
  exception when others then null;
  end;
  return null;
end $$;
drop trigger if exists moments_ping on public.moments;
create trigger moments_ping after insert on public.moments for each row execute function public.ping_counter();
drop trigger if exists codes_ping on public.codes;
create trigger codes_ping after update of held_hash, used_at, tried_at on public.codes for each row
  when ((old.held_hash is null and new.held_hash is not null) or (old.used_at is null and new.used_at is not null)
        or (new.tried_at is distinct from old.tried_at))
  execute function public.ping_counter();


-- ═══ the store: a shop the founder switches to it ══════════════════════════
-- For a few shops, by the founder's hand only. The card's goal and gift step
-- aside: every tampon stays on the card (cards.stamps, never spent by a gift),
-- and the owner fills a store — things, each with its price in tampons. The
-- customer buys from it on their card, several things at once: the tampons
-- leave at once (set aside for the order), the order waits, and the owner
-- hands it over when the customer shows their code, as with a gift. A shop
-- that is not switched sees none of it, and neither do its customers — the
-- same customer keeps their ordinary cards everywhere else.
alter table public.shops add column if not exists store_on boolean not null default false;

create table if not exists public.store_items (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  cost        int  not null check (cost between 1 and 9999),
  rank        int  not null default 0,
  gone        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists store_items_shop_idx on public.store_items (shop_id, rank, id);

create table if not exists public.orders (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  card_id     uuid not null references public.cards (id) on delete cascade,
  batch       uuid not null,
  item_id     bigint references public.store_items (id) on delete set null,
  name        text not null,
  cost        int  not null,
  qty         int  not null check (qty between 1 and 20),
  status      text not null default 'waiting' check (status in ('waiting', 'given', 'cancelled')),
  created_at  timestamptz not null default now(),
  done_at     timestamptz
);
create index if not exists orders_card_idx on public.orders (card_id, created_at desc);
create index if not exists orders_shop_idx on public.orders (shop_id, created_at desc);
create index if not exists orders_waiting_idx on public.orders (card_id) where status = 'waiting';
-- like every table: closed to the browser, read and written only through the functions below
alter table public.store_items enable row level security;
alter table public.store_items force row level security;
revoke all on public.store_items from anon, authenticated, public;
alter table public.orders enable row level security;
alter table public.orders force row level security;
revoke all on public.orders from anon, authenticated, public;

-- the things on sale, in the owner's order
create or replace function public.store_list(p_shop uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', i.id, 'name', i.name, 'cost', i.cost) order by i.rank, i.id), '[]'::jsonb)
  from public.store_items i where i.shop_id = p_shop and not i.gone
$$;

-- the orders waiting on a card, one per purchase, its lines and its total
create or replace function public.orders_waiting(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(b order by b ->> 'at'), '[]'::jsonb) from (
    select jsonb_build_object('batch', o.batch, 'at', min(o.created_at),
             'lines', jsonb_agg(jsonb_build_object('name', o.name, 'qty', o.qty, 'cost', o.cost) order by o.id),
             'total', sum(o.cost * o.qty)) as b
    from public.orders o where o.card_id = p_card and o.status = 'waiting'
    group by o.batch) x
$$;

-- the founder switches a shop to the store, or back to its card (only a shop with a card)
create or replace function public.admin_set_store(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return public.err('not_found'); end if;
  -- one or the other: the store keeps every tampon, the wheel needs a full card. A shop with no card
  -- yet gets a quiet one (the store never shows it): its set-up is the store, nothing else
  update public.shops set store_on = coalesce(p_on, false), wheel_on = case when coalesce(p_on, false) then false else wheel_on end,
                          goal = case when coalesce(p_on, false) then coalesce(goal, 10) else goal end,
                          gift = case when coalesce(p_on, false) then coalesce(gift, 'الماغازة') else gift end
  where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- the founder's switch for «شنوّة يبيع»: the counter asks which thing each tampon is for. Only with things
-- written down (none: refused, the counter would ask about nothing); off keeps what was written and recorded
create or replace function public.admin_set_items(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_n int;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return public.err('not_found'); end if;
  select count(*) into v_n from public.items where shop_id = s.id and rank < 999;
  if coalesce(p_on, false) and v_n = 0 then return public.err('no_items'); end if;
  update public.shops set items_on = coalesce(p_on, false) where id = p_id;
  return jsonb_build_object('ok', true, 'on', coalesce(p_on, false));
end $$;

-- the owner's store: what is on sale, the orders waiting, and what went these 30 days
create or replace function public.my_store() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'on', s.store_on,
    'items', public.store_list(s.id),
    'waiting', coalesce((
      select jsonb_agg(jsonb_build_object('card', w.card_id, 'name', nullif(split_part(p.name, ' ', 1), ''), 'phone', public.masked(p.phone),
                                          'orders', public.orders_waiting(w.card_id)) order by w.at)
      from (select card_id, min(created_at) as at from public.orders where shop_id = s.id and status = 'waiting' group by card_id) w
      join public.cards c on c.id = w.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb),
    'sold', coalesce((
      select jsonb_agg(jsonb_build_object('name', x.name, 'n', x.n) order by x.n desc)
      from (select o.name, sum(o.qty) as n from public.orders o
            where o.shop_id = s.id and o.status = 'given' and o.done_at > now() - interval '30 days' group by o.name) x), '[]'::jsonb));
end $$;

-- the owner writes the store: the whole list in their order ([{id?, name, cost}]); a thing
-- left out is taken off sale (kept, so what was bought keeps its name)
create or replace function public.store_save(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; x jsonb; v_rank int := 0; v_keep bigint[] := '{}'; v_id bigint; v_name text; v_cost int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if not s.store_on then return public.err('store_off'); end if;
  if jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) > 40 then return public.err('invalid'); end if;
  for x in select * from jsonb_array_elements(p_items) loop
    v_name := btrim(coalesce(x ->> 'name', ''));
    v_cost := case when coalesce(x ->> 'cost', '') ~ '^\d{1,4}$' then (x ->> 'cost')::int end;
    if char_length(v_name) not between 1 and 40 or v_cost is null or v_cost < 1 then return public.err('invalid'); end if;
    v_id := case when coalesce(x ->> 'id', '') ~ '^\d{1,18}$' then (x ->> 'id')::bigint end;
    if v_id is not null and exists (select 1 from public.store_items where id = v_id and shop_id = s.id) then
      update public.store_items set name = v_name, cost = v_cost, rank = v_rank, gone = false where id = v_id;
    else
      insert into public.store_items (shop_id, name, cost, rank) values (s.id, v_name, v_cost, v_rank) returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_rank := v_rank + 1;
  end loop;
  update public.store_items set gone = true where shop_id = s.id and not gone and not (id = any (v_keep));
  return jsonb_build_object('ok', true, 'items', public.store_list(s.id));
end $$;

-- the customer's side of a store: the tampons on the card, the things, the orders waiting
create or replace function public.card_store(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'balance', c.stamps, 'items', public.store_list(s.id), 'waiting', public.orders_waiting(c.id))
  from public.cards c join public.shops s on s.id = c.shop_id
  where c.id = p_card and c.user_id = auth.uid() and s.store_on
$$;

-- the customer buys ([{id, qty}]): every line checked, the tampons taken at once, one order
create or replace function public.store_buy(p_card uuid, p_lines jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cards%rowtype; s public.shops%rowtype; x jsonb; v_total int := 0; v_batch uuid := gen_random_uuid(); i public.store_items%rowtype; v_qty int; v_n int := 0;
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  select * into c from public.cards where id = p_card and user_id = auth.uid() for update;
  if c.id is null then return public.err('not_found'); end if;
  select * into s from public.shops where id = c.shop_id;
  if not s.store_on then return public.err('store_off'); end if;
  if s.paused or public.shut(s) then return public.err('paused'); end if;
  if jsonb_typeof(p_lines) <> 'array' or jsonb_array_length(p_lines) = 0 or jsonb_array_length(p_lines) > 20 then return public.err('invalid'); end if;
  if not public.try_once('buy:' || auth.uid(), 20, 10) then return public.err('too_many'); end if;
  for x in select * from jsonb_array_elements(p_lines) loop
    v_qty := case when coalesce(x ->> 'qty', '') ~ '^\d{1,2}$' then (x ->> 'qty')::int end;
    select * into i from public.store_items where id = case when coalesce(x ->> 'id', '') ~ '^\d{1,18}$' then (x ->> 'id')::bigint end
      and shop_id = s.id and not gone;
    if i.id is null or v_qty is null or v_qty not between 1 and 20 then return public.err('invalid'); end if;
    v_total := v_total + i.cost * v_qty;
    insert into public.orders (shop_id, card_id, batch, item_id, name, cost, qty) values (s.id, c.id, v_batch, i.id, i.name, i.cost, v_qty);
    v_n := v_n + 1;
  end loop;
  if v_total > c.stamps then
    raise exception 'not_enough' using errcode = 'P0001', detail = v_total::text;
  end if;
  update public.cards set stamps = stamps - v_total where id = c.id;
  return jsonb_build_object('ok', true, 'batch', v_batch, 'total', v_total) || public.card_store(c.id);
exception when raise_exception then
  if sqlerrm = 'not_enough' then return public.err('not_enough'); end if;
  raise;
end $$;

-- the customer takes an order back before it is handed over: the tampons come back
create or replace function public.store_cancel(p_card uuid, p_batch uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c public.cards%rowtype; v_back int;
begin
  select * into c from public.cards where id = p_card and user_id = auth.uid() for update;
  if c.id is null then return public.err('not_found'); end if;
  select coalesce(sum(cost * qty), 0) into v_back from public.orders where card_id = c.id and batch = p_batch and status = 'waiting';
  if v_back = 0 then return public.err('not_found'); end if;
  update public.orders set status = 'cancelled', done_at = now() where card_id = c.id and batch = p_batch and status = 'waiting';
  update public.cards set stamps = stamps + v_back where id = c.id;
  return jsonb_build_object('ok', true) || public.card_store(c.id);
end $$;

-- the owner hands over what a customer ordered (all of it, or one order)
create or replace function public.store_give(p_card uuid, p_batch uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_n int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  update public.orders set status = 'given', done_at = now()
  where shop_id = s.id and card_id = p_card and status = 'waiting' and (p_batch is null or batch = p_batch);
  get diagnostics v_n = row_count;
  if v_n = 0 then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

-- the customer's purchases on this card, for its story
create or replace function public.orders_story(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('at', b.at, 'status', b.status, 'total', b.total, 'lines', b.lines) order by b.at desc), '[]'::jsonb)
  from (select o.batch, min(o.created_at) as at, min(o.status) as status, sum(o.cost * o.qty) as total,
               string_agg(o.qty || '× ' || o.name, '، ' order by o.id) as lines
        from public.orders o where o.card_id = p_card group by o.batch order by min(o.created_at) desc limit 20) b
$$;


-- ═══ a number that is not theirs ═══════════════════════════════════════════
-- An owner signed up with a number that is plainly not theirs (55 555 555…):
-- the founder asks for the real one. Until they give it, every owner screen is
-- covered by one question; once given, it waits for the founder's call, and
-- the founder says it is right (or asks again).
alter table public.people add column if not exists phone_ask_at   timestamptz;
alter table public.people add column if not exists phone_given    text check (phone_given is null or phone_given ~ '^[2-9][0-9]{7}$');
alter table public.people add column if not exists phone_given_at timestamptz;
alter table public.people add column if not exists phone_ok_at    timestamptz;

-- where it stands, for the owner's screens: null (nothing asked), 'ask', or 'sent' (waiting for the call)
create or replace function public.phone_state(p public.people) returns text
language sql stable set search_path = '' as $$
  select case when p.phone_ask_at is null then null
              when p.phone_given_at is null or p.phone_given_at < p.phone_ask_at then 'ask'
              else 'sent' end
$$;

-- the founder asks for the real number (p_on), or says the one given is right / takes the question back
create or replace function public.admin_phone_ask(p_person uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if coalesce(p_on, false) then
    update public.people set phone_ask_at = now(), phone_ok_at = null where id = p_person;
  else
    update public.people set phone_ask_at = null, phone_ok_at = case when phone_given is not null then now() end where id = p_person;
  end if;
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- the owner gives their real number: eight digits, a Tunisian line, not a row of the same digit or a run
create or replace function public.phone_give(p_phone text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v text := regexp_replace(coalesce(p_phone, ''), '\D', '', 'g'); v_old text;
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  if v ~ '^216[0-9]{8}$' then v := substr(v, 4); end if;
  if v !~ '^[2-9][0-9]{7}$' or v ~ '^(\d)\1{7}$' or v in ('12345678', '23456789', '98765432', '87654321')
     or v ~ '^(\d\d)\1{3}$' then
    return public.err('invalid');
  end if;
  select regexp_replace(coalesce(phone, ''), '\D', '', 'g') into v_old from public.people where id = auth.uid();
  if right(v_old, 8) = v then return public.err('same'); end if;
  if not public.try_once('phone:' || auth.uid(), 5, 60) then return public.err('too_many'); end if;
  update public.people set phone_given = v, phone_given_at = now() where id = auth.uid() and phone_ask_at is not null;
  if not found then return public.err('not_asked'); end if;
  return jsonb_build_object('ok', true);
end $$;


-- ═══ the wheel: a shop the founder switches to it ══════════════════════════
-- For a few shops, by the founder's hand. The card is the usual one — a goal
-- of tampons — but a full card is not one gift: it is a turn of the owner's
-- wheel. The owner writes the prizes and each one's chance (in percent, 100 in
-- all); the gift waits as «الروليت» until it is spun — by the customer on their
-- card, or by the owner at the counter — and then it is the prize, handed over
-- like any gift (the customer's code). Other shops never see any of it.
alter table public.shops add column if not exists wheel_on boolean not null default false;
-- since 17 Oct 2026 the wheel is two switches: the founder lets a shop have it (wheel_allowed,
-- the console's — the column is made with the shops, above: functions read it), and its owner
-- turns it on and off for his customers (wheel_on, «الروليت»)
-- the shops the founder had put on the wheel before: allowed. Only ever true where it is on — never undone
update public.shops set wheel_allowed = true where wheel_on and not wheel_allowed;
-- From 18 Oct 2026 the wheel is offered to every shop (the founder): a shop is allowed it from the
-- day it opens, so a brand-new owner meets it on their very first card.
--
-- Only the default. The shops already open that day were allowed in one deliberate pass, by hand,
-- and this file does NOT do it: wheel_allowed is one of the switches scripts/db.mjs watches, and a
-- line here that set it would be read — rightly — as this file trampling the founder's hand, put
-- back, and shouted about. A switch the founder turns off has to stay off through every re-run.
alter table public.shops alter column wheel_allowed set default true;
alter table public.moments add column if not exists wheel boolean not null default false;
alter table public.moments add column if not exists spun_at timestamptz;

create table if not exists public.wheel_prizes (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 1 and 40),
  chance      int  not null check (chance between 1 and 100),
  rank        int  not null default 0,
  gone        boolean not null default false,
  created_at  timestamptz not null default now()
);
create index if not exists wheel_prizes_shop_idx on public.wheel_prizes (shop_id, rank, id);
alter table public.wheel_prizes enable row level security;
alter table public.wheel_prizes force row level security;
revoke all on public.wheel_prizes from anon, authenticated, public;

-- the prizes on the wheel, in the owner's order
create or replace function public.wheel_list(p_shop uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('id', w.id, 'name', w.name, 'chance', w.chance) order by w.rank, w.id), '[]'::jsonb)
  from public.wheel_prizes w where w.shop_id = p_shop and not w.gone
$$;

-- the founder switches a shop to the wheel, or back (only a shop with a card; never with the store)
create or replace function public.admin_set_wheel(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return public.err('not_found'); end if;
  -- the founder allows the wheel; the owner turns it on («الروليت»). Taken away, it is off too
  update public.shops set wheel_allowed = coalesce(p_on, false), wheel_on = case when coalesce(p_on, false) then wheel_on else false end where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- the owner's wheel: its prizes, and what fell these 30 days
create or replace function public.my_wheel() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'on', s.wheel_on, 'allowed', s.wheel_allowed, 'prizes', public.wheel_list(s.id),
    'fell', coalesce((select jsonb_agg(jsonb_build_object('name', x.gift, 'n', x.n) order by x.n desc)
                      from (select m.gift, count(*) as n from public.moments m
                            where m.shop_id = s.id and m.wheel and m.spun_at > now() - interval '30 days' group by m.gift) x), '[]'::jsonb));
end $$;

-- the owner writes the wheel: the whole list ([{id?, name, chance}]), 2 to 12 prizes, 100% in all
create or replace function public.wheel_save(p_prizes jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; x jsonb; v_rank int := 0; v_keep bigint[] := '{}'; v_id bigint; v_name text; v_chance int; v_sum int := 0;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if not s.wheel_allowed then return public.err('wheel_off'); end if;
  if jsonb_typeof(p_prizes) <> 'array' or jsonb_array_length(p_prizes) not between 2 and 12 then return public.err('count'); end if;
  for x in select * from jsonb_array_elements(p_prizes) loop
    v_chance := case when coalesce(x ->> 'chance', '') ~ '^\d{1,3}$' then (x ->> 'chance')::int end;
    if char_length(btrim(coalesce(x ->> 'name', ''))) not between 1 and 40 or v_chance is null or v_chance not between 1 and 100 then return public.err('invalid'); end if;
    v_sum := v_sum + v_chance;
  end loop;
  if v_sum <> 100 then return public.err('sum'); end if;
  for x in select * from jsonb_array_elements(p_prizes) loop
    v_name := btrim(x ->> 'name');
    v_chance := (x ->> 'chance')::int;
    v_id := case when coalesce(x ->> 'id', '') ~ '^\d{1,18}$' then (x ->> 'id')::bigint end;
    if v_id is not null and exists (select 1 from public.wheel_prizes where id = v_id and shop_id = s.id) then
      update public.wheel_prizes set name = v_name, chance = v_chance, rank = v_rank, gone = false where id = v_id;
    else
      insert into public.wheel_prizes (shop_id, name, chance, rank) values (s.id, v_name, v_chance, v_rank) returning id into v_id;
    end if;
    v_keep := v_keep || v_id;
    v_rank := v_rank + 1;
  end loop;
  update public.wheel_prizes set gone = true where shop_id = s.id and not gone and not (id = any (v_keep));
  return jsonb_build_object('ok', true, 'prizes', public.wheel_list(s.id));
end $$;

-- the owner turns the wheel on for his customers, or off: only a shop the founder allows, with a card,
-- not on the store, and at least two prizes to turn it on. Off, a full card is the card's own gift again;
-- the turns already won stay, to be spun
create or replace function public.set_wheel(p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if not s.wheel_allowed then return public.err('not_allowed'); end if;
  if coalesce(p_on, false) then
    if s.store_on then return public.err('store'); end if;
    if s.goal is null then return public.err('no_card'); end if;
    if (select count(*) from public.wheel_prizes w where w.shop_id = s.id and not w.gone) < 2 then return public.err('no_prizes'); end if;
  end if;
  update public.shops set wheel_on = coalesce(p_on, false) where id = s.id;
  return jsonb_build_object('ok', true, 'on', coalesce(p_on, false));
end $$;

-- the turn itself (server only): a prize by its chance, written on the gift; its place on the wheel for the spin
create or replace function public.wheel_pick(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare m public.moments%rowtype; c public.cards%rowtype; s public.shops%rowtype; v_list jsonb; v_r float8 := random(); v_name text; v_index int;
begin
  select * into m from public.moments where id = p_moment for update;
  if m.id is null or m.kind <> 'gift' or not m.wheel then return public.err('not_found'); end if;
  select * into s from public.shops where id = m.shop_id;
  v_list := public.wheel_list(s.id);
  if m.spun_at is not null then
    return jsonb_build_object('ok', true, 'prize', m.gift, 'already', true, 'prizes', v_list,
                              'index', (select (o - 1)::int from jsonb_array_elements(v_list) with ordinality e(x, o) where x ->> 'name' = m.gift limit 1));
  end if;
  if m.given_at is not null then return public.err('given'); end if;
  select x.name, x.i into v_name, v_index from (
    select w.name, (row_number() over (order by w.rank, w.id) - 1)::int as i,
           sum(w.chance) over (order by w.rank, w.id) as upto, sum(w.chance) over () as total
    from public.wheel_prizes w where w.shop_id = s.id and not w.gone) x
  where x.upto > v_r * x.total order by x.upto limit 1;
  if v_name is null then
    -- a wheel with nothing on it: the card's own gift, as it would have been
    select * into c from public.cards where id = m.card_id;
    v_name := coalesce(c.gift, s.gift);
    v_index := null;
  end if;
  update public.moments set gift = v_name, spun_at = now() where id = m.id;
  return jsonb_build_object('ok', true, 'prize', v_name, 'index', v_index, 'prizes', v_list);
end $$;

-- the customer spins, on their card
create or replace function public.spin(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if not exists (select 1 from public.moments m join public.cards c on c.id = m.card_id
                 where m.id = p_moment and c.user_id = auth.uid() and m.wheel) then
    return public.err('not_found');
  end if;
  return public.wheel_pick(p_moment);
end $$;

-- the owner spins it at the counter, for a customer who did not yet
create or replace function public.spin_at_counter(p_moment bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if not exists (select 1 from public.moments where id = p_moment and shop_id = s.id and wheel) then return public.err('not_found'); end if;
  return public.wheel_pick(p_moment);
end $$;


-- ═══ forms of identification: who a customer is, for a shop ═══════════════
-- The founder makes forms for a shop — «طلبة جامعة …», a partner's staff —
-- each with the fields he chooses and a QR of its own, to hand out where those
-- customers are. A customer scans it, signs in, fills it once (and can change
-- it). From then on, every tampon they take at that shop brings their answers
-- up on the owner's counter, to check them — until the owner says next.
create table if not exists public.id_forms (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  name        text not null check (char_length(btrim(name)) between 2 and 60),
  -- [{key, label, kind: text|number|phone|date|choice, required, options?}]
  fields      jsonb not null default '[]'::jsonb,
  token       text not null unique default translate(encode(extensions.gen_random_bytes(12), 'base64'), '+/=', '-_'),
  active      boolean not null default true,
  created_at  timestamptz not null default now()
);
create index if not exists id_forms_shop_idx on public.id_forms (shop_id, created_at);

create table if not exists public.id_entries (
  id          bigint generated always as identity primary key,
  form_id     uuid not null references public.id_forms (id) on delete cascade,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  data        jsonb not null default '{}'::jsonb,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (form_id, user_id)
);
create index if not exists id_entries_shop_user_idx on public.id_entries (shop_id, user_id);
alter table public.id_forms enable row level security;
alter table public.id_forms force row level security;
revoke all on public.id_forms from anon, authenticated, public;
alter table public.id_entries enable row level security;
alter table public.id_entries force row level security;
revoke all on public.id_entries from anon, authenticated, public;

-- one customer's answers at a shop, as the owner reads them: each form, its fields in order, label and value
create or replace function public.id_said(p_shop uuid, p_user uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('form', f.name,
           'fields', (select coalesce(jsonb_agg(jsonb_build_object('label', x ->> 'label', 'value', e.data ->> (x ->> 'key')) order by o), '[]'::jsonb)
                      from jsonb_array_elements(f.fields) with ordinality q(x, o) where coalesce(e.data ->> (x ->> 'key'), '') <> ''))
           order by e.created_at), '[]'::jsonb)
  from public.id_entries e join public.id_forms f on f.id = e.form_id
  where e.shop_id = p_shop and e.user_id = p_user
$$;

-- the founder's forms for a shop, with how many filled each
create or replace function public.admin_forms(p_shop uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('id', f.id, 'name', f.name, 'fields', f.fields, 'token', f.token, 'active', f.active, 'at', f.created_at,
                                                       'n', (select count(*) from public.id_entries e where e.form_id = f.id)) order by f.created_at)
                   from public.id_forms f where f.shop_id = p_shop), '[]'::jsonb);
end $$;

-- the founder writes a form (new when p_id is null): its name and its fields, checked
create or replace function public.admin_form_save(p_shop uuid, p_id uuid, p_name text, p_fields jsonb, p_active boolean default true) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare x jsonb; v_keys text[] := '{}'; v_id uuid;
begin
  perform public.require_admin();
  if not exists (select 1 from public.shops where id = p_shop) then return public.err('not_found'); end if;
  if char_length(btrim(coalesce(p_name, ''))) not between 2 and 60 then return public.err('name'); end if;
  if jsonb_typeof(p_fields) <> 'array' or jsonb_array_length(p_fields) not between 1 and 15 then return public.err('fields'); end if;
  for x in select * from jsonb_array_elements(p_fields) loop
    if coalesce(x ->> 'key', '') !~ '^[a-z0-9_]{1,24}$' or (x ->> 'key') = any (v_keys)
       or char_length(btrim(coalesce(x ->> 'label', ''))) not between 1 and 60
       or coalesce(x ->> 'kind', '') not in ('text', 'number', 'phone', 'date', 'choice')
       or ((x ->> 'kind') = 'choice' and (jsonb_typeof(x -> 'options') <> 'array' or jsonb_array_length(x -> 'options') not between 2 and 20)) then
      return public.err('fields');
    end if;
    v_keys := v_keys || (x ->> 'key');
  end loop;
  if p_id is null then
    insert into public.id_forms (shop_id, name, fields, active) values (p_shop, btrim(p_name), p_fields, coalesce(p_active, true)) returning id into v_id;
  else
    update public.id_forms set name = btrim(p_name), fields = p_fields, active = coalesce(p_active, true) where id = p_id and shop_id = p_shop returning id into v_id;
    if v_id is null then return public.err('not_found'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- the founder takes a form away, with what was filled in it
create or replace function public.admin_form_delete(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.id_forms where id = p_id;
  return jsonb_build_object('ok', true);
end $$;

-- what was filled in a form, the latest first (for the founder)
create or replace function public.admin_form_entries(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_agg(jsonb_build_object('name', nullif(p.name, ''), 'phone', p.phone, 'data', e.data, 'at', e.updated_at) order by e.updated_at desc)
                   from public.id_entries e left join public.people p on p.id = e.user_id where e.form_id = p_id), '[]'::jsonb);
end $$;

-- a form opened by its QR: the shop, the form, its fields — and what this person already filled
create or replace function public.form_open(p_token text) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'name', f.name, 'fields', f.fields,
           'shop', jsonb_build_object('name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo),
           'mine', (select e.data from public.id_entries e where e.form_id = f.id and e.user_id = auth.uid()))
  from public.id_forms f join public.shops s on s.id = f.shop_id
  where f.token = p_token and f.active
$$;

-- the customer fills the form: every field checked against its kind; kept, and changed when filled again.
-- The shop's card is made at the same time, so they are its customer from now on.
create or replace function public.form_fill(p_token text, p_data jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare f public.id_forms%rowtype; s public.shops%rowtype; x jsonb; v text; v_clean jsonb := '{}'::jsonb;
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  select * into f from public.id_forms where token = p_token and active;
  if f.id is null then return public.err('not_found'); end if;
  select * into s from public.shops where id = f.shop_id;
  if s.owner_id = auth.uid() then return public.err('own_shop'); end if;
  if jsonb_typeof(p_data) <> 'object' then return public.err('invalid'); end if;
  if not public.try_once('form:' || auth.uid(), 20, 10) then return public.err('too_many'); end if;
  for x in select * from jsonb_array_elements(f.fields) loop
    v := btrim(coalesce(p_data ->> (x ->> 'key'), ''));
    if v = '' then
      if coalesce((x ->> 'required')::boolean, false) then return public.err('required', jsonb_build_object('field', x ->> 'key')); end if;
      continue;
    end if;
    if char_length(v) > 120
       or ((x ->> 'kind') = 'number' and v !~ '^\d{1,20}$')
       or ((x ->> 'kind') = 'phone' and regexp_replace(v, '\D', '', 'g') !~ '^(216)?[2-9]\d{7}$')
       or ((x ->> 'kind') = 'date' and v !~ '^\d{4}-\d{2}-\d{2}$')
       or ((x ->> 'kind') = 'choice' and not (x -> 'options') ? v) then
      return public.err('invalid', jsonb_build_object('field', x ->> 'key'));
    end if;
    v_clean := v_clean || jsonb_build_object(x ->> 'key', v);
  end loop;
  insert into public.people (id) values (auth.uid()) on conflict (id) do nothing;
  insert into public.id_entries (form_id, shop_id, user_id, data) values (f.id, f.shop_id, auth.uid(), v_clean)
  on conflict (form_id, user_id) do update set data = excluded.data, updated_at = now();
  insert into public.cards (shop_id, user_id, goal, gift) values (s.id, auth.uid(), s.goal, s.gift) on conflict (shop_id, user_id) do nothing;
  return jsonb_build_object('ok', true, 'shop', s.name);
end $$;


-- ═══ a tampon written against the wrong thing ═════════════════════════════
-- The counter asks which thing a tampon is for, and a finger can tap the wrong
-- one. The owner sees the latest tampons (a week back) and puts each right in a
-- tap; nothing else about the tampon changes — the customer, the card, the time.
create or replace function public.my_stamps() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'items', public.my_items(),
    'stamps', coalesce((
      select jsonb_agg(jsonb_build_object('id', m.id, 'at', m.created_at, 'name', nullif(p.name, ''), 'phone', public.masked(p.phone),
                                          'item', m.item_id, 'item_name', (select i.name from public.items i where i.id = m.item_id))
                       order by m.created_at desc)
      from (select * from public.moments where shop_id = s.id and kind = 'stamp' and created_at > now() - interval '7 days'
            order by created_at desc limit 60) m
      join public.cards c on c.id = m.card_id left join public.people p on p.id = c.user_id), '[]'::jsonb));
end $$;

create or replace function public.set_moment_item(p_moment bigint, p_item bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_name text;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  select name into v_name from public.items where id = p_item and shop_id = s.id and rank < 999;
  if v_name is null then return public.err('invalid'); end if;
  update public.moments set item_id = p_item
  where id = p_moment and shop_id = s.id and kind = 'stamp' and created_at > now() - interval '7 days';
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true, 'name', v_name);
end $$;

-- ═══ the guard ═════════════════════════════════════════════════════════════
-- Every knock at a door that makes or opens an account (a new account, a
-- sign-in, a form with an account): who knocked (the address, the number),
-- and whether it was let through — or stopped, and why: blocked by the
-- founder, too many from one address, a bot's trap, a wrong password. The
-- console's «الأمان» reads it; it keeps a month.
create table if not exists public.guard_log (
  id     bigint generated always as identity primary key,
  at     timestamptz not null default now(),
  door   text not null,
  ip     text,
  phone  text,
  ok     boolean not null,
  why    text
);
create index if not exists guard_log_at_idx on public.guard_log (at desc);
create index if not exists guard_log_ip_idx on public.guard_log (ip, door, at desc);
alter table public.guard_log enable row level security;

-- an address or a number the founder shut out (until a day, or for good)
create table if not exists public.blocks (
  value   text primary key,
  kind    text not null check (kind in ('ip', 'phone')),
  reason  text,
  at      timestamptz not null default now(),
  until   timestamptz
);
alter table public.blocks enable row level security;

-- one knock: 'ok', or why not ('blocked', 'limit': p_max in p_minutes from
-- this address at this door, 'day': p_day in a day). A trailing '!' is the
-- first stop of this address in an hour: the founder hears of it once.
create or replace function public.guard(p_door text, p_ip text, p_phone text, p_max int, p_minutes int, p_day int) returns text
language plpgsql security definer set search_path = '' as $$
declare v_n int; v_d int; v_why text; v_first boolean;
begin
  if exists (select 1 from public.blocks b where b.value in (p_ip, p_phone) and (b.until is null or b.until > now())) then
    v_why := 'blocked';
  else
    select count(*) filter (where g.at > now() - make_interval(mins => p_minutes)), count(*) into v_n, v_d
    from public.guard_log g where g.ip = p_ip and g.door = p_door and g.at > now() - interval '1 day';
    if v_n >= p_max then v_why := 'limit';
    elsif p_day is not null and v_d >= p_day then v_why := 'day';
    end if;
  end if;
  v_first := v_why is not null and v_why <> 'blocked'
    and not exists (select 1 from public.guard_log g where g.ip = p_ip and not g.ok and g.why in ('limit', 'day') and g.at > now() - interval '1 hour');
  insert into public.guard_log (door, ip, phone, ok, why) values (p_door, p_ip, p_phone, v_why is null, v_why);
  if random() < 0.02 then delete from public.guard_log where at < now() - interval '30 days'; end if;
  return coalesce(v_why, 'ok') || case when v_first then '!' else '' end;
end $$;

-- a knock that went wrong after the door: a wrong password, a bot's trap
create or replace function public.guard_note(p_door text, p_ip text, p_phone text, p_why text) returns void
language sql security definer set search_path = '' as $$
  insert into public.guard_log (door, ip, phone, ok, why) values (p_door, p_ip, p_phone, false, p_why)
$$;

-- «الأمان»: the last day and two weeks at the doors, the addresses that knock
-- the most, the latest stops, the blocks, and the week's accounts never used
create or replace function public.admin_guard() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return jsonb_build_object(
    'day', (select jsonb_build_object(
        'made', count(*) filter (where g.door = 'join' and g.ok),
        'stopped', count(*) filter (where not g.ok and g.why <> 'wrong'),
        'wrong', count(*) filter (where g.why = 'wrong'),
        'trap', count(*) filter (where g.why = 'trap'),
        'ips', count(distinct g.ip))
      from public.guard_log g where g.at > now() - interval '1 day'),
    'days', coalesce((select jsonb_agg(jsonb_build_object('d', x.d, 'made', x.made, 'stopped', x.stopped) order by x.d)
      from (select (g.at at time zone 'Africa/Tunis')::date d, count(*) filter (where g.door = 'join' and g.ok) made, count(*) filter (where not g.ok and g.why <> 'wrong') stopped
            from public.guard_log g where g.at > now() - interval '14 days' group by 1) x), '[]'::jsonb),
    'ips', coalesce((select jsonb_agg(row_to_json(x) order by x.made desc, x.stopped desc) from (
        select g.ip, count(*) filter (where g.door = 'join' and g.ok) made, count(*) filter (where not g.ok and g.why <> 'wrong') stopped,
               count(*) filter (where g.why = 'wrong') wrong, max(g.at) last,
               array_remove(array_agg(distinct g.phone) filter (where g.door = 'join' and g.ok), null) phones,
               exists (select 1 from public.blocks b where b.value = g.ip and (b.until is null or b.until > now())) blocked
        from public.guard_log g where g.at > now() - interval '7 days' and g.ip is not null
        group by g.ip having count(*) filter (where g.door = 'join' and g.ok) >= 2 or count(*) filter (where not g.ok) >= 3
        order by 2 desc, 3 desc limit 20) x), '[]'::jsonb),
    'recent', coalesce((select jsonb_agg(row_to_json(x) order by x.at desc) from (
        select g.at, g.door, g.ip, g.phone, g.why from public.guard_log g where not g.ok order by g.at desc limit 40) x), '[]'::jsonb),
    'blocks', coalesce((select jsonb_agg(row_to_json(b) order by b.at desc) from public.blocks b where b.until is null or b.until > now()), '[]'::jsonb),
    -- accounts of the week that never did anything: no shop, no card
    'empty', (select count(*) from public.people p
      where p.created_at > now() - interval '7 days' and not p.is_admin and not p.is_tester
        and not exists (select 1 from public.shops s where s.owner_id = p.id)
        and not exists (select 1 from public.cards c where c.user_id = p.id)));
end $$;

create or replace function public.admin_block(p_value text, p_kind text, p_reason text, p_days int) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if p_kind not in ('ip', 'phone') or coalesce(trim(p_value), '') = '' then return false; end if;
  insert into public.blocks (value, kind, reason, until)
  values (trim(p_value), p_kind, nullif(trim(coalesce(p_reason, '')), ''), case when p_days is null or p_days <= 0 then null else now() + make_interval(days => p_days) end)
  on conflict (value) do update set kind = excluded.kind, reason = excluded.reason, until = excluded.until, at = now();
  return true;
end $$;

create or replace function public.admin_unblock(p_value text) returns boolean
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  delete from public.blocks where value = p_value;
  return found;
end $$;

-- ═══ the founder's board (23 Oct 2026): every shop on one page, light and fast ═══
-- The founder: «so much data, browsing so slow… one page: the new clients, their
-- activity, and a CRM for me, super simple» — and the same evening: «more detailed
-- analytics, easy to see from the box directly». One row per real shop, newest
-- first: who, how far, how alive (its customers, the ones who came back, the gifts,
-- its last 14 days, the owner's visits and time, the pay page, a WhatsApp to pay,
-- the app on the phone, the notifications) and the founder's own line about it
-- (crm.note) — in one pass over the tables, grouped, never a query per shop. The
-- rest of a shop opens on demand (admin_board_shop).
create or replace function public.admin_board() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_all boolean; v_today date := (now() at time zone 'Africa/Tunis')::date;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  return coalesce((
    with robot as (
      select distinct u.id from auth.users u
      join public.robots r on r.phone in (u.raw_app_meta_data ->> 'phone', '+' || split_part(u.email, '@', 1))
    ), rs as (
      select s.id, s.owner_id, s.created_at from public.shops s join public.people p on p.id = s.owner_id
      where v_all or (s.owner_id not in (select id from robot) and not (p.is_admin or p.is_tester))
    ), mm as (
      -- every tampon to a customer (not the owner, not a test, not a robot), its day in Tunis, and whether it
      -- came more than an hour after the opening (before that: the owner trying it, not the shop in use)
      select m.shop_id, c.user_id, m.created_at, (m.created_at at time zone 'Africa/Tunis')::date as day,
             m.created_at > rs.created_at + interval '1 hour' as late
      from public.moments m
      join rs on rs.id = m.shop_id
      join public.cards c on c.id = m.card_id
      join public.people cp on cp.id = c.user_id
      where m.kind = 'stamp' and c.user_id <> rs.owner_id and not (cp.is_admin or cp.is_tester)
        and (v_all or c.user_id not in (select id from robot))
    ), st as (
      select shop_id, count(*) as stamps,
             count(*) filter (where created_at >= public.tunis_today()) as today,
             count(*) filter (where late and created_at > now() - interval '7 days') as week,
             count(distinct user_id) as customers,
             count(distinct user_id) filter (where late) as real,
             max(created_at) as last_at
      from mm group by shop_id
    ), back as (
      -- customers who came back: tampons on two days or more
      select shop_id, count(*) as returning from (select shop_id from mm group by shop_id, user_id having count(distinct day) >= 2) x group by shop_id
    ), sp as (
      -- the last 14 days, day by day, oldest first (the first hour after the opening left out)
      select a.shop_id, jsonb_agg(coalesce(d.n, 0) order by g.i) as spark
      from (select distinct shop_id from mm where day > v_today - 14) a
      cross join generate_series(0, 13) g(i)
      left join (select shop_id, day, count(*) filter (where late) as n from mm where day > v_today - 14 group by shop_id, day) d
        on d.shop_id = a.shop_id and d.day = v_today - 13 + g.i
      group by a.shop_id
    ), gf as (
      select m.shop_id, count(*) as gifts
      from public.moments m join rs on rs.id = m.shop_id join public.cards c on c.id = m.card_id join public.people cp on cp.id = c.user_id
      where m.kind = 'gift' and m.given_at is not null and c.user_id <> rs.owner_id and not (cp.is_admin or cp.is_tester)
      group by m.shop_id
    ), ov as (
      -- the owner: last seen, on how many days, on the site right now
      select v.user_id, greatest(max(v.last_at), max(v.here_at)) as seen_at,
             count(distinct (v.started_at at time zone 'Africa/Tunis')::date) as days,
             bool_or(v.here_state in ('here', 'idle') and v.here_at > now() - interval '75 seconds') as online
      from public.visits v where v.user_id in (select owner_id from rs) group by v.user_id
    ), ow as (
      -- the owner's time in the app, and the pay page opened last
      select v.user_id, sum(w.active_ms) as ms, max(w.entered_at) filter (where w.route = '/shop/pay') as pay_seen
      from public.visits v join public.views w on w.visit_id = v.id
      where v.user_id in (select owner_id from rs) group by v.user_id
    ), og as (
      -- what the owner tapped: a call or a WhatsApp to pay (the trial's too), Pointili put on the phone
      select v.user_id, max(g.at) filter (where g.name in ('pay', 'trial_call')) as wa_at,
             bool_or(g.name in ('pwa_installed', 'pwa_accepted', 'pwa_open')) as app
      from public.visits v join public.signals g on g.visit_id = v.id
      where v.user_id in (select owner_id from rs) group by v.user_id
    )
    select jsonb_agg(jsonb_build_object(
      'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo, 'card', s.goal is not null,
      'created_at', s.created_at, 'paused', s.paused,
      'owner', jsonb_build_object('name', nullif(p.name, ''), 'phone', p.phone),
      'paid_until', s.paid_until, 'paid', s.paid_until is not null and s.paid_until > now(),
      'trial_end', public.trial_end(s), 'started', public.trial_started(s), 'shut', public.shut(s),
      'stamps', coalesce(st.stamps, 0), 'today', coalesce(st.today, 0), 'week', coalesce(st.week, 0),
      'customers', coalesce(st.customers, 0), 'real', coalesce(st.real, 0), 'last_at', st.last_at,
      'returning', coalesce(bk.returning, 0), 'gifts', coalesce(gf.gifts, 0), 'spark', sp.spark,
      'seen_at', ov.seen_at, 'days', coalesce(ov.days, 0), 'online', coalesce(ov.online, false),
      'ms', coalesce(ow.ms, 0), 'pay_seen', ow.pay_seen, 'wa_at', og.wa_at, 'app', coalesce(og.app, false),
      'push', exists (select 1 from public.push_subs ps where ps.user_id = s.owner_id),
      'note', coalesce(cn.note, '')) order by s.created_at desc)
    from public.shops s
    join rs on rs.id = s.id
    join public.people p on p.id = s.owner_id
    left join st on st.shop_id = s.id
    left join back bk on bk.shop_id = s.id
    left join sp on sp.shop_id = s.id
    left join gf on gf.shop_id = s.id
    left join ov on ov.user_id = s.owner_id
    left join ow on ow.user_id = s.owner_id
    left join og on og.user_id = s.owner_id
    left join public.crm cn on cn.shop_id = s.id
  ), '[]'::jsonb);
end $$;

-- one shop of the board, opened: its card, its switches, what happened lately, and
-- what the founder did to its access
create or replace function public.admin_board_shop(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return null; end if;
  return jsonb_build_object(
    'id', s.id, 'goal', s.goal, 'gift', s.gift, 'paused', s.paused,
    'wheel_allowed', s.wheel_allowed, 'wheel_on', s.wheel_on, 'store_on', s.store_on, 'items_on', s.items_on,
    'owner_id', s.owner_id,
    'recent', coalesce((select jsonb_agg(jsonb_build_object('kind', x.kind, 'at', x.at, 'given', x.given, 'who', x.who) order by x.at desc) from (
        select m.kind, coalesce(m.given_at, m.created_at) as at, m.given_at is not null as given,
               nullif(split_part(coalesce(cp.name, ''), ' ', 1), '') as who
        from public.moments m join public.cards c on c.id = m.card_id left join public.people cp on cp.id = c.user_id
        where m.shop_id = s.id order by m.created_at desc limit 6) x), '[]'::jsonb),
    'plan', coalesce((select jsonb_agg(jsonb_build_object('kind', l.kind, 'months', l.months, 'until', l.until_at, 'amount', l.amount, 'at', l.created_at) order by l.created_at desc)
                      from (select * from public.plan_log where shop_id = s.id order by created_at desc limit 4) l), '[]'::jsonb));
end $$;

-- ═══ one shop, studied (23 Oct 2026) ═══════════════════════════════════════
-- The founder: «a detailed page with all the data to study the client in the best way
-- possible». Everything about one shop and its owner, in one call: where the owner came
-- from, its numbers, its last 30 days (tampons, and the days the owner came), the steps it
-- took from the sign-up to paying (each with its hour), what the owner did in the app and
-- where a form stopped him, his last visits screen by screen, its customers, its card, its
-- access's story, the phones signed in, and the founder's note. Customers are never the
-- owner himself nor a test; «late»: a tampon more than an hour after the opening.
create or replace function public.admin_study(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype; p public.people%rowtype; v_today date := (now() at time zone 'Africa/Tunis')::date;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return null; end if;
  select * into p from public.people where id = s.owner_id;
  return (
    with cs as (
      select c.* from public.cards c join public.people cp on cp.id = c.user_id
      where c.shop_id = s.id and c.user_id <> s.owner_id and not (cp.is_admin or cp.is_tester)
    ), mm as (
      select m.id, m.kind, m.created_at, m.given_at, m.item_id, c.user_id,
             (m.created_at at time zone 'Africa/Tunis')::date as day, m.created_at > s.created_at + interval '1 hour' as late
      from public.moments m join cs c on c.id = m.card_id
    ), ov as (
      select v.* from public.visits v where v.user_id = s.owner_id
    ), vw as (
      select w.* from public.views w join ov v on v.id = w.visit_id
    ), sg as (
      select g.* from public.signals g join ov v on v.id = g.visit_id
    ), firsts as (
      select user_id, min(created_at) as at from mm where kind = 'stamp' group by user_id
    )
    select jsonb_build_object(
      'shop', jsonb_build_object('id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo, 'goal', s.goal, 'gift', s.gift,
        'stamp_gap', s.stamp_gap, 'stamp_logo', s.stamp_logo, 'paused', s.paused, 'created_at', s.created_at,
        'items_on', s.items_on, 'store_on', s.store_on, 'wheel_on', s.wheel_on, 'wheel_allowed', s.wheel_allowed,
        'paid_until', s.paid_until, 'paid', s.paid_until is not null and s.paid_until > now(),
        'trial_end', public.trial_end(s), 'started', public.trial_started(s), 'shut', public.shut(s), 'offer_at', s.offer_at),
      'owner', jsonb_build_object('id', p.id, 'name', nullif(p.name, ''), 'phone', p.phone, 'created_at', p.created_at),
      'origin', (select jsonb_build_object('at', v.started_at, 'source', v.source, 'medium', v.medium, 'campaign', v.campaign, 'content', v.content,
                  'landing', v.landing, 'referrer', v.referrer, 'device', v.device, 'os', v.os, 'browser', v.browser, 'city', v.city, 'fbclid', v.fbclid)
                 from ov v order by v.started_at limit 1),
      'numbers', jsonb_build_object(
        'customers', (select count(distinct user_id) from mm where kind = 'stamp'),
        'real', (select count(distinct user_id) from mm where kind = 'stamp' and late),
        'stamps', (select count(*) from mm where kind = 'stamp'),
        'week', (select count(*) from mm where kind = 'stamp' and late and created_at > now() - interval '7 days'),
        'returning', (select count(*) from (select user_id from mm where kind = 'stamp' group by user_id having count(distinct day) >= 2) x),
        'given', (select count(*) from mm where kind = 'gift' and given_at is not null),
        'waiting', (select count(*) from mm where kind = 'gift' and given_at is null),
        'visits', (select count(*) from ov),
        'days', (select count(distinct (started_at at time zone 'Africa/Tunis')::date) from ov),
        'ms', (select coalesce(sum(active_ms), 0) from vw)),
      'days', (select jsonb_agg(jsonb_build_object('day', d.day, 'stamps', coalesce(x.n, 0), 'visits', coalesce(y.n, 0), 'ms', coalesce(z.ms, 0)) order by d.day)
               from (select v_today - g as day from generate_series(0, 29) g) d
               left join (select day, count(*) as n from mm where kind = 'stamp' group by day) x on x.day = d.day
               left join (select (started_at at time zone 'Africa/Tunis')::date as day, count(*) as n from ov group by 1) y on y.day = d.day
               left join (select (entered_at at time zone 'Africa/Tunis')::date as day, sum(active_ms) as ms from vw group by 1) z on z.day = d.day),
      -- the hours of the day its customers get their tampons (Tunis): a counter at work, or a try at night
      'hours', (select jsonb_agg(coalesce(x.n, 0) order by h.h) from generate_series(0, 23) h(h)
                left join (select extract(hour from created_at at time zone 'Africa/Tunis')::int as hh, count(*) as n from mm where kind = 'stamp' group by 1) x on x.hh = h.h),
      -- the screens the owner spends his time on, the most first
      'screens', coalesce((select jsonb_agg(jsonb_build_object('route', q.route, 'screen', q.screen, 'ms', q.ms, 'n', q.n) order by q.ms desc)
                from (select route, screen, sum(active_ms) as ms, count(*) as n from vw group by route, screen order by sum(active_ms) desc limit 10) q), '[]'::jsonb),
      -- the counter's codes: scanned, held for a phone with no account (and given back by hand), refused and why
      'counter', (select jsonb_build_object('used', count(*) filter (where k.used_at is not null), 'held', count(*) filter (where k.held_hash is not null),
                  'back', count(*) filter (where k.back_at is not null), 'refused', count(*) filter (where k.tried_at is not null),
                  'why', coalesce((select jsonb_object_agg(coalesce(r.tried_why, '?'), r.n) from (select tried_why, count(*) as n from public.codes
                                   where shop_id = s.id and tried_at is not null group by tried_why) r), '{}'::jsonb))
                  from public.codes k where k.shop_id = s.id),
      'seen_at', (select greatest(max(last_at), max(here_at)) from ov),
      -- the shop among all the real ones: how many it does better than, by customers and by tampons
      'rank', (with robot as (
                 select distinct u.id from auth.users u
                 join public.robots r on r.phone in (u.raw_app_meta_data ->> 'phone', '+' || split_part(u.email, '@', 1))
               ), per as (
                 select m.shop_id, count(*) as stamps, count(distinct c.user_id) as customers
                 from public.moments m join public.cards c on c.id = m.card_id join public.shops s2 on s2.id = m.shop_id
                 join public.people cp on cp.id = c.user_id
                 where m.kind = 'stamp' and c.user_id <> s2.owner_id and not (cp.is_admin or cp.is_tester)
                 group by m.shop_id
               ), everyone as (
                 select s2.id, coalesce(per.customers, 0) as customers, coalesce(per.stamps, 0) as stamps
                 from public.shops s2 join public.people p2 on p2.id = s2.owner_id left join per on per.shop_id = s2.id
                 where not (p2.is_admin or p2.is_tester) and s2.owner_id not in (select id from robot)
               ), me as (
                 select coalesce((select customers from everyone where id = s.id), 0) as customers, coalesce((select stamps from everyone where id = s.id), 0) as stamps
               )
               select jsonb_build_object('shops', count(*),
                 'customers', count(*) filter (where e.customers < me.customers),
                 'stamps', count(*) filter (where e.stamps < me.stamps))
               from everyone e, me group by me.customers, me.stamps),
      'last_at', (select max(created_at) from mm where kind = 'stamp'),
      'steps', jsonb_build_object(
        'account', p.created_at,
        'shop', s.created_at,
        'counter', (select min(entered_at) from vw where route = '/shop/qr'),
        'first', (select min(at) from firsts),
        'first_real', (select min(created_at) from mm where kind = 'stamp' and late),
        'fifth', (select at from firsts order by at offset 4 limit 1),
        'gift', (select min(given_at) from mm where kind = 'gift'),
        'app', (select min(at) from sg where name in ('pwa_installed', 'pwa_accepted')),
        'offer', (select min(at) from sg where name = 'offer'),
        'pay', (select min(entered_at) from vw where route = '/shop/pay'),
        'asked', (select min(at) from sg where name in ('pay', 'trial_call')),
        'paid', (select min(created_at) from public.plan_log l where l.shop_id = s.id and l.kind in ('paid', 'until'))),
      'did', coalesce((select jsonb_object_agg(name, jsonb_build_object('n', n, 'last', last_at)) from (select name, count(*) as n, max(at) as last_at from sg group by name) z), '{}'::jsonb),
      'errors', coalesce((select jsonb_agg(jsonb_build_object('at', e.at, 'detail', e.detail) order by e.at desc) from (select at, detail from sg where name = 'form_error' order by at desc limit 8) e), '[]'::jsonb),
      'visits', coalesce((select jsonb_agg(jsonb_build_object('id', v.id, 'at', v.started_at, 'end', v.last_at, 'device', v.device, 'os', v.os, 'browser', v.browser, 'city', v.city,
                  'source', coalesce(v.campaign, v.source), 'app', v.standalone,
                  'ms', (select coalesce(sum(w.active_ms), 0) from vw w where w.visit_id = v.id),
                  'stamps', (select count(*) from mm where mm.kind = 'stamp' and mm.created_at between v.started_at and v.last_at + interval '1 minute'),
                  'screens', coalesce((select jsonb_agg(jsonb_build_object('route', w.route, 'screen', w.screen, 'ms', w.active_ms) order by w.entered_at) from vw w where w.visit_id = v.id), '[]'::jsonb))
                 order by v.started_at desc) from (select * from ov order by started_at desc limit 15) v), '[]'::jsonb),
      'customers', coalesce((select jsonb_agg(y.x order by y.last_at desc nulls last) from (
                  select c.last_at, jsonb_build_object('name', nullif(split_part(coalesce(cp.name, ''), ' ', 1), ''), 'tail', right(coalesce(cp.phone, ''), 2),
                    'stamps', (select count(*) from mm where mm.user_id = c.user_id and mm.kind = 'stamp'),
                    'on', c.stamps, 'goal', coalesce(c.goal, s.goal),
                    'gifts', (select count(*) from mm where mm.user_id = c.user_id and mm.kind = 'gift' and mm.given_at is not null),
                    'days', (select count(distinct mm.day) from mm where mm.user_id = c.user_id and mm.kind = 'stamp'),
                    'first', (select min(mm.created_at) from mm where mm.user_id = c.user_id),
                    'last', (select max(mm.created_at) from mm where mm.user_id = c.user_id),
                    'late', exists (select 1 from mm where mm.user_id = c.user_id and mm.late)) as x
                  from cs c join public.people cp on cp.id = c.user_id
                  order by c.last_at desc nulls last limit 40) y), '[]'::jsonb),
      'items', coalesce((select jsonb_agg(jsonb_build_object('name', i.name, 'gone', i.rank >= 999,
                  'n', (select count(*) from public.moments m where m.item_id = i.id and m.kind = 'stamp')) order by i.rank, i.id)
                 from public.items i where i.shop_id = s.id), '[]'::jsonb),
      'plan', coalesce((select jsonb_agg(jsonb_build_object('kind', l.kind, 'months', l.months, 'until', l.until_at, 'amount', l.amount, 'method', l.method, 'at', l.created_at) order by l.created_at desc)
                 from public.plan_log l where l.shop_id = s.id), '[]'::jsonb),
      'devices', coalesce((select jsonb_agg(jsonb_build_object('since', x.created_at,
                  'last_at', greatest(coalesce(x.refreshed_at, x.updated_at, x.created_at), v.last_at, v.here_at),
                  'device', v.device, 'os', v.os, 'browser', v.browser, 'city', v.city, 'app', v.standalone,
                  'here', v.here_at > now() - interval '2 minutes' and v.here_state in ('here', 'idle'))
                  order by greatest(coalesce(x.refreshed_at, x.updated_at, x.created_at), v.last_at, v.here_at) desc nulls last)
                 from auth.sessions x
                 left join lateral (select * from public.visits w where w.session_id = x.id order by w.started_at desc limit 1) v on true
                 where x.user_id = s.owner_id and (x.not_after is null or x.not_after > now())), '[]'::jsonb),
      'note', coalesce((select cn.note from public.crm cn where cn.shop_id = s.id), ''))
  );
end $$;

-- signing in, said exactly (23 Oct 2026): has this number a login at all — «no account with this
-- number» and «this account's password is wrong» are two answers. The service's key only (no grant)
create or replace function public.has_login(p_phone text) returns boolean
language sql stable security definer set search_path = '' as $$
  select exists (select 1 from auth.users u where u.email = '216' || p_phone || '@phone.pointidi.app')
$$;

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

grant execute on function public.me(), public.set_stamp_logo(boolean), public.see(text), public.set_name(text), public.open_shop(text, text), public.save_card(int, text, text, int, boolean), public.card_change(int, text),
  public.admin_save_card(uuid, int, text, text, int, boolean), public.admin_shop_edit(uuid, text, text),
  public.admin_plan(uuid, text, int, timestamptz, text, boolean, text, int), public.plan_seen(bigint), public.admin_ledger(),
  public.admin_book_add(text, text, numeric, date, text), public.admin_book_delete(bigint),
  public.in_progress(), public.shop_home(), public.shop_card_moments(uuid), public.shop_customers(), public.shop_numbers(), public.shop_stats(),
  public.new_code(bigint), public.my_items(), public.set_items(text[]), public.set_items_on(boolean), public.item_report(int),
  public.counter(uuid, timestamptz), public.give(bigint), public.give_all(bigint), public.held_back(uuid),
  public.admin_set_store(uuid, boolean), public.admin_set_items(uuid, boolean), public.admin_trial(uuid, int, boolean), public.admin_phone_ask(uuid, boolean), public.phone_give(text),
  public.admin_set_wheel(uuid, boolean), public.my_stamps(), public.set_moment_item(bigint, bigint),
  public.admin_forms(uuid), public.admin_form_save(uuid, uuid, text, jsonb, boolean), public.admin_form_delete(uuid), public.admin_form_entries(uuid),
  public.form_open(text), public.form_fill(text, jsonb), public.my_wheel(), public.wheel_save(jsonb), public.spin(bigint), public.spin_at_counter(bigint), public.my_store(), public.store_save(jsonb), public.card_store(uuid), public.store_buy(uuid, jsonb),
  public.store_cancel(uuid, uuid), public.store_give(uuid, uuid), public.unstamp(bigint),
  public.stamp(text, text), public.wallet(), public.card(uuid),
  public.admin_overview(), public.admin_shops(text, boolean), public.admin_shop(uuid), public.admin_board(), public.admin_board_shop(uuid), public.admin_study(uuid),
  public.admin_crm(text, boolean), public.admin_crm_of(uuid), public.admin_crm_set(uuid, text, date, boolean, text), public.admin_crm_log(uuid, text, text, text), public.admin_crm_unlog(bigint), public.admin_set_paused(uuid, boolean),
  public.admin_delete_shop(uuid), public.admin_people(text, boolean), public.admin_person(uuid),
  public.admin_set_tester(uuid, boolean), public.admin_robots(), public.admin_sweep_robots(),
  public.admin_set_setting(text, text), public.admin_traffic(int, boolean, jsonb, int), public.admin_visit(uuid), public.admin_heat(text, text, int, boolean, jsonb), public.admin_online(),
  public.news_next(), public.news_seen(uuid), public.news_clicked(uuid),
  public.admin_news_save(text, text, text, text, text, uuid[], jsonb), public.admin_news_list(), public.admin_news(uuid),
  public.admin_news_set_active(uuid, boolean), public.admin_news_delete(uuid),
  public.customer_at(text), public.give_stamp(text, bigint), public.push_subscribe(text, text, text), public.push_unsubscribe(text),
  public.my_payment(), public.pay_request(text), public.admin_payments(), public.admin_payment_decide(uuid, boolean),
  public.admin_guard(), public.admin_block(text, text, text, int), public.admin_unblock(text), public.set_wheel(boolean) to authenticated;
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
