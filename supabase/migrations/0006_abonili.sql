-- Pointili — ABONILI: the second system. Re-runnable.
--
-- Fidélité counts visits. Abonili counts TIME: a salle, a salon, a terrain
-- sells an abonnement and needs to know one thing at the door — can this person
-- come in today? Same brand, same login, same rotating QR on the comptoir. The
-- only difference is what the scan answers: "+1 tampon" there, "valide, 12 youm
-- left" here.
--
-- ── THE MODEL, IN THREE ROWS ───────────────────────────────────────────────
--   membership_plans   the formule the owner sells (30 youm, 10 séances, both)
--   memberships        one row per person per local — renewals EXTEND it
--   checkins           one row per scan
--
-- ── WHY THE PHONE IS THE MEMBER, NOT THE ACCOUNT ───────────────────────────
-- The owner is holding cash with the member standing in front of him; making
-- him wait while someone installs an app and picks a password is how a sale
-- dies. So a membership is keyed on the PHONE NUMBER and user_id stays null
-- until that person signs in for the first time, at which point the scan links
-- the two. The owner's work is never blocked on the member's phone.

-- ── which systems this business bought ─────────────────────────────────────
-- Granted by the super-admin, never self-served: accounts are created by hand
-- at the door. Loyalty defaults true so every existing business is untouched.
alter table public.businesses add column if not exists loyalty_enabled     boolean not null default true;
alter table public.businesses add column if not exists memberships_enabled boolean not null default false;

-- ── formules ───────────────────────────────────────────────────────────────
create table if not exists public.membership_plans (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  name           text not null check (char_length(name) between 2 and 60),
  price          numeric(10, 2) not null default 0 check (price >= 0),
  -- A formule limits time, or visits, or both. Never neither: an abonnement
  -- that ends on nothing is a free pass the owner cannot take back.
  duration_days  int check (duration_days between 1 and 1095),
  sessions       int check (sessions between 1 and 500),
  active         boolean not null default true,
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  constraint membership_plans_limited check (duration_days is not null or sessions is not null)
);
create index if not exists membership_plans_business_idx on public.membership_plans (business_id, active);

-- ── abonnements ────────────────────────────────────────────────────────────
create table if not exists public.memberships (
  id             uuid primary key default gen_random_uuid(),
  business_id    uuid not null references public.businesses (id) on delete cascade,
  phone          text not null check (phone ~ '^\+216[2-9][0-9]{7}$'),
  full_name      text check (char_length(full_name) <= 80),
  -- null until this person signs in with that phone; the scan links them
  user_id        uuid references public.profiles (id) on delete set null,
  plan_id        uuid references public.membership_plans (id) on delete set null,
  -- frozen at the sale: a formule renamed or deleted later must not rewrite
  -- what the member was actually sold
  plan_name      text not null,
  code           int not null,
  photo_url      text,
  starts_at      timestamptz not null default now(),
  ends_at        timestamptz,
  sessions_left  int check (sessions_left >= 0),
  status         text not null default 'active' check (status in ('active', 'cancelled')),
  created_at     timestamptz not null default now(),
  updated_at     timestamptz not null default now(),
  unique (business_id, phone),
  unique (business_id, code)
);
create index if not exists memberships_business_idx on public.memberships (business_id, ends_at);
create index if not exists memberships_user_idx on public.memberships (user_id);

-- ── the door ───────────────────────────────────────────────────────────────
create table if not exists public.checkins (
  id             uuid primary key default gen_random_uuid(),
  membership_id  uuid not null references public.memberships (id) on delete cascade,
  business_id    uuid not null references public.businesses (id) on delete cascade,
  user_id        uuid references public.profiles (id) on delete set null,
  qr_token_id    uuid unique references public.qr_tokens (id) on delete set null,
  created_at     timestamptz not null default now()
);
create index if not exists checkins_business_idx on public.checkins (business_id, created_at desc);
create index if not exists checkins_membership_idx on public.checkins (membership_id, created_at desc);

do $$
declare t text;
begin
  foreach t in array array['membership_plans', 'memberships'] loop
    execute format('drop trigger if exists touch_%1$s on public.%1$s', t);
    execute format('create trigger touch_%1$s before update on public.%1$s for each row execute function public.touch_updated_at()', t);
  end loop;
end $$;

-- ═══ helpers ═══════════════════════════════════════════════════════════════

