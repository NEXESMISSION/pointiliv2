-- ═══ «ادخل كمحل»: the founder inside a shop, with the owner's powers ═══════
-- The founder opens every shop (0008/0011) and can now also work inside one:
-- design the card, upload the logo, change the levels — everything the owner
-- does, through the owner's own screens and RPCs. An admin's row here makes
-- require_business() answer with that shop; every change the RPCs log keeps
-- auth.uid(), so the activity shows the founder's name, never the owner's.
-- A row older than 12 hours no longer counts: nobody stays inside by accident.

create table if not exists public.admin_acting (
  admin_id    uuid primary key references public.profiles (id) on delete cascade,
  business_id uuid not null references public.businesses (id) on delete cascade,
  started_at  timestamptz not null default now()
);
alter table public.admin_acting enable row level security;
alter table public.admin_acting force row level security;
revoke all on public.admin_acting from public, anon, authenticated;

-- The shop an admin is inside right now, or null.
create or replace function public.acting_business() returns uuid
language sql stable security definer set search_path = '' as $$
  select a.business_id
  from public.admin_acting a
  join public.profiles p on p.id = a.admin_id and p.role = 'admin'
  where a.admin_id = auth.uid() and a.started_at > now() - interval '12 hours'
$$;

create or replace function public.require_business(p_owner_only boolean default false) returns uuid
language plpgsql stable security definer set search_path = '' as $$
declare v uuid;
begin
  if auth.uid() is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  -- the founder inside a shop acts as its owner
  v := public.acting_business();
  if v is not null then return v; end if;
  select bm.business_id into v
  from public.business_members bm
  where bm.user_id = auth.uid() and (not p_owner_only or bm.role = 'owner')
  order by (bm.role = 'owner') desc, bm.created_at
  limit 1;
  if v is null then raise exception 'not_merchant' using errcode = '42501'; end if;
  return v;
end $$;

create or replace function public.admin_act_as(p_business uuid) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  if not exists (select 1 from public.businesses where id = p_business) then return public.err('not_found'); end if;
  insert into public.admin_acting (admin_id, business_id, started_at) values (auth.uid(), p_business, now())
  on conflict (admin_id) do update set business_id = excluded.business_id, started_at = now();
  insert into public.activity_logs (business_id, actor_id, type, data) values (p_business, auth.uid(), 'admin_entered', '{}'::jsonb);
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_stop_acting() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v uuid;
begin
  perform public.require_admin();
  delete from public.admin_acting where admin_id = auth.uid() returning business_id into v;
  if v is not null then
    insert into public.activity_logs (business_id, actor_id, type, data) values (v, auth.uid(), 'admin_left', '{}'::jsonb);
  end if;
  return jsonb_build_object('ok', true, 'business_id', v);
end $$;

-- The session knows when the founder is inside a shop: the shop's context,
-- the owner's role, and `acting` so the screens can say so.
create or replace function public.session_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_biz uuid; v_role text; v_acting boolean := false;
begin
  if v_uid is null then return null; end if;
  v_biz := public.acting_business();
  if v_biz is not null then
    v_role := 'owner';
    v_acting := true;
  else
    select bm.business_id, bm.role into v_biz, v_role
    from public.business_members bm where bm.user_id = v_uid
    order by (bm.role = 'owner') desc, bm.created_at limit 1;
  end if;

  return jsonb_build_object(
    'user', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone,
                                       'email', p.email, 'role', p.role, 'created_at', p.created_at)
             from public.profiles p where p.id = v_uid),
    'member_role', v_role,
    'acting', v_acting,
    'business', (select jsonb_build_object('id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'category', b.category,
                                           'phone', b.phone, 'address', b.address, 'instagram', b.instagram,
                                           'status', b.status, 'created_at', b.created_at,
                                           'cover_url', b.cover_url, 'join_code', b.join_code,
                                           'onboarded_at', b.onboarded_at)
                 from public.businesses b where b.id = v_biz),
    'card', (select jsonb_build_object('id', k.id, 'name', k.name, 'description', k.description,
                                       'stamps_required', k.stamps_required, 'color', k.color, 'icon', k.icon,
                                       'cooldown_minutes', k.cooldown_minutes, 'valid_days', k.valid_days,
                                       'active', k.active, 'design', k.design,
                                       'reward', (select jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description)
                                                  from public.rewards r where r.loyalty_card_id = k.id and r.is_primary),
                                       'levels', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'stamps', r.stamps_required)
                                                                            order by r.stamps_required)
                                                           from public.rewards r
                                                           where r.loyalty_card_id = k.id and not r.is_primary and r.active
                                                             and r.stamps_required < k.stamps_required), '[]'::jsonb))
             from public.loyalty_cards k where k.business_id = v_biz),
    'subscription', case when v_biz is null then null else public.subscription_state(v_biz) end
  );
end $$;

-- ═══ who may call what ═════════════════════════════════════════════════════
revoke execute on function public.acting_business() from public, anon, authenticated;
grant execute on function public.admin_act_as(uuid) to authenticated;
grant execute on function public.admin_stop_acting() to authenticated;
grant execute on function public.session_context() to authenticated;

do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
