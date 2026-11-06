-- The owners told what is new, once, on their home (6 Nov 2026): see() accepts the note «new_insights»
-- (components/NewTip). Built from v2/supabase/schema.sql.
begin;

create or replace function public.see(p_key text) returns jsonb
language plpgsql security definer set search_path = '' as $$
begin
  if auth.uid() is null then return public.err('not_signed_in'); end if;
  if p_key is null or p_key not in ('coach', 'logo_tip', 'card_hello', 'offer', 'push', 'install', 'fix_tip', 'first_scan', 'first_gift', 'mission', 'links_tip', 'reset_tip', 'new_insights') then return public.err('invalid'); end if;
  update public.people set seen = array_append(seen, p_key) where id = auth.uid() and not (p_key = any (seen));
  return jsonb_build_object('ok', true);
end $$;

commit;
notify pgrst, 'reload schema';