-- "20 123 456", "+216 20123456", "0020123456" → +21620123456, else null.
create or replace function public.normalise_phone(p text) returns text
language sql immutable set search_path = '' as $$
  select case
    when p is null then null
    when regexp_replace(p, '\D', '', 'g') ~ '^216[2-9][0-9]{7}$' then '+' || regexp_replace(p, '\D', '', 'g')
    when regexp_replace(p, '\D', '', 'g') ~ '^[2-9][0-9]{7}$'    then '+216' || regexp_replace(p, '\D', '', 'g')
    else null
  end
$$;

create or replace function public.gen_membership_code(p_business uuid) returns int
language sql volatile security definer set search_path = '' as $$
  select coalesce(max(code), 100) + 1 from public.memberships where business_id = p_business
$$;

-- One word for the door. `expiring_soon` is a week out, which is the window the
-- owner can still act on with a WhatsApp message.
create or replace function public.membership_status(p_status text, p_ends_at timestamptz, p_sessions_left int) returns text
language sql stable set search_path = '' as $$
  select case
    when p_status = 'cancelled'                                          then 'cancelled'
    when p_ends_at is not null and p_ends_at <= now()                    then 'expired'
    when p_sessions_left is not null and p_sessions_left <= 0            then 'used_up'
    when p_ends_at is not null and p_ends_at < now() + interval '7 days' then 'expiring_soon'
    else 'active'
  end
$$;

create or replace function public.membership_view(m public.memberships) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object(
    'id', m.id, 'code', m.code, 'phone', m.phone, 'phone_masked', public.mask_phone(m.phone),
    'full_name', m.full_name, 'photo_url', m.photo_url, 'plan_id', m.plan_id, 'plan_name', m.plan_name,
    'starts_at', m.starts_at, 'ends_at', m.ends_at, 'sessions_left', m.sessions_left,
    'status', public.membership_status(m.status, m.ends_at, m.sessions_left),
    'days_left', case when m.ends_at is null then null
                      else greatest(0, ceil(extract(epoch from (m.ends_at - now())) / 86400))::int end,
    'linked', m.user_id is not null,
    'last_checkin_at', (select max(c.created_at) from public.checkins c where c.membership_id = m.id),
    'checkins', (select count(*) from public.checkins c where c.membership_id = m.id)
  )
$$;

-- ═══ the owner's side ══════════════════════════════════════════════════════

create or replace function public.merchant_membership_plans() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false);
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', p.id, 'name', p.name, 'price', p.price, 'duration_days', p.duration_days,
      'sessions', p.sessions, 'active', p.active,
      'members', (select count(*) from public.memberships m where m.plan_id = p.id)
    ) order by p.active desc, p.created_at)
    from public.membership_plans p where p.business_id = v_biz
  ), '[]'::jsonb);
end $$;

