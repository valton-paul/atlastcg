import type { Card, Catalog, CollectionDefinition, Continent } from '@/features/catalog/types';
import type { OwnedCard, UserExpedition } from '@/features/player/api';

export type OwnedMap = ReadonlyMap<string, OwnedCard>;

/**
 * État d'un pays sur la carte du monde :
 * - `unknown` : aucune carte du pays possédée ;
 * - `discovered` : au moins une carte possédée ;
 * - `exploring` : expédition commencée ;
 * - `explored` : expédition terminée ;
 * - `completed` : expédition terminée et toutes les cartes du pays possédées.
 */
export type CountryState = 'unknown' | 'discovered' | 'exploring' | 'explored' | 'completed';

export const COUNTRY_STATE_LABELS: Record<CountryState, string> = {
  unknown: 'Inexploré',
  discovered: 'Découvert',
  exploring: 'Expédition en cours',
  explored: 'Exploré',
  completed: 'Complété',
};

export type Progress = { owned: number; total: number };

export function cardsOfCountry(catalog: Catalog, iso: string): Card[] {
  return catalog.cards.filter((c) => c.country_code === iso && c.status === 'published');
}

export function countryProgress(catalog: Catalog, owned: OwnedMap, iso: string): Progress {
  const cards = cardsOfCountry(catalog, iso);
  return { owned: cards.filter((c) => owned.has(c.id)).length, total: cards.length };
}

export function countryState(
  catalog: Catalog,
  owned: OwnedMap,
  expeditions: ReadonlyMap<string, UserExpedition>,
  iso: string,
): CountryState {
  const progress = countryProgress(catalog, owned, iso);
  if (progress.owned === 0) return 'unknown';
  const expedition = catalog.expeditionsByCountry.get(iso);
  const state = expedition ? expeditions.get(expedition.id) : undefined;
  if (state?.status === 'completed') return progress.owned === progress.total ? 'completed' : 'explored';
  if (state?.status === 'in_progress') return 'exploring';
  return 'discovered';
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
