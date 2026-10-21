-- Lot de départ multi-paquets (14 classiques + 1 premium + 1 légendaire).
-- Idempotent via la clé unique `starter` : les comptes déjà initialisés ne reçoivent rien de plus.

create or replace function atlas_private.grant_reward_packs(
  p_user_id uuid,
  p_grant_key text,
  p_source public.reward_source,
  p_reference_id uuid,
  p_pack_id uuid,
  p_quantity integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_inserted integer;
begin
  if p_quantity < 1 or p_quantity > 50 then
    raise exception 'INVALID_REWARD_QUANTITY' using errcode = 'P0001';
  end if;
  if not exists (select 1 from public.pack_definitions where id = p_pack_id and status = 'published') then
    raise exception 'PACK_UNAVAILABLE' using errcode = 'P0001';
  end if;

  insert into public.reward_grants (user_id, grant_key, source, reference_id, payload)
  values (
    p_user_id, p_grant_key, p_source, p_reference_id,
    jsonb_build_object('pack_id', p_pack_id, 'quantity', p_quantity)
  )
  on conflict (user_id, grant_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return 0;
  end if;

  insert into public.user_packs (user_id, pack_id, source, grant_key)
  select p_user_id, p_pack_id, p_source, p_grant_key
    from generate_series(1, p_quantity);

  return p_quantity;
end;
$$;

create or replace function atlas_private.initialize_player(p_user_id uuid, p_display_name text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_base text;
  v_name text;
  v_attempt integer := 0;
  v_starter jsonb;
  v_inserted integer;
  v_entry jsonb;
  v_pack_id uuid;
  v_quantity integer;
  v_packs jsonb;
begin
  if not exists (select 1 from public.profiles where id = p_user_id) then
    v_base := coalesce(atlas_private.sanitize_display_name(p_display_name), 'Explorateur');
    v_name := v_base;
    loop
      begin
        insert into public.profiles (id, display_name, public_code)
        values (p_user_id, v_name, atlas_private.generate_public_code());
        exit;
      exception when unique_violation then
        exit when exists (select 1 from public.profiles where id = p_user_id);
        v_attempt := v_attempt + 1;
        if v_attempt > 20 then
          raise exception 'PROFILE_CREATION_FAILED' using errcode = 'P0001';
        end if;
        v_name := left(v_base, 19) || '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
      end;
    end loop;
  end if;

  insert into public.player_wallets (user_id, pack_timer_anchor)
  values (p_user_id, now())
  on conflict (user_id) do nothing;

  select value into v_starter from public.economy_settings where key = 'starter_reward';
  if v_starter is null then
    return;
  end if;

  -- Compat : ancien format { pack_slug, quantity } → packs[].
  if jsonb_typeof(v_starter -> 'packs') = 'array' then
    v_packs := v_starter -> 'packs';
  elsif v_starter ? 'pack_slug' then
    v_packs := jsonb_build_array(v_starter);
  else
    return;
  end if;

  insert into public.reward_grants (user_id, grant_key, source, reference_id, payload)
  values (p_user_id, 'starter', 'starter', null, v_starter)
  on conflict (user_id, grant_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted = 0 then
    return;
  end if;

  for v_entry in select * from jsonb_array_elements(v_packs)
  loop
    v_quantity := coalesce((v_entry ->> 'quantity')::int, 0);
    if v_quantity < 1 then
      continue;
    end if;
    select id into v_pack_id
      from public.pack_definitions
     where slug = v_entry ->> 'pack_slug' and status = 'published';
    if v_pack_id is null then
      continue;
    end if;
    insert into public.user_packs (user_id, pack_id, source, grant_key)
    select p_user_id, v_pack_id, 'starter', 'starter'
      from generate_series(1, v_quantity);
  end loop;
end;
$$;

update public.economy_settings
   set value = '{
     "packs": [
       {"pack_slug":"classique","quantity":14},
       {"pack_slug":"premium","quantity":1},
       {"pack_slug":"legendaire","quantity":1}
     ]
   }'::jsonb,
       description = 'Paquets offerts à la création du compte : 14 classiques, 1 premium, 1 légendaire.'
 where key = 'starter_reward';
