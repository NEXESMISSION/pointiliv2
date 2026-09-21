-- A shop's Instagram handle, and the one screen that asks for a follow: the
-- moment right after a stamp lands, when the customer is pleased and still
-- holding the phone.

alter table public.businesses add column if not exists instagram text;

-- Stored as the bare handle, whatever the owner pastes (a URL, an @, a name),
-- so every screen can build its own link from one clean value.
create or replace function public.update_business(p_name text, p_category text, p_phone text, p_address text, p_instagram text default null) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_biz uuid := public.require_business(true);
        v_handle text := lower(regexp_replace(coalesce(p_instagram, ''), '^\s*@|^.*instagram\.com/|[/?].*$|\s', '', 'g'));
begin
  if char_length(trim(coalesce(p_name, ''))) not between 2 and 60 then return public.err('invalid_name'); end if;
  if v_handle <> '' and v_handle !~ '^[a-z0-9._]{1,30}$' then return public.err('invalid_instagram'); end if;
  update public.businesses
  set name = trim(p_name), category = coalesce(nullif(p_category, ''), category),
      phone = nullif(trim(p_phone), ''), address = nullif(trim(left(p_address, 160)), ''),
      instagram = nullif(v_handle, '')
  where id = v_biz;
  return jsonb_build_object('ok', true);
end $$;

-- the owner's settings screen fills the field back in from here
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
                                           'cover_url', b.cover_url, 'join_code', b.join_code)
                 from public.businesses b where b.id = v_biz),
    'card', (select jsonb_build_object('id', k.id, 'name', k.name, 'description', k.description,
                                       'stamps_required', k.stamps_required, 'color', k.color, 'icon', k.icon,
                                       'cooldown_minutes', k.cooldown_minutes, 'active', k.active, 'design', k.design,
                                       'reward', (select jsonb_build_object('id', r.id, 'name', r.name, 'description', r.description)
                                                  from public.rewards r where r.loyalty_card_id = k.id and r.is_primary))
             from public.loyalty_cards k where k.business_id = v_biz),
    'subscription', case when v_biz is null then null else public.subscription_state(v_biz) end
  );
end $$;

-- and every customer-facing card payload carries it, so the screen right after
-- a stamp can offer the follow without another round trip
create or replace function public.card_payload(p_customer_id uuid, p_old_balance int default null) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare c record; b record; k record; v_rewards jsonb; v_next jsonb; v_new jsonb;
begin
  select * into c from public.customers where id = p_customer_id;
  if c.id is null then return null; end if;
  select * into b from public.businesses where id = c.business_id;
  select * into k from public.loyalty_cards where business_id = c.business_id;

  select coalesce(jsonb_agg(jsonb_build_object(
           'id', r.id, 'name', r.name, 'description', r.description,
           'stamps_required', public.reward_cost(r.is_primary, r.stamps_required, c.card_target), 'is_primary', r.is_primary,
           'unlocked', c.stamps_balance >= public.reward_cost(r.is_primary, r.stamps_required, c.card_target),
           'pending', (select jsonb_build_object('id', x.id, 'code', x.code, 'expires_at', x.expires_at)
                       from public.reward_redemptions x
                       where x.customer_id = c.id and x.reward_id = r.id and x.status = 'pending' and x.expires_at > now()
                       limit 1)
         ) order by r.stamps_required, r.created_at), '[]'::jsonb)
  into v_rewards
  from public.rewards r where r.business_id = c.business_id and r.active;

  select jsonb_build_object('id', r.id, 'name', r.name, 'stamps_required', x.cost, 'remaining', x.cost - c.stamps_balance)
  into v_next
  from public.rewards r
  cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
  where r.business_id = c.business_id and r.active and x.cost > c.stamps_balance
  order by x.cost, r.created_at limit 1;

  v_new := '[]'::jsonb;
  if p_old_balance is not null then
    select coalesce(jsonb_agg(jsonb_build_object('id', r.id, 'name', r.name)), '[]'::jsonb) into v_new
    from public.rewards r
    cross join lateral (select public.reward_cost(r.is_primary, r.stamps_required, c.card_target) as cost) x
    where r.business_id = c.business_id and r.active
      and x.cost > p_old_balance and x.cost <= c.stamps_balance;
  end if;

  return jsonb_build_object(
    'customer', jsonb_build_object(
      'id', c.id, 'code', c.code, 'balance', c.stamps_balance, 'total_stamps', c.total_stamps,
      'rewards_redeemed', c.rewards_redeemed, 'first_stamp_at', c.first_stamp_at, 'last_stamp_at', c.last_stamp_at),
    'business', jsonb_build_object(
      'id', b.id, 'name', b.name, 'logo_url', b.logo_url, 'cover_url', b.cover_url, 'category', b.category,
      'address', b.address, 'instagram', b.instagram, 'status', b.status),
    'card', case when k.id is null then null else jsonb_build_object(
      'id', k.id, 'name', k.name, 'description', k.description,
      'stamps_required', public.reward_cost(true, k.stamps_required, c.card_target),
      'card_stamps_required', k.stamps_required,
      'design', k.design,
      'color', k.color, 'icon', k.icon, 'cooldown_minutes', k.cooldown_minutes, 'active', k.active) end,
    'rewards', v_rewards,
    'next_reward', v_next,
    'newly_unlocked', v_new
  );
end $$;
