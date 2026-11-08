-- ═══ the packs: Pointili and Pointili Pro (9 Nov 2026) ═══════════════════════
-- The founder: «build it all» — the model of 8 Nov (localbase/../SYSTEMS-RELEASE.md): every visit is a
-- tampon; the owner picks ONE reward for them (the gift, the roulette, the store) and adds extras (the
-- golden ticket, the link, staff phones). Two packs sell it:
--   · Pointili (base): the card with a gift or the roulette, the link — 35 / 120 / 180, today's prices;
--   · Pointili Pro (pro): + the golden ticket, the store, the customers' file, 3 staff phones — 55 / 200 / 300.
-- Every shop already open is «old»: frozen exactly as it is, every switch where the founder left it, its
-- price its own. Only a shop opened from now on starts on a pack (base), and only the founder moves a shop
-- — by hand, as he turns a subscription on after a payment (no payment is asked through the app: the
-- owner pays and sends the receipt on WhatsApp; the prices are v2/lib/plans.ts).
--
-- ONLY NEW THINGS, as the systems' file: no function, table or column already there is changed.

alter table public.shops add column if not exists pack text not null default 'old';
alter table public.shops drop constraint if exists shops_pack_check;
alter table public.shops add constraint shops_pack_check check (pack in ('old', 'base', 'pro'));
-- the shops already there took 'old' when the column came; every shop opened from now on starts on Pointili
alter table public.shops alter column pack set default 'base';
-- the store as the owner's own choice (Pro): until now only the founder switched a shop to it
alter table public.shops add column if not exists store_allowed boolean not null default false;
-- how many staff phones the shop may have (Pro: 3)
alter table public.shops add column if not exists staff_max int not null default 0;
alter table public.shops drop constraint if exists shops_staff_max_check;
alter table public.shops add constraint shops_staff_max_check check (staff_max between 0 and 20);
-- ═══ staff phones (Pro) ═══════════════════════════════════════════════════════
-- A shop's staff: people with their own account and their own phone, who give tampons and hand gifts
-- over at the counter — never the settings, the customers' list, the numbers or the file. The owner
-- invites one with a link (one use, a day); they open it signed in, and they are in. One shop at a time.
create table if not exists public.shop_staff (
  id          bigint generated always as identity primary key,
  shop_id     uuid not null references public.shops (id) on delete cascade,
  user_id     uuid not null references auth.users (id) on delete cascade,
  added_at    timestamptz not null default now(),
  removed_at  timestamptz
);
create unique index if not exists shop_staff_one on public.shop_staff (user_id) where removed_at is null;
create index if not exists shop_staff_shop_idx on public.shop_staff (shop_id) where removed_at is null;
create table if not exists public.staff_invites (
  id          uuid primary key default gen_random_uuid(),
  shop_id     uuid not null references public.shops (id) on delete cascade,
  hash        text not null unique,
  expires_at  timestamptz not null,
  used_at     timestamptz,
  used_by     uuid references auth.users (id) on delete set null,
  created_at  timestamptz not null default now()
);
create index if not exists staff_invites_shop_idx on public.staff_invites (shop_id, created_at desc);
alter table public.shop_staff enable row level security;
alter table public.shop_staff force row level security;
revoke all on public.shop_staff from anon, authenticated, public;
alter table public.staff_invites enable row level security;
alter table public.staff_invites force row level security;
revoke all on public.staff_invites from anon, authenticated, public;
-- what each staff phone did, for its owner to see (staff_act writes it): a tampon given by number, a gift or
-- a prize handed over, a tampon taken back, what the clock took given back. `n`: how many at once
create table if not exists public.staff_log (
  id        bigint generated always as identity primary key,
  shop_id   uuid not null references public.shops (id) on delete cascade,
  staff_id  uuid not null references auth.users (id) on delete cascade,
  fn        text not null,
  n         int not null default 1,
  at        timestamptz not null default now()
);
create index if not exists staff_log_shop_idx on public.staff_log (shop_id, staff_id, at desc);
alter table public.staff_log enable row level security;
alter table public.staff_log force row level security;
revoke all on public.staff_log from anon, authenticated, public;

