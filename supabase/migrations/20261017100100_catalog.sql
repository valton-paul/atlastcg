-- Atlas — catalogue de référence : raretés, pays, cartes, collections, paquets, expéditions,
-- objectifs et réglages économiques. Lecture publique des éléments publiés, aucune écriture client.

create table public.rarities (
  rarity public.card_rarity primary key,
  rank smallint not null unique check (rank between 1 and 5),
  label text not null check (length(btrim(label)) > 0),
  duplicate_fragments integer not null check (duplicate_fragments >= 0),
  updated_at timestamptz not null default now()
);

create table public.countries (
  iso_code text primary key check (iso_code ~ '^[A-Z]{2}$'),
  iso_numeric text not null unique check (iso_numeric ~ '^[0-9]{3}$'),
  name text not null check (length(btrim(name)) > 0),
  -- Formes grammaticales pour les textes générés : « le Japon », « du Japon ».
  name_with_article text not null check (length(btrim(name_with_article)) > 0),
  name_genitive text not null check (length(btrim(name_genitive)) > 0),
  capital text not null check (length(btrim(capital)) > 0),
  continent public.continent not null,
  region text not null check (length(btrim(region)) > 0),
  status public.content_status not null default 'draft',
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);
create index countries_continent_idx on public.countries (continent);

create table public.cards (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) between 1 and 80),
  subtitle text,
  category public.card_category not null,
  rarity public.card_rarity not null references public.rarities (rarity),
  country_code text references public.countries (iso_code) on update cascade,
  illustration_path text check (
    illustration_path is null or illustration_path ~ '^[a-z0-9][a-z0-9/_.-]*\.(webp|png|jpg)$'
  ),
  illustration_credit text,
  status public.content_status not null default 'draft',
  content_version integer not null default 1 check (content_version >= 1),
  published_at timestamptz,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint cards_country_required check (category = 'special' or country_code is not null),
  constraint cards_published_at_required check (status <> 'published' or published_at is not null)
);
create index cards_country_idx on public.cards (country_code);
create index cards_pool_idx on public.cards (rarity, category) where status = 'published';

-- Contenu éditorial séparé : il n'est lisible que par les joueurs qui possèdent la carte.
create table public.card_contents (
  card_id uuid primary key references public.cards (id) on delete cascade,
  discovery_text text not null check (length(btrim(discovery_text)) > 0),
  fun_fact text,
  sources text[] not null default '{}',
  updated_at timestamptz not null default now()
);

create type public.collection_type as enum ('geographic', 'cultural', 'thematic');

