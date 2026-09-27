-- ABONILI — its own product, in its own schema. Re-runnable.
--
-- Pointili counts VISITS: the client scans the shop, a stamp lands. Abonili
-- counts TIME: a salle, a salon, a terrain sells an abonnement, and the desk
-- needs one answer when somebody walks in — can this person come in today?
--
-- The two share nothing a user can see. A club is not a business, a member is
-- not a customer, the door is not the counter QR. The only common ground is
-- the auth account an owner signs in with, and the founder's console.
--
-- ── THE DOOR IS THE OTHER WAY ROUND ────────────────────────────────────────
-- In Pointili the client scans the shop. Here the MEMBER carries the card: a
-- private link (and its QR) the owner sends by WhatsApp when he sells the
-- abonnement. No app, no password, nothing to install while the member is
-- standing at the desk with cash in hand. At the door the owner scans that QR,
-- or types the member's number, and gets VALID or NOT.
--
-- ── THE MODEL ──────────────────────────────────────────────────────────────
--   clubs     the place (one per owner account)
--   plans     the formules it sells: N days, N séances, or both
--   members   the people; each has a short number and a card token
--   periods   one row per abonnement SOLD. A renewal is a new period, queued
--             after the current one — history is never rewritten.
--   payments  the money, one row per sale; voided when a sale is cancelled
--   visits    one row per entry; a séance-based period spends one per visit
--
-- ── WHY ITS OWN SCHEMA ─────────────────────────────────────────────────────
-- Nothing in `abonili` is granted to anon or authenticated, and the schema is
-- not exposed to the API. The only way in is the public.ab_* functions below,
-- each of which checks who is asking. Pointili's code cannot reach these
-- tables by accident, and Abonili's cannot reach Pointili's.

create schema if not exists abonili;
revoke all on schema abonili from public, anon, authenticated;

-- ═══ tables ════════════════════════════════════════════════════════════════

create table if not exists abonili.clubs (
  id          uuid primary key default gen_random_uuid(),
  owner_id    uuid not null references public.profiles (id) on delete restrict,
  name        text not null check (char_length(name) between 2 and 60),
  kind        text not null default 'gym'
              check (kind in ('gym', 'salon', 'terrain', 'academy', 'pool', 'other')),
  phone       text check (phone is null or phone ~ '^\+216[2-9][0-9]{7}$'),
  address     text check (address is null or char_length(address) <= 120),
  -- set by the founder: he takes the money at the door and says until when
  status      text not null default 'active' check (status in ('active', 'suspended')),
  paid_until  date,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now()
);
create unique index if not exists clubs_owner_uq on abonili.clubs (owner_id);

create table if not exists abonili.plans (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references abonili.clubs (id) on delete cascade,
  name        text not null check (char_length(name) between 2 and 40),
  price       numeric(10, 3) not null default 0 check (price >= 0 and price <= 100000),
  -- a formule ends on time, on séances, or on whichever comes first — never on
  -- nothing, because a pass that never ends is one the owner cannot take back
  days        int check (days between 1 and 1095),
  sessions    int check (sessions between 1 and 500),
  active      boolean not null default true,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  constraint plans_limited check (days is not null or sessions is not null)
);
create index if not exists plans_club_idx on abonili.plans (club_id, active);

create table if not exists abonili.members (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references abonili.clubs (id) on delete cascade,
  -- the short number the member says at the desk: 1, 2, 3 … per club
  code        int not null check (code > 0),
  full_name   text not null check (char_length(full_name) between 2 and 80),
  phone       text check (phone is null or phone ~ '^\+216[2-9][0-9]{7}$'),
  note        text check (note is null or char_length(note) <= 300),
  -- the private card link; 144 random bits, so it cannot be guessed
  card_token  text not null unique,
  created_at  timestamptz not null default now(),
  updated_at  timestamptz not null default now(),
  unique (club_id, code)
);
create unique index if not exists members_club_phone_uq on abonili.members (club_id, phone) where phone is not null;
create index if not exists members_club_name_idx on abonili.members (club_id, lower(full_name));

create table if not exists abonili.periods (
  id            uuid primary key default gen_random_uuid(),
  club_id       uuid not null references abonili.clubs (id) on delete cascade,
  member_id     uuid not null references abonili.members (id) on delete cascade,
  plan_id       uuid references abonili.plans (id) on delete set null,
  -- frozen at the sale: renaming a formule later never rewrites what was sold
  plan_name     text not null,
  starts_on     date not null,
  ends_on       date,
  sessions      int check (sessions is null or sessions > 0),
  used          int not null default 0 check (used >= 0),
  cancelled_at  timestamptz,
  created_at    timestamptz not null default now(),
  constraint periods_limited check (ends_on is not null or sessions is not null),
  constraint periods_order check (ends_on is null or ends_on >= starts_on),
  constraint periods_used check (sessions is null or used <= sessions)
);
create index if not exists periods_member_idx on abonili.periods (member_id, starts_on);
create index if not exists periods_club_end_idx on abonili.periods (club_id, ends_on) where cancelled_at is null;

