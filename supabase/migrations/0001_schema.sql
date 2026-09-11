-- Pointidi V1 — tables, indexes, triggers.
-- Re-runnable: every statement is guarded (if not exists / or replace / drop if exists).

-- ── Remove the previous "Pointili Tampon" skeleton, once ────────────────────
-- Its tables were empty. Guarded by `shops`, a table Pointidi never creates, so a
-- re-run of this file never touches Pointidi's own tables.
do $$
begin
  if to_regclass('public.shops') is not null then
    drop trigger if exists on_auth_user_created on auth.users;
    drop table if exists public.scan_attempts, public.recovery_links, public.rl_buckets,
      public.stamp_tokens, public.stamps, public.clients, public.shops,
      public.platform_settings, public.profiles cascade;
    perform 1;
    -- every function the old skeleton left in public
    declare r record;
    begin
      for r in
        select p.oid::regprocedure as sig
        from pg_proc p where p.pronamespace = 'public'::regnamespace
      loop
        execute 'drop function if exists ' || r.sig || ' cascade';
      end loop;
    end;
  end if;
end $$;

create extension if not exists pgcrypto with schema extensions;

-- ── profiles (the spec's "users") ───────────────────────────────────────────
create table if not exists public.profiles (
  id          uuid primary key references auth.users (id) on delete cascade,
  phone       text unique check (phone ~ '^\+216[2-9][0-9]{7}$'),
  email       text,
  full_name   text check (char_length(full_name) <= 80),
  role        text not null default 'customer' check (role in ('customer', 'merchant', 'admin')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);

-- ── businesses ──────────────────────────────────────────────────────────────
create table if not exists public.businesses (
  id          uuid primary key default gen_random_uuid(),
  name        text not null check (char_length(name) between 2 and 60),
  logo_url    text,
  category    text not null default 'cafe',
  phone       text,
  address     text check (char_length(address) <= 160),
  owner_id    uuid not null references public.profiles (id),
  status      text not null default 'active' check (status in ('active', 'suspended')),
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create index if not exists businesses_owner_idx on public.businesses (owner_id);

create table if not exists public.business_members (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  user_id      uuid not null references public.profiles (id) on delete cascade,
  role         text not null default 'owner' check (role in ('owner', 'staff')),
  created_at   timestamptz not null default now(),
  unique (business_id, user_id)
);
create index if not exists business_members_user_idx on public.business_members (user_id);

-- ── loyalty cards & rewards ─────────────────────────────────────────────────
create table if not exists public.loyalty_cards (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  name              text not null check (char_length(name) between 2 and 60),
  description       text check (char_length(description) <= 200),
  stamps_required   int  not null check (stamps_required between 2 and 30),
  color             text not null default 'indigo',
  icon              text not null default 'coffee',
  cooldown_minutes  int  not null default 60 check (cooldown_minutes between 0 and 10080),
  active            boolean not null default true,
  created_at        timestamptz not null default now(),
  updated_at        timestamptz not null default now()
);
-- V1: one card per business
create unique index if not exists loyalty_cards_one_per_business on public.loyalty_cards (business_id);

create table if not exists public.rewards (
  id               uuid primary key default gen_random_uuid(),
  loyalty_card_id  uuid not null references public.loyalty_cards (id) on delete cascade,
  business_id      uuid not null references public.businesses (id) on delete cascade,
  name             text not null check (char_length(name) between 2 and 60),
  description      text check (char_length(description) <= 200),
  stamps_required  int  not null check (stamps_required between 1 and 100),
  is_primary       boolean not null default false,
  active           boolean not null default true,
  created_at       timestamptz not null default now(),
  updated_at       timestamptz not null default now()
);
create index if not exists rewards_card_idx on public.rewards (loyalty_card_id);
create unique index if not exists rewards_one_primary on public.rewards (loyalty_card_id) where is_primary;

-- ── customers: one row per (business, user) — the customer's card at that business
create table if not exists public.customers (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  user_id           uuid not null references public.profiles (id) on delete cascade,
  code              int  not null,
  stamps_balance    int  not null default 0 check (stamps_balance >= 0),
  total_stamps      int  not null default 0 check (total_stamps >= 0),
  rewards_redeemed  int  not null default 0 check (rewards_redeemed >= 0),
  first_stamp_at    timestamptz,
  last_stamp_at     timestamptz,
  created_at        timestamptz not null default now(),
  unique (business_id, user_id),
  unique (business_id, code)
);
create index if not exists customers_user_idx on public.customers (user_id);

-- The goal this customer's current card started with. When the owner later
-- RAISES the stamps required, customers already mid-card keep their goal; when
-- the owner LOWERS it, everyone benefits at once (effective = least of the two).
-- Null = no card in progress; set by the first stamp, cleared when the main
-- reward is redeemed.
alter table public.customers add column if not exists card_target int check (card_target between 1 and 100);
alter table public.businesses add column if not exists cover_url text;
create index if not exists customers_business_last_idx on public.customers (business_id, last_stamp_at desc);

-- ── rotating QR tokens ──────────────────────────────────────────────────────
-- Only the SHA-256 of the token is stored. A token is single-use: the first
-- successful scan (or the first anonymous claim) consumes it and the merchant
-- screen rotates.
create table if not exists public.qr_tokens (
  id                uuid primary key default gen_random_uuid(),
  business_id       uuid not null references public.businesses (id) on delete cascade,
  token_hash        text not null unique,
  created_by        uuid references public.profiles (id) on delete set null,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  used_at           timestamptz,
  used_by           uuid references public.profiles (id) on delete set null,
  claim_hash        text,
  claim_expires_at  timestamptz,
  active            boolean not null default true
);
create index if not exists qr_tokens_business_idx on public.qr_tokens (business_id, created_at desc);

-- ── stamps: the audit trail ─────────────────────────────────────────────────
create table if not exists public.stamps (
  id               uuid primary key default gen_random_uuid(),
  customer_id      uuid not null references public.customers (id) on delete cascade,
  business_id      uuid not null references public.businesses (id) on delete cascade,
  user_id          uuid not null references public.profiles (id) on delete cascade,
  loyalty_card_id  uuid not null references public.loyalty_cards (id) on delete cascade,
  qr_token_id      uuid unique references public.qr_tokens (id) on delete set null,
  created_at       timestamptz not null default now()
);
create index if not exists stamps_business_idx on public.stamps (business_id, created_at desc);
create index if not exists stamps_customer_idx on public.stamps (customer_id, created_at desc);

-- ── reward redemptions ──────────────────────────────────────────────────────
create table if not exists public.reward_redemptions (
  id            uuid primary key default gen_random_uuid(),
  reward_id     uuid not null references public.rewards (id) on delete cascade,
  customer_id   uuid not null references public.customers (id) on delete cascade,
  business_id   uuid not null references public.businesses (id) on delete cascade,
  user_id       uuid not null references public.profiles (id) on delete cascade,
  reward_name   text not null,
  stamps_spent  int  not null check (stamps_spent > 0),
  code          text not null,
  status        text not null default 'pending' check (status in ('pending', 'redeemed', 'cancelled', 'expired')),
  requested_at  timestamptz not null default now(),
  expires_at    timestamptz not null,
  redeemed_by   uuid references public.profiles (id) on delete set null,
  redeemed_at   timestamptz
);
create unique index if not exists redemptions_pending_code on public.reward_redemptions (business_id, code) where status = 'pending';
create unique index if not exists redemptions_pending_one on public.reward_redemptions (customer_id, reward_id) where status = 'pending';
create index if not exists redemptions_business_idx on public.reward_redemptions (business_id, redeemed_at desc);
create index if not exists redemptions_user_idx on public.reward_redemptions (user_id, requested_at desc);

-- ── subscriptions & payments ────────────────────────────────────────────────
create table if not exists public.subscriptions (
  id           uuid primary key default gen_random_uuid(),
  business_id  uuid not null references public.businesses (id) on delete cascade,
  plan         text not null check (plan in ('trial', 'six_month', 'yearly')),
  price        numeric(10, 2) not null default 0,
  currency     text not null default 'TND',
  starts_at    timestamptz not null,
  expires_at   timestamptz not null,
  status       text not null default 'active' check (status in ('active', 'cancelled')),
  created_at   timestamptz not null default now()
);
create index if not exists subscriptions_business_idx on public.subscriptions (business_id, expires_at desc);

create table if not exists public.payments (
  id                 uuid primary key default gen_random_uuid(),
  business_id        uuid not null references public.businesses (id) on delete cascade,
  subscription_id    uuid references public.subscriptions (id) on delete set null,
  plan               text not null check (plan in ('six_month', 'yearly')),
  amount             numeric(10, 2) not null,
  currency           text not null default 'TND',
  method             text not null default 'bank_transfer' check (method in ('bank_transfer', 'cash', 'd17', 'other')),
  status             text not null default 'pending' check (status in ('pending', 'paid', 'failed', 'cancelled')),
  payment_reference  text not null unique,
  notes              text,
  confirmed_by       uuid references public.profiles (id) on delete set null,
  confirmed_at       timestamptz,
  created_at         timestamptz not null default now()
);
create index if not exists payments_business_idx on public.payments (business_id, created_at desc);
create index if not exists payments_status_idx on public.payments (status, created_at desc);

-- ── activity log ────────────────────────────────────────────────────────────
create table if not exists public.activity_logs (
  id           bigint generated always as identity primary key,
  business_id  uuid references public.businesses (id) on delete cascade,
  actor_id     uuid references public.profiles (id) on delete set null,
  customer_id  uuid references public.customers (id) on delete set null,
  type         text not null,
  data         jsonb not null default '{}'::jsonb,
  created_at   timestamptz not null default now()
);
create index if not exists activity_business_idx on public.activity_logs (business_id, created_at desc);
create index if not exists activity_created_idx on public.activity_logs (created_at desc);

-- ── rate limiting & password reset (server-only) ────────────────────────────
create table if not exists public.rate_limits (
  key           text primary key,
  window_start  timestamptz not null default now(),
  hits          int not null default 0
);

create table if not exists public.password_resets (
  id                uuid primary key default gen_random_uuid(),
  user_id           uuid not null references public.profiles (id) on delete cascade,
  code_hash         text not null,
  attempts          int not null default 0,
  created_at        timestamptz not null default now(),
  expires_at        timestamptz not null,
  verified_at       timestamptz,
  reset_token_hash  text,
  reset_expires_at  timestamptz,
  used_at           timestamptz
);
create index if not exists password_resets_user_idx on public.password_resets (user_id, created_at desc);

-- ── updated_at ──────────────────────────────────────────────────────────────
create or replace function public.touch_updated_at() returns trigger
language plpgsql set search_path = '' as $$
begin
  new.updated_at := now();
  return new;
end $$;

do $$
declare t text;
begin
  foreach t in array array['profiles', 'businesses', 'loyalty_cards', 'rewards'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ── a profile for every auth user ───────────────────────────────────────────
-- Phone and contact email come from app_metadata, which only the service role
-- can write. Role is ALWAYS customer here: a browser can never pick its role.
create or replace function public.handle_new_user() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  insert into public.profiles (id, phone, email, full_name)
  values (
    new.id,
    nullif(new.raw_app_meta_data ->> 'phone', ''),
    coalesce(nullif(new.raw_app_meta_data ->> 'contact_email', ''),
             case when new.email not like '%@phone.pointidi.app' then new.email end),
    nullif(new.raw_app_meta_data ->> 'full_name', '')
  )
  on conflict (id) do nothing;
  return new;
end $$;

drop trigger if exists on_auth_user_created on auth.users;
create trigger on_auth_user_created after insert on auth.users
  for each row execute function public.handle_new_user();

-- The auth server inserts the user first and writes app_metadata in a follow-up
-- UPDATE, so the insert trigger alone never sees the phone. Fill what is missing.
create or replace function public.handle_user_metadata() returns trigger
language plpgsql security definer set search_path = '' as $$
begin
  update public.profiles p
  set phone = coalesce(p.phone, nullif(new.raw_app_meta_data ->> 'phone', '')),
      full_name = coalesce(p.full_name, nullif(new.raw_app_meta_data ->> 'full_name', '')),
      email = coalesce(p.email, nullif(new.raw_app_meta_data ->> 'contact_email', ''))
  where p.id = new.id
    and (p.phone is null or p.full_name is null or p.email is null);
  return new;
end $$;

drop trigger if exists on_auth_user_metadata on auth.users;
create trigger on_auth_user_metadata after update of raw_app_meta_data on auth.users
  for each row when (old.raw_app_meta_data is distinct from new.raw_app_meta_data)
  execute function public.handle_user_metadata();

update public.profiles p
set phone = coalesce(p.phone, nullif(u.raw_app_meta_data ->> 'phone', '')),
    full_name = coalesce(p.full_name, nullif(u.raw_app_meta_data ->> 'full_name', ''))
from auth.users u
where u.id = p.id and (p.phone is null and u.raw_app_meta_data ? 'phone');

-- Cards in progress before card_target existed keep the goal they had.
update public.customers c set card_target = k.stamps_required
from public.loyalty_cards k
where k.business_id = c.business_id and c.card_target is null and c.stamps_balance > 0;

-- Backfill users created before this trigger existed.
insert into public.profiles (id, email)
select u.id, case when u.email not like '%@phone.pointidi.app' then u.email end
from auth.users u
where not exists (select 1 from public.profiles p where p.id = u.id);
