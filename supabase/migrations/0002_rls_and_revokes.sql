-- ===========================================================================
-- 0002 · RLS ON EVERY TABLE, ZERO POLICIES, AND A REVOKE THAT NAMES PUBLIC.
--
-- The owner's browser reaches the database only through five functions
-- (0003 grants them to authenticated); the customer's phone never reaches it
-- at all; everything else goes through the service role on the server. So
-- every table is locked to service_role, and RLS is on with no policy so that
-- even a grant added by mistake later returns zero rows.
--
-- ── THE BUG THIS FILE IS SHAPED AROUND (v1 0036) ──────────────────────────
-- Postgres grants EXECUTE on every new function to the pseudo-role PUBLIC.
-- `revoke ... from anon, authenticated` removes grants those two roles never
-- separately held and leaves the PUBLIC grant standing — anon INHERITS from
-- PUBLIC, so the function stays callable with the key that ships in the
-- browser. The statement reads like a lock and is a no-op. In v1 that
-- omission shipped an anon super-admin bypass. `public` is named FIRST, by
-- name, in every revoke below.
--
-- ── ORDERING ──────────────────────────────────────────────────────────────
-- migrate.mjs replays the folder in sorted order. This file runs after 0001
-- and BEFORE 0003 (the RPCs), so its sweep closes only what exists now. Two
-- things make that safe: the default-privileges line below means functions
-- created LATER arrive already closed to PUBLIC, and 0004 re-sweeps and
-- asserts the exact grant roster. scripts/verify-db.mjs re-asserts it again.
-- ===========================================================================

-- ── every table: RLS on, no policy, service_role only ────────────────────
do $$
declare t record; closed int := 0;
begin
  for t in
    select c.relname
    from pg_class c join pg_namespace n on n.oid = c.relnamespace
    where n.nspname = 'public' and c.relkind = 'r'
  loop
    execute format('alter table public.%I enable row level security', t.relname);
    /* PUBLIC is named FIRST and it is the one that matters: anon and
       authenticated inherit from it, so revoking only those two leaves the
       grant standing underneath. */
    execute format('revoke all on table public.%I from public, anon, authenticated', t.relname);
    execute format('grant all on table public.%I to service_role', t.relname);
    closed := closed + 1;
  end loop;
  raise notice '0002: RLS on and grants closed on % table(s)', closed;
end $$;

-- sequences and the schema itself: same rule
revoke all on all sequences in schema public from public, anon, authenticated;
grant all on all sequences in schema public to service_role;
grant usage on schema public to anon, authenticated, service_role;

-- ── every function that exists now: closed to PUBLIC/anon/authenticated ───
revoke all on all functions in schema public from public, anon, authenticated;

-- ── and every function created LATER by this role: closed on arrival ──────
-- This is the structural half. A future migration that forgets its revoke
-- still ships a function nobody but service_role can call.
--
-- GLOBAL, not `in schema public`, and that is not a style choice. Postgres
-- ADDS per-schema defaults on top of the global default, and the built-in
-- global default for functions grants EXECUTE to PUBLIC — so a per-schema
-- revoke cannot remove it ("you cannot revoke privileges per-schema if they
-- are granted globally", ALTER DEFAULT PRIVILEGES docs). Probed on
-- tampon-test with the per-schema form: a fresh function still carried
-- `=X/postgres` and anon could call it. The global form is what closes it,
-- for every function the migrating role creates in any schema — which, in
-- this project, is only ever public.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke all on functions from public, anon, authenticated;
alter default privileges in schema public grant execute on functions to service_role;
alter default privileges in schema public revoke all on tables from public, anon, authenticated;
alter default privileges in schema public grant all on tables to service_role;
alter default privileges in schema public revoke all on sequences from public, anon, authenticated;
alter default privileges in schema public grant all on sequences to service_role;

-- ── the v1 0036 sweep, verbatim in mechanism: every security-definer fn ───
do $$
declare
  fn record;
  /* No RLS predicate helpers exist in this schema (zero policies), so the
     allowlist is empty. It stays as a list so the day one is needed it is
     added HERE, with its reason, and nowhere else. */
  keep text[] := array[]::text[];
  closed int := 0;
begin
  for fn in
    select p.oid::regprocedure as sig, p.proname
    from pg_proc p
    join pg_namespace n on n.oid = p.pronamespace
    where n.nspname = 'public'
      and p.prosecdef                      -- security definer only
      and not (p.proname = any(keep))
  loop
    -- `public` FIRST and by name. That word is the whole point of this file.
    execute format('revoke all on function %s from public, anon, authenticated', fn.sig);
    execute format('grant execute on function %s to service_role', fn.sig);
    closed := closed + 1;
  end loop;
  raise notice '0002: closed EXECUTE-to-PUBLIC on % security-definer function(s)', closed;
end $$;

-- ── prove it, here, rather than trusting the loops above ──────────────────
-- A migration that silently did nothing would look identical to one that
-- worked. Fail the migration, not the shop.
do $$
declare leaked text;
begin
  -- 1. no security-definer function reachable by PUBLIC or anon
  select string_agg(p.proname, ', ' order by p.proname) into leaked
  from pg_proc p
  join pg_namespace n on n.oid = p.pronamespace
  where n.nspname = 'public'
    and p.prosecdef
    and (has_function_privilege('public', p.oid, 'execute')
      or has_function_privilege('anon',   p.oid, 'execute'));
  if leaked is not null then
    raise exception '0002: still EXECUTE-able by public/anon: %', leaked;
  end if;

  -- 2. no table reachable by PUBLIC, anon or authenticated (v1 0048 block)
  select string_agg(c.relname || ' → ' || g.grantee, ', ') into leaked
  from pg_class c
  join pg_namespace n on n.oid = c.relnamespace
  join information_schema.role_table_grants g
    on g.table_name = c.relname and g.table_schema = 'public'
  where n.nspname = 'public' and c.relkind = 'r'
    and g.grantee in ('PUBLIC', 'anon', 'authenticated');
  if leaked is not null then
    raise exception '0002: tables still reachable without the service key: %', leaked;
  end if;

  -- 3. RLS on everywhere, and no policy anywhere
  select string_agg(c.relname, ', ') into leaked
  from pg_class c join pg_namespace n on n.oid = c.relnamespace
  where n.nspname = 'public' and c.relkind = 'r' and not c.relrowsecurity;
  if leaked is not null then
    raise exception '0002: RLS is OFF on: %', leaked;
  end if;
  if exists (select 1 from pg_policies where schemaname = 'public') then
    raise exception '0002: a policy exists in public — this schema has zero by design';
  end if;
end $$;

/*
  PostgREST caches the function signatures it will accept and the grants it
  saw; tell it, or the app keeps failing after a successful migration, which
  reads as a bad migration rather than a stale cache.
*/
notify pgrst, 'reload schema';