create table if not exists abonili.payments (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references abonili.clubs (id) on delete cascade,
  member_id   uuid not null references abonili.members (id) on delete cascade,
  period_id   uuid references abonili.periods (id) on delete set null,
  amount      numeric(10, 3) not null check (amount >= 0 and amount <= 100000),
  method      text not null default 'cash' check (method in ('cash', 'd17', 'transfer', 'card', 'other')),
  paid_at     timestamptz not null default now(),
  voided_at   timestamptz
);
create index if not exists payments_club_idx on abonili.payments (club_id, paid_at desc);
create index if not exists payments_member_idx on abonili.payments (member_id, paid_at desc);

create table if not exists abonili.visits (
  id          uuid primary key default gen_random_uuid(),
  club_id     uuid not null references abonili.clubs (id) on delete cascade,
  member_id   uuid not null references abonili.members (id) on delete cascade,
  period_id   uuid references abonili.periods (id) on delete set null,
  at          timestamptz not null default now(),
  by_user     uuid
);
create index if not exists visits_club_idx on abonili.visits (club_id, at desc);
create index if not exists visits_member_idx on abonili.visits (member_id, at desc);

do $$
declare t text;
begin
  foreach t in array array['clubs', 'plans', 'members'] loop
    execute format('drop trigger if exists touch_%1$s on abonili.%1$s', t);
    execute format('create trigger touch_%1$s before update on abonili.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
  -- defence in depth: even if a grant slipped in later, no row is visible
  foreach t in array array['clubs', 'plans', 'members', 'periods', 'payments', 'visits'] loop
    execute format('alter table abonili.%I enable row level security', t);
    execute format('alter table abonili.%I force row level security', t);
  end loop;
end $$;

revoke all on all tables in schema abonili from public, anon, authenticated;

-- ═══ internal helpers (abonili schema, never granted) ══════════════════════

-- The club's day is Tunis's day, whatever the server's clock says.
create or replace function abonili.today() returns date
language sql stable set search_path = '' as $$
  select (now() at time zone 'Africa/Tunis')::date
$$;

create or replace function abonili.day_start(p_day date) returns timestamptz
language sql stable set search_path = '' as $$
  select p_day::timestamp at time zone 'Africa/Tunis'
$$;

-- The club this account owns. Raises when there is none: every owner function
-- starts here, so a stranger never gets as far as a query.
create or replace function abonili.my_club() returns abonili.clubs
language plpgsql stable security definer set search_path = '' as $$
declare c abonili.clubs%rowtype;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into c from abonili.clubs where owner_id = auth.uid();
  if c.id is null then raise exception 'not_club' using errcode = '42501'; end if;
  return c;
end $$;

create or replace function abonili.new_token() returns text
language sql volatile set search_path = '' as $$
  select translate(encode(extensions.gen_random_bytes(18), 'base64'), '+/=', '-_')
$$;

create or replace function abonili.norm_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p is null or btrim(p) = '' then null
    else (select case
            when d ~ '^[2-9][0-9]{7}$' then '+216' || d
            when d ~ '^216[2-9][0-9]{7}$' then '+' || d
            when d ~ '^00216[2-9][0-9]{7}$' then '+' || substr(d, 3)
            else 'invalid' end
          from (select regexp_replace(p, '\D', '', 'g') as d) x)
  end
$$;

-- Everything any screen needs to know about one member, as of one day.
--   status: active | soon | upcoming | expired | none
--   soon:   still in, but the time or the séances run out within a week
create or replace function abonili.member_json(p_member uuid, p_today date) returns jsonb
language plpgsql stable set search_path = '' as $$
declare
  m        abonili.members%rowtype;
  cur      abonili.periods%rowtype;
  last_p   abonili.periods%rowtype;
  v_next   date;
  v_until  date;
  v_ended  date;
  v_last   timestamptz;
  v_days   int;
  v_left   int;
  v_status text;
begin
  select * into m from abonili.members where id = p_member;
  if m.id is null then return null; end if;

  -- the period that lets them in today: the one that runs out first, so a
  -- queued renewal is only touched once the current one is spent
  select * into cur from abonili.periods p
  where p.member_id = m.id and p.cancelled_at is null
    and p.starts_on <= p_today and (p.ends_on is null or p.ends_on >= p_today)
    and (p.sessions is null or p.used < p.sessions)
  order by coalesce(p.ends_on, 'infinity'::date), p.starts_on
  limit 1;

  select min(p.starts_on) into v_next from abonili.periods p
  where p.member_id = m.id and p.cancelled_at is null and p.starts_on > p_today;

  -- covered until: the furthest end among periods still usable (renewals queue)
  select max(p.ends_on) into v_until from abonili.periods p
  where p.member_id = m.id and p.cancelled_at is null and p.ends_on >= p_today
    and (p.sessions is null or p.used < p.sessions);

  select max(p.ends_on) into v_ended from abonili.periods p
  where p.member_id = m.id and p.cancelled_at is null and p.ends_on < p_today;

  select * into last_p from abonili.periods p
  where p.member_id = m.id and p.cancelled_at is null
  order by p.starts_on desc, p.created_at desc limit 1;

  select max(v.at) into v_last from abonili.visits v where v.member_id = m.id;

  -- days they can still come, today included: a period ending today leaves 1
  v_days := case when v_until is not null then v_until - p_today + 1 end;
  v_left := case when cur.id is not null and cur.sessions is not null then cur.sessions - cur.used end;

  v_status := case
    when cur.id is not null then
      case when (v_days is not null and v_days <= 7) or (v_left is not null and v_left <= 2) then 'soon' else 'active' end
    when v_next is not null then 'upcoming'
    when last_p.id is not null then 'expired'
    else 'none' end;

  return jsonb_build_object(
    'id', m.id, 'code', m.code, 'name', m.full_name, 'phone', m.phone, 'note', m.note,
    'card_token', m.card_token, 'created_at', m.created_at,
    'status', v_status,
    'plan_name', coalesce(cur.plan_name, last_p.plan_name),
    'plan_id', coalesce(cur.plan_id, last_p.plan_id),
    'period_id', cur.id,
    'until', v_until,
    'days_left', v_days,
    'sessions_left', v_left,
    'sessions_total', cur.sessions,
    'next_starts', v_next,
    'ended_on', case when v_status = 'expired' then coalesce(v_ended, last_p.ends_on) end,
    'last_visit', v_last,
    'visited_today', v_last is not null and v_last >= abonili.day_start(p_today)
  );
end $$;

-- ═══ the owner's functions (public.ab_*) ═══════════════════════════════════

-- Who is signed in, and their club — or null, which sends them to the login.
create or replace function public.ab_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c abonili.clubs%rowtype; v_today date := abonili.today();
begin
  if auth.uid() is null then return null; end if;
  select * into c from abonili.clubs where owner_id = auth.uid();
  if c.id is null then return null; end if;
  return jsonb_build_object(
    'user', (select jsonb_build_object('id', p.id, 'name', p.full_name, 'phone', p.phone)
             from public.profiles p where p.id = auth.uid()),
    'club', jsonb_build_object('id', c.id, 'name', c.name, 'kind', c.kind, 'phone', c.phone,
                               'address', c.address, 'status', c.status, 'paid_until', c.paid_until,
                               'created_at', c.created_at),
    'today', v_today,
    'counts', jsonb_build_object(
      'plans', (select count(*) from abonili.plans where club_id = c.id and active),
      'members', (select count(*) from abonili.members where club_id = c.id))
  );
end $$;

create or replace function public.ab_update_club(p_name text, p_phone text, p_address text, p_kind text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_phone text := abonili.norm_phone(p_phone);
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then return public.err('invalid_name'); end if;
  if v_phone = 'invalid' then return public.err('invalid_phone'); end if;
  if p_kind not in ('gym', 'salon', 'terrain', 'academy', 'pool', 'other') then return public.err('invalid_kind'); end if;
  update abonili.clubs
  set name = trim(p_name), phone = v_phone, kind = p_kind,
      address = nullif(trim(left(coalesce(p_address, ''), 120)), '')
  where id = c.id;
  return jsonb_build_object('ok', true);
end $$;

-- ── formules ───────────────────────────────────────────────────────────────

create or replace function public.ab_plans() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_today date := abonili.today();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', p.id, 'name', p.name, 'price', p.price, 'days', p.days, 'sessions', p.sessions,
             'active', p.active,
             -- how many people are on it right now: the owner's reason to keep it
             'members', (select count(distinct pe.member_id) from abonili.periods pe
                         where pe.plan_id = p.id and pe.cancelled_at is null
                           and pe.starts_on <= v_today and (pe.ends_on is null or pe.ends_on >= v_today)))
           order by p.active desc, p.price, p.name)
    from abonili.plans p where p.club_id = c.id
  ), '[]'::jsonb);
