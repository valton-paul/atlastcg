-- Atlas — tirage et ouverture des paquets, compensation des doublons, échange de fragments,
-- paquet quotidien. Le client ne fournit jamais que l'identifiant du paquet et une clé d'idempotence.

-- Tirage d'une rareté selon les probabilités de la configuration demandée.
create function atlas_private.pick_rarity(p_pack_id uuid, p_version integer)
returns public.card_rarity
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_roll numeric := random();
  v_acc numeric := 0;
  v_last public.card_rarity;
  r record;
begin
  for r in
    select dr.rarity, dr.probability
      from public.pack_drop_rates dr
      join public.rarities ra on ra.rarity = dr.rarity
     where dr.pack_id = p_pack_id and dr.configuration_version = p_version
     order by ra.rank
  loop
    v_acc := v_acc + r.probability;
    v_last := r.rarity;
    if v_roll < v_acc then
      return r.rarity;
    end if;
  end loop;

  if v_last is null then
    raise exception 'PACK_MISCONFIGURED' using errcode = 'P0001';
  end if;
  return v_last;
end;
$$;

-- Cartes éligibles pour un paquet (publiées et conformes aux filtres du paquet).
create function atlas_private.pack_pool(p_pack_id uuid)
returns table (pool_card_id uuid, pool_rarity public.card_rarity, pool_rank smallint)
language sql
stable
set search_path = ''
as $$
  select c.id, c.rarity, ra.rank
    from public.cards c
    join public.rarities ra on ra.rarity = c.rarity
    join public.pack_definitions p on p.id = p_pack_id
    left join public.countries co on co.iso_code = c.country_code
   where c.status = 'published'
     and (p.card_categories is null or c.category = any (p.card_categories))
     and (p.continent is null or co.continent = p.continent)
     and (
       p.collection_id is null
       or exists (
         select 1 from public.collection_cards cc
          where cc.collection_id = p.collection_id and cc.card_id = c.id
       )
     );
$$;

