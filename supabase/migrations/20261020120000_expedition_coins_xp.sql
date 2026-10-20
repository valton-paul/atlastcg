-- Atlas — récompenses d’expédition : pièces + XP d’exploration (plus de paquet systématique).

alter table public.player_wallets
  add column if not exists coins integer not null default 0 check (coins >= 0);

comment on column public.player_wallets.coins is
  'Monnaie du jeu (récompenses d’expédition, etc.). Distincte des fragments (doublons).';

alter table public.profiles
  add column if not exists exploration_xp integer not null default 0 check (exploration_xp >= 0);

comment on column public.profiles.exploration_xp is
  'XP d’exploration globale, gagnée pendant les expéditions.';

alter table public.expeditions
  add column if not exists reward_coins integer not null default 30 check (reward_coins >= 0),
  add column if not exists reward_xp integer not null default 40 check (reward_xp >= 0),
  add column if not exists perfect_bonus_coins integer not null default 15 check (perfect_bonus_coins >= 0),
  add column if not exists perfect_bonus_xp integer not null default 20 check (perfect_bonus_xp >= 0),
  add column if not exists step_xp integer not null default 5 check (step_xp >= 0);

alter table public.expeditions
  alter column reward_pack_id drop not null;

alter table public.expeditions
  alter column reward_pack_quantity drop not null;

comment on column public.expeditions.reward_coins is 'Pièces attribuées à la finalisation.';
comment on column public.expeditions.reward_xp is 'XP bonus à la finalisation (en plus du XP par étape).';
comment on column public.expeditions.perfect_bonus_coins is 'Bonus pièces si toutes les questions sont réussies du premier coup.';
comment on column public.expeditions.perfect_bonus_xp is 'Bonus XP si toutes les questions sont réussies du premier coup.';
comment on column public.expeditions.step_xp is 'XP accordée à chaque étape nouvellement validée.';

-- Ledger : distinguer fragments et pièces.
do $$ begin
  create type public.ledger_currency as enum ('fragments', 'coins');
exception when duplicate_object then null;
end $$;

alter table public.resource_ledger
  add column if not exists currency public.ledger_currency not null default 'fragments';

alter type public.ledger_reason add value if not exists 'expedition_reward';
alter type public.ledger_reason add value if not exists 'expedition_step';
alter type public.ledger_reason add value if not exists 'expedition_perfect';

-- Crédite des pièces (ledger + wallet). Renvoie le nouveau solde.
create or replace function atlas_private.grant_coins(
  p_user_id uuid,
  p_amount integer,
  p_reason public.ledger_reason,
  p_reference_id uuid
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_balance integer;
begin
  if p_amount <= 0 then
    select coins into v_balance from public.player_wallets where user_id = p_user_id;
    return coalesce(v_balance, 0);
  end if;

  update public.player_wallets
     set coins = coins + p_amount
   where user_id = p_user_id
  returning coins into v_balance;

  if not found then
    insert into public.player_wallets (user_id, coins)
    values (p_user_id, p_amount)
    returning coins into v_balance;
  end if;

  insert into public.resource_ledger (user_id, delta, balance_after, reason, reference_id, currency)
  values (p_user_id, p_amount, v_balance, p_reason, p_reference_id, 'coins');

  return v_balance;
end;
$$;

create or replace function atlas_private.grant_exploration_xp(
  p_user_id uuid,
  p_amount integer
)
returns integer
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_xp integer;
begin
  if p_amount <= 0 then
    select exploration_xp into v_xp from public.profiles where id = p_user_id;
    return coalesce(v_xp, 0);
  end if;

  update public.profiles
     set exploration_xp = exploration_xp + p_amount
   where id = p_user_id
  returning exploration_xp into v_xp;

  return coalesce(v_xp, 0);
end;
$$;

-- Soumission d’étape : +XP à la première validation réussie.
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
  end if;

  return jsonb_build_object(
    'step_id', p_step_id,
    'correct', v_correct,
    'correct_choice', v_correct_choice,
    'explanation', v_step.explanation,
    'xp_granted', v_xp_granted,
    'state', atlas_private.expedition_state(v_uid, v_step.expedition_id)
  );
end;
$$;

-- Finalisation : pièces + XP (idempotent), bonus si parfait.
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
  v_coins integer := 0;
  v_xp integer := 0;
  v_perfect boolean := false;
  v_question_total integer;
  v_question_perfect integer;
  v_balance integer;
  v_exploration_xp integer;
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
    select coins into v_balance from public.player_wallets where user_id = v_uid;
    select exploration_xp into v_exploration_xp from public.profiles where id = v_uid;
    return jsonb_build_object(
      'newly_completed', false,
      'packs_granted', 0,
      'coins_granted', 0,
      'xp_granted', 0,
      'perfect', false,
      'coins_balance', coalesce(v_balance, 0),
      'exploration_xp', coalesce(v_exploration_xp, 0),
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
      'coins', v_expedition.reward_coins + case when v_perfect then v_expedition.perfect_bonus_coins else 0 end,
      'xp', v_expedition.reward_xp + case when v_perfect then v_expedition.perfect_bonus_xp else 0 end,
      'perfect', v_perfect
    )
  )
  on conflict (user_id, grant_key) do nothing;
  get diagnostics v_inserted = row_count;

  if v_inserted > 0 then
    v_coins := v_expedition.reward_coins;
    v_xp := v_expedition.reward_xp;
    if v_perfect then
      v_coins := v_coins + v_expedition.perfect_bonus_coins;
      v_xp := v_xp + v_expedition.perfect_bonus_xp;
    end if;
    v_balance := atlas_private.grant_coins(
      v_uid, v_coins,
      case when v_perfect then 'expedition_perfect'::public.ledger_reason else 'expedition_reward'::public.ledger_reason end,
      p_expedition_id
    );
    v_exploration_xp := atlas_private.grant_exploration_xp(v_uid, v_xp);
  else
    select coins into v_balance from public.player_wallets where user_id = v_uid;
    select exploration_xp into v_exploration_xp from public.profiles where id = v_uid;
  end if;

  return jsonb_build_object(
    'newly_completed', v_inserted > 0,
    'packs_granted', 0,
    'coins_granted', case when v_inserted > 0 then v_coins else 0 end,
    'xp_granted', case when v_inserted > 0 then v_xp else 0 end,
    'perfect', v_perfect,
    'coins_balance', coalesce(v_balance, 0),
    'exploration_xp', coalesce(v_exploration_xp, 0),
    'state', atlas_private.expedition_state(v_uid, p_expedition_id)
  );
end;
$$;

-- Tirage : expose aussi les récompenses pièces/XP.
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
      'reward_coins', v_expedition.reward_coins,
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
        'reward_coins', e.reward_coins,
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
    'reward_coins', v_expedition.reward_coins,
    'reward_xp', v_expedition.reward_xp,
    'replayed', false,
    'already_active', false,
    'charges', v_charges.charges,
    'max_stored', v_charges.max_stored,
    'next_at', v_charges.next_at
  );
end;
$$;
