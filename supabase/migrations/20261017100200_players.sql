-- Atlas — données joueur. Les clients peuvent uniquement LIRE leurs propres lignes ;
-- toutes les écritures passent par des fonctions `security definer` contrôlées.

create type public.profile_visibility as enum ('friends', 'private');

create table public.profiles (
  id uuid primary key references auth.users (id) on delete cascade,
  display_name text not null check (
    display_name = btrim(display_name)
    and display_name ~ '^[A-Za-z0-9À-ÖØ-öø-ÿ _.-]{3,24}$'
  ),
  public_code text not null unique check (public_code ~ '^[A-HJ-NP-Z2-9]{8}$'),
  collection_visibility public.profile_visibility not null default 'friends',
  onboarding_completed_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create unique index profiles_display_name_lower_idx on public.profiles (lower(display_name));

create table public.player_wallets (
  user_id uuid primary key references auth.users (id) on delete cascade,
  fragments integer not null default 0 check (fragments >= 0),
  updated_at timestamptz not null default now()
);

create type public.ledger_reason as enum ('duplicate_compensation', 'fragment_exchange');

create table public.resource_ledger (
  id bigint generated always as identity primary key,
  user_id uuid not null references auth.users (id) on delete cascade,
  delta integer not null check (delta <> 0),
  balance_after integer not null check (balance_after >= 0),
  reason public.ledger_reason not null,
  reference_id uuid,
  created_at timestamptz not null default now()
);
create index resource_ledger_user_idx on public.resource_ledger (user_id, created_at desc);

create type public.reward_source as enum ('starter', 'expedition', 'objective', 'daily', 'fragment_exchange');

-- Registre d'idempotence des récompenses : une clé (ex. `expedition:<id>`) ne peut être attribuée
-- qu'une seule fois par joueur, quelle que soit la concurrence des requêtes.
create table public.reward_grants (
  user_id uuid not null references auth.users (id) on delete cascade,
  grant_key text not null check (length(grant_key) between 3 and 120),
  source public.reward_source not null,
  reference_id uuid,
  payload jsonb not null default '{}'::jsonb,
  granted_at timestamptz not null default now(),
  primary key (user_id, grant_key)
);

create type public.user_pack_status as enum ('available', 'opened');

create table public.user_packs (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  pack_id uuid not null references public.pack_definitions (id),
  status public.user_pack_status not null default 'available',
  source public.reward_source not null,
  grant_key text not null,
  created_at timestamptz not null default now(),
  opened_at timestamptz,
  foreign key (user_id, grant_key) references public.reward_grants (user_id, grant_key) on delete cascade,
  constraint user_packs_opened_at check ((status = 'opened') = (opened_at is not null))
);
create index user_packs_user_status_idx on public.user_packs (user_id, status, created_at);

-- Une ouverture n'existe qu'une fois terminée (transaction atomique) : pas d'état intermédiaire.
create table public.pack_openings (
  id uuid primary key default gen_random_uuid(),
  user_id uuid not null references auth.users (id) on delete cascade,
  user_pack_id uuid not null unique references public.user_packs (id) on delete cascade,
  pack_id uuid not null references public.pack_definitions (id),
  idempotency_key uuid not null,
  configuration_version integer not null,
  result_payload jsonb not null,
  created_at timestamptz not null default now(),
  unique (user_id, idempotency_key)
);
create index pack_openings_user_idx on public.pack_openings (user_id, created_at desc);

create table public.pack_opening_cards (
  opening_id uuid not null references public.pack_openings (id) on delete cascade,
  slot smallint not null check (slot >= 1),
  card_id uuid not null references public.cards (id),
  rarity public.card_rarity not null,
  is_new boolean not null,
  fragments_awarded integer not null default 0 check (fragments_awarded >= 0),
  primary key (opening_id, slot)
);
create index pack_opening_cards_card_idx on public.pack_opening_cards (card_id);

create table public.user_cards (
  user_id uuid not null references auth.users (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  quantity integer not null check (quantity >= 1),
  first_acquired_at timestamptz not null default now(),
  last_acquired_at timestamptz not null default now(),
  seen_at timestamptz,
  primary key (user_id, card_id)
);
create index user_cards_card_idx on public.user_cards (card_id);

create type public.expedition_status as enum ('in_progress', 'completed');

create table public.user_expeditions (
  user_id uuid not null references auth.users (id) on delete cascade,
  expedition_id uuid not null references public.expeditions (id) on delete restrict,
  status public.expedition_status not null default 'in_progress',
  started_at timestamptz not null default now(),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, expedition_id),
  constraint user_expeditions_completed_at check ((status = 'completed') = (completed_at is not null))
);
create index user_expeditions_expedition_idx on public.user_expeditions (expedition_id);

create table public.user_expedition_steps (
  user_id uuid not null,
  step_id uuid not null references public.expedition_steps (id) on delete cascade,
  expedition_id uuid not null,
  attempts integer not null default 0 check (attempts >= 0),
  completed_at timestamptz,
  updated_at timestamptz not null default now(),
  primary key (user_id, step_id),
  foreign key (user_id, expedition_id)
    references public.user_expeditions (user_id, expedition_id) on delete cascade
);

create trigger profiles_updated_at before update on public.profiles
  for each row execute function atlas_private.set_updated_at();
create trigger player_wallets_updated_at before update on public.player_wallets
  for each row execute function atlas_private.set_updated_at();
create trigger user_expeditions_updated_at before update on public.user_expeditions
  for each row execute function atlas_private.set_updated_at();
create trigger user_expedition_steps_updated_at before update on public.user_expedition_steps
  for each row execute function atlas_private.set_updated_at();

-- Privilèges --------------------------------------------------------------------------

revoke all on table
  public.profiles, public.player_wallets, public.resource_ledger, public.reward_grants,
  public.user_packs, public.pack_openings, public.pack_opening_cards, public.user_cards,
  public.user_expeditions, public.user_expedition_steps
from anon, authenticated;

grant select on table
  public.profiles, public.player_wallets, public.resource_ledger, public.reward_grants,
  public.user_packs, public.pack_openings, public.pack_opening_cards, public.user_cards,
  public.user_expeditions, public.user_expedition_steps
to authenticated;

-- Seuls ces champs du profil sont modifiables par le joueur lui-même.
grant update (display_name, collection_visibility) on table public.profiles to authenticated;

alter table public.profiles enable row level security;
alter table public.player_wallets enable row level security;
alter table public.resource_ledger enable row level security;
alter table public.reward_grants enable row level security;
alter table public.user_packs enable row level security;
alter table public.pack_openings enable row level security;
alter table public.pack_opening_cards enable row level security;
alter table public.user_cards enable row level security;
alter table public.user_expeditions enable row level security;
alter table public.user_expedition_steps enable row level security;

create policy "own profile readable" on public.profiles
  for select to authenticated using (id = (select auth.uid()));
create policy "own profile editable" on public.profiles
  for update to authenticated
  using (id = (select auth.uid()))
  with check (id = (select auth.uid()));
create policy "own wallet readable" on public.player_wallets
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own ledger readable" on public.resource_ledger
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own grants readable" on public.reward_grants
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own packs readable" on public.user_packs
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own openings readable" on public.pack_openings
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own opening cards readable" on public.pack_opening_cards
  for select to authenticated using (
    exists (
      select 1 from public.pack_openings o
       where o.id = pack_opening_cards.opening_id and o.user_id = (select auth.uid())
    )
  );
create policy "own cards readable" on public.user_cards
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own expeditions readable" on public.user_expeditions
  for select to authenticated using (user_id = (select auth.uid()));
create policy "own expedition steps readable" on public.user_expedition_steps
  for select to authenticated using (user_id = (select auth.uid()));

-- Politiques du catalogue qui dépendent des données joueur -------------------------------

-- Une carte archivée reste visible pour ceux qui la possèdent (aucune carte acquise ne disparaît).
create policy "published cards readable by visitors" on public.cards
  for select to anon using (status = 'published');
create policy "published or owned cards readable" on public.cards
  for select to authenticated using (
    status = 'published'
    or (
      status = 'archived'
      and exists (
        select 1 from public.user_cards uc
         where uc.card_id = cards.id and uc.user_id = (select auth.uid())
      )
    )
  );

-- Le texte de découverte n'est révélé qu'une fois la carte obtenue.
create policy "contents of owned cards readable" on public.card_contents
  for select to authenticated using (
    exists (
      select 1 from public.user_cards uc
       where uc.card_id = card_contents.card_id and uc.user_id = (select auth.uid())
    )
  );

create policy "collection cards readable" on public.collection_cards
  for select to anon, authenticated using (
    exists (
      select 1 from public.collections c
       where c.id = collection_cards.collection_id and c.status = 'published'
    )
  );

-- Les étapes d'une expédition ne sont lisibles qu'après son démarrage.
create policy "steps of started expeditions readable" on public.expedition_steps
  for select to authenticated using (
    exists (
      select 1 from public.user_expeditions ue
       where ue.expedition_id = expedition_steps.expedition_id
         and ue.user_id = (select auth.uid())
    )
  );
