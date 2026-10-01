-- ═══ Switching systems (board 8, K4): what customers hold is converted, fairly ═══
-- One shop, one card, one system — but a shop may change its mind. Nobody
-- starts again from zero: every stamp, every reached gift and every point is
-- converted at its value, rounded in the customer's favour.
--
-- Stamps → points. The owner says what the main gift is worth in points.
--   · a customer's stamps keep their share of the way to the gift:
--     points = ceil(stamps × gift price ÷ that customer's goal);
--   · a gift on the way (a level) reached and not taken becomes its price in
--     points (the owner prices each level; by default its place on the card);
--   · codes waiting at the till are cancelled — their value is in the points.
-- Points → stamps. The owner says how many points make a stamp.
--   · stamps = ceil(points ÷ points per stamp), past the goal if need be:
--     a full card is a gift ready, the rest carries over;
--   · the catalog closes at once: the points it priced are now stamps.
-- Either way: a new version, the codes on screens die, the counter QR stays,
-- and each customer's card says once what happened («ما خسرت شي»).
--
-- p_terms → points: {main_points, rate, expire, catalog: [{name, points}], level_points: {<level id>: points}}
-- p_terms → stamps: {points_per_stamp, goal, reward, levels: [{name, stamps}], valid_days}
-- p_dry_run: the same numbers, nothing changed (the screen's preview).

create or replace function public.switch_card_system(p_to text, p_terms jsonb, p_expected_version int default null,
                                                     p_dry_run boolean default false) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(true);
  k public.loyalty_cards%rowtype;
  v_main int; v_rate numeric(7, 3); v_expire boolean; v_pps int; v_goal int; v_reward text; v_days int;
  v_holders int := 0; v_from int := 0; v_to int := 0; v_ready int := 0; v_pending int := 0;
  v_sample jsonb;
  v_res jsonb;
  v_version int;
  e jsonb;
  r record;
begin
  select * into k from public.loyalty_cards where business_id = v_biz for update;
  if k.id is null then return public.err('no_card'); end if;
  if p_to not in ('stamps', 'points') then return public.err('invalid_system'); end if;
  if k.system = p_to then return public.err('same_system'); end if;
  if p_expected_version is not null and p_expected_version <> k.version then
    return public.err('card_changed', jsonb_build_object('version', k.version));
  end if;
  p_terms := coalesce(p_terms, '{}'::jsonb);

  select count(*) into v_pending from public.reward_redemptions
  where business_id = v_biz and status = 'pending' and expires_at > now();

  -- ── stamps → points ──────────────────────────────────────────────────────
  if p_to = 'points' then
    v_main := coalesce((p_terms ->> 'main_points')::int, 0);
    v_rate := round(coalesce((p_terms ->> 'rate')::numeric, 1), 3);
    v_expire := coalesce((p_terms ->> 'expire')::boolean, false);
    if v_main not between 1 and 100000 then return public.err('invalid_points'); end if;
    if v_rate < 0.1 or v_rate > 100 then return public.err('invalid_rate'); end if;
    if jsonb_typeof(p_terms -> 'catalog') is distinct from 'array' or jsonb_array_length(p_terms -> 'catalog') not between 1 and 12
       or exists (select 1 from jsonb_array_elements(p_terms -> 'catalog') x
                  where char_length(trim(coalesce(x ->> 'name', ''))) not between 2 and 60
                     or coalesce((x ->> 'points')::int, 0) not between 1 and 100000) then
      return public.err('invalid_catalog');
    end if;

    create temp table if not exists switch_conv (customer_id uuid primary key, stamps int, levels int, points int) on commit drop;
    truncate pg_temp.switch_conv;
    insert into pg_temp.switch_conv
    select c.id, b.bal, coalesce(l.n, 0),
           ceil(b.bal::numeric * v_main / greatest(g.goal, 1))::int + coalesce(l.pts, 0)
    from public.customers c
    cross join lateral (select public.live_balance(c.stamps_balance, c.card_expires_at) as bal) b
    cross join lateral (select public.reward_cost(true, k.stamps_required, c.card_target) as goal) g
    left join lateral (
      select count(*)::int as n,
             sum(coalesce((p_terms -> 'level_points' ->> o.id::text)::int,
                           ceil(o.cost::numeric * v_main / greatest(g.goal, 1))::int))::int as pts
      from public.card_offer(c.id) o
      where o.is_level and not o.taken and o.cost <= b.bal
    ) l on true
    where c.business_id = v_biz and (b.bal > 0);

    select count(*), coalesce(sum(stamps), 0), coalesce(sum(points), 0), count(*) filter (where levels > 0)
    into v_holders, v_from, v_to, v_ready
    from pg_temp.switch_conv;
    select jsonb_build_object('stamps', s.stamps, 'goal', public.reward_cost(true, k.stamps_required, c.card_target), 'points', s.points)
    into v_sample
    from pg_temp.switch_conv s join public.customers c on c.id = s.customer_id
    order by s.stamps desc limit 1;

    if p_dry_run then
      return jsonb_build_object('ok', true, 'version', k.version, 'to', 'points', 'holders', v_holders,
                                'stamps', v_from, 'points', v_to, 'levels_ready', v_ready, 'pending', v_pending,
                                'per_stamp', round(v_main::numeric / k.stamps_required, 1), 'goal', k.stamps_required,
                                'sample', v_sample);
    end if;

    update public.reward_redemptions set status = 'cancelled'
    where business_id = v_biz and status = 'pending';

    insert into public.points_ledger (business_id, customer_id, delta, reason, actor_id)
    select v_biz, s.customer_id, s.points, 'convert', auth.uid() from pg_temp.switch_conv s where s.points > 0;
    insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
    select v_biz, auth.uid(), s.customer_id, 'card_converted',
           jsonb_build_object('from', 'stamps', 'to', 'points', 'stamps', s.stamps, 'levels', s.levels, 'points', s.points)
    from pg_temp.switch_conv s;

    update public.customers c
    set points_balance = coalesce(s.points, 0),
        total_points = c.total_points + coalesce(s.points, 0),
        stamps_balance = 0, card_target = null, card_reward = null, card_levels = null,
        levels_claimed = '{}', levels_skipped = '{}', card_started_at = null,
        card_expires_at = case when v_expire and coalesce(s.points, 0) > 0 then now() + interval '365 days' end
    from (select c2.id, sc.points from public.customers c2 left join pg_temp.switch_conv sc on sc.customer_id = c2.id
          where c2.business_id = v_biz) s
    where c.id = s.id;

    update public.loyalty_cards
    set system = 'points', dinars_per_point = v_rate, points_expire = v_expire, version = version + 1, updated_at = now()
    where id = k.id
    returning version into v_version;

    -- a fresh catalog: whatever an earlier points era left closes now
    update public.point_rewards set ends_at = now() where business_id = v_biz and (ends_at is null or ends_at > now());
    for e in select * from jsonb_array_elements(p_terms -> 'catalog') loop
      insert into public.point_rewards (business_id, name, points) values (v_biz, trim(e ->> 'name'), (e ->> 'points')::int);
    end loop;

    insert into public.card_versions (business_id, version, stamps_required, reward_name, levels, valid_days, system, terms, created_by)
    values (v_biz, v_version, 0, trim(p_terms -> 'catalog' -> 0 ->> 'name'), '[]'::jsonb, 0, 'points',
            jsonb_build_object('dinars_per_point', v_rate, 'points_expire', v_expire,
                               'catalog', (select coalesce(jsonb_agg(jsonb_build_object('id', x.id, 'name', x.name, 'points', x.points) order by x.points), '[]'::jsonb)
                                           from public.point_rewards x where x.business_id = v_biz and x.ends_at is null)),
            auth.uid())
    on conflict (business_id, version) do update
      set system = excluded.system, terms = excluded.terms, reward_name = excluded.reward_name, stamps_required = 0,
          levels = '[]'::jsonb, valid_days = 0, created_by = excluded.created_by, created_at = now();

  -- ── points → stamps ──────────────────────────────────────────────────────
  else
    v_pps := coalesce((p_terms ->> 'points_per_stamp')::int, 0);
    v_goal := coalesce((p_terms ->> 'goal')::int, 0);
    v_reward := trim(coalesce(p_terms ->> 'reward', ''));
    v_days := least(greatest(coalesce((p_terms ->> 'valid_days')::int, 0), 0), 365);
    if v_pps not between 1 and 100000 then return public.err('invalid_points'); end if;
    if v_goal not between 2 and 30 then return public.err('invalid_stamps'); end if;
    if char_length(v_reward) < 2 then return public.err('invalid_reward'); end if;
    if (p_terms -> 'levels') is not null and jsonb_typeof(p_terms -> 'levels') = 'array' and (
         jsonb_array_length(p_terms -> 'levels') > 4
         or exists (select 1 from jsonb_array_elements(p_terms -> 'levels') x
                    where char_length(trim(coalesce(x ->> 'name', ''))) not between 2 and 60
                       or coalesce((x ->> 'stamps')::int, 0) not between 1 and v_goal - 1)) then
      return public.err('invalid_levels');
    end if;

    create temp table if not exists switch_back (customer_id uuid primary key, points int, stamps int) on commit drop;
    truncate pg_temp.switch_back;
    insert into pg_temp.switch_back
    select c.id, b.bal, ceil(b.bal::numeric / v_pps)::int
    from public.customers c
    cross join lateral (select public.live_balance(c.points_balance, c.card_expires_at) as bal) b
    where c.business_id = v_biz and b.bal > 0;

    select count(*), coalesce(sum(points), 0), coalesce(sum(stamps), 0), count(*) filter (where stamps >= v_goal)
    into v_holders, v_from, v_to, v_ready
    from pg_temp.switch_back;
    select jsonb_build_object('points', s.points, 'stamps', s.stamps) into v_sample
    from pg_temp.switch_back s order by s.points desc limit 1;

    if p_dry_run then
      return jsonb_build_object('ok', true, 'version', k.version, 'to', 'stamps', 'holders', v_holders,
                                'points', v_from, 'stamps', v_to, 'full_cards', v_ready, 'pending', v_pending,
                                'goal', v_goal, 'sample', v_sample);
    end if;

    update public.reward_redemptions set status = 'cancelled'
    where business_id = v_biz and status = 'pending';

    -- the card itself first, as a stamps save: rewards, levels, its version
    update public.loyalty_cards set system = 'stamps' where id = k.id;
    v_res := public.save_loyalty_card(k.name, coalesce(k.description, ''), v_goal, v_reward, null, k.color, k.icon,
                                      k.cooldown_minutes, v_days, coalesce(p_terms -> 'levels', '[]'::jsonb), k.version, false);
    if not coalesce((v_res ->> 'ok')::boolean, false) then
      raise exception 'switch failed: %', coalesce(v_res ->> 'error', 'unknown') using errcode = 'P0001';
    end if;
    v_version := (v_res ->> 'version')::int;

    insert into public.points_ledger (business_id, customer_id, delta, reason, actor_id)
    select v_biz, s.customer_id, -s.points, 'convert', auth.uid() from pg_temp.switch_back s where s.points > 0;
    insert into public.activity_logs (business_id, actor_id, customer_id, type, data)
    select v_biz, auth.uid(), s.customer_id, 'card_converted',
           jsonb_build_object('from', 'points', 'to', 'stamps', 'points', s.points, 'stamps', s.stamps)
    from pg_temp.switch_back s;

    update public.customers c
    set points_balance = 0, stamps_balance = coalesce(s.stamps, 0),
        card_target = case when coalesce(s.stamps, 0) > 0 then v_goal end,
        card_reward = null, card_levels = null, levels_claimed = '{}', levels_skipped = '{}', card_started_at = null,
        card_expires_at = case when coalesce(s.stamps, 0) > 0 then public.card_window(v_days) end
    from (select c2.id, sb.stamps from public.customers c2 left join pg_temp.switch_back sb on sb.customer_id = c2.id
          where c2.business_id = v_biz) s
    where c.id = s.id;
    -- every converted card starts now, with today's promise
    for r in select customer_id from pg_temp.switch_back where stamps > 0 loop
      perform public.promise_card(r.customer_id);
    end loop;

    -- the points are stamps now: the catalog closes at once
    update public.point_rewards set ends_at = now() where business_id = v_biz and (ends_at is null or ends_at > now());
  end if;

  -- the codes on screens were made for the old system
  update public.qr_tokens set active = false
  where business_id = v_biz and used_at is null and claim_hash is null and active;

  insert into public.activity_logs (business_id, actor_id, type, data)
  values (v_biz, auth.uid(), 'card_switched',
          jsonb_build_object('to', p_to, 'customers', v_holders, 'from_total', v_from, 'to_total', v_to, 'version', v_version));

  return jsonb_build_object('ok', true, 'version', v_version, 'to', p_to, 'holders', v_holders, 'from_total', v_from, 'to_total', v_to);
end $$;

-- the card page says once what a switch did to this customer's card
create or replace function public.card_converted(p_customer uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select jsonb_build_object('at', a.created_at, 'from', a.data ->> 'from', 'to', a.data ->> 'to',
                            'stamps', (a.data ->> 'stamps')::int, 'points', (a.data ->> 'points')::int)
  from public.activity_logs a
  where a.customer_id = p_customer and a.type = 'card_converted' and a.created_at > now() - interval '30 days'
  order by a.created_at desc limit 1
$$;

create or replace function public.customer_card(p_customer_id uuid) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); c public.customers%rowtype;
begin
  if v_uid is null then raise exception 'not_authenticated' using errcode = '42501'; end if;
  select * into c from public.customers where id = p_customer_id and user_id = v_uid;
  if c.id is null then return null; end if;
  if public.is_points_shop(c.business_id) then
    return public.card_payload(c.id) || jsonb_build_object('history', public.points_history(c.id, 20), 'converted', public.card_converted(c.id));
  end if;
  return public.card_payload(c.id) || jsonb_build_object(
    'converted', public.card_converted(c.id),
    'history', coalesce((
      select jsonb_agg(h order by at desc) from (
        select s.created_at as at, jsonb_build_object('type', 'stamp', 'at', s.created_at) as h
        from public.stamps s where s.customer_id = c.id
        union all
        select x.redeemed_at, jsonb_build_object('type', 'reward_redeemed', 'at', x.redeemed_at, 'reward_name', x.reward_name)
        from public.reward_redemptions x where x.customer_id = c.id and x.status = 'redeemed'
        order by 1 desc limit 20
      ) q
    ), '[]'::jsonb)
  );
end $$;

revoke execute on function public.card_converted(uuid) from public, anon, authenticated;
grant execute on function public.switch_card_system(text, jsonb, int, boolean) to authenticated;

do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
