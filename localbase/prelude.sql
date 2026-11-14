-- What Supabase gives every project before Pointili's own schema.sql runs, as small as it can be: the
-- three roles the API acts as, the sign-in tables the schema reads (auth.users, auth.sessions) and its
-- «who is calling» (auth.uid), the crypto helpers it calls (extensions.*), and Realtime's send — a no-op
-- here, nothing listens on this computer.

create role anon nologin;
create role authenticated nologin;
create role service_role nologin bypassrls;

create schema if not exists extensions;
create extension if not exists pgcrypto schema extensions;
grant usage on schema extensions to anon, authenticated, service_role;
grant usage on schema public to anon, authenticated, service_role;

create schema if not exists auth;
grant usage on schema auth to anon, authenticated, service_role;
create table auth.users (
  id                  uuid primary key default gen_random_uuid(),
  aud                 text default 'authenticated',
  role                text default 'authenticated',
  email               text unique,
  phone               text unique,
  encrypted_password  text,
  email_confirmed_at  timestamptz,
  last_sign_in_at     timestamptz,
  raw_app_meta_data   jsonb not null default '{}'::jsonb,
  raw_user_meta_data  jsonb not null default '{}'::jsonb,
  created_at          timestamptz not null default now(),
  updated_at          timestamptz not null default now()
);
create table auth.sessions (
  id            uuid primary key default gen_random_uuid(),
  user_id       uuid not null references auth.users (id) on delete cascade,
  created_at    timestamptz not null default now(),
  updated_at    timestamptz not null default now(),
  refreshed_at  timestamp,
  not_after     timestamptz,
  user_agent    text,
  ip            text
);
create table auth.refresh_tokens (
  token       text primary key,
  session_id  uuid not null references auth.sessions (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  revoked     boolean not null default false,
  created_at  timestamptz not null default now()
);

-- the same as Supabase's: the caller's id, read off the request's JWT claims
create or replace function auth.uid() returns uuid language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.sub', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'sub'))::uuid
$$;
create or replace function auth.role() returns text language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claim.role', true), ''),
                  (nullif(current_setting('request.jwt.claims', true), '')::jsonb ->> 'role'))::text
$$;
create or replace function auth.jwt() returns jsonb language sql stable as $$
  select coalesce(nullif(current_setting('request.jwt.claims', true), ''), '{}')::jsonb
$$;
grant execute on function auth.uid(), auth.role(), auth.jwt() to anon, authenticated, service_role;

-- Realtime: the counter's radio and the customer's ping. Nothing listens on this computer
create schema if not exists realtime;
create or replace function realtime.send(payload jsonb, event text, topic text, private boolean default true) returns void
language sql as $$ select null::void $$;
grant usage on schema realtime to anon, authenticated, service_role;
grant execute on function realtime.send(jsonb, text, text, boolean) to anon, authenticated, service_role;

-- the default privileges Supabase gives the API roles on what schema.sql makes (it then takes them back where it must)
alter default privileges in schema public grant all on tables to anon, authenticated, service_role;
alter default privileges in schema public grant all on sequences to anon, authenticated, service_role;
alter default privileges in schema public grant execute on functions to anon, authenticated, service_role;
