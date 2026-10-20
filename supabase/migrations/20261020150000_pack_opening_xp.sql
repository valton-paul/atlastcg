-- Atlas — XP d’exploration à l’ouverture : nouvelle carte et doublon détruit, selon la rareté.

alter table public.rarities
  add column if not exists new_card_xp integer not null default 0 check (new_card_xp >= 0),
  add column if not exists duplicate_xp integer not null default 0 check (duplicate_xp >= 0);

comment on column public.rarities.new_card_xp is
  'XP d’exploration accordée quand le joueur obtient cette rareté pour la première fois.';
comment on column public.rarities.duplicate_xp is
  'XP d’exploration accordée quand un doublon de cette rareté est détruit (converti en fragments).';

update public.rarities set new_card_xp = 5, duplicate_xp = 2 where rarity = 'common';
update public.rarities set new_card_xp = 10, duplicate_xp = 4 where rarity = 'uncommon';
update public.rarities set new_card_xp = 20, duplicate_xp = 8 where rarity = 'rare';
update public.rarities set new_card_xp = 40, duplicate_xp = 15 where rarity = 'epic';
update public.rarities set new_card_xp = 80, duplicate_xp = 30 where rarity = 'legendary';
update public.rarities set new_card_xp = 150, duplicate_xp = 60 where rarity = 'mythic';

alter table public.pack_opening_cards
  add column if not exists xp_awarded integer not null default 0 check (xp_awarded >= 0);

comment on column public.profiles.exploration_xp is
  'XP d’exploration globale (expéditions, nouvelles cartes, doublons détruits).';

create or replace function public.open_pack(p_user_pack_id uuid, p_idempotency_key uuid)
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
  v_rarity record;
  v_is_new boolean;
  v_fragments integer;
  v_xp integer;
  v_total_fragments integer := 0;
  v_total_xp integer := 0;
  v_new_count integer := 0;
  v_duplicate_count integer := 0;
  v_rare_count integer := 0;
  v_cards jsonb := '[]'::jsonb;
  v_new_card_ids uuid[] := '{}';
  v_collections jsonb;
  v_balance integer;
  v_exploration_xp integer;
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
    raise exception 'IDEMPOTENCY_KEY_REUSED' using errcode = 'P0001';
  end;

  for v_draw in
    select * from atlas_private.draw_pack_cards(v_def.id, v_def.configuration_version, v_def.cards_per_pack)
  loop
    insert into public.user_cards (user_id, card_id, quantity)
    values (v_uid, v_draw.draw_card_id, 1)
    on conflict (user_id, card_id) do nothing;
    v_is_new := found;

    select duplicate_fragments, new_card_xp, duplicate_xp, rank
      into v_rarity
      from public.rarities
     where rarity = v_draw.draw_rarity;

    if v_is_new then
      v_fragments := 0;
      v_xp := coalesce(v_rarity.new_card_xp, 0);
      v_new_count := v_new_count + 1;
      v_new_card_ids := v_new_card_ids || v_draw.draw_card_id;
    else
      update public.user_cards set last_acquired_at = now()
       where user_id = v_uid and card_id = v_draw.draw_card_id;
      v_fragments := coalesce(v_rarity.duplicate_fragments, 0);
      v_xp := coalesce(v_rarity.duplicate_xp, 0);
      v_duplicate_count := v_duplicate_count + 1;
    end if;
    v_total_fragments := v_total_fragments + v_fragments;
    v_total_xp := v_total_xp + v_xp;

    select c.id, c.slug, c.title, c.subtitle, c.category, c.rarity, c.country_code,
           c.illustration_path, v_rarity.rank as rank
      into v_card
      from public.cards c
     where c.id = v_draw.draw_card_id;

    if v_card.rank >= 3 then
      v_rare_count := v_rare_count + 1;
    end if;

    insert into public.pack_opening_cards (
      opening_id, slot, card_id, rarity, is_new, fragments_awarded, xp_awarded
    ) values (
      v_opening_id, v_draw.draw_slot, v_draw.draw_card_id, v_draw.draw_rarity, v_is_new, v_fragments, v_xp
    );

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
      'quantity', 1,
      'fragments_awarded', v_fragments,
      'xp_awarded', v_xp
    ));
  end loop;

  if v_total_fragments > 0 then
    v_balance := atlas_private.credit_fragments(v_uid, v_total_fragments, 'duplicate_compensation', v_opening_id);
  else
    select fragments into v_balance from public.player_wallets where user_id = v_uid;
  end if;

  if v_total_xp > 0 then
    v_exploration_xp := atlas_private.grant_exploration_xp(v_uid, v_total_xp);
  else
    select exploration_xp into v_exploration_xp from public.profiles where id = v_uid;
  end if;

  update public.user_packs set status = 'opened', opened_at = now() where id = p_user_pack_id;

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
      'xp_awarded', v_total_xp,
      'exploration_xp', coalesce(v_exploration_xp, 0),
      'collections', v_collections
    ),
    'replayed', false
  );

  update public.pack_openings set result_payload = v_payload where id = v_opening_id;
  return v_payload;
end;
$$;
