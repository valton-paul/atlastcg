-- Atlas — paquets régénérés dans le temps (remplace le paquet quotidien).
-- Un paquet est attribué à chaque intervalle écoulé tant que la réserve de paquets disponibles est
-- sous le plafond. Réserve pleine : le minuteur est suspendu et repart lorsqu'un paquet est ouvert.
-- Les autres récompenses (expéditions, objectifs, échanges) ne sont pas plafonnées.

alter type public.reward_source add value if not exists 'timer';

alter table public.player_wallets add column pack_timer_anchor timestamptz;
comment on column public.player_wallets.pack_timer_anchor is
  'Point de départ de l''intervalle en cours. Null tant que le minuteur n''a jamais été synchronisé.';

insert into public.economy_settings (key, value, description)
values (
  'timed_packs',
  '{"pack_slug": "exploration", "interval_seconds": 600, "max_stored": 15}',
  'Paquets régénérés : un paquet par intervalle, tant que la réserve est sous le plafond.'
)
on conflict (key) do nothing;

delete from public.economy_settings where key = 'daily_reward';

drop function public.claim_daily_pack();
drop function public.get_daily_status();
drop function atlas_private.current_reward_day();

-- Lit et valide la configuration du minuteur.
create function atlas_private.timed_packs_config(
  out pack_id uuid,
  out interval_seconds integer,
  out max_stored integer
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_config jsonb := atlas_private.setting('timed_packs');
begin
  interval_seconds := (v_config ->> 'interval_seconds')::integer;
  max_stored := (v_config ->> 'max_stored')::integer;
  if interval_seconds is null or interval_seconds < 60 or max_stored is null or max_stored < 1 then
    raise exception 'SETTING_MISSING' using errcode = 'P0001', detail = 'timed_packs';
  end if;
  select d.id into pack_id
    from public.pack_definitions d
   where d.slug = v_config ->> 'pack_slug' and d.status = 'published';
  if pack_id is null then
    raise exception 'SETTING_MISSING' using errcode = 'P0001', detail = 'timed_packs.pack_slug';
  end if;
end;
$$;

-- Attribue les paquets échus et renvoie l'état du minuteur. Seule l'horloge du serveur fait foi.
create function public.sync_timed_packs()
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

  -- Le verrou sur le portefeuille sérialise les synchronisations concurrentes d'un même joueur.
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
    for i in 1 .. least(v_due, v_config.max_stored - v_available) loop
      v_slot := v_anchor + v_interval * i;
      v_granted := v_granted + atlas_private.grant_reward_packs(
        v_uid, 'timer:' || floor(extract(epoch from v_slot))::bigint, 'timer', null, v_config.pack_id, 1
      );
    end loop;
    v_available := v_available + v_granted;
    v_anchor := case
      when v_available >= v_config.max_stored then now()
      else v_anchor + v_interval * v_due
    end;
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

revoke all on function public.sync_timed_packs() from public, anon;
grant execute on function public.sync_timed_packs() to authenticated;
revoke all on function atlas_private.timed_packs_config() from public, anon, authenticated;

-- Ouvrir un paquet alors que la réserve était pleine relance le minuteur à partir de maintenant :
-- le temps passé réserve pleine ne produit pas de paquet.
create function atlas_private.restart_pack_timer_when_full()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_max integer;
  v_available integer;
begin
  select (value ->> 'max_stored')::integer into v_max from public.economy_settings where key = 'timed_packs';
  if v_max is null then
    return null;
  end if;
  select count(*) into v_available
    from public.user_packs
   where user_id = new.user_id and status = 'available';
  if v_available + 1 >= v_max then
    update public.player_wallets set pack_timer_anchor = now() where user_id = new.user_id;
  end if;
  return null;
end;
$$;

revoke all on function atlas_private.restart_pack_timer_when_full() from public, anon, authenticated;

create trigger user_packs_restart_timer
  after update of status on public.user_packs
  for each row
  when (old.status = 'available' and new.status = 'opened')
  execute function atlas_private.restart_pack_timer_when_full();
