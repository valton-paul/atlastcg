import { useQuery } from '@tanstack/react-query';
import { z } from 'zod';

import { selectAllRows, selectRows } from '@/lib/api';
import { queryKeys } from '@/lib/query-client';
import { getSupabase } from '@/lib/supabase';

import {
  cardSchema,
  collectionSchema,
  countrySchema,
  economySettingSchema,
  expeditionSchema,
  packDefinitionSchema,
  raritySchema,
  type Catalog,
  type EconomySettings,
} from './types';

export function buildCatalog(
  input: Omit<Catalog, 'countriesByIso' | 'cardsById' | 'cardsBySlug' | 'packsById' | 'expeditionsByCountry'>,
): Catalog {
  const packs = input.packs
    .map((pack) => ({
      ...pack,
      pack_drop_rates: pack.pack_drop_rates.filter((r) => r.configuration_version === pack.configuration_version),
    }))
    .sort((a, b) => a.position - b.position);
  return {
    ...input,
    packs,
    countriesByIso: new Map(input.countries.map((c) => [c.iso_code, c])),
    cardsById: new Map(input.cards.map((c) => [c.id, c])),
    cardsBySlug: new Map(input.cards.map((c) => [c.slug, c])),
    packsById: new Map(packs.map((p) => [p.id, p])),
    expeditionsByCountry: new Map(input.expeditions.map((e) => [e.country_code, e])),
    collections: [...input.collections].sort((a, b) => a.position - b.position),
    rarities: [...input.rarities].sort((a, b) => a.rank - b.rank),
  };
}

/** Le catalogue publié est lisible grâce aux politiques RLS ; aucune donnée sensible n'y figure. */
export async function fetchCatalog(): Promise<Catalog> {
  const db = getSupabase();
  const [countries, cards, rarities, collections, packs, expeditions, settings] = await Promise.all([
    selectRows(
      'countries',
      db
        .from('countries')
        .select('iso_code, iso_numeric, name, name_with_article, capital, continent, region')
        .order('name'),
      z.array(countrySchema),
    ),
    selectAllRows(
      'cards',
      (from, to) =>
        db
          .from('cards')
          .select(
            'id, slug, title, subtitle, category, rarity, country_code, illustration_path, illustration_credit, status',
          )
          .order('title')
          .order('id')
          .range(from, to),
      cardSchema,
    ),
    selectRows(
      'rarities',
      db.from('rarities').select('rarity, rank, label, duplicate_fragments'),
      z.array(raritySchema),
    ),
    selectRows(
      'collections',
      db
        .from('collections')
        .select(
          'id, slug, title, description, collection_type, continent, position, collection_cards(card_id, position)',
        ),
      z.array(collectionSchema),
    ),
    selectRows(
      'packs',
      db
        .from('pack_definitions')
        .select(
          'id, slug, name, description, cards_per_pack, card_categories, continent, configuration_version, position, pack_drop_rates(configuration_version, rarity, probability)',
        ),
      z.array(packDefinitionSchema),
    ),
    selectRows(
      'expeditions',
      db.from('expeditions').select('id, slug, country_code, title, summary, reward_pack_id, reward_pack_quantity'),
      z.array(expeditionSchema),
    ),
    selectRows('settings', db.from('economy_settings').select('key, value'), z.array(economySettingSchema)),
  ]);
  return buildCatalog({
    countries,
    cards,
    rarities,
    collections,
    packs,
    expeditions,
    settings: parseSettings(settings),
  });
}

const exchangeSchema = z.object({ cost: z.number().int().positive(), pack_slug: z.string() });

export function parseSettings(rows: { key: string; value?: unknown }[]): EconomySettings {
  const exchange = exchangeSchema.safeParse(rows.find((r) => r.key === 'fragment_exchange')?.value);
  return {
    fragmentExchangeCost: exchange.success ? exchange.data.cost : null,
    fragmentExchangePackSlug: exchange.success ? exchange.data.pack_slug : null,
  };
}

export function useCatalog() {
  return useQuery({ queryKey: queryKeys.catalog, queryFn: fetchCatalog, staleTime: 10 * 60_000 });
}
