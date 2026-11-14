-- ═══ the customer chooses the gift (13 Nov 2026) ═══════════════════════════════════════════════════
-- Laid after schema.sql and the files after it (scripts/db.mjs AFTER, localbase/server.mjs FILES).
--
-- A tampon shop may offer several gifts for a full card, and the customer takes the one they like. Off by default:
-- a shop's gift is one thing until its owner lists more (/shop/choices). The options are written in the card's one
-- gift text, «قهوة · كرواسون · عصير» — the text the app already shows everywhere (the card's promise, the counter,
-- the poster, the reminders), so nothing else has to learn about it. A full card writes its voucher with that text
-- (bank(), unchanged); the customer picks one on their phone (choose_gift) — or at the counter, with the owner, when
-- it is handed over — and the voucher becomes that one gift. Only the gift's own options can be picked.

-- a gift's options: its parts when it is a choice, null when it is one thing
create or replace function public.gift_options(p_gift text) returns text[]
language sql immutable set search_path = '' as $$
  select case when position(' · ' in coalesce(p_gift, '')) > 0
    then array(select btrim(x) from unnest(string_to_array(p_gift, ' · ')) with ordinality as u(x, o) where btrim(x) <> '' order by o)
  end
$$;

-- the owner lists the options (2 to 4), or takes them away (null: the first option alone becomes the gift).
-- Turned on, the customers on their way take the choice too (it only gives them more); turned off, a customer on
-- their way keeps the promise they started with
create or replace function public.set_gift_choices(p_options text[]) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare s public.shops%rowtype; v_clean text[] := '{}'; x text; v_gift text;
begin
  s := public.my_shop();
  if s.id is null then return public.err('no_shop'); end if;
  if s.goal is null then return public.err('no_card'); end if;
  if s.store_on then return public.err('store'); end if;
  if s.wheel_on then return public.err('wheel'); end if;
  if p_options is null then
    v_gift := coalesce((public.gift_options(s.gift))[1], s.gift);
    return public.card_apply(s.id, s.goal, v_gift, s.color, null, false) || jsonb_build_object('gift', v_gift);
  end if;
  foreach x in array p_options loop
    x := btrim(regexp_replace(coalesce(x, ''), '[·[:cntrl:]]+', ' ', 'g'));
    if char_length(x) not between 2 and 20 then return public.err('invalid'); end if;
    if not (x = any (v_clean)) then v_clean := v_clean || x; end if;
  end loop;
  if coalesce(array_length(v_clean, 1), 0) not between 2 and 4 then return public.err('count'); end if;
  v_gift := array_to_string(v_clean, ' · ');
  if char_length(v_gift) > 60 then return public.err('too_long'); end if;
  return public.card_apply(s.id, s.goal, v_gift, s.color, null, true) || jsonb_build_object('gift', v_gift);
end $$;

-- a voucher's choice made: one of its own options becomes its gift — by the customer it is for, or at the counter
-- by the shop's owner handing it over
create or replace function public.choose_gift(p_moment bigint, p_option text) returns jsonb
language plpgsql security definer set search_path = '' as $$
declare v_uid uuid := auth.uid(); m public.moments%rowtype; c public.cards%rowtype; v_opts text[]; v_pick text := btrim(coalesce(p_option, ''));
begin
  if v_uid is null then return public.err('not_signed_in'); end if;
  select * into m from public.moments where id = p_moment and kind = 'gift' and given_at is null for update;
  if m.id is null then return public.err('not_found'); end if;
  select * into c from public.cards where id = m.card_id;
  if not (c.user_id = v_uid or exists (select 1 from public.shops s where s.id = m.shop_id and s.owner_id = v_uid)) then
    return public.err('not_found');
  end if;
  v_opts := public.gift_options(m.gift);
  if v_opts is null then return public.err('no_choice'); end if;
  if not (v_pick = any (v_opts)) then return public.err('invalid'); end if;
  update public.moments set gift = v_pick where id = m.id;
  return jsonb_build_object('ok', true, 'gift', v_pick);
end $$;

-- what a customer's card has to choose from: its vouchers that are a choice, each with its options
create or replace function public.card_choices(p_card uuid) returns jsonb
language sql stable security definer set search_path = '' as $$
  select coalesce(jsonb_agg(jsonb_build_object('moment', m.id, 'options', to_jsonb(public.gift_options(m.gift))) order by m.id), '[]'::jsonb)
  from public.moments m join public.cards c on c.id = m.card_id
  where m.card_id = p_card and c.user_id = auth.uid() and m.kind = 'gift' and m.given_at is null
    and not (m.wheel and m.spun_at is null) and public.gift_options(m.gift) is not null
$$;

revoke all on function public.set_gift_choices(text[]), public.choose_gift(bigint, text), public.card_choices(uuid) from public, anon;
grant execute on function public.set_gift_choices(text[]), public.choose_gift(bigint, text), public.card_choices(uuid), public.gift_options(text) to authenticated;