end $$;

create or replace function public.ab_save_plan(p_id uuid, p_name text, p_price numeric, p_days int, p_sessions int, p_active boolean)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_id uuid; v_name text := trim(coalesce(p_name, ''));
begin
  if c.status <> 'active' then return public.err('club_suspended'); end if;
  if char_length(v_name) not between 2 and 40 then return public.err('invalid_name'); end if;
  if p_price is null or p_price < 0 or p_price > 100000 then return public.err('invalid_price'); end if;
  if p_days is null and p_sessions is null then return public.err('plan_unlimited'); end if;
  if p_days is not null and p_days not between 1 and 1095 then return public.err('invalid_days'); end if;
  if p_sessions is not null and p_sessions not between 1 and 500 then return public.err('invalid_sessions'); end if;

  if p_id is null then
    if (select count(*) from abonili.plans where club_id = c.id) >= 30 then return public.err('too_many_plans'); end if;
    insert into abonili.plans (club_id, name, price, days, sessions, active)
    values (c.id, v_name, round(p_price, 3), p_days, p_sessions, coalesce(p_active, true))
    returning id into v_id;
  else
    update abonili.plans
    set name = v_name, price = round(p_price, 3), days = p_days, sessions = p_sessions, active = coalesce(p_active, true)
    where id = p_id and club_id = c.id
    returning id into v_id;
    if v_id is null then return public.err('not_found'); end if;
  end if;
  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- ── members ────────────────────────────────────────────────────────────────

