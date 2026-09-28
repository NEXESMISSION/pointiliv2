-- Pointili — first-party analytics for the founder's console. Re-runnable.
--
-- Who comes, when, from where, what they look at and where they tap — visitors
-- included, not only accounts. The app collects it itself
-- (components/analytics/Beacon.tsx → app/api/ev): no third-party script, no IP
-- address, no query string (tokens travel there), and dynamic path segments
-- (/scan/<token>, /join/<code>, ids) collapsed before a row is written.
--
-- Written only by the server with the service key; read only through the
-- admin_traffic* functions below, each of which calls require_admin().

create table if not exists public.analytics_events (
  id           bigint generated always as identity primary key,
  at           timestamptz not null default now(),
  -- view: a page opened · time: engaged time on that page so far (it grows)
  -- click: a tap · login / signup: written by the server
  kind         text not null check (kind in ('view', 'time', 'click', 'login', 'signup')),
  host         text check (char_length(host) <= 100),
  path         text not null check (char_length(path) <= 200),
  -- a browser (cookie, ~1 year), a visit (30 idle minutes end it), one page view
  visitor      text check (visitor ~ '^[A-Za-z0-9_-]{8,40}$'),
  session      text check (session ~ '^[A-Za-z0-9_-]{8,40}$'),
  pv           text check (pv ~ '^[A-Za-z0-9_-]{6,20}$'),
  user_id      uuid references public.profiles (id) on delete set null,
  -- where the visit came from: an outside referrer's host, and the ad tags
  referrer     text check (char_length(referrer) <= 120),
  utm_source   text check (char_length(utm_source) <= 80),
  utm_medium   text check (char_length(utm_medium) <= 80),
  utm_campaign text check (char_length(utm_campaign) <= 120),
  country      text check (char_length(country) <= 8),
  city         text check (char_length(city) <= 80),
  device       text check (device in ('mobile', 'tablet', 'desktop')),
  os           text check (char_length(os) <= 20),
  browser      text check (char_length(browser) <= 30),
  -- the browser inside an app: facebook, messenger, instagram, tiktok…
  in_app       text check (char_length(in_app) <= 20),
  lang         text check (char_length(lang) <= 12),
  vw           smallint,
  vh           smallint,
  ms           int check (ms between 0 and 3600000),
  -- a tap: x as a share of the screen's width, y in page pixels, the page's height
  x            real check (x between 0 and 1),
  y            int check (y between 0 and 200000),
  dh           int check (dh between 0 and 200000),
  target       text check (char_length(target) <= 120),
  bot          boolean not null default false,
  -- localhost and preview deployments
  test         boolean not null default false
);

create index if not exists analytics_events_at_idx on public.analytics_events (at desc);
create index if not exists analytics_events_path_idx on public.analytics_events (path, kind, at desc);
create index if not exists analytics_events_session_idx on public.analytics_events (session, at);
create index if not exists analytics_events_visitor_idx on public.analytics_events (visitor, at desc);
create index if not exists analytics_events_user_idx on public.analytics_events (user_id, at desc) where user_id is not null;

alter table public.analytics_events enable row level security;
alter table public.analytics_events force row level security;
revoke all on public.analytics_events from public, anon, authenticated;
grant all on public.analytics_events to service_role;

-- ── what counts ────────────────────────────────────────────────────────────
-- Unless asked otherwise, the numbers leave out robots, dev hosts and the
-- founder: every browser that has ever been signed in as an admin.
create or replace function public.traffic_events(p_from timestamptz, p_to timestamptz, p_all boolean)
returns setof public.analytics_events
language sql stable security definer set search_path = '' as $$
  select e.* from public.analytics_events e
  where e.at >= p_from and e.at < p_to
    and (p_all or (
      not e.bot and not e.test
      and (e.user_id is null or e.user_id not in (select id from public.profiles where role = 'admin'))
      and (e.visitor is null or e.visitor not in (
        select a.visitor from public.analytics_events a
        join public.profiles p on p.id = a.user_id
        where p.role = 'admin' and a.visitor is not null))
    ))