create or replace function public.save_membership_plan(p_id uuid, p_name text, p_price numeric,
                                                       p_duration_days int, p_sessions int, p_active boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(true);
  v_name text := trim(coalesce(p_name, ''));
  v_days int := nullif(p_duration_days, 0);
  v_sess int := nullif(p_sessions, 0);
  v_id uuid;
begin
  if char_length(v_name) < 2 or char_length(v_name) > 60 then return public.err('invalid_name'); end if;
  if v_days is null and v_sess is null then return public.err('invalid_limit'); end if;
  if v_days is not null and v_days not between 1 and 1095 then return public.err('invalid_duration'); end if;
  if v_sess is not null and v_sess not between 1 and 500 then return public.err('invalid_sessions'); end if;
  if coalesce(p_price, 0) < 0 then return public.err('invalid_price'); end if;

  if p_id is null then
    insert into public.membership_plans (business_id, name, price, duration_days, sessions, active)
    values (v_biz, v_name, coalesce(p_price, 0), v_days, v_sess, coalesce(p_active, true))
    returning id into v_id;
  else
    update public.membership_plans
    set name = v_name, price = coalesce(p_price, 0), duration_days = v_days,
        sessions = v_sess, active = coalesce(p_active, true)
    where id = p_id and business_id = v_biz
    returning id into v_id;
    if v_id is null then return public.err('not_found'); end if;
  end if;

  return jsonb_build_object('ok', true, 'id', v_id);
end $$;

-- The roster. p_filter: all | active | expiring | expired.
create or replace function public.merchant_memberships(p_search text default null, p_filter text default 'all',
                                                       p_limit int default 50, p_offset int default 0) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_q text := nullif(trim(coalesce(p_search, '')), '');
  v_lim int := least(greatest(coalesce(p_limit, 50), 1), 200);
begin
  return jsonb_build_object(
    'total', (select count(*) from public.memberships m where m.business_id = v_biz),
    'counts', (select jsonb_object_agg(s, n) from (
                 select public.membership_status(m.status, m.ends_at, m.sessions_left) as s, count(*) as n
                 from public.memberships m where m.business_id = v_biz group by 1) x),
    'items', coalesce((
      select jsonb_agg(public.membership_view(m) order by
               case public.membership_status(m.status, m.ends_at, m.sessions_left)
                 when 'expiring_soon' then 0 when 'active' then 1 when 'used_up' then 2
                 when 'expired' then 3 else 4 end,
               m.ends_at nulls last)
      from (
        select * from public.memberships m
        where m.business_id = v_biz
          and (v_q is null or m.full_name ilike '%' || v_q || '%' or m.phone like '%' || v_q || '%'
               or m.code::text = v_q)
          and (coalesce(p_filter, 'all') = 'all'
               or public.membership_status(m.status, m.ends_at, m.sessions_left) =
                  case p_filter when 'expiring' then 'expiring_soon' else p_filter end
               or (p_filter = 'active' and public.membership_status(m.status, m.ends_at, m.sessions_left) = 'expiring_soon'))
        order by m.ends_at nulls last
        limit v_lim offset greatest(coalesce(p_offset, 0), 0)
      ) m
    ), '[]'::jsonb)
  );
end $$;

create or replace function public.merchant_membership(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false); m public.memberships%rowtype;
begin
  select * into m from public.memberships where id = p_id and business_id = v_biz;
  if m.id is null then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true, 'membership', public.membership_view(m),
    'history', coalesce((select jsonb_agg(jsonb_build_object('at', c.created_at) order by c.created_at desc)
                         from (select * from public.checkins where membership_id = m.id
                               order by created_at desc limit 30) c), '[]'::jsonb));
end $$;

-- Sell an abonnement. The owner has the cash in hand; this only records it.
create or replace function public.add_membership(p_phone text, p_name text, p_plan_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_phone text := public.normalise_phone(p_phone);
  p public.membership_plans%rowtype;
  m public.memberships%rowtype;
  v_try int := 0;
begin
  if v_phone is null then return public.err('invalid_phone'); end if;
  select * into p from public.membership_plans where id = p_plan_id and business_id = v_biz;
  if p.id is null then return public.err('plan_not_found'); end if;

  select * into m from public.memberships where business_id = v_biz and phone = v_phone;
  if m.id is not null then
    -- Already on the roster: this is a renewal, not a second row.
    return public.renew_membership(m.id, p.id);
  end if;

  loop
    v_try := v_try + 1;
    begin
      insert into public.memberships (business_id, phone, full_name, user_id, plan_id, plan_name, code,
                                      starts_at, ends_at, sessions_left)
      values (v_biz, v_phone, nullif(trim(left(coalesce(p_name, ''), 80)), ''),
              (select id from public.profiles where phone = v_phone),
              p.id, p.name, public.gen_membership_code(v_biz), now(),
              case when p.duration_days is null then null else now() + make_interval(days => p.duration_days) end,
              p.sessions)
      returning * into m;
      exit;
    exception when unique_violation then
      if v_try > 5 then raise; end if;
    end;
  end loop;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'membership_added',
          jsonb_build_object('membership_id', m.id, 'code', m.code, 'plan', p.name, 'price', p.price));

  return jsonb_build_object('ok', true, 'membership', public.membership_view(m));
end $$;

-- Renewing early loses nothing: the new period starts when the old one ends.
create or replace function public.renew_membership(p_id uuid, p_plan_id uuid default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  m public.memberships%rowtype;
  p public.membership_plans%rowtype;
  v_from timestamptz;
begin
  select * into m from public.memberships where id = p_id and business_id = v_biz for update;
  if m.id is null then return public.err('not_found'); end if;

  select * into p from public.membership_plans
  where id = coalesce(p_plan_id, m.plan_id) and business_id = v_biz;
  if p.id is null then return public.err('plan_not_found'); end if;

  v_from := greatest(now(), coalesce(m.ends_at, now()));

  update public.memberships
  set plan_id = p.id,
      plan_name = p.name,
      status = 'active',
      starts_at = case when m.ends_at is null or m.ends_at <= now() then now() else m.starts_at end,
      ends_at = case when p.duration_days is null then null else v_from + make_interval(days => p.duration_days) end,
      -- séances add up rather than reset: he paid for the ones he has left
      sessions_left = case when p.sessions is null then null
                           else coalesce(m.sessions_left, 0) + p.sessions end
  where id = m.id
  returning * into m;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'membership_renewed',
          jsonb_build_object('membership_id', m.id, 'code', m.code, 'plan', p.name, 'price', p.price));

  return jsonb_build_object('ok', true, 'membership', public.membership_view(m));