-- p_filter: all | active (in, including soon) | soon | expired (incl. upcoming/none)
create or replace function public.ab_members(p_filter text default 'all', p_search text default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c abonili.clubs := abonili.my_club();
  v_today date := abonili.today();
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_digits text := regexp_replace(coalesce(p_search, ''), '\D', '', 'g');
begin
  return (
    with rows as (
      select abonili.member_json(m.id, v_today) as j
      from abonili.members m
      where m.club_id = c.id
        and (v_q is null
             or m.full_name ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
             or (v_digits <> '' and (m.code::text = v_digits or coalesce(m.phone, '') like '%' || v_digits || '%')))
    ),
    counted as (
      select jsonb_build_object(
        'all', count(*),
        'active', count(*) filter (where j->>'status' in ('active', 'soon')),
        'soon', count(*) filter (where j->>'status' = 'soon'),
        'expired', count(*) filter (where j->>'status' in ('expired', 'upcoming', 'none'))) as counts
      from rows
    )
    select jsonb_build_object(
      'counts', (select counts from counted),
      'items', coalesce((
        select jsonb_agg(j order by
          case when coalesce(p_filter, 'all') = 'soon' then (j->>'days_left')::int end asc nulls last,
          case when coalesce(p_filter, 'all') = 'expired' then (j->>'ended_on')::date end desc nulls last,
          lower(j->>'name'))
        from rows
        where case coalesce(p_filter, 'all')
                when 'active' then j->>'status' in ('active', 'soon')
                when 'soon' then j->>'status' = 'soon'
                when 'expired' then j->>'status' in ('expired', 'upcoming', 'none')
                else true end
      ), '[]'::jsonb))
  );
end $$;

create or replace function public.ab_member(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_today date := abonili.today();
begin
  if not exists (select 1 from abonili.members where id = p_id and club_id = c.id) then
    return public.err('not_found');
  end if;
  return jsonb_build_object(
    'ok', true,
    'member', abonili.member_json(p_id, v_today),
    'periods', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', p.id, 'plan_name', p.plan_name, 'starts_on', p.starts_on, 'ends_on', p.ends_on,
               'sessions', p.sessions, 'used', p.used, 'cancelled', p.cancelled_at is not null,
               'state', case
                          when p.cancelled_at is not null then 'cancelled'
                          when p.starts_on > v_today then 'upcoming'
                          when (p.ends_on is not null and p.ends_on < v_today)
                               or (p.sessions is not null and p.used >= p.sessions) then 'done'
                          else 'current' end,
               'paid', (select coalesce(sum(x.amount), 0) from abonili.payments x
                        where x.period_id = p.id and x.voided_at is null))
             order by p.starts_on desc, p.created_at desc)
      from abonili.periods p where p.member_id = p_id), '[]'::jsonb),
    'visits', coalesce((
      select jsonb_agg(v.at order by v.at desc)
      from (select at from abonili.visits where member_id = p_id order by at desc limit 30) v), '[]'::jsonb),
    'visits_total', (select count(*) from abonili.visits where member_id = p_id),
    'paid_total', (select coalesce(sum(amount), 0) from abonili.payments where member_id = p_id and voided_at is null)
  );
end $$;

