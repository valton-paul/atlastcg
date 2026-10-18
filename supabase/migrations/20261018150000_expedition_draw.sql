-- Atlas — tirage d'expédition (destination choisie côté serveur, révélée par animation).

create type public.expedition_draw_status as enum ('pending_reveal', 'revealed');

create table public.expedition_draws (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  expedition_id uuid not null references public.expeditions (id) on delete restrict,
  country_code text not null references public.countries (iso_code),
  iso_numeric text not null,
  status public.expedition_draw_status not null default 'pending_reveal',
  created_at timestamptz not null default now(),
  revealed_at timestamptz,
  constraint expedition_draws_revealed_at check (
    (status = 'revealed') = (revealed_at is not null)
  )
);

-- Au plus un tirage en attente de révélation par joueur.
create unique index expedition_draws_one_pending_idx
  on public.expedition_draws (user_id)
  where status = 'pending_reveal';

create index expedition_draws_user_idx on public.expedition_draws (user_id, created_at desc);

alter table public.expedition_draws enable row level security;

create policy "own draws readable" on public.expedition_draws
  for select to authenticated
  using (user_id = (select auth.uid()));

grant select on table public.expedition_draws to authenticated;

-- Pool : priorise les pays sans aucune carte, puis les découverts sans expédition terminée.
create function atlas_private.expedition_draw_pool(p_user_id uuid)
returns table (expedition_id uuid, country_code text, iso_numeric text, priority integer)
language sql
stable
set search_path = ''
as $$
  select e.id,
         e.country_code,
         c.iso_numeric,
         case
           when not exists (
             select 1 from public.user_cards uc
               join public.cards card on card.id = uc.card_id
              where uc.user_id = p_user_id and card.country_code = e.country_code
           ) then 1
           else 2
         end as priority
    from public.expeditions e
    join public.countries c on c.iso_code = e.country_code and c.status = 'published'
   where e.status = 'published'
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

revoke all on function atlas_private.expedition_draw_pool(uuid) from public, anon, authenticated;

create function public.draw_expedition()
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
begin
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
      'already_active', false
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
        'already_active', true
      )
        from public.user_expeditions ue
        join public.expeditions e on e.id = ue.expedition_id
        join public.countries c on c.iso_code = e.country_code
       where ue.user_id = v_uid and ue.status = 'in_progress'
       limit 1
    );
  end if;

  -- Tirage : priorité 1 (inexplorés), sinon priorité 2 (découverts non terminés).
  select p.expedition_id, p.country_code, p.iso_numeric
    into v_pick
    from atlas_private.expedition_draw_pool(v_uid) p
   where p.priority = (
     select min(p2.priority) from atlas_private.expedition_draw_pool(v_uid) p2
   )
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
    'already_active', false
  );
end;
$$;

create function public.reveal_expedition_draw(p_draw_id uuid)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_draw record;
begin
  if p_draw_id is null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;

  select * into v_draw
    from public.expedition_draws
   where id = p_draw_id and user_id = v_uid
   for update;
  if not found then
    raise exception 'DRAW_NOT_FOUND' using errcode = 'P0001';
  end if;

  if v_draw.status = 'pending_reveal' then
    update public.expedition_draws
       set status = 'revealed', revealed_at = now()
     where id = p_draw_id;
  end if;

  return jsonb_build_object(
    'draw_id', v_draw.id,
    'expedition_id', v_draw.expedition_id,
    'country_code', v_draw.country_code,
    'iso_numeric', v_draw.iso_numeric,
    'status', 'revealed'
  );
end;
$$;

revoke all on function public.draw_expedition() from public, anon;
revoke all on function public.reveal_expedition_draw(uuid) from public, anon;
grant execute on function public.draw_expedition() to authenticated;
grant execute on function public.reveal_expedition_draw(uuid) to authenticated;