create table public.collections (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null check (length(btrim(title)) > 0),
  description text not null,
  collection_type public.collection_type not null,
  continent public.continent,
  status public.content_status not null default 'draft',
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.collection_cards (
  collection_id uuid not null references public.collections (id) on delete cascade,
  card_id uuid not null references public.cards (id) on delete restrict,
  position smallint not null default 0,
  primary key (collection_id, card_id)
);
create index collection_cards_card_idx on public.collection_cards (card_id);

create table public.pack_definitions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  name text not null check (length(btrim(name)) > 0),
  description text not null,
  status public.content_status not null default 'draft',
  cards_per_pack smallint not null check (cards_per_pack between 1 and 10),
  card_categories public.card_category[] check (card_categories is null or cardinality(card_categories) > 0),
  continent public.continent,
  collection_id uuid references public.collections (id),
  configuration_version integer not null default 1 check (configuration_version >= 1),
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

-- Probabilités versionnées : une nouvelle configuration = nouvelles lignes + incrément de
-- `pack_definitions.configuration_version`. Les anciennes versions restent pour l'historique.
create table public.pack_drop_rates (
  pack_id uuid not null references public.pack_definitions (id) on delete cascade,
  configuration_version integer not null check (configuration_version >= 1),
  rarity public.card_rarity not null references public.rarities (rarity),
  probability numeric(7, 6) not null check (probability > 0 and probability <= 1),
  created_at timestamptz not null default now(),
  primary key (pack_id, configuration_version, rarity)
);

create type public.expedition_step_kind as enum ('locate', 'discover', 'quiz');

create table public.expeditions (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  country_code text not null unique references public.countries (iso_code) on update cascade,
  title text not null,
  summary text not null,
  status public.content_status not null default 'draft',
  reward_pack_id uuid not null references public.pack_definitions (id),
  reward_pack_quantity smallint not null default 1 check (reward_pack_quantity between 1 and 5),
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now()
);

create table public.expedition_steps (
  id uuid primary key default gen_random_uuid(),
  expedition_id uuid not null references public.expeditions (id) on delete cascade,
  position smallint not null check (position between 1 and 10),
  kind public.expedition_step_kind not null,
  title text not null,
  prompt text not null,
  body text,
  choices text[],
  explanation text not null,
  unique (expedition_id, position),
  constraint expedition_steps_choices check (
    (kind = 'discover' and choices is null)
    or (kind <> 'discover' and cardinality(choices) between 2 and 4)
  )
);

-- Bonnes réponses : jamais exposées au client.
create table atlas_private.expedition_step_solutions (
  step_id uuid primary key references public.expedition_steps (id) on delete cascade,
  correct_choice smallint not null check (correct_choice >= 0)
);

create type public.objective_kind as enum (
  'cards_owned', 'countries_discovered', 'continents_discovered', 'expeditions_completed',
  'collection_completed'
);

create table public.objectives (
  id uuid primary key default gen_random_uuid(),
  slug text not null unique check (slug ~ '^[a-z0-9]+(-[a-z0-9]+)*$'),
  title text not null,
  description text not null,
  kind public.objective_kind not null,
  target integer not null check (target >= 1),
  collection_id uuid references public.collections (id),
  reward_pack_id uuid not null references public.pack_definitions (id),
  reward_pack_quantity smallint not null default 1 check (reward_pack_quantity between 1 and 5),
  status public.content_status not null default 'draft',
  position smallint not null default 0,
  created_at timestamptz not null default now(),
  updated_at timestamptz not null default now(),
  constraint objectives_collection_kind check ((kind = 'collection_completed') = (collection_id is not null))
);

-- Réglages économiques modifiables sans nouvelle version de l'application.
create table public.economy_settings (
  key text primary key check (key ~ '^[a-z_]+$'),
  value jsonb not null,
  description text not null,
  updated_at timestamptz not null default now()
);

create function atlas_private.setting(p_key text)
returns jsonb
language plpgsql
stable
set search_path = ''
as $$
declare
  v_value jsonb;
begin
  select value into v_value from public.economy_settings where key = p_key;
  if v_value is null then
    raise exception 'SETTING_MISSING' using errcode = 'P0001', detail = p_key;
  end if;
  return v_value;
end;
$$;

-- Validation : la somme des probabilités d'une configuration vaut exactement 1.
create function atlas_private.check_drop_rates_sum()
returns trigger
language plpgsql
set search_path = ''
as $$
declare
  v_pack uuid;
  v_version integer;
  v_sum numeric;
  v_count integer;
begin
  if tg_op = 'DELETE' then
    v_pack := old.pack_id;
    v_version := old.configuration_version;
  else
    v_pack := new.pack_id;
    v_version := new.configuration_version;
  end if;

  select coalesce(sum(probability), 0), count(*)
    into v_sum, v_count
    from public.pack_drop_rates
   where pack_id = v_pack and configuration_version = v_version;

  if v_count > 0 and v_sum <> 1 then
    raise exception 'DROP_RATES_MUST_SUM_TO_ONE' using
      errcode = 'P0001',
      detail = format('pack %s, version %s, somme %s', v_pack, v_version, v_sum);
  end if;
  return null;
end;
$$;

create constraint trigger pack_drop_rates_sum_check
  after insert or update or delete on public.pack_drop_rates
  deferrable initially deferred
  for each row execute function atlas_private.check_drop_rates_sum();

-- Validation : un paquet publié dispose de probabilités pour sa version active.
create function atlas_private.check_pack_has_rates()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  if new.status = 'published' and not exists (
    select 1 from public.pack_drop_rates
     where pack_id = new.id and configuration_version = new.configuration_version
  ) then
    raise exception 'PACK_MISCONFIGURED' using
      errcode = 'P0001',
      detail = format('paquet %s sans probabilités pour la version %s', new.slug, new.configuration_version);
  end if;
  return null;
end;
$$;

create constraint trigger pack_definitions_rates_check
  after insert or update on public.pack_definitions
  deferrable initially deferred
  for each row execute function atlas_private.check_pack_has_rates();

-- updated_at ------------------------------------------------------------------

create trigger rarities_updated_at before update on public.rarities
  for each row execute function atlas_private.set_updated_at();
create trigger countries_updated_at before update on public.countries
  for each row execute function atlas_private.set_updated_at();
create trigger cards_updated_at before update on public.cards
  for each row execute function atlas_private.set_updated_at();
create trigger card_contents_updated_at before update on public.card_contents
  for each row execute function atlas_private.set_updated_at();
create trigger collections_updated_at before update on public.collections
  for each row execute function atlas_private.set_updated_at();
create trigger pack_definitions_updated_at before update on public.pack_definitions
  for each row execute function atlas_private.set_updated_at();
create trigger expeditions_updated_at before update on public.expeditions
  for each row execute function atlas_private.set_updated_at();
create trigger objectives_updated_at before update on public.objectives
  for each row execute function atlas_private.set_updated_at();
create trigger economy_settings_updated_at before update on public.economy_settings
  for each row execute function atlas_private.set_updated_at();

-- Audit des réglages de jeu -------------------------------------------------------

create trigger rarities_audit after insert or update or delete on public.rarities
  for each row execute function atlas_private.audit_config_change();
create trigger pack_definitions_audit after insert or update or delete on public.pack_definitions
  for each row execute function atlas_private.audit_config_change();
create trigger pack_drop_rates_audit after insert or update or delete on public.pack_drop_rates
  for each row execute function atlas_private.audit_config_change();
create trigger expeditions_audit after insert or update or delete on public.expeditions
  for each row execute function atlas_private.audit_config_change();
create trigger objectives_audit after insert or update or delete on public.objectives
  for each row execute function atlas_private.audit_config_change();
create trigger economy_settings_audit after insert or update or delete on public.economy_settings
  for each row execute function atlas_private.audit_config_change();

-- Privilèges et RLS ---------------------------------------------------------------
-- Aucune écriture n'est possible depuis les rôles client : le catalogue est géré par migrations/seed.

revoke all on table
  public.rarities, public.countries, public.cards, public.card_contents, public.collections,
  public.collection_cards, public.pack_definitions, public.pack_drop_rates, public.expeditions,
  public.expedition_steps, public.objectives, public.economy_settings
from anon, authenticated;

grant select on table
  public.rarities, public.countries, public.cards, public.collections, public.collection_cards,
  public.pack_definitions, public.pack_drop_rates, public.expeditions, public.objectives,
  public.economy_settings
to anon, authenticated;
grant select on table public.card_contents, public.expedition_steps to authenticated;

alter table public.rarities enable row level security;
alter table public.countries enable row level security;
alter table public.cards enable row level security;
alter table public.card_contents enable row level security;
alter table public.collections enable row level security;
alter table public.collection_cards enable row level security;
alter table public.pack_definitions enable row level security;
alter table public.pack_drop_rates enable row level security;
alter table public.expeditions enable row level security;
alter table public.expedition_steps enable row level security;
alter table public.objectives enable row level security;
alter table public.economy_settings enable row level security;
alter table atlas_private.config_audit_log enable row level security;
alter table atlas_private.expedition_step_solutions enable row level security;

create policy "rarities readable" on public.rarities
  for select to anon, authenticated using (true);
create policy "published countries readable" on public.countries
  for select to anon, authenticated using (status = 'published');
create policy "published collections readable" on public.collections
  for select to anon, authenticated using (status = 'published');
create policy "published packs readable" on public.pack_definitions
  for select to anon, authenticated using (status = 'published');
create policy "rates of published packs readable" on public.pack_drop_rates
  for select to anon, authenticated using (
    exists (
      select 1 from public.pack_definitions p
       where p.id = pack_drop_rates.pack_id and p.status = 'published'
    )
  );
create policy "published expeditions readable" on public.expeditions
  for select to anon, authenticated using (status = 'published');
create policy "published objectives readable" on public.objectives
  for select to anon, authenticated using (status = 'published');
create policy "economy settings readable" on public.economy_settings
  for select to anon, authenticated using (true);