$$;

-- ── the whole dashboard, in one call ───────────────────────────────────────
create or replace function public.admin_traffic(p_from timestamptz, p_to timestamptz, p_all boolean default false)
returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare
  v_unit text := case when p_to - p_from <= interval '50 hours' then 'hour' else 'day' end;
  v_prev_from timestamptz := p_from - (p_to - p_from);
begin
  perform public.require_admin();
  return (
    with ev as materialized (select * from public.traffic_events(p_from, p_to, p_all)),
    views as materialized (select * from ev where kind = 'view'),
    -- one row per visit: how it began, and on what
    sess as (
      select
        v.session,
        min(v.at) as started,
        count(*) as views,
        (array_agg(v.path order by v.at))[1] as entry,
        (array_agg(v.path order by v.at desc))[1] as exit_path,
        (array_agg(coalesce(nullif(v.utm_source, ''), v.referrer,
                            case when v.in_app in ('facebook', 'messenger', 'instagram', 'tiktok', 'snapchat', 'linkedin') then v.in_app end,
                            'direct') order by v.at))[1] as source,
        (array_agg(v.utm_campaign order by v.at) filter (where v.utm_campaign is not null))[1] as campaign,
        (array_agg(v.device order by v.at))[1] as device,
        (array_agg(v.os order by v.at))[1] as os,
        (array_agg(v.browser order by v.at))[1] as browser,
        (array_agg(v.in_app order by v.at))[1] as in_app,
        (array_agg(v.country order by v.at))[1] as country,
        (array_agg(v.city order by v.at))[1] as city,
        (array_agg(v.visitor order by v.at))[1] as visitor
      from views v
      where v.session is not null
      group by v.session
    ),
    last_seen as (select session, max(at) as last_at from ev where session is not null group by session),
    -- a page's engaged time only grows, so its last report is its total
    page_ms as (
      select session, path, pv, max(ms) as ms from ev
      where kind = 'time' and pv is not null group by session, path, pv
    ),
    engaged as (select session, sum(ms) as ms from page_ms where session is not null group by session),
    sess_user as (
      select distinct on (session) session, user_id from ev
      where user_id is not null and session is not null
      order by session, at desc
    ),
    -- signed out today but signed in on this browser before: still somebody
    sess_full as (
      select s.*, l.last_at, coalesce(g.ms, 0) as ms, u.user_id is not null as signed_in,
             coalesce(u.user_id, (select a.user_id from public.analytics_events a
                                  where a.visitor = s.visitor and a.user_id is not null
                                  order by a.at desc limit 1)) as user_id
      from sess s
      left join last_seen l on l.session = s.session
      left join engaged g on g.session = s.session
      left join sess_user u on u.session = s.session
    ),
    people as (
      select f.*, p.full_name, p.phone, p.role,
             (select b.name from public.business_members bm join public.businesses b on b.id = bm.business_id
              where bm.user_id = f.user_id order by (bm.role = 'owner') desc, bm.created_at limit 1) as business
      from sess_full f
      left join public.profiles p on p.id = f.user_id
    ),
    first_seen as (
      select a.visitor, min(a.at) as first_at from public.analytics_events a
      where a.visitor in (select visitor from views where visitor is not null)
      group by a.visitor
    ),
    prev as (select * from public.traffic_events(v_prev_from, p_from, p_all) where kind = 'view'),
    series as (
      select date_trunc(v_unit, at at time zone 'Africa/Tunis') as t, count(distinct visitor) as visitors, count(*) as views
      from views group by 1
    ),
    buckets as (
      select generate_series(date_trunc(v_unit, p_from at time zone 'Africa/Tunis'),
                             date_trunc(v_unit, (p_to - interval '1 second') at time zone 'Africa/Tunis'),
                             ('1 ' || v_unit)::interval) as t
    ),
    page_time as (select path, round(avg(ms) / 1000.0) as seconds from page_ms group by path),
    page_clicks as (select path, count(*) as clicks from ev where kind = 'click' group by path)
    select jsonb_build_object(
      'from', p_from, 'to', p_to, 'unit', v_unit,
      'kpis', jsonb_build_object(
        'visitors', (select count(distinct visitor) from views),
        'new_visitors', (select count(*) from first_seen where first_at >= p_from),
        'sessions', (select count(*) from sess),
        'views', (select count(*) from views),
        'avg_seconds', (select coalesce(round(avg(ms) / 1000.0), 0) from sess_full),
        'bounce', (select case when count(*) = 0 then null
                               else round(100.0 * count(*) filter (where views = 1) / count(*)) end from sess),
        'signed_in', (select count(distinct user_id) from ev where user_id is not null),
        'logins', (select count(*) from ev where kind = 'login'),
        'signups', (select count(*) from ev where kind = 'signup'),
        'clicks', (select count(*) from ev where kind = 'click')),
      'prev', jsonb_build_object(
        'visitors', (select count(distinct visitor) from prev),
        'sessions', (select count(distinct session) from prev),
        'views', (select count(*) from prev)),
      'series', coalesce((
        select jsonb_agg(jsonb_build_object(
                 't', to_char(b.t, case when v_unit = 'hour' then 'YYYY-MM-DD"T"HH24' else 'YYYY-MM-DD' end),
                 'visitors', coalesce(s.visitors, 0), 'views', coalesce(s.views, 0)) order by b.t)
        from buckets b left join series s on s.t = b.t), '[]'::jsonb),
      -- visits begun, by weekday (1 = Monday) and hour, Tunis time
      'heat_visits', coalesce((
        select jsonb_agg(jsonb_build_object('d', d, 'h', h, 'n', n))
        from (select extract(isodow from started at time zone 'Africa/Tunis')::int as d,
                     extract(hour from started at time zone 'Africa/Tunis')::int as h, count(*) as n
              from sess group by 1, 2) x), '[]'::jsonb),
      -- the product at work: stamps given in the shops, same grid
      'heat_stamps', coalesce((
        select jsonb_agg(jsonb_build_object('d', d, 'h', h, 'n', n))
        from (select extract(isodow from created_at at time zone 'Africa/Tunis')::int as d,
                     extract(hour from created_at at time zone 'Africa/Tunis')::int as h, count(*) as n
              from public.stamps where created_at >= p_from and created_at < p_to group by 1, 2) x), '[]'::jsonb),
      'pages', coalesce((
        select jsonb_agg(jsonb_build_object('path', v.path, 'views', v.views, 'visitors', v.visitors,
                                            'seconds', t.seconds, 'clicks', coalesce(c.clicks, 0)) order by v.views desc)
        from (select path, count(*) as views, count(distinct visitor) as visitors
              from views group by path order by count(*) desc limit 20) v
        left join page_time t on t.path = v.path
        left join page_clicks c on c.path = v.path), '[]'::jsonb),
      'entries', coalesce((select jsonb_agg(jsonb_build_object('k', entry, 'n', n) order by n desc)
                           from (select entry, count(*) as n from sess group by entry order by count(*) desc limit 8) x), '[]'::jsonb),
      'sources', coalesce((select jsonb_agg(jsonb_build_object('k', source, 'n', n) order by n desc)
                           from (select source, count(*) as n from sess group by source order by count(*) desc limit 8) x), '[]'::jsonb),
      'campaigns', coalesce((select jsonb_agg(jsonb_build_object('k', campaign, 'n', n) order by n desc)
                             from (select campaign, count(*) as n from sess where campaign is not null
                                   group by campaign order by count(*) desc limit 8) x), '[]'::jsonb),
      'devices', coalesce((select jsonb_agg(jsonb_build_object('k', coalesce(device, 'unknown'), 'n', n) order by n desc)
                           from (select device, count(*) as n from sess group by device) x), '[]'::jsonb),
      'os', coalesce((select jsonb_agg(jsonb_build_object('k', coalesce(os, 'unknown'), 'n', n) order by n desc)
                      from (select os, count(*) as n from sess group by os order by count(*) desc limit 6) x), '[]'::jsonb),
      -- the app a link was opened in counts before the browser underneath it
      'browsers', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc)
                            from (select coalesce(in_app, browser, 'unknown') as k, count(*) as n
                                  from sess group by 1 order by count(*) desc limit 6) x), '[]'::jsonb),
      'countries', coalesce((select jsonb_agg(jsonb_build_object('k', coalesce(country, 'unknown'), 'n', n) order by n desc)
                             from (select country, count(*) as n from sess group by country order by count(*) desc limit 6) x), '[]'::jsonb),
      'cities', coalesce((select jsonb_agg(jsonb_build_object('k', city, 'n', n) order by n desc)
                          from (select city, count(*) as n from sess where city is not null
                                group by city order by count(*) desc limit 8) x), '[]'::jsonb),
      'audience', coalesce((select jsonb_agg(jsonb_build_object('k', k, 'n', n) order by n desc)
                            from (select coalesce(role, 'visitor') as k, count(*) as n from people group by 1) x), '[]'::jsonb),
      -- right now: anyone heard from in the last five minutes, whatever the range
      'live', (
        with recent as (
          select * from public.traffic_events(now() - interval '5 minutes', now() + interval '1 minute', p_all)
          where visitor is not null
        ), last_ev as (
          select distinct on (visitor) visitor, session, path, at, user_id from recent order by visitor, at desc
        ), shown as (
          select l.*, coalesce(l.user_id, (select a.user_id from public.analytics_events a
                                           where a.visitor = l.visitor and a.user_id is not null
                                           order by a.at desc limit 1)) as known
          from last_ev l order by l.at desc limit 12
        )
        select jsonb_build_object(
          'count', (select count(*) from last_ev),
          'people', coalesce((select jsonb_agg(jsonb_build_object('visitor', s.visitor, 'session', s.session, 'path', s.path,
                                                                 'at', s.at, 'name', p.full_name, 'role', p.role) order by s.at desc)
                              from shown s left join public.profiles p on p.id = s.known), '[]'::jsonb))),
      'recent', coalesce((
        select jsonb_agg(jsonb_build_object(
                 'session', session, 'visitor', visitor, 'started', started, 'last_at', last_at, 'views', views,
                 'entry', entry, 'exit', exit_path, 'seconds', round(ms / 1000.0), 'source', source, 'campaign', campaign,
                 'device', device, 'os', os, 'browser', browser, 'in_app', in_app, 'country', country, 'city', city,
                 'signed_in', signed_in,
                 'user', case when user_id is null then null else jsonb_build_object(
                   'id', user_id, 'name', full_name, 'phone', phone, 'role', role, 'business', business) end)
               order by last_at desc)
        from (select * from people order by last_at desc limit 40) r), '[]'::jsonb)
    )
  );
