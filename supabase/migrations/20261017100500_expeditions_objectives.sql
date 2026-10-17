-- Atlas — expéditions et objectifs. Toutes les transitions et récompenses sont validées ici.

create function atlas_private.expedition_state(p_user_id uuid, p_expedition_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'expedition_id', ue.expedition_id,
    'status', ue.status,
    'started_at', ue.started_at,
    'completed_at', ue.completed_at,
    'completed_steps', (
      select count(*) from public.user_expedition_steps s
       where s.user_id = ue.user_id and s.expedition_id = ue.expedition_id and s.completed_at is not null
    ),
    'total_steps', (select count(*) from public.expedition_steps st where st.expedition_id = ue.expedition_id)
  )
    from public.user_expeditions ue
   where ue.user_id = p_user_id and ue.expedition_id = p_expedition_id;
$$;

-- Prérequis : posséder au moins une carte du pays (le pays est « découvert »).
create function public.start_expedition(p_expedition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_country text;
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

  insert into public.user_expeditions (user_id, expedition_id)
  values (v_uid, p_expedition_id)
  on conflict (user_id, expedition_id) do nothing;

  return atlas_private.expedition_state(v_uid, p_expedition_id);
end;
$$;

-- Valide une étape. Une mauvaise réponse ne bloque jamais : l'explication est renvoyée et
-- le joueur peut réessayer.
create function public.submit_expedition_step(p_step_id uuid, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_step record;
  v_status public.expedition_status;
  v_correct_choice smallint;
  v_correct boolean;
begin
  select st.* into v_step
    from public.expedition_steps st
    join public.expeditions e on e.id = st.expedition_id and e.status = 'published'
   where st.id = p_step_id;
  if not found then
    raise exception 'STEP_NOT_FOUND' using errcode = 'P0001';
  end if;

  select status into v_status
    from public.user_expeditions
   where user_id = v_uid and expedition_id = v_step.expedition_id
   for update;
  if not found then
    raise exception 'EXPEDITION_NOT_STARTED' using errcode = 'P0001';
  end if;
  if v_status = 'completed' then
    raise exception 'EXPEDITION_ALREADY_COMPLETED' using errcode = 'P0001';
  end if;

  if exists (
    select 1 from public.expedition_steps prev
     where prev.expedition_id = v_step.expedition_id
       and prev.position < v_step.position
       and not exists (
         select 1 from public.user_expedition_steps s
          where s.user_id = v_uid and s.step_id = prev.id and s.completed_at is not null
       )
  ) then
    raise exception 'STEP_LOCKED' using errcode = 'P0001';
  end if;

  if v_step.kind = 'discover' then
    v_correct := true;
  else
    if p_choice is null or p_choice < 0 or p_choice >= cardinality(v_step.choices) then
      raise exception 'INVALID_CHOICE' using errcode = 'P0001';
    end if;
    select correct_choice into v_correct_choice
      from atlas_private.expedition_step_solutions where step_id = p_step_id;
    if v_correct_choice is null then
      raise exception 'STEP_MISCONFIGURED' using errcode = 'P0001';
    end if;
    v_correct := p_choice = v_correct_choice;
  end if;

  insert into public.user_expedition_steps as s (user_id, step_id, expedition_id, attempts, completed_at)
  values (v_uid, p_step_id, v_step.expedition_id, 1, case when v_correct then now() end)
  on conflict (user_id, step_id) do update
    set attempts = s.attempts + 1,
        completed_at = coalesce(s.completed_at, excluded.completed_at);

  return jsonb_build_object(
    'step_id', p_step_id,
    'correct', v_correct,
    'correct_choice', v_correct_choice,
    'explanation', v_step.explanation,
    'state', atlas_private.expedition_state(v_uid, v_step.expedition_id)
  );
end;
$$;

-- Finalisation : une seule fois, récompense attribuée une seule fois (verrou + clé d'idempotence).
create function public.complete_expedition(p_expedition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_status public.expedition_status;
  v_expedition record;
  v_granted integer;
begin
  select * into v_expedition from public.expeditions where id = p_expedition_id;
  if not found then
    raise exception 'EXPEDITION_NOT_FOUND' using errcode = 'P0001';
  end if;

  select status into v_status
    from public.user_expeditions
   where user_id = v_uid and expedition_id = p_expedition_id
   for update;
  if not found then
    raise exception 'EXPEDITION_NOT_STARTED' using errcode = 'P0001';
  end if;

  if v_status = 'completed' then
    return jsonb_build_object(
      'newly_completed', false,
      'packs_granted', 0,
      'state', atlas_private.expedition_state(v_uid, p_expedition_id)
    );
  end if;

  if exists (
    select 1 from public.expedition_steps st
     where st.expedition_id = p_expedition_id
       and not exists (
         select 1 from public.user_expedition_steps s
          where s.user_id = v_uid and s.step_id = st.id and s.completed_at is not null
       )
  ) then
    raise exception 'STEPS_INCOMPLETE' using errcode = 'P0001';
  end if;

  update public.user_expeditions
     set status = 'completed', completed_at = now()
   where user_id = v_uid and expedition_id = p_expedition_id;

  v_granted := atlas_private.grant_reward_packs(
    v_uid, 'expedition:' || p_expedition_id::text, 'expedition', p_expedition_id,
    v_expedition.reward_pack_id, v_expedition.reward_pack_quantity
  );

  return jsonb_build_object(
    'newly_completed', true,
    'packs_granted', v_granted,
    'state', atlas_private.expedition_state(v_uid, p_expedition_id)
  );
end;
$$;

-- Objectifs ---------------------------------------------------------------------------

create function atlas_private.objective_progress(
  p_user_id uuid, p_kind public.objective_kind, p_collection_id uuid
)
returns integer
language plpgsql
stable
set search_path = ''
as $$
declare
  v_owned integer;
  v_total integer;
begin
  case p_kind
    when 'cards_owned' then
      return (select count(*) from public.user_cards where user_id = p_user_id);
    when 'countries_discovered' then
      return (
        select count(distinct c.country_code)
          from public.user_cards uc join public.cards c on c.id = uc.card_id
         where uc.user_id = p_user_id and c.country_code is not null
      );
    when 'continents_discovered' then
      return (
        select count(distinct co.continent)
          from public.user_cards uc
          join public.cards c on c.id = uc.card_id
          join public.countries co on co.iso_code = c.country_code
         where uc.user_id = p_user_id
      );
    when 'expeditions_completed' then
      return (
        select count(*) from public.user_expeditions
         where user_id = p_user_id and status = 'completed'
      );
    when 'collection_completed' then
      select count(*), count(uc.card_id) into v_total, v_owned
        from public.collection_cards cc
        join public.cards c on c.id = cc.card_id and c.status = 'published'
        left join public.user_cards uc on uc.card_id = cc.card_id and uc.user_id = p_user_id
       where cc.collection_id = p_collection_id;
      return case when v_total > 0 and v_owned = v_total then 1 else 0 end;
  end case;
end;
$$;

create function public.list_objectives()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
begin
  return coalesce((
    select jsonb_agg(jsonb_build_object(
      'id', o.id,
      'slug', o.slug,
      'title', o.title,
      'description', o.description,
      'kind', o.kind,
      'target', o.target,
      'progress', least(atlas_private.objective_progress(v_uid, o.kind, o.collection_id), o.target),
      'claimed', exists (
        select 1 from public.reward_grants g
         where g.user_id = v_uid and g.grant_key = 'objective:' || o.id::text
      ),
      'collection_slug', col.slug,
      'reward', jsonb_build_object('pack_slug', p.slug, 'pack_name', p.name, 'quantity', o.reward_pack_quantity)
    ) order by o.position, o.slug)
      from public.objectives o
      join public.pack_definitions p on p.id = o.reward_pack_id
      left join public.collections col on col.id = o.collection_id
     where o.status = 'published'
  ), '[]'::jsonb);
end;
$$;

create function public.claim_objective(p_objective_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_objective record;
  v_granted integer;
begin
  select * into v_objective from public.objectives where id = p_objective_id and status = 'published';
  if not found then
    raise exception 'OBJECTIVE_NOT_FOUND' using errcode = 'P0001';
  end if;

  if atlas_private.objective_progress(v_uid, v_objective.kind, v_objective.collection_id) < v_objective.target then
    raise exception 'OBJECTIVE_NOT_COMPLETED' using errcode = 'P0001';
  end if;

  v_granted := atlas_private.grant_reward_packs(
    v_uid, 'objective:' || p_objective_id::text, 'objective', p_objective_id,
    v_objective.reward_pack_id, v_objective.reward_pack_quantity
  );

  return jsonb_build_object('granted', v_granted > 0, 'packs_granted', v_granted);
end;
$$;

revoke all on function public.start_expedition(uuid) from public, anon;
revoke all on function public.submit_expedition_step(uuid, integer) from public, anon;
revoke all on function public.complete_expedition(uuid) from public, anon;
revoke all on function public.list_objectives() from public, anon;
revoke all on function public.claim_objective(uuid) from public, anon;
grant execute on function public.start_expedition(uuid) to authenticated;
grant execute on function public.submit_expedition_step(uuid, integer) to authenticated;
grant execute on function public.complete_expedition(uuid) to authenticated;
grant execute on function public.list_objectives() to authenticated;
grant execute on function public.claim_objective(uuid) to authenticated;
