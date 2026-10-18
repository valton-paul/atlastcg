-- Clé d'idempotence minuteur : inclut le solde pour éviter les collisions quand
-- plusieurs syncs tombent dans la même seconde (tests ou horloge).

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