end $$;

-- ── one visit, page by page ────────────────────────────────────────────────
create or replace function public.admin_traffic_session(p_session text) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare v_visitor text; v_user uuid; v_signed boolean := true;
begin
  perform public.require_admin();
  if p_session is null or p_session !~ '^[A-Za-z0-9_-]{8,40}$' then return null; end if;
  if not exists (select 1 from public.analytics_events where session = p_session) then return null; end if;

  select visitor into v_visitor from public.analytics_events
  where session = p_session and visitor is not null order by at limit 1;
  select user_id into v_user from public.analytics_events
  where session = p_session and user_id is not null order by at desc limit 1;
  if v_user is null and v_visitor is not null then
    v_signed := false;
    select user_id into v_user from public.analytics_events
    where visitor = v_visitor and user_id is not null order by at desc limit 1;
  end if;

  return jsonb_build_object(
    'session', p_session,
    'visitor', v_visitor,
    'signed_in', v_signed and v_user is not null,
    'user', (select jsonb_build_object('id', p.id, 'name', p.full_name, 'phone', p.phone, 'role', p.role,
                                       'business', (select b.name from public.business_members bm
                                                    join public.businesses b on b.id = bm.business_id
                                                    where bm.user_id = p.id order by (bm.role = 'owner') desc, bm.created_at limit 1))
             from public.profiles p where p.id = v_user),
    'first', (select jsonb_build_object('at', at, 'referrer', referrer, 'utm_source', utm_source, 'utm_medium', utm_medium,
                                        'utm_campaign', utm_campaign, 'device', device, 'os', os, 'browser', browser,
                                        'in_app', in_app, 'country', country, 'city', city, 'lang', lang, 'vw', vw, 'vh', vh,
                                        'bot', bot, 'test', test)
              from public.analytics_events where session = p_session and kind = 'view' order by at limit 1),
    'started', (select min(at) from public.analytics_events where session = p_session),
    'last_at', (select max(at) from public.analytics_events where session = p_session),
    'seconds', (select round(coalesce(sum(ms), 0) / 1000.0) from (
                  select max(ms) as ms from public.analytics_events
                  where session = p_session and kind = 'time' and pv is not null group by pv) t),
    'events', coalesce((
      select jsonb_agg(jsonb_build_object(
               'kind', e.kind, 'at', e.at, 'path', e.path, 'target', e.target,
               'seconds', case when e.kind = 'view' then (
                 select round(max(t.ms) / 1000.0) from public.analytics_events t
                 where t.session = p_session and t.pv = e.pv and t.kind = 'time') end)
             order by e.at, e.id)
      from (select * from public.analytics_events
            where session = p_session and kind <> 'time' order by at, id limit 400) e), '[]'::jsonb),
    'other_visits', coalesce((
      select jsonb_agg(jsonb_build_object('session', session, 'started', started, 'views', views, 'entry', entry) order by started desc)
      from (select session, min(at) as started, count(*) filter (where kind = 'view') as views,
                   (array_agg(path order by at) filter (where kind = 'view'))[1] as entry
            from public.analytics_events
            where visitor = v_visitor and session is not null and session <> p_session
            group by session order by min(at) desc limit 12) o), '[]'::jsonb)
  );