-- the shop the caller works at as staff (the pack still giving staff phones), or nothing. Someone who has
-- opened a shop of their own since is that shop's owner, and staff nowhere (their counter is their own)
create or replace function public.staff_shop() returns public.shops
language sql stable security definer set search_path = '' as $$
  select sh.* from public.shop_staff st join public.shops sh on sh.id = st.shop_id
  where st.user_id = auth.uid() and st.removed_at is null and sh.staff_max > 0
    and not exists (select 1 from public.shops x where x.owner_id = auth.uid()) limit 1
$$;

-- ═══ the founder ═════════════════════════════════════════════════════════════
-- A shop's pack. The pack sets the shop's switches all at once; 'old' only names it (every switch stays
-- where it is — but its staff phones go: an old shop has no page to see or sign them out). Down to
-- Pointili: the golden ticket's draw waiting is called off, the staff phones signed out; a shop on the
-- store goes back to the card first (with what that does to its customers, seen first)
create or replace function public.admin_set_pack(p_id uuid, p_pack text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_pro boolean := p_pack = 'pro';
begin
  perform public.require_admin();
  if p_pack is null or p_pack not in ('old', 'base', 'pro') then return public.err('invalid'); end if;
  select * into s from public.shops where id = p_id for update;
  if s.id is null then return public.err('not_found'); end if;
  if p_pack = 'old' then
    update public.shops set pack = 'old', staff_max = 0 where id = p_id;
  else
    if not v_pro and s.store_on then return public.err('store_on'); end if;
    update public.shops set pack = p_pack, wheel_allowed = true, links_allowed = true, draw_allowed = v_pro,
      store_allowed = v_pro, export_allowed = v_pro, staff_max = case when v_pro then 3 else 0 end
    where id = p_id;
    if not v_pro then
      update public.draws set status = 'cancelled', cancelled_at = now() where shop_id = p_id and status = 'open';
    end if;
  end if;
  if p_pack <> 'pro' then
    -- no staff phones any more: the ones in are signed out, the invites not yet used stop working
    update public.shop_staff set removed_at = now() where shop_id = p_id and removed_at is null;
    update public.staff_invites set expires_at = now() where shop_id = p_id and used_at is null and expires_at > now();
  end if;
  return jsonb_build_object('ok', true, 'pack', p_pack);
end $$;

-- a shop's systems as the console shows them — now with its pack and its staff phones
create or replace function public.admin_systems(p_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true, 'links', s.links_allowed, 'draw', s.draw_allowed,
    'links_made', (select count(*) from public.codes k where k.shop_id = s.id and k.online),
    'draw_open', (select d.draw_at from public.draws d where d.shop_id = s.id and d.status = 'open' limit 1),
    'draws', (select count(*) from public.draws d where d.shop_id = s.id and d.status = 'drawn'),
    'pack', s.pack, 'store_allowed', s.store_allowed, 'store_on', s.store_on, 'staff_max', s.staff_max,
    'staff', (select count(*) from public.shop_staff st where st.shop_id = s.id and st.removed_at is null));
end $$;

-- what moving a shop to a pack would change, said before it is done (the console's question)
create or replace function public.admin_pack_preview(p_id uuid, p_pack text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype; v_pro boolean := p_pack = 'pro';
begin
  perform public.require_admin();
  select * into s from public.shops where id = p_id;
  if s.id is null then return public.err('not_found'); end if;
  -- «old» moves no switch: only the staff phones go
  if p_pack = 'old' then
    return jsonb_build_object('ok', true, 'changes', (select coalesce(jsonb_agg(x.c), '[]'::jsonb) from (values
      (case when s.staff_max > 0 then 'staff_off' end),
      (case when exists (select 1 from public.shop_staff st where st.shop_id = s.id and st.removed_at is null) then 'staff_signed_out' end)
    ) as x(c) where x.c is not null));
  end if;
  return jsonb_build_object('ok', true, 'blocked', case when not v_pro and s.store_on then 'store_on' end, 'changes', (
    select coalesce(jsonb_agg(x.c), '[]'::jsonb) from (values
      (case when not s.wheel_allowed then 'wheel_on' end),
      (case when not s.links_allowed then 'links_on' end),
      (case when s.draw_allowed <> v_pro then case when v_pro then 'draw_on' else 'draw_off' end end),
      (case when not v_pro and exists (select 1 from public.draws d where d.shop_id = s.id and d.status = 'open') then 'draw_cancelled' end),
      (case when s.store_allowed <> v_pro then case when v_pro then 'store_on' else 'store_off' end end),
      (case when s.export_allowed <> v_pro then case when v_pro then 'export_on' else 'export_off' end end),
      (case when (s.staff_max > 0) <> v_pro then case when v_pro then 'staff_on' else 'staff_off' end end),
      (case when not v_pro and exists (select 1 from public.shop_staff st where st.shop_id = s.id and st.removed_at is null) then 'staff_signed_out' end)
    ) as x(c) where x.c is not null));
end $$;

-- ═══ the owner ═══════════════════════════════════════════════════════════════
-- which systems the founder gave this shop — now with its pack, its reward, and its staff phones
create or replace function public.my_systems() returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('ok', true, 'links', s.links_allowed, 'draw', s.draw_allowed,
    'draw_open', (select d.draw_at from public.draws d where d.shop_id = s.id and d.status = 'open' limit 1),
    'wins', (select count(*) from public.draw_wins w where w.shop_id = s.id and w.given_at is null),
    'pack', s.pack, 'store_allowed', s.store_allowed, 'store_on', s.store_on, 'wheel_on', s.wheel_on, 'wheel_allowed', s.wheel_allowed,
    'export', s.export_allowed, 'staff_max', s.staff_max,
    'staff', (select count(*) from public.shop_staff st where st.shop_id = s.id and st.removed_at is null))
  from public.shops s where s.owner_id = auth.uid()
$$;

-- What switching the reward would do to the customers, before it is done: to the store, every tampon
-- becomes a point (the gifts already won stay to take); back to the card, the points become tampons and
-- a customer past a full card has those gifts at once (the promise kept: nothing they collected is lost)
create or replace function public.store_preview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if not s.store_on then
    return jsonb_build_object('ok', true, 'to', 'store', 'allowed', s.store_allowed,
      'customers', (select count(*) from public.cards c where c.shop_id = s.id and c.stamps > 0),
      -- the points: every tampon on the cards, but those a gift from before still holds (set_store takes them)
      'points', (select coalesce(sum(greatest(c.stamps - coalesce(u.n, 0) * coalesce(c.goal, s.goal), 0)), 0)
                 from public.cards c
                 left join (select m.card_id, count(*)::int as n from public.moments m
                            where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null and not m.banked group by m.card_id) u on u.card_id = c.id
                 where c.shop_id = s.id),
      'gifts_waiting', (select count(*) from public.moments m where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null),
      'items', (select count(*) from public.store_items i where i.shop_id = s.id and not i.gone));
  end if;
  return jsonb_build_object('ok', true, 'to', 'card', 'goal', s.goal, 'gift', s.gift,
    'customers', (select count(*) from public.cards c where c.shop_id = s.id and c.stamps > 0),
    'over', (select count(*) from public.cards c where c.shop_id = s.id and c.stamps >= coalesce(c.goal, s.goal)),
    -- as bank() writes them: 50 at most on one card at a time (the rest on its next tampon)
    'gifts', (select coalesce(sum(least(c.stamps / nullif(coalesce(c.goal, s.goal), 0), 50)), 0) from public.cards c where c.shop_id = s.id),
    'orders_waiting', (select count(distinct o.batch) from public.orders o where o.shop_id = s.id and o.status = 'waiting'));
end $$;

-- the owner switches the reward to the store (Pro) or back to the card. To the store, the roulette goes
-- off (one reward at a time); back to the card, every customer past a full card gets those gifts now —
-- what the preview said, so nobody waits for their next tampon to find them
create or replace function public.set_store(p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_gifts int := 0; c record;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if coalesce(p_on, false) = s.store_on then return jsonb_build_object('ok', true, 'on', s.store_on, 'gifts', 0); end if;
  if coalesce(p_on, false) then
    if not s.store_allowed then return public.err('not_allowed'); end if;
    if s.goal is null then return public.err('no_card'); end if;
    -- a gift won before the vouchers still holds its tampons on the card (they leave it when it is handed
    -- over): they leave it now, so the points to spend are only what is left over — and the gift itself
    -- still waits, to take at the counter (it is not taken twice: it is a voucher from now on)
    update public.cards k set stamps = greatest(k.stamps - x.n * coalesce(k.goal, s.goal), 0)
    from (select m.card_id, count(*)::int as n from public.moments m
          where m.shop_id = s.id and m.kind = 'gift' and m.given_at is null and not m.banked group by m.card_id) x
    where k.id = x.card_id;
    update public.moments set banked = true where shop_id = s.id and kind = 'gift' and given_at is null and not banked;
    update public.shops set store_on = true, wheel_on = false where id = s.id;
  else
    update public.shops set store_on = false where id = s.id;
    for c in select x.id from public.cards x where x.shop_id = s.id and x.stamps >= coalesce(x.goal, s.goal) loop
      v_gifts := v_gifts + public.bank(c.id);
    end loop;
  end if;
  return jsonb_build_object('ok', true, 'on', coalesce(p_on, false), 'gifts', v_gifts);
end $$;

-- The store opened with its first things to buy, in one go (the owner chose it on «النظام متاعي» with nothing in it
-- yet): the switch (set_store, with all it does to the customers' tampons) and the list (store_save) together, or
-- neither — the customers never meet an empty store. Its errors as theirs: not_allowed, no_card, invalid…
create or replace function public.store_open(p_items jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare r jsonb; v jsonb; v_why text;
begin
  if p_items is null or jsonb_typeof(p_items) <> 'array' or jsonb_array_length(p_items) = 0 then return public.err('no_items'); end if;
  r := public.set_store(true);
  if coalesce(r ->> 'ok', '') <> 'true' then return r; end if;
  v := public.store_save(p_items);
  if coalesce(v ->> 'ok', '') <> 'true' then
    raise exception 'store_open' using errcode = 'P0001', detail = coalesce(v ->> 'error', 'invalid');
  end if;
  return v || jsonb_build_object('on', true);
exception when sqlstate 'P0001' then
  get stacked diagnostics v_why = pg_exception_detail;
  return public.err(coalesce(nullif(v_why, ''), 'invalid'));
end $$;

-- the owner's staff phones: who, since when, what each did today and these 7 days (the tampons given by
-- number, the gifts and prizes handed over, the tampons taken back — staff_log), the room left, and the
-- invites sent and not yet used (still open: they can be called off)
create or replace function public.my_staff() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype; v_day timestamptz := (date_trunc('day', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis';
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  return jsonb_build_object('ok', true, 'max', s.staff_max,
    'invites', (select count(*) from public.staff_invites i where i.shop_id = s.id and i.used_at is null and i.expires_at > now()),
    'staff', coalesce((select jsonb_agg(jsonb_build_object('id', st.id, 'name', nullif(p.name, ''), 'phone', public.masked(p.phone), 'since', st.added_at,
                        'today', jsonb_build_object('stamps', d.stamps_day, 'gifts', d.gifts_day, 'back', d.back_day),
                        'week', jsonb_build_object('stamps', d.stamps_week, 'gifts', d.gifts_week, 'back', d.back_week),
                        'last', d.last) order by st.added_at)
                      from public.shop_staff st left join public.people p on p.id = st.user_id
                      cross join lateral (
                        select coalesce(sum(l.n) filter (where l.fn = 'give_stamp' and l.at >= v_day), 0) as stamps_day,
                               coalesce(sum(l.n) filter (where l.fn <> 'give_stamp' and l.fn <> 'unstamp' and l.fn <> 'restore_reset' and l.at >= v_day), 0) as gifts_day,
                               coalesce(sum(l.n) filter (where l.fn = 'unstamp' and l.at >= v_day), 0) as back_day,
                               coalesce(sum(l.n) filter (where l.fn = 'give_stamp'), 0) as stamps_week,
                               coalesce(sum(l.n) filter (where l.fn <> 'give_stamp' and l.fn <> 'unstamp' and l.fn <> 'restore_reset'), 0) as gifts_week,
                               coalesce(sum(l.n) filter (where l.fn = 'unstamp'), 0) as back_week,
                               max(l.at) as last
                        from public.staff_log l where l.shop_id = s.id and l.staff_id = st.user_id and l.at > now() - interval '7 days') d
                      where st.shop_id = s.id and st.removed_at is null), '[]'::jsonb));
end $$;

-- the invites sent and not yet used, called off (a link sent to the wrong person, or never needed)
create or replace function public.staff_invite_cancel() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_n int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  update public.staff_invites set expires_at = now() where shop_id = s.id and used_at is null and expires_at > now();
  get diagnostics v_n = row_count;
  return jsonb_build_object('ok', true, 'n', v_n);
end $$;

-- a link to invite one more: one use, a day (only its SHA-256 is kept, like the counter's codes)
create or replace function public.staff_invite() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_token text; v_n int;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if s.staff_max < 1 then return public.err('not_allowed'); end if;
  select count(*) into v_n from public.shop_staff where shop_id = s.id and removed_at is null;
  if v_n >= s.staff_max then return public.err('full'); end if;
  if not public.try_once('staff_invite:' || s.id, 20, 60) then return public.err('too_many'); end if;
  v_token := translate(encode(extensions.gen_random_bytes(24), 'base64'), '+/=', '-_');
  insert into public.staff_invites (shop_id, hash, expires_at) values (s.id, public.sha(v_token), now() + interval '1 day');
  return jsonb_build_object('ok', true, 'token', v_token);
end $$;

-- a staff phone signed out by its owner
create or replace function public.staff_remove(p_id bigint) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  update public.shop_staff set removed_at = now() where id = p_id and shop_id = s.id and removed_at is null;
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

-- ═══ the staff phone ═════════════════════════════════════════════════════════
-- the invite opened, signed in: in the shop's staff (never its owner, never an owner of another shop)
create or replace function public.staff_join(p_token text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); i public.staff_invites%rowtype; s public.shops%rowtype; v_n int;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  select * into i from public.staff_invites where hash = public.sha(p_token) for update;
  if i.id is null then return public.err('invalid'); end if;
  -- the shop held while its staff are counted: two invites opened at once never pass its limit together
  select * into s from public.shops where id = i.shop_id for update;
  if i.used_at is not null then
    -- the same phone opening its own link again: it is in already
    if i.used_by = v_uid and exists (select 1 from public.shop_staff st where st.user_id = v_uid and st.shop_id = s.id and st.removed_at is null) then
      return jsonb_build_object('ok', true, 'shop', s.name, 'already', true);
    end if;
    return public.err('used');
  end if;
  if i.expires_at <= now() then return public.err('expired'); end if;
  if s.owner_id = v_uid or exists (select 1 from public.shops x where x.owner_id = v_uid) then return public.err('owner'); end if;
  if exists (select 1 from public.shop_staff st where st.user_id = v_uid and st.removed_at is null) then return public.err('elsewhere'); end if;
  select count(*) into v_n from public.shop_staff where shop_id = s.id and removed_at is null;
  if v_n >= s.staff_max then return public.err('full'); end if;
  insert into public.shop_staff (shop_id, user_id) values (s.id, v_uid);
  update public.staff_invites set used_at = now(), used_by = v_uid where id = i.id;
  return jsonb_build_object('ok', true, 'shop', s.name);
end $$;

-- the shop a staff phone works at, as its screens need it (null: not staff anywhere) — and whether it is stopped
-- (its trial or its subscription over: the staff phone says so, and tells its person to see the owner)
create or replace function public.my_staff_shop() returns jsonb
language sql stable security definer set search_path = '' as $$
  select case when s.id is null then null else jsonb_build_object(
    'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'paused', s.paused, 'shut', public.shut(s), 'signal', s.signal, 'logo', s.logo,
    'stamp_logo', s.stamp_logo, 'goal', s.goal, 'gift', s.gift, 'items_on', s.items_on, 'wheel_on', s.wheel_on,
    'wheel_allowed', s.wheel_allowed, 'store_on', s.store_on, 'draw', s.draw_allowed or exists (select 1 from public.draw_wins w where w.shop_id = s.id and w.given_at is null),
    'owner', nullif(split_part(coalesce((select p.name from public.people p where p.id = s.owner_id), ''), ' ', 1), '')) end
  from public.staff_shop() s
$$;

-- an invite looked at before it is used: the shop it is for (its name, its look), or why it will not do
create or replace function public.staff_invite_peek(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare i public.staff_invites%rowtype; s public.shops%rowtype;
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  select * into i from public.staff_invites where hash = public.sha(p_token);
  if i.id is null then return public.err('invalid'); end if;
  select * into s from public.shops where id = i.shop_id;
  return jsonb_build_object('ok', true, 'shop', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo,
    'state', case when i.used_at is not null then case when i.used_by = auth.uid() then 'mine' else 'used' end
                  when i.expires_at <= now() then 'expired' else 'open' end);
end $$;

-- the same invite, for a phone not signed in yet (the server only, with its own key — a visitor can call
-- nothing): the shop it is for and whether it still works, so the page says who invites before the sign-in
create or replace function public.staff_invite_info(p_token text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare i public.staff_invites%rowtype; s public.shops%rowtype;
begin
  if p_token is null or p_token !~ '^[A-Za-z0-9_-]{20,64}$' then return public.err('invalid'); end if;
  select * into i from public.staff_invites where hash = public.sha(p_token);
  if i.id is null then return public.err('invalid'); end if;
  select * into s from public.shops where id = i.shop_id;
  return jsonb_build_object('ok', true, 'shop', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo,
    'state', case when i.used_at is not null then 'used' when i.expires_at <= now() then 'expired' else 'open' end);
end $$;

-- the wallet's extras in one call: the cards with a golden ticket on them (my_draws), and the shop this
-- person works at as staff (its name: a door to its counter) — null for nearly everybody
create or replace function public.my_extras() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return null; end if;
  return jsonb_build_object('draws', public.my_draws(),
    'staff', (select jsonb_build_object('name', s.name, 'color', s.color, 'kind', s.kind, 'logo', s.logo) from public.staff_shop() s where s.id is not null));
end $$;

-- a staff phone leaves the shop itself
create or replace function public.staff_leave() returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  update public.shop_staff set removed_at = now() where user_id = auth.uid() and removed_at is null;
  return jsonb_build_object('ok', found);
end $$;

-- What a staff phone does at the counter: the owner's own counter functions, the very same ones, run for
-- the shop it works at — the code, the counter's heartbeat, a customer read, the tampon given, a gift or
-- a prize handed over, the wheel spun, an order given, a tampon taken back, what the clock took from the
-- card in front of it given back. Nothing else is reachable (no settings, no list, no numbers). They run
-- under the owner's id for this one call (it is how they find the shop), the staff phone's own id kept
-- beside it; a tampon is never given to the hand that gives it. Three things are the phone's own:
--   · its tries: a customer looked up, a tampon given by number — counted for this phone as the owner's
--     are for him (60 and 30 in 10 minutes), and never on the owner's (what the call wrote there is taken
--     back), so a busy counter never locks the owner's out, nor one phone the others;
--   · how far back its counter looks: a working day (12 hours), never the shop's whole past;
--   · what it did, written for the owner (staff_log): the tampons by number, the gifts and prizes handed
--     over, the tampons taken back, what the clock took given back.
create or replace function public.staff_act(p_fn text, p_args jsonb default '{}'::jsonb) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); s public.shops%rowtype; v_claims text := current_setting('request.jwt.claims', true); r jsonb; a jsonb := coalesce(p_args, '{}'::jsonb);
        v_tries text; v_n int;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  s := public.staff_shop();
  if s.id is null then return public.err('not_staff'); end if;
  if p_fn is null or p_fn not in ('new_code', 'counter', 'customer_at', 'give_stamp', 'give', 'give_all', 'held_back', 'my_items',
                                   'draw_wins_at', 'draw_give', 'spin_at_counter', 'store_give', 'unstamp', 'my_wheel', 'restore_reset') then
    return public.err('invalid');
  end if;
  if p_fn in ('customer_at', 'give_stamp', 'draw_wins_at') and public.person_of(a ->> 'p_who') = v_uid then return public.err('own_shop'); end if;
  -- what the clock took, given back for the card at the counter — never every card of the shop at once
  if p_fn = 'restore_reset' and coalesce(a ->> 'p_card', '') !~* '^[0-9a-f]{8}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{4}-[0-9a-f]{12}$' then return public.err('invalid'); end if;
  v_tries := case p_fn when 'customer_at' then 'look:' when 'give_stamp' then 'give:' end;
  if v_tries is not null and not public.try_once(v_tries || 'staff:' || v_uid, case p_fn when 'customer_at' then 60 else 30 end, 10) then
    return public.err('too_many');
  end if;
  perform set_config('request.jwt.claims', jsonb_build_object('sub', s.owner_id, 'role', 'authenticated', 'staff', v_uid)::text, true);
  r := case p_fn
    when 'new_code' then public.new_code((a ->> 'p_item')::bigint)
    when 'counter' then public.counter((a ->> 'p_code')::uuid,
      case when a ->> 'p_since' is null then null else greatest((a ->> 'p_since')::timestamptz, now() - interval '12 hours') end)
    when 'customer_at' then public.customer_at(a ->> 'p_who')
    when 'give_stamp' then public.give_stamp(a ->> 'p_who', (a ->> 'p_item')::bigint)
    when 'give' then public.give((a ->> 'p_moment')::bigint)
    when 'give_all' then public.give_all((a ->> 'p_moment')::bigint)
    when 'held_back' then public.held_back((a ->> 'p_code')::uuid)
    when 'my_items' then public.my_items()
    when 'draw_wins_at' then public.draw_wins_at(a ->> 'p_who')
    when 'draw_give' then public.draw_give((a ->> 'p_win')::bigint)
    when 'spin_at_counter' then public.spin_at_counter((a ->> 'p_moment')::bigint)
    when 'store_give' then public.store_give((a ->> 'p_card')::uuid, (a ->> 'p_batch')::uuid)
    when 'unstamp' then public.unstamp((a ->> 'p_moment')::bigint)
    -- the wheel's prizes and their chances, to turn it at the counter — not how many are left, nor its month
    when 'my_wheel' then (select case when w ->> 'ok' = 'true' then jsonb_build_object('ok', true, 'on', w -> 'on', 'allowed', w -> 'allowed',
        'prizes', (select coalesce(jsonb_agg(jsonb_build_object('id', p -> 'id', 'name', p -> 'name', 'chance', p -> 'chance')), '[]'::jsonb)
                   from jsonb_array_elements(coalesce(w -> 'prizes', '[]'::jsonb)) p)) else w end
      from (select public.my_wheel() as w) x)
    when 'restore_reset' then public.restore_reset((a ->> 'p_card')::uuid)
  end;
  perform set_config('request.jwt.claims', coalesce(v_claims, ''), true);
  -- the owner's own tries left as they were: this phone's were counted above
  if v_tries is not null then
    delete from public.tries where key = v_tries || s.owner_id::text and at = now();
  end if;
  if p_fn in ('give_stamp', 'give', 'give_all', 'draw_give', 'spin_at_counter', 'store_give', 'unstamp', 'restore_reset')
     and r ->> 'ok' = 'true' and coalesce(r ->> 'already', '') <> 'true' then
    v_n := case when p_fn in ('give_all', 'restore_reset') then case when coalesce(r ->> 'n', '') ~ '^\d{1,6}$' then (r ->> 'n')::int else 0 end else 1 end;
    if v_n > 0 then insert into public.staff_log (shop_id, staff_id, fn, n) values (s.id, v_uid, p_fn, v_n); end if;
  end if;
  return r;
end $$;

-- ═══ the founder's view of every shop: its pack and its staff phones beside its systems ═══
create or replace function public.admin_systems_all() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_all boolean;
begin
  perform public.require_admin();
  v_all := public.sees_robots();
  return coalesce((
    select jsonb_agg(x.j order by x.week desc, x.last desc nulls last) from (
      select jsonb_build_object(
        'id', s.id, 'name', s.name, 'kind', s.kind, 'color', s.color, 'logo', s.logo,
        'card', s.goal is not null, 'paused', s.paused, 'paid', s.paid_until is not null and s.paid_until > now(), 'shut', public.shut(s),
        'wheel', s.wheel_allowed, 'wheel_on', s.wheel_on, 'store', s.store_on, 'items', s.items_on, 'export', s.export_allowed,
        'links', s.links_allowed, 'links_made', (select count(*) from public.codes k where k.shop_id = s.id and k.online),
        'draw', s.draw_allowed, 'draw_open', (select d.draw_at from public.draws d where d.shop_id = s.id and d.status = 'open' limit 1),
        'week', wk.n, 'pack', s.pack, 'store_allowed', s.store_allowed,
        'staff', (select count(*) from public.shop_staff st where st.shop_id = s.id and st.removed_at is null)) as j, wk.n as week, wk.last
      from public.shops s left join public.people p on p.id = s.owner_id
      cross join lateral (select count(*) filter (where m.kind = 'stamp' and m.created_at > now() - interval '7 days') as n, max(m.created_at) as last
                          from public.moments m where m.shop_id = s.id) wk
      where v_all or (not public.is_robot(s.owner_id) and not coalesce(p.is_admin or p.is_tester, false))) x), '[]'::jsonb);
end $$;

-- the shops on a pack, for the console's list of shops (a chip beside the name): every old shop is left out
create or replace function public.admin_pack_map() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select jsonb_object_agg(s.id, s.pack) from public.shops s where s.pack <> 'old'), '{}'::jsonb);
end $$;

-- ═══ the golden ticket, with staff phones there are ══════════════════════════
-- Who is in a draw (systems-2026-11-08.sql), now without the shop's own staff either: like its owner,
-- the hands that give the tampons are not in the shop's draw
create or replace function public.draw_pool(d public.draws) returns table (card_id uuid, user_id uuid, tickets int)
language sql stable security definer set search_path = '' as $$
  select c.id, c.user_id, count(*)::int
  from public.moments m join public.cards c on c.id = m.card_id
  where d.rule = 'stamps' and m.shop_id = d.shop_id and m.kind = 'stamp'
    and m.created_at >= d.starts_at and m.created_at < d.draw_at
    and c.user_id <> (select s.owner_id from public.shops s where s.id = d.shop_id)
    and not exists (select 1 from public.people p where p.id = c.user_id and (p.is_admin or p.is_tester))
    and not exists (select 1 from public.shop_staff st where st.shop_id = d.shop_id and st.user_id = c.user_id and st.removed_at is null)
  group by c.id, c.user_id
  union all
  select c.id, c.user_id, 1
  from public.cards c
  where d.rule = 'cards' and c.shop_id = d.shop_id and c.created_at < d.draw_at
    and c.user_id <> (select s.owner_id from public.shops s where s.id = d.shop_id)
    and not exists (select 1 from public.people p where p.id = c.user_id and (p.is_admin or p.is_tester))
    and not exists (select 1 from public.shop_staff st where st.shop_id = d.shop_id and st.user_id = c.user_id and st.removed_at is null)
$$;

-- ═══ who may call what (these functions only) ═══════════════════════════════
-- Kept in a function, so schema.sql gives them again when it runs on its own: its «who may call what»
-- takes every function's grants away first, and these files come after it (scripts/db.mjs)
create or replace function public.packs_grants() returns void
language plpgsql security definer set search_path = '' as $$
begin
  revoke execute on function public.staff_shop(), public.admin_set_pack(uuid, text), public.admin_pack_preview(uuid, text),
    public.my_systems(), public.store_preview(), public.set_store(boolean), public.store_open(jsonb),
    public.my_staff(), public.staff_invite(), public.staff_invite_cancel(), public.staff_remove(bigint), public.staff_join(text),
    public.my_staff_shop(), public.staff_leave(), public.staff_act(text, jsonb), public.staff_invite_peek(text), public.my_extras(),
    public.staff_invite_info(text), public.admin_pack_map(), public.draw_pool(public.draws), public.packs_grants()
    from public, anon, authenticated;
  grant execute on function public.admin_set_pack(uuid, text), public.admin_pack_preview(uuid, text), public.my_systems(), public.store_preview(), public.set_store(boolean), public.store_open(jsonb),
    public.my_staff(), public.staff_invite(), public.staff_invite_cancel(), public.staff_remove(bigint), public.staff_join(text), public.my_staff_shop(), public.staff_leave(),
    public.staff_act(text, jsonb), public.staff_invite_peek(text), public.my_extras(), public.admin_pack_map()
    to authenticated;
  grant execute on function public.staff_shop(), public.admin_set_pack(uuid, text), public.admin_pack_preview(uuid, text),
    public.my_systems(), public.store_preview(), public.set_store(boolean), public.store_open(jsonb),
    public.my_staff(), public.staff_invite(), public.staff_invite_cancel(), public.staff_remove(bigint), public.staff_join(text),
    public.my_staff_shop(), public.staff_leave(), public.staff_act(text, jsonb), public.staff_invite_peek(text), public.my_extras(),
    public.staff_invite_info(text), public.admin_pack_map(), public.draw_pool(public.draws), public.packs_grants()
    to service_role;
end $$;
select public.packs_grants();

notify pgrst, 'reload schema';
