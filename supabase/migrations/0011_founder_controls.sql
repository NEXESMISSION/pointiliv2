-- Pointili — the founder sets a shop up; the owner only finishes what he alone
-- knows. Re-runnable.
--
-- 1. A shop the founder opens starts "not set up" (onboarded_at is null). The
--    owner's first sign-in walks him through the few things that are his to
--    say — the logo, where the shop is, its Instagram — then his card, then
--    the QR. Nothing the founder already typed is asked again.
-- 2. The founder's hand on every subscription: any plan, any end date, any
--    price, recorded in one step (admin_set_subscription), and a quick
--    extension (admin_extend_subscription).

alter table public.businesses add column if not exists onboarded_at timestamptz;
comment on column public.businesses.onboarded_at is 'when the owner finished the welcome steps; null = send him there';

-- shops that already give stamps are not sent back to a welcome screen
update public.businesses b set onboarded_at = b.created_at
where b.onboarded_at is null and exists (select 1 from public.loyalty_cards k where k.business_id = b.id);

-- ═══ the owner's welcome ═══════════════════════════════════════════════════

-- Step one: where the shop is and its Instagram (the logo uploads on its own).
-- Everything is optional; saving, even empty, is what "done" means.
create or replace function public.finish_welcome(p_address text, p_instagram text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true);
        v_handle text := lower(regexp_replace(coalesce(p_instagram, ''), '^\s*@|^.*instagram\.com/|[/?].*$|\s', '', 'g'));
begin
  if v_handle <> '' and v_handle !~ '^[a-z0-9._]{1,30}$' then return public.err('invalid_instagram'); end if;
  update public.businesses
  set address = coalesce(nullif(trim(left(coalesce(p_address, ''), 160)), ''), address),
      instagram = coalesce(nullif(v_handle, ''), instagram),
      onboarded_at = coalesce(onboarded_at, now())
  where id = v_biz;
  return jsonb_build_object('ok', true);
end $$;

-- the app reads onboarded_at from here, with everything else it knows
create or replace function public.session_context() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_biz uuid; v_role text;
begin
  if v_uid is null then return null; end if;
  select bm.business_id, bm.role into v_biz, v_role
  from public.business_members bm where bm.user_id = v_uid
  order by (bm.role = 'owner') desc, bm.created_at limit 1;

  return jsonb_build_object(
    'user', (select jsonb_build_object('id', p.id, 'full_name', p.full_name, 'phone', p.phone,
                                       'email', p.email, 'role', p.role, 'created_at', p.created_at)
             from public.profiles p where p.id = v_uid),
    'member_role', v_role,
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
                                       -- the gifts on the way to the goal (0012 gives them their meaning)
                                       'levels', coalesce((select jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name, 'stamps', r.stamps_required)
                                                                            order by r.stamps_required)
                                                           from public.rewards r
                                                           where r.loyalty_card_id = k.id and not r.is_primary and r.active
                                                             and r.stamps_required < k.stamps_required), '[]'::jsonb))
             from public.loyalty_cards k where k.business_id = v_biz),
    'subscription', case when v_biz is null then null else public.subscription_state(v_biz) end
  );
end $$;

-- ═══ the founder's hand on a subscription ══════════════════════════════════

-- One call for "this shop is on <plan> until <date>, it paid <price>": whatever
-- ran before ends now (kept in the history as ended, not as cancelled — the
-- founder changed it, the shop did not walk away), anything booked after it is
-- dropped, and the new period starts today. A price above zero is recorded as
-- a payment; a trial is always free.
create or replace function public.admin_set_subscription(p_business uuid, p_plan text, p_expires_at timestamptz,
                                                         p_price numeric default null, p_method text default 'cash')
returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_sub uuid; v_price numeric; v_ref text;
begin
  perform public.require_admin();
  if p_plan not in ('trial', 'six_month', 'yearly') then return public.err('invalid_plan'); end if;
  if p_expires_at is null or p_expires_at <= now() + interval '1 hour' or p_expires_at > now() + interval '5 years' then
    return public.err('invalid_date');
  end if;
  v_price := case when p_plan = 'trial' then 0 else coalesce(p_price, public.plan_price(p_plan)) end;
  if v_price < 0 or v_price > 100000 then return public.err('invalid_price'); end if;
  -- one change at a time per shop
  perform 1 from public.businesses where id = p_business for update;
  if not found then return public.err('not_found'); end if;

  update public.subscriptions set expires_at = now()
  where business_id = p_business and status = 'active' and starts_at <= now() and expires_at > now();
  update public.subscriptions set status = 'cancelled'
  where business_id = p_business and status = 'active' and starts_at > now();

  insert into public.subscriptions (business_id, plan, price, starts_at, expires_at)
  values (p_business, p_plan, v_price, now(), p_expires_at)
  returning id into v_sub;

  if v_price > 0 then
    v_ref := 'PTD-M' || upper(encode(extensions.gen_random_bytes(3), 'hex'));
    insert into public.payments (business_id, subscription_id, plan, amount, method, status, payment_reference,
                                 confirmed_by, confirmed_at, notes)
    values (p_business, v_sub, p_plan, v_price,
            case when p_method in ('bank_transfer', 'cash', 'd17', 'other') then p_method else 'cash' end,
            'paid', v_ref, auth.uid(), now(), 'Recorded by admin');
  end if;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (p_business, auth.uid(), 'subscription_activated',
          jsonb_build_object('plan', p_plan, 'expires_at', p_expires_at, 'price', v_price, 'reference', v_ref));
  return jsonb_build_object('ok', true, 'subscription_id', v_sub);
end $$;

-- "+30 days": the period running now (or the last one booked) goes on longer;
-- a shop with nothing running gets a free period from today.
create or replace function public.admin_extend_subscription(p_business uuid, p_days int) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.subscriptions%rowtype;
begin
  perform public.require_admin();
  if p_days is null or p_days not between 1 and 730 then return public.err('invalid_days'); end if;
  perform 1 from public.businesses where id = p_business for update;
  if not found then return public.err('not_found'); end if;

  select * into s from public.subscriptions
  where business_id = p_business and status = 'active' and expires_at > now()
  order by expires_at desc limit 1;

  if s.id is not null then
    update public.subscriptions set expires_at = expires_at + make_interval(days => p_days) where id = s.id;
  else
    select * into s from public.subscriptions where business_id = p_business order by expires_at desc limit 1;
    insert into public.subscriptions (business_id, plan, price, starts_at, expires_at)
    values (p_business, coalesce(s.plan, 'trial'), 0, now(), now() + make_interval(days => p_days));
  end if;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (p_business, auth.uid(), 'subscription_activated', jsonb_build_object('extended_days', p_days));
  return jsonb_build_object('ok', true);
end $$;

-- ═══ who may call what ═════════════════════════════════════════════════════
grant execute on function
  public.finish_welcome(text, text),
  public.admin_set_subscription(uuid, text, timestamptz, numeric, text),
  public.admin_extend_subscription(uuid, int)
to authenticated;

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
