-- Pointili — the counter screen learns about Abonili. Re-runnable.
--
-- qr_token_state() is what the till polls four times a second: has this code
-- been used, and what landed since the screen was opened. It only ever reported
-- STAMPS, so a salle running Abonili watched a screen that could never react —
-- a member scanned, the code rotated, and nothing on the counter said so.
--
-- Same shape, one more list. The till decides which of the two it paints from
-- the system its owner came in through; the database just reports both.

create or replace function public.qr_token_state(p_id uuid, p_since timestamptz) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_biz uuid := public.require_business(false);
  t public.qr_tokens%rowtype;
begin
  select * into t from public.qr_tokens where id = p_id and business_id = v_biz;
  return jsonb_build_object(
    'found', t.id is not null,
    'consumed', t.id is not null and (t.used_at is not null or t.claim_hash is not null),
    'expired', t.id is null or t.expires_at <= now(),
    'expires_at', t.expires_at,
    'open', public.business_is_open(v_biz),
    'stamps', coalesce((
      select jsonb_agg(jsonb_build_object('id', s.id, 'at', s.created_at, 'code', c.code, 'balance', c.stamps_balance) order by s.created_at)
      from (select * from public.stamps where business_id = v_biz and created_at > coalesce(p_since, now()) order by created_at desc limit 20) s
      join public.customers c on c.id = s.customer_id
    ), '[]'::jsonb),
    -- who walked in: the name is what the person at the door needs, and the
    -- code is the fallback for a member added by phone alone
    'checkins', coalesce((
      select jsonb_agg(jsonb_build_object(
               'id', k.id, 'at', k.created_at, 'code', m.code, 'name', m.full_name,
               'days_left', case when m.ends_at is null then null
                                 else greatest(0, ceil(extract(epoch from (m.ends_at - now())) / 86400))::int end,
               'sessions_left', m.sessions_left
             ) order by k.created_at)
      from (select * from public.checkins where business_id = v_biz and created_at > coalesce(p_since, now()) order by created_at desc limit 20) k
      join public.memberships m on m.id = k.membership_id
    ), '[]'::jsonb)
  );
end $$;

notify pgrst, 'reload schema';
