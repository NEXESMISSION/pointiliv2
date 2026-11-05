-- «تحميل البيانات» (2026-11-05): an owner downloads their customers, once the founder allows the shop.
-- Apply once in the Supabase SQL Editor (scripts/db.mjs needs SUPABASE_ACCESS_TOKEN, not set yet).
-- The same as its block in schema.sql, plus the grants that file's whole-schema revoke/grant would give.
begin;

-- ═══ «تحميل البيانات»: an owner downloads their customers (5 Nov 2026) ═══════
-- A file of the shop's customers, for an owner the founder allows it: export_allowed, the console's
-- switch, OFF for every shop — the founder turns it on, shop by shop, by hand. It is one of the
-- switches scripts/db.mjs keeps: no re-run of this file ever turns it on or off. The numbers come
-- masked, as in the owner's own list (shop_customers): the file is that list, nothing more.
alter table public.shops add column if not exists export_allowed boolean not null default false;

create or replace function public.admin_set_export(p_id uuid, p_on boolean) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  perform public.require_admin();
  update public.shops set export_allowed = coalesce(p_on, false) where id = p_id;
  if not found then return public.err('not_found'); end if;
  return jsonb_build_object('ok', true);
end $$;

create or replace function public.admin_export_allowed(p_id uuid) returns boolean
language plpgsql stable security definer set search_path = '' as $$
begin
  perform public.require_admin();
  return coalesce((select export_allowed from public.shops where id = p_id), false);
end $$;

-- the owner's side: may this shop download its customers? (its line in «المحل» shows only then)
create or replace function public.my_export_allowed() returns boolean
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  return coalesce(s.export_allowed, false);
end $$;

create or replace function public.my_export() returns jsonb
language plpgsql stable security definer set search_path = '' as $$
declare s public.shops%rowtype;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if not coalesce(s.export_allowed, false) then return public.err('not_allowed'); end if;
  return jsonb_build_object('ok', true, 'shop', s.name, 'rows', coalesce((
    select jsonb_agg(jsonb_build_object(
             'name', nullif(p.name, ''), 'phone', public.masked(p.phone), 'stamps', c.stamps,
             'total', (select count(*) from public.moments m where m.card_id = c.id and m.kind = 'stamp'),
             'given', (select count(*) from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is not null),
             'waiting', (select count(*) from public.moments m where m.card_id = c.id and m.kind = 'gift' and m.given_at is null),
             'since', c.created_at, 'last_at', c.last_at)
           order by c.last_at desc nulls last, c.created_at desc)
    from public.cards c left join public.people p on p.id = c.user_id
    where c.shop_id = s.id), '[]'::jsonb));
end $$;

revoke execute on function public.admin_set_export(uuid, boolean), public.admin_export_allowed(uuid), public.my_export_allowed(), public.my_export() from public, anon;
grant execute on function public.admin_set_export(uuid, boolean), public.admin_export_allowed(uuid), public.my_export_allowed(), public.my_export() to authenticated, service_role;
commit;
notify pgrst, 'reload schema';
