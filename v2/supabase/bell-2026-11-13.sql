-- ═══ the bell: the founder's news, kept for the owner (13 Nov 2026) ═══════════
-- The popup (news_next, schema.sql) shows a piece of news once; the bell at the top of the owner's
-- pages keeps every piece: what was written for this owner, the newest first, and what is not read yet.
-- «Read» is the very row «seen» is (news_views): a piece the popup showed is read, and one read in the
-- bell never pops up afterwards (news_next skips what was seen). Nothing new in the tables.
--
-- Written for this owner: a piece for every shop, published after this shop opened (as news_next: a new
-- owner gets no old news), or a piece written to this person by name (only_people), whenever it was.
-- Laid after schema.sql and the other files (scripts/db.mjs AFTER, localbase/server.mjs FILES).

create or replace function public.bell_for(p_news public.news, p_uid uuid, p_opened timestamptz) returns boolean
language sql stable security definer set search_path = '' as $$
  select p_news.active and p_news.published_at <= now()
    and (case when p_news.only_people is not null then p_uid = any (p_news.only_people) else p_news.published_at > p_opened end)
    and (not p_news.only_testers or exists (select 1 from public.people t where t.id = p_uid and t.is_tester))
$$;

-- the badge: how many are not read yet (null for somebody without a shop)
create or replace function public.my_bell() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_opened timestamptz;
begin
  if v_uid is null then return null; end if;
  select created_at into v_opened from public.shops where owner_id = v_uid;
  if v_opened is null then return null; end if;
  return jsonb_build_object('unread', (
    select count(*) from public.news n
    where public.bell_for(n, v_uid, v_opened)
      and not exists (select 1 from public.news_views w where w.news_id = n.id and w.person_id = v_uid)));
end $$;

-- the list itself: the last forty, each saying whether it is new to this owner
create or replace function public.my_inbox() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_opened timestamptz;
begin
  if v_uid is null then return '[]'::jsonb; end if;
  select created_at into v_opened from public.shops where owner_id = v_uid;
  if v_opened is null then return '[]'::jsonb; end if;
  return coalesce((
    select jsonb_agg(jsonb_build_object(
             'id', x.id, 'title', x.title, 'body', x.body, 'icon', x.icon, 'cta_label', x.cta_label,
             'cta_href', x.cta_href, 'pic', x.pic, 'at', x.published_at, 'new', x.unread)
           order by x.published_at desc)
    from (
      select n.*, w.news_id is null as unread
      from public.news n
      left join public.news_views w on w.news_id = n.id and w.person_id = v_uid
      where public.bell_for(n, v_uid, v_opened)
      order by n.published_at desc
      limit 40
    ) x), '[]'::jsonb);
end $$;

-- the bell opened: everything in it is read (written as seen, the way the popup writes it)
create or replace function public.bell_read() returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); v_opened timestamptz;
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  select created_at into v_opened from public.shops where owner_id = v_uid;
  if v_opened is null then return jsonb_build_object('ok', true); end if;
  insert into public.news_views (news_id, person_id)
  select n.id, v_uid from public.news n where public.bell_for(n, v_uid, v_opened)
  on conflict do nothing;
  return jsonb_build_object('ok', true);
end $$;

revoke all on function public.bell_for(public.news, uuid, timestamptz), public.my_bell(), public.my_inbox(), public.bell_read() from public, anon;
grant execute on function public.my_bell(), public.my_inbox(), public.bell_read() to authenticated;
