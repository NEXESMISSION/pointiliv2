-- ===========================================================================
-- 0001 · THE TABLES. Pointili Tampon — a stamp is a ledger row, a card is a
-- sum, a token is single-use, and a client is a device-born uuid.
--
-- Every statement here is re-runnable: migrate.mjs replays the whole folder
-- on every run, so `if not exists` / `or replace` is the rule, and a column
-- added later is `add column if not exists`.
--
-- pgcrypto lives in schema `extensions` on Supabase. Anything that mints
-- randomness must call extensions.gen_random_bytes and carry
-- `set search_path = public, extensions` (0003 does; nothing here mints).
-- gen_random_uuid() is core Postgres and needs nothing.
-- ===========================================================================

create extension if not exists pgcrypto with schema extensions;

-- ── platform_settings: ONE row, the platform's numbers ─────────────────────
-- yearly price, trial length, how to pay, and who becomes super_admin at
-- signup. The super-admin list lives HERE, not in an env var the database
-- cannot read: migrate.mjs seeds it from SUPER_ADMIN_EMAILS after the folder
-- has applied (see scripts/migrate.mjs), and handle_new_user() reads it.
create table if not exists platform_settings (
  id                   boolean primary key default true check (id),   -- exactly one row, ever
  yearly_price_tnd     int  not null default 120 check (yearly_price_tnd between 0 and 100000),
  trial_days           int  not null default 14  check (trial_days between 0 and 365),
  payment_instructions text not null default 'D17, Flouci ou virement — envoie la preuve sur WhatsApp',
  super_admin_emails   text[] not null default '{}',
  updated_at           timestamptz not null default now()
);
insert into platform_settings (id) values (true) on conflict (id) do nothing;

-- ── profiles: one per auth.users row, created by trigger ───────────────────
-- role is the ONLY authorisation the console has. Nobody has a grant on this
-- table (0002), so it cannot be self-issued; the trigger below is the one
-- writer and it decides from platform_settings.super_admin_emails.
create table if not exists profiles (
  id         uuid primary key references auth.users(id) on delete cascade,
  role       text not null default 'owner' check (role in ('owner', 'super_admin')),
  email      text,
  created_at timestamptz not null default now()
);

create or replace function handle_new_user()
returns trigger
language plpgsql security definer set search_path = public as $$
declare
  v_admins text[];
begin
  select super_admin_emails into v_admins from platform_settings where id;
  insert into public.profiles (id, role, email)
  values (
    new.id,
    case
      when new.email is not null
       and lower(new.email) = any (select lower(e) from unnest(coalesce(v_admins, '{}')) e)
      then 'super_admin'
      else 'owner'
    end,
    new.email
  )
  on conflict (id) do nothing;
  return new;
end;
$$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function handle_new_user();

-- Backfill anyone who signed up before this trigger existed (test project).
insert into public.profiles (id, role, email)
select u.id, 'owner', u.email from auth.users u
on conflict (id) do nothing;

-- ── shops ───────────────────────────────────────────────────────────────────
create table if not exists shops (
  id               uuid primary key default gen_random_uuid(),
  owner_id         uuid not null unique references auth.users(id) on delete restrict,   -- MVP: one shop per owner
  slug             text not null unique check (slug ~ '^[a-z0-9](?:[a-z0-9-]{1,38}[a-z0-9])$'),
  name             text not null check (length(name) between 1 and 60),
  colour           text not null default '#5b3fd1' check (colour ~ '^#[0-9a-f]{6}$'),
  stamps_required  int  not null default 10 check (stamps_required between 2 and 20),
  reward_label     text not null default 'Un café offert' check (length(reward_label) between 1 and 60),
  cooldown_seconds int  not null default 600 check (cooldown_seconds between 0 and 86400),
  daily_cap        int  not null default 3 check (daily_cap between 1 and 20),
  hand_mode        boolean not null default false,          -- opt-in: QR appears after a tap, for one customer
  active           boolean not null default true,
  created_at       timestamptz not null default now()
);

-- Subscription (ADMIN REQUIREMENT). Added as separate statements so a shops
-- table created by an earlier shape of this file still gains them.
alter table shops add column if not exists plan          text not null default 'essai'
  check (plan in ('essai', 'annuel'));
alter table shops add column if not exists status        text not null default 'trial'
  check (status in ('trial', 'active', 'suspended', 'expired'));
alter table shops add column if not exists trial_ends_at timestamptz not null default now() + interval '14 days';
alter table shops add column if not exists paid_until    timestamptz;
alter table shops add column if not exists admin_notes   text;

-- The one rule the till, the console and every RPC agree on. mint_token and
-- redeem_token (0003) refuse when this is false; the till shows "Abonnement
-- expiré", the customer sees the calm shop-dark state.
create or replace function shop_is_open(shop uuid) returns boolean
language sql stable security definer set search_path = public as $$
  select coalesce((
    select s.active
       and (   (s.status = 'trial'  and s.trial_ends_at > now())
            or (s.status = 'active' and s.paid_until is not null and s.paid_until > now()))
    from shops s where s.id = shop
  ), false)
$$;