end $$;

-- ── where they tap, on one page ────────────────────────────────────────────
-- p_device: 'mobile', or 'desktop' (tablets included: their layout is the wide one)
create or replace function public.admin_traffic_clicks(p_path text, p_device text, p_from timestamptz, p_to timestamptz,
                                                       p_all boolean default false) returns jsonb
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return (
    with c as materialized (select * from public.traffic_events(p_from, p_to, p_all) where kind = 'click'),
    here as (
      select * from c
      where path = p_path
        and (coalesce(p_device, '') = ''
             or (p_device = 'mobile' and device = 'mobile')
             or (p_device = 'desktop' and device in ('desktop', 'tablet')))
    )
    select jsonb_build_object(
      'total', (select count(*) from here),
      'points', coalesce((select jsonb_agg(jsonb_build_array(round(x::numeric, 4), y, dh, vw))
                          from (select x, y, dh, vw from here where x is not null and y is not null
                                order by at desc limit 5000) p), '[]'::jsonb),
      'targets', coalesce((select jsonb_agg(jsonb_build_object('k', target, 'n', n) order by n desc)
                           from (select target, count(*) as n from here where target is not null
                                 group by target order by count(*) desc limit 15) t), '[]'::jsonb),
      'pages', coalesce((select jsonb_agg(jsonb_build_object('k', path, 'n', n) order by n desc)
                         from (select path, count(*) as n from c group by path order by count(*) desc limit 30) q), '[]'::jsonb),
      'by_device', (select jsonb_build_object(
                      'mobile', count(*) filter (where device = 'mobile'),
                      'desktop', count(*) filter (where device in ('desktop', 'tablet')))
                    from c where path = p_path)
    )
  );
end $$;

-- ═══ who may call what ═════════════════════════════════════════════════════
revoke execute on function public.traffic_events(timestamptz, timestamptz, boolean) from public, anon, authenticated;

grant execute on function
  public.admin_traffic(timestamptz, timestamptz, boolean),
  public.admin_traffic_session(text),
  public.admin_traffic_clicks(text, text, timestamptz, timestamptz, boolean)
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
