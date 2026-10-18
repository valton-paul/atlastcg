-- Expéditions : réserve régénérée (1 charge / 30 min, plafond 10) à la place du plafond journalier.

alter table public.player_wallets
  add column if not exists expedition_charges integer not null default 10
    check (expedition_charges >= 0);

alter table public.player_wallets
  add column if not exists expedition_charge_anchor timestamptz;

comment on column public.player_wallets.expedition_charges is
  'Charges d’expédition disponibles (tirage ou démarrage).';
comment on column public.player_wallets.expedition_charge_anchor is
  'Prochaine régénération ; null quand la réserve est pleine.';

insert into public.economy_settings (key, value, description)
values (
  'expedition_charges',
  '{"interval_seconds": 1800, "max_stored": 10}'::jsonb,
  'Réserve d’expéditions : +1 toutes les 30 min, jusqu’à 10. Une charge est consommée au démarrage (tirage ou fiche pays).'
)
on conflict (key) do update
  set value = excluded.value,
      description = excluded.description;

create or replace function atlas_private.expedition_charges_config(
  out interval_seconds integer,
  out max_stored integer
)
language plpgsql
stable
set search_path = ''
as $$
declare
  v_config jsonb := atlas_private.setting('expedition_charges');
begin
  interval_seconds := (v_config ->> 'interval_seconds')::integer;
  max_stored := (v_config ->> 'max_stored')::integer;
  if interval_seconds is null or interval_seconds < 60 or max_stored is null or max_stored < 1 then
    raise exception 'SETTING_MISSING' using errcode = 'P0001', detail = 'expedition_charges';
  end if;
end;
$$;

revoke all on function atlas_private.expedition_charges_config() from public, anon, authenticated;

/** Accorde au plus une charge échue, puis renvoie l’état de la réserve. */
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
  elsif v_anchor is not null and now() >= v_anchor + v_interval then
    v_charges := v_charges + 1;
    if v_charges >= v_max then
      v_charges := v_max;
      v_anchor := null;
    else
      v_anchor := v_anchor + v_interval;
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

create or replace function atlas_private.consume_expedition_charge(p_user_id uuid)
returns table (charges integer, max_stored integer, next_at timestamptz)
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_state record;
  v_interval_secs integer;
begin
  select * into v_state from atlas_private.sync_expedition_charges(p_user_id);
  if v_state.charges < 1 then
    raise exception 'EXPEDITION_NO_CHARGE' using errcode = 'P0001';
  end if;

  select c.interval_seconds into v_interval_secs from atlas_private.expedition_charges_config() c;

  update public.player_wallets
     set expedition_charges = expedition_charges - 1,
         expedition_charge_anchor = coalesce(expedition_charge_anchor, now())
   where user_id = p_user_id;

  return query select * from atlas_private.sync_expedition_charges(p_user_id);
end;
$$;

revoke all on function atlas_private.consume_expedition_charge(uuid) from public, anon, authenticated;

create or replace function public.sync_expedition_charges()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_state record;
begin
  select * into v_state from atlas_private.sync_expedition_charges(v_uid);
  return jsonb_build_object(
    'charges', v_state.charges,
    'max_stored', v_state.max_stored,
    'next_at', v_state.next_at,
    'server_time', now()
  );
end;
$$;

revoke all on function public.sync_expedition_charges() from public, anon;
grant execute on function public.sync_expedition_charges() to authenticated;

create or replace function public.draw_expedition()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_pending record;
  v_pick record;
  v_draw_id uuid;
  v_expedition record;
  v_charges record;
