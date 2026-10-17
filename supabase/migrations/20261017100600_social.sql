-- Atlas — social léger : amis, comparaison de collections, défis asynchrones.
-- Aucune table sociale n'est lisible directement : les RPC n'exposent que les champs autorisés
-- (pseudo, code public, statistiques agrégées), jamais les identifiants internes des autres joueurs.

create type public.friendship_status as enum ('pending', 'accepted');

create table public.friendships (
  id uuid primary key default gen_random_uuid(),
  requester_id uuid not null references auth.users (id) on delete cascade,
  recipient_id uuid not null references auth.users (id) on delete cascade,
  status public.friendship_status not null default 'pending',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint friendships_distinct check (requester_id <> recipient_id)
);
create unique index friendships_pair_idx
  on public.friendships (least(requester_id, recipient_id), greatest(requester_id, recipient_id));
create index friendships_recipient_idx on public.friendships (recipient_id, status);
create index friendships_requester_idx on public.friendships (requester_id, status);

create type public.challenge_type as enum ('capitals', 'continents');

create table public.challenges (
  id uuid primary key default gen_random_uuid(),
  creator_id uuid not null references auth.users (id) on delete cascade,
  challenge_type public.challenge_type not null,
  configuration jsonb not null default '{}'::jsonb,
  invite_code text unique check (invite_code is null or invite_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  question_count smallint not null check (question_count between 1 and 10),
  created_at timestamptz not null default now(),
  expires_at timestamptz not null,
  constraint challenges_expiry check (expires_at > created_at)
);
create index challenges_creator_idx on public.challenges (creator_id, created_at desc);

create table public.challenge_questions (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  position smallint not null check (position >= 1),
  prompt text not null,
  choices text[] not null check (cardinality(choices) = 4),
  primary key (challenge_id, position)
);

create table atlas_private.challenge_solutions (
  challenge_id uuid not null,
  position smallint not null,
  correct_choice smallint not null check (correct_choice between 0 and 3),
  explanation text not null,
  primary key (challenge_id, position),
  foreign key (challenge_id, position)
    references public.challenge_questions (challenge_id, position) on delete cascade
);

create table public.challenge_participants (
  challenge_id uuid not null references public.challenges (id) on delete cascade,
  user_id uuid not null references auth.users (id) on delete cascade,
  joined_at timestamptz not null default now(),
  score smallint check (score >= 0),
  completed_at timestamptz,
  result_payload jsonb,
  primary key (challenge_id, user_id),
  constraint challenge_participants_completion check ((completed_at is null) = (score is null))
);
create index challenge_participants_user_idx on public.challenge_participants (user_id, joined_at desc);

create trigger friendships_updated_at before update on public.friendships
  for each row execute function atlas_private.set_updated_at();

revoke all on table
  public.friendships, public.challenges, public.challenge_questions, public.challenge_participants
from anon, authenticated;
alter table public.friendships enable row level security;
alter table public.challenges enable row level security;
alter table public.challenge_questions enable row level security;
alter table public.challenge_participants enable row level security;
alter table atlas_private.challenge_solutions enable row level security;

-- Helpers -----------------------------------------------------------------------------

create function atlas_private.continent_label(p_continent public.continent)
returns text
language sql
immutable
set search_path = ''
as $$
  select case p_continent
    when 'africa' then 'Afrique'
    when 'asia' then 'Asie'
    when 'europe' then 'Europe'
    when 'north_america' then 'Amérique du Nord'
    when 'south_america' then 'Amérique du Sud'
    when 'oceania' then 'Océanie'
  end;
$$;

create function atlas_private.are_friends(p_a uuid, p_b uuid)
returns boolean
language sql
stable
set search_path = ''
as $$
  select exists (
    select 1 from public.friendships f
     where f.status = 'accepted'
       and least(f.requester_id, f.recipient_id) = least(p_a, p_b)
       and greatest(f.requester_id, f.recipient_id) = greatest(p_a, p_b)
  );
$$;

-- Statistiques agrégées d'un joueur (aucune donnée carte par carte).
create function atlas_private.player_stats(p_user_id uuid)
returns jsonb
language sql
stable
set search_path = ''
as $$
  select jsonb_build_object(
    'cards_owned', (
      select count(*) from public.user_cards uc
        join public.cards c on c.id = uc.card_id and c.status = 'published'
       where uc.user_id = p_user_id
    ),
    'total_cards', (select count(*) from public.cards where status = 'published'),
    'countries_discovered', (
      select count(distinct c.country_code) from public.user_cards uc
        join public.cards c on c.id = uc.card_id
       where uc.user_id = p_user_id and c.country_code is not null
    ),
    'expeditions_completed', (
      select count(*) from public.user_expeditions where user_id = p_user_id and status = 'completed'
    ),
    'collections', coalesce((
      select jsonb_agg(jsonb_build_object(
        'slug', s.slug, 'title', s.title, 'owned', s.owned, 'total', s.total
      ) order by s.position, s.slug)
        from (
          select col.slug, col.title, col.position, count(cc.card_id) as total, count(uc.card_id) as owned
            from public.collections col
            join public.collection_cards cc on cc.collection_id = col.id
            join public.cards c on c.id = cc.card_id and c.status = 'published'
            left join public.user_cards uc on uc.card_id = cc.card_id and uc.user_id = p_user_id
           where col.status = 'published'
           group by col.id, col.slug, col.title, col.position
        ) s
    ), '[]'::jsonb)
  );
$$;

-- Amis -----------------------------------------------------------------------------------

create function public.send_friend_request(p_public_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_target uuid;
  v_existing record;
begin
  select id into v_target from public.profiles where public_code = upper(btrim(coalesce(p_public_code, '')));
  if v_target is null then
    raise exception 'FRIEND_CODE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_target = v_uid then
    raise exception 'CANNOT_FRIEND_SELF' using errcode = 'P0001';
  end if;

  select * into v_existing from public.friendships f
   where least(f.requester_id, f.recipient_id) = least(v_uid, v_target)
     and greatest(f.requester_id, f.recipient_id) = greatest(v_uid, v_target)
   for update;

  if found then
    if v_existing.status = 'accepted' then
      return jsonb_build_object('status', 'accepted', 'friendship_id', v_existing.id);
    end if;
    if v_existing.recipient_id = v_uid then
      -- Demande croisée : l'autre joueur avait déjà demandé, on accepte.
      update public.friendships set status = 'accepted' where id = v_existing.id;
      return jsonb_build_object('status', 'accepted', 'friendship_id', v_existing.id);
    end if;
    return jsonb_build_object('status', 'pending', 'friendship_id', v_existing.id);
  end if;

  if (select count(*) from public.friendships where requester_id = v_uid and status = 'pending') >= 50 then
    raise exception 'TOO_MANY_PENDING_REQUESTS' using errcode = 'P0001';
  end if;

  begin
    insert into public.friendships (requester_id, recipient_id) values (v_uid, v_target)
    returning id into v_existing;
  exception when unique_violation then
    raise exception 'FRIEND_REQUEST_CONFLICT' using errcode = 'P0001';
  end;
  return jsonb_build_object('status', 'pending', 'friendship_id', v_existing.id);
end;
$$;

create function public.respond_friend_request(p_friendship_id uuid, p_accept boolean)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
begin
  if p_accept then
    update public.friendships set status = 'accepted'
     where id = p_friendship_id and recipient_id = v_uid and status = 'pending';
  else
    delete from public.friendships
     where id = p_friendship_id and recipient_id = v_uid and status = 'pending';
  end if;
  if not found then
    raise exception 'FRIEND_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
  return jsonb_build_object('status', case when p_accept then 'accepted' else 'declined' end);
end;
$$;

create function public.remove_friend(p_friendship_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
begin
  delete from public.friendships
   where id = p_friendship_id and (requester_id = v_uid or recipient_id = v_uid);
  if not found then
    raise exception 'FRIEND_REQUEST_NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

create function public.list_friends()
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
begin
  return jsonb_build_object(
    'friends', coalesce((
      select jsonb_agg(jsonb_build_object(
        'friendship_id', f.id, 'display_name', p.display_name, 'public_code', p.public_code,
        'since', f.updated_at
      ) order by lower(p.display_name))
        from public.friendships f
        join public.profiles p
          on p.id = case when f.requester_id = v_uid then f.recipient_id else f.requester_id end
       where f.status = 'accepted' and (f.requester_id = v_uid or f.recipient_id = v_uid)
    ), '[]'::jsonb),
    'incoming', coalesce((
      select jsonb_agg(jsonb_build_object(
        'friendship_id', f.id, 'display_name', p.display_name, 'public_code', p.public_code,
        'since', f.created_at
      ) order by f.created_at desc)
        from public.friendships f join public.profiles p on p.id = f.requester_id
       where f.status = 'pending' and f.recipient_id = v_uid
    ), '[]'::jsonb),
    'outgoing', coalesce((
      select jsonb_agg(jsonb_build_object(
        'friendship_id', f.id, 'display_name', p.display_name, 'public_code', p.public_code,
        'since', f.created_at
      ) order by f.created_at desc)
        from public.friendships f join public.profiles p on p.id = f.recipient_id
       where f.status = 'pending' and f.requester_id = v_uid
    ), '[]'::jsonb)
  );
end;
$$;

-- Comparaison : uniquement entre amis acceptés et si l'ami partage sa collection.
create function public.get_friend_comparison(p_public_code text)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_friend record;
begin
  select id, display_name, public_code, collection_visibility into v_friend
    from public.profiles where public_code = upper(btrim(coalesce(p_public_code, '')));
  if not found or not atlas_private.are_friends(v_uid, v_friend.id) then
    raise exception 'NOT_FRIENDS' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'friend', jsonb_build_object(
      'display_name', v_friend.display_name,
      'public_code', v_friend.public_code,
      'visible', v_friend.collection_visibility = 'friends',
      'stats', case when v_friend.collection_visibility = 'friends'
                    then atlas_private.player_stats(v_friend.id) end
    ),
    'me', atlas_private.player_stats(v_uid)
  );
end;
$$;

-- Défis -----------------------------------------------------------------------------------

create function atlas_private.generate_challenge_questions(
  p_challenge_id uuid, p_type public.challenge_type, p_continent public.continent, p_count integer
)
returns integer
language plpgsql
volatile
security definer
set search_path = ''
as $$
declare
  v_country record;
  v_position integer := 0;
  v_choices text[];
  v_correct text;
  v_correct_index integer;
  v_explanation text;
begin
  for v_country in
    select * from public.countries
     where status = 'published' and (p_continent is null or continent = p_continent)
     order by random()
     limit p_count
  loop
    v_position := v_position + 1;
    if p_type = 'capitals' then
      v_correct := v_country.capital;
      select array_agg(capital) into v_choices from (
        select v_correct as capital
        union all
        select * from (
          select c.capital from public.countries c
           where c.status = 'published' and c.iso_code <> v_country.iso_code and c.capital <> v_correct
           order by random() limit 3
        ) others
      ) s;
      v_explanation := format('%s est la capitale %s.', v_country.capital, v_country.name_genitive);
    else
      v_correct := atlas_private.continent_label(v_country.continent);
      select array_agg(atlas_private.continent_label(c)) into v_choices from (
        select v_country.continent as c
        union all
        select * from (
          select e from unnest(enum_range(null::public.continent)) e
           where e <> v_country.continent order by random() limit 3
        ) others
      ) s;
      v_explanation := format('%s se situe en %s (%s).',
        upper(left(v_country.name_with_article, 1)) || substr(v_country.name_with_article, 2),
        atlas_private.continent_label(v_country.continent), v_country.region);
    end if;

    if cardinality(v_choices) <> 4 then
      raise exception 'CHALLENGE_POOL_TOO_SMALL' using errcode = 'P0001';
    end if;

    select array_agg(x order by random()) into v_choices from unnest(v_choices) x;
    v_correct_index := array_position(v_choices, v_correct) - 1;

    insert into public.challenge_questions (challenge_id, position, prompt, choices)
    values (
      p_challenge_id, v_position,
      case when p_type = 'capitals'
           then format('Quelle est la capitale %s ?', v_country.name_genitive)
           else format('Sur quel continent se trouve %s ?', v_country.name_with_article) end,
      v_choices
    );
    insert into atlas_private.challenge_solutions (challenge_id, position, correct_choice, explanation)
    values (p_challenge_id, v_position, v_correct_index, v_explanation);
  end loop;
  return v_position;
end;
$$;

create function public.create_challenge(
  p_type text, p_continent text default null, p_friend_codes text[] default '{}'
)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_type public.challenge_type;
  v_continent public.continent;
  v_challenge_id uuid := gen_random_uuid();
  v_code text;
  v_friend uuid;
  v_friend_code text;
  v_count integer;
begin
  begin
    v_type := p_type::public.challenge_type;
    v_continent := nullif(p_continent, '')::public.continent;
  exception when invalid_text_representation then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end;
  if v_type = 'continents' and v_continent is not null then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;
  if cardinality(coalesce(p_friend_codes, '{}')) > 10 then
    raise exception 'TOO_MANY_INVITEES' using errcode = 'P0001';
  end if;
  if (
    select count(*) from public.challenges
     where creator_id = v_uid and created_at > now() - interval '1 day'
  ) >= 20 then
    raise exception 'CHALLENGE_RATE_LIMITED' using errcode = 'P0001';
  end if;

  loop
    v_code := atlas_private.generate_public_code();
    exit when not exists (select 1 from public.challenges where invite_code = v_code);
  end loop;

  insert into public.challenges (id, creator_id, challenge_type, configuration, invite_code, question_count, expires_at)
  values (
    v_challenge_id, v_uid, v_type,
    jsonb_build_object('continent', v_continent),
    v_code, 5, now() + interval '7 days'
  );

  v_count := atlas_private.generate_challenge_questions(v_challenge_id, v_type, v_continent, 5);
  if v_count < 5 then
    raise exception 'CHALLENGE_POOL_TOO_SMALL' using errcode = 'P0001';
  end if;

  insert into public.challenge_participants (challenge_id, user_id) values (v_challenge_id, v_uid);

  foreach v_friend_code in array coalesce(p_friend_codes, '{}') loop
    select id into v_friend from public.profiles where public_code = upper(btrim(v_friend_code));
    if v_friend is null or not atlas_private.are_friends(v_uid, v_friend) then
      raise exception 'NOT_FRIENDS' using errcode = 'P0001';
    end if;
    insert into public.challenge_participants (challenge_id, user_id)
    values (v_challenge_id, v_friend)
    on conflict do nothing;
  end loop;

  return jsonb_build_object('challenge_id', v_challenge_id, 'invite_code', v_code);
end;
$$;

-- Rejoindre via un lien d'invitation (refusé si le lien est révoqué ou expiré).
create function public.join_challenge(p_invite_code text)
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_challenge record;
begin
  select id, expires_at into v_challenge
    from public.challenges
   where invite_code = upper(btrim(coalesce(p_invite_code, '')))
   for update;
  if not found or v_challenge.expires_at <= now() then
    raise exception 'CHALLENGE_LINK_INVALID' using errcode = 'P0001';
  end if;
  if (select count(*) from public.challenge_participants where challenge_id = v_challenge.id) >= 20
     and not exists (
       select 1 from public.challenge_participants where challenge_id = v_challenge.id and user_id = v_uid
     ) then
    raise exception 'CHALLENGE_FULL' using errcode = 'P0001';
  end if;

  insert into public.challenge_participants (challenge_id, user_id)
  values (v_challenge.id, v_uid)
  on conflict do nothing;
  return jsonb_build_object('challenge_id', v_challenge.id);
end;
$$;

create function public.revoke_challenge_link(p_challenge_id uuid)
returns void
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
begin
  update public.challenges set invite_code = null where id = p_challenge_id and creator_id = v_uid;
  if not found then
    raise exception 'CHALLENGE_NOT_FOUND' using errcode = 'P0001';
  end if;
end;
$$;

create function public.get_challenge(p_challenge_id uuid)
returns jsonb
language plpgsql
stable
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_challenge record;
  v_me record;
begin
  select ch.*, p.display_name as creator_name into v_challenge
    from public.challenges ch join public.profiles p on p.id = ch.creator_id
   where ch.id = p_challenge_id;
  select * into v_me from public.challenge_participants where challenge_id = p_challenge_id and user_id = v_uid;
  if v_challenge.id is null or v_me.user_id is null then
    raise exception 'CHALLENGE_NOT_FOUND' using errcode = 'P0001';
  end if;

  return jsonb_build_object(
    'challenge_id', v_challenge.id,
    'challenge_type', v_challenge.challenge_type,
    'continent', v_challenge.configuration ->> 'continent',
    'creator_name', v_challenge.creator_name,
    'is_creator', v_challenge.creator_id = v_uid,
    'invite_code', case when v_challenge.creator_id = v_uid then v_challenge.invite_code end,
    'expires_at', v_challenge.expires_at,
    'expired', v_challenge.expires_at <= now(),
    'question_count', v_challenge.question_count,
    'questions', (
      select jsonb_agg(jsonb_build_object('position', q.position, 'prompt', q.prompt, 'choices', q.choices)
                       order by q.position)
        from public.challenge_questions q where q.challenge_id = p_challenge_id
    ),
    'my_result', case when v_me.completed_at is not null then
      jsonb_build_object('score', v_me.score, 'completed_at', v_me.completed_at, 'details', v_me.result_payload)
    end,
    -- Les scores des autres ne sont visibles qu'après avoir soi-même terminé le défi.
    'participants', (
      select jsonb_agg(jsonb_build_object(
        'display_name', p.display_name,
        'is_me', cp.user_id = v_uid,
        'completed', cp.completed_at is not null,
        'score', case when v_me.completed_at is not null or cp.user_id = v_uid then cp.score end
      ) order by cp.score desc nulls last, cp.joined_at)
        from public.challenge_participants cp join public.profiles p on p.id = cp.user_id
       where cp.challenge_id = p_challenge_id
    )
  );
end;
$$;

create function public.list_challenges()
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
      'challenge_id', ch.id,
      'challenge_type', ch.challenge_type,
      'continent', ch.configuration ->> 'continent',
      'creator_name', p.display_name,
      'is_creator', ch.creator_id = v_uid,
      'created_at', ch.created_at,
      'expires_at', ch.expires_at,
      'expired', ch.expires_at <= now(),
      'completed', me.completed_at is not null,
      'my_score', me.score,
      'question_count', ch.question_count,
      'participant_count', (select count(*) from public.challenge_participants x where x.challenge_id = ch.id)
    ) order by ch.created_at desc)
      from public.challenge_participants me
      join public.challenges ch on ch.id = me.challenge_id
      join public.profiles p on p.id = ch.creator_id
     where me.user_id = v_uid
  ), '[]'::jsonb);
