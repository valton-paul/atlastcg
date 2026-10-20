-- Atlas — récompense en fragments (plus de pièces) + maîtrise pays + carnet de voyage.

-- Colonnes de récompense : pièces → fragments (même montants).
do $$ begin
  alter table public.expeditions rename column reward_coins to reward_fragments;
exception when undefined_column then null;
end $$;
do $$ begin
  alter table public.expeditions rename column perfect_bonus_coins to perfect_bonus_fragments;
exception when undefined_column then null;
end $$;

comment on column public.expeditions.reward_fragments is 'Fragments attribués à la finalisation.';
comment on column public.expeditions.perfect_bonus_fragments is
  'Bonus fragments si toutes les questions sont réussies du premier coup.';

-- Maîtrise d’exploration par pays.
create table if not exists public.user_country_mastery (
  user_id uuid not null references auth.users (id) on delete cascade,
  country_code text not null references public.countries (iso_code),
  xp integer not null default 0 check (xp >= 0),
  expeditions_completed integer not null default 0 check (expeditions_completed >= 0),
  updated_at timestamptz not null default now(),
  primary key (user_id, country_code)
);

comment on table public.user_country_mastery is
  'XP d’exploration et compteurs par pays (Novice → Maître).';

alter table public.user_country_mastery enable row level security;
drop policy if exists "own mastery readable" on public.user_country_mastery;
create policy "own mastery readable" on public.user_country_mastery
  for select to authenticated using (user_id = (select auth.uid()));

-- Carnet de voyage : anecdotes / découvertes retenues.
create table if not exists public.user_journal_entries (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  country_code text not null references public.countries (iso_code),
  expedition_id uuid references public.expeditions (id) on delete set null,
  step_id uuid references public.expedition_steps (id) on delete set null,
  kind text not null check (kind in ('discovery', 'quiz', 'locate')),
  title text not null,
  body text not null,
  created_at timestamptz not null default now(),
  unique (user_id, step_id)
);

create index if not exists user_journal_user_country_idx
  on public.user_journal_entries (user_id, country_code, created_at desc);

alter table public.user_journal_entries enable row level security;
drop policy if exists "own journal readable" on public.user_journal_entries;
create policy "own journal readable" on public.user_journal_entries
  for select to authenticated using (user_id = (select auth.uid()));

