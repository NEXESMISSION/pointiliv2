-- Read-only, on the live database, BEFORE this version goes online (14 Nov 2026): what it changes for the shops
-- that run today. Real shops only (never a robot's, the founder's or a tester's). Nothing is written.
--   · gift_with_dot: a gift that already holds « · » would read as «الحريف يختار الكادو» — must be 0, and so must
--     gifts_waiting_with_dot (a voucher waiting with « · » in it would ask the customer to choose).
--   · news_rows: what the 🔔 will hold on the first day (every piece published after each shop opened).
with real as (
  select s.* from public.shops s left join public.people p on p.id = s.owner_id
  where not public.is_robot(s.owner_id) and not coalesce(p.is_admin or p.is_tester, false)
)
select jsonb_build_object(
  'real_shops', (select count(*) from real),
  'paid_shops', (select count(*) from real where paid_until > now()),
  'store_shops', (select count(*) from real where store_on),
  'wheel_shops', (select count(*) from real where wheel_on),
  'items_shops', (select count(*) from real where items_on),
  'gift_with_dot', (select count(*) from real where gift like '% · %'),
  'gifts_waiting_with_dot', (select count(*) from public.moments m join real r on r.id = m.shop_id where m.kind = 'gift' and m.given_at is null and m.gift like '% · %'),
  'news_rows', (select count(*) from public.news)
) as before_go_live;