-- Tire `p_count` cartes. Si aucune carte n'existe dans la rareté tirée, la rareté la plus proche
-- (inférieure d'abord) est utilisée ; une même carte n'est répétée que si le lot est épuisé.
create function atlas_private.draw_pack_cards(p_pack_id uuid, p_version integer, p_count integer)
returns table (draw_slot integer, draw_card_id uuid, draw_rarity public.card_rarity)
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_target public.card_rarity;
  v_target_rank smallint;
  v_card uuid;
  v_rarity public.card_rarity;
  v_drawn uuid[] := '{}';
begin
  for i in 1..p_count loop
    v_target := atlas_private.pick_rarity(p_pack_id, p_version);
    select ra.rank into v_target_rank from public.rarities ra where ra.rarity = v_target;

    v_card := null;
    select p.pool_card_id, p.pool_rarity into v_card, v_rarity
      from atlas_private.pack_pool(p_pack_id) p
     order by abs(p.pool_rank - v_target_rank),
              (p.pool_rank > v_target_rank),
              (p.pool_card_id = any (v_drawn)),
              random()
     limit 1;

    if v_card is null then
      raise exception 'PACK_POOL_EMPTY' using errcode = 'P0001';
    end if;

    v_drawn := v_drawn || v_card;
    draw_slot := i;
    draw_card_id := v_card;
    draw_rarity := v_rarity;
    return next;
  end loop;
end;
$$;

create function atlas_private.credit_fragments(
  p_user_id uuid, p_amount integer, p_reason public.ledger_reason, p_reference_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  insert into public.player_wallets as w (user_id, fragments)
  values (p_user_id, p_amount)
  on conflict (user_id) do update set fragments = w.fragments + excluded.fragments
  returning fragments into v_balance;

  insert into public.resource_ledger (user_id, delta, balance_after, reason, reference_id)
  values (p_user_id, p_amount, v_balance, p_reason, p_reference_id);
  return v_balance;
end;
$$;

-- Ouverture atomique d'un paquet.
-- Garanties : un paquet n'est consommé qu'une fois ; une requête répétée (même clé ou même paquet)
-- renvoie le résultat déjà enregistré avec `replayed = true` sans nouvelle attribution.
create function public.open_pack(p_user_pack_id uuid, p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_existing record;
  v_pack record;
  v_def record;
  v_opening_id uuid := gen_random_uuid();
  v_draw record;
  v_card record;
  v_quantity integer;
  v_is_new boolean;
  v_fragments integer;
  v_total_fragments integer := 0;
  v_new_count integer := 0;
  v_duplicate_count integer := 0;
  v_rare_count integer := 0;
  v_cards jsonb := '[]'::jsonb;
  v_new_card_ids uuid[] := '{}';
  v_collections jsonb;
  v_balance integer;
  v_payload jsonb;
begin
  if p_user_pack_id is null or p_idempotency_key is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;

  select user_pack_id, result_payload into v_existing
    from public.pack_openings
   where user_id = v_uid and idempotency_key = p_idempotency_key;
  if found then
    if v_existing.user_pack_id <> p_user_pack_id then
      raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'P0001';
    end if;
    return v_existing.result_payload || jsonb_build_object('replayed', true);
  end if;

  -- Verrou : deux ouvertures concurrentes du même paquet sont sérialisées ici.
  select * into v_pack
    from public.user_packs
   where id = p_user_pack_id and user_id = v_uid
   for update;
  if not found then
    raise exception 'PACK_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_pack.status = 'opened' then
    select result_payload into v_payload from public.pack_openings where user_pack_id = p_user_pack_id;
    return v_payload || jsonb_build_object('replayed', true);
  end if;

  select * into v_def from public.pack_definitions where id = v_pack.pack_id;
  if v_def.status not in ('published', 'archived') then
    raise exception 'PACK_UNAVAILABLE' using errcode = 'P0001';
  end if;

  begin
    insert into public.pack_openings (
      id, user_id, user_pack_id, pack_id, idempotency_key, configuration_version, result_payload
    ) values (
      v_opening_id, v_uid, p_user_pack_id, v_def.id, p_idempotency_key, v_def.configuration_version,
      '{}'::jsonb
    );
  exception when unique_violation then
    -- Même clé utilisée simultanément pour un autre paquet.
    raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'P0001';
  end;

  for v_draw in
    select * from atlas_private.draw_pack_cards(v_def.id, v_def.configuration_version, v_def.cards_per_pack)
  loop
    insert into public.user_cards as uc (user_id, card_id, quantity)
    values (v_uid, v_draw.draw_card_id, 1)
    on conflict (user_id, card_id)
      do update set quantity = uc.quantity + 1, last_acquired_at = now()
    returning quantity into v_quantity;

    v_is_new := v_quantity = 1;
    if v_is_new then
      v_fragments := 0;
      v_new_count := v_new_count + 1;
      v_new_card_ids := v_new_card_ids || v_draw.draw_card_id;
    else
      select duplicate_fragments into v_fragments from public.rarities where rarity = v_draw.draw_rarity;
      v_duplicate_count := v_duplicate_count + 1;
    end if;
    v_total_fragments := v_total_fragments + v_fragments;

    select c.id, c.slug, c.title, c.subtitle, c.category, c.rarity, c.country_code,
           c.illustration_path, ra.rank
      into v_card
      from public.cards c
      join public.rarities ra on ra.rarity = c.rarity
     where c.id = v_draw.draw_card_id;

    if v_card.rank >= 3 then
      v_rare_count := v_rare_count + 1;
    end if;

    insert into public.pack_opening_cards (opening_id, slot, card_id, rarity, is_new, fragments_awarded)
    values (v_opening_id, v_draw.draw_slot, v_draw.draw_card_id, v_draw.draw_rarity, v_is_new, v_fragments);

    v_cards := v_cards || jsonb_build_array(jsonb_build_object(
      'slot', v_draw.draw_slot,
      'card_id', v_card.id,
      'slug', v_card.slug,
      'title', v_card.title,
      'subtitle', v_card.subtitle,
      'category', v_card.category,
      'rarity', v_card.rarity,
      'country_code', v_card.country_code,
      'illustration_path', v_card.illustration_path,
      'is_new', v_is_new,
      'quantity', v_quantity,
      'fragments_awarded', v_fragments
    ));
  end loop;

  if v_total_fragments > 0 then
    v_balance := atlas_private.credit_fragments(v_uid, v_total_fragments, 'duplicate_compensation', v_opening_id);
  else
    select fragments into v_balance from public.player_wallets where user_id = v_uid;
  end if;

  update public.user_packs set status = 'opened', opened_at = now() where id = p_user_pack_id;

  -- Collections ayant progressé grâce aux nouvelles cartes.
  select coalesce(jsonb_agg(x order by x ->> 'title'), '[]'::jsonb) into v_collections
    from (
      select jsonb_build_object(
        'slug', col.slug,
        'title', col.title,
        'owned', count(uc.card_id),
        'total', count(cc.card_id)
      ) as x
        from public.collections col
        join public.collection_cards cc on cc.collection_id = col.id
        join public.cards c on c.id = cc.card_id and c.status = 'published'
        left join public.user_cards uc on uc.card_id = cc.card_id and uc.user_id = v_uid
       where col.status = 'published'
         and exists (
           select 1 from public.collection_cards cc2
            where cc2.collection_id = col.id and cc2.card_id = any (v_new_card_ids)
         )
       group by col.id, col.slug, col.title
    ) s;

  v_payload := jsonb_build_object(
    'opening_id', v_opening_id,
    'user_pack_id', p_user_pack_id,
    'pack', jsonb_build_object('slug', v_def.slug, 'name', v_def.name),
    'configuration_version', v_def.configuration_version,
    'opened_at', now(),
    'cards', v_cards,
    'summary', jsonb_build_object(
      'new_count', v_new_count,
      'duplicate_count', v_duplicate_count,
      'rare_count', v_rare_count,
      'fragments_awarded', v_total_fragments,
      'fragments_balance', coalesce(v_balance, 0),
      'collections', v_collections
    ),
    'replayed', false
  );

  update public.pack_openings set result_payload = v_payload where id = v_opening_id;
  return v_payload;
end;
$$;

-- Échange de fragments contre un paquet. Idempotent par clé ; le solde ne devient jamais négatif.
create function public.exchange_fragments(p_idempotency_key uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_config jsonb := atlas_private.setting('fragment_exchange');
  v_cost integer := (v_config ->> 'cost')::int;
  v_pack_id uuid;
  v_balance integer;
  v_granted integer;
  v_key text;
begin
  if p_idempotency_key is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  v_key := 'exchange:' || p_idempotency_key::text;

  select id into v_pack_id
    from public.pack_definitions
   where slug = v_config ->> 'pack_slug' and status = 'published';
  if v_pack_id is null then
    raise exception 'PACK_UNAVAILABLE' using errcode = 'P0001';
  end if;

  -- Verrou du portefeuille : les échanges concurrents sont sérialisés.
  select fragments into v_balance from public.player_wallets where user_id = v_uid for update;
  if not found then
    raise exception 'INSUFFICIENT_FRAGMENTS' using errcode = 'P0001';
  end if;

  if exists (select 1 from public.reward_grants where user_id = v_uid and grant_key = v_key) then
    return jsonb_build_object('replayed', true, 'packs_granted', 0, 'fragments_balance', v_balance);
  end if;

  if v_balance < v_cost then
    raise exception 'INSUFFICIENT_FRAGMENTS' using errcode = 'P0001';
  end if;

  v_granted := atlas_private.grant_reward_packs(v_uid, v_key, 'fragment_exchange', null, v_pack_id, 1);

  update public.player_wallets set fragments = fragments - v_cost
   where user_id = v_uid
  returning fragments into v_balance;

  insert into public.resource_ledger (user_id, delta, balance_after, reason, reference_id)
  values (v_uid, -v_cost, v_balance, 'fragment_exchange', null);

  return jsonb_build_object('replayed', false, 'packs_granted', v_granted, 'fragments_balance', v_balance);
end;
$$;

-- Paquet quotidien facultatif : une fois par jour calendaire UTC (horloge serveur), sans série.
create function atlas_private.current_reward_day()
returns date
language sql
stable
set search_path = ''
as $$
  select (now() at time zone 'utc')::date;
$$;

create function public.get_daily_status()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_day date := atlas_private.current_reward_day();
begin
  return jsonb_build_object(
    'available', not exists (
      select 1 from public.reward_grants where user_id = v_uid and grant_key = 'daily:' || v_day::text
    ),
    'next_available_at', ((v_day + 1)::timestamp at time zone 'utc')
  );
end;
$$;

create function public.claim_daily_pack()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_day date := atlas_private.current_reward_day();
  v_config jsonb := atlas_private.setting('daily_reward');
  v_pack_id uuid;
  v_granted integer;
begin
  select id into v_pack_id
    from public.pack_definitions
   where slug = v_config ->> 'pack_slug' and status = 'published';
  if v_pack_id is null then
    raise exception 'PACK_UNAVAILABLE' using errcode = 'P0001';
  end if;

  v_granted := atlas_private.grant_reward_packs(
    v_uid, 'daily:' || v_day::text, 'daily', null, v_pack_id, (v_config ->> 'quantity')::int
  );

  return jsonb_build_object(
    'granted', v_granted > 0,
    'packs_granted', v_granted,
    'next_available_at', ((v_day + 1)::timestamp at time zone 'utc')
  );
end;
$$;

revoke all on function public.open_pack(uuid, uuid) from public, anon;
revoke all on function public.exchange_fragments(uuid) from public, anon;
revoke all on function public.get_daily_status() from public, anon;
revoke all on function public.claim_daily_pack() from public, anon;
grant execute on function public.open_pack(uuid, uuid) to authenticated;
grant execute on function public.exchange_fragments(uuid) to authenticated;
grant execute on function public.get_daily_status() to authenticated;
grant execute on function public.claim_daily_pack() to authenticated;
