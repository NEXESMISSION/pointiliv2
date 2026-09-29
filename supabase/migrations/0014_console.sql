-- ═══ the founder's home (board 9): the money in six months, what not to forget ══
-- admin_overview() keeps every key it had and adds:
--   revenue_months — the last six months, oldest first: [{ m: 'YYYY-MM', amount }]
--   todo           — up to five shops that need the founder, most urgent first:
--                    a subscription ending soon, a shop with no card yet, a shop
--                    whose customers have not scanned for a week.

create or replace function public.admin_overview() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_month timestamptz := (date_trunc('month', now() at time zone 'Africa/Tunis')) at time zone 'Africa/Tunis';
begin
  perform public.require_admin();
  return jsonb_build_object(
    'businesses', (select count(*) from public.businesses),
    'active_businesses', (select count(*) from public.businesses b where public.business_is_open(b.id)),
    'suspended_businesses', (select count(*) from public.businesses where status = 'suspended'),
    'customers', (select count(*) from public.profiles where role = 'customer'),
    'new_customers_month', (select count(*) from public.profiles where role = 'customer' and created_at >= v_month),
    'stamps_today', (select count(*) from public.stamps where created_at >= public.tunis_today_start()),
    'stamps_total', (select count(*) from public.stamps),
    'active_subscriptions', (select count(distinct business_id) from public.subscriptions
                             where status = 'active' and plan <> 'trial' and starts_at <= now() and expires_at > now()),
    'trials', (select count(distinct s.business_id) from public.subscriptions s
               where s.status = 'active' and s.plan = 'trial' and s.starts_at <= now() and s.expires_at > now()
                 and not exists (select 1 from public.subscriptions p where p.business_id = s.business_id and p.plan <> 'trial'
                                 and p.status = 'active' and p.starts_at <= now() and p.expires_at > now())),
    'expiring_soon', (select count(*) from public.businesses b where (public.subscription_state(b.id) ->> 'status') = 'expiring_soon'),
    'revenue', (select coalesce(sum(amount), 0) from public.payments where status = 'paid'),
    'revenue_month', (select coalesce(sum(amount), 0) from public.payments where status = 'paid' and confirmed_at >= v_month),
    'pending_payments', (select count(*) from public.payments where status = 'pending'),
    'recent', public.admin_activity_items(null, 8),
    'revenue_months', (
      select coalesce(jsonb_agg(jsonb_build_object('m', to_char(q.m, 'YYYY-MM'), 'amount', q.amount) order by q.m), '[]'::jsonb)
      from (
        select m,
               (select coalesce(sum(p.amount), 0) from public.payments p
                where p.status = 'paid'
                  and p.confirmed_at >= (m at time zone 'Africa/Tunis')
                  and p.confirmed_at < ((m + interval '1 month') at time zone 'Africa/Tunis')) as amount
        from generate_series(date_trunc('month', now() at time zone 'Africa/Tunis') - interval '5 months',
                             date_trunc('month', now() at time zone 'Africa/Tunis'), interval '1 month') as m
      ) q
    ),
    'todo', (
      select coalesce(jsonb_agg(t.item order by t.rank, t.name), '[]'::jsonb)
      from (
        select * from (
          select 1 as rank, b.name, jsonb_build_object('kind', 'renew', 'id', b.id, 'name', b.name,
                                                       'days', (public.subscription_state(b.id) ->> 'days_left')::int) as item
          from public.businesses b where (public.subscription_state(b.id) ->> 'status') = 'expiring_soon'
          union all
          select 2, b.name, jsonb_build_object('kind', 'no_card', 'id', b.id, 'name', b.name)
          from public.businesses b
          where b.status = 'active' and not exists (select 1 from public.loyalty_cards k where k.business_id = b.id)
          union all
          select 3, b.name, jsonb_build_object('kind', 'quiet', 'id', b.id, 'name', b.name)
          from public.businesses b
          where b.status = 'active'
            and exists (select 1 from public.loyalty_cards k where k.business_id = b.id)
            and exists (select 1 from public.customers c where c.business_id = b.id)
            and not exists (select 1 from public.stamps s where s.business_id = b.id and s.created_at > now() - interval '7 days')
        ) all_items
        order by rank, name
        limit 5
      ) t
    )
  );
end $$;

grant execute on function public.admin_overview() to authenticated;

do $$
declare v_bad text;
begin
  select string_agg(p.proname, ', ') into v_bad
  from pg_proc p
  where p.pronamespace = 'public'::regnamespace and has_function_privilege('anon', p.oid, 'EXECUTE');
  if v_bad is not null then raise exception 'anon can execute: %', v_bad; end if;
end $$;

notify pgrst, 'reload schema';
