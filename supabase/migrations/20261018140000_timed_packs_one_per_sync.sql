-- Atlas — un seul paquet minuteur par synchronisation.
-- Évite qu’un retour après une absence (ou une longue session) déverse d’un coup
-- une pile de paquets (ex. 2 starters + 8 intervalles = 10 paquets).

create or replace function public.sync_timed_packs()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_config record;
  v_interval interval;
  v_anchor timestamptz;
  v_available integer;
  v_due integer;
  v_granted integer := 0;
  v_slot timestamptz;
begin
  select * into v_config from atlas_private.timed_packs_config();
  v_interval := make_interval(secs => v_config.interval_seconds);

  select pack_timer_anchor into v_anchor
    from public.player_wallets
   where user_id = v_uid
   for update;
  if not found then
    raise exception 'PLAYER_NOT_INITIALIZED' using errcode = 'P0001';
  end if;

  select count(*) into v_available
    from public.user_packs
   where user_id = v_uid and status = 'available';

  if v_anchor is null or v_available >= v_config.max_stored then
    v_anchor := now();
  else
    v_due := floor(extract(epoch from now() - v_anchor) / v_config.interval_seconds)::integer;
    if v_due >= 1 then
      -- Un seul paquet par appel : le temps « en avance » est consommé, pas thésaurisé.
      v_slot := v_anchor + v_interval;
      v_granted := atlas_private.grant_reward_packs(
        v_uid,
        'timer:' || floor(extract(epoch from v_slot))::bigint || ':' || (v_available + 1)::text,
        'timer',
        null,
        v_config.pack_id,
        1
      );
      v_available := v_available + v_granted;
      v_anchor := now();
    end if;
  end if;

  update public.player_wallets set pack_timer_anchor = v_anchor where user_id = v_uid;

  return jsonb_build_object(
    'available', v_available,
    'max_stored', v_config.max_stored,
    'interval_seconds', v_config.interval_seconds,
    'granted', v_granted,
    'next_at', case when v_available >= v_config.max_stored then null else v_anchor + v_interval end,
    'server_time', now()
  );
end;
$$;

-- Démarre le minuteur dès l’inscription, pour ne pas dépendre du premier sync client.
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