begin
  select * into v_charges from atlas_private.sync_expedition_charges(v_uid);

  select d.id, d.expedition_id, d.country_code, d.iso_numeric, d.status
    into v_pending
    from public.expedition_draws d
   where d.user_id = v_uid and d.status = 'pending_reveal'
   order by d.created_at desc
   limit 1
   for update skip locked;

  if found then
    select e.id, e.slug, e.title, e.summary, e.country_code, e.reward_pack_id, e.reward_pack_quantity
      into v_expedition
      from public.expeditions e where e.id = v_pending.expedition_id;
    return jsonb_build_object(
      'draw_id', v_pending.id,
      'expedition_id', v_expedition.id,
      'expedition_slug', v_expedition.slug,
      'title', v_expedition.title,
      'summary', v_expedition.summary,
      'country_code', v_pending.country_code,
      'iso_numeric', v_pending.iso_numeric,
      'country_name', (select name from public.countries where iso_code = v_pending.country_code),
      'capital', (select capital from public.countries where iso_code = v_pending.country_code),
      'reward_pack_id', v_expedition.reward_pack_id,
      'reward_pack_quantity', v_expedition.reward_pack_quantity,
      'replayed', true,
      'already_active', false,
      'charges', v_charges.charges,
      'max_stored', v_charges.max_stored,
      'next_at', v_charges.next_at
    );
  end if;

  if exists (
    select 1 from public.user_expeditions ue
     where ue.user_id = v_uid and ue.status = 'in_progress'
  ) then
    return (
      select jsonb_build_object(
        'draw_id', null,
        'expedition_id', e.id,
        'expedition_slug', e.slug,
        'title', e.title,
        'summary', e.summary,
        'country_code', e.country_code,
        'iso_numeric', c.iso_numeric,
        'country_name', c.name,
        'capital', c.capital,
        'reward_pack_id', e.reward_pack_id,
        'reward_pack_quantity', e.reward_pack_quantity,
        'replayed', false,
        'already_active', true,
        'charges', v_charges.charges,
        'max_stored', v_charges.max_stored,
        'next_at', v_charges.next_at
      )
        from public.user_expeditions ue
        join public.expeditions e on e.id = ue.expedition_id
        join public.countries c on c.iso_code = e.country_code
       where ue.user_id = v_uid and ue.status = 'in_progress'
       limit 1
    );
  end if;

  select p.expedition_id, p.country_code, p.iso_numeric
    into v_pick
    from atlas_private.expedition_draw_pool(v_uid) p
   order by random()
   limit 1;

  if v_pick.expedition_id is null then
    raise exception 'EXPEDITION_POOL_EMPTY' using errcode = 'P0001';
  end if;

  select * into v_charges from atlas_private.consume_expedition_charge(v_uid);

  insert into public.user_expeditions (user_id, expedition_id)
  values (v_uid, v_pick.expedition_id)
  on conflict (user_id, expedition_id) do nothing;

  insert into public.expedition_draws (user_id, expedition_id, country_code, iso_numeric)
  values (v_uid, v_pick.expedition_id, v_pick.country_code, v_pick.iso_numeric)
  returning id into v_draw_id;

  select e.id, e.slug, e.title, e.summary, e.country_code, e.reward_pack_id, e.reward_pack_quantity,
         c.name, c.capital
    into v_expedition
    from public.expeditions e
    join public.countries c on c.iso_code = e.country_code
   where e.id = v_pick.expedition_id;

  select * into v_charges from atlas_private.sync_expedition_charges(v_uid);

  return jsonb_build_object(
    'draw_id', v_draw_id,
    'expedition_id', v_expedition.id,
    'expedition_slug', v_expedition.slug,
    'title', v_expedition.title,
    'summary', v_expedition.summary,
    'country_code', v_pick.country_code,
    'iso_numeric', v_pick.iso_numeric,
    'country_name', v_expedition.name,
    'capital', v_expedition.capital,
    'reward_pack_id', v_expedition.reward_pack_id,
    'reward_pack_quantity', v_expedition.reward_pack_quantity,
    'replayed', false,
    'already_active', false,
    'charges', v_charges.charges,
    'max_stored', v_charges.max_stored,
    'next_at', v_charges.next_at
  );
end;
$$;

create or replace function public.start_expedition(p_expedition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_country text;
  v_existing public.expedition_status;
begin
  select country_code into v_country
    from public.expeditions
   where id = p_expedition_id and status = 'published';
  if v_country is null then
    raise exception 'EXPEDITION_NOT_FOUND' using errcode = 'P0001';
  end if;

  if not exists (
    select 1 from public.user_cards uc
      join public.cards c on c.id = uc.card_id
     where uc.user_id = v_uid and c.country_code = v_country
  ) then
    raise exception 'EXPEDITION_LOCKED' using errcode = 'P0001';
  end if;

  select status into v_existing
    from public.user_expeditions
   where user_id = v_uid and expedition_id = p_expedition_id;

  if v_existing is null then
    perform atlas_private.consume_expedition_charge(v_uid);
  end if;

  insert into public.user_expeditions (user_id, expedition_id)
  values (v_uid, p_expedition_id)
  on conflict (user_id, expedition_id) do nothing;

  return atlas_private.expedition_state(v_uid, p_expedition_id);
end;
$$;
