-- Rattrapage hors ligne : tous les intervalles écoulés sont accordés en une sync
-- (paquets minuteur + charges d’expédition), plafonnés à max_stored.

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
  v_to_grant integer;
  v_granted integer := 0;
  v_slot timestamptz;
  v_i integer;
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
    v_to_grant := least(greatest(v_due, 0), v_config.max_stored - v_available);
    for v_i in 1 .. v_to_grant loop
      v_slot := v_anchor + v_interval * v_i;
      v_granted := v_granted + atlas_private.grant_reward_packs(
        v_uid,
        'timer:' || floor(extract(epoch from v_slot))::bigint || ':' || (v_available + v_i)::text,
        'timer',
        null,
        v_config.pack_id,
        1
      );
    end loop;
    v_available := v_available + v_granted;
    v_anchor := case
      when v_available >= v_config.max_stored then now()
      when v_granted > 0 then v_anchor + v_interval * v_granted
      else v_anchor
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

create or replace function atlas_private.sync_expedition_charges(p_user_id uuid)
returns table (charges integer, max_stored integer, next_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_interval interval;
  v_max integer;
  v_interval_secs integer;
  v_charges integer;
  v_anchor timestamptz;
  v_due integer;
  v_add integer;
begin
  select c.interval_seconds, c.max_stored into v_interval_secs, v_max
    from atlas_private.expedition_charges_config() c;
  v_interval := make_interval(secs => v_interval_secs);

  select w.expedition_charges, w.expedition_charge_anchor
    into v_charges, v_anchor
    from public.player_wallets w
   where w.user_id = p_user_id
   for update;

  if not found then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;

  if v_charges >= v_max then
    v_anchor := null;
  elsif v_anchor is not null then
    v_due := floor(extract(epoch from now() - v_anchor) / v_interval_secs)::integer;
    v_add := least(greatest(v_due, 0), v_max - v_charges);
    if v_add > 0 then
      v_charges := v_charges + v_add;
      if v_charges >= v_max then
        v_charges := v_max;
        v_anchor := null;
      else
        v_anchor := v_anchor + v_interval * v_add;
      end if;
    end if;
  elsif v_anchor is null and v_charges < v_max then
    v_anchor := now();
  end if;

  update public.player_wallets
     set expedition_charges = v_charges,
         expedition_charge_anchor = v_anchor
   where user_id = p_user_id;

  charges := v_charges;
  max_stored := v_max;
  next_at := case when v_charges >= v_max then null else v_anchor + v_interval end;
  return next;
end;
$$;

revoke all on function atlas_private.sync_expedition_charges(uuid) from public, anon, authenticated;
