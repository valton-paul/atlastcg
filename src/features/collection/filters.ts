import type { Card, Catalog, Continent, Rarity } from '@/features/catalog/types';
import { rarityStyles } from '@/design-system/tokens';

import type { OwnedMap } from './progress';

export type OwnershipFilter = 'all' | 'owned' | 'missing' | 'new' | 'duplicates';
export type SortOrder = 'country' | 'rarity' | 'recent';

export type CardFilters = {
  ownership: OwnershipFilter;
  rarity: Rarity | null;
  continent: Continent | null;
  query: string;
  sort: SortOrder;
};

export const DEFAULT_FILTERS: CardFilters = {
  ownership: 'all',
  rarity: null,
  continent: null,
  query: '',
  sort: 'rarity',
};

export const OWNERSHIP_LABELS: Record<OwnershipFilter, string> = {
  all: 'Tout le catalogue',
  owned: 'Mes cartes',
  missing: 'Manquantes',
  new: 'Nouvelles',
  duplicates: 'Doublons',
};

export function normalizeSearch(value: string): string {
  return value
    .normalize('NFD')
    .replace(/[\u0300-\u036f]/g, '')
    .toLowerCase()
    .trim();
}

function matchesOwnership(card: Card, owned: OwnedMap, filter: OwnershipFilter): boolean {
  const entry = owned.get(card.id);
  switch (filter) {
    case 'all':
      return true;
    case 'owned':
      return !!entry;
    case 'missing':
      return !entry;
    case 'new':
      return !!entry && !entry.seen_at;
    case 'duplicates':
      return !!entry && entry.quantity > 1;
  }
}

/**
 * Cartes visibles dans la collection. Les cartes archivées ne figurent que si elles sont possédées.
 * La recherche ne porte que sur les cartes possédées pour ne pas révéler les cartes manquantes.
 */
export function filterCards(catalog: Catalog, owned: OwnedMap, filters: CardFilters): Card[] {
  const query = normalizeSearch(filters.query);
  const result = catalog.cards.filter((card) => {
    if (card.status !== 'published' && !owned.has(card.id)) return false;
    if (!matchesOwnership(card, owned, filters.ownership)) return false;
    if (filters.rarity && card.rarity !== filters.rarity) return false;
    if (filters.continent) {
      const country = card.country_code ? catalog.countriesByIso.get(card.country_code) : undefined;
      if (country?.continent !== filters.continent) return false;
    }
    if (query) {
      if (!owned.has(card.id)) return false;
      const country = card.country_code ? (catalog.countriesByIso.get(card.country_code)?.name ?? '') : '';
      const haystack = normalizeSearch(`${card.title} ${card.subtitle ?? ''} ${country}`);
      if (!haystack.includes(query)) return false;
    }
    return true;
  });
  return sortCards(catalog, owned, result, filters.sort);
}

const CATEGORY_ORDER: Record<string, number> = { country: 0, capital: 1 };

export function sortCards(catalog: Catalog, owned: OwnedMap, cards: Card[], sort: SortOrder): Card[] {
  const byCountry = (a: Card, b: Card) => {
    const ca = a.country_code ? (catalog.countriesByIso.get(a.country_code)?.name ?? '') : '';
    const cb = b.country_code ? (catalog.countriesByIso.get(b.country_code)?.name ?? '') : '';
    return (
      ca.localeCompare(cb, 'fr') ||
      (CATEGORY_ORDER[a.category] ?? 2) - (CATEGORY_ORDER[b.category] ?? 2) ||
      a.title.localeCompare(b.title, 'fr')
    );
  };
  const copy = [...cards];
  if (sort === 'rarity') {
    return copy.sort((a, b) => rarityStyles[b.rarity].rank - rarityStyles[a.rarity].rank || byCountry(a, b));
  }
  if (sort === 'recent') {
    return copy.sort((a, b) => {
      const ta = owned.get(a.id)?.first_acquired_at ?? '';
      const tb = owned.get(b.id)?.first_acquired_at ?? '';
      return tb.localeCompare(ta) || byCountry(a, b);
    });
  }
  return copy.sort(byCountry);
}
