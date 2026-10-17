-- Atlas — initialisation des joueurs, attribution des récompenses, profil, suppression de compte.

create function atlas_private.generate_public_code()
returns text
language plpgsql
volatile
set search_path = ''
as $$
declare
  v_alphabet constant text := 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
  v_code text := '';
begin
  for i in 1..8 loop
    v_code := v_code || substr(v_alphabet, 1 + floor(random() * length(v_alphabet))::int, 1);
  end loop;
  return v_code;
end;
$$;

create function atlas_private.sanitize_display_name(p_raw text)
returns text
language sql
immutable
set search_path = ''
as $$
  select case when v ~ '^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]{3,24}$' then v end
    from (select btrim(regexp_replace(coalesce(p_raw, ''), '\s+', ' ', 'g')) as v) s;
$$;

-- Attribue `p_quantity` paquets une seule fois pour la clé donnée. Renvoie le nombre de paquets
-- réellement créés (0 si la récompense avait déjà été attribuée).
create function atlas_private.grant_reward_packs(
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
  if p_quantity < 1 or p_quantity > 10 then
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

-- Initialisation unique d'un joueur : profil, portefeuille, paquets de départ. Rejouable sans effet.
create function atlas_private.initialize_player(p_user_id uuid, p_display_name text)
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
  v_pack_id uuid;
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
        -- Initialisation concurrente déjà terminée, ou pseudo / code déjà pris.
        exit when exists (select 1 from public.profiles where id = p_user_id);
        v_attempt := v_attempt + 1;
        if v_attempt > 20 then
          raise exception 'PROFILE_CREATION_FAILED' using errcode = 'P0001';
        end if;
        v_name := left(v_base, 19) || '-' || lpad(floor(random() * 10000)::int::text, 4, '0');
      end;
    end loop;
  end if;

  insert into public.player_wallets (user_id) values (p_user_id) on conflict (user_id) do nothing;

  -- Sans catalogue publié (base vierge), l'inscription réussit et les paquets seront attribués
  -- au prochain appel de `ensure_player_initialized`.
  select value into v_starter from public.economy_settings where key = 'starter_reward';
  if v_starter is not null then
    select id into v_pack_id
      from public.pack_definitions
     where slug = v_starter ->> 'pack_slug' and status = 'published';
    if v_pack_id is not null then
      perform atlas_private.grant_reward_packs(
        p_user_id, 'starter', 'starter', null, v_pack_id, (v_starter ->> 'quantity')::int
      );
    end if;
  end if;
end;
$$;

create function atlas_private.handle_new_auth_user()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  perform atlas_private.initialize_player(new.id, new.raw_user_meta_data ->> 'display_name');
  return new;
end;
$$;

create trigger on_auth_user_created
  after insert on auth.users
  for each row execute function atlas_private.handle_new_auth_user();

-- RPC ------------------------------------------------------------------------------

-- Appelée à chaque ouverture de session : répare une initialisation interrompue, sans doublon.
create function public.ensure_player_initialized()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_meta jsonb;
  v_profile jsonb;
begin
  select raw_user_meta_data into v_meta from auth.users where id = v_uid;
  if not found then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  perform atlas_private.initialize_player(v_uid, v_meta ->> 'display_name');
  select to_jsonb(p) into v_profile from public.profiles p where p.id = v_uid;
  return v_profile;
end;
$$;

create function public.complete_onboarding()
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
begin
  update public.profiles
     set onboarding_completed_at = coalesce(onboarding_completed_at, now())
   where id = v_uid;
end;
$$;

-- Marque des cartes comme consultées (retire le badge « Nouvelle »).
create function public.mark_cards_seen(p_card_ids uuid[])
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_count integer;
begin
  if p_card_ids is null or cardinality(p_card_ids) = 0 then
    return 0;
  end if;
  if cardinality(p_card_ids) > 200 then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  update public.user_cards
     set seen_at = now()
   where user_id = v_uid and card_id = any (p_card_ids) and seen_at is null;
  get diagnostics v_count = row_count;
  return v_count;
end;
$$;

-- Suppression définitive du compte : la cascade supprime toutes les données du joueur.
create function public.delete_my_account(p_confirmation text)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
begin
  if p_confirmation is distinct from 'SUPPRIMER' then
    raise exception 'CONFIRMATION_REQUIRED' using errcode = 'P0001';
  end if;
  delete from auth.users where id = v_uid;
end;
$$;

revoke all on function public.ensure_player_initialized() from public, anon;
revoke all on function public.complete_onboarding() from public, anon;
revoke all on function public.mark_cards_seen(uuid[]) from public, anon;
revoke all on function public.delete_my_account(text) from public, anon;
grant execute on function public.ensure_player_initialized() to authenticated;
grant execute on function public.complete_onboarding() to authenticated;
grant execute on function public.mark_cards_seen(uuid[]) to authenticated;
grant execute on function public.delete_my_account(text) to authenticated;
