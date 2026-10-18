import type { Card, Catalog, CollectionDefinition, Continent, Rarity } from '@/features/catalog/types';
import type { OwnedCard, UserExpedition } from '@/features/player/api';

export type OwnedMap = ReadonlyMap<string, OwnedCard>;

/**
 * Palier de collection d’un pays (couleur de la carte du monde).
 * Basé uniquement sur les cartes uniques : les doublons n’influencent pas la teinte.
 */
export type CollectionTier = 'empty' | 'started' | 'exploring' | 'advanced' | 'nearly' | 'complete';

export const COLLECTION_TIER_LABELS: Record<CollectionTier, string> = {
  empty: 'Inexploré',
  started: 'Premiers pas',
  exploring: 'En exploration',
  advanced: 'Bien découvert',
  nearly: 'Collection avancée',
  complete: 'Pays complété',
};

/** Ordre d’affichage de la légende (du moins au plus rempli). */
export const COLLECTION_TIER_ORDER: CollectionTier[] = [
  'empty',
  'started',
  'exploring',
  'advanced',
  'nearly',
  'complete',
];

export type Progress = { owned: number; total: number };

export function cardsOfCountry(catalog: Catalog, iso: string): Card[] {
  return catalog.cards.filter((c) => c.country_code === iso && c.status === 'published');
}

export function countryProgress(catalog: Catalog, owned: OwnedMap, iso: string): Progress {
  const cards = cardsOfCountry(catalog, iso);
  return { owned: cards.filter((c) => owned.has(c.id)).length, total: cards.length };
}

/** Ratio 0–1 ; 0 si le pays n’a encore aucune carte publiée. */
export function collectionRatio(progress: Progress): number {
  if (progress.total <= 0) return 0;
  return progress.owned / progress.total;
}

/**
 * Palier de couleur d’après la progression en % de cartes uniques.
 * Seuils : 0 · 1–24 · 25–49 · 50–74 · 75–99 · 100.
 */
export function collectionTier(progress: Progress): CollectionTier {
  const pct = collectionRatio(progress) * 100;
  if (pct <= 0) return 'empty';
  if (pct < 25) return 'started';
  if (pct < 50) return 'exploring';
  if (pct < 75) return 'advanced';
  if (pct < 100) return 'nearly';
  return 'complete';
}

export function collectionProgress(collection: CollectionDefinition, owned: OwnedMap): Progress {
  return {
    owned: collection.collection_cards.filter((c) => owned.has(c.card_id)).length,
    total: collection.collection_cards.length,
  };
}

export type AtlasStats = {
  cardsOwned: number;
  cardsTotal: number;
  countriesDiscovered: number;
  countriesTotal: number;
  continentsDiscovered: number;
  expeditionsCompleted: number;
  duplicates: number;
  newCards: number;
};

export function atlasStats(
  catalog: Catalog,
  owned: OwnedMap,
  expeditions: ReadonlyMap<string, UserExpedition>,
): AtlasStats {
  const published = catalog.cards.filter((c) => c.status === 'published');
  const discoveredCountries = new Set<string>();
  const discoveredContinents = new Set<Continent>();
  let cardsOwned = 0;
  let duplicates = 0;
  let newCards = 0;
  for (const card of catalog.cards) {
    const entry = owned.get(card.id);
    if (!entry) continue;
    if (card.status === 'published') cardsOwned += 1;
    duplicates += entry.quantity - 1;
    if (!entry.seen_at) newCards += 1;
    if (card.country_code) {
      discoveredCountries.add(card.country_code);
      const country = catalog.countriesByIso.get(card.country_code);
      if (country) discoveredContinents.add(country.continent);
    }
  }
  return {
    cardsOwned,
    cardsTotal: published.length,
    countriesDiscovered: discoveredCountries.size,
    countriesTotal: catalog.countries.length,
    continentsDiscovered: discoveredContinents.size,
    expeditionsCompleted: [...expeditions.values()].filter((e) => e.status === 'completed').length,
    duplicates,
    newCards,
  };
}

export function continentProgress(catalog: Catalog, owned: OwnedMap, continent: Continent): Progress {
  const countries = catalog.countries.filter((c) => c.continent === continent);
  return {
    owned: countries.filter((c) => countryProgress(catalog, owned, c.iso_code).owned > 0).length,
    total: countries.length,
  };
}

/** Cartes uniques possédées / publiées pour une rareté. */
export function rarityProgress(catalog: Catalog, owned: OwnedMap, rarity: Rarity): Progress {
  let total = 0;
  let ownedCount = 0;
  for (const card of catalog.cards) {
    if (card.status !== 'published' || card.rarity !== rarity) continue;
    total += 1;
    if (owned.has(card.id)) ownedCount += 1;
  }
  return { owned: ownedCount, total };
}