end;
$$;

create function public.submit_challenge(p_challenge_id uuid, p_answers integer[])
returns jsonb
language plpgsql
security definer
set search_path = ''
as $$
declare
  v_uid uuid := atlas_private.require_user();
  v_challenge record;
  v_completed timestamptz;
  v_score integer := 0;
  v_details jsonb := '[]'::jsonb;
  v_solution record;
  v_answer integer;
begin
  select * into v_challenge from public.challenges where id = p_challenge_id;
  select completed_at into v_completed
    from public.challenge_participants
   where challenge_id = p_challenge_id and user_id = v_uid
   for update;
  if v_challenge.id is null or not found then
    raise exception 'CHALLENGE_NOT_FOUND' using errcode = 'P0001';
  end if;
  if v_completed is not null then
    raise exception 'CHALLENGE_ALREADY_COMPLETED' using errcode = 'P0001';
  end if;
  if v_challenge.expires_at <= now() then
    raise exception 'CHALLENGE_EXPIRED' using errcode = 'P0001';
  end if;
  if p_answers is null or cardinality(p_answers) <> v_challenge.question_count then
    raise exception 'INVALID_ARGUMENT' using errcode = 'P0001';
  end if;

  for v_solution in
    select * from atlas_private.challenge_solutions where challenge_id = p_challenge_id order by position
  loop
    v_answer := p_answers[v_solution.position];
    if v_answer is not null and (v_answer < 0 or v_answer > 3) then
      raise exception 'INVALID_CHOICE' using errcode = 'P0001';
    end if;
    if v_answer = v_solution.correct_choice then
      v_score := v_score + 1;
    end if;
    v_details := v_details || jsonb_build_array(jsonb_build_object(
      'position', v_solution.position,
      'chosen', v_answer,
      'correct_choice', v_solution.correct_choice,
      'explanation', v_solution.explanation
    ));
  end loop;

  update public.challenge_participants
     set score = v_score, completed_at = now(), result_payload = v_details
   where challenge_id = p_challenge_id and user_id = v_uid;

  return jsonb_build_object('score', v_score, 'total', v_challenge.question_count, 'details', v_details);
