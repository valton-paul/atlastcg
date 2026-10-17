-- Atlas — fondations : schéma privé, durcissement des privilèges, types partagés, utilitaires.

-- Schéma non exposé par l'API (PostgREST n'expose que `public`).
create schema if not exists atlas_private;
revoke all on schema atlas_private from public;

-- Supabase accorde par défaut EXECUTE sur toute nouvelle fonction à PUBLIC, anon et authenticated.
-- On inverse ce comportement : chaque RPC doit être explicitement ouverte à `authenticated`.
alter default privileges revoke execute on functions from public;
alter default privileges in schema public revoke execute on functions from public, anon, authenticated;
alter default privileges in schema atlas_private revoke execute on functions from public, anon, authenticated;

-- Types partagés -------------------------------------------------------------

create type public.content_status as enum ('draft', 'review', 'published', 'archived');
create type public.card_rarity as enum ('common', 'uncommon', 'rare', 'epic', 'legendary');
create type public.card_category as enum (
  'country', 'capital', 'culture', 'monument', 'geography', 'history', 'special'
);
create type public.continent as enum (
  'africa', 'asia', 'europe', 'north_america', 'south_america', 'oceania'
);

-- Utilitaires ----------------------------------------------------------------

create function atlas_private.set_updated_at()
returns trigger
language plpgsql
set search_path = ''
as $$
begin
  new.updated_at := now();
  return new;
end;
$$;

-- Journal d'audit des modifications de configuration (probabilités, récompenses, réglages).
create table atlas_private.config_audit_log (
  id bigint generated always as identity primary key,
  table_name text not null,
  operation text not null,
  row_data jsonb,
  previous_data jsonb,
  actor text not null,
  changed_at timestamptz not null default now()
);

create function atlas_private.audit_config_change()
returns trigger
language plpgsql
security definer
set search_path = ''
as $$
begin
  insert into atlas_private.config_audit_log (table_name, operation, row_data, previous_data, actor)
  values (
    tg_table_name,
    tg_op,
    case when tg_op <> 'DELETE' then to_jsonb(new) end,
    case when tg_op <> 'INSERT' then to_jsonb(old) end,
    coalesce(auth.uid()::text, current_user)
  );
  return null;
end;
$$;

-- Garantit l'authentification de l'appelant d'une RPC et renvoie son identifiant.
create function atlas_private.require_user()
returns uuid
language plpgsql
stable
set search_path = ''
as $$
declare
  v_uid uuid := auth.uid();
begin
  if v_uid is null then
    raise exception 'NOT_AUTHENTICATED' using errcode = 'P0001';
  end if;
  return v_uid;
end;
$$;