create or replace function atlas_private.add_country_mastery_xp(
  p_user_id uuid,
  p_country_code text,
  p_xp integer,
  p_completed_expedition boolean default false
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_xp integer;
begin
  if p_xp < 0 then
    raise exception 'INVALID_XP' using errcode = 'P0001';
  end if;

  insert into public.user_country_mastery as m (user_id, country_code, xp, expeditions_completed)
  values (
    p_user_id,
    p_country_code,
    p_xp,
    case when p_completed_expedition then 1 else 0 end
  )
  on conflict (user_id, country_code) do update
    set xp = m.xp + excluded.xp,
        expeditions_completed = m.expeditions_completed
          + case when p_completed_expedition then 1 else 0 end,
        updated_at = now()
  returning xp into v_xp;

  return v_xp;
end;
$$;

create or replace function atlas_private.mastery_tier(p_xp integer)
returns text
language sql
immutable
set search_path = ''
as $$
  select case
    when p_xp >= 300 then 'master'
    when p_xp >= 150 then 'expert'
    when p_xp >= 50 then 'explorer'
    else 'novice'
  end;
$$;

-- Soumission : XP globale + maîtrise pays + entrée de carnet (découverte).
create or replace function public.submit_expedition_step(p_step_id uuid, p_choice integer)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_step record;
  v_expedition record;
  v_status public.expedition_status;
  v_correct_choice smallint;
  v_correct boolean;
  v_already_done timestamptz;
  v_xp_granted integer := 0;
  v_country_xp integer;
begin
  select st.* into v_step
    from public.expedition_steps st
    join public.expeditions e on e.id = st.expedition_id and e.status = 'published'
   where st.id = p_step_id;
  if not found then
    raise exception 'STEP_NOT_FOUND' using errcode = 'P0001';
  end if;

  select * into v_expedition from public.expeditions where id = v_step.expedition_id;

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

  select completed_at into v_already_done
    from public.user_expedition_steps
   where user_id = v_uid and step_id = p_step_id;

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

  if v_correct and v_already_done is null then
    v_xp_granted := coalesce(v_expedition.step_xp, 5);
    perform atlas_private.grant_exploration_xp(v_uid, v_xp_granted);
    v_country_xp := atlas_private.add_country_mastery_xp(
      v_uid, v_expedition.country_code, v_xp_granted, false
    );

    if v_step.kind = 'discover' then
      insert into public.user_journal_entries (
        user_id, country_code, expedition_id, step_id, kind, title, body
      )
      values (
        v_uid,
        v_expedition.country_code,
        v_expedition.id,
        v_step.id,
        'discovery',
        v_step.title,
        coalesce(nullif(btrim(v_step.body), ''), v_step.prompt)
      )
      on conflict (user_id, step_id) do nothing;
    end if;
  end if;

  return jsonb_build_object(
    'step_id', p_step_id,
    'correct', v_correct,
    'correct_choice', v_correct_choice,
    'explanation', v_step.explanation,
    'xp_granted', v_xp_granted,
    'country_xp', coalesce(v_country_xp, 0),
    'mastery_tier', atlas_private.mastery_tier(coalesce(v_country_xp, 0)),
    'state', atlas_private.expedition_state(v_uid, v_step.expedition_id)
  );
end;
$$;

-- Finalisation : fragments + XP (idempotent), bonus parfait, maîtrise.
create or replace function public.complete_expedition(p_expedition_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_status public.expedition_status;
  v_expedition record;
  v_inserted integer;
  v_fragments integer := 0;
  v_xp integer := 0;
  v_perfect boolean := false;
  v_question_total integer;
  v_question_perfect integer;
  v_balance integer;
  v_exploration_xp integer;
  v_country_xp integer;
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
    select fragments into v_balance from public.player_wallets where user_id = v_uid;
    select exploration_xp into v_exploration_xp from public.profiles where id = v_uid;
    select xp into v_country_xp
      from public.user_country_mastery
     where user_id = v_uid and country_code = v_expedition.country_code;
    return jsonb_build_object(
      'newly_completed', false,
      'packs_granted', 0,
      'fragments_granted', 0,
      'xp_granted', 0,
      'perfect', false,
      'fragments_balance', coalesce(v_balance, 0),
      'exploration_xp', coalesce(v_exploration_xp, 0),
      'country_xp', coalesce(v_country_xp, 0),
      'mastery_tier', atlas_private.mastery_tier(coalesce(v_country_xp, 0)),
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

  select
    count(*) filter (where st.kind in ('locate', 'quiz')),
    count(*) filter (
      where st.kind in ('locate', 'quiz')
        and s.completed_at is not null
        and s.attempts = 1
    )
  into v_question_total, v_question_perfect
  from public.expedition_steps st
  left join public.user_expedition_steps s
    on s.step_id = st.id and s.user_id = v_uid
  where st.expedition_id = p_expedition_id;

  v_perfect := v_question_total > 0 and v_question_perfect = v_question_total;

  update public.user_expeditions
     set status = 'completed', completed_at = now()
   where user_id = v_uid and expedition_id = p_expedition_id;

  insert into public.reward_grants (user_id, grant_key, source, reference_id, payload)
  values (
    v_uid,
    'expedition:' || p_expedition_id::text,
    'expedition',
    p_expedition_id,
    jsonb_build_object(
      'fragments', v_expedition.reward_fragments
        + case when v_perfect then v_expedition.perfect_bonus_fragments else 0 end,
      'xp', v_expedition.reward_xp
        + case when v_perfect then v_expedition.perfect_bonus_xp else 0 end,
      'perfect', v_perfect
    )
  )
  on conflict (user_id, grant_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    v_fragments := v_expedition.reward_fragments;
    v_xp := v_expedition.reward_xp;
    if v_perfect then
      v_fragments := v_fragments + v_expedition.perfect_bonus_fragments;
      v_xp := v_xp + v_expedition.perfect_bonus_xp;
    end if;
    v_balance := atlas_private.credit_fragments(
      v_uid,
      v_fragments,
      case when v_perfect then 'expedition_perfect'::public.ledger_reason
           else 'expedition_reward'::public.ledger_reason end,
      p_expedition_id
    );
    v_exploration_xp := atlas_private.grant_exploration_xp(v_uid, v_xp);
    v_country_xp := atlas_private.add_country_mastery_xp(
      v_uid, v_expedition.country_code, v_xp, true
    );
  else
    select fragments into v_balance from public.player_wallets where user_id = v_uid;
    select exploration_xp into v_exploration_xp from public.profiles where id = v_uid;
    select xp into v_country_xp
      from public.user_country_mastery
     where user_id = v_uid and country_code = v_expedition.country_code;
  end if;

  return jsonb_build_object(
    'newly_completed', v_inserted > 0,
    'packs_granted', 0,
    'fragments_granted', case when v_inserted > 0 then v_fragments else 0 end,
    'xp_granted', case when v_inserted > 0 then v_xp else 0 end,
    'perfect', v_perfect,
    'fragments_balance', coalesce(v_balance, 0),
    'exploration_xp', coalesce(v_exploration_xp, 0),
    'country_xp', coalesce(v_country_xp, 0),
    'mastery_tier', atlas_private.mastery_tier(coalesce(v_country_xp, 0)),
    'state', atlas_private.expedition_state(v_uid, p_expedition_id)
  );
end;
$$;

-- Tirage : reward_fragments à la place de reward_coins.
create or replace function public.draw_expedition()
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_charges record;
  v_pending record;
  v_expedition record;
  v_pick record;
  v_draw_id uuid;
begin
  select * into v_charges from atlas_private.sync_expedition_charges(v_uid);

  select d.*
    into v_pending
    from public.expedition_draws d
   where d.user_id = v_uid and d.status = 'pending_reveal'
   order by d.created_at desc
   limit 1
   for update skip locked;

  if found then
    select e.* into v_expedition from public.expeditions e where e.id = v_pending.expedition_id;
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
      'reward_fragments', v_expedition.reward_fragments,
      'reward_xp', v_expedition.reward_xp,
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
        'reward_fragments', e.reward_fragments,
        'reward_xp', e.reward_xp,
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

  select e.*, c.name as country_name, c.capital as country_capital
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
    'country_name', v_expedition.country_name,
    'capital', v_expedition.country_capital,
    'reward_pack_id', v_expedition.reward_pack_id,
    'reward_pack_quantity', v_expedition.reward_pack_quantity,
    'reward_fragments', v_expedition.reward_fragments,
    'reward_xp', v_expedition.reward_xp,
    'replayed', false,
    'already_active', false,
    'charges', v_charges.charges,
    'max_stored', v_charges.max_stored,
    'next_at', v_charges.next_at
  );
end;
$$;
