import type { Catalog } from './catalog';

function lit(value: string | null | undefined): string {
  if (value === null || value === undefined) return 'null';
  return `'${value.replace(/'/g, "''")}'`;
}

function textArray(values: string[] | null): string {
  if (!values) return 'null';
  return `array[${values.map(lit).join(', ')}]::text[]`;
}

function jsonb(value: unknown): string {
  return `${lit(JSON.stringify(value))}::jsonb`;
}

/**
 * Génère un script SQL idempotent (upserts) qui publie le catalogue.
 * Il ne supprime jamais de carte : retirer une carte du contenu impose de l'archiver en base.
 */
export function renderSeedSql(catalog: Catalog): string {
  const { game } = catalog;
  const out: string[] = [];
  const push = (sql: string) => out.push(sql.trim(), '');

  out.push('-- Fichier généré par `npm run content:build` — ne pas modifier à la main.', '');
  out.push('begin;', '');

  push(`
insert into public.rarities (rarity, rank, label, duplicate_fragments) values
${game.rarities.map((r) => `  (${lit(r.rarity)}, ${r.rank}, ${lit(r.label)}, ${r.duplicateFragments})`).join(',\n')}
on conflict (rarity) do update set
  rank = excluded.rank, label = excluded.label, duplicate_fragments = excluded.duplicate_fragments;`);

  push(`
insert into public.countries (iso_code, iso_numeric, name, name_with_article, name_genitive, capital, continent, region, status) values
${catalog.countries
  .map(
    (c) =>
      `  (${lit(c.iso)}, ${lit(c.isoNumeric)}, ${lit(c.name)}, ${lit(c.nameWithArticle)}, ${lit(c.nameGenitive)}, ${lit(c.capital)}, ${lit(c.continent)}, ${lit(c.region)}, 'published')`,
  )
  .join(',\n')}
on conflict (iso_code) do update set
  iso_numeric = excluded.iso_numeric, name = excluded.name, name_with_article = excluded.name_with_article,
  name_genitive = excluded.name_genitive, capital = excluded.capital, continent = excluded.continent,
  region = excluded.region, status = excluded.status;`);

  push(`
insert into public.cards (slug, title, subtitle, category, rarity, country_code, illustration_path, illustration_credit, status, published_at) values
${catalog.cards
  .map(
    (c) =>
      `  (${lit(c.slug)}, ${lit(c.title)}, ${lit(c.subtitle)}, ${lit(c.category)}, ${lit(c.rarity)}, ${lit(c.countryCode)}, ${lit(c.illustrationPath)}, ${lit(c.illustrationCredit)}, 'published', now())`,
  )
  .join(',\n')}
on conflict (slug) do update set
  title = excluded.title, subtitle = excluded.subtitle, category = excluded.category, rarity = excluded.rarity,
  country_code = excluded.country_code, illustration_path = excluded.illustration_path,
  illustration_credit = excluded.illustration_credit, status = excluded.status,
  published_at = coalesce(public.cards.published_at, excluded.published_at),
  content_version = public.cards.content_version + case
    when (public.cards.title, public.cards.subtitle, public.cards.category, public.cards.rarity)
         is distinct from (excluded.title, excluded.subtitle, excluded.category, excluded.rarity)
    then 1 else 0 end;`);

  push(`
insert into public.card_contents (card_id, discovery_text, fun_fact, sources)
select c.id, v.discovery_text, v.fun_fact, v.sources
  from (values
${catalog.cards
  .map((c) => `    (${lit(c.slug)}, ${lit(c.discoveryText)}, ${lit(c.funFact)}, ${textArray(c.sources)})`)
  .join(',\n')}
  ) as v (slug, discovery_text, fun_fact, sources)
  join public.cards c on c.slug = v.slug
on conflict (card_id) do update set
  discovery_text = excluded.discovery_text, fun_fact = excluded.fun_fact, sources = excluded.sources;`);

  push(`
insert into public.collections (slug, title, description, collection_type, continent, status, position) values
${game.collections
  .map(
    (c, i) =>
      `  (${lit(c.slug)}, ${lit(c.title)}, ${lit(c.description)}, ${lit(c.type)}, ${lit(c.rule.continent ?? null)}, 'published', ${i + 1})`,
  )
  .join(',\n')}
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, collection_type = excluded.collection_type,
  continent = excluded.continent, status = excluded.status, position = excluded.position;`);

  push(`
delete from public.collection_cards
 where collection_id in (select id from public.collections where slug in (${game.collections.map((c) => lit(c.slug)).join(', ')}));`);

  push(`
insert into public.collection_cards (collection_id, card_id, position)
select col.id, c.id, v.position
  from (values
${catalog.collections
  .flatMap((col) => col.cardSlugs.map((slug, i) => `    (${lit(col.slug)}, ${lit(slug)}, ${i + 1})`))
  .join(',\n')}
  ) as v (collection_slug, card_slug, position)
  join public.collections col on col.slug = v.collection_slug
  join public.cards c on c.slug = v.card_slug;`);

  push(`
insert into public.pack_definitions (slug, name, description, status, cards_per_pack, card_categories, configuration_version, position) values
${game.packs
  .map(
    (p) =>
      `  (${lit(p.slug)}, ${lit(p.name)}, ${lit(p.description)}, 'published', ${p.cardsPerPack}, ${
        p.categories ? `array[${p.categories.map(lit).join(', ')}]::public.card_category[]` : 'null'
      }, ${p.configurationVersion}, ${p.position})`,
  )
  .join(',\n')}
on conflict (slug) do update set
  name = excluded.name, description = excluded.description, status = excluded.status,
  cards_per_pack = excluded.cards_per_pack, card_categories = excluded.card_categories,
  configuration_version = excluded.configuration_version, position = excluded.position;

-- Les paquets retirés du catalogue restent en base (inventaires existants) mais ne sont plus proposés.
update public.pack_definitions
   set status = 'archived'
 where status = 'published'
   and slug not in (${game.packs.map((p) => lit(p.slug)).join(', ')});`);

  const rates = game.packs.flatMap((p) =>
    Object.entries(p.dropRates).map(
      ([rarity, probability]) => `    (${lit(p.slug)}, ${p.configurationVersion}, ${lit(rarity)}, ${probability})`,
    ),
  );
  push(`
create temporary table seed_drop_rates (pack_slug text, configuration_version int, rarity public.card_rarity, probability numeric) on commit drop;
insert into seed_drop_rates values
${rates.join(',\n')};

insert into public.pack_drop_rates (pack_id, configuration_version, rarity, probability)
select p.id, s.configuration_version, s.rarity, s.probability
  from seed_drop_rates s join public.pack_definitions p on p.slug = s.pack_slug
on conflict (pack_id, configuration_version, rarity) do nothing;

-- Une version publiée est immuable : toute modification des probabilités impose une nouvelle version.
do $$
begin
  if exists (
    select 1
      from public.pack_definitions p
      join public.pack_drop_rates r on r.pack_id = p.id
      left join seed_drop_rates s
        on s.pack_slug = p.slug and s.configuration_version = r.configuration_version and s.rarity = r.rarity
     where r.configuration_version = p.configuration_version
       and p.slug in (select distinct pack_slug from seed_drop_rates)
       and (s.probability is null or s.probability <> r.probability)
  ) then
    raise exception 'DROP_RATES_CHANGED_WITHOUT_VERSION_BUMP';
  end if;
end;
$$;`);

  push(`
insert into public.economy_settings (key, value, description) values
${Object.entries(game.settings)
  .map(([key, s]) => `  (${lit(key)}, ${jsonb(s.value)}, ${lit(s.description)})`)
  .join(',\n')}
on conflict (key) do update set value = excluded.value, description = excluded.description;`);

  push(`
insert into public.expeditions (slug, country_code, title, summary, status, reward_pack_id, reward_pack_quantity)
select v.slug, v.country_code, v.title, v.summary, 'published', p.id, ${game.expeditionReward.quantity}
  from (values
${catalog.expeditions
  .map((e) => `    (${lit(e.slug)}, ${lit(e.countryCode)}, ${lit(e.title)}, ${lit(e.summary)})`)
  .join(',\n')}
  ) as v (slug, country_code, title, summary)
  join public.pack_definitions p on p.slug = ${lit(game.expeditionReward.pack)}
on conflict (slug) do update set
  country_code = excluded.country_code, title = excluded.title, summary = excluded.summary,
  status = excluded.status, reward_pack_id = excluded.reward_pack_id,
  reward_pack_quantity = excluded.reward_pack_quantity;`);

  const steps = catalog.expeditions.flatMap((e) =>
    e.steps.map(
      (s) =>
        `    (${lit(e.slug)}, ${s.position}, ${lit(s.kind)}, ${lit(s.title)}, ${lit(s.prompt)}, ${lit(s.body)}, ${textArray(s.choices)}, ${lit(s.explanation)}, ${s.correctChoice ?? 'null'})`,
    ),
  );
  push(`
create temporary table seed_steps (expedition_slug text, position smallint, kind public.expedition_step_kind, title text, prompt text, body text, choices text[], explanation text, correct_choice smallint) on commit drop;
insert into seed_steps values
${steps.join(',\n')};

insert into public.expedition_steps (expedition_id, position, kind, title, prompt, body, choices, explanation)
select e.id, s.position, s.kind, s.title, s.prompt, s.body, s.choices, s.explanation
  from seed_steps s join public.expeditions e on e.slug = s.expedition_slug
on conflict (expedition_id, position) do update set
  kind = excluded.kind, title = excluded.title, prompt = excluded.prompt, body = excluded.body,
  choices = excluded.choices, explanation = excluded.explanation;

insert into atlas_private.expedition_step_solutions (step_id, correct_choice)
select st.id, s.correct_choice
  from seed_steps s
  join public.expeditions e on e.slug = s.expedition_slug
  join public.expedition_steps st on st.expedition_id = e.id and st.position = s.position
 where s.correct_choice is not null
on conflict (step_id) do update set correct_choice = excluded.correct_choice;`);

  push(`
insert into public.objectives (slug, title, description, kind, target, collection_id, reward_pack_id, reward_pack_quantity, status, position)
select v.slug, v.title, v.description, v.kind::public.objective_kind, v.target, col.id, p.id, v.quantity, 'published', v.position
  from (values
${game.objectives
  .map(
    (o, i) =>
      `    (${lit(o.slug)}, ${lit(o.title)}, ${lit(o.description)}, ${lit(o.kind)}, ${o.target ?? 1}, ${lit(o.collection ?? null)}, ${lit(o.rewardPack)}, ${o.rewardQuantity}, ${i + 1})`,
  )
  .join(',\n')}
  ) as v (slug, title, description, kind, target, collection_slug, pack_slug, quantity, position)
  join public.pack_definitions p on p.slug = v.pack_slug
  left join public.collections col on col.slug = v.collection_slug
on conflict (slug) do update set
  title = excluded.title, description = excluded.description, kind = excluded.kind, target = excluded.target,
  collection_id = excluded.collection_id, reward_pack_id = excluded.reward_pack_id,
  reward_pack_quantity = excluded.reward_pack_quantity, status = excluded.status, position = excluded.position;`);

  out.push('commit;', '');
  return out.join('\n');
}