-- A period for this member, starting when it should, plus its payment.
-- Starts the day after their cover runs out, or today when it already has.
create or replace function abonili.sell(c abonili.clubs, p_member uuid, p_plan uuid, p_amount numeric,
                                       p_method text, p_starts date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  pl abonili.plans%rowtype;
  v_today date := abonili.today();
  v_cover date;
  v_start date;
  v_period uuid;
begin
  select * into pl from abonili.plans where id = p_plan and club_id = c.id;
  if pl.id is null then return public.err('plan_not_found'); end if;
  if not pl.active then return public.err('plan_inactive'); end if;
  if p_amount is null or p_amount < 0 or p_amount > 100000 then return public.err('invalid_amount'); end if;
  if coalesce(p_method, 'cash') not in ('cash', 'd17', 'transfer', 'card', 'other') then return public.err('invalid_method'); end if;

  select max(ends_on) into v_cover from abonili.periods
  where member_id = p_member and cancelled_at is null and ends_on >= v_today
    and (sessions is null or used < sessions);

  v_start := coalesce(p_starts, case when v_cover is not null then v_cover + 1 else v_today end);
  if v_start < v_today - 31 or v_start > v_today + 366 then return public.err('invalid_date'); end if;

  insert into abonili.periods (club_id, member_id, plan_id, plan_name, starts_on, ends_on, sessions)
  values (c.id, p_member, pl.id, pl.name, v_start,
          case when pl.days is not null then v_start + pl.days - 1 end, pl.sessions)
  returning id into v_period;

  insert into abonili.payments (club_id, member_id, period_id, amount, method)
  values (c.id, p_member, v_period, round(p_amount, 3), coalesce(p_method, 'cash'));

  return jsonb_build_object('ok', true, 'period_id', v_period, 'starts_on', v_start);
end $$;

create or replace function public.ab_add_member(p_name text, p_phone text, p_plan uuid, p_amount numeric,
                                                p_method text, p_starts date, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c abonili.clubs := abonili.my_club();
  v_name text := trim(coalesce(p_name, ''));
  v_phone text := abonili.norm_phone(p_phone);
  v_code int;
  v_id uuid;
  v_sale jsonb;
begin
  if c.status <> 'active' then return public.err('club_suspended'); end if;
  if char_length(v_name) not between 2 and 80 then return public.err('invalid_name'); end if;
  if v_phone = 'invalid' then return public.err('invalid_phone'); end if;
  if v_phone is not null and exists (select 1 from abonili.members where club_id = c.id and phone = v_phone) then
    return public.err('phone_taken', jsonb_build_object(
      'member_id', (select id from abonili.members where club_id = c.id and phone = v_phone)));
  end if;
  if not public.rate_limit_hit('ab_add:' || c.id, 300, 3600) then return public.err('rate_limited'); end if;

  -- the next number, one sale at a time
  perform 1 from abonili.clubs where id = c.id for update;
  select coalesce(max(code), 0) + 1 into v_code from abonili.members where club_id = c.id;

  insert into abonili.members (club_id, code, full_name, phone, note, card_token)
  values (c.id, v_code, v_name, v_phone, nullif(trim(left(coalesce(p_note, ''), 300)), ''), abonili.new_token())
  returning id into v_id;

  if p_plan is not null then
    v_sale := abonili.sell(c, v_id, p_plan, p_amount, p_method, p_starts);
    if not (v_sale->>'ok')::boolean then
      raise exception using message = v_sale->>'error', errcode = 'P0001';
    end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id, 'code', v_code);
exception
  when sqlstate 'P0001' then return public.err(sqlerrm);
end $$;

create or replace function public.ab_update_member(p_id uuid, p_name text, p_phone text, p_note text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_phone text := abonili.norm_phone(p_phone); v_id uuid;
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 80 then return public.err('invalid_name'); end if;
  if v_phone = 'invalid' then return public.err('invalid_phone'); end if;
  if v_phone is not null and exists (select 1 from abonili.members where club_id = c.id and phone = v_phone and id <> p_id) then
    return public.err('phone_taken');
  end if;
  update abonili.members
  set full_name = trim(p_name), phone = v_phone, note = nullif(trim(left(coalesce(p_note, ''), 300)), '')
  where id = p_id and club_id = c.id returning id into v_id;
  if v_id is null then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.ab_renew(p_member uuid, p_plan uuid, p_amount numeric, p_method text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club();
begin
  if c.status <> 'active' then return public.err('club_suspended'); end if;
  if not exists (select 1 from abonili.members where id = p_member and club_id = c.id) then return public.err('not_found'); end if;
  return abonili.sell(c, p_member, p_plan, p_amount, p_method, null);
end $$;

-- A gift or a compensation: push the end of their cover by N days.
create or replace function public.ab_add_days(p_member uuid, p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_period uuid;
begin
  if c.status <> 'active' then return public.err('club_suspended'); end if;
  if p_days is null or p_days not between 1 and 90 then return public.err('invalid_days'); end if;
  select p.id into v_period from abonili.periods p
  where p.member_id = p_member and p.club_id = c.id and p.cancelled_at is null and p.ends_on is not null
    and p.ends_on >= abonili.today()
  order by p.ends_on desc limit 1
  for update;
  if v_period is null then return public.err('nothing_to_extend'); end if;
  update abonili.periods set ends_on = ends_on + p_days where id = v_period;
  return jsonb_build_object('ok', true);
end $$;

-- A sale entered by mistake: the period stops counting and its money leaves
-- the totals. Nothing is deleted, so the history still shows what happened.
create or replace function public.ab_cancel_period(p_period uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_id uuid;
begin
  if c.status <> 'active' then return public.err('club_suspended'); end if;
  update abonili.periods set cancelled_at = now()
  where id = p_period and club_id = c.id and cancelled_at is null
  returning id into v_id;
  if v_id is null then return public.err('not_found'); end if;
  update abonili.payments set voided_at = now() where period_id = v_id and voided_at is null;
  return jsonb_build_object('ok', true);
end $$;

-- ── the door ───────────────────────────────────────────────────────────────

-- One box for everything the desk might type or scan: the card QR (its token,
-- or the whole card URL), the member's number, a phone, or part of a name.
create or replace function public.ab_door(p_q text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c abonili.clubs := abonili.my_club();
  v_today date := abonili.today();
  v_q text := trim(coalesce(p_q, ''));
  v_token text;
  v_digits text;
begin
  if v_q = '' then return jsonb_build_object('ok', true, 'kind', 'empty', 'matches', '[]'::jsonb); end if;

  -- a scanned card: the token is the last path segment of the card URL
  v_token := substring(v_q from '([A-Za-z0-9_-]{24})/?$');
  if v_token is not null then
    return jsonb_build_object('ok', true, 'kind', 'card', 'matches', coalesce((
      select jsonb_agg(abonili.member_json(m.id, v_today))
      from abonili.members m where m.club_id = c.id and m.card_token = v_token), '[]'::jsonb));
  end if;

  v_digits := regexp_replace(v_q, '\D', '', 'g');
  if v_digits <> '' and v_q ~ '^[0-9 +]+$' then
    return jsonb_build_object('ok', true, 'kind', 'number', 'matches', coalesce((
      select jsonb_agg(abonili.member_json(m.id, v_today) order by (m.code::text = v_digits) desc, m.code)
      from abonili.members m
      where m.club_id = c.id
        and (m.code::text = v_digits
             or (char_length(v_digits) >= 4 and coalesce(m.phone, '') like '%' || v_digits || '%'))
      ), '[]'::jsonb));
  end if;

  return jsonb_build_object('ok', true, 'kind', 'name', 'matches', coalesce((
    select jsonb_agg(j) from (
      select abonili.member_json(m.id, v_today) as j
      from abonili.members m
      where m.club_id = c.id and m.full_name ilike '%' || replace(replace(v_q, '%', ''), '_', '') || '%'
      order by lower(m.full_name) limit 8) s), '[]'::jsonb));
end $$;

-- Let them in. Spends a séance when the formule counts séances. A second entry
-- the same day needs the desk to say so, because a double scan that burns a
-- séance is money taken from the member.
create or replace function public.ab_checkin(p_member uuid, p_force boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  c abonili.clubs := abonili.my_club();
  v_today date := abonili.today();
  m abonili.members%rowtype;
  cur abonili.periods%rowtype;
  v_last timestamptz;
begin
  if c.status <> 'active' then return public.err('club_suspended'); end if;
  select * into m from abonili.members where id = p_member and club_id = c.id;
  if m.id is null then return public.err('not_found'); end if;

  select * into cur from abonili.periods p
  where p.member_id = m.id and p.cancelled_at is null
    and p.starts_on <= v_today and (p.ends_on is null or p.ends_on >= v_today)
    and (p.sessions is null or p.used < p.sessions)
  order by coalesce(p.ends_on, 'infinity'::date), p.starts_on
  limit 1
  for update;

  if cur.id is null then
    return public.err('not_valid', jsonb_build_object('member', abonili.member_json(m.id, v_today)));
  end if;

  select max(at) into v_last from abonili.visits where member_id = m.id;
  if not coalesce(p_force, false) and v_last >= abonili.day_start(v_today) then
    return public.err('already_in', jsonb_build_object('at', v_last, 'member', abonili.member_json(m.id, v_today)));
  end if;

  insert into abonili.visits (club_id, member_id, period_id, by_user) values (c.id, m.id, cur.id, auth.uid());
  if cur.sessions is not null then
    update abonili.periods set used = used + 1 where id = cur.id;
  end if;

  return jsonb_build_object('ok', true, 'member', abonili.member_json(m.id, v_today));
end $$;

-- The door's side panel: who came in today, and the three numbers that matter.
create or replace function public.ab_today() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c abonili.clubs := abonili.my_club(); v_today date := abonili.today(); v_from timestamptz := abonili.day_start(abonili.today());
begin
  return jsonb_build_object(
    'visits', coalesce((
      select jsonb_agg(jsonb_build_object('at', v.at, 'member_id', m.id, 'name', m.full_name, 'code', m.code) order by v.at desc)
      from (select * from abonili.visits where club_id = c.id and at >= v_from order by at desc limit 60) v
      join abonili.members m on m.id = v.member_id), '[]'::jsonb),
    'visits_today', (select count(*) from abonili.visits where club_id = c.id and at >= v_from),
    'active', (select count(distinct p.member_id) from abonili.periods p
               where p.club_id = c.id and p.cancelled_at is null
                 and p.starts_on <= v_today and (p.ends_on is null or p.ends_on >= v_today)
                 and (p.sessions is null or p.used < p.sessions)),
    'ending_week', (select count(*) from (
                      select p.member_id, max(p.ends_on) as until from abonili.periods p
                      where p.club_id = c.id and p.cancelled_at is null and p.ends_on >= v_today
                      group by p.member_id) x
                    where x.until <= v_today + 6)
  );
end $$;

-- ── money ──────────────────────────────────────────────────────────────────

-- One month of takings, the month before for comparison, and what should come
-- in this week from the abonnements that end in it.
create or replace function public.ab_money(p_month date default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  c abonili.clubs := abonili.my_club();
  v_today date := abonili.today();
  v_m date := date_trunc('month', coalesce(p_month, abonili.today()))::date;
  v_from timestamptz := abonili.day_start(date_trunc('month', coalesce(p_month, abonili.today()))::date);
  v_to timestamptz := abonili.day_start((date_trunc('month', coalesce(p_month, abonili.today())) + interval '1 month')::date);
  v_pfrom timestamptz := abonili.day_start((date_trunc('month', coalesce(p_month, abonili.today())) - interval '1 month')::date);
begin
  return jsonb_build_object(
    'month', v_m,
    'total', (select coalesce(sum(amount), 0) from abonili.payments
              where club_id = c.id and voided_at is null and paid_at >= v_from and paid_at < v_to),
    'count', (select count(*) from abonili.payments
              where club_id = c.id and voided_at is null and paid_at >= v_from and paid_at < v_to),
    'previous', (select coalesce(sum(amount), 0) from abonili.payments
                 where club_id = c.id and voided_at is null and paid_at >= v_pfrom and paid_at < v_from),
    'by_method', coalesce((
      select jsonb_object_agg(method, total) from (
        select method, sum(amount) as total from abonili.payments
        where club_id = c.id and voided_at is null and paid_at >= v_from and paid_at < v_to
        group by method) x), '{}'::jsonb),
    'payments', coalesce((
      select jsonb_agg(jsonb_build_object('id', x.id, 'amount', x.amount, 'method', x.method, 'at', x.paid_at,
                                          'member_id', m.id, 'name', m.full_name, 'code', m.code,
                                          'plan_name', pe.plan_name) order by x.paid_at desc)
      from abonili.payments x
      join abonili.members m on m.id = x.member_id
      left join abonili.periods pe on pe.id = x.period_id
      where x.club_id = c.id and x.voided_at is null and x.paid_at >= v_from and x.paid_at < v_to), '[]'::jsonb),
    -- people whose cover ends within 7 days and who have nothing queued after it
    'due', coalesce((
      select jsonb_agg(jsonb_build_object('member_id', m.id, 'name', m.full_name, 'code', m.code, 'phone', m.phone,
                                          'until', d.until, 'plan_name', d.plan_name, 'price', pl.price)
                       order by d.until, lower(m.full_name))
      from (
        select p.member_id, max(p.ends_on) as until,
               (array_agg(p.plan_name order by p.ends_on desc))[1] as plan_name,
               (array_agg(p.plan_id order by p.ends_on desc))[1] as plan_id
        from abonili.periods p
        where p.club_id = c.id and p.cancelled_at is null and p.ends_on >= v_today
        group by p.member_id
      ) d
      join abonili.members m on m.id = d.member_id
      left join abonili.plans pl on pl.id = d.plan_id
      where d.until <= v_today + 6), '[]'::jsonb)
  );
end $$;

-- ═══ the member's card — SERVICE ROLE ONLY ═════════════════════════════════
-- The card page renders on the server with the service key, so nothing here
-- is ever reachable with the public anon key. The token IS the permission.
create or replace function public.ab_card(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare m abonili.members%rowtype; c abonili.clubs%rowtype; v_today date := abonili.today();
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{24}$' then return public.err('not_found'); end if;
  select * into m from abonili.members where card_token = p_token;
  if m.id is null then return public.err('not_found'); end if;
  select * into c from abonili.clubs where id = m.club_id;
  return jsonb_build_object(
    'ok', true,
    'club', jsonb_build_object('name', c.name, 'kind', c.kind, 'phone', c.phone, 'address', c.address),
    -- the card shows what the member already knows; the phone stays off it
    'member', abonili.member_json(m.id, v_today) - 'phone' - 'note',
    'visits', coalesce((
      select jsonb_agg(v.at order by v.at desc)
      from (select at from abonili.visits where member_id = m.id order by at desc limit 8) v), '[]'::jsonb)
  );
end $$;

-- ═══ the founder's console ═════════════════════════════════════════════════

create or replace function public.ab_admin_clubs() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_today date := abonili.today();
begin
  perform public.require_admin();
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', c.id, 'name', c.name, 'kind', c.kind, 'status', c.status, 'paid_until', c.paid_until,
             'created_at', c.created_at,
             'owner', jsonb_build_object('id', p.id, 'name', p.full_name, 'phone', p.phone),
             'members', (select count(*) from abonili.members where club_id = c.id),
             'active', (select count(distinct pe.member_id) from abonili.periods pe
                        where pe.club_id = c.id and pe.cancelled_at is null
                          and pe.starts_on <= v_today and (pe.ends_on is null or pe.ends_on >= v_today)),
             'visits_week', (select count(*) from abonili.visits where club_id = c.id
                             and at >= abonili.day_start(v_today - 6)))
           order by c.created_at desc)
    from abonili.clubs c join public.profiles p on p.id = c.owner_id
  ), '[]'::jsonb);
end $$;

-- The auth user is made by the server with the service key a moment before.
create or replace function public.ab_admin_create_club(p_owner uuid, p_name text, p_kind text, p_owner_name text)
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid; v_name text := trim(coalesce(p_name, ''));
begin
  perform public.require_admin();
  if char_length(v_name) not between 2 and 60 then return public.err('invalid_name'); end if;
  if coalesce(p_kind, 'gym') not in ('gym', 'salon', 'terrain', 'academy', 'pool', 'other') then return public.err('invalid_kind'); end if;
  if not exists (select 1 from public.profiles where id = p_owner) then return public.err('not_found'); end if;
  if exists (select 1 from abonili.clubs where owner_id = p_owner) then return public.err('already_has_club'); end if;

  insert into abonili.clubs (owner_id, name, kind, phone, paid_until)
  values (p_owner, v_name, coalesce(p_kind, 'gym'),
          (select phone from public.profiles where id = p_owner), abonili.today() + 30)
  returning id into v_id;

  update public.profiles
  set full_name = coalesce(nullif(trim(left(p_owner_name, 80)), ''), full_name)
  where id = p_owner;

  return jsonb_build_object('ok', true, 'club_id', v_id);
end $$;

create or replace function public.ab_admin_set_club(p_id uuid, p_status text, p_paid_until date) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_admin();
  if p_status not in ('active', 'suspended') then return public.err('invalid_status'); end if;
  update abonili.clubs set status = p_status, paid_until = p_paid_until where id = p_id returning id into v_id;
  if v_id is null then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ═══ who may call what ═════════════════════════════════════════════════════

revoke execute on all functions in schema abonili from public, anon, authenticated;
alter default privileges in schema abonili revoke execute on functions from public, anon, authenticated;

grant execute on function
  public.ab_context(),
  public.ab_update_club(text, text, text, text),
  public.ab_plans(),
  public.ab_save_plan(uuid, text, numeric, int, int, boolean),
  public.ab_members(text, text),
  public.ab_member(uuid),
  public.ab_add_member(text, text, uuid, numeric, text, date, text),
  public.ab_update_member(uuid, text, text, text),
  public.ab_renew(uuid, uuid, numeric, text),
  public.ab_add_days(uuid, int),
  public.ab_cancel_period(uuid),
  public.ab_door(text),
  public.ab_checkin(uuid, boolean),
  public.ab_today(),
  public.ab_money(date),
  public.ab_admin_clubs(),
  public.ab_admin_create_club(uuid, text, text, text),
  public.ab_admin_set_club(uuid, text, date)
to authenticated;

revoke execute on function public.ab_card(text) from public, anon, authenticated;
grant execute on function public.ab_card(text) to service_role;

-- nothing here may be reachable by anon (0003's tripwire, re-run)
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