end;
$$;

revoke all on function public.send_friend_request(text) from public, anon;
revoke all on function public.respond_friend_request(uuid, boolean) from public, anon;
revoke all on function public.remove_friend(uuid) from public, anon;
revoke all on function public.list_friends() from public, anon;
revoke all on function public.get_friend_comparison(text) from public, anon;
revoke all on function public.create_challenge(text, text, text[]) from public, anon;
revoke all on function public.join_challenge(text) from public, anon;
revoke all on function public.revoke_challenge_link(uuid) from public, anon;
revoke all on function public.get_challenge(uuid) from public, anon;
revoke all on function public.list_challenges() from public, anon;
revoke all on function public.submit_challenge(uuid, integer[]) from public, anon;
grant execute on function public.send_friend_request(text) to authenticated;
grant execute on function public.respond_friend_request(uuid, boolean) to authenticated;
grant execute on function public.remove_friend(uuid) to authenticated;
grant execute on function public.list_friends() to authenticated;
grant execute on function public.get_friend_comparison(text) to authenticated;
grant execute on function public.create_challenge(text, text, text[]) to authenticated;
grant execute on function public.join_challenge(text) to authenticated;
grant execute on function public.revoke_challenge_link(uuid) to authenticated;
grant execute on function public.get_challenge(uuid) to authenticated;
grant execute on function public.list_challenges() to authenticated;
grant execute on function public.submit_challenge(uuid, integer[]) to authenticated;
