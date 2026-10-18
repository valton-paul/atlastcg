-- Expéditions : uniquement sur pays découverts (1 carte min), max 3 démarrages / jour UTC.

create or replace function atlas_private.expeditions_started_today(p_user_id uuid)
returns integer
language sql
stable
set search_path = ''
as $$
  select count(*)::int
    from public.user_expeditions ue
   where ue.user_id = p_user_id
     and (ue.started_at at time zone 'utc')::date = (now() at time zone 'utc')::date;
$$;

revoke all on function atlas_private.expeditions_started_today(uuid) from public, anon, authenticated;

-- Pool : pays dont le joueur possède au moins une carte, sans expédition déjà active/terminée.
create or replace function atlas_private.expedition_draw_pool(p_user_id uuid)
returns table (expedition_id uuid, country_code text, iso_numeric text, priority integer)
language sql
stable
set search_path = ''
as $$
  select e.id,
         e.country_code,
         c.iso_numeric,
         1 as priority
    from public.expeditions e
    join public.countries c on c.iso_code = e.country_code and c.status = 'published'
   where e.status = 'published'
     and exists (
       select 1 from public.user_cards uc
         join public.cards card on card.id = uc.card_id
        where uc.user_id = p_user_id and card.country_code = e.country_code
     )
     and not exists (
       select 1 from public.user_expeditions ue
        where ue.user_id = p_user_id
          and ue.expedition_id = e.id
          and ue.status in ('in_progress', 'completed')
     )
     and not exists (
       select 1 from public.user_expeditions ue
        where ue.user_id = p_user_id and ue.status = 'in_progress'
     );
$$;

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
  v_daily_limit int := 3;
  v_started_today int;
  v_remaining int;
begin
  v_started_today := atlas_private.expeditions_started_today(v_uid);
  v_remaining := greatest(0, v_daily_limit - v_started_today);

  -- Reprendre un tirage non révélé (app fermée pendant l'animation).
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
      'daily_remaining', v_remaining
    );
  end if;

  -- Une seule expédition active : renvoyer celle en cours (pas de nouveau tirage).
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
        'daily_remaining', v_remaining
      )
        from public.user_expeditions ue
        join public.expeditions e on e.id = ue.expedition_id
        join public.countries c on c.iso_code = e.country_code
       where ue.user_id = v_uid and ue.status = 'in_progress'
       limit 1
    );
  end if;

  if v_started_today >= v_daily_limit then
    raise exception 'EXPEDITION_DAILY_LIMIT' using errcode = 'P0001';
  end if;

  select p.expedition_id, p.country_code, p.iso_numeric
    into v_pick
    from atlas_private.expedition_draw_pool(v_uid) p
   order by random()
   limit 1;

  if v_pick.expedition_id is null then
    raise exception 'EXPEDITION_POOL_EMPTY' using errcode = 'P0001';
  end if;

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
    'daily_remaining', greatest(0, v_daily_limit - v_started_today - 1)
  );
end;
$$;

-- Limite quotidienne aussi sur le démarrage direct (fiche pays).
create or replace function public.start_expedition(p_expedition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_country text;
  v_daily_limit int := 3;
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
    if atlas_private.expeditions_started_today(v_uid) >= v_daily_limit then
      raise exception 'EXPEDITION_DAILY_LIMIT' using errcode = 'P0001';
    end if;
  end if;

  insert into public.user_expeditions (user_id, expedition_id)
  values (v_uid, p_expedition_id)
  on conflict (user_id, expedition_id) do nothing;

  return atlas_private.expedition_state(v_uid, p_expedition_id);
end;
$$;