end $$;

-- Marid, safer, ramadan: days on the end, no pause machinery to get stuck in.
create or replace function public.add_membership_days(p_id uuid, p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false); m public.memberships%rowtype;
begin
  if p_days is null or p_days not between 1 and 365 then return public.err('invalid_days'); end if;
  select * into m from public.memberships where id = p_id and business_id = v_biz for update;
  if m.id is null then return public.err('not_found'); end if;
  if m.ends_at is null then return public.err('no_end_date'); end if;

  update public.memberships
  set ends_at = greatest(now(), m.ends_at) + make_interval(days => p_days)
  where id = m.id returning * into m;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'membership_extended', jsonb_build_object('membership_id', m.id, 'days', p_days));

  return jsonb_build_object('ok', true, 'membership', public.membership_view(m));
end $$;

create or replace function public.cancel_membership(p_id uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true); m public.memberships%rowtype;
begin
  update public.memberships set status = 'cancelled'
  where id = p_id and business_id = v_biz returning * into m;
  if m.id is null then return public.err('not_found'); end if;
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'membership_cancelled', jsonb_build_object('membership_id', m.id, 'code', m.code));
  return jsonb_build_object('ok', true, 'membership', public.membership_view(m));
end $$;

-- The money about to walk out: everyone ending within the week, or already
-- ended in the last month. This list is the product.
create or replace function public.merchant_memberships_expiring(p_days int default 7) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(false); v_d int := least(greatest(coalesce(p_days, 7), 1), 60);
begin
  return coalesce((
    select jsonb_agg(public.membership_view(m) order by m.ends_at)
    from public.memberships m
    where m.business_id = v_biz and m.status = 'active' and m.ends_at is not null
      and m.ends_at < now() + make_interval(days => v_d)
      and m.ends_at > now() - interval '30 days'
  ), '[]'::jsonb);
end $$;

-- ═══ the member's side ═════════════════════════════════════════════════════

create or replace function public.my_memberships() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_phone text;
begin
  if v_uid is null then return '[]'::jsonb; end if;
  select phone into v_phone from public.profiles where id = v_uid;
  return coalesce((
    select jsonb_agg(public.membership_view(m) || jsonb_build_object(
             'business', jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category))
           order by m.ends_at nulls last)
    from public.memberships m join public.businesses b on b.id = m.business_id
    where m.status = 'active' and (m.user_id = v_uid or (v_phone is not null and m.phone = v_phone))
  ), '[]'::jsonb);
end $$;