-- ── clients: a device-born uuid, minted by proxy.ts, row created lazily ─────
-- by redeem_token only after a live token has been consumed. Nothing here is
-- PII. token_version: bump = every cookie for this id dies.
create table if not exists clients (
  id             uuid primary key,
  token_version  int  not null default 1,
  name           text check (length(name) <= 40),
  lang           text check (lang in ('fr','tn')),
  merged_into    uuid references clients(id),
  created_at     timestamptz not null default now(),
  last_seen_at   timestamptz not null default now()
);

-- ── stamp_tokens: the rotating QR (12 chars) and the code de rattrapage (6) ─
create table if not exists stamp_tokens (
  token          text primary key check (token ~ '^(?:[a-z2-7]{12}|[0-9]{6})$'),
  shop_id        uuid not null references shops(id) on delete cascade,
  screen         text not null check (screen ~ '^[a-f0-9]{16}$'),
  kind           text not null default 'qr' check (kind in ('qr','deferred')),
  stamps         int  not null default 1 check (stamps between 1 and 5),
  created_at     timestamptz not null default now(),
  expires_at     timestamptz not null,                      -- qr: +60 s; deferred: +24 h
  superseded_at  timestamptz,                               -- set by the successor's mint; redeem accepts it for 20 s after
  successor      text references stamp_tokens(token),
  used_at        timestamptz,
  used_by        uuid references clients(id),
  seal           smallint check (seal between 0 and 15),
  result         jsonb                                      -- {kind,seal,name,balance,required,full,stamps,stamp_id,first_time,label,successor,expires_at,server_now}
);
-- exactly one live QR per (shop, screen): a second till phone gets its own line
create unique index if not exists stamp_tokens_one_live
  on stamp_tokens (shop_id, screen) where kind = 'qr' and used_at is null and superseded_at is null;
create index if not exists stamp_tokens_screen_idx on stamp_tokens (shop_id, screen, created_at desc);

-- ── stamps: the append-only ledger. The card IS sum(delta). Never a counter ─
create table if not exists stamps (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references shops(id) on delete cascade,
  client_id   uuid not null references clients(id) on delete cascade,
  delta       int  not null check (delta <> 0),
  kind        text not null check (kind in ('stamp','reward','undo','adjust')),
  token       text references stamp_tokens(token),           -- the QR that produced it; null for undo/adjust
  undoes      bigint unique references stamps(id),           -- kind='undo': a row is undone at most once
  acked_at    timestamptz,                                   -- kind='reward': owner tapped "Servi"
  created_at  timestamptz not null default now()
);
-- the database forbids two acts from one token, whatever a status check says
create unique index if not exists stamps_one_per_token on stamps (token) where kind in ('stamp','reward');
create index if not exists stamps_card_idx on stamps (shop_id, client_id, created_at desc);

-- ── scan_attempts: refusals against a REAL token (unknown ones are never stored)
create table if not exists scan_attempts (
  id         bigint generated always as identity primary key,
  token      text not null references stamp_tokens(token) on delete cascade,
  shop_id    uuid not null references shops(id) on delete cascade,
  screen     text not null,
  client_id  uuid,
  outcome    text not null check (outcome in ('cooldown','daily_cap','used','expired','superseded','shop_dark','signed_out','bad_intent')),
  created_at timestamptz not null default now()
);
create index if not exists scan_attempts_screen_idx on scan_attempts (shop_id, screen, created_at desc);

-- ── recovery_links: sha256 of a 16-char code; single use; one year ──────────
create table if not exists recovery_links (
  code_hash  bytea primary key check (length(code_hash) = 32),
  client_id  uuid not null references clients(id) on delete cascade,
  created_at timestamptz not null default now(),
  expires_at timestamptz not null default now() + interval '1 year',
  used_at    timestamptz
);

-- ── rl_buckets: keyed on SHOP or CLIENT, never on IP ────────────────────────
-- Tunisian carriers CGNAT whole cafés behind one IPv4; a per-IP limit locks a
-- faculty café out at 8 am. Keys: 'mint:<shop>', 'deferred-guess:<shop>',
-- 'recover:<client>', 'adjust:<shop>'.
create table if not exists rl_buckets (
  key          text primary key,
  count        int not null,
  window_start timestamptz not null
);

-- ── derived reads ───────────────────────────────────────────────────────────
create or replace function card_balance(p_shop uuid, p_client uuid) returns int
language sql stable security definer set search_path = public as $$
  select coalesce(sum(delta), 0)::int from stamps where shop_id = p_shop and client_id = p_client
$$;

-- The owner's shop, from the JWT and nothing else. Every function granted to
-- authenticated (0003) derives its shop through this; none takes a shop id.
create or replace function my_shop() returns uuid
language sql stable security definer set search_path = public as $$
  select id from shops where owner_id = auth.uid() and active
$$;

comment on table platform_settings is
  'One row. Prices, trial length, payment instructions and the super-admin email list (seeded by scripts/migrate.mjs from SUPER_ADMIN_EMAILS).';
comment on function shop_is_open(uuid) is
  'active AND (trial running OR paid_until in the future). mint_token and redeem_token refuse when false.';
comment on table clients is
  'A device-born uuid. Minted by proxy.ts into a signed cookie; the row appears only inside redeem_token. No PII.';
comment on table stamps is
  'Append-only ledger. A card is sum(delta) per (shop, client). Never a stored counter.';
