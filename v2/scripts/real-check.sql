begin;
do $t$
declare
  s record; c record; r jsonb;
  v_shops int := 0; v_paid int := 0; v_shop_bad int := 0; v_paid_bad int := 0;
  v_cards int := 0; v_paid_cards int := 0; v_card_bad int := 0; v_people int := 0; v_wallet_bad int := 0;
  v_bad_examples jsonb := '[]';
begin
  -- every real shop (never a robot's, the founder's own or a test), as its owner signed in
  for s in select x.id, x.owner_id, x.name, (x.paid_until is not null and x.paid_until > now()) as paid
           from public.shops x left join public.people p on p.id = x.owner_id
           where not public.is_robot(x.owner_id) and not coalesce(p.is_admin or p.is_tester, false) loop
    perform set_config('request.jwt.claims', json_build_object('sub', s.owner_id, 'role', 'authenticated')::text, true);
    r := public.my_systems();
    v_shops := v_shops + 1;
    if s.paid then v_paid := v_paid + 1; end if;
    -- what the new screens need to look exactly as today: the link on, the golden ticket off, nothing waiting
    if not (r ->> 'links' = 'true' and r ->> 'draw' = 'false' and r -> 'draw_open' = 'null'::jsonb and (r ->> 'wins')::int = 0) then
      v_shop_bad := v_shop_bad + 1;
      if s.paid then v_paid_bad := v_paid_bad + 1; end if;
      v_bad_examples := v_bad_examples || jsonb_build_object('shop', s.name, 'got', r);
    end if;
  end loop;
  -- every card of a real customer at a real shop, as that customer signed in: no golden ticket on it
  for c in select k.id, k.user_id, (sh.paid_until is not null and sh.paid_until > now()) as paid
           from public.cards k join public.shops sh on sh.id = k.shop_id
           left join public.people po on po.id = sh.owner_id
           left join public.people pc on pc.id = k.user_id
           where not public.is_robot(sh.owner_id) and not coalesce(po.is_admin or po.is_tester, false)
             and not public.is_robot(k.user_id) and not coalesce(pc.is_admin or pc.is_tester, false) loop
    perform set_config('request.jwt.claims', json_build_object('sub', c.user_id, 'role', 'authenticated')::text, true);
    v_cards := v_cards + 1;
    if c.paid then v_paid_cards := v_paid_cards + 1; end if;
    if public.card_draw(c.id) is not null then v_card_bad := v_card_bad + 1; end if;
  end loop;
  -- every real customer's wallet: no golden line on any card
  for c in select distinct k.user_id from public.cards k left join public.people pc on pc.id = k.user_id
           where not public.is_robot(k.user_id) and not coalesce(pc.is_admin or pc.is_tester, false) loop
    perform set_config('request.jwt.claims', json_build_object('sub', c.user_id, 'role', 'authenticated')::text, true);
    v_people := v_people + 1;
    if public.my_draws() <> '[]'::jsonb then v_wallet_bad := v_wallet_bad + 1; end if;
  end loop;
  raise exception 'RESULT %', jsonb_build_object(
    'real_shops', v_shops, 'paid_shops', v_paid, 'shops_not_as_today', v_shop_bad, 'paid_shops_not_as_today', v_paid_bad,
    'real_cards', v_cards, 'cards_at_paid_shops', v_paid_cards, 'cards_with_anything_new', v_card_bad,
    'real_customers', v_people, 'wallets_with_anything_new', v_wallet_bad, 'examples', v_bad_examples,
    'draws_anywhere', (select count(*) from public.draws), 'shops_with_link_off', (select count(*) from public.shops where not links_allowed),
    'shops_with_golden_on', (select count(*) from public.shops where draw_allowed));
end $t$;