-- ═══ THE DOOR ══════════════════════════════════════════════════════════════
-- Same token, same single-use rules as a stamp. What differs: nothing is
-- created for a stranger. A person with no abonnement here is told so by name,
-- because the answer the owner needs is "no", not "we made you an account".
create or replace function public.membership_checkin(p_token text, p_claim text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_uid uuid := auth.uid();
  t public.qr_tokens%rowtype;
  b public.businesses%rowtype;
  m public.memberships%rowtype;
  v_phone text;
  v_state text;
begin
  if v_uid is null then return public.err('not_authenticated'); end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  if not public.rate_limit_hit('checkin:' || v_uid, 30, 600) then return public.err('rate_limited'); end if;

  select * into t from public.qr_tokens where token_hash = public.sha256_hex(p_token) for update;
  if t.id is null or (not t.active and t.used_at is null) then return public.err('invalid'); end if;
  select * into b from public.businesses where id = t.business_id;

  select phone into v_phone from public.profiles where id = v_uid;
  select * into m from public.memberships
  where business_id = b.id and (user_id = v_uid or (v_phone is not null and phone = v_phone))
  for update;

  if t.used_at is not null then
    if t.used_by = v_uid and m.id is not null then
      return public.err('already_processed', jsonb_build_object('membership', public.membership_view(m),
                                                                'business', jsonb_build_object('name', b.name)));
    end if;
    return public.err('already_used', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;
  if t.claim_hash is not null then
    if p_claim is null or public.sha256_hex(p_claim) <> t.claim_hash then
      return public.err('already_used', jsonb_build_object('business', jsonb_build_object('name', b.name)));
    end if;
    if t.claim_expires_at <= now() then return public.err('expired'); end if;
  elsif t.expires_at <= now() then
    return public.err('expired', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;

  if b.status <> 'active' then return public.err('business_unavailable'); end if;
  if not public.business_is_open(b.id) then
    return public.err('business_paused', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;
  if m.id is null then
    return public.err('no_membership', jsonb_build_object('business', jsonb_build_object('name', b.name)));
  end if;

  v_state := public.membership_status(m.status, m.ends_at, m.sessions_left);
  if v_state in ('expired', 'used_up', 'cancelled') then
    return public.err('membership_' || v_state, jsonb_build_object('membership', public.membership_view(m),
                                                                   'business', jsonb_build_object('name', b.name)));
  end if;

  -- One entry a day. Stops the "my friend scanned twice" argument before it
  -- starts, and no owner has ever wanted the second one counted.
  if exists (select 1 from public.checkins c
             where c.membership_id = m.id and c.created_at >= public.tunis_today_start()) then
    return public.err('already_checked_in', jsonb_build_object('membership', public.membership_view(m),
                                                               'business', jsonb_build_object('name', b.name)));
  end if;

  insert into public.checkins (membership_id, business_id, user_id, qr_token_id)
  values (m.id, b.id, v_uid, t.id);

  update public.qr_tokens set used_at = now(), used_by = v_uid, active = false where id = t.id;

  update public.memberships
  set user_id = coalesce(user_id, v_uid),
      full_name = coalesce(full_name, (select full_name from public.profiles where id = v_uid)),
      sessions_left = case when sessions_left is null then null else greatest(0, sessions_left - 1) end
  where id = m.id returning * into m;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (b.id, v_uid, 'checkin', jsonb_build_object('membership_id', m.id, 'code', m.code));

  return jsonb_build_object('ok', true, 'kind', 'checkin',
                            'membership', public.membership_view(m),
                            'business', jsonb_build_object('name', b.name, 'logo_url', b.logo_url));
end $$;

-- One entry point for a scanned QR: the database decides which system the
-- token belongs to, so the phone never has to know.
create or replace function public.scan_token(p_token text, p_claim text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare t public.qr_tokens%rowtype; b public.businesses%rowtype; v_phone text;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  select * into t from public.qr_tokens where token_hash = public.sha256_hex(p_token);
  if t.id is null then return public.err('invalid'); end if;
  select * into b from public.businesses where id = t.business_id;

  if b.memberships_enabled then
    select phone into v_phone from public.profiles where id = auth.uid();
    -- A member of this local goes through the door; anyone else falls through
    -- to the loyalty card, which is the right answer for a place running both.
    if exists (select 1 from public.memberships m
               where m.business_id = b.id
                 and (m.user_id = auth.uid() or (v_phone is not null and m.phone = v_phone)))
       or not b.loyalty_enabled then
      return public.membership_checkin(p_token, p_claim);
    end if;
  end if;
  return public.collect_stamp(p_token, p_claim);
end $$;

-- ═══ the super-admin ═══════════════════════════════════════════════════════

create or replace function public.admin_set_systems(p_business uuid, p_loyalty boolean, p_memberships boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_id uuid;
begin
  perform public.require_admin();
  if not coalesce(p_loyalty, false) and not coalesce(p_memberships, false) then
    return public.err('no_system');
  end if;
  update public.businesses
  set loyalty_enabled = coalesce(p_loyalty, false), memberships_enabled = coalesce(p_memberships, false)
  where id = p_business returning id into v_id;
  if v_id is null then return public.err('not_found'); end if;
  insert into public.activity_logs (business_id, actor_id, type, data)
  values (p_business, auth.uid(), 'systems_changed',
          jsonb_build_object('loyalty', coalesce(p_loyalty, false), 'memberships', coalesce(p_memberships, false)));
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the two functions that had to learn about a second system ═════════════

-- A salle has no loyalty card and never will, so "no card" can no longer be a
-- reason to refuse it a QR.
create or replace function public.mint_qr_token() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  v_b public.businesses%rowtype;
  v_token text;
  v_id uuid;
  v_exp timestamptz := now() + interval '60 seconds';
begin
  select * into v_b from public.businesses where id = v_biz;
  if v_b.status <> 'active' then return public.err('business_suspended'); end if;
  if not public.business_is_open(v_biz) then return public.err('subscription_expired'); end if;
  if not (
       (v_b.loyalty_enabled and exists (select 1 from public.loyalty_cards where business_id = v_biz and active))
    or v_b.memberships_enabled
  ) then
    return public.err('no_card');
  end if;
  if not public.rate_limit_hit('mint:' || v_biz, 300, 600) then return public.err('rate_limited'); end if;

  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.qr_tokens (business_id, token_hash, created_by, expires_at)
  values (v_biz, public.sha256_hex(v_token), auth.uid(), v_exp)
  returning id into v_id;

  delete from public.qr_tokens
  where business_id = v_biz and used_at is null and claim_hash is null and expires_at < now() - interval '1 day';

  return jsonb_build_object('ok', true, 'id', v_id, 'token', v_token, 'expires_at', v_exp,
                            'ttl_seconds', 60, 'business_name', v_b.name);
end $$;

-- session_context, plus which systems this business runs and how much Abonili
-- has in it — the lobby needs both to decide whether to show itself at all.
create or replace function public.session_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_biz uuid; v_role text; v_b public.businesses%rowtype;
begin
  if v_uid is null then return null; end if;
  select bm.business_id, bm.role into v_biz, v_role
  from public.business_members bm where bm.user_id = v_uid
  order by (bm.role = 'owner') desc, bm.created_at limit 1;
  select * into v_b from public.businesses where id = v_biz;

  return jsonb_build_object(
    'user', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone,
                                       'email', p.email, 'role', p.role, 'created_at', p.created_at)
             from public.profiles p where p.id = v_uid),
    'member_role', v_role,
    'business', (select jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
                                           'phone', b.phone, 'address', b.address, 'instagram', b.instagram,
                                           'status', b.status, 'created_at', b.created_at,
                                           'cover_url', b.cover_url, 'join_code', b.join_code)
                 from public.businesses b where b.id = v_biz),
    'systems', case when v_biz is null then null else jsonb_build_object(
        'loyalty', v_b.loyalty_enabled,
        'memberships', v_b.memberships_enabled,
        'both', v_b.loyalty_enabled and v_b.memberships_enabled,
        'members', (select count(*) from public.memberships m where m.business_id = v_biz and m.status = 'active'),
        'plans', (select count(*) from public.membership_plans p where p.business_id = v_biz and p.active)
      ) end,
    'card', (select jsonb_build_object('id', k.id, 'name', k.name, 'description', k.description,
                                       'stamps_required', k.stamps_required, 'color', k.color, 'icon', k.icon,
                                       'cooldown_minutes', k.cooldown_minutes, 'valid_days', k.valid_days,
                                       'active', k.active, 'design', k.design,
                                       'reward', (select jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description)
                                                  from public.rewards r where r.loyalty_card_id = k.id and r.is_primary))
             from public.loyalty_cards k where k.business_id = v_biz),
    'subscription', case when v_biz is null then null else public.subscription_state(v_biz) end
  );
end $$;

-- ═══ security ══════════════════════════════════════════════════════════════

do $$
declare t text;
begin
  foreach t in array array['membership_plans', 'memberships', 'checkins'] loop
    execute format('alter table public.%I enable row level security', t);
    execute format('alter table public.%I force row level security', t);
  end loop;
end $$;

grant select on public.membership_plans, public.memberships, public.checkins to authenticated;

drop policy if exists membership_plans_read on public.membership_plans;
create policy membership_plans_read on public.membership_plans for select to authenticated
  using (public.is_business_member(business_id) or public.is_admin());

drop policy if exists memberships_read on public.memberships;
create policy memberships_read on public.memberships for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_member(business_id) or public.is_admin());

drop policy if exists checkins_read on public.checkins;
create policy checkins_read on public.checkins for select to authenticated
  using (user_id = (select auth.uid()) or public.is_business_member(business_id) or public.is_admin());

grant execute on function
  public.scan_token(text, text),
  public.membership_checkin(text, text),
  public.my_memberships(),
  public.merchant_membership_plans(),
  public.save_membership_plan(uuid, text, numeric, int, int, boolean),
  public.merchant_memberships(text, text, int, int),
  public.merchant_membership(uuid),
  public.add_membership(text, text, uuid),
  public.renew_membership(uuid, uuid),
  public.add_membership_days(uuid, int),
  public.cancel_membership(uuid),
  public.merchant_memberships_expiring(int),
  public.admin_set_systems(uuid, boolean, boolean)
to authenticated;

-- 0003's tripwire, re-run: nothing added here may be reachable by anon.
do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;
